import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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
    setSuccessMessage('');

    try {
      if (isRegistering) {
        // Verificar si el email ya está registrado o pendiente
        const usersQuery = query(
          collection(db, 'pending_users'),
          where('email', '==', email)
        );
        const existingUser = await getDocs(usersQuery);

        const approvedQuery = query(
          collection(db, 'approved_users'), 
          where('email', '==', email)
        );
        const existingApproved = await getDocs(approvedQuery);

        if (!existingUser.empty || !existingApproved.empty) {
          setError('Ya existe una cuenta o solicitud con este email');
          setLoading(false);
          return;
        }

        // Guardar usuario pendiente de aprobación
        await addDoc(collection(db, 'pending_users'), {
          email: email,
          password: password, // En producción esto debería estar encriptado
          createdAt: new Date(),
          status: 'pending'
        });

        setSuccessMessage('✅ Solicitud enviada. Espera la aprobación del administrador.');
        setEmail('');
        setPassword('');
        
      } else {
        // Verificar si el usuario está aprobado
        const approvedQuery = query(
          collection(db, 'approved_users'),
          where('email', '==', email)
        );
        const approvedUser = await getDocs(approvedQuery);

        if (approvedUser.empty) {
          // Verificar si está pendiente
          const pendingQuery = query(
            collection(db, 'pending_users'),
            where('email', '==', email)
          );
          const pendingUser = await getDocs(pendingQuery);

          if (!pendingUser.empty) {
            setError('⏳ Tu cuenta está pendiente de aprobación. Contacta al administrador.');
          } else {
            setError('❌ Cuenta no encontrada. Regístrate primero.');
          }
          setLoading(false);
          return;
        }

        // Iniciar sesión con Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        onLogin(user.email);
      }
    } catch (error) {
      console.error('Error:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta');
      } else if (error.code === 'auth/user-not-found') {
        setError('Cuenta no encontrada');
      } else {
        setError('Error al procesar la solicitud. Intenta nuevamente.');
      }
    }
    
    setLoading(false);
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
            <p className="login-welcome">
              {isRegistering ? 'Solicitar Acceso' : 'Sistema de Gestión Integral'}
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Mensaje de éxito */}
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          {/* Formulario */}
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
                  {isRegistering ? 'Enviando Solicitud...' : 'Verificando...'}
                </>
              ) : (
                isRegistering ? '👤 Solicitar Acceso' : '🚀 Ingresar al Sistema'
              )}
            </button>
          </form>

          {/* Información del proceso */}
          <div className="process-info">
            <h4>📋 Proceso de Acceso:</h4>
            <ol>
              <li><strong>Solicita acceso</strong> completando el formulario</li>
              <li><strong>Espera aprobación</strong> del administrador</li>
              <li><strong>Recibe confirmación</strong> vía email</li>
              <li><strong>Inicia sesión</strong> con tus credenciales</li>
            </ol>
          </div>

          {/* Cambiar entre login y registro */}
          <div className="auth-switch">
            <p>
              {isRegistering ? '¿Ya tienes acceso?' : '¿Primera vez aquí?'}
              <button 
                type="button"
                className="switch-btn"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                  setSuccessMessage('');
                }}
                disabled={loading}
              >
                {isRegistering ? ' Iniciar Sesión' : ' Solicitar Acceso'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>© 2024 Casa Carlitos - Sistema de gestión profesional</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;