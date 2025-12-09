import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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
import UserApproval from './pages/UserApproval';
import Orders from './pages/Orders';
import MyOrders from './pages/MyOrders';
import OrderApproval from './pages/OrderApproval';

function App() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [loading, setLoading] = useState(true);

  // Verificar estado de autenticación al cargar
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario logueado
        setIsLoggedIn(true);
        setCurrentUser(user.email);
      } else {
        // Usuario no logueado
        setIsLoggedIn(false);
        setCurrentUser('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userEmail) => {
    setIsLoggedIn(true);
    setCurrentUser(userEmail);
    setCurrentSection('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setCurrentUser('');
      setCurrentSection('dashboard');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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
      case 'userApproval':
        return <UserApproval currentUser={currentUser} />;
      case 'orders':
        return <Orders currentUser={currentUser} />;
      case 'myOrders':
        return <MyOrders currentUser={currentUser} />;
      case 'orderApproval':
        return <OrderApproval currentUser={currentUser} />;
      default:
        return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />;
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-container">
                <div className="logo-icon">🏠</div>
                <h1>Casa Carlitos</h1>
              </div>
              <p className="login-subtitle">Cargando sistema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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