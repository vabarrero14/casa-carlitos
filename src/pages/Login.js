import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      alert('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    
    // Simulamos un proceso de login (luego podemos conectar con Firebase Auth)
    setTimeout(() => {
      // Login simple - en producción conectaríamos con Firebase Auth
      if (username === 'admin' && password === 'admin') {
        onLogin('admin');
      } else {
        // Para tu tía, cualquier credencial funciona (modo demo)
        onLogin(username);
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          {/* Header elegante */}
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-icon">🏠</div>
              <h1>Casa Carlitos</h1>
            </div>
            <p className="login-subtitle">Ferretería y Pinturería</p>
            <p className="login-welcome">Sistema de Gestión Integral</p>
          </div>

          {/* Formulario de login */}
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">👤 Usuario</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingresa tu usuario"
                className="login-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">🔒 Contraseña</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="login-input"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className={`login-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Iniciando Sesión...
                </>
              ) : (
                '🚀 Ingresar al Sistema'
              )}
            </button>
          </form>

          {/* Información de demo */}
          <div className="demo-info">
            <p><strong>Modo Demo:</strong> Usa cualquier usuario y contraseña</p>
            <p><strong>Ejemplo:</strong> admin / admin</p>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>© 2024 Casa Carlitos - Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;