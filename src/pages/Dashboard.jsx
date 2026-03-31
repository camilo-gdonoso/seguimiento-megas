import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Building, Globe, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const SEMAPHORE_CONFIG = {
  'Terminado':  { color: '#10b981', bg: '#dcfce7', border: '#bbf7d0', label: 'Terminado' },
  'En Proceso': { color: '#f59e0b', bg: '#fef9c3', border: '#fde68a', label: 'En Proceso' },
  'Retrasado':  { color: '#ef4444', bg: '#fee2e2', border: '#fecaca', label: 'Retrasado'  },
  'Pendiente':  { color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', label: 'Pendiente'  },
};

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    global: 0,
    units: [],
    megas: [],
    activities: [],
    semaphores: { green: 0, yellow: 0, red: 0, gray: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [actFilter, setActFilter] = useState('all');   // all | Retrasado | En Proceso | Terminado | Pendiente
  const [showAllActs, setShowAllActs] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard-stats`, {
        params: { userId: user?.id, role: user?.role }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = (stats.activities || []).filter(a =>
    actFilter === 'all' || a.estado === actFilter
  );
  const visibleActivities = showAllActs ? filteredActivities : filteredActivities.slice(0, 6);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-pulse" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#3b82f6', margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748b', fontWeight: 600 }}>Cargando Panel de Control...</p>
      </div>
    </div>
  );

  const totalActs = stats.activities?.length || 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="hero-title">Panel de Control Estratégico</h1>
        <p style={{ color: '#64748b' }}>Seguimiento en tiempo real de los Resultados MeGAs 2026-2030</p>
      </header>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '1rem', borderRadius: '12px' }}>
            <Globe size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Avance Global SPIE</p>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.global}%</h3>
          </div>
        </div>

        {[
          { label: 'Terminadas', count: stats.semaphores.green,  icon: CheckCircle,   col: 'rgba(16,185,129,0.1)',  c: '#10b981' },
          { label: 'En Proceso', count: stats.semaphores.yellow, icon: Clock,         col: 'rgba(245,158,11,0.1)',  c: '#f59e0b' },
          { label: 'Retrasadas', count: stats.semaphores.red,    icon: AlertTriangle, col: 'rgba(239,68,68,0.1)',   c: '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: kpi.col, color: kpi.c, padding: '1rem', borderRadius: '12px' }}>
              <kpi.icon size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{kpi.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.count}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── MeGA + Unit row ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* MeGA progress */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Globe size={20} color="#2563eb" /> Cumplimiento de Resultados MeGAs
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {stats.megas && stats.megas.length > 0 ? stats.megas.map(mega => (
              <div key={mega.code}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 800 }}>{mega.code}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{mega.name.length > 55 ? mega.name.substring(0, 55) + '…' : mega.name}</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#2563eb', whiteSpace: 'nowrap' }}>{mega.progress}%</span>
                </div>
                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${mega.progress}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: '100px',
                      background: parseFloat(mega.progress) > 80 ? 'linear-gradient(90deg,#10b981,#34d399)' :
                                  parseFloat(mega.progress) > 40 ? 'linear-gradient(90deg,#3b82f6,#60a5fa)' :
                                  'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
                  />
                </div>
              </div>
            )) : <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No hay MeGAs registrados.</p>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* N3: Progress by Direccion (Macro) */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layers size={20} color="#8b5cf6" /> Avance por Dirección General
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.direcciones?.length > 0 ? stats.direcciones.map(dir => (
                <div key={dir.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{dir.name}</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 700 }}>{dir.progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#f5f3ff', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dir.progress}%`, background: '#8b5cf6', borderRadius: '100px' }} />
                  </div>
                </div>
              )) : <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay datos macro.</p>}
            </div>
          </div>

          {/* Unit progress */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building size={20} color="#2563eb" /> Avance por Unidad Institucional
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {stats.units.length > 0 ? stats.units.map(unit => (
                <div key={unit.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{unit.name}</span>
                    <span style={{ color: '#64748b' }}>{unit.progress}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '100px', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${unit.progress}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: unit.color, borderRadius: '100px' }} />
                  </div>
                </div>
              )) : <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Sin unidades registradas.</p>}
            </div>
          </div>

          {/* N3: Progress by Funcionario */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle size={20} color="#059669" /> Productividad por Funcionario
            </h3>
            <div style={{ display: 'table', width: '100%' }}>
              {(stats.users || []).map(u => (
                <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{u.name || 'Sin asignar'}</p>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0 }}>{u.tasks} tareas asignadas</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: parseFloat(u.progress) > 80 ? '#059669' : '#475569' }}>
                      {u.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semaphore distribution */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <TrendingUp size={20} color="#2563eb" /> Distribución de Semáforos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Terminado', count: stats.semaphores.green,  color: 'var(--success)', desc: '100% + Evidencia Aprobada' },
                { label: 'En Proceso', count: stats.semaphores.yellow, color: 'var(--warning)', desc: 'Dentro de plazo con avances' },
                { label: 'Retrasado',  count: stats.semaphores.red,    color: 'var(--danger)',  desc: 'Fecha vencida e incompleta' },
                { label: 'Pendiente',  count: stats.semaphores.gray,   color: 'var(--pending)', desc: 'Aún no inicia' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{s.count}</span>
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: '10px', display: 'flex', borderRadius: '100px', overflow: 'hidden' }}>
              {(() => {
                const total = Object.values(stats.semaphores).reduce((a, b) => a + b, 0) || 1;
                return [
                  { v: stats.semaphores.green,  c: 'var(--success)' },
                  { v: stats.semaphores.yellow, c: 'var(--warning)' },
                  { v: stats.semaphores.red,    c: 'var(--danger)'  },
                  { v: stats.semaphores.gray,   c: 'var(--pending)' },
                ].map((s, i) => (
                  <div key={i} style={{ width: `${(s.v / total) * 100}%`, background: s.c }} />
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── B.2 Semaphore by Activity ───────────────────────────────── */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
            <Layers size={20} color="#2563eb" /> Seguimiento por Actividad
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: '#f1f5f9', color: '#64748b', borderRadius: '20px', fontWeight: 700 }}>
              {filteredActivities.length} actividades
            </span>
          </h3>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', 'Retrasado', 'En Proceso', 'Terminado', 'Pendiente'].map(f => {
              const cfg = f === 'all' ? { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' } : SEMAPHORE_CONFIG[f];
              const isActive = actFilter === f;
              const cnt = f === 'all' ? totalActs : (stats.activities || []).filter(a => a.estado === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setActFilter(f)}
                  style={{
                    padding: '0.35rem 0.85rem', borderRadius: '20px', border: `1px solid ${isActive ? cfg.border : '#e2e8f0'}`,
                    background: isActive ? cfg.bg : 'white', color: isActive ? cfg.color : '#64748b',
                    fontWeight: isActive ? 800 : 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  {f === 'all' ? 'Todas' : f}
                  <span style={{ background: isActive ? cfg.color : '#e2e8f0', color: isActive ? 'white' : '#64748b', borderRadius: '10px', padding: '0 5px', fontSize: '0.7rem', fontWeight: 900 }}>{cnt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontStyle: 'italic' }}>
            No hay actividades que mostrar para este filtro.
          </p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {visibleActivities.map((act, idx) => {
                const cfg = SEMAPHORE_CONFIG[act.estado] || SEMAPHORE_CONFIG['Pendiente'];
                const pct = act.avance_pct;
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    style={{
                      padding: '1.25rem', borderRadius: '16px',
                      border: `1.5px solid ${cfg.border}`,
                      background: cfg.bg,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', background: '#3b82f6', color: 'white', borderRadius: '4px', fontWeight: 900, whiteSpace: 'nowrap' }}>
                            {act.mega_code}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {act.producto_name?.substring(0, 35)}{act.producto_name?.length > 35 ? '…' : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                          {act.name?.length > 60 ? act.name.substring(0, 60) + '…' : act.name}
                        </p>
                      </div>
                      <span style={{
                        flexShrink: 0, marginLeft: '0.5rem', fontSize: '0.65rem', fontWeight: 900,
                        padding: '0.25rem 0.6rem', borderRadius: '8px',
                        background: cfg.color + '20', color: cfg.color, border: `1px solid ${cfg.border}`
                      }}>
                        {act.estado}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                        <span>Progreso de tareas</span>
                        <span style={{ color: cfg.color }}>{pct}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.6)', borderRadius: '100px', overflow: 'hidden', border: `1px solid ${cfg.border}` }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: '100px', background: cfg.color }}
                        />
                      </div>
                    </div>

                    {/* Task mini-summary */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[
                        { v: act.terminadas,  label: 'Fin',  c: '#10b981' },
                        { v: act.en_proceso,  label: 'EP',   c: '#f59e0b' },
                        { v: act.retrasadas,  label: 'Ret',  c: '#ef4444' },
                        { v: act.pendientes,  label: 'Pend', c: '#94a3b8' },
                      ].map(t => t.v > 0 && (
                        <span key={t.label} style={{
                          fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px',
                          background: t.c + '18', color: t.c, border: `1px solid ${t.c}30`
                        }}>
                          {t.v} {t.label}
                        </span>
                      ))}
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, marginLeft: 'auto' }}>
                        {act.total} tarea{act.total !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredActivities.length > 6 && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowAllActs(p => !p)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {showAllActs ? <><ChevronUp size={16} /> Ver menos</> : <><ChevronDown size={16} /> Ver las {filteredActivities.length - 6} restantes</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;
