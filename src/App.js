import React, { useState } from 'react';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import StockMovements from './pages/StockMovements';

function App() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');

  const handleLogin = (username) => {
    setIsLoggedIn(true);
    setCurrentUser(username);
    setCurrentSection('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    setCurrentSection('dashboard');
  };

  const handleNavigate = (section) => {
    setCurrentSection(section);
  };

  const handleBackToDashboard = () => {
    setCurrentSection('dashboard');
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />;
      case 'products':
        return <Products />;
      case 'sales':
        return <Sales />;
      case 'purchases':
        return <Purchases />;
      case 'clients':
        return <Clients />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      case 'stockMovements':
        return <StockMovements />;
      default:
        return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />;
    }
  };

  // Si no está logueado, mostrar login
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Si está logueado, mostrar la aplicación
  return (
    <div className="App">
      {/* Header profesional */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-brand">
            <h1>🏠 Casa Carlitos</h1>
            <span className="header-subtitle">Sistema de Gestión</span>
          </div>
          
          <div className="header-actions">
            {currentSection !== 'dashboard' && (
              <button onClick={handleBackToDashboard} className="back-btn">
                ← Volver al Inicio
              </button>
            )}
            <div className="user-info">
              <span className="user-name">👤 {currentUser}</span>
              <button onClick={handleLogout} className="logout-btn">
                🚪 Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        {renderSection()}
      </main>
    </div>
  );
}

export default App;