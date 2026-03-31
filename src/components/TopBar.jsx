import React, { useState } from 'react';
import { Search, Bell, Plus, Menu, X, Trash2, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const TopBar = () => {
    const { 
        notifications, searchTerm, setSearchTerm, setIsSidebarOpen, 
        markAllNotificationsAsRead, clearNotifications 
    } = useApp();
    const [showNotifications, setShowNotifications] = useState(false);
    
    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <header className="top-bar">
            <button className="mobile-toggle" onClick={() => setIsSidebarOpen(true)}>
                <Menu size={24} />
            </button>
            <div className="search-box" style={{ position: 'relative' }}>
                <Search size={18} className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Buscar en todo el sistema..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="header-actions" style={{ position: 'relative' }}>
                <button 
                    className="btn-icon" 
                    onClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications && unreadCount > 0) {
                            markAllNotificationsAsRead();
                        }
                    }}
                >
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="notification-dot"></span>}
                </button>

                <AnimatePresence>
                    {showNotifications && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            style={{
                                position: 'absolute', top: '120%', right: '0',
                                width: '320px', background: 'white', borderRadius: '20px',
                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                                border: '1px solid #f1f5f9', zIndex: 1000, overflow: 'hidden'
                            }}
                        >
                            <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Notificaciones</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); clearNotifications(); }}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700 }}
                                    >
                                        <Trash2 size={12} /> Limpiar
                                    </button>
                                </div>
                            </div>

                            <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '0.5rem' }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        No hay notificaciones
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div 
                                            key={n.id} 
                                            style={{ 
                                                padding: '12px 16px', 
                                                borderRadius: '12px',
                                                marginBottom: '4px',
                                                background: n.read ? 'transparent' : '#f8fafc',
                                                borderLeft: `4px solid ${n.type === 'success' ? '#10b981' : n.type === 'error' ? '#ef4444' : 'var(--primary)'}`,
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <div style={{ color: 'var(--secondary)', fontWeight: n.read ? 400 : 700 }}>{n.msg}</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px' }}>Hace un momento</div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {notifications.length > 0 && (
                                <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                    <button 
                                        onClick={() => setShowNotifications(false)}
                                        style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                        Cerrar panel
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </header>
    );
};

export default TopBar;
