import React, { useState } from 'react';
import './App.css';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Clients from './pages/Clients';
import Suppliers from './pages/Suppliers'; // ← Nueva importación

function App() {
  const [currentSection, setCurrentSection] = useState('products');

  const renderSection = () => {
    switch (currentSection) {
      case 'products':
        return <Products />;
      case 'sales':
        return <Sales />;
      case 'clients':
        return <Clients />;
      case 'suppliers': // ← Nuevo caso
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      default:
        return <Products />;
    }
  };

  return (
    <div className="App">
      {/* Header simple */}
      <header className="app-header">
        <h1>Casa Carlitos</h1>
        <p>Ferretería y Pinturería</p>
      </header>

      {/* Contenido principal */}
      <main className="main-content">
        {renderSection()}
      </main>

      {/* Navegación inferior - 5 botones */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${currentSection === 'products' ? 'active' : ''}`}
          onClick={() => setCurrentSection('products')}
        >
          📦 Productos
        </button>
        
        <button
          className={`nav-btn ${currentSection === 'sales' ? 'active' : ''}`}
          onClick={() => setCurrentSection('sales')}
        >
          💰 Ventas
        </button>
        
        <button
          className={`nav-btn ${currentSection === 'clients' ? 'active' : ''}`}
          onClick={() => setCurrentSection('clients')}
        >
          👥 Clientes
        </button>
        
        <button
          className={`nav-btn ${currentSection === 'suppliers' ? 'active' : ''}`}
          onClick={() => setCurrentSection('suppliers')}
        >
          🚚 Proveedores
        </button>
        
        <button
          className={`nav-btn ${currentSection === 'reports' ? 'active' : ''}`}
          onClick={() => setCurrentSection('reports')}
        >
          📊 Reportes
        </button>
      </nav>
    </div>
  );
}

export default App;