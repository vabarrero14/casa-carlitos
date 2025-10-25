import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs,
  updateDoc,
  doc,
  query,
  where 
} from 'firebase/firestore';
import './Sales.css';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [saleInProgress, setSaleInProgress] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [newQuickClient, setNewQuickClient] = useState({
    name: '',
    document: '',
    phone: ''
  });

  // Cargar productos y clientes al iniciar
  useEffect(() => {
    loadProducts();
    loadClients();
  }, []);

  // Cargar productos
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
      alert('Error al cargar productos');
    }
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
        alert('No hay suficiente stock disponible');
      }
    } else {
      if (product.stock > 0) {
        setCart([...cart, { ...product, quantity: 1 }]);
      } else {
        alert('Producto sin stock disponible');
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
      alert(`Solo hay ${product.stock} unidades en stock`);
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
      
      alert('✅ Cliente creado y seleccionado');
    } catch (error) {
      console.error('Error creando cliente:', error);
      alert('Error al crear cliente');
    }
  };

  // Finalizar venta
  const completeSale = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      // 1. Guardar la venta en Firebase
      const saleData = {
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

      await addDoc(collection(db, 'sales'), saleData);

      // 2. Actualizar stock de cada producto
      const updatePromises = cart.map(async (item) => {
        const newStock = item.stock - item.quantity;
        await updateDoc(doc(db, 'products', item.id), {
          stock: newStock
        });
      });

      await Promise.all(updatePromises);

      // 3. Mostrar resumen y limpiar
      const customerName = customer ? customer.name : 'Cliente general';
      alert(`✅ Venta completada exitosamente!\nCliente: ${customerName}\nTotal: $${total}`);
      
      setCart([]);
      setCustomer(null);
      setSaleInProgress(false);
      setShowClientSearch(false);
      loadProducts();
      loadSalesHistory();

    } catch (error) {
      console.error('Error completando venta:', error);
      alert('Error al completar la venta');
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

  return (
    <div className="page">
      <h2>🧾 Punto de Venta</h2>

      {/* Botones principales */}
      <div className="action-buttons">
        <button 
          className="big-btn" 
          onClick={startNewSale}
          disabled={saleInProgress}
        >
          🛒 Nueva Venta
        </button>
        
        <button 
          className="big-btn" 
          onClick={() => {
            setShowHistory(true);
            loadSalesHistory();
          }}
        >
          📜 Historial de Ventas
        </button>
        
        <button className="big-btn">🔍 Buscar Venta</button>
        <button className="big-btn">📄 Facturas del Día</button>
      </div>

      {/* Proceso de venta */}
      {saleInProgress && (
        <div className="sale-process">
          <div className="sale-header">
            <h3>🛒 Venta en Proceso</h3>
            <button 
              className="btn-secondary"
              onClick={() => setSaleInProgress(false)}
            >
              ❌ Cancelar Venta
            </button>
          </div>

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

          {/* Búsqueda de clientes */}
          {showClientSearch && (
            <div className="client-search-overlay">
              <div className="client-search-container">
                <div className="client-search-header">
                  <h4>🔍 Buscar Cliente</h4>
                  <button 
                    onClick={() => setShowClientSearch(false)}
                    className="btn-secondary"
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
                <h4>➕ Crear Cliente Rápido</h4>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de ventas */}
      {showHistory && (
        <div className="history-overlay">
          <div className="history-container">
            <div className="history-header">
              <h3>📜 Historial de Ventas</h3>
              <button 
                className="btn-secondary"
                onClick={() => setShowHistory(false)}
              >
                ← Volver
              </button>
            </div>

            <div className="sales-list">
              {salesHistory.map((sale) => (
                <div key={sale.id} className="sale-item">
                  <div className="sale-header-info">
                    <span className="sale-date">{formatDate(sale.createdAt)}</span>
                    <span className="sale-customer">{sale.customerName}</span>
                    <span className="sale-total">${sale.total?.toFixed(2)}</span>
                  </div>
                  <div className="sale-items">
                    {sale.items?.map((item, index) => (
                      <div key={index} className="sale-item-product">
                        {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {salesHistory.length === 0 && (
                <p className="no-sales">No hay ventas registradas</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;