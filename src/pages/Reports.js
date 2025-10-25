import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import './Reports.css';

const Reports = () => {
  const [activeReport, setActiveReport] = useState('dailySales');
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Cargar datos
  useEffect(() => {
    loadSales();
    loadProducts();
    loadClients();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'sales'));
      const salesList = [];
      querySnapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar por fecha más reciente
      salesList.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
      setSales(salesList);
    } catch (error) {
      console.error('Error cargando ventas:', error);
      alert('Error al cargar ventas');
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

  const loadClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsList = [];
      querySnapshot.forEach((doc) => {
        clientsList.push({ id: doc.id, ...doc.data() });
      });
      setClients(clientsList);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  // Cálculos para reportes
  const getDailySales = () => {
    const today = new Date().toDateString();
    return sales.filter(sale => 
      sale.createdAt?.toDate().toDateString() === today
    );
  };

  const getTopProducts = () => {
    const productSales = {};
    
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.name].quantity += item.quantity;
        productSales[item.name].revenue += item.price * item.quantity;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  };

  const getLowStockProducts = () => {
    return products
      .filter(product => product.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
  };

  const getSalesByPeriod = () => {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);

    return sales.filter(sale => {
      const saleDate = sale.createdAt?.toDate();
      return saleDate >= startDate && saleDate <= endDate;
    });
  };

  const getFrequentClients = () => {
    const clientSales = {};
    
    sales.forEach(sale => {
      if (sale.customer && sale.customer.id) {
        const clientId = sale.customer.id;
        if (!clientSales[clientId]) {
          clientSales[clientId] = {
            ...sale.customer,
            purchaseCount: 0,
            totalSpent: 0
          };
        }
        clientSales[clientId].purchaseCount += 1;
        clientSales[clientId].totalSpent += sale.total;
      }
    });

    return Object.values(clientSales)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  };

  // Datos para los reportes
  const dailySales = getDailySales();
  const topProducts = getTopProducts();
  const lowStockProducts = getLowStockProducts();
  const periodSales = getSalesByPeriod();
  const frequentClients = getFrequentClients();

  // Totales
  const dailyTotal = dailySales.reduce((sum, sale) => sum + sale.total, 0);
  const periodTotal = periodSales.reduce((sum, sale) => sum + sale.total, 0);

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
    return timestamp.toDate().toLocaleDateString('es-ES');
  };

  return (
    <div className="page">
      <h2>📊 Reportes e Informes</h2>

      {/* Selector de reportes */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeReport === 'dailySales' ? 'active' : ''}`}
          onClick={() => setActiveReport('dailySales')}
        >
          📅 Ventas del Día
        </button>
        <button 
          className={`report-btn ${activeReport === 'topProducts' ? 'active' : ''}`}
          onClick={() => setActiveReport('topProducts')}
        >
          ⭐ Productos Más Vendidos
        </button>
        <button 
          className={`report-btn ${activeReport === 'lowStock' ? 'active' : ''}`}
          onClick={() => setActiveReport('lowStock')}
        >
          📦 Stock Bajo
        </button>
        <button 
          className={`report-btn ${activeReport === 'periodSales' ? 'active' : ''}`}
          onClick={() => setActiveReport('periodSales')}
        >
          📈 Ventas por Período
        </button>
        <button 
          className={`report-btn ${activeReport === 'frequentClients' ? 'active' : ''}`}
          onClick={() => setActiveReport('frequentClients')}
        >
          👥 Clientes Frecuentes
        </button>
      </div>

      {/* Contenido de reportes */}
      <div className="reports-content">
        {loading ? (
          <div className="loading">Cargando datos...</div>
        ) : (
          <>
            {/* Reporte: Ventas del Día */}
            {activeReport === 'dailySales' && (
              <div className="report-section">
                <h3>📅 Ventas del Día - {new Date().toLocaleDateString('es-ES')}</h3>
                <div className="summary-cards">
                  <div className="summary-card total-sales">
                    <h4>Total Vendido</h4>
                    <p className="amount">{formatCurrency(dailyTotal)}</p>
                  </div>
                  <div className="summary-card total-transactions">
                    <h4>Ventas Realizadas</h4>
                    <p className="amount">{dailySales.length}</p>
                  </div>
                </div>

                <div className="sales-list">
                  <h4>Detalle de Ventas</h4>
                  {dailySales.length > 0 ? (
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
                          {dailySales.map((sale) => (
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
              </div>
            )}

            {/* Reporte: Productos Más Vendidos */}
            {activeReport === 'topProducts' && (
              <div className="report-section">
                <h3>⭐ Top 10 Productos Más Vendidos</h3>
                {topProducts.length > 0 ? (
                  <div className="table-container">
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad Vendida</th>
                          <th>Ingresos Generados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProducts.map((product, index) => (
                          <tr key={index}>
                            <td>
                              <span className="rank">{index + 1}.</span> 
                              {product.name}
                            </td>
                            <td className="quantity">{product.quantity} unidades</td>
                            <td className="amount">{formatCurrency(product.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay datos de ventas</p>
                )}
              </div>
            )}

            {/* Reporte: Stock Bajo */}
            {activeReport === 'lowStock' && (
              <div className="report-section">
                <h3>📦 Productos con Stock Bajo (≤ 10 unidades)</h3>
                {lowStockProducts.length > 0 ? (
                  <div className="table-container">
                    <table className="stock-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Stock Actual</th>
                          <th>Precio</th>
                          <th>Categoría</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockProducts.map((product) => (
                          <tr key={product.id} className={product.stock === 0 ? 'out-of-stock' : 'low-stock'}>
                            <td>{product.name}</td>
                            <td className={`stock ${product.stock === 0 ? 'critical' : 'warning'}`}>
                              {product.stock} unidades
                            </td>
                            <td className="amount">{formatCurrency(product.price)}</td>
                            <td>{product.category}</td>
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

            {/* Reporte: Ventas por Período */}
            {activeReport === 'periodSales' && (
              <div className="report-section">
                <h3>📈 Ventas por Período</h3>
                
                <div className="date-range">
                  <label>
                    Desde:
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    />
                  </label>
                  <label>
                    Hasta:
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    />
                  </label>
                </div>

                <div className="summary-cards">
                  <div className="summary-card total-sales">
                    <h4>Total del Período</h4>
                    <p className="amount">{formatCurrency(periodTotal)}</p>
                  </div>
                  <div className="summary-card total-transactions">
                    <h4>Ventas Realizadas</h4>
                    <p className="amount">{periodSales.length}</p>
                  </div>
                </div>

                {periodSales.length > 0 ? (
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
                        {periodSales.map((sale) => (
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
                  <p className="no-data">No hay ventas en el período seleccionado</p>
                )}
              </div>
            )}

            {/* Reporte: Clientes Frecuentes */}
            {activeReport === 'frequentClients' && (
              <div className="report-section">
                <h3>👥 Top 10 Clientes Frecuentes</h3>
                {frequentClients.length > 0 ? (
                  <div className="table-container">
                    <table className="clients-table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Documento</th>
                          <th>Compras Realizadas</th>
                          <th>Total Gastado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {frequentClients.map((client, index) => (
                          <tr key={client.id}>
                            <td>
                              <span className="rank">{index + 1}.</span> 
                              {client.name}
                            </td>
                            <td>{client.document}</td>
                            <td className="quantity">{client.purchaseCount} compras</td>
                            <td className="amount">{formatCurrency(client.totalSpent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">No hay datos de clientes frecuentes</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;