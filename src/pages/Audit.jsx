import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Search, History, Eye, User, Calendar, Activity } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = '/api';

const Audit = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterUser, setFilterUser] = useState('');
  const [filterTable, setFilterTable] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const config = { headers: { 'x-user-id': user?.id } };
      const response = await axios.get(`${API_URL}/auditoria`, config);
      setLogs(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLogs = () => {
    try {
      const data = filteredLogs.map(log => ({
        'ID Evento': log.id,
        'Fecha y Hora': new Date(log.created_at).toLocaleString(),
        'Usuario': log.user_name || 'Sistema',
        'Acción': log.action,
        'Tabla/Módulo': log.table_name,
        'Registro ID': log.record_id,
        'Valor Anterior': JSON.stringify(log.old_value),
        'Valor Nuevo': JSON.stringify(log.new_value)
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");

      // Column widths
      worksheet['!cols'] = [
        { wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, 
        { wch: 20 }, { wch: 12 }, { wch: 50 }, { wch: 50 }
      ];

      XLSX.writeFile(workbook, `Log_Auditoria_MeGAs_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error('Export Error:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
      const matchUser = log.user_name?.toLowerCase().includes(filterUser.toLowerCase()) || 
                       log.user_id?.toString().includes(filterUser);
      const matchTable = filterTable === 'all' || log.table_name === filterTable;
      const matchAction = filterAction === 'all' || log.action === filterAction;
      return matchUser && matchTable && matchAction;
  });

  const getTables = () => [...new Set(logs.map(l => l.table_name))];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="hero-title">Auditoría e Historial</h1>
          <p style={{ color: '#64748b' }}>Trazabilidad completa de modificaciones en el reporte MeGAs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button 
             onClick={fetchLogs} 
             style={{ 
               padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', 
               background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
             }}
           >
              <History size={18} /> Refrescar
           </button>
           <button 
             onClick={exportAuditLogs}
             className="btn-primary"
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px' }}
           >
              <Activity size={18} /> Exportar Log de Auditoría
           </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
         <div style={{ flex: 1, position: 'relative' }}>
           <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
           <input 
             type="text" placeholder="Buscar por usuario..." 
             style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none' }}
             value={filterUser} onChange={e => setFilterUser(e.target.value)}
           />
         </div>
         <select 
           style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', background: 'white' }}
           value={filterTable} onChange={e => setFilterTable(e.target.value)}
         >
           <option value="all">Todas las tablas</option>
           {getTables().map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
         </select>
         <select 
           style={{ padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', background: 'white' }}
           value={filterAction} onChange={e => setFilterAction(e.target.value)}
         >
           <option value="all">Cualquier acción</option>
           <option value="CREATE">CREAR (INSERT)</option>
           <option value="UPDATE">EDITAR (UPDATE)</option>
           <option value="DELETE">ELIMINAR (DELETE)</option>
           <option value="AVANCE_RELEVAMIENTO">RELEVAMIENTO</option>
           <option value="AVANCE_VALIDACION">VALIDACIÓN</option>
         </select>
         <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
            Mostrando {filteredLogs.length} eventos
         </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Fecha y Hora</th>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Usuario / Responsable</th>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Acción</th>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Módulo / Tabla</th>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Ref. ID</th>
              <th style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Detalles de Cambio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center' }}>Cargando logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No se han encontrado registros de auditoría con estos filtros</td></tr>
            ) : filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                <td style={{ padding: '1.25rem', fontSize: '0.85rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Calendar size={14} color="#64748b" /> {new Date(log.created_at).toLocaleString()}
                   </div>
                </td>
                <td style={{ padding: '1.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <User size={14} color="#2563eb" /> {log.user_name || 'Sistema (Automático)'}
                   </div>
                </td>
                <td style={{ padding: '1.25rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 900,
                    background: log.action === 'CREATE' ? '#dcfce7' : log.action === 'UPDATE' ? '#fef9c3' : '#fee2e2',
                    color: log.action === 'CREATE' ? '#166534' : log.action === 'UPDATE' ? '#854d0e' : '#991b1b',
                    border: `1px solid ${log.action === 'CREATE' ? '#bbf7d0' : log.action === 'UPDATE' ? '#fef08a' : '#fecaca'}`
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '1.25rem', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                  <span style={{ background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{log.table_name}</span>
                </td>
                <td style={{ padding: '1.25rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>#{log.record_id}</td>
                <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                  <button 
                    style={{ padding: '0.5rem', borderRadius: '10px', background: '#f1f5f9', color: '#2563eb', border: 'none', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
         <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '800px', padding: '2.5rem', background: 'white' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Detalle de Auditoría #{selectedLog.id}</h2>
                   <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Registro de cambios realizado en la tabla <strong>{selectedLog.table_name}</strong></p>
                </div>
                <button onClick={() => setSelectedLog(null)} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div>
                   <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Valor Anterior</h4>
                   <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '200px', maxHeight: '400px', overflow: 'auto' }}>
                      {selectedLog.old_value ? (
                        <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                           {JSON.stringify(selectedLog.old_value, null, 2)}
                        </pre>
                      ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No existe valor previo (Creación)</span>}
                   </div>
                </div>
                <div>
                   <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Valor Nuevo / Actual</h4>
                   <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #dbeafe', minHeight: '200px', maxHeight: '400px', overflow: 'auto' }}>
                      {selectedLog.new_value ? (
                        <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                           {JSON.stringify(selectedLog.new_value, null, 2)}
                        </pre>
                      ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Registro eliminado</span>}
                   </div>
                </div>
             </div>

             <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                   onClick={() => setSelectedLog(null)} 
                   className="btn-primary" 
                   style={{ padding: '0.75rem 2rem', borderRadius: '12px' }}
                >
                   Cerrar Detalle
                </button>
             </div>
           </motion.div>
         </div>
      )}
    </motion.div>
  );
};

export default Audit;
