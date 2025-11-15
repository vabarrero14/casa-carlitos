import React from 'react';
import './Dashboard.css';

const Dashboard = ({ onNavigate, currentUser }) => {
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

  return (
    <div className="dashboard">
      {/* Header del Dashboard */}
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

      {/* Módulos del Sistema */}
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

      {/* Estadísticas rápidas */}
      <div className="quick-stats">
        <h2>Resumen Rápido</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Productos en stock</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value">$0</span>
              <span className="stat-label">Ventas hoy</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Stock bajo</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">0</span>
              <span className="stat-label">Movimientos hoy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;