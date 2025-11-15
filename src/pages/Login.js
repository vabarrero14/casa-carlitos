import React, { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // Registrar nuevo usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onLogin(user.email);
      } else {
        // Iniciar sesión
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onLogin(user.email);
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
      switch (error.code) {
        case 'auth/invalid-email':
          setError('El formato del email es inválido');
          break;
        case 'auth/user-disabled':
          setError('Esta cuenta ha sido deshabilitada');
          break;
        case 'auth/user-not-found':
          setError('No existe una cuenta con este email');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/email-already-in-use':
          setError('Ya existe una cuenta con este email');
          break;
        case 'auth/weak-password':
          setError('La contraseña es demasiado débil');
          break;
        default:
          setError('Error al iniciar sesión. Intenta nuevamente.');
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          {/* Header elegante - Mismo diseño original */}
          <div className="login-header">
            <div className="logo-container">
              <div className="logo-icon">🏠</div>
              <h1>Casa Carlitos</h1>
            </div>
            <p className="login-subtitle">Ferretería y Pinturería</p>
            <p className="login-welcome">
              {isRegistering ? 'Crear Nueva Cuenta' : 'Sistema de Gestión Integral'}
            </p>
          </div>

          {/* Mensaje de error elegante */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Formulario - Mismo diseño pero con email */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">📧 Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
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
                placeholder="Mínimo 6 caracteres"
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
                  {isRegistering ? 'Creando Cuenta...' : 'Iniciando Sesión...'}
                </>
              ) : (
                isRegistering ? '👤 Crear Cuenta' : '🚀 Ingresar al Sistema'
              )}
            </button>
          </form>

          {/* Cambiar entre login y registro - Integrado elegantemente */}
          <div className="auth-switch">
            <p>
              {isRegistering ? '¿Ya tienes una cuenta?' : '¿Primera vez aquí?'}
              <button 
                type="button"
                className="switch-btn"
                onClick={() => setIsRegistering(!isRegistering)}
                disabled={loading}
              >
                {isRegistering ? ' Iniciar Sesión' : ' Crear Cuenta'}
              </button>
            </p>
          </div>

          {/* Información de seguridad - Integrada en el diseño */}
          <div className="security-info">
            <p><strong>🔒 Sistema Seguro</strong> - Autenticación profesional con Firebase</p>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>© 2024 Casa Carlitos - Sistema profesional de gestión</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;