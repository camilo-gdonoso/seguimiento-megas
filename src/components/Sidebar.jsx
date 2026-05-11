import React from 'react';
import {
    LayoutDashboard,
    Layers,
    Activity,
    BarChart3,
    HelpCircle,
    Users,
    Shield,
    LogOut,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
    const { activeView, setActiveView, activeRole, setActiveRole, user, logout, isSidebarOpen, setIsSidebarOpen } = useApp();

    const menuItems = [
        { id: 'megas', label: 'Matriz de Planificación', icon: <Layers size={20} />, section: 'Menú' },
        { id: 'monitoring', label: 'Seguimiento', icon: <Activity size={20} />, section: 'Menú' },
        { id: 'dashboard', label: 'Reporte', icon: <BarChart3 size={20} />, section: 'Menú' },
        { id: 'users', label: 'Usuarios', icon: <Users size={20} />, section: 'Administración' },
        { id: 'audit', label: 'Auditoría', icon: <Shield size={20} />, section: 'Administración' },
        { id: 'help', label: 'Ayuda', icon: <HelpCircle size={20} />, section: 'Menú' },
    ];

    const rolePermissions = {
        'Admin': ['megas', 'monitoring', 'dashboard', 'users', 'audit', 'help'],
        'Director': ['megas', 'monitoring', 'dashboard', 'help'],
        'Tecnico': ['megas', 'monitoring', 'help']
    };

    const roleLabels = {
        'Admin': 'Administrador de Sistema',
        'Director': 'Director General',
        'Tecnico': 'Técnico / Operador'
    };

    const visibleItems = menuItems.filter(item => rolePermissions[activeRole]?.includes(item.id));
    const sections = Array.from(new Set(visibleItems.map(item => item.section)));

    return (
        <>
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src="/logo_ministerioa_trabajo.png" alt="Logo" style={{ height: '32px' }} />
                        <div>
                            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', margin: 0 }}>Matriz de <span style={{ color: 'var(--primary)' }}>Planificación</span></h1>
                            <p style={{ fontSize: '0.55rem', opacity: 0.6, margin: 0, fontWeight: 600, color: '#94a3b8' }}>Caminando hacia la Agenda 50/50</p>
                        </div>
                    </div>
                    <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav-menu">
                    {sections.map(section => (
                        <React.Fragment key={section}>
                            <div className="nav-label">{section === 'Menú' ? 'Navegación' : section}</div>
                            {visibleItems.filter(item => item.section === section).map(item => (
                                <button
                                    key={item.id}
                                    className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveView(item.id);
                                        setIsSidebarOpen(false);
                                    }}
                                >
                                    <span className="icon">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div
                        className="user-pill"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '12px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <div
                            onClick={() => {
                                const roles = Object.keys(rolePermissions);
                                const nextIndex = (roles.indexOf(activeRole) + 1) % roles.length;
                                setActiveRole(roles[nextIndex]);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                            title="Cambiar rol (Demo)"
                        >
                            <div className="avatar" style={{ width: '36px', height: '36px', background: 'var(--primary)', color: 'white', fontWeight: 900 }}>{activeRole ? activeRole[0] : 'U'}</div>
                            <div className="user-info">
                                <p className="user-name" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white' }}>{user?.fullname || user?.username || 'Usuario'}</p>
                                <p className="user-role" style={{ fontSize: '0.65rem', opacity: 0.6, color: '#94a3b8' }}>{user?.cargo || roleLabels[activeRole] || activeRole}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s'
                            }}
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                    
                    <div style={{ marginTop: '1.25rem', padding: '0 0.5rem', opacity: 0.4 }}>
                        <p style={{ fontSize: '0.55rem', margin: 0 }}>© 2026 MTEPS</p>
                        <p style={{ fontSize: '0.55rem', margin: 0 }}>Ministerio de Trabajo, Empleo y Previsión Social</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
