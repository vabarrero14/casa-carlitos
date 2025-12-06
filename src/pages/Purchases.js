import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './Purchases.css';

const Purchases = () => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('newPurchase');
  
  // Estados para nueva compra
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    loadProducts();
    loadSuppliers();
    loadPurchases();
    generatePurchaseNumber();
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

  // Filtrar proveedores para búsqueda en modal
  useEffect(() => {
    if (supplierSearch) {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (supplier.ruc && supplier.ruc.includes(supplierSearch))
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [supplierSearch, suppliers]);

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

  const loadSuppliers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersList = [];
      querySnapshot.forEach((doc) => {
        suppliersList.push({ id: doc.id, ...doc.data() });
      });
      setSuppliers(suppliersList);
      setFilteredSuppliers(suppliersList);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      showNotification('Error al cargando proveedores', 'error');
    }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchases'), orderBy('fecha', 'desc'));
      const querySnapshot = await getDocs(q);
      const purchasesList = [];
      querySnapshot.forEach((doc) => {
        const purchaseData = doc.data();
        purchasesList.push({ 
          id: doc.id, 
          ...purchaseData,
          // Asegurar que items esté definido
          items: purchaseData.items || []
        });
      });
      setPurchases(purchasesList);
      setFilteredPurchases(purchasesList);
    } catch (error) {
      console.error('Error cargando compras:', error);
      showNotification('Error al cargar compras', 'error');
    }
    setLoading(false);
  };

  const generatePurchaseNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    setPurchaseNumber(`COMP-${timestamp}-${random}`);
  };

  // Agregar producto a la compra
  const addProductToPurchase = (product) => {
    const existingItem = purchaseItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Si ya existe, aumentar cantidad
      setPurchaseItems(prev => prev.map(item =>
        item.productId === product.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      // Agregar nuevo producto con precio de compra editable
      const newItem = {
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        cantidad: 1,
        precioUnitario: product.lastPurchasePrice || product.purchasePrice || product.price,
        stockActual: product.stock
      };
      setPurchaseItems(prev => [...prev, newItem]);
    }
  };

  // Actualizar cantidad de un producto
  const updateItemQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setPurchaseItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, cantidad: parseInt(newQuantity) }
        : item
    ));
  };

  // Actualizar precio de compra de un producto
  const updateItemPrice = (productId, newPrice) => {
    if (newPrice < 0) return;
    
    setPurchaseItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, precioUnitario: parseFloat(newPrice) }
        : item
    ));
  };

  // Remover producto de la compra
  const removeItemFromPurchase = (productId) => {
    setPurchaseItems(prev => prev.filter(item => item.productId !== productId));
  };

  // Calcular total de la compra
  const calculateTotal = () => {
    return purchaseItems.reduce((total, item) => {
      return total + (item.cantidad * item.precioUnitario);
    }, 0);
  };

  // Seleccionar proveedor desde modal
  const selectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierModal(false);
    setSupplierSearch('');
  };

  // Registrar compra
  const registerPurchase = async () => {
    if (!selectedSupplier) {
      showNotification('Selecciona un proveedor', 'error');
      return;
    }

    if (purchaseItems.length === 0) {
      showNotification('Agrega productos a la compra', 'error');
      return;
    }

    setLoading(true);
    showNotification('Registrando compra...', 'loading');

    try {
      const total = calculateTotal();

      // 1. Crear documento de compra
      const purchaseData = {
        numero: purchaseNumber,
        proveedor: selectedSupplier.name,
        proveedorId: selectedSupplier.id,
        fecha: new Date(purchaseDate),
        items: purchaseItems,
        total: total,
        createdAt: new Date()
      };

      const purchaseDoc = await addDoc(collection(db, 'purchases'), purchaseData);

      // 2. Actualizar stock y último precio de compra de cada producto
      for (const item of purchaseItems) {
        const productRef = doc(db, 'products', item.productId);
        const product = products.find(p => p.id === item.productId);
        
        const nuevoStock = product.stock + item.cantidad;
        
        await updateDoc(productRef, {
          stock: nuevoStock,
          lastPurchasePrice: item.precioUnitario
        });

        // 3. Registrar movimiento de stock
        await addDoc(collection(db, 'stock_movements'), {
          productId: item.productId,
          productName: item.productName,
          tipo: 'compra',
          cantidad: item.cantidad,
          stockAnterior: product.stock,
          stockActual: nuevoStock,
          precioUnitario: item.precioUnitario,
          totalMovimiento: item.cantidad * item.precioUnitario,
          referencia: purchaseNumber,
          proveedor: selectedSupplier.name,
          fecha: new Date()
        });
      }

      showNotification('✅ Compra registrada correctamente', 'success');
      
      // Limpiar formulario
      setPurchaseItems([]);
      setSelectedSupplier(null);
      generatePurchaseNumber();
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      
      // Recargar datos
      loadProducts();
      loadPurchases();
      
    } catch (error) {
      console.error('Error registrando compra:', error);
      showNotification('❌ Error al registrar compra', 'error');
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
      <h2>🛒 Compras a Proveedores</h2>

      {/* Navegación */}
      <div className="reports-nav">
        <button
          className={`report-btn ${activeSection === 'newPurchase' ? 'active' : ''}`}
          onClick={() => setActiveSection('newPurchase')}
        >
          ➕ Nueva Compra
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
            {/* Sección: Nueva Compra */}
            {activeSection === 'newPurchase' && (
              <div className="purchase-section">
                <h3>➕ Nueva Compra</h3>

                {/* Información de la compra */}
                <div className="purchase-info">
                  <div className="info-group">
                    <label>Número de Compra:</label>
                    <span className="purchase-number">{purchaseNumber}</span>
                  </div>
                  <div className="info-group">
                    <label>Fecha:</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                  <div className="info-group">
                    <label>Proveedor:</label>
                    <div className="supplier-selection">
                      {selectedSupplier ? (
                        <div className="selected-supplier">
                          <span>{selectedSupplier.name}</span>
                          {selectedSupplier.ruc && <span className="supplier-ruc">RUC: {selectedSupplier.ruc}</span>}
                          <button 
                            onClick={() => setSelectedSupplier(null)}
                            className="btn-change-supplier"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setShowSupplierModal(true)}
                          className="btn-select-supplier"
                        >
                          🚚 Seleccionar Proveedor
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
                        className="product-card"
                        onClick={() => addProductToPurchase(product)}
                      >
                        <div className="product-header">
                          <span className="product-name">{product.name}</span>
                          {product.code && <span className="product-code">({product.code})</span>}
                        </div>
                        <div className="product-details">
                          <span className="product-stock">Stock: {product.stock}</span>
                          <span className="product-price">
                            Últ. compra: {formatCurrency(product.lastPurchasePrice || product.purchasePrice || product.price)}
                          </span>
                        </div>
                        <div className="product-action">
                          <button className="btn-add">➕ Agregar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista de productos en la compra */}
                {purchaseItems.length > 0 && (
                  <div className="purchase-items">
                    <h4>🛒 Productos en la Compra</h4>
                    <div className="items-list">
                      {purchaseItems.map((item, index) => (
                        <div key={item.productId} className="purchase-item">
                          <div className="item-info">
                            <span className="item-name">{item.productName}</span>
                            {item.productCode && <span className="item-code">({item.productCode})</span>}
                            <span className="item-stock">Stock actual: {item.stockActual}</span>
                          </div>
                          
                          <div className="item-controls">
                            <div className="quantity-control">
                              <label>Cantidad:</label>
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => updateItemQuantity(item.productId, e.target.value)}
                                className="quantity-input"
                              />
                            </div>
                            
                            <div className="price-control">
                              <label>Precio Compra:</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precioUnitario}
                                onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                                className="price-input"
                              />
                            </div>
                            
                            <div className="item-subtotal">
                              <label>Subtotal:</label>
                              <span className="subtotal-amount">
                                {formatCurrency(item.cantidad * item.precioUnitario)}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => removeItemFromPurchase(item.productId)}
                              className="btn-remove"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total de la compra */}
                    <div className="purchase-total">
                      <h3>Total: {formatCurrency(calculateTotal())}</h3>
                    </div>

                    {/* Botón de registrar */}
                    <div className="purchase-actions">
                      <button
                        onClick={registerPurchase}
                        disabled={loading || !selectedSupplier || purchaseItems.length === 0}
                        className="btn-primary big-btn"
                      >
                        ✅ Registrar Compra
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sección: Historial de Compras */}
            {activeSection === 'history' && (
              <div className="history-section">
                <h3>📋 Historial de Compras</h3>
                
                {purchases.length > 0 ? (
                  <div className="table-container">
                    <table className="purchases-table">
                      <thead>
                        <tr>
                          <th>Número</th>
                          <th>Fecha</th>
                          <th>Proveedor</th>
                          <th>Productos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map(purchase => (
                          <tr key={purchase.id}>
                            <td className="purchase-number-cell">{purchase.numero}</td>
                            <td>{formatDate(purchase.fecha)}</td>
                            <td>{purchase.proveedor}</td>
                            <td>
                              <div className="purchase-items-summary">
                                {purchase.items && purchase.items.map((item, index) => (
                                  <div key={index} className="purchase-item-summary">
                                    {item.productName} - {item.cantidad} x {formatCurrency(item.precioUnitario)}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="amount">{formatCurrency(purchase.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay compras registradas</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal de Selección de Proveedor */}
        {showSupplierModal && (
          <div className="form-overlay">
            <div className="form-container">
              <div className="form-header">
                <h3>🚚 Seleccionar Proveedor</h3>
                <button
                  onClick={() => {
                    setShowSupplierModal(false);
                    setSupplierSearch('');
                  }}
                  className="btn-close"
                >
                  ❌
                </button>
              </div>

              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Buscar proveedor..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="suppliers-list">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map(supplier => (
                    <div
                      key={supplier.id}
                      className="supplier-item"
                      onClick={() => selectSupplier(supplier)}
                    >
                      <div className="supplier-info">
                        <strong>{supplier.name}</strong>
                        {supplier.ruc && <span>RUC: {supplier.ruc}</span>}
                        {supplier.phone && <span>Tel: {supplier.phone}</span>}
                      </div>
                      <button className="btn-select">Seleccionar</button>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No se encontraron proveedores</p>
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

export default Purchases;