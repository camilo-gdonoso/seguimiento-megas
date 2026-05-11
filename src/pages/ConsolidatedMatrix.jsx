
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Users, Printer, Download } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const ConsolidatedMatrix = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API_URL}/tareas_detail`);
      const tasks = res.data;
      
      // Group by user
      const grouped = tasks.reduce((acc, task) => {
        const userId = task.user_id || 'unassigned';
        if (!acc[userId]) acc[userId] = { 
          info: { 
            name: task.responsable_nombre || 'Sin Asignar',
            cargo: task.responsable_cargo || '---',
            unidad: task.unit_name || '---' 
          },
          planificadas: [],
          noPlanificadas: []
        };
        
        if (task.vinculada_poa === 'SI') {
          acc[userId].planificadas.push(task);
        } else {
          acc[userId].noPlanificadas.push(task);
        }
        return acc;
      }, {});

      setData(Object.values(grouped));
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
          <h1 className="hero-title">Matriz Consolidada por Funcionario</h1>
          <p style={{ color: '#64748b' }}>Vista integral de planificación y seguimiento individual</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <button className="btn-secondary" onClick={() => window.print()}><Printer size={18} /> Imprimir PDF</button>
        </div>
      </header>

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
                <SectionTitle title="Actividades Planificadas (POA)" color="#3b82f6" />
                <MatrixTable tasks={user.planificadas} />
                
                <div style={{ marginTop: '2rem' }}>
                  <SectionTitle title="Actividades No Planificadas / Aisladas" color="#8b5cf6" />
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

const SectionTitle = ({ title, color }) => (
  <div style={{ padding: '0.75rem 1.5rem', background: color, color: 'white', fontWeight: 900, fontSize: '0.9rem', borderRadius: '12px', marginBottom: '1rem' }}>
    {title}
  </div>
);

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
            <td style={{ padding: '1rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
               <div style={{ fontWeight: 900, color: '#2563eb' }}>{parseFloat(t.avance_fisico || 0).toFixed(1)}%</div>
               <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{t.is_hitos_mode ? 'Modo Hitos' : 'Temporal'}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ConsolidatedMatrix;
