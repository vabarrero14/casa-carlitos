import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './Products.css';

const Products = () => {
  const [activeSection, setActiveSection] = useState('addProduct');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [loading, setLoading] = useState(false);
  
  // Estados para formularios
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'ferreteria',
    code: ''
  });

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar productos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadProducts();
  }, []);

  // Función para mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

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

  // Filtrar productos
  useEffect(() => {
    let filtered = products;
    
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  // Agregar producto
  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    // Mostrar notificación de carga
    showNotification('Agregando producto...', 'loading');
    
    try {
      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        category: newProduct.category,
        code: newProduct.code,
        createdAt: new Date()
      });
      
      // Mostrar notificación de éxito
      showNotification('✅ Producto agregado correctamente', 'success');
      
      setNewProduct({ name: '', price: '', stock: '', category: 'ferreteria', code: '' });
      setShowAddForm(false);
      loadProducts();
    } catch (error) {
      console.error('Error agregando producto:', error);
      // Mostrar notificación de error
      showNotification('❌ Error al agregar producto', 'error');
    }
  };

  // Actualizar stock
  const updateStock = async (productId, newStock) => {
    showNotification('Actualizando stock...', 'loading');
    
    try {
      await updateDoc(doc(db, 'products', productId), {
        stock: parseInt(newStock)
      });
      
      showNotification('✅ Stock actualizado correctamente', 'success');
      loadProducts();
    } catch (error) {
      console.error('Error actualizando stock:', error);
      showNotification('❌ Error al actualizar stock', 'error');
    }
  };

  // Editar producto
  const handleEditProduct = async (e) => {
    e.preventDefault();
    showNotification('Actualizando producto...', 'loading');
    
    try {
      await updateDoc(doc(db, 'products', editingProduct.id), {
        name: editingProduct.name,
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        category: editingProduct.category,
        code: editingProduct.code
      });
      
      showNotification('✅ Producto actualizado correctamente', 'success');
      setShowEditForm(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error editando producto:', error);
      showNotification('❌ Error al editar producto', 'error');
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${productName}"?`)) {
      showNotification('Eliminando producto...', 'loading');
      
      try {
        await deleteDoc(doc(db, 'products', productId));
        showNotification('✅ Producto eliminado correctamente', 'success');
        loadProducts();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        showNotification('❌ Error al eliminar producto', 'error');
      }
    }
  };

  // Abrir formulario de edición
  const openEditForm = (product) => {
    setEditingProduct(product);
    setShowEditForm(true);
  };

  // Estadísticas
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock <= 10).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  return (
    <div className="page">
      <h2>📦 Gestión de Productos</h2>

      {/* Navegación tipo Reportes */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeSection === 'addProduct' ? 'active' : ''}`}
          onClick={() => setActiveSection('addProduct')}
        >
          ➕ Agregar Producto
        </button>
        <button 
          className={`report-btn ${activeSection === 'viewProducts' ? 'active' : ''}`}
          onClick={() => setActiveSection('viewProducts')}
        >
          📋 Ver Productos
        </button>
        <button 
          className={`report-btn ${activeSection === 'lowStock' ? 'active' : ''}`}
          onClick={() => setActiveSection('lowStock')}
        >
          📦 Stock Bajo
        </button>
        <button 
          className={`report-btn ${activeSection === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveSection('categories')}
        >
          🏷️ Categorías
        </button>
      </div>

      {/* Contenido principal */}
      <div className="reports-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Cargando productos...
          </div>
        ) : (
          <>
            {/* Sección: Agregar Producto */}
            {activeSection === 'addProduct' && (
              <div className="report-section">
                <h3>➕ Agregar Nuevo Producto</h3>
                
                <div className="summary-cards">
                  <div className="summary-card total-products">
                    <h4>Total Productos</h4>
                    <p className="amount">{totalProducts}</p>
                  </div>
                  <div className="summary-card low-stock-alert">
                    <h4>Stock Bajo</h4>
                    <p className="amount">{lowStockProducts}</p>
                  </div>
                  <div className="summary-card out-of-stock">
                    <h4>Sin Stock</h4>
                    <p className="amount">{outOfStockProducts}</p>
                  </div>
                </div>

                {/* Solo el botón para abrir modal */}
                <div className="add-product-button-container">
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary big-add-btn"
                  >
                    ➕ Agregar Nuevo Producto
                  </button>
                </div>
              </div>
            )}

            {/* Sección: Ver Productos */}
            {activeSection === 'viewProducts' && (
              <div className="report-section">
                <h3>📋 Lista de Productos ({filteredProducts.length})</h3>

                {/* Filtros y búsqueda */}
                <div className="filters-section">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="🔍 Buscar por nombre o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  <div className="category-filters">
                    <label>Filtrar por categoría:</label>
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="category-select"
                    >
                      <option value="todos">Todos</option>
                      <option value="ferreteria">Ferretería</option>
                      <option value="pintureria">Pinturería</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                </div>

                {/* Lista de productos */}
                {filteredProducts.length > 0 ? (
                  <div className="table-container">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Precio</th>
                          <th>Stock</th>
                          <th>Categoría</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className={product.stock === 0 ? 'out-of-stock' : product.stock <= 10 ? 'low-stock' : ''}>
                            <td>
                              <strong>{product.name}</strong>
                              {product.code && <div className="product-code">Código: {product.code}</div>}
                            </td>
                            <td className="amount">{formatCurrency(product.price)}</td>
                            <td className={`stock ${product.stock === 0 ? 'critical' : product.stock <= 10 ? 'warning' : 'good'}`}>
                              {product.stock} unidades
                            </td>
                            <td>
                              <span className={`category-tag ${product.category}`}>
                                {product.category}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons-small">
                                <button 
                                  onClick={() => openEditForm(product)}
                                  className="btn-small btn-edit"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => {
                                    const newStock = prompt(`Nuevo stock para ${product.name}:`, product.stock);
                                    if (newStock !== null && !isNaN(newStock)) {
                                      updateStock(product.id, newStock);
                                    }
                                  }}
                                  className="btn-small btn-stock"
                                >
                                  🔄
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(product.id, product.name)}
                                  className="btn-small btn-delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">
                    {products.length === 0 
                      ? 'No hay productos registrados todavía.' 
                      : 'No se encontraron productos con los filtros aplicados.'
                    }
                  </p>
                )}
              </div>
            )}

            {/* Sección: Stock Bajo */}
            {activeSection === 'lowStock' && (
              <div className="report-section">
                <h3>📦 Productos con Stock Bajo</h3>
                
                {lowStockProducts > 0 ? (
                  <div className="table-container">
                    <table className="stock-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Stock Actual</th>
                          <th>Precio</th>
                          <th>Categoría</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products
                          .filter(product => product.stock <= 10)
                          .sort((a, b) => a.stock - b.stock)
                          .map((product) => (
                            <tr key={product.id} className={product.stock === 0 ? 'out-of-stock' : 'low-stock'}>
                              <td>
                                <strong>{product.name}</strong>
                                {product.code && <div className="product-code">Código: {product.code}</div>}
                              </td>
                              <td className={`stock ${product.stock === 0 ? 'critical' : 'warning'}`}>
                                {product.stock} unidades
                                {product.stock === 0 && <span className="stock-alert">¡AGOTADO!</span>}
                                {product.stock > 0 && product.stock <= 5 && <span className="stock-alert">¡Muy bajo!</span>}
                              </td>
                              <td className="amount">{formatCurrency(product.price)}</td>
                              <td>
                                <span className={`category-tag ${product.category}`}>
                                  {product.category}
                                </span>
                              </td>
                              <td>
                                <button 
                                  onClick={() => {
                                    const newStock = prompt(`Reponer stock para ${product.name}:`, product.stock + 10);
                                    if (newStock !== null && !isNaN(newStock)) {
                                      updateStock(product.id, newStock);
                                    }
                                  }}
                                  className="btn-small btn-primary"
                                >
                                  📥 Reponer
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">✅ Todos los productos tienen stock suficiente</p>
                )}
              </div>
            )}

            {/* Sección: Categorías */}
            {activeSection === 'categories' && (
              <div className="report-section">
                <h3>🏷️ Gestión de Categorías</h3>
                
                <div className="categories-stats">
                  <div className="category-card">
                    <h4>Ferretería</h4>
                    <p className="count">
                      {products.filter(p => p.category === 'ferreteria').length} productos
                    </p>
                  </div>
                  <div className="category-card">
                    <h4>Pinturería</h4>
                    <p className="count">
                      {products.filter(p => p.category === 'pintureria').length} productos
                    </p>
                  </div>
                  <div className="category-card">
                    <h4>Otros</h4>
                    <p className="count">
                      {products.filter(p => p.category === 'otros').length} productos
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal para Agregar Producto */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Agregar Nuevo Producto</h3>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label>Nombre del Producto:</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  required
                  placeholder="Ej: Martillo, Pintura Roja..."
                />
              </div>
              
              <div className="form-group">
                <label>Precio:</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  required
                  placeholder="0.00"
                />
              </div>
              
              <div className="form-group">
                <label>Stock Inicial:</label>
                <input
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  required
                  placeholder="0"
                />
              </div>
              
              <div className="form-group">
                <label>Categoría:</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                >
                  <option value="ferreteria">Ferretería</option>
                  <option value="pintureria">Pinturería</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Código (opcional):</label>
                <input
                  type="text"
                  value={newProduct.code}
                  onChange={(e) => setNewProduct({...newProduct, code: e.target.value})}
                  placeholder="Código interno"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  ✅ Guardar Producto
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewProduct({ name: '', price: '', stock: '', category: 'ferreteria', code: '' });
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Producto */}
      {showEditForm && editingProduct && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Editar Producto</h3>
            <form onSubmit={handleEditProduct}>
              <div className="form-group">
                <label>Nombre del Producto:</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Precio:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Stock:</label>
                <input
                  type="number"
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Categoría:</label>
                <select
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                >
                  <option value="ferreteria">Ferretería</option>
                  <option value="pintureria">Pinturería</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Código:</label>
                <input
                  type="text"
                  value={editingProduct.code || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, code: e.target.value})}
                  placeholder="Código interno"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  💾 Guardar Cambios
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingProduct(null);
                  }}
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
          duration={notification.type === 'loading' ? 0 : 4000} // Loading no se auto-cierra
        />
      )}
    </div>
  );
};

export default Products;