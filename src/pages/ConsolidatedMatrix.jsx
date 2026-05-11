
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, Printer, Download } from 'lucide-react';
import axios from 'axios';
import { groupTasksByUser } from '../utils/matrix';

const API_URL = '/api';

const ConsolidatedMatrix = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [averages, setAverages] = useState({ poa: 0, noPoa: 0 });

  useEffect(() => {
    fetchData();
    fetchUnits();
  }, [selectedUnit]);

  const fetchUnits = async () => {
    try {
      const res = await axios.get(`${API_URL}/unidades`);
      setUnits(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/tareas_detail`);
      let tasks = res.data;
      
      // Filter by unit if selected
      if (selectedUnit !== 'all') {
        tasks = tasks.filter(t => t.unit_id?.toString() === selectedUnit);
      }
      
      const grouped = groupTasksByUser(tasks);
      setData(grouped);

      // Calculate global averages for this view
      const poaTasks = tasks.filter(t => t.vinculada_poa === 'SI');
      const noPoaTasks = tasks.filter(t => t.vinculada_poa !== 'SI');
      
      const calcAvg = (ts) => ts.length > 0 ? (ts.reduce((acc, t) => acc + (parseFloat(t.avance_fisico) || 0), 0) / ts.length) : 0;
      
      setAverages({
        poa: calcAvg(poaTasks).toFixed(1),
        noPoa: calcAvg(noPoaTasks).toFixed(1)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRowSpans = (tasks) => {
    const spans = { mega: {}, producto: {}, actividad: {} };
    tasks.forEach((t, i) => {
      // Logic for spans (similar to Catalog.jsx)
      // This is a simplified version for the report view
    });
    return spans;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="hero-title">Matriz Consolidada de Seguimiento</h1>
          <p style={{ color: '#64748b' }}>Vista integral de planificación y cumplimiento por funcionario/unidad</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <select 
             style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700 }}
             value={selectedUnit}
             onChange={e => setSelectedUnit(e.target.value)}
           >
             <option value="all">Todas las Direcciones / Unidades</option>
             {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
           </select>
           <button className="btn-secondary" onClick={() => window.print()}><Printer size={18} /> Imprimir Reporte</button>
        </div>
      </header>

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '6px solid #3b82f6', background: 'white' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avance Global Actividades POA</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{averages.poa}%</h2>
              <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${averages.poa}%`, height: '100%', background: '#3b82f6' }} />
              </div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '6px solid #8b5cf6', background: 'white' }}>
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Avance Global Actividades No Planificadas</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{averages.noPoa}%</h2>
              <div style={{ flex: 1, height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${averages.noPoa}%`, height: '100%', background: '#8b5cf6' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>Generando matriz...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {data.map((user, uIdx) => (
            <div key={uIdx} style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
              <div style={{ background: '#f8fafc', padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: '#3b82f6', color: 'white', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>Funcionario</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>{user.info.name}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Cargo</div>
                    <div style={{ fontWeight: 600 }}>{user.info.cargo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Unidad</div>
                    <div style={{ fontWeight: 600 }}>{user.info.unidad}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem' }}>
                <SectionTitle title="Actividades Planificadas (POA)" color="#3b82f6" tasks={user.planificadas} />
                <MatrixTable tasks={user.planificadas} />
                
                <div style={{ marginTop: '2.5rem' }}>
                  <SectionTitle title="Actividades No Planificadas / Aisladas" color="#8b5cf6" tasks={user.noPlanificadas} />
                  <MatrixTable tasks={user.noPlanificadas} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const SectionTitle = ({ title, color, tasks }) => {
  const avg = tasks.length > 0 ? (tasks.reduce((acc, t) => acc + (parseFloat(t.avance_fisico) || 0), 0) / tasks.length).toFixed(1) : '0.0';
  
  return (
    <div style={{ 
      padding: '0.75rem 1.5rem', background: color, color: 'white', 
      fontWeight: 900, fontSize: '0.9rem', borderRadius: '12px', marginBottom: '1rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
    }}>
      <span>{title}</span>
      <span style={{ background: 'rgba(0,0,0,0.1)', padding: '0.2rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
        Avance Promedio: {avg}%
      </span>
    </div>
  );
};

const MatrixTable = ({ tasks }) => {
  if (tasks.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Sin registros en esta categoría</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
      <thead>
        <tr style={{ background: '#f1f5f9', fontSize: '0.7rem', color: '#475569', textAlign: 'left' }}>
          <th style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>RESULTADOS (MeGAs)</th>
          <th style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>PRODUCTOS INTERMEDIOS</th>
          <th style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>ACTIVIDADES</th>
          <th style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>TAREAS DE CUMPLIMIENTO</th>
          <th style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>SEGUIMIENTO</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t, i) => (
          <tr key={i} style={{ fontSize: '0.8rem' }}>
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', verticalAlign: 'top', width: '20%' }}>{t.mega_name || 'Aislado'}</td>
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', verticalAlign: 'top', width: '20%' }}>{t.producto_name || '---'}</td>
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', verticalAlign: 'top', width: '20%' }}>{t.actividad_name || '---'}</td>
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', verticalAlign: 'top' }}>
               <div style={{ fontWeight: 700 }}>{t.code}</div>
               <div>{t.name}</div>
            </td>
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', width: '150px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <span style={{ fontWeight: 900, color: '#2563eb' }}>{parseFloat(t.avance_fisico || 0).toFixed(1)}%</span>
               </div>
               <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                 <div style={{ width: `${Math.min(100, (parseFloat(t.avance_fisico || 0) / parseFloat(t.ponderacion_producto || 100)) * 100)}%`, height: '100%', background: '#3b82f6' }} />
               </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ConsolidatedMatrix;
