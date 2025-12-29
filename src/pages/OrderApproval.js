import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './OrderApproval.css';

const OrderApproval = ({ currentUser }) => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [rejectedOrders, setRejectedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [notification, setNotification] = useState(null);

  // Cargar pedidos
  useEffect(() => {
    loadOrders();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Cargar TODOS los pedidos primero (temporal hasta índices)
      const allOrdersQuery = query(collection(db, 'orders'));
      const allOrdersSnapshot = await getDocs(allOrdersQuery);
      const allOrders = [];
      allOrdersSnapshot.forEach((doc) => {
        allOrders.push({ id: doc.id, ...doc.data() });
      });

      // Filtrar y ordenar manualmente en el cliente
      const pendingList = allOrders
        .filter(order => order.status === 'pending')
        .sort((a, b) => {
          if (!a.fechaCreacion || !b.fechaCreacion) return 0;
          return b.fechaCreacion.toDate() - a.fechaCreacion.toDate();
        });

      const approvedList = allOrders
        .filter(order => order.status === 'approved')
        .sort((a, b) => {
          if (!a.fechaAprobacion || !b.fechaAprobacion) return 0;
          return b.fechaAprobacion.toDate() - a.fechaAprobacion.toDate();
        });

      const rejectedList = allOrders
        .filter(order => order.status === 'rejected')
        .sort((a, b) => {
          if (!a.fechaAprobacion || !b.fechaAprobacion) return 0;
          return b.fechaAprobacion.toDate() - a.fechaAprobacion.toDate();
        });

      setPendingOrders(pendingList);
      setApprovedOrders(approvedList);
      setRejectedOrders(rejectedList);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      showNotification('Error al cargar pedidos', 'error');
    }
    setLoading(false);
  };

  // Ver detalles del pedido
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    setAdminComments('');
  };

  // Crear venta desde pedido aprobado - ACTUALIZADO CON orderId
  const createSaleFromOrder = async (order) => {
    try {
      const saleNumber = `VENTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const saleData = {
        numero: saleNumber,
        orderNumber: order.orderNumber,
        orderId: order.id, // <-- NUEVO: Identificador del pedido
        orderData: { // <-- NUEVO: Datos importantes del pedido
          orderNumber: order.orderNumber,
          cliente: order.cliente,
          vendedor: order.vendedor,
          vendedorEmail: order.vendedorEmail,
          priceChangeReason: order.priceChangeReason,
          hasPriceChange: order.hasPriceChange || false,
          adminComments: order.adminComments || ''
        },
        cliente: order.cliente,
        clienteId: order.clienteId,
        vendedor: order.vendedor,
        vendedorEmail: order.vendedorEmail,
        fecha: new Date(),
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          cantidad: item.cantidad,
          precioUnitario: item.precioSolicitado,
          precioBase: item.precioBase,
          precioOriginal: item.precioBase,
          precioAplicado: item.precioSolicitado,
          diferencia: item.precioSolicitado - item.precioBase
        })),
        total: order.total,
        metodoPago: 'por_definir',
        createdAt: new Date(),
        source: 'order',
        aprobadoPor: currentUser,
        adminComments: adminComments,
        // Nuevos campos para trazabilidad
        orderStatus: 'approved',
        orderApprovalDate: new Date(),
        hasPriceChange: order.hasPriceChange || false,
        priceChangeReason: order.priceChangeReason || ''
      };

      const saleDoc = await addDoc(collection(db, 'sales'), saleData);

      // Actualizar stock de productos
      for (const item of order.items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnapshot = await getDocs(query(
          collection(db, 'products'),
          where('__name__', '==', item.productId)
        ));

        if (!productSnapshot.empty) {
          const product = productSnapshot.docs[0].data();
          const nuevoStock = product.stock - item.cantidad;
          await updateDoc(productRef, {
            stock: nuevoStock
          });

          // Registrar movimiento de stock
          await addDoc(collection(db, 'stock_movements'), {
            productId: item.productId,
            productName: item.productName,
            tipo: 'venta',
            subtipo: 'desde_pedido',
            cantidad: item.cantidad,
            stockAnterior: product.stock,
            stockActual: nuevoStock,
            precioUnitario: item.precioSolicitado,
            totalMovimiento: item.cantidad * item.precioSolicitado,
            referencia: saleNumber,
            orderNumber: order.orderNumber,
            orderId: order.id, // <-- NUEVO
            cliente: order.cliente,
            vendedor: order.vendedor,
            aprobadoPor: currentUser,
            fecha: new Date(),
            precioBase: item.precioBase,
            diferenciaPrecio: item.precioSolicitado - item.precioBase,
            adminComments: adminComments
          });
        }
      }

      return saleDoc.id;
    } catch (error) {
      console.error('Error creando venta:', error);
      throw error;
    }
  };

  // Aprobar pedido
  const approveOrder = async (order) => {
    if (!adminComments.trim() && order.hasPriceChange) {
      showNotification('Agrega comentarios para la aprobación', 'error');
      return;
    }

    setLoading(true);
    showNotification('Aprobando pedido...', 'loading');

    try {
      const orderRef = doc(db, 'orders', order.id);

      // Actualizar pedido
      await updateDoc(orderRef, {
        status: 'approved',
        fechaAprobacion: new Date(),
        aprobadoPor: currentUser,
        adminComments: adminComments || 'Aprobado sin comentarios'
      });

      // Crear venta desde el pedido
      await createSaleFromOrder(order);

      showNotification('✅ Pedido aprobado y venta creada exitosamente', 'success');

      // Recargar pedidos
      await loadOrders();
      setShowOrderDetails(false);
      setSelectedOrder(null);
      setAdminComments('');

    } catch (error) {
      console.error('Error aprobando pedido:', error);
      showNotification('❌ Error al aprobar pedido', 'error');
    }

    setLoading(false);
  };

  // Rechazar pedido
  const rejectOrder = async (order) => {
    if (!adminComments.trim()) {
      showNotification('Explica el motivo del rechazo', 'error');
      return;
    }

    if (!window.confirm(`¿Rechazar el pedido ${order.orderNumber}?`)) {
      return;
    }

    setLoading(true);
    showNotification('Rechazando pedido...', 'loading');

    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'rejected',
        fechaAprobacion: new Date(),
        aprobadoPor: currentUser,
        adminComments: adminComments,
        rejectionReason: adminComments
      });

      showNotification('✅ Pedido rechazado', 'success');
      
      // Recargar pedidos
      await loadOrders();
      setShowOrderDetails(false);
      setSelectedOrder(null);
      setAdminComments('');

    } catch (error) {
      console.error('Error rechazando pedido:', error);
      showNotification('❌ Error al rechazar pedido', 'error');
    }

    setLoading(false);
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES') + ' ' +
      date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  // Calcular total de cambios
  const calculateTotalChanges = (order) => {
    let totalBase = 0;
    let totalSolicitado = 0;
    
    order.items.forEach(item => {
      totalBase += item.cantidad * item.precioBase;
      totalSolicitado += item.cantidad * item.precioSolicitado;
    });

    const diferencia = totalSolicitado - totalBase;
    const porcentaje = ((diferencia / totalBase) * 100).toFixed(2);
    
    return { totalBase, totalSolicitado, diferencia, porcentaje };
  };

  return (
    <div className="page">
      <h2>🔄 Aprobación de Pedidos</h2>
      
      <div className="approval-container">
        {/* Header */}
        <div className="approval-header">
          <h3>👨‍💼 Panel de Administración</h3>
          <p>Administrador: <strong>{currentUser}</strong></p>
        </div>

        {/* Tabs de navegación */}
        <div className="approval-tabs">
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pendientes ({pendingOrders.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            ✅ Aprobados ({approvedOrders.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            ❌ Rechazados ({rejectedOrders.length})
          </button>
        </div>

        {/* Contenido de las pestañas */}
        <div className="approval-content">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              Cargando pedidos...
            </div>
          ) : (
            <>
              {/* Pedidos Pendientes */}
              {activeTab === 'pending' && (
                <div className="pending-section">
                  <h4>📋 Pedidos Pendientes de Aprobación</h4>
                  
                  {pendingOrders.length > 0 ? (
                    <div className="orders-grid">
                      {pendingOrders.map(order => {
                        const changes = calculateTotalChanges(order);
                        return (
                          <div key={order.id} className="order-card pending">
                            <div className="order-header">
                              <div className="order-number">{order.orderNumber}</div>
                              <div className="order-date">
                                📅 {formatDate(order.fechaCreacion)}
                              </div>
                            </div>
                            
                            <div className="order-info">
                              <div className="order-client">
                                <strong>👤 Cliente:</strong> {order.cliente}
                              </div>
                              <div className="order-seller">
                                <strong>👥 Vendedor:</strong> {order.vendedor}
                              </div>
                              <div className="order-total">
                                <strong>💰 Total:</strong> {formatCurrency(order.total)}
                              </div>
                            </div>
                            
                            <div className="order-changes">
                              {order.hasPriceChange ? (
                                <div className="price-change-info">
                                  <span className="change-badge warning">⚠️ CON CAMBIOS</span>
                                  <span className="change-details">
                                    Base: {formatCurrency(changes.totalBase)} → 
                                    Solicitado: {formatCurrency(changes.totalSolicitado)}
                                    ({changes.diferencia > 0 ? '+' : ''}{formatCurrency(changes.diferencia)})
                                  </span>
                                </div>
                              ) : (
                                <div className="price-change-info">
                                  <span className="change-badge safe">✅ SIN CAMBIOS</span>
                                  <span>Precios según lista</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="order-actions">
                              <button
                                onClick={() => viewOrderDetails(order)}
                                className="btn-view"
                              >
                                👁️ Ver Detalles
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>🎉 No hay pedidos pendientes de aprobación</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pedidos Aprobados */}
              {activeTab === 'approved' && (
                <div className="approved-section">
                  <h4>✅ Pedidos Aprobados</h4>
                  
                  {approvedOrders.length > 0 ? (
                    <div className="orders-grid">
                      {approvedOrders.map(order => (
                        <div key={order.id} className="order-card approved">
                          <div className="order-header">
                            <div className="order-number">{order.orderNumber}</div>
                            <div className="order-status-badge approved">APROBADO</div>
                          </div>
                          
                          <div className="order-info">
                            <div className="order-client">
                              <strong>👤 Cliente:</strong> {order.cliente}
                            </div>
                            <div className="order-approval">
                              <strong>✅ Aprobado por:</strong> {order.aprobadoPor || 'Sistema'}
                            </div>
                            <div className="order-date">
                              <strong>📅 Fecha:</strong> {formatDate(order.fechaAprobacion)}
                            </div>
                            <div className="order-total">
                              <strong>💰 Total:</strong> {formatCurrency(order.total)}
                            </div>
                          </div>
                          
                          {order.adminComments && (
                            <div className="order-comments">
                              <strong>💬 Comentarios:</strong> {order.adminComments}
                            </div>
                          )}
                          
                          <div className="order-actions">
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="btn-view"
                            >
                              👁️ Ver Detalles
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>📝 No hay pedidos aprobados</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pedidos Rechazados */}
              {activeTab === 'rejected' && (
                <div className="rejected-section">
                  <h4>❌ Pedidos Rechazados</h4>
                  
                  {rejectedOrders.length > 0 ? (
                    <div className="orders-grid">
                      {rejectedOrders.map(order => (
                        <div key={order.id} className="order-card rejected">
                          <div className="order-header">
                            <div className="order-number">{order.orderNumber}</div>
                            <div className="order-status-badge rejected">RECHAZADO</div>
                          </div>
                          
                          <div className="order-info">
                            <div className="order-client">
                              <strong>👤 Cliente:</strong> {order.cliente}
                            </div>
                            <div className="order-approval">
                              <strong>❌ Rechazado por:</strong> {order.aprobadoPor}
                            </div>
                            <div className="order-date">
                              <strong>📅 Fecha:</strong> {formatDate(order.fechaAprobacion)}
                            </div>
                            <div className="order-total">
                              <strong>💰 Total:</strong> {formatCurrency(order.total)}
                            </div>
                          </div>
                          
                          {order.adminComments && (
                            <div className="order-comments">
                              <strong>💬 Motivo:</strong> {order.adminComments}
                            </div>
                          )}
                          
                          <div className="order-actions">
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="btn-view"
                            >
                              👁️ Ver Detalles
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>📝 No hay pedidos rechazados</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalles del Pedido */}
      {showOrderDetails && selectedOrder && (
        <div className="form-overlay">
          <div className="form-container large-modal">
            <div className="form-header">
              <h3>📋 Detalles del Pedido: {selectedOrder.orderNumber}</h3>
              <button
                onClick={() => {
                  setShowOrderDetails(false);
                  setSelectedOrder(null);
                  setAdminComments('');
                }}
                className="btn-close"
              >
                ❌
              </button>
            </div>
            
            <div className="order-details">
              {/* Información general */}
              <div className="detail-section">
                <h4>📄 Información General</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <strong>Cliente:</strong> {selectedOrder.cliente}
                  </div>
                  <div className="detail-item">
                    <strong>Vendedor:</strong> {selectedOrder.vendedor}
                  </div>
                  <div className="detail-item">
                    <strong>Fecha creación:</strong> {formatDate(selectedOrder.fechaCreacion)}
                  </div>
                  <div className="detail-item">
                    <strong>Entrega estimada:</strong> {selectedOrder.estimatedDelivery || 'No especificada'}
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="detail-section">
                <h4>📦 Productos ({selectedOrder.items.length})</h4>
                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Base</th>
                        <th>Precio Solicitado</th>
                        <th>Diferencia</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => {
                        const diferencia = item.precioSolicitado - item.precioBase;
                        const porcentaje = ((diferencia / item.precioBase) * 100).toFixed(1);
                        const subtotal = item.cantidad * item.precioSolicitado;
                        
                        return (
                          <tr key={index} className={diferencia !== 0 ? 'price-changed' : ''}>
                            <td>
                              <strong>{item.productName}</strong>
                              {item.productCode && <div className="product-code">Código: {item.productCode}</div>}
                            </td>
                            <td className="quantity">{item.cantidad}</td>
                            <td className="amount">{formatCurrency(item.precioBase)}</td>
                            <td className="amount">
                              {formatCurrency(item.precioSolicitado)}
                              {diferencia !== 0 && (
                                <div className={`price-change-indicator ${diferencia > 0 ? 'increase' : 'discount'}`}>
                                  {diferencia > 0 ? '🔺' : '🔻'} {Math.abs(porcentaje)}%
                                </div>
                              )}
                            </td>
                            <td className={`amount ${diferencia > 0 ? 'increase' : diferencia < 0 ? 'discount' : ''}`}>
                              {diferencia !== 0 ? formatCurrency(diferencia) : '--'}
                            </td>
                            <td className="amount subtotal">{formatCurrency(subtotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="5" className="total-label"><strong>Total del Pedido:</strong></td>
                        <td className="amount total-amount">{formatCurrency(selectedOrder.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Resumen de cambios */}
              {selectedOrder.hasPriceChange && (
                <div className="detail-section">
                  <h4>📊 Resumen de Cambios de Precio</h4>
                  <div className="changes-summary">
                    <div className="change-item">
                      <strong>Motivo del vendedor:</strong>
                      <p className="reason-text">{selectedOrder.priceChangeReason || 'No especificado'}</p>
                    </div>
                    
                    <div className="change-stats">
                      <div className="stat-card">
                        <div className="stat-label">Total Base</div>
                        <div className="stat-value">{formatCurrency(calculateTotalChanges(selectedOrder).totalBase)}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Total Solicitado</div>
                        <div className="stat-value">{formatCurrency(calculateTotalChanges(selectedOrder).totalSolicitado)}</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Diferencia</div>
                        <div className={`stat-value ${calculateTotalChanges(selectedOrder).diferencia > 0 ? 'increase' : 'discount'}`}>
                          {formatCurrency(calculateTotalChanges(selectedOrder).diferencia)}
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-label">Porcentaje</div>
                        <div className={`stat-value ${calculateTotalChanges(selectedOrder).diferencia > 0 ? 'increase' : 'discount'}`}>
                          {calculateTotalChanges(selectedOrder).porcentaje}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comentarios del administrador (solo para pendientes) */}
              {activeTab === 'pending' && (
                <div className="detail-section">
                  <h4>💬 Decisión del Administrador</h4>
                  <div className="admin-decision">
                    <label>Comentarios:</label>
                    <textarea
                      value={adminComments}
                      onChange={(e) => setAdminComments(e.target.value)}
                      placeholder="Agrega comentarios sobre tu decisión (obligatorio para cambios de precio)..."
                      rows="4"
                      className="admin-comments"
                    />
                    
                    <div className="decision-actions">
                      <button
                        onClick={() => approveOrder(selectedOrder)}
                        disabled={loading || (selectedOrder.hasPriceChange && !adminComments.trim())}
                        className="btn-approve"
                      >
                        ✅ Aprobar Pedido
                      </button>
                      <button
                        onClick={() => rejectOrder(selectedOrder)}
                        disabled={loading || !adminComments.trim()}
                        className="btn-reject"
                      >
                        ❌ Rechazar Pedido
                      </button>
                      <button
                        onClick={() => {
                          setShowOrderDetails(false);
                          setSelectedOrder(null);
                          setAdminComments('');
                        }}
                        className="btn-cancel"
                      >
                        ↩️ Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={notification.type === 'loading' ? 0 : 4000}
        />
      )}
    </div>
  );
};

export default OrderApproval;