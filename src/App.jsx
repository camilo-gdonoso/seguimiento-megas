import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Database, Users as UsersIcon, ShieldCheck, LogOut, Search, Activity, Book, Bell, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import Monitoring from './pages/Monitoring';
import Documentation from './pages/Documentation';
import Users from './pages/Users';
import Audit from './pages/Audit';
import Login from './pages/Login';

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const [notifs, setNotifs] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/segui', label: 'Seguimiento', icon: <Activity size={20} /> },
    { path: '/catalogo', label: 'Matriz de Planificación', icon: <Database size={20} /> },
    ...(user?.role === 'Admin' ? [
      { path: '/usuarios', label: 'Usuarios', icon: <UsersIcon size={20} /> },
      { path: '/auditoria', label: 'Auditoría', icon: <ShieldCheck size={20} /> },
    ] : []),
    { path: '/documentacion', label: 'Ayuda / Manual', icon: <Book size={20} /> },
  ];

  return (
    <div className="layout" style={{ 
      display: 'grid', 
      gridTemplateColumns: isCollapsed ? '80px 1fr' : '280px 1fr',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      background: '#f8fafc'
    }}>
      <aside className="sidebar" style={{ 
        width: '100%', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem',
        borderRight: '1px solid #e2e8f0',
        background: 'white',
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '0.75rem',
          marginBottom: '2.5rem' 
        }}>
          <img src="/logo_ministerioa_trabajo.png" alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
          {!isCollapsed && (
            <div>
              <h2 style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Matriz de <span style={{ color: 'var(--primary)' }}>Planificación</span></h2>
              <p style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MTEPS 2026-2030</p>
            </div>
          )}
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {!isCollapsed && 'Navegación'}
          </div>
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              style={{ 
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0.75rem' : '0.85rem 1rem',
                borderRadius: '12px',
                transition: 'all 0.2s',
                background: isActive(item.path) ? 'var(--primary)' : 'transparent',
                color: isActive(item.path) ? 'white' : '#64748b',
                boxShadow: isActive(item.path) ? '0 10px 15px -3px rgba(37, 99, 235, 0.2)' : 'none'
              }}
              title={isCollapsed ? item.label : ''}
            >
              <span style={{ display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }} className="icon-container">
                {item.icon}
              </span>
              {!isCollapsed && <span style={{ fontWeight: isActive(item.path) ? 700 : 500 }}>{item.label}</span>}
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
          {!isCollapsed && (
            <div style={{ 
              padding: '1rem', 
              background: '#f8fafc', 
              borderRadius: '16px', 
              border: '1px solid #f1f5f9'
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '2px' }}>{user?.fullname}</p>
              <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{user?.cargo || 'Funcionario Público'}</p>
              <div style={{ 
                marginTop: '8px', padding: '4px 8px', background: 'white', borderRadius: '6px', 
                fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800, border: '1px solid #dbeafe', display: 'inline-block' 
              }}>
                {user?.role === 'Admin' ? 'ADMINISTRADOR' : (user?.role === 'Director' ? 'DIRECTOR' : 'TÉCNICO')}
              </div>
            </div>
          )}
          
          <button 
            onClick={onLogout} 
            className="nav-link" 
            style={{ 
              width: '100%', border: 'none', background: 'rgba(239, 68, 68, 0.05)', 
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              color: '#ef4444',
              borderRadius: '12px',
              padding: isCollapsed ? '0.75rem' : '0.85rem 1rem'
            }}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
          >
            <LogOut size={20} /> 
            {!isCollapsed && <span style={{ fontWeight: 700 }}>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
      <main className="content" style={{ overflowY: 'auto', background: '#f8fafc' }}>
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
