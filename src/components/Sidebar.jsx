import React from 'react';
import {
    LayoutDashboard,
    Hammer,
    Box,
    FileText,
    BarChart3,
    BookOpen,
    Users,
    ShoppingCart,
    History,
    ExternalLink,
    LogOut,
    Mail,
    TrendingDown,
    X,
    Shield
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
    const { activeView, setActiveView, activeRole, setActiveRole, user, logout, isSidebarOpen, setIsSidebarOpen } = useApp();

    const menuItems = [
        { id: 'dashboard', label: 'Monitor de Negocio', icon: <LayoutDashboard size={20} />, section: 'Módulos de Gestión' },
        { id: 'projects', label: 'Orden de Trabajo', icon: <Hammer size={20} />, section: 'Módulos de Gestión' },
        { id: 'leads', label: 'Prospectos / Leads', icon: <Mail size={20} />, section: 'Módulos de Gestión', status: 'PREMIUM' },
        { id: 'inventory', label: 'Control de Inventario', icon: <Box size={20} />, section: 'Módulos de Gestión' },
        { id: 'purchases', label: 'Órdenes de Compra', icon: <FileText size={20} />, section: 'Módulos de Gestión' },
        { id: 'reports', label: 'Reportes y Resumen', icon: <BarChart3 size={20} />, section: 'Análisis y Equipo' },
        { id: 'tech-doc', label: 'Manual de Usuario', icon: <BookOpen size={20} />, section: 'Análisis y Equipo' },
        { id: 'personnel', label: 'Planilla de Personal', icon: <Users size={20} />, section: 'Análisis y Equipo' },
        { id: 'personal', label: 'Accesos y Roles (ERP)', icon: <Shield size={20} />, section: 'Análisis y Equipo' },
        { id: 'customers', label: 'Gestión de Clientes', icon: <Users size={20} />, section: 'Análisis y Equipo' },
        { id: 'pos', label: 'Caja / Punto de Venta', icon: <ShoppingCart size={20} />, section: 'Finanzas y Caja' },
        { id: 'sales', label: 'Historial de Ventas', icon: <History size={20} />, section: 'Finanzas y Caja' },
        { id: 'expenses', label: 'Gestión de Egresos', icon: <TrendingDown size={20} />, section: 'Finanzas y Caja' },
    ];

    const rolePermissions = {
        'Dueno': ['dashboard', 'projects', 'inventory', 'purchases', 'reports', 'tech-doc', 'personal', 'personnel', 'pos', 'sales', 'expenses', 'leads', 'customers'],
        'Vendedor': ['pos', 'inventory', 'sales', 'projects'],
        'Almacen': ['inventory', 'purchases'],
        'Produccion': ['projects'],
        'Contador': ['reports', 'sales', 'expenses', 'customers']
    };

    const roleLabels = {
        'Dueno': 'Dueño / Gerente',
        'Vendedor': 'Vendedor / Cajero',
        'Almacen': 'Encargado de Almacén',
        'Produccion': 'Personal de Producción',
        'Contador': 'Contador (Solo Lectura)'
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
                    <div className="logo-circle">I</div>
                    <h1>Infrabol<span>ERP</span></h1>
                    <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav-menu">
                    {sections.map(section => (
                        <React.Fragment key={section}>
                            <div className="nav-label">{section}</div>
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
                                    {item.status === 'PREMIUM' && (
                                        <span style={{
                                            fontSize: '0.6rem',
                                            marginLeft: 'auto',
                                            padding: '2px 8px',
                                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                            color: '#78350f',
                                            borderRadius: '6px',
                                            fontWeight: 900,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                            PREMIUM
                                        </span>
                                    )}
                                </button>
                            ))}
                        </React.Fragment>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ padding: '0 0.5rem', marginBottom: '1.5rem', borderLeft: '2px solid var(--primary)' }}>
                        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.6, letterSpacing: '1px' }}>Potenciado por</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 900, color: 'white' }}>Kallpatech <span style={{ color: 'var(--primary)' }}>Solutions</span></p>
                        <p style={{ fontSize: '0.6rem', marginTop: '6px', opacity: 0.5, color: '#f8fafc' }}>
                            {window.location.hostname.includes('onrender.com') ? '🟢 Gestión en la NUBE' : '🏠 Gestión Local'} — Santa Cruz, Bolivia, 2026
                        </p>
                    </div>

                    <a href="catalog.html" className="catalog-link" target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        <span>Ver Catálogo Público</span>
                    </a>

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
                            <div className="avatar" style={{ width: '36px', height: '36px' }}>{activeRole ? activeRole[0] : 'U'}</div>
                            <div className="user-info">
                                <p className="user-name" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white' }}>{user?.fullname || user?.username || 'Usuario'}</p>
                                <p className="user-role" style={{ fontSize: '0.7rem', opacity: 0.6, color: '#94a3b8' }}>{roleLabels[activeRole] || activeRole}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)'
                            }}
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
