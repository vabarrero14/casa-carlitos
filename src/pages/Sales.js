import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import Notification from '../components/Notification';
import './Sales.css';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('newSale');

  // Estados para nueva venta
  const [selectedClient, setSelectedClient] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [saleNumber, setSaleNumber] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [showClientModal, setShowClientModal] = useState(false);

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadProducts();
    loadClients();
    loadSales();
    generateSaleNumber();
  }, []);

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
    if (searchClient) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchClient.toLowerCase())) ||
        (client.phone && client.phone.includes(searchClient))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchClient, clients]);

  // Filtrar ventas por fecha
  useEffect(() => {
    if (activeSection === 'history') {
      setFilteredSales(sales);
    }
  }, [sales, activeSection]);

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

  const loadSales = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const salesList = [];
      querySnapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() });
      });
      setSales(salesList);
      setFilteredSales(salesList);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      showNotification('Error al cargar ventas', 'error');
    }
    setLoading(false);
  };

  const generateSaleNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    setSaleNumber(`VENTA-${timestamp}-${random}`);
  };

  // Agregar producto a la venta
  const addProductToSale = (product) => {
    // Verificar stock disponible
    if (product.stock <= 0) {
      showNotification('❌ Producto sin stock disponible', 'error');
      return;
    }

    const existingItem = saleItems.find(item => item.productId === product.id);

    if (existingItem) {
      // Verificar que no exceda el stock disponible
      if (existingItem.cantidad + 1 > product.stock) {
        showNotification('❌ No hay suficiente stock disponible', 'error');
        return;
      }

      // Si ya existe, aumentar cantidad
      setSaleItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      // Agregar nuevo producto con precio de venta editable
      const newItem = {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        cantidad: 1,
        precioUnitario: product.salePrice || product.price,
        precioBase: product.salePrice || product.price,
        stockActual: product.stock,
        stockDisponible: product.stock
      };
      setSaleItems(prev => [...prev, newItem]);
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

    setSaleItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, cantidad: parseInt(newQuantity) }
        : item
    ));
  };

  // Actualizar precio de venta de un producto
  const updateItemPrice = (productId, newPrice) => {
    if (newPrice < 0) return;
    setSaleItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, precioUnitario: parseFloat(newPrice) }
        : item
    ));
  };

  // Remover producto de la venta
  const removeItemFromSale = (productId) => {
    setSaleItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Calcular total de la venta
  const calculateTotal = () => {
    return saleItems.reduce((total, item) => {
      return total + (item.cantidad * item.precioUnitario);
    }, 0);
  };

  // Calcular diferencia con precio base
  const calculatePriceDifference = (item) => {
    const diferencia = item.precioUnitario - item.precioBase;
    const porcentaje = ((diferencia / item.precioBase) * 100).toFixed(1);
    return { diferencia, porcentaje };
  };

  // Seleccionar cliente desde modal
  const selectClient = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);
    setSearchClient('');
  };

  // Registrar venta
  const registerSale = async () => {
    if (saleItems.length === 0) {
      showNotification('Agrega productos a la venta', 'error');
      return;
    }

    // Verificar stock antes de registrar
    for (const item of saleItems) {
      const product = products.find(p => p.id === item.productId);
      if (item.cantidad > product.stock) {
        showNotification(`❌ Stock insuficiente para ${item.productName}`, 'error');
        return;
      }
    }

    setLoading(true);
    showNotification('Registrando venta...', 'loading');

    try {
      const client = selectedClient;
      const total = calculateTotal();

      // 1. Crear documento de venta
      const saleData = {
        numero: saleNumber,
        cliente: client ? client.name : 'Cliente general',
        clienteId: client ? client.id : null,
        fecha: new Date(saleDate),
        items: saleItems,
        total: total,
        metodoPago: paymentMethod,
        createdAt: new Date(),
        source: 'direct' // Indica que es venta directa (no desde pedido)
      };

      const saleDoc = await addDoc(collection(db, 'sales'), saleData);

      // 2. Actualizar stock de cada producto
      for (const item of saleItems) {
        const productRef = doc(db, 'products', item.productId);
        const product = products.find(p => p.id === item.productId);
        const nuevoStock = product.stock - item.cantidad;

        await updateDoc(productRef, {
          stock: nuevoStock
        });

        // 3. Registrar movimiento de stock
        await addDoc(collection(db, 'stock_movements'), {
          productId: item.productId,
          productName: item.productName,
          tipo: 'venta',
          subtipo: 'directa',
          cantidad: item.cantidad,
          stockAnterior: product.stock,
          stockActual: nuevoStock,
          precioUnitario: item.precioUnitario,
          totalMovimiento: item.cantidad * item.precioUnitario,
          referencia: saleNumber,
          cliente: client ? client.name : 'Cliente general',
          fecha: new Date(),
          precioBase: item.precioBase,
          diferenciaPrecio: item.precioUnitario - item.precioBase
        });
      }

      showNotification('✅ Venta registrada correctamente', 'success');

      // Limpiar formulario
      setSaleItems([]);
      setSelectedClient(null);
      setSearchClient('');
      generateSaleNumber();
      setSaleDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('efectivo');

      // Recargar datos
      loadProducts();
      loadSales();

    } catch (error) {
      console.error('Error registrando venta:', error);
      showNotification('❌ Error al registrar venta', 'error');
    }

    setLoading(false);
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div className="page">
      <h2>💰 Punto de Venta</h2>

      {/* Navegación */}
      <div className="reports-nav">
        <button
          className={`report-btn ${activeSection === 'newSale' ? 'active' : ''}`}
          onClick={() => setActiveSection('newSale')}
        >
          ➕ Nueva Venta
        </button>
        <button
          className={`report-btn ${activeSection === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSection('history')}
        >
          📋 Historial
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
            {/* Sección: Nueva Venta */}
            {activeSection === 'newSale' && (
              <div className="sale-section">
                <h3>➕ Nueva Venta</h3>

                {/* Información de la venta */}
                <div className="sale-info">
                  <div className="info-group">
                    <label>Número de Venta:</label>
                    <span className="sale-number">{saleNumber}</span>
                  </div>

                  <div className="info-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="date-input"
                    />
                  </div>

                  <div className="info-group">
                    <label>Cliente:</label>
                    <div className="client-selection">
                      {selectedClient ? (
                        <div className="selected-client">
                          <span>{selectedClient.name}</span>
                          {selectedClient.phone && <span className="client-phone">Tel: {selectedClient.phone}</span>}
                          <button
                            onClick={() => setSelectedClient(null)}
                            className="btn-change-client"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowClientModal(true)}
                          className="btn-select-client"
                        >
                          👤 Seleccionar Cliente
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="info-group">
                    <label>Método de Pago:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="payment-select"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
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
                        onClick={() => product.stock > 0 && addProductToSale(product)}
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

                {/* Lista de productos en la venta */}
                {saleItems.length > 0 && (
                  <div className="sale-items">
                    <h4>🛒 Productos en la Venta</h4>

                    <div className="items-list">
                      {saleItems.map((item, index) => {
                        const { diferencia, porcentaje } = calculatePriceDifference(item);
                        const tieneDescuento = diferencia < 0;
                        const tieneAumento = diferencia > 0;

                        return (
                          <div key={item.productId} className="sale-item">
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
                                <label>Precio Venta:</label>
                                <div className="price-input-group">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.precioUnitario}
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
                                  {formatCurrency(item.cantidad * item.precioUnitario)}
                                </span>
                              </div>

                              <button
                                onClick={() => removeItemFromSale(item.productId)}
                                className="btn-remove"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total de la venta */}
                    <div className="sale-total">
                      <h3>Total: {formatCurrency(calculateTotal())}</h3>
                    </div>

                    {/* Botón de registrar */}
                    <div className="sale-actions">
                      <button
                        onClick={registerSale}
                        disabled={loading || saleItems.length === 0}
                        className="btn-primary big-btn"
                      >
                        ✅ Registrar Venta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección: Historial de Ventas */}
            {activeSection === 'history' && (
              <div className="history-section">
                <h3>📋 Historial de Ventas</h3>

                {sales.length > 0 ? (
                  <div className="table-container">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Número</th>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Productos</th>
                          <th>Total</th>
                          <th>Pago</th>
                          <th>Origen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(sale => (
                          <tr key={sale.id}>
                            <td className="sale-number-cell">
                              <div className="sale-number-main">{sale.numero}</div>
                              {sale.orderNumber && (
                                <div className="order-reference">
                                  📋 Pedido: {sale.orderNumber}
                                  {sale.source === 'order' && (
                                    <span className="source-badge order">Desde pedido</span>
                                  )}
                                </div>
                              )}
                              {(!sale.source || sale.source === 'direct') && (
                                <div className="order-reference">
                                  <span className="source-badge direct">Venta directa</span>
                                </div>
                              )}
                            </td>
                            <td>{formatDate(sale.createdAt)}</td>
                            <td>{sale.cliente}</td>
                            <td>
                              <div className="sale-items-summary">
                                {sale.items && sale.items.map((item, index) => (
                                  <div key={index} className="sale-item-summary">
                                    {item.productName} - {item.cantidad} x {formatCurrency(item.precioUnitario)}
                                    {item.precioUnitario !== item.precioBase && (
                                      <span className="price-note">
                                        {item.precioUnitario > item.precioBase ? ' 🔺' : ' 🔻'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="amount">{formatCurrency(sale.total)}</td>
                            <td>
                              <span className={`payment-method ${sale.metodoPago}`}>
                                {sale.metodoPago}
                              </span>
                              {sale.aprobadoPor && sale.aprobadoPor !== 'sistema' && (
                                <div className="approved-by">
                                  Aprobado por: {sale.aprobadoPor}
                                </div>
                              )}
                              {sale.aprobadoPor === 'sistema' && (
                                <div className="approved-by">
                                  Auto-aprobado
                                </div>
                              )}
                            </td>
                            <td className="source-column">
                              {sale.source === 'order' ? (
                                <div className="order-origin">
                                  <div className="order-badge">📋 Pedido</div>
                                  {sale.hasPriceChange && (
                                    <div className="price-change-indicator">
                                      {sale.priceChangeReason ? 'Con cambios' : 'Sin cambios'}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="direct-origin">
                                  <div className="direct-badge">💰 Directa</div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay ventas registradas</p>
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
                    setSearchClient('');
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
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="clients-list">
                {filteredClients.length > 0 ? (
                  filteredClients.map(client => (
                    <div
                      key={client.id}
                      className="client-item"
                      onClick={() => selectClient(client)}
                    >
                      <div className="client-info">
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

export default Sales;