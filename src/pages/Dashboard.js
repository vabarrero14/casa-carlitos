import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = ({ onNavigate, currentUser }) => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    todaySales: 0,
    lowStockProducts: 0,
    todayMovements: 0
  });
  const [loading, setLoading] = useState(true);

  // Cargar estadísticas reales
  useEffect(() => {
    loadRealStats();
  }, []);

  const loadRealStats = async () => {
    try {
      setLoading(true);
      
      // 1. Total de productos
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const totalProducts = productsSnapshot.size;
      
      // 2. Productos con stock bajo (<= 10)
      const lowStockProducts = productsSnapshot.docs.filter(doc => {
        const product = doc.data();
        return product.stock <= 10;
      }).length;

      // 3. Ventas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const salesQuery = query(
        collection(db, 'sales'),
        where('createdAt', '>=', today)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const todaySales = salesSnapshot.docs.reduce((total, doc) => {
        return total + (doc.data().total || 0);
      }, 0);

      // 4. Movimientos de hoy
      const movementsQuery = query(
        collection(db, 'stock_movements'),
        where('fecha', '>=', today)
      );
      const movementsSnapshot = await getDocs(movementsQuery);
      const todayMovements = movementsSnapshot.size;

      setStats({
        totalProducts,
        todaySales,
        lowStockProducts,
        todayMovements
      });

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    {
      id: 'products',
      title: 'Gestión de Productos',
      icon: '📦',
      description: 'Administrar inventario, precios y categorías',
      color: '#3498db'
    },
    {
      id: 'sales',
      title: 'Punto de Venta',
      icon: '💰',
      description: 'Realizar ventas y gestionar carrito',
      color: '#27ae60'
    },
    {
      id: 'purchases',
      title: 'Compras y Proveedores',
      icon: '🛒',
      description: 'Registrar compras y gestionar proveedores',
      color: '#e67e22'
    },
    {
      id: 'stockMovements',
      title: 'Movimientos de Stock',
      icon: '📊',
      description: 'Historial completo de entradas y salidas',
      color: '#9b59b6'
    },
    {
      id: 'clients',
      title: 'Gestión de Clientes',
      icon: '👥',
      description: 'Administrar base de datos de clientes',
      color: '#34495e'
    },
    {
      id: 'suppliers',
      title: 'Proveedores',
      icon: '🚚',
      description: 'Gestionar información de proveedores',
      color: '#16a085'
    },
    {
      id: 'reports',
      title: 'Reportes y Análisis',
      icon: '📈',
      description: 'Estadísticas e informes del negocio',
      color: '#c0392b'
    }
  ];

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU'
    }).format(amount);
  };

  return (
    <div className="dashboard">
      {/* Header del Dashboard - Mismo diseño original */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>🏠 Sistema de Gestión - Casa Carlitos</h1>
          <p>Bienvenido, <strong>{currentUser}</strong></p>
        </div>
        <div className="dashboard-info">
          <div className="info-card">
            <span className="info-label">Ferretería y Pinturería</span>
            <span className="info-date">{new Date().toLocaleDateString('es-ES', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>
        </div>
      </div>

      {/* Módulos del Sistema - Mismo diseño original */}
      <div className="modules-grid">
        {modules.map(module => (
          <div 
            key={module.id}
            className="module-card"
            onClick={() => onNavigate(module.id)}
            style={{ '--accent-color': module.color }}
          >
            <div className="module-icon" style={{ backgroundColor: module.color }}>
              {module.icon}
            </div>
            <div className="module-content">
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </div>
            <div className="module-arrow">
              →
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas rápidas - Mismo diseño pero con datos reales */}
      <div className="quick-stats">
        <h2>Resumen Rápido</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? '...' : stats.totalProducts}
              </span>
              <span className="stat-label">Productos en stock</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? '...' : formatCurrency(stats.todaySales)}
              </span>
              <span className="stat-label">Ventas hoy</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? '...' : stats.lowStockProducts}
              </span>
              <span className="stat-label">Stock bajo</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">
                {loading ? '...' : stats.todayMovements}
              </span>
              <span className="stat-label">Movimientos hoy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;