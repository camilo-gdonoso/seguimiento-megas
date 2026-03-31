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
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Decorative Orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px',
        background: 'rgba(37, 99, 235, 0.1)', borderRadius: '50%', filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px',
        background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', filter: 'blur(100px)'
      }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{
          width: '400px',
          padding: '2.5rem',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }}
      >
        <div style={{
          width: '64px', height: '64px', margin: '0 auto 1.5rem',
          background: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyCenter: 'center',
          color: '#3b82f6'
        }}>
          <Lock size={32} style={{ margin: 'auto' }} />
        </div>
        
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bienvenido</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Sistema de Seguimiento Estratégico MeGAs
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                style={{
                  width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white'
                }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white'
                }} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Accediendo...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
