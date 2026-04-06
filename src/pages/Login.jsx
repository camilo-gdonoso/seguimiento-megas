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
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      padding: '4rem 2rem'
    }}>
      <motion.img 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        src="/logo_ministerioa_trabajo.png" 
        alt="Ministerio de Trabajo" 
        style={{ width: '420px', height: 'auto', marginBottom: '1rem' }} 
      />

      <motion.h1 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ 
          fontSize: '1.75rem', 
          fontWeight: 700, 
          color: '#1e293b', 
          marginBottom: '2.5rem', 
          textAlign: 'center',
          maxWidth: '600px',
          lineHeight: 1.2
        }}
      >
        Sistema de Seguimiento al Cumplimiento de MeGAs
      </motion.h1>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          width: '400px',
          padding: '2.5rem',
          background: '#1e293b',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          color: 'white'
        }}
      >
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
            <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Usuario</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                placeholder="Introduzca su usuario"
                style={{
                  width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'white'
                }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', opacity: loading ? 0.7 : 1, fontWeight: 600 }}
          >
            {loading ? 'Accediendo...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
