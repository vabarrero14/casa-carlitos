import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import './StockMovements.css';

const StockMovements = () => {
  const [activeSection, setActiveSection] = useState('allMovements');
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Cargar movimientos y productos
  useEffect(() => {
    loadMovements();
    loadProducts();
  }, []);

  // Filtrar movimientos cuando cambien los filtros
  useEffect(() => {
    filterMovements();
  }, [movements, activeSection, selectedProduct, dateFilter]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'stock_movements'),
        orderBy('fecha', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const movementsList = [];
      querySnapshot.forEach((doc) => {
        movementsList.push({ id: doc.id, ...doc.data() });
      });
      setMovements(movementsList);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
      alert('Error al cargar movimientos');
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList = [];
      querySnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsList);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const filterMovements = () => {
    let filtered = movements;

    // Filtrar por tipo (sección activa)
    if (activeSection === 'purchases') {
      filtered = filtered.filter(mov => mov.tipo === 'compra');
    } else if (activeSection === 'sales') {
      filtered = filtered.filter(mov => mov.tipo === 'venta');
    } else if (activeSection === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(mov => {
        const movDate = mov.fecha?.toDate().toDateString();
        return movDate === today;
      });
    }

    // Filtrar por producto
    if (selectedProduct !== 'all') {
      filtered = filtered.filter(mov => mov.productId === selectedProduct);
    }

    // Filtrar por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }

      filtered = filtered.filter(mov => {
        const movDate = mov.fecha?.toDate();
        return movDate >= startDate;
      });
    }

    setFilteredMovements(filtered);
  };

  // Estadísticas
  const totalMovements = movements.length;
  const todayMovements = movements.filter(mov => {
    const today = new Date().toDateString();
    const movDate = mov.fecha?.toDate().toDateString();
    return movDate === today;
  }).length;

  const totalPurchases = movements.filter(mov => mov.tipo === 'compra').length;
  const totalSales = movements.filter(mov => mov.tipo === 'venta').length;

  const todayPurchases = movements.filter(mov => {
    const today = new Date().toDateString();
    const movDate = mov.fecha?.toDate().toDateString();
    return movDate === today && mov.tipo === 'compra';
  }).length;

  const todaySales = movements.filter(mov => {
    const today = new Date().toDateString();
    const movDate = mov.fecha?.toDate().toDateString();
    return movDate === today && mov.tipo === 'venta';
  }).length;

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
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
    }).format(amount || 0);
  };

  // Obtener nombre del producto
  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'Producto no encontrado';
  };

  return (
    <div className="page">
      <h2>📊 Movimientos de Stock</h2>

      {/* Navegación */}
      <div className="reports-nav">
        <button
          className={`report-btn ${activeSection === 'allMovements' ? 'active' : ''}`}
          onClick={() => setActiveSection('allMovements')}
        >
          📋 Todos
        </button>
        <button
          className={`report-btn ${activeSection === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveSection('purchases')}
        >
          📥 Compras
        </button>
        <button
          className={`report-btn ${activeSection === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveSection('sales')}
        >
          📤 Ventas
        </button>
        <button
          className={`report-btn ${activeSection === 'today' ? 'active' : ''}`}
          onClick={() => setActiveSection('today')}
        >
          🕐 Hoy
        </button>
      </div>

      {/* Contenido principal */}
      <div className="reports-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Cargando movimientos...
          </div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="summary-cards">
              <div className="summary-card total-movements">
                <h4>Total Movimientos</h4>
                <p className="amount">{totalMovements}</p>
              </div>
              <div className="summary-card today-movements">
                <h4>Movimientos Hoy</h4>
                <p className="amount">{todayMovements}</p>
              </div>
              <div className="summary-card total-purchases">
                <h4>Total Compras</h4>
                <p className="amount">{totalPurchases}</p>
              </div>
              <div className="summary-card total-sales">
                <h4>Total Ventas</h4>
                <p className="amount">{totalSales}</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="filters-section">
              <div className="filter-group">
                <label>Filtrar por producto:</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todos los productos</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Filtrar por fecha:</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">Todas las fechas</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                </select>
              </div>

              <div className="filter-info">
                <span>
                  Mostrando {filteredMovements.length} de {movements.length} movimientos
                </span>
              </div>
            </div>

            {/* Lista de movimientos */}
            <div className="report-section">
              <h3>
                {activeSection === 'purchases' && '📥 Movimientos de Compra'}
                {activeSection === 'sales' && '📤 Movimientos de Venta'}
                {activeSection === 'today' && '🕐 Movimientos de Hoy'}
                {activeSection === 'allMovements' && '📋 Todos los Movimientos'}
                ({filteredMovements.length})
              </h3>

              {filteredMovements.length > 0 ? (
                <div className="table-container">
                  <table className="movements-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Tipo</th>
                        <th>Stock Anterior</th>
                        <th>Cantidad</th>
                        <th>Stock Actual</th>
                        <th>Referencia</th>
                        <th>Proveedor/Cliente</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map((movement) => (
                        <tr key={movement.id} className={`movement-${movement.tipo}`}>
                          <td>{formatDate(movement.fecha)}</td>
                          <td>
                            <strong>{movement.productName}</strong>
                            <br />
                            <small>ID: {movement.productId}</small>
                          </td>
                          <td>
                            <span className={`movement-type ${movement.tipo}`}>
                              {movement.tipo === 'compra' ? '📥 Compra' : '📤 Venta'}
                            </span>
                          </td>
                          <td className="stock-number">{movement.stockAnterior}</td>
                          <td className={`quantity ${movement.tipo}`}>
                            {movement.tipo === 'compra' ? '+' : '-'}{movement.cantidad}
                          </td>
                          <td className="stock-number">{movement.stockActual}</td>
                          <td className="reference">{movement.referencia}</td>
                          <td>
                            {movement.tipo === 'compra' 
                              ? (movement.proveedor || 'Sin proveedor')
                              : (movement.cliente || 'Cliente general')
                            }
                          </td>
                          <td className="amount">
                            {formatCurrency(movement.totalMovimiento)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">
                  {movements.length === 0 
                    ? 'No hay movimientos registrados todavía.'
                    : 'No se encontraron movimientos con los filtros aplicados.'
                  }
                </p>
              )}
            </div>

            {/* Estadísticas adicionales */}
            <div className="movements-stats">
              <div className="stat-card">
                <h4>📥 Compras Hoy</h4>
                <p className="count">{todayPurchases}</p>
              </div>
              <div className="stat-card">
                <h4>📤 Ventas Hoy</h4>
                <p className="count">{todaySales}</p>
              </div>
              <div className="stat-card">
                <h4>📊 Ratio Compra/Venta</h4>
                <p className="count">
                  {totalPurchases > 0 ? (totalSales / totalPurchases).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockMovements;