import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ShieldAlert } from 'lucide-react';
import axios from 'axios';

const API_URL = '/api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      onLogin(response.data);
    } catch (err) {
      const serverError = err.response?.data;
      if (typeof serverError === 'object' && serverError !== null) {
        setError(serverError.error || serverError.message || 'Error del servidor');
      } else {
        setError(serverError || 'Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#ffffff', // Clean white background as requested
      padding: '2rem' 
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ 
          width: '100%', 
          maxWidth: '440px', 
          textAlign: 'center'
        }}
      >
        <div style={{ marginBottom: '3rem' }}>
          <img 
            src="/logo_ministerioa_trabajo.png" 
            alt="MTEPS Logo" 
            style={{ height: '90px', marginBottom: '1.5rem', objectFit: 'contain' }} 
          />
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 900, 
            color: '#0f172a', 
            letterSpacing: '-0.02em',
            margin: '0 0 0.5rem 0'
          }}>
            Matriz de Planificación
          </h1>
          <p style={{ 
            color: '#64748b', 
            fontSize: '0.95rem', 
            fontWeight: 500,
            letterSpacing: '0.05em'
          }}>
            Caminando hacia la Agenda 50/50
          </p>
        </div>

        <div className="glass-card" style={{ 
          padding: '2.5rem', 
          borderRadius: '24px', 
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', color: '#1e293b' }}>
            Iniciar Sesión
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#475569' }}>
                Usuario
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  required
                  style={{ 
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', 
                    border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem'
                  }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#475569' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="password"
                  required
                  style={{ 
                    width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', 
                    border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '0.95rem'
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', 
                borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca' 
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ 
                marginTop: '1rem', padding: '0.85rem', borderRadius: '12px', fontWeight: 800,
                fontSize: '1rem', background: '#2563eb', border: 'none', color: 'white', cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
              }}
            >
              {loading ? 'Verificando...' : 'Acceder al Sistema'}
            </button>
          </form>
        </div>
        
        <p style={{ marginTop: '2rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500 }}>
          Ministerio de Trabajo, Empleo y Previsión Social © 2026
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
