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
import './Products.css';

const Products = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Estado para nuevo producto
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'ferreteria',
    code: ''
  });

  // Cargar productos desde Firebase
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

  // Filtrar y buscar productos
  useEffect(() => {
    let filtered = products;
    
    // Filtrar por categoría
    if (selectedCategory !== 'todos') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.code && product.code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchTerm, selectedCategory, products]);

  // Agregar nuevo producto
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        category: newProduct.category,
        code: newProduct.code,
        createdAt: new Date()
      });
      
      alert('✅ Producto agregado correctamente');
      setNewProduct({ name: '', price: '', stock: '', category: 'ferreteria', code: '' });
      setShowAddForm(false);
      loadProducts();
    } catch (error) {
      console.error('Error agregando producto:', error);
      alert('Error al agregar producto');
    }
  };

  // Actualizar stock
  const updateStock = async (productId, newStock) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        stock: parseInt(newStock)
      });
      alert('✅ Stock actualizado');
      loadProducts();
    } catch (error) {
      console.error('Error actualizando stock:', error);
      alert('Error al actualizar stock');
    }
  };

  // Editar producto
  const handleEditProduct = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'products', editingProduct.id), {
        name: editingProduct.name,
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        category: editingProduct.category,
        code: editingProduct.code
      });
      
      alert('✅ Producto actualizado correctamente');
      setShowEditForm(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error editando producto:', error);
      alert('Error al editar producto');
    }
  };

  // Eliminar producto
  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${productName}"?`)) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        alert('✅ Producto eliminado correctamente');
        loadProducts();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        alert('Error al eliminar producto');
      }
    }
  };

  // Abrir formulario de edición
  const openEditForm = (product) => {
    setEditingProduct(product);
    setShowEditForm(true);
  };

  return (
    <div className="page">
      <h2>📦 Gestión de Productos</h2>
      
      {/* Botones principales */}
      <div className="action-buttons">
        <button 
          className="big-btn" 
          onClick={() => {
            setShowAddForm(true);
            setShowProductList(false);
          }}
        >
          ➕ Agregar Producto Nuevo
        </button>
        
        <button 
          className="big-btn" 
          onClick={() => {
            setShowProductList(true);
            setShowAddForm(false);
            loadProducts();
          }}
        >
          📋 Ver Todos los Productos
        </button>
        
        <button className="big-btn">🔄 Actualizar Stock</button>
        <button className="big-btn">🏷️ Gestionar Categorías</button>
        <button className="big-btn">📦 Productos con Stock Bajo</button>
      </div>

      {/* Formulario para agregar producto */}
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
                  onClick={() => setShowAddForm(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario para editar producto */}
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

      {/* Lista de productos */}
      {showProductList && (
        <div className="products-list">
          <div className="list-header">
            <h3>Lista de Productos ({filteredProducts.length})</h3>
            <button 
              className="btn-secondary"
              onClick={() => setShowProductList(false)}
            >
              ← Volver
            </button>
          </div>

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
          
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <h4>{product.name}</h4>
                <p>💰 Precio: ${product.price}</p>
                <p>📦 Stock: {product.stock}</p>
                <p>🏷️ Categoría: {product.category}</p>
                {product.code && <p>🔢 Código: {product.code}</p>}
                
                <div className="product-actions">
                  <button 
                    onClick={() => openEditForm(product)}
                    className="btn-small btn-edit"
                  >
                    ✏️ Editar
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
                    🔄 Stock
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="btn-small btn-delete"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <p className="no-products">
              {products.length === 0 
                ? 'No hay productos registrados todavía.' 
                : 'No se encontraron productos con los filtros aplicados.'
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Products;