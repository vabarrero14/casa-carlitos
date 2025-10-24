import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import './Sales.css';

const Sales = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [saleInProgress, setSaleInProgress] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);

  // Cargar productos al iniciar el componente
  useEffect(() => {
    loadProducts();
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

  // Cargar historial de ventas
  const loadSalesHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sales'));
      const salesList = [];
      querySnapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar por fecha más reciente
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

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Si ya está en el carrito, aumentar cantidad
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
      // Si no está en el carrito, agregarlo
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
        customerName: customerName || 'Cliente general',
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
      alert(`✅ Venta completada exitosamente!\nTotal: $${total}`);
      
      setCart([]);
      setCustomerName('');
      setSaleInProgress(false);
      loadProducts(); // Recargar productos con nuevo stock
      loadSalesHistory(); // Actualizar historial

    } catch (error) {
      console.error('Error completando venta:', error);
      alert('Error al completar la venta');
    }
  };

  // Iniciar nueva venta
  const startNewSale = () => {
    setSaleInProgress(true);
    setCart([]);
    setCustomerName('');
    setSearchTerm('');
    loadProducts(); // ← ESTA LÍNEA FALTABA
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
        <button className="big-btn">👥 Clientes Frecuentes</button>
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
          <div className="customer-info">
            <input
              type="text"
              placeholder="👤 Nombre del cliente (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="customer-input"
            />
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