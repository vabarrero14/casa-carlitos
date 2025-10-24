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
import './Clients.css';

const Clients = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showClientList, setShowClientList] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState(null);
  
  // Estado para nuevo cliente
  const [newClient, setNewClient] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: ''
  });

  // Cargar clientes desde Firebase
  const loadClients = async () => {
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
      alert('Error al cargar clientes');
    }
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
    try {
      await addDoc(collection(db, 'clients'), {
        name: newClient.name,
        document: newClient.document,
        phone: newClient.phone,
        email: newClient.email,
        address: newClient.address,
        createdAt: new Date()
      });
      
      alert('✅ Cliente agregado correctamente');
      setNewClient({ name: '', document: '', phone: '', email: '', address: '' });
      setShowAddForm(false);
      loadClients();
    } catch (error) {
      console.error('Error agregando cliente:', error);
      alert('Error al agregar cliente');
    }
  };

  // Editar cliente
  const handleEditClient = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'clients', editingClient.id), {
        name: editingClient.name,
        document: editingClient.document,
        phone: editingClient.phone,
        email: editingClient.email,
        address: editingClient.address
      });
      
      alert('✅ Cliente actualizado correctamente');
      setShowEditForm(false);
      setEditingClient(null);
      loadClients();
    } catch (error) {
      console.error('Error editando cliente:', error);
      alert('Error al editar cliente');
    }
  };

  // Eliminar cliente
  const handleDeleteClient = async (clientId, clientName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${clientName}"?`)) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        alert('✅ Cliente eliminado correctamente');
        loadClients();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        alert('Error al eliminar cliente');
      }
    }
  };

  // Abrir formulario de edición
  const openEditForm = (client) => {
    setEditingClient(client);
    setShowEditForm(true);
  };

  return (
    <div className="page">
      <h2>👥 Gestión de Clientes</h2>
      
      {/* Botones principales */}
      <div className="action-buttons">
        <button 
          className="big-btn" 
          onClick={() => {
            setShowAddForm(true);
            setShowClientList(false);
          }}
        >
          ➕ Agregar Cliente Nuevo
        </button>
        
        <button 
          className="big-btn" 
          onClick={() => {
            setShowClientList(true);
            setShowAddForm(false);
            loadClients();
          }}
        >
          📋 Ver Todos los Clientes
        </button>
        
        <button className="big-btn">📊 Historial de Compras</button>
        <button className="big-btn">⭐ Clientes Frecuentes</button>
      </div>

      {/* Formulario para agregar cliente */}
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
                  onClick={() => setShowAddForm(false)}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario para editar cliente */}
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

      {/* Lista de clientes */}
      {showClientList && (
        <div className="clients-list">
          <div className="list-header">
            <h3>Lista de Clientes ({filteredClients.length})</h3>
            <button 
              className="btn-secondary"
              onClick={() => setShowClientList(false)}
            >
              ← Volver
            </button>
          </div>

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
          
          <div className="clients-grid">
            {filteredClients.map((client) => (
              <div key={client.id} className="client-card">
                <h4>{client.name}</h4>
                <p>📄 Documento: {client.document}</p>
                {client.phone && <p>📞 Teléfono: {client.phone}</p>}
                {client.email && <p>📧 Email: {client.email}</p>}
                {client.address && <p>🏠 Dirección: {client.address}</p>}
                
                <div className="client-actions">
                  <button 
                    onClick={() => openEditForm(client)}
                    className="btn-small btn-edit"
                  >
                    ✏️ Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id, client.name)}
                    className="btn-small btn-delete"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredClients.length === 0 && (
            <p className="no-clients">
              {clients.length === 0 
                ? 'No hay clientes registrados todavía.' 
                : 'No se encontraron clientes con la búsqueda.'
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Clients;