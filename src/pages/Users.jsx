import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, User, Mail, Shield, Building, Edit2, Trash2, Key } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const Users = ({ user: currentUser }) => {
  const [usersList, setUsersList] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  
  // Password Reset States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Custom Modals States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    if (alertDialog.isOpen) {
      const timer = setTimeout(() => setAlertDialog({ ...alertDialog, isOpen: false }), 3500);
      return () => clearTimeout(timer);
    }
  }, [alertDialog]);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/usuarios`, { headers: { 'x-user-id': currentUser?.id } });
      setUsersList(response.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchUnits = async () => {
    try {
      const resp = await axios.get(`${API_URL}/unidades`);
      setUnits(resp.data);
    } catch (err) { console.error(err); }
  };

  const handleOpenModal = (u = null) => {
    setEditingId(u ? u.id : null);
    setFormData(u || { username: '', role: 'Tecnico', fullname: '', unit_id: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const config = { headers: { 'x-user-id': currentUser?.id } };
      if (editingId) {
        await axios.put(`${API_URL}/usuarios/${editingId}`, formData, config);
      } else {
        await axios.post(`${API_URL}/usuarios`, formData, config);
      }
      setIsModalOpen(false);
      fetchUsers();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Usuario guardado correctamente.', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: '¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/usuarios/${id}`, { headers: { 'x-user-id': currentUser?.id } });
          fetchUsers();
          setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Usuario eliminado correctamente.', type: 'success' });
        } catch (err) {
          setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al eliminar el usuario.', type: 'error' });
        }
      }
    });
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await axios.post(`${API_URL}/usuarios/${resetUser.id}/reset-password`, 
        { newPassword },
        { headers: { 'x-user-id': currentUser?.id } }
      );
      setIsResetModalOpen(false);
      setNewPassword('');
      setAlertDialog({ isOpen: true, title: 'Contraseña Actualizada', message: `La contraseña de ${resetUser.fullname} ha sido restablecida con éxito.`, type: 'success' });
    } catch (err) {
      setAlertDialog({ isOpen: true, title: 'Error', message: err.response?.data?.error || 'Error al restablecer contraseña', type: 'error' });
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin': return { bg: '#eef2ff', color: '#4338ca', label: 'Admin (Planificación)' };
      case 'Director': return { bg: '#fef3c7', color: '#92400e', label: 'Director / Jefe' };
      case 'Tecnico': return { bg: '#dcfce7', color: '#15803d', label: 'Técnico / Operador' };
      case 'Auditor': return { bg: '#f1f5f9', color: '#475569', label: 'Auditor' };
      default: return { bg: '#f1f5f9', color: '#475569', label: role };
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="hero-title">Gestión de Usuarios</h1>
          <p style={{ color: '#64748b' }}>Administración de accesos y perfiles institucionales</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Agregar Usuario
        </button>
      </header>

      {/* Users Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {usersList.map(u => {
          const badge = getRoleBadge(u.role);
          return (
            <motion.div 
              key={u.id}
              whileHover={{ y: -5 }}
              className="glass-card" 
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <User size={24} />
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button onClick={() => handleOpenModal(u)} style={{ padding: '0.4rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b' }}><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(u.id)} style={{ padding: '0.4rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{u.fullname}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                  <Mail size={14} /> {u.username}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Shield size={14} color="#64748b" /> 
                  <span style={{ 
                    padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                    background: badge.bg, color: badge.color
                  }}>
                    {badge.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                  <Building size={14} /> {u.unidad || 'Sin Unidad Asignada'}
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button 
                  onClick={() => { setResetUser(u); setIsResetModalOpen(true); }}
                  style={{ 
                    width: '100%', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    border: 'none', background: 'transparent', cursor: 'pointer'
                  }}
                >
                   <Key size={14} /> Restablecer Clave
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '450px', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>{editingId ? 'Editar' : 'Nuevo'} Usuario</h2>
            
            {error && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ {error}</div>}

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Nombre Completo</label>
                  <input required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.fullname || ''} onChange={e => setFormData({...formData, fullname: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Usuario / Email</label>
                  <input required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                {!editingId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Contraseña Inicial</label>
                    <input required type="password" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Unidad de Adscripción</label>
                  <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.unit_id || ''} onChange={e => setFormData({...formData, unit_id: e.target.value})}>
                    <option value="">Seleccionar Unidad...</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Rol Institucional</label>
                  <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="Admin">Admin (Planificación)</option>
                    <option value="Director">Director / Jefe</option>
                    <option value="Tecnico">Técnico / Operador</option>
                    <option value="Auditor">Auditor</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#f1f5f9', border: 'none', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '10px' }}>Guardar Usuario</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '400px', padding: '2.5rem' }}>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 800 }}>Restablecer Clave</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Generar nueva credencial para <strong>{resetUser?.fullname}</strong></p>
            
            <form onSubmit={handleResetPassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem' }}>Nueva Contraseña</label>
                  <input 
                    required autoFocus type="password" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                    placeholder="Escriba la nueva clave..."
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsResetModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#f1f5f9', border: 'none', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '10px' }}>Actualizar Clave</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(5px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '400px', padding: '2rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>{confirmDialog.title}</h3>
            <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} 
                style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#f1f5f9', border: 'none', fontWeight: 700, flex: 1 }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({ ...confirmDialog, isOpen: false }); }} 
                className="btn-primary" 
                style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#ef4444', flex: 1 }}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Alert/Success Toast */}
      {alertDialog.isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20, x: 20 }} 
          animate={{ opacity: 1, y: 0, x: 0 }} 
          exit={{ opacity: 0, y: -20, x: 20 }}
          className="glass-card"
          style={{ 
            position: 'fixed', top: '2rem', right: '2rem', zIndex: 3000, 
            padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
            borderLeft: `4px solid ${alertDialog.type === 'error' ? '#ef4444' : '#10b981'}`,
            minWidth: '300px'
          }}
        >
          <div style={{ color: alertDialog.type === 'error' ? '#ef4444' : '#10b981', display: 'flex' }}>
            {alertDialog.type === 'error' ? <Shield size={24} /> : <Shield size={24} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: alertDialog.type === 'error' ? '#ef4444' : '#10b981' }}>
              {alertDialog.title}
            </h3>
            <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{alertDialog.message}</p>
          </div>
          <button 
            onClick={() => setAlertDialog({ ...alertDialog, isOpen: false })} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem', display: 'flex' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Users;
