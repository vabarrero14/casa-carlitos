import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import Notification from '../components/Notification';
import './Clients.css';

const Clients = () => {
  const [activeSection, setActiveSection] = useState('addClient');
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para formularios
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: ''
  });

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar clientes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadClients();
  }, []);

  // Función para mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Cargar clientes
  const loadClients = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'clients'));
      const clientsList = [];
      querySnapshot.forEach((doc) => {
        clientsList.push({ id: doc.id, ...doc.data() });
      });
      setClients(clientsList);
      setFilteredClients(clientsList);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      showNotification('❌ Error al cargar clientes', 'error');
    }
    setLoading(false);
  };

  // Filtrar clientes para búsqueda
  useEffect(() => {
    if (searchTerm) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.document && client.document.includes(searchTerm))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [searchTerm, clients]);

  // Agregar nuevo cliente
  const handleAddClient = async (e) => {
    e.preventDefault();
    showNotification('Agregando cliente...', 'loading');
    
    try {
      await addDoc(collection(db, 'clients'), {
        name: newClient.name,
        document: newClient.document,
        phone: newClient.phone,
        email: newClient.email,
        address: newClient.address,
        createdAt: new Date()
      });
      
      showNotification('✅ Cliente agregado correctamente', 'success');
      setNewClient({ name: '', document: '', phone: '', email: '', address: '' });
      setShowAddForm(false);
      loadClients();
    } catch (error) {
      console.error('Error agregando cliente:', error);
      showNotification('❌ Error al agregar cliente', 'error');
    }
  };

  // Editar cliente
  const handleEditClient = async (e) => {
    e.preventDefault();
    showNotification('Actualizando cliente...', 'loading');
    
    try {
      await updateDoc(doc(db, 'clients', editingClient.id), {
        name: editingClient.name,
        document: editingClient.document,
        phone: editingClient.phone,
        email: editingClient.email,
        address: editingClient.address
      });
      
      showNotification('✅ Cliente actualizado correctamente', 'success');
      setShowEditForm(false);
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error editando cliente:', error);
      showNotification('❌ Error al editar cliente', 'error');
    }
  };

  // Eliminar cliente
  const handleDeleteClient = async (clientId, clientName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${clientName}"?`)) {
      showNotification('Eliminando cliente...', 'loading');
      
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        showNotification('✅ Cliente eliminado correctamente', 'success');
        loadClients();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        showNotification('❌ Error al eliminar cliente', 'error');
      }
    }
  };

  // Abrir formulario de edición
  const openEditForm = (client) => {
    setEditingClient(client);
    setShowEditForm(true);
  };

  // Estadísticas
  const totalClients = clients.length;
  const clientsWithPhone = clients.filter(c => c.phone).length;
  const clientsWithEmail = clients.filter(c => c.email).length;

  return (
    <div className="page">
      <h2>👥 Gestión de Clientes</h2>

      {/* Navegación tipo Reportes */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeSection === 'addClient' ? 'active' : ''}`}
          onClick={() => setActiveSection('addClient')}
        >
          ➕ Agregar Cliente
        </button>
        <button 
          className={`report-btn ${activeSection === 'viewClients' ? 'active' : ''}`}
          onClick={() => setActiveSection('viewClients')}
        >
          📋 Ver Clientes
        </button>
        <button 
          className={`report-btn ${activeSection === 'clientStats' ? 'active' : ''}`}
          onClick={() => setActiveSection('clientStats')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Contenido principal */}
      <div className="reports-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Cargando clientes...
          </div>
        ) : (
          <>
            {/* Sección: Agregar Cliente */}
            {activeSection === 'addClient' && (
              <div className="report-section">
                <h3>➕ Agregar Nuevo Cliente</h3>
                
                <div className="summary-cards">
                  <div className="summary-card total-clients">
                    <h4>Total Clientes</h4>
                    <p className="amount">{totalClients}</p>
                  </div>
                  <div className="summary-card clients-phone">
                    <h4>Con Teléfono</h4>
                    <p className="amount">{clientsWithPhone}</p>
                  </div>
                  <div className="summary-card clients-email">
                    <h4>Con Email</h4>
                    <p className="amount">{clientsWithEmail}</p>
                  </div>
                </div>

                {/* Solo el botón para abrir modal */}
                <div className="add-client-button-container">
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary big-add-btn"
                  >
                    ➕ Agregar Nuevo Cliente
                  </button>
                </div>
              </div>
            )}

            {/* Sección: Ver Clientes */}
            {activeSection === 'viewClients' && (
              <div className="report-section">
                <h3>📋 Lista de Clientes ({filteredClients.length})</h3>

                {/* Búsqueda */}
                <div className="search-section">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>

                {/* Lista de clientes */}
                {filteredClients.length > 0 ? (
                  <div className="table-container">
                    <table className="clients-table">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th>Documento</th>
                          <th>Contacto</th>
                          <th>Dirección</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredClients.map((client) => (
                          <tr key={client.id}>
                            <td>
                              <strong>{client.name}</strong>
                            </td>
                            <td>{client.document}</td>
                            <td>
                              {client.phone && <div>📞 {client.phone}</div>}
                              {client.email && <div>📧 {client.email}</div>}
                              {!client.phone && !client.email && <span className="no-contact">Sin contacto</span>}
                            </td>
                            <td>
                              {client.address ? (
                                <span className="address-truncate" title={client.address}>
                                  {client.address.length > 30 
                                    ? client.address.substring(0, 30) + '...' 
                                    : client.address
                                  }
                                </span>
                              ) : (
                                <span className="no-address">Sin dirección</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons-small">
                                <button 
                                  onClick={() => openEditForm(client)}
                                  className="btn-small btn-edit"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => handleDeleteClient(client.id, client.name)}
                                  className="btn-small btn-delete"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="no-data">
                    {clients.length === 0 
                      ? 'No hay clientes registrados todavía.' 
                      : 'No se encontraron clientes con la búsqueda.'
                    }
                  </p>
                )}
              </div>
            )}

            {/* Sección: Estadísticas */}
            {activeSection === 'clientStats' && (
              <div className="report-section">
                <h3>📊 Estadísticas de Clientes</h3>
                
                <div className="summary-cards">
                  <div className="summary-card total-clients">
                    <h4>Total de Clientes</h4>
                    <p className="amount">{totalClients}</p>
                    <p className="subtext">Registrados en el sistema</p>
                  </div>
                  <div className="summary-card clients-phone">
                    <h4>Con Teléfono</h4>
                    <p className="amount">{clientsWithPhone}</p>
                    <p className="subtext">{((clientsWithPhone / totalClients) * 100 || 0).toFixed(1)}%</p>
                  </div>
                  <div className="summary-card clients-email">
                    <h4>Con Email</h4>
                    <p className="amount">{clientsWithEmail}</p>
                    <p className="subtext">{((clientsWithEmail / totalClients) * 100 || 0).toFixed(1)}%</p>
                  </div>
                  <div className="summary-card clients-complete">
                    <h4>Datos Completos</h4>
                    <p className="amount">
                      {clients.filter(c => c.phone && c.email && c.address).length}
                    </p>
                    <p className="subtext">Con teléfono, email y dirección</p>
                  </div>
                </div>

                <div className="clients-breakdown">
                  <h4>Desglose de Clientes</h4>
                  <div className="breakdown-grid">
                    <div className="breakdown-item">
                      <span className="breakdown-label">Solo teléfono:</span>
                      <span className="breakdown-value">
                        {clients.filter(c => c.phone && !c.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Solo email:</span>
                      <span className="breakdown-value">
                        {clients.filter(c => !c.phone && c.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Sin contacto:</span>
                      <span className="breakdown-value">
                        {clients.filter(c => !c.phone && !c.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Con dirección:</span>
                      <span className="breakdown-value">
                        {clients.filter(c => c.address).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal para Agregar Cliente */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Agregar Nuevo Cliente</h3>
            <form onSubmit={handleAddClient}>
              <div className="form-group">
                <label>Nombre Completo:</label>
                <input
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  required
                  placeholder="Ej: María González"
                />
              </div>
              
              <div className="form-group">
                <label>Documento:</label>
                <input
                  type="text"
                  value={newClient.document}
                  onChange={(e) => setNewClient({...newClient, document: e.target.value})}
                  required
                  placeholder="DNI, RUC, etc."
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  placeholder="Ej: 099123456"
                />
              </div>
              
              <div className="form-group">
                <label>Email (opcional):</label>
                <input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  placeholder="cliente@email.com"
                />
              </div>
              
              <div className="form-group">
                <label>Dirección (opcional):</label>
                <textarea
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  placeholder="Dirección completa"
                  rows="3"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  ✅ Guardar Cliente
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewClient({ name: '', document: '', phone: '', email: '', address: '' });
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Cliente */}
      {showEditForm && editingClient && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Editar Cliente</h3>
            <form onSubmit={handleEditClient}>
              <div className="form-group">
                <label>Nombre Completo:</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({...editingClient, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Documento:</label>
                <input
                  type="text"
                  value={editingClient.document}
                  onChange={(e) => setEditingClient({...editingClient, document: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Dirección:</label>
                <textarea
                  value={editingClient.address || ''}
                  onChange={(e) => setEditingClient({...editingClient, address: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  💾 Guardar Cambios
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingClient(null);
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notificación */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
          duration={notification.type === 'loading' ? 0 : 4000}
        />
      )}
    </div>
  );
};

export default Clients;