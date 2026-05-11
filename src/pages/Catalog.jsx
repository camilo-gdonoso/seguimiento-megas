import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Database, ChevronRight, Edit2, Trash2, Layers, Building, Search, ClipboardCheck, Shield, LayoutGrid, FileText, Link2, Paperclip } from 'lucide-react';
import axios from 'axios';
import HierarchyTree from '../components/HierarchyTree';
import { ORGANIGRAM } from './organigram';
import { calculatePlanograma } from '../utils/planning';

const API_URL = '/api';

import * as XLSX from 'xlsx';

const Catalog = ({ user }) => {
  const [activeTab, setActiveTab] = useState('tareas'); // Default to the Matrix view for everyone
  const [data, setData] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [megas, setMegas] = useState([]);
  const [estrategias, setEstrategias] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [ejes, setEjes] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom Modals States
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [isIsolatedMode, setIsIsolatedMode] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({ mega: {}, producto: {}, actividad: {}, tarea: {} });
  
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedTaskForTracking, setSelectedTaskForTracking] = useState(null);
  const [selectedWeekForTracking, setSelectedWeekForTracking] = useState(null);
  const [trackingFormData, setTrackingFormData] = useState({ avance_real: '', observacion: '', evidencia_url: '' });

  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  // Export Formulario A Trimestral removed as requested

  useEffect(() => {
    if (alertDialog.isOpen) {
      const timer = setTimeout(() => setAlertDialog({ ...alertDialog, isOpen: false }), 3500);
      return () => clearTimeout(timer);
    }
  }, [alertDialog]);

  const tabs = [
    { id: 'megas', label: 'MeGAs (2030)', icon: Layers, group: 'Operativo' },
    { id: 'productos', label: 'Productos', icon: Database, group: 'Operativo' },
    { id: 'actividades', label: 'Actividades', icon: Layers, group: 'Operativo' },
    { id: 'tareas', label: 'Tareas / Matriz', icon: ClipboardCheck, group: 'Operativo' },
  ];

  const resourceMap = {
    'organigrama': 'unidades',
    'ejes': 'ejes',
    'resultados': 'resultados',
    'estrategias': 'estrategias',
    'megas': 'megas',
    'productos': 'productos',
    'actividades': 'actividades',
    'tareas': 'tareas',
    'tareas_aisladas': 'tareas',
  };

  const endpointMap = {
    'megas': 'megas_detail',
    'productos': 'productos_detail',
    'actividades': 'actividades_detail',
    'tareas': 'tareas_detail',
    'tareas_aisladas': 'tareas_detail',
  };

  useEffect(() => {
    fetchData();
    fetchSupportData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = endpointMap[activeTab] || resourceMap[activeTab];
      const res = await axios.get(`${API_URL}/${endpoint}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [uRes, eRes, rRes, mRes, pRes, aRes, usrRes, ejeRes] = await Promise.all([
        axios.get(`${API_URL}/unidades`),
        axios.get(`${API_URL}/estrategias`),
        axios.get(`${API_URL}/resultados`),
        axios.get(`${API_URL}/megas`),
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/actividades_detail`),
        axios.get(`${API_URL}/usuarios`),
        axios.get(`${API_URL}/ejes`)
      ]);
      setUnits(ORGANIGRAM);
      setEstrategias(eRes.data);
      setResultados(rRes.data);
      setMegas(mRes.data);
      setProductos(pRes.data);
      setActividades(aRes.data);
      setUsers(usrRes.data);
      setEjes(ejeRes.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      // Logic to map database fields to form field names
      let mappedData = { ...item };
      
      // For Products: map ponderacion_total to ponderacion_producto for the shared form
      if (activeTab === 'productos') {
        mappedData.ponderacion_producto = item.ponderacion_total;
      }
      
      setFormData(mappedData);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setError(null);
    setIsModalOpen(true);
  };

  const generatePlanograma = (overrideData = null) => {
    const contextData = overrideData || formData;
    const isHitos = contextData.is_hitos_mode;
    const targetValue = isHitos ? contextData.hitos_total : contextData.ponderacion_producto;

    const plan = calculatePlanograma({
      fecha_inicio: contextData.fecha_inicio,
      fecha_fin: contextData.fecha_fin,
      targetValue,
      tipo_avance: contextData.tipo_avance,
      is_hitos_mode: isHitos
    });

    if (!plan) {
      if (!overrideData) setAlertDialog({ 
        isOpen: true, 
        type: 'error', 
        message: 'No se pudo generar el cronograma. Verifique las fechas y la meta.' 
      });
      return;
    }

    setFormData({ ...contextData, planograma: plan, tipo_avance: contextData.tipo_avance || 'Semanal' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (formData.planograma) {
        const sum = formData.planograma.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
        const target = formData.is_hitos_mode ? parseFloat(formData.hitos_total) : parseFloat(formData.ponderacion_producto);
        if (Math.abs(sum - target) > 0.05) {
            setError(`La suma del Cronograma (${sum.toFixed(2)}) no coincide con la Meta (${target}).`);
            return;
        }
      }
      const resource = resourceMap[activeTab];
      let dataToSave = { ...formData, is_isolated: isIsolatedMode };

      // Handle File Upload if exists
      if (formData.evidence_file) {
          const fileFormData = new FormData();
          fileFormData.append('evidencia', formData.evidence_file);
          const uploadRes = await axios.post(`${API_URL}/upload`, fileFormData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes.data.success) {
              dataToSave.medio_verificacion = uploadRes.data.url;
              delete dataToSave.evidence_file;
          }
      }
      
      // If isolated mode, parents are null
      if (isIsolatedMode) {
        if (activeTab === 'resultados') dataToSave.eje_id = null;
        if (activeTab === 'estrategias') dataToSave.resultado_id = null;
        if (activeTab === 'megas') dataToSave.estrategia_id = null;
        if (activeTab === 'productos') dataToSave.mega_id = null;
        if (activeTab === 'actividades') dataToSave.producto_id = null;
        if (activeTab === 'tareas') dataToSave.actividad_id = null;
      }
      
      // Force conversion of relational IDs to Numbers before saving
      if (dataToSave.eje_id) dataToSave.eje_id = Number(dataToSave.eje_id);
      if (dataToSave.resultado_id) dataToSave.resultado_id = Number(dataToSave.resultado_id);
      if (dataToSave.estrategia_id) dataToSave.estrategia_id = Number(dataToSave.estrategia_id);
      if (dataToSave.unit_id) dataToSave.unit_id = Number(dataToSave.unit_id);
      
      // Map back to correct DB column names specifically for Products
      if (activeTab === 'productos') {
        dataToSave.ponderacion_total = Number(dataToSave.ponderacion_producto || 0);
      }

      if (editingId) {
        await axios.put(`${API_URL}/${resource}/${editingId}`, dataToSave);
      } else {
        await axios.post(`${API_URL}/${resource}`, dataToSave);
      }
      setIsModalOpen(false);
      setFormData({}); // Clear form for quick entry flow
      fetchData();
      fetchSupportData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Registro guardado correctamente.', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el registro');
    }
  };

  const handleWizardSave = async () => {
    try {
      setError(null);
      // Validations
      if (!wizardData.mega.code || !wizardData.mega.name || !wizardData.mega.estrategia_id) { setError('Faltan datos del MeGA'); return; }
      if (!wizardData.producto.name) { setError('Faltan datos del Producto'); return; }
      if (!wizardData.actividad.name) { setError('Faltan datos de la Actividad'); return; }
      if (!wizardData.tarea.name || !wizardData.tarea.code) { setError('Faltan datos de la Tarea'); return; }

      // 1. Create MeGA
      const resMega = await axios.post(`${API_URL}/megas`, wizardData.mega);
      const megaId = resMega.data.id;
      
      // 2. Create Producto
      const resProd = await axios.post(`${API_URL}/productos`, { ...wizardData.producto, mega_id: megaId, ponderacion_total: 100 });
      const prodId = resProd.data.id;
      
      // 3. Create Actividad
      const resAct = await axios.post(`${API_URL}/actividades`, { ...wizardData.actividad, producto_id: prodId });
      const actId = resAct.data.id;
      
      // 4. Create Tarea
      await axios.post(`${API_URL}/tareas`, { ...wizardData.tarea, actividad_id: actId, ponderacion_producto: 100 });
      
      setIsWizardOpen(false);
      fetchData();
      fetchSupportData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Estructura jerárquica creada y vinculada correctamente.', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el asistente');
    }
  };

  const handleSaveTracking = async () => {
    try {
      setError(null);
      const payload = {
        tarea_id: selectedTaskForTracking.id,
        semana: selectedWeekForTracking,
        avance_real: trackingFormData.avance_real,
        observacion: trackingFormData.observacion,
        evidencia_url: trackingFormData.evidencia_url
      };
      
      if (trackingFormData.evidence_file) {
          const fileFormData = new FormData();
          fileFormData.append('evidencia', trackingFormData.evidence_file);
          const uploadRes = await axios.post(`${API_URL}/upload`, fileFormData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (uploadRes.data.success) {
              payload.evidencia_url = uploadRes.data.url;
          }
      }

      await axios.post(`${API_URL}/avances-semanales`, payload);
      setIsTrackingModalOpen(false);
      fetchData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Reporte de avance enviado correctamente.', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reportar avance');
    }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar Registro',
      message: '¿Está seguro que desea eliminar este registro? Esto podría afectar otros elementos vinculados y no se puede deshacer.',
      onConfirm: async () => {
        try {
          const resource = resourceMap[activeTab];
          await axios.delete(`${API_URL}/${resource}/${id}`);
          fetchData();
          setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Registro eliminado correctamente.', type: 'success' });
        } catch (err) {
          console.error(err);
          setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo eliminar el registro. Puede estar en uso.', type: 'error' });
        }
      }
    });
  };

  const filteredData = data.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    
    // Global search across multiple fields
    const matchSearch = (
      (item.name || '') + ' ' + 
      (item.description || '') + ' ' + 
      (item.code || '') + ' ' + 
      (item.mega_name || '') + ' ' + 
      (item.producto_name || '') + ' ' + 
      (item.actividad_name || '') + ' ' + 
      (item.responsable_nombre || '') + ' ' + 
      (item.responsable_directo || '') + ' ' +
      (item.director_responsable || '')
    ).toLowerCase().includes(searchLower);
    
    // Mode Filter
    const matchMode = Boolean(item.is_isolated) === isIsolatedMode;
    if (!matchMode) return false;

    // Filter by role: Tecnicos only see their assigned tasks
    if (activeTab === 'tareas' && user?.role === 'Tecnico') {
        return matchSearch && Number(item.user_assigned_id) === Number(user?.id);
    }
    // Filter by unit: Directores only see their unit's tasks
    if (activeTab === 'tareas' && user?.role === 'Director') {
        return matchSearch && Number(item.unit_id) === Number(user?.unit_id);
    }
    return matchSearch;
  });

  const isDirector = user?.role?.toLowerCase().includes('director');
  const isAdmin = user?.role?.toLowerCase().includes('admin');

  const availableTechnicians = users.filter(u => {
      if (isAdmin) return true; // Admins pueden asignar a todos en toda la app
      if (isDirector) return u.unit_id === user?.unit_id; // Directores solo ven a su propia Unidad
      return true;
  });

  const availableDirectors = users.filter(u => {
      if (isAdmin) return u.role === 'Director' || u.role === 'Admin';
      if (isDirector) return u.id === user?.id || (u.role === 'Director' && u.unit_id === user?.unit_id);
      return true;
  });
  
  const getRowSpans = (data, fields) => {
    const rowSpans = fields.reduce((acc, field) => {
      acc[field] = new Array(data.length).fill(0);
      return acc;
    }, {});
    fields.forEach(field => {
      let i = 0;
      while (i < data.length) {
        let count = 1;
        while (i + count < data.length && (field === 'producto_name' ? (data[i][field] === data[i + count][field] && data[i].mega_name === data[i+count].mega_name) : data[i][field] === data[i + count][field])) {
          count++;
        }
        rowSpans[field][i] = count;
        i += count;
      }
    });
    return rowSpans;
  };
  const rowSpans = activeTab === 'tareas' ? getRowSpans(filteredData, ['mega_name', 'producto_name']) : {};

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="hero-title">Matriz de Planificación</h1>
          <p style={{ color: '#64748b' }}>Gestión de Parámetros y Cronogramas Institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
           <div className="glass-card" style={{ padding: '0.4rem 0.8rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isIsolatedMode ? '#94a3b8' : 'var(--primary)' }}>Jerárquico</span>
              <button 
                onClick={() => setIsIsolatedMode(!isIsolatedMode)}
                style={{ 
                  width: '40px', height: '20px', borderRadius: '10px', background: isIsolatedMode ? 'var(--primary)' : '#cbd5e1', 
                  border: 'none', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' 
                }}
              >
                <div style={{ 
                  width: '14px', height: '14px', background: 'white', borderRadius: '50%', 
                  position: 'absolute', top: '3px', left: isIsolatedMode ? '23px' : '3px', transition: 'all 0.3s' 
                }} />
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isIsolatedMode ? 'var(--primary)' : '#94a3b8' }}>Aislado</span>
           </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '0.9rem', outline: 'none'
              }}
            />
          </div>
          {isAdmin && activeTab !== 'organigrama' && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isIsolatedMode && (
                <button 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)' }}
                  onClick={() => { setWizardData({ mega: {}, producto: {}, actividad: {}, tarea: { tipo_avance: 'Semanal', ponderacion_producto: 0 } }); setWizardStep(1); setIsWizardOpen(true); }}
                >
                  <Layers size={18} /> Asistente de Matriz
                </button>
              )}
              <button 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={() => handleOpenModal()}
              >
                <Plus size={18} /> Nuevo Registro
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Tabs Layout */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { name: 'GESTIÓN OPERATIVA', group: 'Operativo' },
          { name: 'BASE INSTITUCIONAL', group: 'Base' }
        ].map(section => (
          <div key={section.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1, minWidth: '350px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.15em', paddingLeft: '0.5rem' }}>
              {section.name}
            </span>
            <div className="glass-card" style={{ padding: '0.4rem', borderRadius: '16px', display: 'flex', gap: '0.3rem', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
               {tabs.filter(t => t.group === section.group).map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   style={{
                     flex: 1, padding: '0.6rem 0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                     background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                     color: activeTab === tab.id ? 'white' : '#64748b',
                     transition: 'all 0.2s',
                     border: 'none', outline: 'none', cursor: 'pointer',
                     fontWeight: 700, fontSize: '0.75rem',
                     boxShadow: activeTab === tab.id ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none'
                   }}
                 >
                   <tab.icon size={14} /> {tab.label}
                 </button>
               ))}
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'organigrama' ? (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1e293b' }}>Resumen del Organigrama</h3>
               <HierarchyTree units={units} />
            </div>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase' }}>Estadísticas de la Estructura</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Viceministerios</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{units.filter(u => u.type === 'Viceministerio').length}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Direcciones</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{units.filter(u => u.type === 'Direccion').length}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Unidades Técnicas</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{units.filter(u => u.type === 'Unidad').length}</span>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'white', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Jefaturas Regionales</span>
                    <span style={{ fontWeight: 800, color: '#2563eb' }}>{units.filter(u => u.type === 'Jefatura').length}</span>
                 </div>
               </div>
               <div style={{ marginTop: '2rem', padding: '1rem', background: '#e0f2fe', borderRadius: '8px', color: '#0369a1', fontSize: '0.8rem' }}>
                 <strong>Nota:</strong> Los funcionarios se asignan a estas unidades para filtrar automáticamente el seguimiento de sus MeGAs.
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              {/* Quick Entry Row */}
              {isAdmin && activeTab !== 'tareas' && activeTab !== 'tareas_aisladas' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        placeholder="Código..." 
                        style={{ width: '120px', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={formData.code || ''}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                      />
                      <input 
                        placeholder={`Nuevo(a) ${activeTab.slice(0,-1)}...`} 
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={formData.name || formData.description || ''}
                        onChange={e => setFormData({...formData, [activeTab === 'resultados' || activeTab === 'ejes' || activeTab === 'estrategias' ? 'description' : 'name']: e.target.value})}
                      />
                    </div>
                  </td>
                  <td colSpan="8" style={{ padding: '1rem', background: isIsolatedMode ? '#fef2f2' : '#f0f9ff' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {isIsolatedMode ? (
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>
                          <Link2 size={14} style={{ marginRight: '4px' }} /> Registro Aislado (Sin dependencia jerárquica)
                        </div>
                      ) : (
                        <>
                      {activeTab === 'resultados' && (
                         <select 
                           style={{ minWidth: '250px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontWeight: 800, color: '#1e40af', outline: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} 
                           value={formData.eje_id || ''} 
                           onChange={e => setFormData({...formData, eje_id: e.target.value})}
                         >
                            <option value="">Vincular a Eje Estratégico...</option>
                            {ejes.map(e => <option key={e.id} value={e.id}>{e.code}: {e.description?.substring(0, 30)}...</option>)}
                         </select>
                      )}
                      {activeTab === 'estrategias' && (
                         <select 
                           style={{ minWidth: '250px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontWeight: 800, color: '#1e40af', outline: 'none' }} 
                           value={formData.resultado_id || ''} 
                           onChange={e => setFormData({...formData, resultado_id: e.target.value})}
                         >
                            <option value="">Vincular a Resultado Padre...</option>
                            {resultados.map(r => <option key={r.id} value={r.id}>{r.code}: {r.description?.substring(0, 30)}...</option>)}
                         </select>
                      )}
                      {activeTab === 'megas' && (
                         <select 
                           style={{ minWidth: '250px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontWeight: 800, color: '#1e40af', outline: 'none' }} 
                           value={formData.estrategia_id || ''} 
                           onChange={e => setFormData({...formData, estrategia_id: e.target.value})}
                         >
                            <option value="">Vincular a Estrategia...</option>
                            {estrategias.map(es => <option key={es.id} value={es.id}>{es.code}</option>)}
                         </select>
                      )}
                      {activeTab === 'productos' && (
                         <select 
                           style={{ minWidth: '250px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontWeight: 800, color: '#1e40af', outline: 'none' }} 
                           value={formData.mega_id || ''} 
                           onChange={e => setFormData({...formData, mega_id: e.target.value})}
                         >
                           <option value="">Vincular a MeGA...</option>
                           {megas.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}
                         </select>
                      )}
                      {activeTab === 'actividades' && (
                         <select 
                           style={{ minWidth: '250px', padding: '0.6rem', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontWeight: 800, color: '#1e40af', outline: 'none' }} 
                           value={formData.producto_id || ''} 
                           onChange={e => setFormData({...formData, producto_id: e.target.value})}
                         >
                           <option value="">Vincular a Producto...</option>
                           {productos.map(p => <option key={p.id} value={p.id}>{p.name?.substring(0,40)}...</option>)}
                         </select>
                      )}
                        </>
                      )}
                      <button 
                        onClick={handleSave} 
                        style={{ 
                          padding: '0.75rem 1.5rem', 
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '12px', 
                          fontWeight: 900, 
                          cursor: 'pointer',
                          boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                         <Plus size={18} /> Registrar Registro
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                {(activeTab === 'tareas' || activeTab === 'tareas_aisladas') ? (
                  <>
                    {activeTab === 'tareas' && !isIsolatedMode && (
                        <>
                            <th style={{ padding: '1rem', fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', minWidth: '180px' }}>RESULTADOS PROPUESTOS POR LA INSTITUCIÓN AL 2030 (MeGAs)</th>
                            <th style={{ padding: '1rem', fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', minWidth: '180px' }}>PRODUCTOS INTERMEDIOS PROPUESTOS POR LA ENTIDAD (100%)</th>
                            <th style={{ padding: '1rem', fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', minWidth: '180px' }}>ACTIVIDADES A REALIZAR</th>
                        </>
                    )}
                    <th style={{ padding: '1rem', fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', minWidth: '180px' }}>{isIsolatedMode ? 'REGISTRO AISLADO' : 'TAREAS DE CUMPLIMIENTO'}</th>
                    <th style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>PESO (%)</th>
                    <th style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', minWidth: '110px' }}>INICIO / FIN</th>
                    <th style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>MEDIO VERIF.</th>
                    <th style={{ textAlign: 'left', padding: '1rem', color: '#475569', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>RESPONSABLE</th>
                  </>
                ) : (
                   <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>CÓDIGO / DESCRIPCIÓN</th>
                )}
                {activeTab === 'resultados' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>EJE ESTRATÉGICO</th>}
                {activeTab === 'estrategias' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>RESULTADO PADRE</th>}
                {activeTab === 'megas' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>ESTRATEGIA VINCULADA</th>}
                {activeTab === 'productos' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>MeGA ASOCIADO</th>}
                {activeTab === 'actividades' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>PRODUCTO INTERMEDIO</th>}
                {activeTab === 'megas' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>AVANCE FÍSICO</th>}
                {activeTab === 'productos' && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>PESO % MeGA</th>}
                {(activeTab === 'tareas' || activeTab === 'tareas_aisladas') && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase' }}>SEGUIMIENTO / AVANCE</th>}
                {isAdmin && <th style={{ padding: '1.25rem', fontSize: '0.75rem', color: '#475569', fontWeight: 800, textAlign: 'right', textTransform: 'uppercase' }}>ACCIONES</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="15" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando matriz institucional...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="15" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No hay registros cargados</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="15" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No se encontraron coincidencias</td></tr>
              ) : filteredData.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem' }}>
                    {activeTab === 'tareas' && !isIsolatedMode && (
                      <>
                         {rowSpans['mega_name'] && rowSpans['mega_name'][idx] > 0 && (
                           <td rowSpan={rowSpans['mega_name'][idx]} style={{ padding: '1.25rem 1rem', color: '#475569', fontWeight: 600, borderRight: '1px solid #f1f5f9', verticalAlign: 'top', background: 'white' }}>
                             {item.mega_code} - {item.mega_name?.substring(0,80)}...
                           </td>
                         )}
                         {rowSpans['producto_name'] && rowSpans['producto_name'][idx] > 0 && (
                           <td rowSpan={rowSpans['producto_name'][idx]} style={{ padding: '1.25rem 1rem', color: '#64748b', borderRight: '1px solid #f1f5f9', verticalAlign: 'top', background: 'white' }}>
                             {item.producto_name?.substring(0,100)}...
                           </td>
                         )}
                         <td style={{ padding: '1rem', color: '#64748b' }}>{item.actividad_name}</td>
                      </>
                    )}
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {item.code && <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 900 }}>{item.code}</span>}
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.description || item.name}</span>
                        {activeTab === 'megas' && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Unidad: {item.unit_name || 'N/A'}</div>}
                      </div>
                    </td>
                  {activeTab === 'resultados' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ background: '#fef3c7', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, color: '#92400e', border: '1px solid #fde68a' }}>
                         {ejes.find(e => Number(e.id) === Number(item.eje_id))?.code || 'S/V'}
                      </span>
                    </td>
                  )}
                  {activeTab === 'estrategias' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ background: '#e0f2fe', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, color: '#0369a1', border: '1px solid #bae6fd' }}>
                        {resultados.find(r => Number(r.id) === Number(item.resultado_id))?.code || 'S/V'}
                      </span>
                    </td>
                  )}
                  {activeTab === 'megas' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ background: '#dcfce7', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, color: '#166534', border: '1px solid #bbf7d0' }}>
                        {estrategias.find(es => Number(es.id) === Number(item.estrategia_id))?.code || 'S/V'}
                      </span>
                    </td>
                  )}
                  {activeTab === 'productos' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                       {item.mega_name || '---'}
                    </td>
                  )}
                  {activeTab === 'actividades' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                       {item.producto_name || '---'}
                    </td>
                  )}
                  {(activeTab === 'tareas' || activeTab === 'tareas_aisladas') && (
                    <>
                      <td style={{ padding: '1rem', color: '#1e293b', fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.code} {item.is_hitos_mode ? '🎯 (Hitos)' : ''}</span>
                           {item.name}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#2563eb', fontWeight: 900, textAlign: 'center' }}>
                        {parseFloat(item.ponderacion_producto || 0).toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem', color: '#475569', fontWeight: 600, textAlign: 'center', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#10b981' }}>{item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : '---'}</span>
                          <div style={{ height: '1px', background: '#e2e8f0', width: '20px', margin: '2px auto' }} />
                          <span style={{ color: '#ef4444' }}>{item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : '---'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {item.medio_verificacion?.startsWith('/uploads') ? (
                          <a href={`${API_URL}${item.medio_verificacion}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline' }}>
                            Ver Archivo 📎
                          </a>
                        ) : (
                          item.medio_verificacion || '---'
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569', fontWeight: 700 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span>{item.responsable_nombre || '---'}</span>
                           <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>{item.responsable_cargo || '---'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                         <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '300px', paddingBottom: '0.5rem' }}>
                            {item.planograma?.map((p, pIdx) => {
                               const avance = (item.avances || []).find(av => Number(av.semana) === Number(p.periodo));
                               return (
                                 <motion.div 
                                   whileHover={{ scale: 1.05 }}
                                   key={pIdx} 
                                   onClick={() => {
                                      setSelectedTaskForTracking(item);
                                      setSelectedWeekForTracking(p.periodo);
                                      setTrackingFormData({
                                        avance_real: avance ? avance.avance_real : '',
                                        observacion: avance ? avance.observacion : '',
                                        evidencia_url: avance ? avance.evidencia_url : ''
                                      });
                                      setIsTrackingModalOpen(true);
                                   }}
                                   style={{ 
                                     minWidth: '55px', 
                                     padding: '0.4rem', 
                                     borderRadius: '12px', 
                                     background: avance ? '#dcfce7' : '#f8fafc',
                                     border: avance ? '2px solid #22c55e' : '2px solid #e2e8f0',
                                     textAlign: 'center',
                                     cursor: 'pointer',
                                     boxShadow: avance ? '0 4px 6px -1px rgba(34, 197, 94, 0.2)' : 'none'
                                   }}
                                 >
                                   <div style={{ fontSize: '0.6rem', fontWeight: 900, color: avance ? '#166534' : '#64748b', textTransform: 'uppercase' }}>S{p.periodo}</div>
                                   <div style={{ fontSize: '0.75rem', fontWeight: 900, color: avance ? '#15803d' : '#1e293b' }}>
                                      {avance ? `${parseFloat(avance.avance_real).toFixed(0)}${item.is_hitos_mode ? '' : '%'}` : `${parseFloat(p.valor).toFixed(0)}${item.is_hitos_mode ? '' : '%'}`}
                                   </div>
                                   <div style={{ width: '100%', height: '3px', background: avance ? '#22c55e' : '#cbd5e1', borderRadius: '2px', marginTop: '4px' }} />
                                 </motion.div>
                               );
                            })}
                         </div>
                      </td>
                      {isAdmin && (
                        <td style={{ padding: '1rem', borderLeft: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <button 
                              onClick={() => handleOpenModal(item)}
                              style={{ padding: '4px', borderRadius: '6px', background: '#eff6ff', color: '#3b82f6', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800 }}
                            >
                              EDITAR TAREA
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              style={{ padding: '4px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800 }}
                            >
                              BORRAR TAREA
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                  {activeTab === 'megas' && (
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ejecución Real</span>
                          <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '100px', minWidth: '100px', overflow: 'hidden' }}>
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${parseFloat(item.avance_fisico || 0)}%` }}
                              style={{ 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #10b981, #34d399)',
                                borderRadius: '100px'
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#111827' }}>{parseFloat(item.avance_fisico || 0).toFixed(1)}%</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>Planificación:</span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: item.current_weighting >= 100 ? '#059669' : '#3b82f6' }}>
                             {item.current_weighting >= 100 ? 'Estructura Completa (100%)' : `${parseFloat(item.current_weighting || 0).toFixed(0)}% definida`}
                          </span>
                        </div>
                      </div>
                    </td>
                  )}
                  {activeTab === 'productos' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                      {parseFloat(item.ponderacion_total || 0).toFixed(1)}%
                    </td>
                  )}
                  {isAdmin && activeTab !== 'organigrama' && (
                    <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          style={{ padding: '0.5rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b' }}
                          onClick={() => handleOpenModal(item)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          style={{ padding: '0.5rem', borderRadius: '8px', background: '#fee2e2', color: '#ef4444' }}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '3rem', background: 'white', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.25rem' }}>
               <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '0.8rem', borderRadius: '16px' }}>
                  <FileText size={28} />
               </div>
               <div>
                 <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1 }}>{isIsolatedMode ? 'Nuevo Elemento Aislado' : ((activeTab === 'tareas' || activeTab === 'tareas_aisladas') ? 'Nuevo Elemento (Tarea)' : 'Nuevo Registro')}</h2>
                 <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.3rem', fontWeight: 500 }}>{isIsolatedMode ? 'Parametrización completa para seguimiento independiente' : 'Registro de componentes de la estructura institucional'}</p>
               </div>
            </div>
            
            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {(activeTab !== 'tareas' && activeTab !== 'tareas_aisladas' && !isIsolatedMode) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Código / ID</label>
                        <input required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Descripción Detallada</label>
                        <textarea required rows="3" style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#f8fafc', resize: 'none' }} value={formData.description || formData.name || ''} onChange={e => setFormData({...formData, [activeTab === 'resultados' || activeTab === 'ejes' || activeTab === 'estrategias' ? 'description' : 'name']: e.target.value})} />
                      </div>
                    </div>

                    {/* Dynamic Parent Linkage In Modal */}
                    {!isIsolatedMode && ['resultados', 'estrategias', 'megas', 'productos', 'actividades'].includes(activeTab) && (
                      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '20px', border: '1px dashed #3b82f6' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.8rem', color: '#1e40af' }}>
                          <Link2 size={18} /> Vinculación de Dependencia (Jerarquía)
                        </label>
                        
                        {activeTab === 'resultados' && (
                          <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 700 }} value={formData.eje_id || ''} onChange={e => setFormData({...formData, eje_id: e.target.value})}>
                            <option value="">Vincular a Eje Estratégico...</option>
                            {ejes.map(e => <option key={e.id} value={e.id}>{e.code}: {e.description?.substring(0,60)}...</option>)}
                          </select>
                        )}

                        {activeTab === 'estrategias' && (
                          <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 700 }} value={formData.resultado_id || ''} onChange={e => setFormData({...formData, resultado_id: e.target.value})}>
                            <option value="">Vincular a Resultado Padre...</option>
                            {resultados.map(r => <option key={r.id} value={r.id}>{r.code}: {r.description?.substring(0,60)}...</option>)}
                          </select>
                        )}

                        {activeTab === 'megas' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 700 }} value={formData.estrategia_id || ''} onChange={e => setFormData({...formData, estrategia_id: e.target.value})}>
                              <option value="">Vincular a Estratégica Institucional...</option>
                              {estrategias.map(es => <option key={es.id} value={es.id}>{es.code}: {es.description?.substring(0,60)}...</option>)}
                            </select>
                            <select required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.unit_id || ''} onChange={e => setFormData({...formData, unit_id: e.target.value})}>
                              <option value="">Asignar a Unidad/Dirección Responsable...</option>
                              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </div>
                        )}

                        {activeTab === 'productos' && (
                          <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 700 }} value={formData.mega_id || ''} onChange={e => setFormData({...formData, mega_id: e.target.value})}>
                            <option value="">Vincular a MeGA (Resultado)...</option>
                            {megas.map(m => <option key={m.id} value={m.id}>{m.code}: {m.name?.substring(0,60)}...</option>)}
                          </select>
                        )}

                        {activeTab === 'actividades' && (
                          <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 700 }} value={formData.producto_id || ''} onChange={e => setFormData({...formData, producto_id: e.target.value})}>
                            <option value="">Vincular a Producto Intermedio...</option>
                            {productos.map(p => <option key={p.id} value={p.id}>{p.code}: {p.name?.substring(0,60)}...</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Código / ID</label>
                        <input required placeholder="T-01" style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', background: '#eff6ff', fontWeight: 900, fontSize: '1.1rem', color: '#1e40af' }} value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Descripción de la Tarea</label>
                        <input required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: isIsolatedMode ? '#ef4444' : '#64748b' }}>
                        <Link2 size={16} /> {isIsolatedMode ? 'Tarea en MODO AISLADO (Sin Actividad)' : 'Tarea en MODO JERÁRQUICO'}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                        <input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={formData.is_hitos_mode || false} onChange={e => {
                          setFormData({...formData, is_hitos_mode: e.target.checked});
                        }} />
                        Medición por Hitos (No Temporal)
                      </label>
                    </div>
                    
                    {!isIsolatedMode && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Actividad Padre vinculada</label>
                        <select required={!isIsolatedMode} style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }} value={formData.actividad_id || ''} onChange={e => setFormData({...formData, actividad_id: e.target.value})}>
                          <option value="">Seleccionar de la lista de actividades...</option>
                          {actividades.map(a => (
                            <option key={a.id} value={a.id}>MeGA: {a.mega_code} / Prod: {a.producto_name?.substring(0,40)}... / Act: {a.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>{formData.is_hitos_mode ? 'Meta Total (Hitos)' : 'Peso % (0-100)'}</label>
                        <input type="number" step={formData.is_hitos_mode ? "1" : "0.1"} required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', fontWeight: 900, color: '#2563eb' }} value={formData.is_hitos_mode ? (formData.hitos_total || '') : (formData.ponderacion_producto || '')} onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const nd = formData.is_hitos_mode ? {...formData, hitos_total: val} : {...formData, ponderacion_producto: val};
                          if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                        }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Fecha Inicio</label>
                          <input type="date" required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.fecha_inicio ? formData.fecha_inicio.split('T')[0] : ''} onChange={e => {
                             const nd = {...formData, fecha_inicio: e.target.value};
                             if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                          }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Fecha Fin</label>
                          <input type="date" required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.fecha_fin ? formData.fecha_fin.split('T')[0] : ''} onChange={e => {
                             const nd = {...formData, fecha_fin: e.target.value};
                             if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                          }} />
                        </div>
                      </div>
                    </div>


                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Tipo de Avance</label>
                        <select style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.tipo_avance || 'Semanal'} onChange={e => {
                          const nd = {...formData, tipo_avance: e.target.value};
                          if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                        }}>
                          <option value="Semanal">Temporal (Semanas)</option>
                          <option value="Diario">Temporal (Días)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Medio de Verificación (Archivo / Link)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input placeholder="Ej: Link Google Drive..." style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.medio_verificacion || ''} onChange={e => setFormData({...formData, medio_verificacion: e.target.value})} />
                          <input type="file" id="fileUpload" style={{ display: 'none' }} onChange={e => setFormData({...formData, evidence_file: e.target.files[0], medio_verificacion: e.target.files[0].name})} />
                          <button type="button" onClick={() => document.getElementById('fileUpload').click()} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer' }}>
                             <Paperclip size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <LayoutGrid size={20} color="#3b82f6" /> {formData.is_hitos_mode ? 'Cronograma de Hitos' : 'Cronograma de Planificación'}
                        </h4>
                        <button type="button" onClick={() => generatePlanograma()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}>
                          Auto-Calcular
                        </button>
                      </div>
                      
                      {formData.planograma && (
                         <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                            {formData.planograma.map((p, idx) => (
                              <div key={idx} style={{ minWidth: '75px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase' }}>{formData.tipo_avance === 'Diario' ? 'D' : 'S'}{p.periodo}</div>
                                <input style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '2px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }} value={p.valor} onChange={e => {
                                  const newP = [...formData.planograma];
                                  newP[idx].valor = parseFloat(e.target.value) || 0;
                                  setFormData({...formData, planograma: newP});
                                }} />
                              </div>
                            ))}
                         </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Funcionario (Ejecución)</label>
                        <select required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.user_id || ''} onChange={e => setFormData({...formData, user_id: e.target.value})}>
                          <option value="">Buscar funcionario asignado...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.fullname}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Director (Supervisión)</label>
                        <select required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.director_id || ''} onChange={e => setFormData({...formData, director_id: e.target.value})}>
                          <option value="">Seleccionar director responsable...</option>
                          {users.filter(u => u.role === 'Director').map(u => <option key={u.id} value={u.id}>{u.fullname}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Responsable (Firma)</label>
                        <input required placeholder="Nombre completo para rúbrica..." style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.responsable_nombre || ''} onChange={e => setFormData({...formData, responsable_nombre: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Cargo Institucional</label>
                        <input required placeholder="Ej: Jefe de Unidad, Director..." style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.responsable_cargo || ''} onChange={e => setFormData({...formData, responsable_cargo: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Indicador de Cumplimiento</label>
                      <input placeholder="Ej: Número de informes emitidos, Porcentaje de avance..." style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={formData.indicador || ''} onChange={e => setFormData({...formData, indicador: e.target.value})} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#475569' }}>Resultado esperado al concluir</label>
                      <textarea placeholder="Descripción del producto o impacto final..." style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1', resize: 'none' }} value={formData.resultado_esperado || ''} onChange={e => setFormData({...formData, resultado_esperado: e.target.value})} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>¿Vinculado al POA?</label>
                      <select style={{ width: '120px', padding: '0.8rem', borderRadius: '12px', border: '2px solid #cbd5e1', fontWeight: 800 }} value={formData.vinculada_poa || 'NO'} onChange={e => setFormData({...formData, vinculada_poa: e.target.value})}>
                        <option value="NO">NO</option>
                        <option value="SÍ">SÍ</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'flex-end', marginTop: '3.5rem', borderTop: '2px solid #f8fafc', paddingTop: '2rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '1rem 2rem', borderRadius: '16px', background: '#f1f5f9', border: 'none', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>Cerrar</button>
                <button type="submit" className="btn-primary" style={{ padding: '1rem 3rem', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)' }}>Guardar Cambios</button>
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

      {/* Wizard Modal */}
      {isWizardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '3rem', background: 'white', borderRadius: '32px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Asistente de Planificación (Paso {wizardStep}/4)</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1,2,3,4].map(s => <div key={s} style={{ width: '40px', height: '8px', borderRadius: '4px', background: s <= wizardStep ? '#3b82f6' : '#e2e8f0' }} />)}
                </div>
             </div>

             {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '1.5rem' }}>{error}</div>}

             <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                {wizardStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1e40af' }}>1. Configuración de MeGA (Resultado)</h3>
                    <select required style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.mega.estrategia_id || ''} onChange={e => setWizardData({...wizardData, mega: {...wizardData.mega, estrategia_id: e.target.value}})}>
                      <option value="">Seleccionar Estratégica Institucional...</option>
                      {estrategias.map(es => <option key={es.id} value={es.id}>{es.code}: {es.description?.substring(0,80)}...</option>)}
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                       <input placeholder="Código" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.mega.code || ''} onChange={e => setWizardData({...wizardData, mega: {...wizardData.mega, code: e.target.value}})} />
                       <input placeholder="Nombre del MeGA / Resultado" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.mega.name || ''} onChange={e => setWizardData({...wizardData, mega: {...wizardData.mega, name: e.target.value}})} />
                    </div>
                    <select style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.mega.unit_id || ''} onChange={e => setWizardData({...wizardData, mega: {...wizardData.mega, unit_id: e.target.value}})}>
                      <option value="">Unidad Responsable...</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1e40af' }}>2. Definición de Producto Intermedio</h3>
                    <input placeholder="Código de Producto" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.producto.code || ''} onChange={e => setWizardData({...wizardData, producto: {...wizardData.producto, code: e.target.value}})} />
                    <textarea rows="3" placeholder="Descripción del Producto (100%)" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.producto.name || ''} onChange={e => setWizardData({...wizardData, producto: {...wizardData.producto, name: e.target.value}})} />
                  </div>
                )}

                {wizardStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1e40af' }}>3. Actividad Operativa</h3>
                    <input placeholder="Código de Actividad" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.actividad.code || ''} onChange={e => setWizardData({...wizardData, actividad: {...wizardData.actividad, code: e.target.value}})} />
                    <textarea rows="3" placeholder="Descripción de la Actividad" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.actividad.name || ''} onChange={e => setWizardData({...wizardData, actividad: {...wizardData.actividad, name: e.target.value}})} />
                  </div>
                )}

                {wizardStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#1e40af' }}>4. Tarea de Cumplimiento Final</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                       <input placeholder="T-01" style={{ padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 900 }} value={wizardData.tarea.code || ''} onChange={e => setWizardData({...wizardData, tarea: {...wizardData.tarea, code: e.target.value}})} />
                       <input placeholder="Descripción de la Tarea" style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.tarea.name || ''} onChange={e => setWizardData({...wizardData, tarea: {...wizardData.tarea, name: e.target.value}})} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <select style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.tarea.user_id || ''} onChange={e => setWizardData({...wizardData, tarea: {...wizardData.tarea, user_id: e.target.value}})}>
                          <option value="">Responsable Ejecución...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.fullname}</option>)}
                       </select>
                       <select style={{ padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} value={wizardData.tarea.director_id || ''} onChange={e => setWizardData({...wizardData, tarea: {...wizardData.tarea, director_id: e.target.value}})}>
                          <option value="">Director Supervisor...</option>
                          {users.filter(u => u.role === 'Director').map(u => <option key={u.id} value={u.id}>{u.fullname}</option>)}
                       </select>
                    </div>
                  </div>
                )}
             </div>

             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => { if (wizardStep > 1) setWizardStep(wizardStep - 1); else setIsWizardOpen(false); }}>
                  {wizardStep === 1 ? 'Cancelar' : 'Anterior'}
                </button>
                <button className="btn-primary" onClick={() => { if (wizardStep < 4) setWizardStep(wizardStep + 1); else handleWizardSave(); }}>
                  {wizardStep === 4 ? 'Finalizar y Crear Estructura' : 'Siguiente'}
                </button>
             </div>
          </motion.div>
        </div>
      )}

      {/* Tracking Modal */}
      {isTrackingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '2rem' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '500px', padding: '2.5rem', background: 'white', borderRadius: '24px' }}>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Reportar Seguimiento (S{selectedWeekForTracking})</h2>
             <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{selectedTaskForTracking?.name}</p>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Avance Real {selectedTaskForTracking?.is_hitos_mode ? '(Hitos)' : '(%)'}</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 5" 
                    style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '2px solid #3b82f6', fontWeight: 900, fontSize: '1.2rem' }} 
                    value={trackingFormData.avance_real} 
                    onChange={e => setTrackingFormData({...trackingFormData, avance_real: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Observaciones / Comentarios</label>
                  <textarea 
                    rows="3" 
                    placeholder="Detalle el cumplimiento..." 
                    style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: '1px solid #cbd5e1' }} 
                    value={trackingFormData.observacion} 
                    onChange={e => setTrackingFormData({...trackingFormData, observacion: e.target.value})} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.5rem' }}>Evidencia (Archivo)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="file" id="trackUpload" style={{ display: 'none' }} onChange={e => setTrackingFormData({...trackingFormData, evidence_file: e.target.files[0], evidence_name: e.target.files[0].name})} />
                    <button onClick={() => document.getElementById('trackUpload').click()} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '2px dashed #3b82f6', background: '#eff6ff', color: '#3b82f6', fontWeight: 700, cursor: 'pointer' }}>
                      {trackingFormData.evidence_name || 'Subir Evidencia 📎'}
                    </button>
                    {trackingFormData.evidencia_url && (
                      <a href={`${API_URL}${trackingFormData.evidencia_url}`} target="_blank" rel="noreferrer" style={{ padding: '0.75rem', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
                         <FileText size={18} />
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button className="btn-secondary" onClick={() => setIsTrackingModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                  <button className="btn-primary" onClick={handleSaveTracking} style={{ flex: 1 }}>Guardar Reporte</button>
                </div>
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

export default Catalog;
