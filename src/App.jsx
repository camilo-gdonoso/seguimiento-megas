import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Database, Users as UsersIcon, ShieldCheck, LogOut, Search, Activity, Book, Bell } from 'lucide-react';
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

  useEffect(() => {
    if (user?.id) {
       const fetchNotifs = async () => {
         try {
           const res = await axios.get(`http://localhost:3000/api/notificaciones/${user.id}`);
           setNotifs(res.data);
         } catch (e) { console.error(e); }
       };
       fetchNotifs();
       const interval = setInterval(fetchNotifs, 60000); 
       return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo-section" style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#2563eb', fontWeight: 800 }}>SISTEMA MeGAs</h2>
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Caminando hacia la Agenda 50/50</p>
        </div>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/segui" className={`nav-link ${isActive('/segui') ? 'active' : ''}`}>
             <Activity size={20} /> Seguimiento
          </Link>
          <Link to="/catalogo" className={`nav-link ${isActive('/catalogo') ? 'active' : ''}`}>
            <Database size={20} /> Catálogo Institucional
          </Link>
          {user?.role === 'Admin' && (
            <Link to="/usuarios" className={`nav-link ${isActive('/usuarios') ? 'active' : ''}`}>
              <UsersIcon size={20} /> Usuarios
            </Link>
          )}
          <Link to="/auditoria" className={`nav-link ${isActive('/auditoria') ? 'active' : ''}`}>
            <ShieldCheck size={20} /> Auditoría
          </Link>
          <Link to="/documentacion" className={`nav-link ${isActive('/documentacion') ? 'active' : ''}`}>
            <Book size={20} /> Ayuda / Manual
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
          <div style={{ marginBottom: '1rem', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{user?.fullname}</p>
              <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{user?.role} - {user?.unidad}</p>
            </div>
            {notifs.length > 0 && (
              <div style={{ position: 'relative', cursor: 'pointer' }} title={`Tienes ${notifs.length} tareas pendientes`}>
                <Bell size={20} color="var(--primary)" />
                <span style={{ 
                  position: 'absolute', top: '-5px', right: '-5px', 
                  background: '#ef4444', color: 'white', borderRadius: '50%', 
                  width: '18px', height: '18px', fontSize: '0.6rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                }}>
                  {notifs.length}
                </span>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="nav-link" style={{ width: '100%', border: 'none', background: 'transparent' }}>
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="content">
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
          <Route path="/usuarios" element={<Users user={user} />} />
          <Route path="/documentacion" element={<Documentation user={user} />} />
          <Route path="/auditoria" element={<Audit user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
