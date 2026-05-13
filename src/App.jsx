import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Database, Users as UsersIcon, ShieldCheck, LogOut, Search, Activity, Book, Bell, Menu, X } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Monitoring from './pages/Monitoring';
import Documentation from './pages/Documentation';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Login from './pages/Login';
import ConsolidatedMatrix from './pages/ConsolidatedMatrix';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [notifs, setNotifs] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (window.innerWidth <= 1024 && window.innerWidth > 768 && !isCollapsed) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  useEffect(() => {
    if (user?.id) {
       const fetchNotifs = async () => {
         try {
           const res = await axios.get(`/api/notificaciones/${user.id}`);
           setNotifs(res.data);
         } catch (e) { console.error(e); }
       };
       fetchNotifs();
       const interval = setInterval(fetchNotifs, 60000); 
       return () => clearInterval(interval);
    }
  }, [user]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const menuItems = [
    { path: '/catalogo', label: 'Matriz de Planificación', icon: <Database size={20} /> },
    { path: '/segui', label: 'Seguimiento', icon: <Activity size={20} /> },
    { path: '/', label: 'Reporte', icon: <LayoutDashboard size={20} /> },
    { path: '/matrix', label: 'Vista por Funcionario', icon: <UsersIcon size={20} /> },
    ...(user?.role === 'Admin' ? [
      { path: '/usuarios', label: 'Usuarios', icon: <UsersIcon size={20} /> },
      { path: '/auditoria', label: 'Auditoría', icon: <ShieldCheck size={20} /> },
    ] : []),
    { path: '/documentacion', label: 'Ayuda', icon: <Book size={20} /> },
  ];

  return (
    <div className="layout" style={{ 
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      {/* Mobile Top Bar */}
      {isMobile && (
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo_ministerioa_trabajo.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
            <div>
              <h2 style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>MeGAs</h2>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#1e293b' }}>
            <Menu size={24} />
          </button>
        </header>
      )}

      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <aside className={`sidebar ${isMobile && !isSidebarOpen ? 'closed' : ''}`} style={{ 
        width: isMobile ? '280px' : (isCollapsed ? '80px' : '280px'),
        minWidth: isMobile ? '280px' : (isCollapsed ? '80px' : '280px'),
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        padding: (!isMobile && isCollapsed) ? '1.5rem 0.75rem' : '1.5rem',
        borderRight: '1px solid #e2e8f0',
        background: 'white',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50,
        transform: isMobile ? (isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: (!isMobile && isCollapsed) ? 'center' : 'space-between',
          flexDirection: (!isMobile && isCollapsed) ? 'column' : 'row',
          gap: '0.75rem',
          marginBottom: '2.5rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo_ministerioa_trabajo.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
            {(isMobile || !isCollapsed) && (
              <div>
                <h2 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Matriz de <span style={{ color: 'var(--primary)' }}>Planificación</span></h2>
                <p style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MTEPS 2026-2030</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              if (isMobile) setIsSidebarOpen(false);
              else setIsCollapsed(!isCollapsed);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            className="hover:bg-slate-100"
            title={isMobile ? 'Cerrar Menú' : (isCollapsed ? 'Expandir Menú' : 'Colapsar Menú')}
          >
            {isMobile ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {(isMobile || !isCollapsed) && 'Navegación'}
          </div>
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              onClick={() => { if(isMobile) setIsSidebarOpen(false); }}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              style={{ 
                justifyContent: (!isMobile && isCollapsed) ? 'center' : 'flex-start',
                padding: (!isMobile && isCollapsed) ? '0.75rem' : '0.85rem 1rem',
                borderRadius: '12px',
                transition: 'all 0.2s',
                background: isActive(item.path) ? 'var(--primary)' : 'transparent',
                color: isActive(item.path) ? 'white' : '#64748b',
                boxShadow: isActive(item.path) ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none'
              }}
              title={(!isMobile && isCollapsed) ? item.label : ''}
            >
              <span style={{ display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }} className="icon-container">
                {item.icon}
              </span>
              {(isMobile || !isCollapsed) && <span style={{ fontWeight: isActive(item.path) ? 700 : 500 }}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div style={{ 
          marginTop: 'auto', 
          borderTop: '1px solid #f1f5f9', 
          paddingTop: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {(isMobile || !isCollapsed) && (
            <div style={{ 
              padding: '1rem', 
              background: '#f8fafc', 
              borderRadius: '16px', 
              border: '1px solid #f1f5f9'
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>{user?.fullname === 'Administrador MeGAs' ? 'Administrador de Sistema' : user?.fullname}</p>
              <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{user?.cargo || (user?.role === 'Admin' ? 'Administrador de Sistema' : 'Funcionario Público')}</p>
              <div style={{ 
                marginTop: '8px', padding: '4px 8px', background: 'white', borderRadius: '6px', 
                fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800, border: '1px solid #dbeafe', display: 'inline-block' 
              }}>
                {user?.role === 'Admin' ? 'ADMINISTRADOR DE SISTEMA' : (user?.role === 'Director' ? 'DIRECTOR' : 'TÉCNICO')}
              </div>
            </div>
          )}
          
          <button 
            onClick={onLogout} 
            className="nav-link" 
            style={{ 
              width: '100%', border: 'none', background: 'rgba(239, 68, 68, 0.05)', 
              justifyContent: (!isMobile && isCollapsed) ? 'center' : 'flex-start',
              color: '#ef4444',
              borderRadius: '12px',
              padding: (!isMobile && isCollapsed) ? '0.75rem' : '0.85rem 1rem'
            }}
            title={(!isMobile && isCollapsed) ? 'Cerrar Sesión' : ''}
          >
            <LogOut size={20} /> 
            {(isMobile || !isCollapsed) && <span style={{ fontWeight: 700 }}>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
      <main className="content" style={{ overflowY: 'auto', background: '#f8fafc', flex: 1, minWidth: 0, padding: isMobile ? '1rem' : '2.5rem' }}>
        {children}
      </main>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/matrix" element={<ConsolidatedMatrix user={user} />} />
          <Route path="/catalogo" element={<Catalog user={user} />} />
          <Route path="/segui" element={<Monitoring user={user} />} />
          <Route path="/usuarios" element={user?.role === 'Admin' ? <Users user={user} /> : <Navigate to="/" replace />} />
          <Route path="/documentacion" element={<Documentation user={user} />} />
          <Route path="/auditoria" element={user?.role === 'Admin' ? <Audit user={user} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
