import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Shield, User, BarChart, FileText, CheckCircle, HelpCircle, Database, ClipboardCheck, Layout } from 'lucide-react';

const Documentation = () => {
  const [activeTab, setActiveTab] = useState('admin');

  const manuals = {
    admin: {
      title: 'Manual: Administrador (Planificación)',
      icon: <Shield size={32} />,
      color: '#4338ca',
      steps: [
        { title: 'Configuración Estratégica', desc: 'Gestionar Ejes, Resultados y Estrategias en el Catálogo Institucional.' },
        { title: 'Gestión de MeGAs', desc: 'Vincular Metas de Gestión (MeGAs) a su Unidad Responsable y Estrategia Padre.' },
        { title: 'Administración de Usuarios', desc: 'Crear perfiles, asignar roles (Director/Funcionario) y vincularlos a su unidad.' },
        { title: 'Seguimiento Global', desc: 'Supervisar el avance físico consolidado de toda la institución en el Dashboard.' }
      ]
    },
    director: {
      title: 'Manual: Director / Jefe de Unidad',
      icon: <BarChart size={32} />,
      color: '#92400e',
      steps: [
        { title: 'Revisión de MeGAs', desc: 'Supervisar las MeGAs asignadas a su dirección y el progreso de sus productos.' },
        { title: 'Validación de Formulario 1', desc: 'Verificar que los funcionarios reporten avances semanalmente de forma coherente.' },
        { title: 'Análisis de Semáforos', desc: 'Identificar tareas retrasadas o en riesgo a través de los indicadores visuales.' },
        { title: 'Reportes de Cumplimiento', desc: 'Exportar estados de situación para reuniones de coordinación de gabinete.' }
      ]
    },
    tecnico: {
      title: 'Manual: Funcionario',
      icon: <User size={32} />,
      color: '#15803d',
      steps: [
        { title: 'Reporte Semanal (S1-S5)', desc: 'Ingresar al módulo "Seguimiento" y registrar el % de avance de sus tareas asignadas.' },
        { title: 'Documentación de Tareas', desc: 'Vincular medios de verificación (enlaces PDF/Drive) y registrar observaciones por cada semana.' },
        { title: 'Seguimiento de Validación', desc: 'Verificar si sus reportes han sido Aprobados o Rechazados por su Director.' }
      ]
    },
    tecnico_detail: {
      title: 'Arquitectura y Base de Datos',
      icon: <Database size={32} />,
      color: '#0891b2',
      steps: [
        { title: 'Relación de Auditoría', desc: 'Diagrama Entidad-Relación actualizado con el flujo de validación y evidencias.' },
        { title: 'Persistencia de Datos', desc: 'Uso de PostgreSQL para el almacenamiento estructural de las MeGAs (2026-2030).' }
      ]
    }
  };

  const current = manuals[activeTab];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="hero-title">Manuales de Uso por Perfil</h1>
        <p style={{ color: '#64748b' }}>Guía interactiva para la gestión del seguimiento institucional MeGAs 2026-2030</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        {Object.keys(manuals).map(role => (
          <button 
            key={role}
            onClick={() => setActiveTab(role)}
            style={{
              padding: '1rem 2rem', borderRadius: '14px', border: '1px solid #e2e8f0',
              background: activeTab === role ? 'white' : 'transparent',
              boxShadow: activeTab === role ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: 700, fontSize: '0.9rem', color: activeTab === role ? 'var(--primary)' : '#64748b',
              display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {manuals[role].icon} {manuals[role].title.split(':')[1] || manuals[role].title}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'tecnico_detail' ? '1fr' : '1fr 1.5fr', gap: '3rem' }}>
        {/* Detail */}
        <div className="glass-card" style={{ padding: '2.5rem', borderLeft: `8px solid ${current.color}` }}>
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ color: current.color }}>{current.icon}</div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{current.title}</h2>
          </div>
          
          {activeTab === 'tecnico_detail' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <p style={{ color: '#64748b', fontSize: '0.9rem' }}>El sistema está diseñado bajo una arquitectura de microservicios con PostgreSQL, garantizando la integridad de las ponderaciones estratégicas.</p>
               <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                  <img 
                    src="file:///Users/admin/.gemini/antigravity/brain/133a31cc-43a8-4420-85a5-b1e137cb3364/media__1774876134436.png" 
                    alt="Diagrama ER Actualizado" 
                    style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
               </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {current.steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1.25rem' }}>
                  <div style={{ 
                    flex: 'none', width: '28px', height: '28px', borderRadius: '50%', background: current.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.3rem' }}>{step.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '3rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={16} /> Nota de Seguridad
            </h5>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Todas las acciones de modificación, creación o borrado quedan registradas bajo su ID de usuario en la bitácora de auditoría institucional.
            </p>
          </div>
        </div>

        {activeTab !== 'tecnico_detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Flujo de Validación Institucional</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '10px' }}>
                    <FileText size={20} color="#3b82f6" />
                    <div style={{ fontSize: '0.85rem' }}><strong>Funcionario:</strong> Reporte Semanal + Evidencia Link</div>
                  </div>
                  <div style={{ width: '2px', height: '20px', background: '#e2e8f0', marginLeft: '2rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fcf3cf', borderRadius: '10px' }}>
                    <Shield size={20} color="#d4ac0d" />
                    <div style={{ fontSize: '0.85rem' }}><strong>Director:</strong> Aprobación / Rechazo con Observaciones</div>
                  </div>
                  <div style={{ width: '2px', height: '20px', background: '#e2e8f0', marginLeft: '2rem' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#ecfdf5', borderRadius: '10px' }}>
                    <BarChart size={20} color="#10b981" />
                    <div style={{ fontSize: '0.85rem' }}><strong>Consolidado MeGA:</strong> Impacto en Planificación 2030</div>
                  </div>
                </div>
             </div>

             <div className="glass-card" style={{ padding: '2rem', background: 'var(--primary)', color: 'white' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Soporte Técnico Especializado</h3>
               <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                 Si tiene inconvenientes con su perfil o roles asignados, contacte a TIC.
               </p>
               <button style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'white', color: 'var(--primary)', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                 Enviar Solicitud
               </button>
             </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Documentation;
