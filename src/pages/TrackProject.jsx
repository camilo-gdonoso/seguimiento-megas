import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Construction, CheckCircle2, Clock, User, Package, Settings, Info } from 'lucide-react';
import { API_URL } from '../context/AppContext';

const TrackProject = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await axios.get(`${API_URL}/projects/track/${id}`);
                setProject(res.data);
            } catch (err) {
                console.error(err);
                setError('No se pudo encontrar la orden de trabajo. Verifica el código e intenta de nuevo.');
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                <div style={{ width: 80, height: 80, borderRadius: '24px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '1.5rem' }}>
                    <Info size={40} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Ops... algo salió mal</h2>
                <p style={{ color: '#64748b', maxWidth: '400px' }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                   <div style={{ display: 'inline-flex', padding: '12px 24px', borderRadius: '50px', background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '1.5rem', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>INFRABOL</span>
                   </div>
                   <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--secondary)', marginBottom: '0.5rem' }}>Seguimiento de Orden de Trabajo</h1>
                   <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Código de la orden: <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>#{project.id}</span></div>
                </div>

                {/* Main Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                        background: 'white', borderRadius: '35px', padding: '2.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
                        border: '1px solid white'
                    }}
                >
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Orden de Trabajo</div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--secondary)' }}>{project.name}</h2>
                            </div>
                            <div style={{ padding: '8px 16px', borderRadius: '12px', background: '#f59e0b20', color: '#b45309', fontSize: '0.75rem', fontWeight: 800 }}>
                                En {project.stage || 'Progreso'}
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                            <User size={16} />
                            <span>Titular: <strong>{project.client}</strong></span>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div style={{ marginBottom: '3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--secondary)' }}>Progreso de la Orden</span>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{project.progress}%</span>
                        </div>
                        <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '20px', overflow: 'hidden' }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                                style={{ 
                                    height: '100%', 
                                    background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                                    boxShadow: '0 4px 10px rgba(184, 134, 11, 0.3)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Milestones / Stages */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                        {[
                            { label: 'Ocre', active: project.progress >= 25, icon: <Package size={18} /> },
                            { label: 'Fab', active: project.progress >= 50, icon: <Settings size={18} /> },
                            { label: 'Armado', active: project.progress >= 75, icon: <Construction size={18} /> },
                            { label: 'Final', active: project.progress >= 100, icon: <CheckCircle2 size={18} /> }
                        ].map((m, i) => (
                            <div key={i} style={{ opacity: m.active ? 1 : 0.3 }}>
                                <div style={{ 
                                    width: '45px', height: '45px', borderRadius: '14px', 
                                    margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: m.active ? 'var(--primary)' : '#f1f5f9',
                                    color: m.active ? 'white' : '#94a3b8'
                                }}>
                                    {m.icon}
                                </div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--secondary)' }}>{m.label}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Footer Message */}
                <div style={{ marginTop: '3rem', textAlign: 'center', padding: '0 2rem' }}>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Actualizamos el progreso de tu orden de trabajo en tiempo real. Para dudas o consultas, contacta con tu asesor asignado.</p>
                </div>
            </div>
        </div>
    );
};

export default TrackProject;
