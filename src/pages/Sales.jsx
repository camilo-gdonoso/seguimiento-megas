import React from 'react';
import { useApp } from '../context/AppContext';
import { History, Receipt, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Sales = () => {
    const { sales, searchTerm, payments, projects } = useApp();

    const allIncome = [
        ...sales.map(s => ({ ...s, sourceType: 'Venta', customer: s.customer_name || 'Consumidor Final', itemsDisplay: s.items || [] })),
        ...payments.map(p => ({
            id: `AB-${p.id}`,
            customer: projects.find(proj => String(proj.id) === String(p.project_id))?.client || 'Cliente Proyecto',
            date: p.date,
            payment_method: p.method,
            total: p.amount,
            sourceType: 'Abono',
            itemsDisplay: [{ name: `Abono: ${projects.find(proj => String(proj.id) === String(p.project_id))?.name || 'Proyecto'}`, quantity: 1, price: p.amount }]
        }))
    ];

    const filteredIncome = allIncome.filter(s =>
        !searchTerm ||
        (s.id && String(s.id).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.customer && s.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.date && s.date.includes(searchTerm))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalRevenue = filteredIncome.reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    return (
        <div className="sales-page slide-in">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>Registro de Ventas</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Historial completo de transacciones realizadas</p>
            </div>

            {/* Summary Strip */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'white', borderRadius: '18px', padding: '1.25rem 1.5rem',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Total Ingresos (Ventas+Abonos)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{totalRevenue.toLocaleString()} Bs.</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    style={{
                        background: 'white', borderRadius: '18px', padding: '1.25rem 1.5rem',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Movimientos</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{filteredIncome.length}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{
                        background: 'white', borderRadius: '18px', padding: '1.25rem 1.5rem',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Ticket Promedio</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>
                        {filteredIncome.length > 0 ? Math.round(totalRevenue / filteredIncome.length).toLocaleString() : 0} Bs.
                    </div>
                </motion.div>
            </div>

            {/* Sales Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="data-card"
            >
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Cliente / Pago</th>
                                <th>Fecha</th>
                                <th>Ítems</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIncome.map((s, i) => (
                                <tr key={i}>
                                    <td>
                                        <div style={{ fontWeight: 800 }}>{s.id}</div>
                                        <div style={{ fontSize: '0.65rem', color: s.sourceType === 'Venta' ? 'var(--success)' : 'var(--primary)', fontWeight: 900, textTransform: 'uppercase' }}>
                                            {s.sourceType}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}>
                                                <User size={12} /> {s.customer}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                💳 {s.payment_method || 'Efectivo'}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={13} />
                                            {s.date}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {(s.itemsDisplay || []).map((item, j) => (
                                            <div key={j} style={{ color: 'var(--text-muted)' }}>
                                                {item.name} <span style={{ fontWeight: 700 }}>×{item.qty || item.quantity}</span>
                                                <span style={{ fontSize: '0.7rem', marginLeft: '6px' }}>({(Number(item.price) || 0).toLocaleString()} Bs/u)</span>
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>+ {(Number(s.total) || 0).toLocaleString()} Bs.</td>
                                </tr>
                            ))}
                            {filteredIncome.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        <Receipt size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                        <p>No hay ventas registradas aún</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default Sales;
