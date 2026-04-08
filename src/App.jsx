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
    { path: '/catalogo', label: 'MeGAs', icon: <Database size={20} /> },
    { path: '/segui', label: 'Seguimiento', icon: <Activity size={20} /> },
    { path: '/', label: 'Reporte', icon: <LayoutDashboard size={20} /> },
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
      transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <aside className="sidebar" style={{ 
        width: '100%', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem',
        borderRight: '1px solid var(--border)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          marginBottom: '2.5rem' 
        }}>
          {!isCollapsed && <h2 style={{ fontSize: '1.25rem', color: '#1e293b', fontWeight: 800 }}>Menú</h2>}
          <button 
            onClick={toggleSidebar}
            style={{ 
              background: '#f1f5f9', border: 'none', padding: '0.5rem', 
              borderRadius: '8px', cursor: 'pointer', color: '#64748b'
            }}
          >
            <Menu size={18} />
          </button>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              style={{ 
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '0.75rem' : '0.75rem 1rem'
              }}
              title={isCollapsed ? item.label : ''}
            >
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
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
            <div style={{ padding: '0 0.5rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{user?.fullname}</p>
              <p style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: '1.2' }}>{user?.role === 'Admin' ? 'Administrador MeGAs' : user?.unidad}</p>
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>{user?.cargo || 'Funcionario Público'}</p>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
             <button 
               onClick={onLogout} 
               className="nav-link" 
               style={{ 
                 width: '100%', border: 'none', background: 'transparent', 
                 justifyContent: isCollapsed ? 'center' : 'flex-start',
                 color: '#ef4444'
               }}
               title={isCollapsed ? 'Cerrar Sesión' : ''}
             >
               <LogOut size={20} /> 
               {!isCollapsed && <span>Cerrar Sesión</span>}
             </button>
             
             {(!isCollapsed && notifs.length > 0) && (
               <div style={{ 
                 position: 'absolute', top: '10px', right: '10px',
                 background: '#ef4444', color: 'white', borderRadius: '50%', 
                 width: '18px', height: '18px', fontSize: '0.6rem',
                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900
               }}>
                 {notifs.length}
               </div>
             )}
          </div>
        </div>
      </aside>
      <main className="content" style={{ overflowY: 'auto' }}>
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
