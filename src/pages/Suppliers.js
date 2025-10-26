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
import './Suppliers.css';

const Suppliers = () => {
  const [activeSection, setActiveSection] = useState('addSupplier');
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para formularios
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    ruc: '',
    phone: '',
    email: '',
    address: ''
  });

  // Estado para notificaciones
  const [notification, setNotification] = useState(null);

  // Cargar proveedores
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadSuppliers();
  }, []);

  // Función para mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Cargar proveedores
  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'suppliers'));
      const suppliersList = [];
      querySnapshot.forEach((doc) => {
        suppliersList.push({ id: doc.id, ...doc.data() });
      });
      setSuppliers(suppliersList);
      setFilteredSuppliers(suppliersList);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      showNotification('❌ Error al cargar proveedores', 'error');
    }
    setLoading(false);
  };

  // Filtrar proveedores para búsqueda
  useEffect(() => {
    if (searchTerm) {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.ruc && supplier.ruc.includes(searchTerm))
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [searchTerm, suppliers]);

  // Agregar nuevo proveedor
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    showNotification('Agregando proveedor...', 'loading');
    
    try {
      await addDoc(collection(db, 'suppliers'), {
        name: newSupplier.name,
        ruc: newSupplier.ruc,
        phone: newSupplier.phone,
        email: newSupplier.email,
        address: newSupplier.address,
        createdAt: new Date()
      });
      
      showNotification('✅ Proveedor agregado correctamente', 'success');
      setNewSupplier({ name: '', ruc: '', phone: '', email: '', address: '' });
      setShowAddForm(false);
      loadSuppliers();
    } catch (error) {
      console.error('Error agregando proveedor:', error);
      showNotification('❌ Error al agregar proveedor', 'error');
    }
  };

  // Editar proveedor
  const handleEditSupplier = async (e) => {
    e.preventDefault();
    showNotification('Actualizando proveedor...', 'loading');
    
    try {
      await updateDoc(doc(db, 'suppliers', editingSupplier.id), {
        name: editingSupplier.name,
        ruc: editingSupplier.ruc,
        phone: editingSupplier.phone,
        email: editingSupplier.email,
        address: editingSupplier.address
      });
      
      showNotification('✅ Proveedor actualizado correctamente', 'success');
      setShowEditForm(false);
      setEditingSupplier(null);
      loadSuppliers();
    } catch (error) {
      console.error('Error editando proveedor:', error);
      showNotification('❌ Error al editar proveedor', 'error');
    }
  };

  // Eliminar proveedor
  const handleDeleteSupplier = async (supplierId, supplierName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a "${supplierName}"?`)) {
      showNotification('Eliminando proveedor...', 'loading');
      
      try {
        await deleteDoc(doc(db, 'suppliers', supplierId));
        showNotification('✅ Proveedor eliminado correctamente', 'success');
        loadSuppliers();
      } catch (error) {
        console.error('Error eliminando proveedor:', error);
        showNotification('❌ Error al eliminar proveedor', 'error');
      }
    }
  };

  // Abrir formulario de edición
  const openEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setShowEditForm(true);
  };

  // Estadísticas
  const totalSuppliers = suppliers.length;
  const suppliersWithPhone = suppliers.filter(s => s.phone).length;
  const suppliersWithEmail = suppliers.filter(s => s.email).length;

  return (
    <div className="page">
      <h2>🏢 Gestión de Proveedores</h2>

      {/* Navegación tipo Reportes */}
      <div className="reports-nav">
        <button 
          className={`report-btn ${activeSection === 'addSupplier' ? 'active' : ''}`}
          onClick={() => setActiveSection('addSupplier')}
        >
          ➕ Agregar Proveedor
        </button>
        <button 
          className={`report-btn ${activeSection === 'viewSuppliers' ? 'active' : ''}`}
          onClick={() => setActiveSection('viewSuppliers')}
        >
          📋 Ver Proveedores
        </button>
        <button 
          className={`report-btn ${activeSection === 'supplierStats' ? 'active' : ''}`}
          onClick={() => setActiveSection('supplierStats')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* Contenido principal */}
      <div className="reports-content">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            Cargando proveedores...
          </div>
        ) : (
          <>
            {/* Sección: Agregar Proveedor */}
            {activeSection === 'addSupplier' && (
              <div className="report-section">
                <h3>➕ Agregar Nuevo Proveedor</h3>
                
                <div className="summary-cards">
                  <div className="summary-card total-suppliers">
                    <h4>Total Proveedores</h4>
                    <p className="amount">{totalSuppliers}</p>
                  </div>
                  <div className="summary-card suppliers-phone">
                    <h4>Con Teléfono</h4>
                    <p className="amount">{suppliersWithPhone}</p>
                  </div>
                  <div className="summary-card suppliers-email">
                    <h4>Con Email</h4>
                    <p className="amount">{suppliersWithEmail}</p>
                  </div>
                </div>

                {/* Solo el botón para abrir modal */}
                <div className="add-supplier-button-container">
                  <button 
                    onClick={() => setShowAddForm(true)}
                    className="btn-primary big-add-btn"
                  >
                    ➕ Agregar Nuevo Proveedor
                  </button>
                </div>
              </div>
            )}

            {/* Sección: Ver Proveedores */}
            {activeSection === 'viewSuppliers' && (
              <div className="report-section">
                <h3>📋 Lista de Proveedores ({filteredSuppliers.length})</h3>

                {/* Búsqueda */}
                <div className="search-section">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre o RUC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>

                {/* Lista de proveedores */}
                {filteredSuppliers.length > 0 ? (
                  <div className="table-container">
                    <table className="suppliers-table">
                      <thead>
                        <tr>
                          <th>Proveedor</th>
                          <th>RUC</th>
                          <th>Contacto</th>
                          <th>Dirección</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSuppliers.map((supplier) => (
                          <tr key={supplier.id}>
                            <td>
                              <strong>{supplier.name}</strong>
                            </td>
                            <td>{supplier.ruc}</td>
                            <td>
                              {supplier.phone && <div>📞 {supplier.phone}</div>}
                              {supplier.email && <div>📧 {supplier.email}</div>}
                              {!supplier.phone && !supplier.email && <span className="no-contact">Sin contacto</span>}
                            </td>
                            <td>
                              {supplier.address ? (
                                <span className="address-truncate" title={supplier.address}>
                                  {supplier.address.length > 30 
                                    ? supplier.address.substring(0, 30) + '...' 
                                    : supplier.address
                                  }
                                </span>
                              ) : (
                                <span className="no-address">Sin dirección</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons-small">
                                <button 
                                  onClick={() => openEditForm(supplier)}
                                  className="btn-small btn-edit"
                                >
                                  ✏️
                                </button>
                                <button 
                                  onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
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
                    {suppliers.length === 0 
                      ? 'No hay proveedores registrados todavía.' 
                      : 'No se encontraron proveedores con la búsqueda.'
                    }
                  </p>
                )}
              </div>
            )}

            {/* Sección: Estadísticas */}
            {activeSection === 'supplierStats' && (
              <div className="report-section">
                <h3>📊 Estadísticas de Proveedores</h3>
                
                <div className="summary-cards">
                  <div className="summary-card total-suppliers">
                    <h4>Total de Proveedores</h4>
                    <p className="amount">{totalSuppliers}</p>
                    <p className="subtext">Registrados en el sistema</p>
                  </div>
                  <div className="summary-card suppliers-phone">
                    <h4>Con Teléfono</h4>
                    <p className="amount">{suppliersWithPhone}</p>
                    <p className="subtext">{((suppliersWithPhone / totalSuppliers) * 100 || 0).toFixed(1)}%</p>
                  </div>
                  <div className="summary-card suppliers-email">
                    <h4>Con Email</h4>
                    <p className="amount">{suppliersWithEmail}</p>
                    <p className="subtext">{((suppliersWithEmail / totalSuppliers) * 100 || 0).toFixed(1)}%</p>
                  </div>
                  <div className="summary-card suppliers-complete">
                    <h4>Datos Completos</h4>
                    <p className="amount">
                      {suppliers.filter(s => s.phone && s.email && s.address).length}
                    </p>
                    <p className="subtext">Con teléfono, email y dirección</p>
                  </div>
                </div>

                <div className="suppliers-breakdown">
                  <h4>Desglose de Proveedores</h4>
                  <div className="breakdown-grid">
                    <div className="breakdown-item">
                      <span className="breakdown-label">Solo teléfono:</span>
                      <span className="breakdown-value">
                        {suppliers.filter(s => s.phone && !s.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Solo email:</span>
                      <span className="breakdown-value">
                        {suppliers.filter(s => !s.phone && s.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Sin contacto:</span>
                      <span className="breakdown-value">
                        {suppliers.filter(s => !s.phone && !s.email).length}
                      </span>
                    </div>
                    <div className="breakdown-item">
                      <span className="breakdown-label">Con dirección:</span>
                      <span className="breakdown-value">
                        {suppliers.filter(s => s.address).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal para Agregar Proveedor */}
      {showAddForm && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Agregar Nuevo Proveedor</h3>
            <form onSubmit={handleAddSupplier}>
              <div className="form-group">
                <label>Nombre del Proveedor:</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  required
                  placeholder="Ej: Ferretería Central S.A."
                />
              </div>
              
              <div className="form-group">
                <label>RUC:</label>
                <input
                  type="text"
                  value={newSupplier.ruc}
                  onChange={(e) => setNewSupplier({...newSupplier, ruc: e.target.value})}
                  required
                  placeholder="Ej: 123456789012"
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                  placeholder="Ej: 022123456"
                />
              </div>
              
              <div className="form-group">
                <label>Email (opcional):</label>
                <input
                  type="email"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                  placeholder="proveedor@empresa.com"
                />
              </div>
              
              <div className="form-group">
                <label>Dirección (opcional):</label>
                <textarea
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  placeholder="Dirección completa"
                  rows="3"
                />
              </div>
              
              <div className="form-buttons">
                <button type="submit" className="btn-primary">
                  ✅ Guardar Proveedor
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSupplier({ name: '', ruc: '', phone: '', email: '', address: '' });
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Editar Proveedor */}
      {showEditForm && editingSupplier && (
        <div className="form-overlay">
          <div className="form-container">
            <h3>Editar Proveedor</h3>
            <form onSubmit={handleEditSupplier}>
              <div className="form-group">
                <label>Nombre del Proveedor:</label>
                <input
                  type="text"
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({...editingSupplier, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>RUC:</label>
                <input
                  type="text"
                  value={editingSupplier.ruc}
                  onChange={(e) => setEditingSupplier({...editingSupplier, ruc: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="tel"
                  value={editingSupplier.phone || ''}
                  onChange={(e) => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editingSupplier.email || ''}
                  onChange={(e) => setEditingSupplier({...editingSupplier, email: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Dirección:</label>
                <textarea
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({...editingSupplier, address: e.target.value})}
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
                    setEditingSupplier(null);
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

export default Suppliers;