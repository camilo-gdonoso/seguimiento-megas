import React from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Package, Hammer, DollarSign, ShoppingCart, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

const Reports = () => {
    const { assets, sales, projects, purchases, payments, expenses } = useApp();
    
    // Revenue: Sales + Project Payments (Cash In)
    const totalRevenue = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0) + 
                         payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
                         
    const totalStock = assets.reduce((acc, a) => acc + (Number(a.stock) || 0), 0);
    
    // Outflow Breakdown
    const totalPaidPurchases = purchases.filter(p => p.payment_status === 'Pagado').reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const totalGeneralExpenses = expenses.filter(e => !e.purchase_id).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalOutflow = totalPaidPurchases + totalGeneralExpenses;
    const activeProjects = projects.filter(p => (p.progress || 0) < 100).length;
    const completedProjects = projects.filter(p => (p.progress || 0) >= 100).length;
    const avgProgress = projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length) : 0;

    const kpis = [
        { label: 'Ingresos Totales', value: `${totalRevenue.toLocaleString()} Bs.`, icon: <DollarSign size={22} />, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Egresos (Pagos/Gastos)', value: `${totalOutflow.toLocaleString()} Bs.`, icon: <ShoppingCart size={22} />, color: '#ef4444', bg: '#fef2f2' },
        { label: 'Unidades en Stock', value: totalStock.toLocaleString(), icon: <Package size={22} />, color: '#3b82f6', bg: '#eff6ff' },
        { label: 'Órdenes de Trabajo Activas', value: activeProjects, icon: <Hammer size={22} />, color: '#8b5cf6', bg: '#f5f3ff' },
    ];

    // Top products by stock value
    const topProducts = [...assets]
        .map(a => ({ ...a, totalValue: (Number(a.stock) || 0) * (Number(a.price) || 0) }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

    // Simple monthly data from sales and payments
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
        const mIdx = (currentMonth - i + 12) % 12;
        const monthSales = sales.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            return d.getMonth() === mIdx;
        });

        const monthPayments = payments.filter(p => {
            if (!p.date) return false;
            const d = new Date(p.date);
            return d.getMonth() === mIdx;
        });

        last6Months.push({
            month: monthNames[mIdx],
            total: monthSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0) + 
                   monthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
        });
    }
    const maxSale = Math.max(...last6Months.map(m => m.total), 1);

    return (
        <div className="reports slide-in">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>Indicadores de Gestión</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Resumen de rendimiento general del negocio</p>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {kpis.map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        style={{
                            background: 'white', borderRadius: '20px', padding: '1.5rem',
                            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                            <div style={{ width: 42, height: 42, borderRadius: '12px', background: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {kpi.icon}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>{kpi.value}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</div>
                    </motion.div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                {/* Sales Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        background: 'white', borderRadius: '24px', padding: '2rem',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Ventas por Mes</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px', paddingBottom: '2rem' }}>
                        {last6Months.map((m, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                    {m.total > 0 ? `${(m.total / 1000).toFixed(1)}k` : '0'}
                                </span>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((m.total / maxSale) * 100, 4)}%` }}
                                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                                    style={{
                                        width: '100%', maxWidth: '50px',
                                        borderRadius: '8px 8px 4px 4px',
                                        background: m.total > 0 ? 'linear-gradient(180deg, var(--primary), var(--accent))' : '#e2e8f0',
                                    }}
                                />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{m.month}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Top Products */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        background: 'white', borderRadius: '24px', padding: '2rem',
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    }}
                >
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>Top Productos por Valor</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {topProducts.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.stock} uds × {(p.price || 0).toLocaleString()} Bs.</div>
                                </div>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{p.totalValue.toLocaleString()} Bs.</div>
                            </div>
                        ))}
                        {topProducts.length === 0 && (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No hay productos</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Project Progress Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                    background: 'white', borderRadius: '24px', padding: '2rem', marginTop: '1.5rem',
                    border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{activeProjects}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Órdenes de Trabajo Activas</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{completedProjects}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completados</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{avgProgress}%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Progreso Promedio</div>
                </div>
            </motion.div>
        </div>
    );
};

export default Reports;
