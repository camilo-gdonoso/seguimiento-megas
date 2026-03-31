import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Calendar, DollarSign, Tag, CreditCard, X, TrendingDown, ReceiptText } from 'lucide-react';

const Expenses = () => {
    const { expenses, addExpense, deleteExpense, actionTrigger, setActionTrigger, searchTerm, formatDate } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Orden de Trabajo', method: 'Efectivo' });

    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    const filteredExpenses = expenses.filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = async () => {
        if (!newExpense.description || !newExpense.amount) return;
        await addExpense({
            ...newExpense,
            amount: Number(newExpense.amount)
        });
        setIsModalOpen(false);
        setNewExpense({ description: '', amount: '', category: 'Orden de Trabajo', method: 'Efectivo' });
    };

    // Listen to global "Add New" button
    React.useEffect(() => {
        if (actionTrigger?.type === 'CREATE_NEW') {
            setIsModalOpen(true);
            setActionTrigger(null);
        }
    }, [actionTrigger]);

    return (
        <div className="expenses-page">
            <motion.div 
                className="expenses-header-card"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>Gestión de Gastos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Control de egresos operativos y administrativos</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL EGRESOS ACUMULADOS</span>
                    <strong style={{ fontSize: '2rem', color: '#ef4444' }}>{totalExpenses.toLocaleString()} Bs.</strong>
                </div>
            </motion.div>

            <div className="expenses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <AnimatePresence>
                    {filteredExpenses.map((expense, i) => (
                        <motion.div 
                            key={expense.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05 }}
                            style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)', position: 'relative' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: '#fef2f2', color: '#991b1b' }}>
                                    {expense.category}
                                </span>
                                <button 
                                    onClick={() => deleteExpense(expense.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{expense.description}</h3>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginBottom: '1rem' }}>- {Number(expense.amount).toLocaleString()} Bs.</div>
                            
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <Calendar size={12} />
                                    <span>{expense.date}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <CreditCard size={12} />
                                    <span>{expense.method}</span>
                                </div>
                                {expense.purchase_id && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', color: '#0369a1', fontWeight: 800, background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                                        <ReceiptText size={10} />
                                        <span>{expense.purchase_id}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredExpenses.length === 0 && (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📉</div>
                    <h3>No hay gastos registrados</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Todo parece bajo control en las finanzas.</p>
                </div>
            )}

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '400px', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
                        >
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={24} />
                            </button>
                            
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingDown style={{ color: '#ef4444' }} /> Registrar Gasto
                            </h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Descripción</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Pago Insumos Orden"
                                        value={newExpense.description} 
                                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Monto (Bs.)</label>
                                        <input 
                                            type="number" 
                                            placeholder="0.00"
                                            value={newExpense.amount} 
                                            onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Categoría</label>
                                        <select 
                                            value={newExpense.category} 
                                            onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        >
                                            <option value="Orden de Trabajo">🛠️ Orden de Trabajo</option>
                                            <option value="Administrativo">📋 Adm.</option>
                                            <option value="Servicios">💡 Servicios</option>
                                            <option value="Marketing">📣 Pub.</option>
                                            <option value="Sueldos">👥 Sueldos</option>
                                            <option value="Otros">📦 Otros</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Método de Pago</label>
                                    <select 
                                        value={newExpense.method} 
                                        onChange={(e) => setNewExpense({...newExpense, method: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    >
                                        <option value="Efectivo">💵 Efectivo</option>
                                        <option value="Transferencia">🏛️ Transferencia</option>
                                        <option value="QR / Tigo Money">📱 QR / Tigo</option>
                                    </select>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button 
                                        onClick={handleSave}
                                        style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}
                                    >
                                        Confirmar Gasto
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Expenses;
