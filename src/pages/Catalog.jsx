import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Database, ChevronRight, Edit2, Trash2, Layers, Building, Search, ClipboardCheck, Shield, LayoutGrid, FileText } from 'lucide-react';
import axios from 'axios';
import HierarchyTree from '../components/HierarchyTree';

const API_URL = '/api';

import * as XLSX from 'xlsx';

const Catalog = ({ user }) => {
  const [activeTab, setActiveTab] = useState('megas');
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

  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const exportFormularioA = async () => {
    try {
      setLoading(true);
      const resp = await axios.get(`${API_URL}/formulario-a-trimestral?year=${exportYear}`);
      const rows = resp.data;

      if (!rows || rows.length === 0) {
        setAlertDialog({ isOpen: true, title: 'Sin datos', message: 'No hay tareas registradas para exportar.', type: 'error' });
        setLoading(false);
        return;
      }

      // ── Group rows by Producto for aggregation ──────────────────────
      const byProducto = {};
      rows.forEach(r => {
        const key = r.producto_id;
        if (!byProducto[key]) {
          byProducto[key] = {
            eje_code: r.eje_code || '',
            eje_desc: r.eje_desc || '',
            resultado_code: r.resultado_code || '',
            resultado_desc: r.resultado_desc || '',
            estrategia_code: r.estrategia_code || '',
            mega_code: r.mega_code || '',
            mega_name: r.mega_name || '',
            unidad: r.unidad_name || '',
            producto_name: r.producto_name || '',
            ponderacion: parseFloat(r.ponderacion_total || 0),
            avance_total: parseFloat(r.producto_avance || 0),
            q1: 0, q2: 0, q3: 0, q4: 0,
            tareas: []
          };
        }
        byProducto[key].q1 += parseFloat(r.q1 || 0);
        byProducto[key].q2 += parseFloat(r.q2 || 0);
        byProducto[key].q3 += parseFloat(r.q3 || 0);
        byProducto[key].q4 += parseFloat(r.q4 || 0);
        byProducto[key].tareas.push(r.tarea_name);
      });

      const workbook = XLSX.utils.book_new();

      // ── HOJA 1: Formulario A — Vista por Producto (trimestral) ───────
      const headerRow = [
        'Eje Desarrollo',
        'Código Eje',
        'Resultado Agenda 50/50',
        'Código Resultado',
        'Estrategia N°',
        'MeGA (Meta al 2030)',
        'Unidad Responsable',
        `Producto Intermedio al ${exportYear}`,
        'Ponderación (%)',
        'Avance Total Aprobado (%)',
        `1er Trimestre (Ene-Mar ${exportYear}) %`,
        `2do Trimestre (Abr-Jun ${exportYear}) %`,
        `3er Trimestre (Jul-Sep ${exportYear}) %`,
        `4to Trimestre (Oct-Dic ${exportYear}) %`,
        'Productos Relevantes Logrados'
      ];

      const dataRows = Object.values(byProducto).map(p => [
        p.eje_desc,
        p.eje_code,
        p.resultado_desc,
        p.resultado_code,
        p.estrategia_code,
        p.mega_name,
        p.unidad,
        p.producto_name,
        p.ponderacion.toFixed(1),
        p.avance_total.toFixed(1),
        p.q1.toFixed(1),
        p.q2.toFixed(1),
        p.q3.toFixed(1),
        p.q4.toFixed(1),
        p.avance_total >= p.ponderacion ? p.producto_name : ''
      ]);

      const wsFormA = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

      // Column widths
      wsFormA['!cols'] = [
        { wch: 40 }, { wch: 10 }, { wch: 45 }, { wch: 12 }, { wch: 12 },
        { wch: 50 }, { wch: 30 }, { wch: 50 }, { wch: 12 }, { wch: 16 },
        { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 55 }
      ];

      XLSX.utils.book_append_sheet(workbook, wsFormA, `Form A ${exportYear}`);

      // ── HOJA 2: Detalle por Tarea ────────────────────────────────────
      const taskHeader = [
        'Eje', 'Resultado', 'Estrategia', 'MeGA', 'Unidad',
        'Producto Intermedio', 'Tarea de Cumplimiento',
        'Peso Tarea (%)', 'Responsable',
        `Q1 (Ene-Mar) %`, `Q2 (Abr-Jun) %`,
        `Q3 (Jul-Sep) %`, `Q4 (Oct-Dic) %`,
        'Avance Real Aprobado (%)'
      ];

      const taskRows = rows.map(r => [
        r.eje_code || '',
        r.resultado_code || '',
        r.estrategia_code || '',
        r.mega_name || '',
        r.unidad_name || '',
        r.producto_name || '',
        r.tarea_name || '',
        parseFloat(r.ponderacion_producto || 0).toFixed(1),
        r.responsable_nombre || '',
        parseFloat(r.q1 || 0).toFixed(1),
        parseFloat(r.q2 || 0).toFixed(1),
        parseFloat(r.q3 || 0).toFixed(1),
        parseFloat(r.q4 || 0).toFixed(1),
        parseFloat(r.tarea_avance || 0).toFixed(1)
      ]);

      const wsDetalle = XLSX.utils.aoa_to_sheet([taskHeader, ...taskRows]);
      wsDetalle['!cols'] = Array(14).fill({ wch: 25 });
      XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle por Tarea');

      XLSX.writeFile(workbook, `FormularioA_Trimestral_${exportYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setAlertDialog({ isOpen: true, title: 'Éxito', message: `Formulario A ${exportYear} exportado correctamente (2 hojas).`, type: 'success' });
    } catch (err) {
      console.error('Export Error:', err);
      setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo generar el Formulario A.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
    { id: 'tareas', label: 'Tareas', icon: ClipboardCheck, group: 'Operativo' },
    { id: 'organigrama', label: 'Estructura', icon: Building, group: 'Base' },
    { id: 'ejes', label: 'Ejes', icon: Database, group: 'Base' },
    { id: 'resultados', label: 'Resultados', icon: Layers, group: 'Base' },
    { id: 'estrategias', label: 'Estrategias', icon: Layers, group: 'Base' },
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
  };

  const endpointMap = {
    'megas': 'megas_detail',
    'productos': 'productos_detail',
    'actividades': 'actividades_detail',
    'tareas': 'tareas_detail',
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
      setUnits(uRes.data);
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
      setFormData({ ...item });
    } else {
      setEditingId(null);
      setFormData({});
    }
    setError(null);
    setIsModalOpen(true);
  };

  const generatePlanograma = (overrideData = null) => {
    const contextData = overrideData || formData;
    if (!contextData.fecha_inicio || !contextData.fecha_fin || !contextData.ponderacion_producto) {
      if (!overrideData) setAlertDialog({ isOpen: true, type: 'error', message: 'Para autocalcular el cronograma, primero defina Fecha Inicio, Fecha Fin y Peso %.' });
      return;
    }
    const s = new Date(contextData.fecha_inicio);
    const e = new Date(contextData.fecha_fin);
    if (e < s) {
      if (!overrideData) setAlertDialog({ isOpen: true, type: 'error', message: 'La Fecha Fin debe ser posterior a la Fecha de Inicio.' });
      return;
    }
    
    let periods = 0;
    const tipo = contextData.tipo_avance || 'Semanal';
    
    if (tipo === 'Semanal') {
      const diffTime = Math.abs(e - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      periods = Math.max(1, Math.ceil(diffDays / 7));
    } else {
      let cur = new Date(s);
      while (cur <= e) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) periods++; 
        cur.setDate(cur.getDate() + 1);
      }
      periods = Math.max(1, periods);
    }
    
    const pesoTotal = parseFloat(contextData.ponderacion_producto);
    const split = parseFloat((pesoTotal / periods).toFixed(2));
    
    const newPlan = [];
    let sum = 0;
    for (let i = 1; i <= periods; i++) {
        if (i === periods) {
            newPlan.push({ periodo: i, valor: parseFloat((pesoTotal - sum).toFixed(2)) });
        } else {
            newPlan.push({ periodo: i, valor: split });
            sum += split;
        }
    }
    setFormData({ ...contextData, planograma: newPlan, tipo_avance: tipo });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (activeTab === 'tareas' && formData.planograma && formData.planograma.length > 0) {
        const sum = formData.planograma.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
        if (Math.abs(sum - parseFloat(formData.ponderacion_producto)) > 0.05) {
            setError(`La suma del Cronograma (${sum.toFixed(2)}%) no coincide con el Peso de la Tarea (${formData.ponderacion_producto}%).`);
            return;
        }
      }
      const resource = resourceMap[activeTab];
      if (editingId) {
        await axios.put(`${API_URL}/${resource}/${editingId}`, formData);
      } else {
        await axios.post(`${API_URL}/${resource}`, formData);
      }
      setIsModalOpen(false);
      fetchData();
      fetchSupportData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Registro guardado correctamente.', type: 'success' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el registro');
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
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(searchLower);
    const descMatch = item.description?.toLowerCase().includes(searchLower);
    const codeMatch = item.code?.toLowerCase().includes(searchLower);
    return nameMatch || descMatch || codeMatch;
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="hero-title">Configuración Estratégica</h1>
          <p style={{ color: '#64748b' }}>Módulo 1: Parametrización y Catálogo Institucional</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: 'white' }}>
            <select
              value={exportYear}
              onChange={e => setExportYear(Number(e.target.value))}
              style={{ padding: '0.6rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.9rem', fontWeight: 700, color: '#475569', background: 'transparent', borderRight: '1px solid #e2e8f0' }}
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
              onClick={exportFormularioA}
            >
              <FileText size={16} /> Formulario A Trimestral
            </button>
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
          {isAdmin && (
            <button 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onClick={() => handleOpenModal()}
            >
              <Plus size={18} /> Nuevo Registro
            </button>
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
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Descripción / Nombre</th>
                {activeTab === 'resultados' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Eje</th>}
                {activeTab === 'estrategias' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Resultado</th>}
                {activeTab === 'megas' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Estrategia</th>}
                {activeTab === 'productos' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>MeGA</th>}
                {activeTab === 'actividades' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Producto</th>}
                {activeTab === 'tareas' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Actividad</th>}
                {activeTab === 'megas' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Productos Intermedios</th>}
                {activeTab === 'productos' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Peso %</th>}
                {activeTab === 'tareas' && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Peso %</th>}
                {isAdmin && <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando catálogo...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No hay registros cargados</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No se encontraron coincidencias para '{searchTerm}'</td></tr>
              ) : filteredData.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {item.code && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, marginBottom: '2px' }}>{item.code}</span>}
                      {item.description || item.name}
                      {activeTab === 'megas' && <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>Unidad: {item.unit_name || 'N/A'}</div>}
                      {activeTab === 'tareas' && <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>Resp: {item.responsable_nombre || 'N/A'}</div>}
                    </div>
                  </td>
                  {activeTab === 'resultados' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ background: '#fef3c7', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, color: '#92400e' }}>
                        {ejes.find(e => Number(e.id) === Number(item.eje_id))?.code || '---'}
                      </span>
                    </td>
                  )}
                   {activeTab === 'estrategias' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span style={{ background: '#e0f2fe', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 700, color: '#0369a1' }}>
                        {resultados.find(r => Number(r.id) === Number(item.resultado_id))?.code || '---'}
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
                  {activeTab === 'tareas' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                       {item.actividad_name || '---'}
                    </td>
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
                  {activeTab === 'tareas' && (
                    <td style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                      {parseFloat(item.ponderacion_producto || 0).toFixed(1)}%
                    </td>
                  )}
                  {isAdmin && (
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '550px', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800 }}>{editingId ? 'Editar' : 'Nuevo'} {activeTab.toUpperCase()}</h2>
            
            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Código / Identificador</label>
                  <input 
                    type="text" required minLength="2"
                    placeholder="Ej: Eje 1, R6, E46, M1, ACT-01, T-55..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                    value={formData.code || ''} 
                    onChange={e => setFormData({...formData, code: e.target.value})} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Descripción / Nombre Detallado</label>
                  <textarea 
                    required rows="3"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }}
                    value={formData.description || formData.name || ''} 
                    onChange={e => setFormData({...formData, [['megas', 'productos', 'actividades', 'tareas'].includes(activeTab) ? 'name' : 'description']: e.target.value})}
                  ></textarea>
                </div>

                {activeTab === 'resultados' && (
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Vincular a Eje</label>
                     <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.eje_id || ''} onChange={e => setFormData({...formData, eje_id: e.target.value})}>
                       <option value="">Seleccionar Eje...</option>
                       {ejes.map(e => <option key={e.id} value={e.id}>{e.code} - {e.description}</option>)}
                     </select>
                   </div>
                )}

                {activeTab === 'estrategias' && (
                   <div>
                     <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Vincular a Resultado</label>
                     <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.resultado_id || ''} onChange={e => setFormData({...formData, resultado_id: e.target.value})}>
                       <option value="">Seleccionar Resultado...</option>
                       {resultados.map(r => <option key={r.id} value={r.id}>{r.code} - {r.description}</option>)}
                     </select>
                   </div>
                )}

                {activeTab === 'megas' && (
                   <>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Estrategia</label>
                         <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.estrategia_id || ''} onChange={e => setFormData({...formData, estrategia_id: e.target.value})}>
                           <option value="">Estrategia...</option>
                           {estrategias.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                         </select>
                       </div>
                       <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Unidad Responsable</label>
                         <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.unit_id || ''} onChange={e => setFormData({...formData, unit_id: e.target.value})}>
                           <option value="">Unidad...</option>
                           {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                         </select>
                       </div>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                       <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Fecha de Inicio (MeGA)</label>
                         <input type="date" required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} value={formData.fecha_inicio ? formData.fecha_inicio.split('T')[0] : ''} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} />
                       </div>
                       <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Fecha de Fin (MeGA)</label>
                         <input type="date" required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} value={formData.fecha_fin ? formData.fecha_fin.split('T')[0] : ''} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} />
                       </div>
                     </div>
                   </>
                )}

                {activeTab === 'productos' && (
                   <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                     <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>MeGA (Metas 2030)</label>
                       <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.mega_id || ''} onChange={e => setFormData({...formData, mega_id: e.target.value})}>
                         <option value="">Seleccionar MeGA...</option>
                         {megas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                     </div>
                     <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Peso %</label>
                       <input 
                         type="number" step="0.1" required 
                         style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                         value={formData.ponderacion_total || ''} 
                         onChange={e => setFormData({...formData, ponderacion_total: e.target.value})} 
                       />
                     </div>
                   </div>
                )}

                {activeTab === 'actividades' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Producto Intermedio</label>
                    <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.producto_id || ''} onChange={e => setFormData({...formData, producto_id: e.target.value})}>
                      <option value="">Seleccionar Producto...</option>
                      {productos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {activeTab === 'tareas' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Actividad Padre</label>
                      <select required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={formData.actividad_id || ''} onChange={e => setFormData({...formData, actividad_id: e.target.value})}>
                        <option value="">Seleccionar Actividad...</option>
                        {actividades.map(a => (
                          <option key={a.id} value={a.id}>
                            MeGA: {a.mega_name?.substring(0,30)}... / Prod: {a.producto_name?.substring(0,30)}... / Act: {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Peso % (0-100)</label>
                      <input 
                        type="number" step="0.1" min="0.1" max="100" required 
                        placeholder="Ej. 20.5"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                        value={formData.ponderacion_producto || ''} 
                        onChange={e => {
                          let val = parseFloat(e.target.value);
                          if (val > 100) val = 100;
                          const nd = {...formData, ponderacion_producto: val || 0};
                          if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                        }} 
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Fecha Inicio</label>
                        <input 
                          type="date" required
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                          value={formData.fecha_inicio ? formData.fecha_inicio.split('T')[0] : ''} 
                          onChange={e => {
                            const nd = {...formData, fecha_inicio: e.target.value};
                            if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Fecha Fin</label>
                        <input 
                          type="date" required
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                          value={formData.fecha_fin ? formData.fecha_fin.split('T')[0] : ''} 
                          onChange={e => {
                            const nd = {...formData, fecha_fin: e.target.value};
                            if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                          }} 
                        />
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Tipo de Avance</label>
                        <select 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          value={formData.tipo_avance || 'Semanal'} 
                          onChange={e => {
                            const nd = {...formData, tipo_avance: e.target.value};
                            if (formData.planograma) generatePlanograma(nd); else setFormData(nd);
                          }}
                        >
                          <option value="Semanal">Semanal</option>
                          <option value="Diario">Diario</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Medio de Verificación</label>
                        <input 
                          type="text" 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                          value={formData.medio_verificacion || ''} 
                          onChange={e => setFormData({...formData, medio_verificacion: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                      <button type="button" onClick={() => generatePlanograma()} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <LayoutGrid size={16} /> Auto-Calcular Cuadrícula de Planificación
                      </button>
                    </div>

                    {formData.planograma && formData.planograma.length > 0 && (
                      <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Distribución Planificada ({formData.tipo_avance || 'Semanal'})</h4>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, background: 'white', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            Peso Tarea: {formData.ponderacion_producto}% | Suma Asignada: <span style={{ color: Math.abs(formData.planograma.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0) - parseFloat(formData.ponderacion_producto)) > 0.05 ? '#ef4444' : '#10b981' }}>{formData.planograma.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0).toFixed(2)}%</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                          {formData.planograma.map((p, idx) => (
                            <div key={idx} style={{ minWidth: '70px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                                {formData.tipo_avance === 'Diario' ? 'Día ' : 'Sem '}{p.periodo}
                              </span>
                              <input 
                                type="number" step="0.1"
                                value={p.valor}
                                onChange={e => {
                                  const newPlan = [...formData.planograma];
                                  newPlan[idx].valor = parseFloat(e.target.value) || 0;
                                  setFormData({ ...formData, planograma: newPlan });
                                }}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center', outline: 'none', fontWeight: 800, color: '#0f172a' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Técnico Asignado</label>
                        <select 
                          required 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={formData.user_id || ''} 
                          onChange={e => setFormData({...formData, user_id: e.target.value})}
                        >
                          <option value="">Seleccionar Técnico...</option>
                          {availableTechnicians.map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.role})</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Director Asignado</label>
                        <select 
                          required 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                          value={formData.director_id || ''} 
                          onChange={e => {
                            const val = e.target.value;
                            const selected = availableDirectors.find(u => u.id == val);
                            if (selected) {
                              setFormData({
                                ...formData, 
                                director_id: val,
                                responsable_nombre: selected.fullname,
                                responsable_cargo: selected.role
                              });
                            } else {
                              setFormData({ ...formData, director_id: val });
                            }
                          }}>
                          <option value="">Seleccionar Director...</option>
                          {availableDirectors.map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.role})</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Responsable (Nombre Firma)</label>
                      <input 
                        type="text" required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                        value={formData.responsable_nombre || ''} 
                        onChange={e => setFormData({...formData, responsable_nombre: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Cargo</label>
                      <input 
                        type="text"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                        value={formData.responsable_cargo || ''} 
                        onChange={e => setFormData({...formData, responsable_cargo: e.target.value})} 
                      />
                    </div>
                    {/* New fields from Kallpatech Doc */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Indicador de Cumplimiento</label>
                      <textarea 
                        rows="2"
                        placeholder="Ej: Número de informes emitidos, Porcentaje de avance..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }}
                        value={formData.indicador || ''} 
                        onChange={e => setFormData({...formData, indicador: e.target.value})} 
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>Resultado Esperado</label>
                      <textarea 
                        rows="2"
                        placeholder="Descripción del resultado al concluir la tarea..."
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', resize: 'none' }}
                        value={formData.resultado_esperado || ''} 
                        onChange={e => setFormData({...formData, resultado_esperado: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 700, color: '#475569' }}>¿Vinculada al POA?</label>
                      <select 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }} 
                        value={formData.vinculada_poa || 'NO'} 
                        onChange={e => setFormData({...formData, vinculada_poa: e.target.value})}
                      >
                        <option value="SI">SÍ</option>
                        <option value="NO">NO</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#f1f5f9', border: 'none', fontWeight: 600, color: '#64748b' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '10px' }}>Guardar Cambios</button>
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

export default Catalog;
