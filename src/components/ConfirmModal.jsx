import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDanger = true }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    style={{ 
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                    }}
                    onClick={onClose}
                >
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        onClick={e => e.stopPropagation()}
                        style={{ 
                            width: '100%', maxWidth: '400px', background: 'white', 
                            borderRadius: '30px', padding: '2rem', textAlign: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                        }}
                    >
                        <div style={{ 
                            width: '70px', height: '70px', borderRadius: '22px', 
                            background: isDanger ? '#fee2e2' : '#f1f5f9', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isDanger ? '#ef4444' : 'var(--primary)',
                            margin: '0 auto 1.5rem'
                        }}>
                            <AlertTriangle size={32} />
                        </div>

                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.75rem' }}>{title || '¿Estás seguro?'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>{message || 'Esta acción no se puede deshacer.'}</p>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                                onClick={onClose}
                                style={{ 
                                    flex: 1, padding: '14px', borderRadius: '18px', border: '1px solid var(--border)',
                                    background: 'white', color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                {cancelText}
                            </button>
                            <button 
                                onClick={() => { onConfirm(); onClose(); }}
                                style={{ 
                                    flex: 1, padding: '14px', borderRadius: '18px', border: 'none',
                                    background: isDanger ? '#ef4444' : 'var(--primary)', color: 'white',
                                    fontWeight: 800, cursor: 'pointer', boxShadow: isDanger ? '0 10px 15px -3px rgba(239, 68, 68, 0.3)' : '0 10px 15px -3px rgba(184, 134, 11, 0.3)'
                                }}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
