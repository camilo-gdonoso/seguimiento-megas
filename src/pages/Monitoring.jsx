import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, Calendar, CheckCircle2, AlertCircle, FileText, User, Plus, Info, Shield, MessageSquare, Check, XCircle, Paperclip, ClipboardCheck } from 'lucide-react';

const API_URL = '/api';

import * as XLSX from 'xlsx';

const Monitoring = ({ user }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMega, setSelectedMega] = useState('all');
  const [editingCell, setEditingCell] = useState(null); // { tareaId, semana }
  const [megasList, setMegasList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'actividad' });
  const [productos, setProductos] = useState([]);
  const [actividades, setActividades] = useState([]);
  
  // Custom Modals States
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [obsDialog, setObsDialog] = useState({ isOpen: false, tareaId: null, semana: null, text: '' });
  const [reportDialog, setReportDialog] = useState({ isOpen: false, tareaId: null, semana: null, progress: 0, evidence: '', obs: '', rowName: '' });

  const exportToExcel = () => {
    try {
      // 1. Prepare Data for Excel
      const excelData = filteredData.map(row => {
        const item = {
          'MeGA Cod': row.mega_code,
          'MeGA Nombre': row.mega_name,
          'Producto Intermedio': row.producto_name,
          'Actividad': row.actividad_name,
          'Tarea de Cumplimiento': row.name,
          'Peso (%)': parseFloat(row.ponderacion_producto || 0).toFixed(1),
          'F. Inicio': row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleDateString() : '',
          'F. Fin': row.fecha_fin ? new Date(row.fecha_fin).toLocaleDateString() : '',
          'Indicador': row.indicador || '',
          'Resultado Esperado': row.resultado_esperado || '',
          'POA': row.vinculada_poa || 'NO',
          'Responsable': row.responsable_nombre,
          'Cargo': row.responsable_cargo,
          'Avance Físico Actual (%)': parseFloat(row.avance_fisico || 0).toFixed(1),
          'Estado': row.estado_calculado
        };

        // Add weekly progress columns
        let parsedPlan = [];
        try { parsedPlan = typeof row.planograma === 'string' ? JSON.parse(row.planograma) : (row.planograma || []); } catch (e) {}
        
        parsedPlan.forEach(p => {
          const sem = p.periodo;
          const av = getAvanceData(row, sem);
          item[`Semana ${sem} (Real)`] = av.estado === 'Aprobado' ? `${av.avance}%` : (av.estado === 'Reportado' ? `${av.avance}% (Pend)` : '0%');
        });

        return item;
      });

      // 2. Create Workbook and Sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Formulario 1 - Seguimiento");

      // 3. Generate File
      XLSX.writeFile(workbook, `Formulario_1_Seguimiento_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Reporte Excel generado correctamente.', type: 'success' });
    } catch (err) {
      console.error('Excel Export Error:', err);
      setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo generar el Excel.', type: 'error' });
    }
  };

  useEffect(() => {
    if (alertDialog.isOpen) {
      const timer = setTimeout(() => setAlertDialog({ ...alertDialog, isOpen: false }), 3500);
      return () => clearTimeout(timer);
    }
  }, [alertDialog]);

  const fetchData = async () => {
    try {
      const resp = await axios.get(`${API_URL}/seguimiento/formulario1`, {
        params: { userId: user?.id, role: user?.role }
      });
      setData(resp.data || []);
      
      const mResp = await axios.get(`${API_URL}/megas`);
      setMegasList(mResp.data || []);
      
      const pResp = await axios.get(`${API_URL}/productos`);
      setProductos(pResp.data || []);

      const aResp = await axios.get(`${API_URL}/actividades`);
      setActividades(aResp.data || []);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAvance = async (tarea_id, semana, value, evidence = '', obs = '') => {
    try {
      const progress = parseFloat(value);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        setEditingCell(null);
        return;
      }
      
      await axios.post(`${API_URL}/avances-semanales`, {
        tarea_id,
        semana,
        avance_real: progress,
        evidencia_url: evidence,
        observacion: obs
      }, { headers: { 'x-user-id': user?.id } });
      
      fetchData();
      setEditingCell(null);
      setReportDialog({ ...reportDialog, isOpen: false });
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Reporte semanal guardado correctamente.', type: 'success' });
    } catch (err) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al asegurar el reporte semanal.', type: 'error' });
      setEditingCell(null);
    }
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    try {
      if (formData.type === 'actividad') {
        await axios.post(`${API_URL}/actividades`, formData, { headers: { 'x-user-id': user?.id } });
      } else {
        await axios.post(`${API_URL}/tareas`, formData, { headers: { 'x-user-id': user?.id } });
      }
      setIsModalOpen(false);
      fetchData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Registro guardado correctamente.', type: 'success' });
    } catch (err) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'Error al asegurar la información.', type: 'error' });
    }
  };

  const getAvanceData = (row, sem) => {
    if (!row.avances_historico) return { avance: 0, estado: 'Pendiente', id: null };
    const found = row.avances_historico.find(a => a.semana === sem);
    return found ? { ...found, avance: parseFloat(found.avance) } : { avance: 0, estado: 'Pendiente', id: null };
  };

  const getAvanceSemana = (row, sem) => getAvanceData(row, sem).avance;

  const getObsSemana = (row, sem) => {
    const data = getAvanceData(row, sem);
    return data.observacion || '';
  };

  const handleValidateAvance = async (avanceId, nuevoEstado) => {
     try {
       await axios.post(`${API_URL}/avances-semanales/validar`, { id: avanceId, estado: nuevoEstado });
       fetchData();
       setAlertDialog({ isOpen: true, title: 'Validación', message: `Avance ${nuevoEstado} correctamente.`, type: 'success' });
     } catch (err) {
       setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo validar.', type: 'error' });
     }
  };

  const handleSaveObs = async () => {
    try {
      await axios.post(`${API_URL}/avances-semanales`, {
        tarea_id: obsDialog.tareaId,
        semana: obsDialog.semana,
        avance_real: getAvanceSemana(data.find(r => r.id === obsDialog.tareaId), obsDialog.semana),
        observacion: obsDialog.text
      }, { headers: { 'x-user-id': user?.id } });
      
      setObsDialog({ ...obsDialog, isOpen: false });
      fetchData();
      setAlertDialog({ isOpen: true, title: 'Éxito', message: 'Observación guardada.', type: 'success' });
    } catch (err) {
      setAlertDialog({ isOpen: true, title: 'Error', message: 'No se pudo guardar.', type: 'error' });
    }
  };

  const filteredData = (data || []).filter(row => {
    const matchesSearch = (row.mega_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         row.producto_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         row.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMega = selectedMega === 'all' || row.mega_id?.toString() === selectedMega;
    return matchesSearch && matchesMega;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="animate-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#3b82f6', marginBottom: '1rem' }}></div>
      <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando Seguimiento de Actividades...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
            Seguimiento de <span style={{ color: '#2563eb' }}>Actividades</span>
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 500, maxWidth: '600px' }}>
            Panel de control avanzado para el monitoreo del cumplimiento de productos intermedios y MeGAs institucionales.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-primary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.6rem', 
              background: 'white', 
              color: '#2563eb', 
              border: '2px solid #2563eb',
              padding: '0.75rem 1.25rem',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)'
            }}
            onClick={exportToExcel}
          >
            <FileText size={20} /> Exportar Excel
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
            <input 
              type="text" 
              placeholder="Buscar por Tarea, MeGA o Producto..." 
              className="glass-card"
              style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem', background: 'white', transition: 'all 0.3s' }}
              value={searchTerm}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="glass-card"
            style={{ padding: '0 1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '1rem', width: '300px', background: 'white' }}
            value={selectedMega}
            onChange={(e) => setSelectedMega(e.target.value)}
          >
            <option value="all">Todos los MeGAs</option>
            {megasList.map(m => <option key={m.id} value={m.id}>{m.code}: {m.name?.substring(0, 40)}...</option>)}
          </select>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem', 
            padding: '1rem 1.5rem', 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
            borderRadius: '20px', 
            border: '1px solid #bae6fd',
            maxWidth: '450px'
          }}
        >
          <div style={{ background: '#3b82f6', padding: '0.5rem', borderRadius: '12px' }}>
            <Info size={20} style={{ color: 'white' }} />
          </div>
          <p style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
            <span style={{ fontWeight: 800 }}>Reporting:</span> Haz clic en los porcentajes <span style={{ color: '#10b981' }}>Debajo del Plan</span> para actualizar el avance de la tarea.
          </p>
        </motion.div>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '24px', background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '1.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>ESTRUCTURA ESTRATÉGICA (MeGA / Prod / Act / Tarea)</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>PESO</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>PERÍODO</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>AVANCE (PLAN Vs REAL)</th>
                <th style={{ textAlign: 'center', padding: '1.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800, minWidth: '120px' }}>PROGRESO</th>
                <th style={{ textAlign: 'left', padding: '1.5rem', color: '#475569', fontSize: '0.85rem', fontWeight: 800 }}>RESPONSABLE</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ opacity: 0.5, marginBottom: '1rem' }}>
                      <FileText size={48} style={{ margin: '0 auto' }} />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 500 }}>No se encontraron registros para mostrar.</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredData.map((row, idx) => (
                    <motion.tr 
                      key={row.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ delay: idx * 0.05 }}
                      style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfdfe' }}
                    >
                      <td style={{ padding: '1.5rem', maxWidth: '450px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem', background: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 800, whiteSpace: 'nowrap' }}>{row.mega_code || 'MeGA'}</span>
                            <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: 800, lineHeight: 1.2 }}>{row.mega_name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', marginBottom: '0.2rem', padding: '0.3rem 0.4rem', background: '#f8fafc', borderRadius: '6px', borderLeft: '2px solid #0ea5e9' }}>
                            <span style={{ fontSize: '0.65rem', color: '#0369a1', fontWeight: 800, whiteSpace: 'nowrap' }}>Prod:</span>
                            <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, lineHeight: 1.2 }}>{row.producto_name}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '0.2rem' }}>Act: {row.actividad_name}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{row.name}</span>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', alignItems: 'center' }}>
                            <span style={{ 
                              fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800,
                              background: row.estado_calculado === 'Terminado' ? '#dcfce7' : 
                                          row.estado_calculado === 'Retrasado' ? '#fee2e2' :
                                          row.estado_calculado === 'En Proceso' ? '#fef9c3' : '#f1f5f9',
                              color: row.estado_calculado === 'Terminado' ? '#166534' : 
                                     row.estado_calculado === 'Retrasado' ? '#991b1b' :
                                     row.estado_calculado === 'En Proceso' ? '#854d0e' : '#475569',
                              border: `1px solid ${
                                row.estado_calculado === 'Terminado' ? '#bbf7d0' : 
                                row.estado_calculado === 'Retrasado' ? '#fecaca' :
                                row.estado_calculado === 'En Proceso' ? '#fef08a' : '#e2e8f0'
                              }`
                            }}>
                              {row.estado_calculado}
                            </span>
                            <span title={row.medio_verificacion} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '6px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                              <FileText size={12} /> {row.medio_verificacion?.substring(0, 25) || 'S/M'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 900, color: '#1e293b', fontSize: '0.9rem' }}>
                        {parseFloat(row.ponderacion_producto || 0).toFixed(1)}%
                      </td>
                      <td style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                           <span style={{ color: '#059669' }}>{row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleDateString() : '--'}</span>
                           <span style={{ color: '#dc2626' }}>{row.fecha_fin ? new Date(row.fecha_fin).toLocaleDateString() : '--'}</span>
                        </div>
                      </td>
                      
                      <td style={{ textAlign: 'left', padding: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {(() => {
                            let parsedPlan = [];
                            try {
                              parsedPlan = typeof row.planograma === 'string' ? JSON.parse(row.planograma) : (row.planograma || []);
                            } catch (e) { parsedPlan = []; }
                            
                            if (parsedPlan.length === 0) return <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin planificación</span>;

                            return parsedPlan.map((p) => {
                              const sem = p.periodo; 
                              const avData = getAvanceData(row, sem);
                              const realAvance = avData.avance;
                              const planAvance = parseFloat(p.valor || 0);
                              
                              const canValidate = (user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('director')) && avData.id;
                              const isAuditor = user?.role?.toLowerCase().includes('auditor');
                              const statusColor = avData.estado === 'Aprobado' ? '#10b981' : (avData.estado === 'Rechazado' ? '#ef4444' : (avData.estado === 'Reportado' ? '#3b82f6' : '#94a3b8'));
                              const bgReal = avData.estado === 'Aprobado' ? '#dcfce7' : (avData.estado === 'Reportado' ? '#dbeafe' : (avData.estado === 'Rechazado' ? '#fee2e2' : (realAvance > 0 ? '#fef9c3' : '#f1f5f9')));
                              const colorReal = avData.estado === 'Aprobado' ? '#166534' : (avData.estado === 'Reportado' ? '#1e40af' : (avData.estado === 'Rechazado' ? '#991b1b' : (realAvance > 0 ? '#854d0e' : '#64748b')));

                              return (
                                <div key={sem} style={{ 
                                  minWidth: '95px', 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  alignItems: 'center', 
                                  padding: '0.6rem 0.4rem', 
                                  background: '#f8fafc',
                                  borderRadius: '12px',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#475569' }}>
                                      {row.tipo_avance === 'Diario' ? 'D' : 'S'}{sem}
                                    </span>
                                    {avData.id && (
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} title={avData.estado} />
                                    )}
                                  </div>
                                  
                                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>
                                    Plan: <span style={{ color: '#0f172a' }}>{planAvance}%</span>
                                  </div>

                                  {editingCell?.tareaId === row.id && editingCell?.semana === sem && !isAuditor ? (
                                    <input 
                                      autoFocus
                                      type="number" step="0.1"
                                      style={{ width: '55px', padding: '0.3rem', fontSize: '0.8rem', textAlign: 'center', borderRadius: '6px', border: '2px solid #3b82f6', outline: 'none', fontWeight: 800 }}
                                      defaultValue={realAvance}
                                      onBlur={(e) => handleUpdateAvance(row.id, sem, e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateAvance(row.id, sem, e.target.value)}
                                    />
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span 
                                          onClick={() => {
                                            if (!isAuditor && avData.estado !== 'Aprobado') {
                                              setReportDialog({
                                                isOpen: true,
                                                tareaId: row.id,
                                                semana: sem,
                                                progress: realAvance > 0 ? realAvance : planAvance,
                                                evidence: avData.evidencia || '',
                                                obs: avData.observacion || '',
                                                rowName: row.name
                                              });
                                            }
                                          }}
                                          onDoubleClick={() => !isAuditor && setEditingCell({ tareaId: row.id, semana: sem })}
                                          title={isAuditor ? "Solo lectura" : "Clic: Reportar Avance Completo | Doble Clic: Editar rápido"}
                                          style={{ 
                                            cursor: isAuditor ? 'default' : 'pointer', 
                                            fontSize: '0.85rem', 
                                            fontWeight: 800, 
                                            background: bgReal, 
                                            color: colorReal, 
                                            padding: '0.35rem 0.65rem', 
                                            borderRadius: '8px', 
                                            border: `1px solid ${colorReal}40`, 
                                            transition: 'all 0.2s',
                                            opacity: avData.estado === 'Aprobado' ? 0.7 : 1,
                                            userSelect: 'none',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                          }}
                                        >
                                          {realAvance}%
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <MessageSquare 
                                            size={11} 
                                            onClick={() => !isAuditor && setObsDialog({ isOpen: true, tareaId: row.id, semana: sem, text: avData.observacion || '' })}
                                            style={{ 
                                              cursor: isAuditor ? 'default' : 'pointer', 
                                              color: avData.observacion ? '#2563eb' : '#cbd5e1'
                                            }} 
                                            title={avData.observacion || 'Observaciones'}
                                          />
                                          <Paperclip 
                                            size={12} 
                                            style={{ 
                                              color: avData.evidencia ? '#2563eb' : '#cbd5e1', 
                                              cursor: 'pointer',
                                              background: avData.evidencia ? '#dbeafe' : 'transparent',
                                              padding: '2px',
                                              borderRadius: '4px'
                                            }}
                                            onClick={() => {
                                              if (avData.evidencia && (user?.role === 'Director' || user?.role === 'Admin' || user?.role === 'Auditor')) {
                                                window.open(avData.evidencia, '_blank');
                                              } else {
                                                const url = window.prompt("URL de Evidencia (Link a Reporte/Drive):", avData.evidencia || "");
                                                if (url !== null && !isAuditor) {
                                                   axios.post(`${API_URL}/avances-semanales`, {
                                                     tarea_id: row.id,
                                                     semana: sem,
                                                     avance_real: realAvance,
                                                     evidencia_url: url
                                                   }).then(() => fetchData());
                                                }
                                              }
                                            }}
                                            title={avData.evidencia ? "Ver Evidencia" : "Subir Evidencia"}
                                          />
                                        </div>
                                      </div>

                                      {canValidate && avData.estado === 'Reportado' && (
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                          <button 
                                            onClick={() => handleValidateAvance(avData.id, 'Aprobado')}
                                            style={{ padding: '4px 6px', borderRadius: '8px', background: '#dcfce7', color: '#166534', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 800 }}
                                            title="Aprobar cumplimiento"
                                          >
                                            <Check size={12} /> OK
                                          </button>
                                          <button 
                                            onClick={() => handleValidateAvance(avData.id, 'Rechazado')}
                                            style={{ padding: '4px 6px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', fontWeight: 800 }}
                                            title="Rechazar y pedir corrección"
                                          >
                                            <XCircle size={12} /> NO
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ width: '100px', margin: '0 auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}>
                              {row.ponderacion_producto ? ((parseFloat(row.avance_fisico || 0) / parseFloat(row.ponderacion_producto)) * 100).toFixed(1) : 0}%
                            </span>
                          </div>
                          <div style={{ height: '8px', width: '100%', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${Math.min(100, row.ponderacion_producto ? ((parseFloat(row.avance_fisico || 0) / parseFloat(row.ponderacion_producto)) * 100) : 0)}%` }} 
                              style={{ 
                                height: '100%', 
                                background: parseFloat(row.avance_fisico || 0) >= parseFloat(row.ponderacion_producto || 100)
                                  ? 'linear-gradient(90deg, #10b981, #34d399)' 
                                  : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                borderRadius: '10px'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '40px', height: '40px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', border: '1px solid #dbeafe' }}>
                            <User size={20} />
                          </div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>{row.responsable_nombre || 'Sin asignar'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.responsable_cargo}</div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Integrated Report Modal */}
      {reportDialog.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', padding: '0.8rem', borderRadius: '16px', color: 'white' }}>
                <ClipboardCheck size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>Reportar Avance Semanal</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.3rem' }}>{reportDialog.rowName}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#1e293b' }}>
                    <CheckCircle2 size={16} /> Avance (%)
                  </label>
                  <input 
                    type="number" step="0.1"
                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 800, fontSize: '1.1rem' }}
                    value={reportDialog.progress}
                    onChange={(e) => setReportDialog({...reportDialog, progress: e.target.value})}
                  />
                </div>
                <div>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#1e293b' }}>
                    <Calendar size={16} /> Período
                  </label>
                  <div style={{ padding: '1rem', borderRadius: '16px', background: '#f1f5f9', color: '#475569', fontWeight: 800, textAlign: 'center' }}>
                    Semana {reportDialog.semana}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#1e293b' }}>
                  <Paperclip size={16} /> Enlace de Evidencia (Link)
                </label>
                <input 
                  type="text"
                  placeholder="https://drive.google.com/..."
                  style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: reportDialog.evidence ? '#f0f9ff' : '#f8fafc' }}
                  value={reportDialog.evidence}
                  onChange={(e) => setReportDialog({...reportDialog, evidence: e.target.value})}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem', color: '#1e293b' }}>
                  <MessageSquare size={16} /> Justificación / Observación
                </label>
                <textarea 
                  rows="3"
                  placeholder="Explica brevemente este avance..."
                  style={{ width: '100%', padding: '1rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc', resize: 'none' }}
                  value={reportDialog.obs}
                  onChange={(e) => setReportDialog({...reportDialog, obs: e.target.value})}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem' }}>
              <button 
                onClick={() => setReportDialog({ ...reportDialog, isOpen: false })} 
                style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: '#f1f5f9', color: '#475569', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleUpdateAvance(reportDialog.tareaId, reportDialog.semana, reportDialog.progress, reportDialog.evidence, reportDialog.obs)} 
                style={{ flex: 1, padding: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)' }}
              >
                Guardar Reporte
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
            {alertDialog.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
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

export default Monitoring;
