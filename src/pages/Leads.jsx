import React from 'react';
import { motion } from 'framer-motion';
import { 
    Users, 
    MessageCircle, 
    TrendingUp, 
    Zap, 
    Star, 
    ShieldCheck,
    Smartphone,
    Rocket
} from 'lucide-react';

const Leads = () => {
    return (
        <div className="leads-teaser-page slide-in" style={{ padding: '1rem' }}>
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
                    borderRadius: '32px', 
                    padding: '4rem 2rem', 
                    textAlign: 'center',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Background Decorations */}
                <div style={{ position: 'absolute', top: -50, right: -50, opacity: 0.1 }}>
                    <Users size={300} />
                </div>
                <div style={{ position: 'absolute', bottom: -50, left: -50, opacity: 0.1 }}>
                    <Rocket size={200} />
                </div>

                <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={{ 
                        margin: '0 auto 2rem',
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#78350f',
                        boxShadow: '0 0 30px rgba(245, 158, 11, 0.4)'
                    }}
                >
                    <Star size={40} fill="currentColor" />
                </motion.div>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>
                    Módulo de Prospectos <span style={{ color: '#fbbf24' }}>PREMIUM</span>
                </h1>
                <p style={{ fontSize: '1.2rem', opacity: 0.8, maxWidth: '700px', margin: '0 auto 3rem', lineHeight: '1.6' }}>
                    Estamos construyendo la herramienta de ventas más potente para tu carpintería. Muy pronto podrás convertir cada consulta en un cliente fiel automáticamente.
                </p>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '1.5rem',
                    maxWidth: '1000px',
                    margin: '0 auto'
                }}>
                    {[
                        { 
                            icon: <MessageCircle size={24} />, 
                            title: 'WhatsApp Automatizado', 
                            desc: 'Responde consultas del catálogo al instante con IA.' 
                        },
                        { 
                            icon: <Zap size={24} />, 
                            title: 'CRM Inteligente', 
                            desc: 'Sigue el rastro de cada cliente desde el primer clic.' 
                        },
                        { 
                            icon: <TrendingUp size={24} />, 
                            title: 'Analytics de Venta', 
                            desc: 'Descubre qué productos son los más deseados.' 
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (i * 0.1) }}
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '1.5rem', 
                                borderRadius: '24px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                textAlign: 'left'
                            }}
                        >
                            <div style={{ color: '#fbbf24', marginBottom: '1rem' }}>{feature.icon}</div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{feature.title}</h3>
                            <p style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: '1.4' }}>{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ 
                        marginTop: '4rem',
                        padding: '16px 40px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'white',
                        color: '#0f172a',
                        fontWeight: 900,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                    }}
                >
                    <Smartphone size={18} /> Solicitar Acceso Anticipado
                </motion.button>
            </motion.div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ShieldCheck size={14} /> Módulo exclusivo para planes de Carpintería de Alta Gama
                </p>
            </div>
        </div>
    );
};

export default Leads;
