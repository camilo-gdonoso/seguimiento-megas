import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Building, Users, MapPin, Briefcase } from 'lucide-react';
import { ORGANIGRAM } from '../constants/organigram.js';

const UnitNode = ({ node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const children = ORGANIGRAM.filter(u => u.parent_id === node.id);
  const hasChildren = children.length > 0;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Ministro': return <Building size={18} color="#2563eb" />;
      case 'Viceministerio': return <Users size={16} color="#06b6d4" />;
      case 'Direccion': return <Briefcase size={16} color="#6366f1" />;
      case 'Jefatura': return <MapPin size={16} color="#f59e0b" />;
      default: return <Building size={14} color="#64748b" />;
    }
  };

  return (
    <div style={{ marginLeft: level > 0 ? '1.5rem' : 0, borderLeft: level > 0 ? '1px dashed #e2e8f0' : 'none' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1rem',
          borderRadius: '8px', cursor: hasChildren ? 'pointer' : 'default',
          background: level === 0 ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
          transition: 'background 0.2s',
          marginBottom: '0.25rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = level === 0 ? 'rgba(37, 99, 235, 0.05)' : 'transparent'}
      >
        {hasChildren ? (
          isOpen ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />
        ) : (
          <div style={{ width: 14 }} />
        )}
        {getTypeIcon(node.type)}
        <span style={{ 
          fontSize: level === 0 ? '0.95rem' : '0.85rem', 
          fontWeight: level === 0 ? 700 : 500,
          color: level === 0 ? '#1e293b' : '#475569'
        }}>
          {node.name}
        </span>
        <span style={{ 
          fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem', 
          borderRadius: '4px', background: '#f1f5f9', color: '#64748b',
          textTransform: 'uppercase'
        }}>
          {node.type}
        </span>
      </div>
      
      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {children.map(child => (
              <UnitNode key={child.id} node={child} level={level + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const HierarchyTree = () => {
  const rootUnits = ORGANIGRAM.filter(u => u.parent_id === null || u.parent_id === undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rootUnits.map(root => (
        <UnitNode key={root.id} node={root} />
      ))}
    </div>
  );
};

export default HierarchyTree;
