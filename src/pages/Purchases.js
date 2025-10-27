import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import './Purchases.css';

const Purchases = () => {
  const [activeSection, setActiveSection] = useState('newPurchase');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Nuevos estados para historial
  const [purchasesHistory, setPurchasesHistory] = useState([]);

  // Cargar productos y proveedores
  useEffect(() => {
    loadProducts();
    loadSuppliers();
    loadPurchasesHistory();
    generatePurchaseNumber();
  }, []);

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
      alert('❌ Error al cargar productos');
    }
    setLoading(false);
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
    }
  };

  // Cargar historial de compras
  const loadPurchasesHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'purchases'));
      const purchasesList = [];
      querySnapshot.forEach((doc) => {
        purchasesList.push({ id: doc.id, ...doc.data() });
      });
      
      // Ordenar por fecha más reciente
      purchasesList.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      setPurchasesHistory(purchasesList);
    } catch (error) {
      console.error('Error cargando historial de compras:', error);
    }
  };

  const generatePurchaseNumber = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    setPurchaseNumber(`COMP-${timestamp}-${random}`);
  };

  // Filtrar productos
  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(product =>
        product.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.code?.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [productSearch, products]);

  // Filtrar proveedores - CORREGIDO CON ruc
  useEffect(() => {
    if (supplierSearch) {
      const filtered = suppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        supplier.contactName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        supplier.ruc?.includes(supplierSearch)
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [supplierSearch, suppliers]);

  // Iniciar nueva compra
  const startNewPurchase = () => {
    setPurchaseInProgress(true);
    setPurchaseItems([]);
    setSelectedSupplier(null);
    setProductSearch('');
    setSupplierSearch('');
    setNotes('');
    generatePurchaseNumber();
  };

  // Seleccionar proveedor
  const selectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierSearch(false);
    setSupplierSearch('');
  };

  // Remover proveedor
  const removeSupplier = () => {
    setSelectedSupplier(null);
  };

  // Agregar producto al carrito de compra
  const addToPurchase = (product) => {
    const existingItem = purchaseItems.find(item => item.id === product.id);

    if (existingItem) {
      // Si ya está en el carrito, aumentar cantidad
      setPurchaseItems(purchaseItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      // Si no está en el carrito, agregarlo
      setPurchaseItems([...purchaseItems, {
        ...product,
        quantity: 1,
        purchasePrice: product.price || 0
      }]);
    }
  };

  // Remover producto del carrito
  const removeFromPurchase = (productId) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== productId));
  };

  // Actualizar cantidad en carrito
  const updatePurchaseQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromPurchase(productId);
      return;
    }

    setPurchaseItems(purchaseItems.map(item =>
      item.id === productId
        ? { ...item, quantity: parseInt(newQuantity) }
        : item
    ));
  };

  // Actualizar precio de compra
  const updatePurchasePrice = (productId, newPrice) => {
    setPurchaseItems(purchaseItems.map(item =>
      item.id === productId
        ? { ...item, purchasePrice: parseFloat(newPrice) || 0 }
        : item
    ));
  };

  // Calcular totales
  const subtotal = purchaseItems.reduce((sum, item) => 
    sum + ((item.purchasePrice || 0) * item.quantity), 0
  );
  const total = subtotal;

  // Formatear fecha para el historial
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  // Finalizar compra
  const completePurchase = async () => {
    if (purchaseItems.length === 0) {
      alert('❌ No hay productos en la compra');
      return;
    }

    if (!selectedSupplier) {
      alert('❌ Debe seleccionar un proveedor');
      return;
    }

    try {
      // 1. Guardar la compra en Firebase
      const purchaseData = {
        purchaseNumber,
        supplier: {
          id: selectedSupplier.id,
          name: selectedSupplier.name || 'Proveedor sin nombre',
          ruc: selectedSupplier.ruc || 'Sin RUC',
          contactName: selectedSupplier.contactName || '',
          phone: selectedSupplier.phone || '',
          email: selectedSupplier.email || '',
          address: selectedSupplier.address || ''
        },
        items: purchaseItems.map(item => ({
          id: item.id,
          name: item.name || 'Producto sin nombre',
          code: item.code || '',
          quantity: item.quantity,
          purchasePrice: item.purchasePrice || 0,
          total: (item.purchasePrice || 0) * item.quantity
        })),
        subtotal,
        total,
        notes: notes || '',
        status: 'completed',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'purchases'), purchaseData);

      // 2. Actualizar stock y precio de costo de cada producto
      const updatePromises = purchaseItems.map(async (item) => {
        const currentProduct = products.find(p => p.id === item.id);
        const newStock = (currentProduct?.stock || 0) + item.quantity;
        
        await updateDoc(doc(db, 'products', item.id), {
          stock: newStock,
          costPrice: item.purchasePrice || 0
        });
      });

      await Promise.all(updatePromises);

      // 3. Mostrar resumen y limpiar
      alert(`✅ Compra registrada exitosamente!\nProveedor: ${selectedSupplier.name}\nTotal: $${total.toFixed(2)}`);

      setPurchaseItems([]);
      setSelectedSupplier(null);
      setPurchaseInProgress(false);
      setNotes('');
      loadProducts(); // Recargar productos con nuevo stock
      loadPurchasesHistory(); // Actualizar historial

    } catch (error) {
      console.error('Error completando compra:', error);
      alert('❌ Error al registrar la compra: ' + error.message);
    }
  };

  // Estadísticas
  const todayPurchases = purchasesHistory.filter(purchase => 
    purchase.createdAt?.toDate().toDateString() === new Date().toDateString()
  );
  const todayTotal = todayPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalPurchases = purchasesHistory.length;
  const totalSpent = purchasesHistory.reduce((sum, purchase) => sum + purchase.total, 0);

  return (
    <div className="page">
      <h2>🛒 Módulo de Compras</h2>

      {/* Navegación tipo Sales */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeSection === 'newPurchase' ? 'active' : ''}`}
          onClick={() => setActiveSection('newPurchase')}
        >
          🛒 Nueva Compra
        </button>
        <button 
          className={`report-btn ${activeSection === 'purchasesHistory' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('purchasesHistory');
            loadPurchasesHistory();
          }}
        >
          📜 Historial
        </button>
        <button 
          className={`report-btn ${activeSection === 'todayPurchases' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('todayPurchases');
            loadPurchasesHistory();
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
            {/* Sección: Nueva Compra */}
            {activeSection === 'newPurchase' && (
              <div className="report-section">
                <h3>🛒 Nueva Compra</h3>
                
                <div className="summary-cards">
                  <div className="summary-card today-purchases">
                    <h4>Compras Hoy</h4>
                    <p className="amount">{formatCurrency(todayTotal)}</p>
                  </div>
                  <div className="summary-card total-purchases">
                    <h4>Total Compras</h4>
                    <p className="amount">{totalPurchases}</p>
                  </div>
                  <div className="summary-card total-spent">
                    <h4>Total Gastado</h4>
                    <p className="amount">{formatCurrency(totalSpent)}</p>
                  </div>
                </div>

                {/* Proceso de compra */}
                {!purchaseInProgress ? (
                  <div className="start-purchase-container">
                    <button 
                      onClick={startNewPurchase}
                      className="btn-primary big-add-btn"
                    >
                      🛒 Iniciar Nueva Compra
                    </button>
                  </div>
                ) : (
                  <div className="purchase-process">
                    <div className="purchase-header">
                      <h3>📦 Compra en Proceso</h3>
                      <div className="purchase-info">
                        <span><strong>N°:</strong> {purchaseNumber}</span>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => setPurchaseInProgress(false)}
                      >
                        ❌ Cancelar Compra
                      </button>
                    </div>

                    {/* Información del proveedor */}
                    <div className="supplier-section">
                      <div className="supplier-display">
                        {selectedSupplier ? (
                          <div className="selected-supplier">
                            <span>🏢 Proveedor: <strong>{selectedSupplier.name}</strong> ({selectedSupplier.ruc || 'Sin RUC'})</span>
                            <button 
                              onClick={removeSupplier}
                              className="btn-small btn-remove"
                            >
                              ❌
                            </button>
                          </div>
                        ) : (
                          <div className="no-supplier">
                            <span>🏢 Sin proveedor seleccionado</span>
                            <button 
                              onClick={() => setShowSupplierSearch(true)}
                              className="btn-small btn-primary"
                            >
                              🔍 Buscar Proveedor
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="purchase-layout">
                      {/* Columna izquierda - Búsqueda y productos */}
                      <div className="products-column">
                        <div className="search-section">
                          <input
                            type="text"
                            placeholder="🔍 Buscar producto por nombre o código..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="search-input"
                          />
                        </div>

                        <div className="products-grid">
                          {filteredProducts.map((product) => (
                            <div 
                              key={product.id}
                              className="product-item"
                              onClick={() => addToPurchase(product)}
                            >
                              <h4>{product.name}</h4>
                              <p>💰 ${product.price}</p>
                              <p>📦 Stock: {product.stock || 0}</p>
                              {product.code && <p>🔢 Código: {product.code}</p>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Columna derecha - Detalle de compra */}
                      <div className="purchase-column">
                        <div className="purchase-container">
                          <h4>📋 Detalle de Compra</h4>

                          {purchaseItems.length === 0 ? (
                            <p className="empty-purchase">No hay productos en la compra</p>
                          ) : (
                            <>
                              <div className="purchase-items">
                                {purchaseItems.map((item) => (
                                  <div key={item.id} className="purchase-item">
                                    <div className="item-info">
                                      <span className="item-name">{item.name}</span>
                                      <span className="item-price">${item.purchasePrice} c/u</span>
                                    </div>
                                    <div className="item-controls">
                                      <button
                                        onClick={() => updatePurchaseQuantity(item.id, item.quantity - 1)}
                                        className="qty-btn"
                                      >
                                        -
                                      </button>
                                      <span className="item-qty">{item.quantity}</span>
                                      <button
                                        onClick={() => updatePurchaseQuantity(item.id, item.quantity + 1)}
                                        className="qty-btn"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => removeFromPurchase(item.id)}
                                        className="remove-btn"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                    <div className="price-controls">
                                      <label>Precio Compra:</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={item.purchasePrice}
                                        onChange={(e) => updatePurchasePrice(item.id, e.target.value)}
                                        className="price-input"
                                      />
                                    </div>
                                    <div className="item-total">
                                      ${((item.purchasePrice || 0) * item.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="purchase-totals">
                                <div className="total-line">
                                  <span>Subtotal:</span>
                                  <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="total-line grand-total">
                                  <span>Total:</span>
                                  <span>${total.toFixed(2)}</span>
                                </div>
                              </div>

                              {/* Notas de la compra */}
                              <div className="purchase-notes">
                                <label>Notas (opcional):</label>
                                <textarea
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  placeholder="Observaciones de la compra..."
                                  rows="2"
                                />
                              </div>

                              <button
                                onClick={completePurchase}
                                className="btn-primary complete-purchase-btn"
                              >
                                ✅ Registrar Compra
                              </button>
                              
                              <button 
                                onClick={() => setPurchaseInProgress(false)}
                                className="btn-secondary"
                                style={{ marginTop: '10px' }}
                              >
                                ❌ Cancelar Compra
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

            {/* Sección: Historial de Compras */}
            {activeSection === 'purchasesHistory' && (
              <div className="report-section">
                <h3>📜 Historial de Compras ({purchasesHistory.length})</h3>

                {purchasesHistory.length > 0 ? (
                  <div className="table-container">
                    <table className="purchases-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Proveedor</th>
                          <th>Productos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchasesHistory.map((purchase) => (
                          <tr key={purchase.id}>
                            <td>{formatDate(purchase.createdAt)}</td>
                            <td>{purchase.supplier?.name}</td>
                            <td>
                              {purchase.items?.slice(0, 2).map(item => item.name).join(', ')}
                              {purchase.items?.length > 2 && '...'}
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

            {/* Sección: Compras de Hoy */}
            {activeSection === 'todayPurchases' && (
              <div className="report-section">
                <h3>📅 Compras de Hoy - {new Date().toLocaleDateString('es-ES')}</h3>

                <div className="summary-cards">
                  <div className="summary-card today-purchases">
                    <h4>Total Gastado Hoy</h4>
                    <p className="amount">{formatCurrency(todayTotal)}</p>
                  </div>
                  <div className="summary-card total-transactions">
                    <h4>Compras Realizadas</h4>
                    <p className="amount">{todayPurchases.length}</p>
                  </div>
                </div>

                {todayPurchases.length > 0 ? (
                  <div className="table-container">
                    <table className="purchases-table">
                      <thead>
                        <tr>
                          <th>Hora</th>
                          <th>Proveedor</th>
                          <th>Productos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayPurchases.map((purchase) => (
                          <tr key={purchase.id}>
                            <td>
                              {purchase.createdAt?.toDate().toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td>{purchase.supplier?.name}</td>
                            <td>
                              {purchase.items?.slice(0, 2).map(item => item.name).join(', ')}
                              {purchase.items?.length > 2 && '...'}
                            </td>
                            <td className="amount">{formatCurrency(purchase.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay compras registradas hoy</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Búsqueda de proveedores */}
      {showSupplierSearch && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h3>🔍 Buscar Proveedor</h3>
              <button 
                onClick={() => setShowSupplierSearch(false)}
                className="btn-close"
              >
                ❌ Cerrar
              </button>
            </div>

            <div className="supplier-search-actions">
              <input
                type="text"
                placeholder="Buscar por nombre, contacto o RUC..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="suppliers-results">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id}
                  className="supplier-result-item"
                  onClick={() => selectSupplier(supplier)}
                >
                  <div className="supplier-info">
                    <strong>{supplier.name || 'Proveedor sin nombre'}</strong>
                    <span>📄 RUC: {supplier.ruc || 'Sin RUC'}</span>
                    {supplier.contactName && <span>👤 {supplier.contactName}</span>}
                    {supplier.phone && <span>📞 {supplier.phone}</span>}
                  </div>
                  <button className="btn-select">✅ Seleccionar</button>
                </div>
              ))}
              
              {filteredSuppliers.length === 0 && (
                <p className="no-results">No se encontraron proveedores</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;