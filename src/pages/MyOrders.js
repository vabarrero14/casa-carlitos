import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs,
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './MyOrders.css';

const MyOrders = ({ currentUser }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchOrder, setSearchOrder] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [notification, setNotification] = useState(null);

  // Cargar pedidos del vendedor actual
  useEffect(() => {
    loadMyOrders();
  }, [currentUser]);

  // Filtrar pedidos
  useEffect(() => {
    let filtered = orders;
    
    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filtrar por búsqueda
    if (searchOrder) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchOrder.toLowerCase()) ||
        order.cliente.toLowerCase().includes(searchOrder.toLowerCase())
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchOrder]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadMyOrders = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('vendedorEmail', '==', currentUser),
        orderBy('fechaCreacion', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const ordersList = [];
      querySnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() });
      });
      
      setOrders(ordersList);
      setFilteredOrders(ordersList);
      
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      showNotification('Error al cargar tus pedidos', 'error');
    }
    setLoading(false);
  };

  // Ver detalles del pedido
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  // Contar pedidos por estado
  const countOrdersByStatus = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      approved: orders.filter(o => o.status === 'approved').length,
      rejected: orders.filter(o => o.status === 'rejected').length,
      'auto-approved': orders.filter(o => o.aprobadoPor === 'auto-approved').length
    };
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

  // Obtener color según estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      case 'auto-approved': return '#3498db';
      default: return '#7f8c8d';
    }
  };

  // Obtener texto según estado
  const getStatusText = (status, aprobadoPor) => {
    switch (status) {
      case 'pending': return '⏳ Pendiente';
      case 'approved': 
        return aprobadoPor === 'auto-approved' 
          ? '✅ Aprobado Automático' 
          : '✅ Aprobado';
      case 'rejected': return '❌ Rechazado';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="page">
      <h2>📋 Mis Pedidos</h2>
      
      <div className="my-orders-container">
        {/* Header con estadísticas */}
        <div className="orders-header">
          <h3>👤 Pedidos de: <strong>{currentUser}</strong></h3>
          <div className="orders-stats">
            <div className="stat-item">
              <span className="stat-label">Total</span>
              <span className="stat-value total">{countOrdersByStatus().all}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pendientes</span>
              <span className="stat-value pending">{countOrdersByStatus().pending}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Aprobados</span>
              <span className="stat-value approved">{countOrdersByStatus().approved}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Rechazados</span>
              <span className="stat-value rejected">{countOrdersByStatus().rejected}</span>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="orders-filters">
          <div className="filter-group">
            <label>Filtrar por estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="all">Todos los pedidos</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="auto-approved">Auto-aprobados</option>
            </select>
          </div>
          
          <div className="search-group">
            <label>Buscar:</label>
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="orders-content">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              Cargando tus pedidos...
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="orders-list">
              {filteredOrders.map(order => (
                <div 
                  key={order.id} 
                  className="order-item"
                  onClick={() => viewOrderDetails(order)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="order-item-header">
                    <div className="order-number">{order.orderNumber}</div>
                    <div 
                      className="order-status"
                      style={{ 
                        backgroundColor: getStatusColor(order.status),
                        color: 'white'
                      }}
                    >
                      {getStatusText(order.status, order.aprobadoPor)}
                    </div>
                  </div>
                  
                  <div className="order-item-info">
                    <div className="info-row">
                      <strong>Cliente:</strong> {order.cliente}
                    </div>
                    <div className="info-row">
                      <strong>Fecha:</strong> {formatDate(order.fechaCreacion)}
                    </div>
                    <div className="info-row">
                      <strong>Productos:</strong> {order.items.length} items
                    </div>
                    <div className="info-row">
                      <strong>Total:</strong> {formatCurrency(order.total)}
                    </div>
                  </div>
                  
                  {order.hasPriceChange && (
                    <div className="price-change-notice">
                      ⚠️ Este pedido tiene cambios de precio
                    </div>
                  )}
                  
                  {order.status === 'approved' && order.aprobadoPor !== 'auto-approved' && (
                    <div className="approved-info">
                      <strong>Aprobado por:</strong> {order.aprobadoPor}
                      {order.fechaAprobacion && (
                        <span> el {formatDate(order.fechaAprobacion)}</span>
                      )}
                    </div>
                  )}
                  
                  {order.status === 'rejected' && order.adminComments && (
                    <div className="rejected-info">
                      <strong>Motivo:</strong> {order.adminComments}
                    </div>
                  )}
                  
                  <div className="order-item-actions">
                    <button className="btn-view-details">
                      👁️ Ver Detalles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <p>📭 No hay pedidos que coincidan con los filtros</p>
              <p className="empty-subtitle">
                {statusFilter === 'all' 
                  ? 'Aún no has creado ningún pedido' 
                  : `No tienes pedidos ${statusFilter === 'pending' ? 'pendientes' : 
                    statusFilter === 'approved' ? 'aprobados' : 'rechazados'}`}
              </p>
            </div>
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
                }}
                className="btn-close"
              >
                ❌
              </button>
            </div>
            
            <div className="my-order-details">
              {/* Encabezado con estado */}
              <div className="order-detail-header">
                <div 
                  className="detail-status"
                  style={{ 
                    backgroundColor: getStatusColor(selectedOrder.status),
                    color: 'white'
                  }}
                >
                  {getStatusText(selectedOrder.status, selectedOrder.aprobadoPor)}
                </div>
                <div className="detail-date">
                  📅 Creado el {formatDate(selectedOrder.fechaCreacion)}
                </div>
              </div>

              {/* Información general */}
              <div className="detail-section">
                <h4>📄 Información del Pedido</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Número:</strong> {selectedOrder.orderNumber}
                  </div>
                  <div className="info-item">
                    <strong>Cliente:</strong> {selectedOrder.cliente}
                  </div>
                  <div className="info-item">
                    <strong>Vendedor:</strong> {selectedOrder.vendedor}
                  </div>
                  <div className="info-item">
                    <strong>Total:</strong> {formatCurrency(selectedOrder.total)}
                  </div>
                  {selectedOrder.estimatedDelivery && (
                    <div className="info-item">
                      <strong>Entrega estimada:</strong> {selectedOrder.estimatedDelivery}
                    </div>
                  )}
                  {selectedOrder.aprobadoPor && selectedOrder.aprobadoPor !== 'auto-approved' && (
                    <div className="info-item">
                      <strong>Aprobado por:</strong> {selectedOrder.aprobadoPor}
                      {selectedOrder.fechaAprobacion && (
                        <span> el {formatDate(selectedOrder.fechaAprobacion)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Productos */}
              <div className="detail-section">
                <h4>📦 Productos ({selectedOrder.items.length})</h4>
                <div className="products-list">
                  {selectedOrder.items.map((item, index) => {
                    const diferencia = item.precioSolicitado - item.precioBase;
                    const porcentaje = ((diferencia / item.precioBase) * 100).toFixed(1);
                    const subtotal = item.cantidad * item.precioSolicitado;
                    
                    return (
                      <div key={index} className="product-item">
                        <div className="product-name">
                          <strong>{item.productName}</strong>
                          {item.productCode && (
                            <span className="product-code">({item.productCode})</span>
                          )}
                        </div>
                        <div className="product-details">
                          <div className="detail-col">
                            <span className="detail-label">Cantidad:</span>
                            <span className="detail-value">{item.cantidad}</span>
                          </div>
                          <div className="detail-col">
                            <span className="detail-label">Precio Base:</span>
                            <span className="detail-value">{formatCurrency(item.precioBase)}</span>
                          </div>
                          <div className="detail-col">
                            <span className="detail-label">Precio Aplicado:</span>
                            <span className="detail-value">
                              {formatCurrency(item.precioSolicitado)}
                              {diferencia !== 0 && (
                                <span className={`price-change ${diferencia > 0 ? 'increase' : 'discount'}`}>
                                  {diferencia > 0 ? ' 🔺' : ' 🔻'} {Math.abs(porcentaje)}%
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="detail-col">
                            <span className="detail-label">Subtotal:</span>
                            <span className="detail-value subtotal">{formatCurrency(subtotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="order-total-row">
                  <strong>Total del Pedido:</strong>
                  <span className="total-amount">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Información adicional */}
              <div className="detail-section">
                <h4>📝 Información Adicional</h4>
                
                {selectedOrder.priceChangeReason && (
                  <div className="additional-info">
                    <strong>Motivo del cambio de precio:</strong>
                    <p className="reason-text">{selectedOrder.priceChangeReason}</p>
                  </div>
                )}
                
                {selectedOrder.adminComments && (
                  <div className="additional-info">
                    <strong>Comentarios del administrador:</strong>
                    <p className="admin-comments">{selectedOrder.adminComments}</p>
                  </div>
                )}
                
                {selectedOrder.status === 'pending' && (
                  <div className="pending-notice">
                    ⏳ Este pedido está pendiente de aprobación del administrador.
                    Serás notificado cuando se tome una decisión.
                  </div>
                )}
                
                {selectedOrder.status === 'rejected' && (
                  <div className="rejected-notice">
                    ❌ Este pedido fue rechazado. Puedes crear uno nuevo con ajustes si es necesario.
                  </div>
                )}
                
                {selectedOrder.status === 'approved' && (
                  <div className="approved-notice">
                    ✅ Este pedido fue aprobado y la venta ha sido registrada en el sistema.
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="detail-actions">
                <button
                  onClick={() => {
                    setShowOrderDetails(false);
                    setSelectedOrder(null);
                  }}
                  className="btn-close-details"
                >
                  Cerrar
                </button>
              </div>
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

export default MyOrders;