import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc, addDoc, query, orderBy, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import './UserApproval.css';

const UserApproval = ({ currentUser }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Cargar usuarios pendientes y aprobados
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Cargar usuarios pendientes
      const pendingQuery = query(
        collection(db, 'pending_users'),
        orderBy('createdAt', 'desc')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingList = pendingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cargar usuarios aprobados
      const approvedQuery = query(
        collection(db, 'approved_users'),
        orderBy('approvedAt', 'desc')
      );
      const approvedSnapshot = await getDocs(approvedQuery);
      const approvedList = approvedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPendingUsers(pendingList);
      setApprovedUsers(approvedList);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (user) => {
    try {
      // Importar auth dinámicamente para evitar conflictos de sesión
      const { auth } = await import('../firebase/config');
      
      // 1. Crear usuario en Firebase Auth
      await createUserWithEmailAndPassword(auth, user.email, user.password);
      
      // 2. Agregar a usuarios aprobados
      await addDoc(collection(db, 'approved_users'), {
        email: user.email,
        approvedAt: new Date(),
        approvedBy: currentUser,
        role: 'user'
      });

      // 3. Eliminar de usuarios pendientes
      await deleteDoc(doc(db, 'pending_users', user.id));

      // 4. Recargar lista
      await loadUsers();
      
      alert(`✅ Usuario ${user.email} aprobado correctamente`);
      
    } catch (error) {
      console.error('Error aprobando usuario:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        // Si el usuario ya existe en Auth, solo actualizar las colecciones
        try {
          await addDoc(collection(db, 'approved_users'), {
            email: user.email,
            approvedAt: new Date(),
            approvedBy: currentUser,
            role: 'user'
          });
          
          await deleteDoc(doc(db, 'pending_users', user.id));
          await loadUsers();
          alert(`✅ Usuario ${user.email} aprobado (ya existía en Auth)`);
        } catch (secondError) {
          alert('❌ Error al completar la aprobación: ' + secondError.message);
        }
      } else {
        alert('❌ Error al aprobar usuario: ' + error.message);
      }
    }
  };

  const rejectUser = async (user) => {
    if (window.confirm(`¿Rechazar la solicitud de ${user.email}?`)) {
      try {
        await deleteDoc(doc(db, 'pending_users', user.id));
        await loadUsers();
        alert(`❌ Solicitud de ${user.email} rechazada`);
      } catch (error) {
        console.error('Error rechazando usuario:', error);
        alert('Error al rechazar usuario');
      }
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate();
    return date.toLocaleDateString('es-ES') + ' ' + 
           date.toLocaleTimeString('es-ES', {
             hour: '2-digit',
             minute: '2-digit'
           });
  };

  return (
    <div className="user-approval">
      <div className="approval-header">
        <h1>👥 Gestión de Usuarios</h1>
        <p>Administrador: {currentUser}</p>
      </div>

      {/* Navegación por pestañas */}
      <div className="approval-tabs">
        <button
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pendientes ({pendingUsers.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          ✅ Aprobados ({approvedUsers.length})
        </button>
      </div>

      {/* Contenido de las pestañas */}
      <div className="approval-content">
        {loading ? (
          <div className="loading">Cargando usuarios...</div>
        ) : activeTab === 'pending' ? (
          <div className="pending-users">
            <h2>Solicitudes Pendientes</h2>
            {pendingUsers.length > 0 ? (
              <div className="users-grid">
                {pendingUsers.map(user => (
                  <div key={user.id} className="user-card pending">
                    <div className="user-info">
                      <strong>📧 {user.email}</strong>
                      <span>📅 Solicitado: {formatDate(user.createdAt)}</span>
                    </div>
                    <div className="user-actions">
                      <button
                        onClick={() => approveUser(user)}
                        className="btn-approve"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => rejectUser(user)}
                        className="btn-reject"
                      >
                        ❌ Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>🎉 No hay solicitudes pendientes</p>
              </div>
            )}
          </div>
        ) : (
          <div className="approved-users">
            <h2>Usuarios Aprobados</h2>
            {approvedUsers.length > 0 ? (
              <div className="users-grid">
                {approvedUsers.map(user => (
                  <div key={user.id} className="user-card approved">
                    <div className="user-info">
                      <strong>📧 {user.email}</strong>
                      <span>✅ Aprobado: {formatDate(user.approvedAt)}</span>
                      <span>👤 Por: {user.approvedBy}</span>
                      <span>🎯 Rol: {user.role || 'user'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>📝 No hay usuarios aprobados</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserApproval;