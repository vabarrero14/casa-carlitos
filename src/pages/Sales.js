import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './Sales.css';

const Sales = () => {
  const [activeSection, setActiveSection] = useState('newSale');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [saleInProgress, setSaleInProgress] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [newQuickClient, setNewQuickClient] = useState({
    name: '',
    document: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar productos y clientes al iniciar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadProducts();
    loadClients();
    loadSalesHistory();
  }, []);

  // Función para mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Cargar productos
  const loadProducts = async () => {
    setLoading(true);
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
      showNotification('❌ Error al cargar productos', 'error');
    }
    setLoading(false);
  };

  // Cargar clientes
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
    }
  };

  // Cargar historial de ventas
  const loadSalesHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sales'));
      const salesList = [];
      querySnapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() });
      });
      salesList.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      setSalesHistory(salesList);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    }
  };

  // Filtrar productos para búsqueda
  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  // Filtrar clientes para búsqueda
  useEffect(() => {
    if (clientSearchTerm) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        (client.document && client.document.includes(clientSearchTerm))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearchTerm, clients]);

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        showNotification('❌ No hay suficiente stock disponible', 'warning');
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, { ...product, quantity: 1 }]);
      } else {
        showNotification('❌ Producto sin stock disponible', 'warning');
      }
    }
  };

  // Remover producto del carrito
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Actualizar cantidad en carrito
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (newQuantity > product.stock) {
      showNotification(`❌ Solo hay ${product.stock} unidades en stock`, 'warning');
      return;
    }

    setCart(cart.map(item =>
      item.id === productId 
        ? { ...item, quantity: parseInt(newQuantity) }
        : item
    ));
  };

  // Calcular totales
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  // Crear cliente rápido
  const handleCreateQuickClient = async (e) => {
    e.preventDefault();
    showNotification('Creando cliente...', 'loading');
    
    try {
      const clientData = {
        name: newQuickClient.name,
        document: newQuickClient.document,
        phone: newQuickClient.phone,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'clients'), clientData);
      
      // Seleccionar el nuevo cliente automáticamente
      setCustomer({ id: docRef.id, ...clientData });
      setShowQuickClientForm(false);
      setShowClientSearch(false);
      setNewQuickClient({ name: '', document: '', phone: '' });
      loadClients(); // Recargar lista de clientes
      
      showNotification('✅ Cliente creado y seleccionado', 'success');
    } catch (error) {
      console.error('Error creando cliente:', error);
      showNotification('❌ Error al crear cliente', 'error');
    }
  };

  // Finalizar venta - VERSIÓN CON REGISTRO DE MOVIMIENTOS
  const completeSale = async () => {
    if (cart.length === 0) {
      showNotification('❌ El carrito está vacío', 'warning');
      return;
    }

    showNotification('Procesando venta...', 'loading');

    try {
      // Generar número de venta
      const saleNumber = `VENT-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

      // 1. Guardar la venta en Firebase
      const saleData = {
        saleNumber,
        items: cart,
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          document: customer.document
        } : null,
        customerName: customer ? customer.name : 'Cliente general',
        subtotal,
        total,
        createdAt: new Date(),
        status: 'completed'
      };

      const saleDocRef = await addDoc(collection(db, 'sales'), saleData);

      // 2. Actualizar stock de cada producto + REGISTRAR MOVIMIENTOS
      const updatePromises = cart.map(async (item) => {
        const stockAnterior = item.stock;
        const newStock = stockAnterior - item.quantity;
        
        // Actualizar stock del producto
        await updateDoc(doc(db, 'products', item.id), {
          stock: newStock
        });

        // REGISTRAR MOVIMIENTO DE VENTA
        await addDoc(collection(db, 'stock_movements'), {
          productId: item.id,
          productName: item.name,
          fecha: new Date(),
          tipo: "venta",
          stockAnterior: stockAnterior,
          cantidad: item.quantity,
          stockActual: newStock,
          referencia: saleNumber,
          cliente: customer ? customer.name : 'Cliente general',
          precioVenta: item.price,
          totalMovimiento: item.price * item.quantity,
          usuario: "Sistema",
          ventaId: saleDocRef.id
        });
      });

      await Promise.all(updatePromises);

      // 3. Mostrar resumen y limpiar
      const customerName = customer ? customer.name : 'Cliente general';
      showNotification(`✅ Venta completada - Cliente: ${customerName} - Total: $${total}`, 'success');
      
      setCart([]);
      setCustomer(null);
      setSaleInProgress(false);
      setShowClientSearch(false);
      loadProducts();
      loadSalesHistory();

    } catch (error) {
      console.error('Error completando venta:', error);
      showNotification('❌ Error al completar la venta', 'error');
    }
  };

  // Iniciar nueva venta
  const startNewSale = () => {
    setSaleInProgress(true);
    setCart([]);
    setCustomer(null);
    setSearchTerm('');
    setClientSearchTerm('');
    setShowClientSearch(false);
  };

  // Seleccionar cliente
  const selectCustomer = (client) => {
    setCustomer(client);
    setShowClientSearch(false);
    setClientSearchTerm('');
  };

  // Quitar cliente seleccionado
  const removeCustomer = () => {
    setCustomer(null);
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Estadísticas
  const todaySales = salesHistory.filter(sale => 
    sale.createdAt?.toDate().toDateString() === new Date().toDateString()
  );
  const todayTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const totalSales = salesHistory.length;
  const totalRevenue = salesHistory.reduce((sum, sale) => sum + sale.total, 0);

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  return (
    <div className="page">
      <h2>🧾 Punto de Venta</h2>

      {/* Navegación tipo Reportes */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeSection === 'newSale' ? 'active' : ''}`}
          onClick={() => setActiveSection('newSale')}
        >
          🛒 Nueva Venta
        </button>
        <button 
          className={`report-btn ${activeSection === 'salesHistory' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('salesHistory');
            loadSalesHistory();
          }}
        >
          📜 Historial
        </button>
        <button 
          className={`report-btn ${activeSection === 'todaySales' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('todaySales');
            loadSalesHistory();
          }}
        >
          📅 Hoy
        </button>
      </div>

      {/* Contenido principal */}
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
              <div className="report-section">
                <h3>🛒 Nueva Venta</h3>
                
                <div className="summary-cards">
                  <div className="summary-card today-sales">
                    <h4>Ventas Hoy</h4>
                    <p className="amount">{formatCurrency(todayTotal)}</p>
                  </div>
                  <div className="summary-card total-sales">
                    <h4>Total Ventas</h4>
                    <p className="amount">{totalSales}</p>
                  </div>
                  <div className="summary-card total-revenue">
                    <h4>Ingresos Totales</h4>
                    <p className="amount">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>

                {/* Proceso de venta */}
                {!saleInProgress ? (
                  <div className="start-sale-container">
                    <button 
                      onClick={startNewSale}
                      className="btn-primary big-add-btn"
                    >
                      🛒 Iniciar Nueva Venta
                    </button>
                  </div>
                ) : (
                  <div className="sale-process">
                    {/* Información del cliente */}
                    <div className="customer-section">
                      <div className="customer-display">
                        {customer ? (
                          <div className="selected-customer">
                            <span>👤 Cliente: <strong>{customer.name}</strong> ({customer.document})</span>
                            <button 
                              onClick={removeCustomer}
                              className="btn-small btn-remove"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <div className="no-customer">
                            <span>👤 Cliente general</span>
                            <button 
                              onClick={() => setShowClientSearch(true)}
                              className="btn-small btn-primary"
                            >
                              🔍 Buscar Cliente
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sale-layout">
                      {/* Columna izquierda - Búsqueda y productos */}
                      <div className="products-column">
                        <div className="search-section">
                          <input
                            type="text"
                            placeholder="🔍 Buscar producto por nombre o código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                          />
                        </div>

                        <div className="products-grid">
                          {filteredProducts.map((product) => (
                            <div 
                              key={product.id} 
                              className={`product-item ${product.stock === 0 ? 'out-of-stock' : ''}`}
                              onClick={() => product.stock > 0 && addToCart(product)}
                            >
                              <h4>{product.name}</h4>
                              <p>💰 ${product.price}</p>
                              <p>📦 Stock: {product.stock}</p>
                              {product.stock === 0 && <span className="stock-warning">SIN STOCK</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Columna derecha - Carrito */}
                      <div className="cart-column">
                        <div className="cart-container">
                          <h4>🛒 Carrito de Compra</h4>
                          
                          {cart.length === 0 ? (
                            <p className="empty-cart">El carrito está vacío</p>
                          ) : (
                            <>
                              <div className="cart-items">
                                {cart.map((item) => (
                                  <div key={item.id} className="cart-item">
                                    <div className="item-info">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-price">${item.price} c/u</span>
                                    </div>
                                    <div className="item-controls">
                                      <button 
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        className="qty-btn"
                                      >
                                        -
                                      </button>
                                      <span className="item-qty">{item.quantity}</span>
                                      <button 
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        className="qty-btn"
                                        disabled={item.quantity >= item.stock}
                                      >
                                        +
                                      </button>
                                      <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="remove-btn"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                    <div className="item-total">
                                      ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="cart-totals">
                                <div className="total-line">
                                  <span>Subtotal:</span>
                                  <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="total-line grand-total">
                                  <span>Total:</span>
                                  <span>${total.toFixed(2)}</span>
                                </div>
                              </div>

                              <button 
                                onClick={completeSale}
                                className="btn-primary complete-sale-btn"
                              >
                                ✅ Finalizar Venta
                              </button>
                              
                              <button 
                                onClick={() => setSaleInProgress(false)}
                                className="btn-secondary"
                                style={{ marginTop: '10px' }}
                              >
                                ❌ Cancelar Venta
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección: Historial de Ventas */}
            {activeSection === 'salesHistory' && (
              <div className="report-section">
                <h3>📜 Historial de Ventas ({salesHistory.length})</h3>

                {salesHistory.length > 0 ? (
                  <div className="table-container">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Productos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesHistory.map((sale) => (
                          <tr key={sale.id}>
                            <td>{formatDate(sale.createdAt)}</td>
                            <td>{sale.customerName}</td>
                            <td>
                              {sale.items?.slice(0, 2).map(item => item.name).join(', ')}
                              {sale.items?.length > 2 && '...'}
                            </td>
                            <td className="amount">{formatCurrency(sale.total)}</td>
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

            {/* Sección: Ventas de Hoy */}
            {activeSection === 'todaySales' && (
              <div className="report-section">
                <h3>📅 Ventas de Hoy - {new Date().toLocaleDateString('es-ES')}</h3>

                <div className="summary-cards">
                  <div className="summary-card today-sales">
                    <h4>Total Vendido Hoy</h4>
                    <p className="amount">{formatCurrency(todayTotal)}</p>
                  </div>
                  <div className="summary-card total-transactions">
                    <h4>Ventas Realizadas</h4>
                    <p className="amount">{todaySales.length}</p>
                  </div>
                </div>

                {todaySales.length > 0 ? (
                  <div className="table-container">
                    <table className="sales-table">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Productos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todaySales.map((sale) => (
                          <tr key={sale.id}>
                            <td>
                              {sale.createdAt?.toDate().toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td>{sale.customerName}</td>
                            <td>
                              {sale.items?.slice(0, 2).map(item => item.name).join(', ')}
                              {sale.items?.length > 2 && '...'}
                            </td>
                            <td className="amount">{formatCurrency(sale.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay ventas registradas hoy</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Búsqueda de clientes */}
      {showClientSearch && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h3>🔍 Buscar Cliente</h3>
              <button 
                onClick={() => setShowClientSearch(false)}
                className="btn-close"
              >
                ❌ Cerrar
              </button>
            </div>

            <div className="client-search-actions">
              <input
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="search-input"
              />
              <button 
                onClick={() => setShowQuickClientForm(true)}
                className="btn-primary"
              >
                ➕ Cliente Nuevo
              </button>
            </div>

            <div className="clients-results">
              {filteredClients.map((client) => (
                <div 
                  key={client.id} 
                  className="client-result-item"
                  onClick={() => selectCustomer(client)}
                >
                  <div className="client-info">
                    <strong>{client.name}</strong>
                    <span>📄 {client.document}</span>
                    {client.phone && <span>📞 {client.phone}</span>}
                  </div>
                  <button className="btn-select">✅ Seleccionar</button>
                </div>
              ))}
              
              {filteredClients.length === 0 && (
                <p className="no-results">No se encontraron clientes</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario rápido de cliente */}
      {showQuickClientForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>➕ Crear Cliente Rápido</h3>
            <form onSubmit={handleCreateQuickClient}>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={newQuickClient.name}
                  onChange={(e) => setNewQuickClient({...newQuickClient, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Documento:</label>
                <input
                  type="text"
                  value={newQuickClient.document}
                  onChange={(e) => setNewQuickClient({...newQuickClient, document: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  value={newQuickClient.phone}
                  onChange={(e) => setNewQuickClient({...newQuickClient, phone: e.target.value})}
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  ✅ Crear y Seleccionar
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowQuickClientForm(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
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

export default Sales;