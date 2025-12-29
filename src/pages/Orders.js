import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './Orders.css';

const Orders = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('newOrder');

  // Estados para nuevo pedido
  const [selectedClient, setSelectedClient] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [hasPriceChange, setHasPriceChange] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadProducts();
    loadClients();
    generateOrderNumber();
  }, []);

  // Detectar cambios de precio
  useEffect(() => {
    const priceChanged = orderItems.some(item =>
      item.precioSolicitado !== item.precioBase
    );
    setHasPriceChange(priceChanged);
  }, [orderItems]);

  // Filtrar productos para búsqueda
  useEffect(() => {
    if (searchProduct) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        (product.code && product.code.toLowerCase().includes(searchProduct.toLowerCase()))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchProduct, products]);

  // Filtrar clientes para búsqueda en modal
  useEffect(() => {
    if (clientSearch) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(clientSearch.toLowerCase())) ||
        (client.phone && client.phone.includes(clientSearch))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearch, clients]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error cargando productos:', error);
      showNotification('Error al cargar productos', 'error');
    }
  };

  const loadClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsList = [];
      querySnapshot.forEach((doc) => {
        clientsList.push({ id: doc.id, ...doc.data() });
      });
      setClients(clientsList);
      setFilteredClients(clientsList);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      showNotification('Error al cargar clientes', 'error');
    }
  };

  const generateOrderNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    setOrderNumber(`PED-${timestamp}-${random}`);
  };

  // Calcular fecha estimada de entrega (3 días hábiles)
  const calculateEstimatedDelivery = () => {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    return deliveryDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    setEstimatedDelivery(calculateEstimatedDelivery());
  }, []);

  // Agregar producto al pedido
  const addProductToOrder = (product) => {
    // Verificar stock disponible
    if (product.stock <= 0) {
      showNotification('❌ Producto sin stock disponible', 'error');
      return;
    }

    const existingItem = orderItems.find(item => item.productId === product.id);

    if (existingItem) {
      // Verificar que no exceda el stock disponible
      if (existingItem.cantidad + 1 > product.stock) {
        showNotification('❌ No hay suficiente stock disponible', 'error');
        return;
      }

      // Si ya existe, aumentar cantidad
      setOrderItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      // Agregar nuevo producto
      const newItem = {
        productId: product.id,
        productName: product.name,
        productCode: product.code || '',
        cantidad: 1,
        precioBase: product.salePrice || product.price,
        precioSolicitado: product.salePrice || product.price, // Inicialmente igual al base
        stockActual: product.stock,
        stockDisponible: product.stock
      };
      setOrderItems(prev => [...prev, newItem]);
    }
  };

  // Actualizar cantidad de un producto
  const updateItemQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const product = products.find(p => p.id === productId);
    if (parseInt(newQuantity) > product.stock) {
      showNotification('❌ No hay suficiente stock disponible', 'error');
      return;
    }

    setOrderItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, cantidad: parseInt(newQuantity) }
        : item
    ));
  };

  // Actualizar precio solicitado de un producto
  const updateItemPrice = (productId, newPrice) => {
    if (newPrice < 0) return;
    setOrderItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, precioSolicitado: parseFloat(newPrice) }
        : item
    ));
  };

  // Remover producto del pedido
  const removeItemFromOrder = (productId) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Calcular total del pedido
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (item.cantidad * item.precioSolicitado);
    }, 0);
  };

  // Calcular diferencia con precio base
  const calculatePriceDifference = (item) => {
    const diferencia = item.precioSolicitado - item.precioBase;
    const porcentaje = ((diferencia / item.precioBase) * 100).toFixed(1);
    return { diferencia, porcentaje };
  };

  // Seleccionar cliente desde modal
  const selectClient = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);
    setClientSearch('');
  };

  // Crear venta desde pedido aprobado - ACTUALIZADA COMPLETA
  const createSaleFromOrder = async (orderData) => {
    try {
      const saleNumber = `VENTA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const saleData = {
        numero: saleNumber,
        orderNumber: orderData.orderNumber,
        orderId: orderData.id || 'auto-generated',
        orderData: {
          orderNumber: orderData.orderNumber,
          cliente: orderData.cliente,
          vendedor: orderData.vendedor,
          vendedorEmail: orderData.vendedorEmail,
          hasPriceChange: orderData.hasPriceChange || false,
          priceChangeReason: orderData.priceChangeReason || '',
          autoApproved: true
        },
        cliente: orderData.cliente,
        clienteId: orderData.clienteId,
        vendedor: orderData.vendedor,
        vendedorEmail: orderData.vendedorEmail,
        fecha: new Date(),
        items: orderData.items.map(item => ({
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
        total: orderData.total,
        metodoPago: 'por_definir',
        createdAt: new Date(),
        source: 'order',
        orderStatus: 'auto-approved',
        orderApprovalDate: new Date(),
        aprobadoPor: 'sistema',
        hasPriceChange: orderData.hasPriceChange || false,
        priceChangeReason: orderData.priceChangeReason || ''
      };

      const saleDoc = await addDoc(collection(db, 'sales'), saleData);
      
      // Actualizar stock de productos
      for (const item of orderData.items) {
        const productRef = doc(db, 'products', item.productId);
        const product = products.find(p => p.id === item.productId);
        
        if (product) {
          const nuevoStock = product.stock - item.cantidad;
          await updateDoc(productRef, {
            stock: nuevoStock
          });

          // Registrar movimiento de stock
          await addDoc(collection(db, 'stock_movements'), {
            productId: item.productId,
            productName: item.productName,
            tipo: 'venta',
            subtipo: 'desde_pedido_auto',
            cantidad: item.cantidad,
            stockAnterior: product.stock,
            stockActual: nuevoStock,
            precioUnitario: item.precioSolicitado,
            totalMovimiento: item.cantidad * item.precioSolicitado,
            referencia: saleNumber,
            orderNumber: orderData.orderNumber,
            orderId: orderData.id || 'auto-generated',
            cliente: orderData.cliente,
            vendedor: orderData.vendedor,
            aprobadoPor: 'sistema',
            fecha: new Date(),
            precioBase: item.precioBase,
            diferenciaPrecio: item.precioSolicitado - item.precioBase
          });
        }
      }

      return saleDoc.id;
    } catch (error) {
      console.error('Error creando venta desde pedido:', error);
      return false;
    }
  };

  // Crear pedido
  const createOrder = async () => {
    if (orderItems.length === 0) {
      showNotification('Agrega productos al pedido', 'error');
      return;
    }

    if (hasPriceChange && !priceChangeReason.trim()) {
      showNotification('Explica el motivo del cambio de precio', 'error');
      return;
    }

    setLoading(true);
    showNotification('Creando pedido...', 'loading');

    try {
      const total = calculateTotal();

      // Calcular cambios de precio
      const priceChanges = orderItems.map(item => ({
        productName: item.productName,
        precioBase: item.precioBase,
        precioSolicitado: item.precioSolicitado,
        diferencia: item.precioSolicitado - item.precioBase,
        porcentaje: ((item.precioSolicitado - item.precioBase) / item.precioBase * 100).toFixed(1)
      }));

      const orderData = {
        orderNumber: orderNumber,
        cliente: selectedClient ? selectedClient.name : 'Cliente general',
        clienteId: selectedClient ? selectedClient.id : null,
        vendedor: currentUser,
        vendedorEmail: currentUser,
        items: orderItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          cantidad: item.cantidad,
          precioBase: item.precioBase,
          precioSolicitado: item.precioSolicitado,
          stockActual: item.stockActual
        })),
        total: total,
        status: hasPriceChange ? 'pending' : 'approved',
        priceChanges: priceChanges,
        priceChangeReason: priceChangeReason,
        hasPriceChange: hasPriceChange,
        fechaCreacion: new Date(),
        fechaAprobacion: hasPriceChange ? null : new Date(),
        aprobadoPor: hasPriceChange ? null : 'auto-approved',
        estimatedDelivery: estimatedDelivery,
        deliveryAddress: selectedClient?.address || 'Retirar en local',
        customerNotes: ''
      };

      const orderDoc = await addDoc(collection(db, 'orders'), orderData);
      
      // Agregar el ID al orderData para usarlo después
      orderData.id = orderDoc.id;

      if (!hasPriceChange) {
        // Si no hay cambio de precio, crear venta automáticamente
        await createSaleFromOrder(orderData);
        showNotification('✅ Pedido aprobado automáticamente. Venta registrada', 'success');
      } else {
        showNotification('✅ Pedido creado exitosamente. Esperando aprobación del administrador', 'success');
      }

      // Limpiar formulario
      resetForm();

    } catch (error) {
      console.error('Error creando pedido:', error);
      showNotification('❌ Error al crear pedido', 'error');
    }

    setLoading(false);
  };

  // Resetear formulario
  const resetForm = () => {
    setOrderItems([]);
    setSelectedClient(null);
    setPriceChangeReason('');
    setHasPriceChange(false);
    generateOrderNumber();
    setOrderDate(new Date().toISOString().split('T')[0]);
    setEstimatedDelivery(calculateEstimatedDelivery());
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  return (
    <div className="page">
      <h2>📋 Sistema de Pedidos</h2>

      {/* Navegación */}
      <div className="reports-nav">
        <button
          className={`report-btn ${activeSection === 'newOrder' ? 'active' : ''}`}
          onClick={() => setActiveSection('newOrder')}
        >
          ➕ Nuevo Pedido
        </button>
      </div>

      <div className="reports-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Cargando...
          </div>
        ) : (
          <>
            {/* Sección: Nuevo Pedido */}
            {activeSection === 'newOrder' && (
              <div className="order-section">
                <h3>➕ Nuevo Pedido</h3>

                {/* Información del pedido */}
                <div className="purchase-info">
                  <div className="info-group">
                    <label>Número de Pedido:</label>
                    <span className="purchase-number">{orderNumber}</span>
                  </div>
                  
                  <div className="info-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  
                  <div className="info-group">
                    <label>Entrega Estimada:</label>
                    <input
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  
                  <div className="info-group">
                    <label>Cliente:</label>
                    <div className="supplier-selection">
                      {selectedClient ? (
                        <div className="selected-supplier">
                          <span>{selectedClient.name}</span>
                          {selectedClient.phone && <span className="supplier-ruc">Tel: {selectedClient.phone}</span>}
                          <button
                            onClick={() => setSelectedClient(null)}
                            className="btn-change-supplier"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowClientModal(true)}
                          className="btn-select-supplier"
                        >
                          👤 Seleccionar Cliente
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Búsqueda y lista de productos */}
                <div className="product-selection">
                  <h4>📦 Seleccionar Productos</h4>
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="🔍 Buscar producto por nombre o código..."
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="products-grid">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
                        onClick={() => product.stock > 0 && addProductToOrder(product)}
                      >
                        <div className="product-header">
                          <span className="product-name">{product.name}</span>
                          {product.code && <span className="product-code">({product.code})</span>}
                        </div>
                        
                        <div className="product-details">
                          <span className={`product-stock ${product.stock <= 0 ? 'stock-zero' : product.stock <= 5 ? 'stock-low' : ''}`}>
                            Stock: {product.stock}
                            {product.stock <= 0 && ' (AGOTADO)'}
                            {product.stock > 0 && product.stock <= 5 && ' (BAJO)'}
                          </span>
                          <span className="product-price">
                            Precio: {formatCurrency(product.salePrice || product.price)}
                          </span>
                        </div>
                        
                        <div className="product-action">
                          {product.stock > 0 ? (
                            <button className="btn-add">➕ Agregar</button>
                          ) : (
                            <button className="btn-disabled" disabled>Sin Stock</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista de productos en el pedido */}
                {orderItems.length > 0 && (
                  <div className="purchase-items">
                    <h4>🛒 Productos en el Pedido</h4>
                    
                    {/* Indicador de cambios de precio */}
                    {hasPriceChange && (
                      <div className="price-change-alert">
                        ⚠️ <strong>Este pedido tiene cambios de precio</strong> - Requiere aprobación del administrador
                      </div>
                    )}

                    <div className="items-list">
                      {orderItems.map((item, index) => {
                        const { diferencia, porcentaje } = calculatePriceDifference(item);
                        const tieneDescuento = diferencia < 0;
                        const tieneAumento = diferencia > 0;

                        return (
                          <div key={item.productId} className="purchase-item">
                            <div className="item-info">
                              <span className="item-name">{item.productName}</span>
                              {item.productCode && <span className="item-code">({item.productCode})</span>}
                              <span className="item-stock">Stock disponible: {item.stockDisponible}</span>
                            </div>
                            
                            <div className="item-controls">
                              <div className="quantity-control">
                                <label>Cantidad:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.stockDisponible}
                                  value={item.cantidad}
                                  onChange={(e) => updateItemQuantity(item.productId, e.target.value)}
                                  className="quantity-input"
                                />
                              </div>
                              
                              <div className="price-control">
                                <label>Precio Solicitado:</label>
                                <div className="price-input-group">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.precioSolicitado}
                                    onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                                    className="price-input"
                                  />
                                  <span className="price-base">
                                    Base: {formatCurrency(item.precioBase)}
                                  </span>
                                  {(tieneDescuento || tieneAumento) && (
                                    <span className={`price-difference ${tieneDescuento ? 'discount' : 'increase'}`}>
                                      {tieneDescuento ? '🔻' : '🔺'} {Math.abs(porcentaje)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="item-subtotal">
                                <label>Subtotal:</label>
                                <span className="subtotal-amount">
                                  {formatCurrency(item.cantidad * item.precioSolicitado)}
                                </span>
                              </div>
                              
                              <button
                                onClick={() => removeItemFromOrder(item.productId)}
                                className="btn-remove"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Motivo del cambio de precio */}
                    {hasPriceChange && (
                      <div className="price-change-reason">
                        <label>📝 Motivo del cambio de precio:</label>
                        <textarea
                          value={priceChangeReason}
                          onChange={(e) => setPriceChangeReason(e.target.value)}
                          placeholder="Explica por qué se cambió el precio (ej: descuento por cantidad, cliente especial, etc.)"
                          rows="3"
                          className="reason-textarea"
                        />
                      </div>
                    )}

                    {/* Total del pedido */}
                    <div className="purchase-total">
                      <h3>Total del Pedido: {formatCurrency(calculateTotal())}</h3>
                      {hasPriceChange ? (
                        <p className="order-status pending">⏳ Estado: Pendiente de aprobación</p>
                      ) : (
                        <p className="order-status approved">✅ Estado: Será aprobado automáticamente</p>
                      )}
                    </div>

                    {/* Botón de crear pedido */}
                    <div className="purchase-actions">
                      <button
                        onClick={createOrder}
                        disabled={loading || orderItems.length === 0 || (hasPriceChange && !priceChangeReason.trim())}
                        className="btn-primary big-btn"
                      >
                        {hasPriceChange ? '📤 Enviar para Aprobación' : '✅ Crear Pedido y Venta'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal de Selección de Cliente */}
        {showClientModal && (
          <div className="form-overlay">
            <div className="form-container">
              <div className="form-header">
                <h3>👤 Seleccionar Cliente</h3>
                <button
                  onClick={() => {
                    setShowClientModal(false);
                    setClientSearch('');
                  }}
                  className="btn-close"
                >
                  ❌
                </button>
              </div>
              
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="suppliers-list">
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <div
                      key={client.id}
                      className="supplier-item"
                      onClick={() => selectClient(client)}
                    >
                      <div className="supplier-info">
                        <strong>{client.name}</strong>
                        {client.phone && <span>Tel: {client.phone}</span>}
                        {client.email && <span>Email: {client.email}</span>}
                      </div>
                      <button className="btn-select">Seleccionar</button>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No se encontraron clientes</p>
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
    </div>
  );
};

export default Orders;