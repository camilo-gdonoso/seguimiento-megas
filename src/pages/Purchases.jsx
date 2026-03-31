import React, { useState } from 'react';
import { useApp, API_URL } from '../context/AppContext';
import axios from 'axios';
import { FileText, Users, ChevronRight, Plus, X, Download, CheckCircle2, PackageCheck, AlertTriangle, Package, DollarSign, ReceiptText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Purchases = () => {
    const { purchases, suppliers, assets, expenses, addSupplier, addPurchase, setPurchases, updateAsset, addAsset, addExpense, addNotification, actionTrigger, setActionTrigger, searchTerm } = useApp();
    const [activeTab, setActiveTab] = useState('orders');
    const [showModal, setShowModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(null); // holds order to pay
    const [isPaying, setIsPaying] = useState(false);

    // Receive flow modals
    const [confirmReceive, setConfirmReceive] = useState(null); // holds the order to confirm
    const [receiveResult, setReceiveResult] = useState(null);   // holds the result after processing
    const [isReceiving, setIsReceiving] = useState(false);       // loading state

    // Listen to global "Add New" button
    React.useEffect(() => {
        if (actionTrigger?.type === 'CREATE_NEW') {
            if (activeTab === 'suppliers') setShowModal(true);
            else setShowOrderModal(true);
            setActionTrigger(null); // Reset trigger
        }
    }, [actionTrigger, activeTab]);
    
    // Supplier State
    const [newSupplier, setNewSupplier] = useState({ name: '', nit: '', contact: '' });
    
    // Order State
    const [newOrder, setNewOrder] = useState({ supplier: '', items: [{ name: '', qty: 1, price: 0 }] });

    const handleAddSupplier = () => {
        if (!newSupplier.name || !newSupplier.nit) return alert('Nombre y NIT son obligatorios');
        addSupplier(newSupplier);
        setNewSupplier({ name: '', nit: '', contact: '' });
        setShowModal(false);
    };

    const handleAddOrder = () => {
        if (!newOrder.supplier) return alert('Seleccione un proveedor');
        
        // Filter and validate items
        const validItems = newOrder.items.filter(item => item.name && item.name.trim() !== '');
        if (validItems.length === 0) return alert('La orden debe tener al menos un ítem válido');
        
        const selectedSupplier = suppliers.find(s => s.name === newOrder.supplier);
        const total = validItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0);
        
        const purchase = {
            id: `ORD-${Date.now().toString().slice(-6)}`,
            supplier: newOrder.supplier,
            supplierNit: selectedSupplier?.nit || 'N/A',
            date: new Date().toISOString().split('T')[0],
            items: validItems,
            total,
            status: 'Pendiente',
            payment_status: 'Pendiente'
        };

        addPurchase(purchase);
        setShowOrderModal(false);
        setNewOrder({ supplier: '', items: [{ name: '', qty: 1, price: 0 }] });
    };

    const updateOrderItem = (index, field, value) => {
        const updated = [...newOrder.items];
        updated[index][field] = value;
        setNewOrder({ ...newOrder, items: updated });
    };

    const addOrderItem = () => {
        setNewOrder({ ...newOrder, items: [...newOrder.items, { name: '', qty: 1, price: 0 }] });
    };

    // Step 1: User clicks "Recibir" → show confirmation modal
    const handleReceiveClick = (pc) => {
        setConfirmReceive(pc);
    };

    // Step 2: User confirms → process receive
    const processReceiveOrder = async () => {
        const pc = confirmReceive;
        if (!pc) return;

        setIsReceiving(true);
        let syncedCount = 0;
        let createdCount = 0;
        const details = [];

        try {
            for (const item of (pc.items || [])) {
                if (!item.name || item.name.trim() === '') continue;
                const itemName = item.name.trim();

                const matchingAsset = assets.find(a => a.name.toLowerCase().trim() === itemName.toLowerCase());
                
                if (matchingAsset) {
                    const oldStock = Number(matchingAsset.stock) || 0;
                    const addedQty = Number(item.qty) || 0;
                    await updateAsset(matchingAsset.id, { 
                        stock: oldStock + addedQty,
                        price: Number(item.price) || matchingAsset.price
                    });
                    details.push({ name: itemName, action: 'updated', oldStock, newStock: oldStock + addedQty });
                    syncedCount++;
                } else {
                    const newAsset = {
                        name: itemName,
                        category: 'Materia Prima',
                        stock: Number(item.qty) || 0,
                        price: Number(item.price) || 0,
                        location: 'Bodega Principal',
                        barcode: `AUTO-${Math.floor(Math.random() * 10000)}`
                    };
                    await addAsset(newAsset);
                    details.push({ name: itemName, action: 'created', newStock: Number(item.qty) || 0 });
                    createdCount++;
                }
            }

            // Update purchase status — source of truth is the API
            const updatedPurchases = purchases.map(p => p.id === pc.id ? { ...p, status: 'Recibido' } : p);
            setPurchases(updatedPurchases);
            await axios.post(`${API_URL}/purchases`, { ...pc, status: 'Recibido' }).catch(console.error);

            // Show result modal
            addNotification(`Orden ${pc.id} recibida exitosamente`, 'success');
            setReceiveResult({ orderId: pc.id, syncedCount, createdCount, details, success: true });
        } catch (error) {
            console.error('Error processing receive:', error);
            setReceiveResult({ orderId: pc.id, syncedCount, createdCount, details, success: false, error: error.message });
        } finally {
            setIsReceiving(false);
            setConfirmReceive(null);
        }
    };

    const handleConfirmPayment = async (method) => {
        if (!showPaymentModal) return;
        setIsPaying(true);
        try {
            const pc = showPaymentModal;
            const expense = {
                description: `Pago Orden ${pc.id} - ${pc.supplier}`,
                amount: Number(pc.total),
                category: 'Orden de Trabajo',
                method: method,
                purchase_id: pc.id
            };
            
            await addExpense(expense);
            
            // Update purchase status
            const updatedPc = { ...pc, payment_status: 'Pagado' };
            await axios.post(`${API_URL}/purchases`, updatedPc);
            setPurchases(purchases.map(p => p.id === pc.id ? updatedPc : p));
            
            addNotification(`Pago registrado para la orden ${pc.id}`, 'success');
            setShowPaymentModal(null);
        } catch (error) {
            console.error('Error paying order:', error);
            addNotification('Error al registrar el pago', 'error');
        } finally {
            setIsPaying(false);
        }
    };

    const generatePDF = (pc) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setTextColor(44, 62, 80);
        doc.text('MueblesERP | Alta Gama', 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Orden de Compra', 14, 32);
        
        // Order Info
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`N° Orden: ${pc.id}`, 140, 22);
        doc.text(`Fecha: ${pc.date}`, 140, 28);
        
        // Supplier Info
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 40, 182, 30, 'F');
        doc.setFont(undefined, 'bold');
        doc.text('PROVEEDOR:', 20, 50);
        doc.setFont(undefined, 'normal');
        doc.text(`${pc.supplier}`, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text('NIT:', 20, 60);
        doc.setFont(undefined, 'normal');
        doc.text(`${pc.supplierNit}`, 50, 60);
        
        // Items Table
        const tableData = (pc.items || []).map(item => [
            item.name || 'Insumo',
            item.qty || 1,
            `${(item.price || 0).toLocaleString()} Bs.`,
            `${((item.qty || 1) * (item.price || 0)).toLocaleString()} Bs.`
        ]);

        autoTable(doc, {
            startY: 80,
            head: [['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
        });

        // Total
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL A PAGAR: ${pc.total.toLocaleString()} Bs.`, 130, finalY);

        doc.save(`Orden_${pc.id}.pdf`);
    };

    const generatePaymentReceipt = (expense) => {
        const doc = new jsPDF();
        
        // Professional Header
        doc.setFillColor(30, 41, 59); // Dark blue (slate-800)
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setFontSize(24);
        doc.setTextColor(255, 255, 255);
        doc.text('COMPROBANTE DE PAGO', 105, 25, { align: 'center' });
        
        // Content
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`N° Comprobante: REC-${expense.id}`, 14, 55);
        doc.text(`Fecha: ${expense.date}`, 140, 55);
        
        // Receipt Box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 65, 182, 80, 'FD');
        
        doc.setFontSize(11);
        doc.text('DETALLE DEL EGRESO', 20, 75);
        doc.line(20, 77, 60, 77);
        
        doc.setFont(undefined, 'normal');
        doc.text('Pagado a:', 20, 85);
        doc.setFont(undefined, 'bold');
        doc.text(expense.description.split(' - ')[1] || 'Proveedor', 60, 85);
        
        doc.setFont(undefined, 'normal');
        doc.text('Concepto:', 20, 95);
        doc.text('Liquidación de Orden de Compra', 60, 95);
        
        doc.text('Referencia:', 20, 105);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(expense.purchase_id || 'N/A', 60, 105);
        
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'normal');
        doc.text('Método de Pago:', 20, 115);
        doc.text(expense.method || 'Efectivo', 60, 115);
        
        // Amount Big Box
        doc.setFillColor(241, 245, 249);
        doc.rect(120, 125, 70, 15, 'F');
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('MONTO:', 125, 135);
        doc.text(`${Number(expense.amount).toLocaleString()} Bs.`, 150, 135);
        
        // Note
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(100);
        doc.text('Este documento es un comprobante interno de pago generado por el sistema Infrabol ERP.', 105, 160, { align: 'center' });
        
        // Seal/Signature placeholders
        doc.line(40, 210, 90, 210);
        doc.text('Firma Responsable', 65, 215, { align: 'center' });
        
        doc.line(120, 210, 170, 210);
        doc.text('Sello Empresa', 145, 215, { align: 'center' });
        
        doc.save(`Recibo_Pago_${expense.purchase_id}.pdf`);
    };

    const filteredPurchases = purchases.filter(p => 
        !searchTerm || 
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const filteredSuppliers = suppliers.filter(s => 
        !searchTerm || 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nit.includes(searchTerm)
    );

    return (
        <div className="purchases slide-in">
            <div className="purchases-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('orders')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px',
                            background: activeTab === 'orders' ? 'var(--secondary)' : 'white',
                            color: activeTab === 'orders' ? 'white' : 'var(--text-muted)',
                            borderRadius: '14px', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer'
                        }}
                    >
                        <FileText size={18} /> Historial de Órdenes
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
                        onClick={() => setActiveTab('suppliers')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px',
                            background: activeTab === 'suppliers' ? 'var(--secondary)' : 'white',
                            color: activeTab === 'suppliers' ? 'white' : 'var(--text-muted)',
                            borderRadius: '14px', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer'
                        }}
                    >
                        <Users size={18} /> Proveedores
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
                        onClick={() => setActiveTab('payments')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px',
                            background: activeTab === 'payments' ? 'var(--secondary)' : 'white',
                            color: activeTab === 'payments' ? 'white' : 'var(--text-muted)',
                            borderRadius: '14px', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer'
                        }}
                    >
                        <DollarSign size={18} /> Historial de Pagos
                    </button>
                </div>

                <button 
                    onClick={() => activeTab === 'orders' ? setShowOrderModal(true) : setShowModal(true)}
                    style={{
                        padding: '12px 24px', borderRadius: '14px', background: 'var(--primary)', color: 'white',
                        border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Plus size={18} />
                    {activeTab === 'orders' ? 'Nueva Orden' : 'Nuevo Proveedor'}
                </button>
            </div>

            {activeTab === 'orders' ? (
                <div className="data-card fade-in">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>N° Orden</th>
                                    <th>Proveedor</th>
                                    <th>NIT</th>
                                    <th>Fecha</th>
                                    <th>Total (Bs.)</th>
                                    <th>Estado Inv.</th>
                                    <th>Pago</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPurchases.map(pc => (
                                    <tr key={pc.id}>
                                        <td><strong>{pc.id}</strong></td>
                                        <td>{pc.supplier}</td>
                                        <td><code>{pc.supplierNit}</code></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{pc.date}</td>
                                        <td style={{ fontWeight: 800 }}>{pc.total.toLocaleString()} Bs.</td>
                                        <td>
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: pc.status === 'Recibido' ? '#dcfce7' : '#fef9c3', color: pc.status === 'Recibido' ? '#15803d' : '#854d0e' }}>
                                                {pc.status}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', background: pc.payment_status === 'Pagado' ? '#e0f2fe' : '#fee2e2', color: pc.payment_status === 'Pagado' ? '#0369a1' : '#b91c1c' }}>
                                                {pc.payment_status || 'Pendiente'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => generatePDF(pc)} 
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    <Download size={14} /> PDF
                                                </button>
                                                {pc.status === 'Pendiente' && (
                                                    <button 
                                                        onClick={() => handleReceiveClick(pc)} 
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--success)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        <CheckCircle2 size={14} /> Recibir
                                                    </button>
                                                )}
                                                {pc.payment_status !== 'Pagado' && (
                                                    <button 
                                                        onClick={() => setShowPaymentModal(pc)} 
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f59e0b', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        <DollarSign size={14} /> Pagar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPurchases.length === 0 && (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No se encontraron órdenes</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'suppliers' ? (
                <div className="data-card fade-in">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>NIT Fiscal</th>
                                    <th>Contacto</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((s, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800 }}>{s.name}</td>
                                        <td><code>{s.nit}</code></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{s.contact || 'N/A'}</td>
                                        <td><button onClick={() => alert(`Detalles del proveedor: ${s.name}`)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronRight size={16} /></button></td>
                                    </tr>
                                ))}
                                {filteredSuppliers.length === 0 && (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No se encontraron proveedores</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="data-card fade-in">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Orden Ref.</th>
                                    <th>Proveedor / Concepto</th>
                                    <th>Monto</th>
                                    <th>Método</th>
                                    <th>Comprobante</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.filter(e => e.purchase_id).map((e, i) => (
                                    <tr key={i}>
                                        <td className="text-muted">{e.date}</td>
                                        <td><span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>{e.purchase_id}</span></td>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{e.description.split(' - ')[1] || 'Proveedor'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pago de Insumos / Materia Prima</div>
                                        </td>
                                        <td style={{ color: '#ef4444', fontWeight: 800 }}>- {Number(e.amount).toLocaleString()} Bs.</td>
                                        <td>
                                            <span style={{ 
                                                padding: '4px 10px', background: '#f8fafc', borderRadius: '8px', 
                                                fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border)' 
                                            }}>
                                                {e.method}
                                            </span>
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => generatePaymentReceipt(e)} 
                                                style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    background: 'white', border: '1px solid var(--primary)', 
                                                    color: 'var(--primary)', padding: '6px 14px', borderRadius: '10px',
                                                    fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                                                }}
                                            >
                                                <ReceiptText size={14} /> Descargar Recibo
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {expenses.filter(e => e.purchase_id).length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                                            <DollarSign size={32} style={{ margin: '0 auto 10px', display: 'block' }} />
                                            No hay pagos registrados vinculados a sus compras aún
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '450px', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
                        >
                            <button 
                                onClick={() => setShowModal(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={24} />
                            </button>
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Nuevo Proveedor</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Nombre de la Empresa</label>
                                    <input 
                                        type="text" 
                                        value={newSupplier.name} 
                                        onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>NIT Fiscal</label>
                                    <input 
                                        type="text" 
                                        value={newSupplier.nit} 
                                        onChange={(e) => setNewSupplier({...newSupplier, nit: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Contacto / Teléfono</label>
                                    <input 
                                        type="text" 
                                        value={newSupplier.contact} 
                                        onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})}
                                        placeholder="Ej: Juan Perez (+591 ...)"
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                                <button 
                                    onClick={() => setShowModal(false)}
                                    style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAddSupplier}
                                    style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Guardar Proveedor
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showOrderModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
                        >
                            <button 
                                onClick={() => setShowOrderModal(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={24} />
                            </button>
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Generar Orden de Compra</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Proveedor</label>
                                    <select 
                                        value={newOrder.supplier}
                                        onChange={(e) => setNewOrder({...newOrder, supplier: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'white' }}
                                    >
                                        <option value="">Seleccionar proveedor...</option>
                                        {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Ítems de Compra</label>
                                        <button onClick={addOrderItem} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}>+ Añadir ítem</button>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {newOrder.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                                                <input 
                                                    placeholder="Insumo/Producto"
                                                    value={item.name}
                                                    onChange={(e) => updateOrderItem(idx, 'name', e.target.value)}
                                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                                />
                                                <input 
                                                    type="number"
                                                    placeholder="Cant."
                                                    value={item.qty}
                                                    onChange={(e) => updateOrderItem(idx, 'qty', parseInt(e.target.value))}
                                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                                />
                                                <input 
                                                    type="number"
                                                    placeholder="Precio U."
                                                    value={item.price}
                                                    onChange={(e) => updateOrderItem(idx, 'price', parseInt(e.target.value))}
                                                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700 }}>Total Estimado:</span>
                                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>
                                        {newOrder.items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0).toLocaleString()} Bs.
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                                <button 
                                    onClick={() => setShowOrderModal(false)}
                                    style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleAddOrder}
                                    style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Confirmar Orden
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ===== CONFIRM RECEIVE MODAL ===== */}
                {confirmReceive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isReceiving && setConfirmReceive(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 2000,
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white', borderRadius: '28px',
                                width: '100%', maxWidth: '480px', overflow: 'hidden',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                padding: '2rem', textAlign: 'center', color: 'white',
                            }}>
                                <PackageCheck size={44} style={{ margin: '0 auto 12px' }} />
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>Confirmar Recepción</h2>
                                <p style={{ opacity: 0.9, fontSize: '0.85rem' }}>Se actualizará el inventario automáticamente</p>
                            </div>

                            {/* Order Details */}
                            <div style={{ padding: '1.5rem 2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    <span><strong style={{ color: '#1e293b' }}>Orden:</strong> {confirmReceive.id}</span>
                                    <span><strong style={{ color: '#1e293b' }}>Proveedor:</strong> {confirmReceive.supplier}</span>
                                </div>

                                <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Ítems a recibir:</p>
                                    {(confirmReceive.items || []).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < confirmReceive.items.length - 1 ? '1px solid #e2e8f0' : 'none', fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: 600 }}>{item.name || 'Sin nombre'}</span>
                                            <span style={{ color: '#64748b' }}>x{item.qty} — {(item.price || 0).toLocaleString()} Bs.</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                                    <span>Total de la Orden:</span>
                                    <span style={{ color: 'var(--primary)' }}>{confirmReceive.total.toLocaleString()} Bs.</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ padding: '1rem 2rem 1.5rem', display: 'flex', gap: '10px' }}>
                                <button
                                    disabled={isReceiving}
                                    onClick={() => setConfirmReceive(null)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={isReceiving}
                                    onClick={processReceiveOrder}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px', border: 'none',
                                        background: isReceiving ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                                        color: 'white', fontWeight: 700, cursor: isReceiving ? 'wait' : 'pointer',
                                        fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    }}
                                >
                                    {isReceiving ? (
                                        <><span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Procesando...</>
                                    ) : (
                                        <><PackageCheck size={16} /> Confirmar Recepción</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ===== RECEIVE RESULT MODAL ===== */}
                {receiveResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setReceiveResult(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 2001,
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white', borderRadius: '28px',
                                width: '100%', maxWidth: '450px', overflow: 'hidden',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                background: receiveResult.success ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                padding: '2rem', textAlign: 'center', color: 'white',
                            }}>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}>
                                    {receiveResult.success ? <CheckCircle2 size={48} style={{ margin: '0 auto 12px' }} /> : <AlertTriangle size={48} style={{ margin: '0 auto 12px' }} />}
                                </motion.div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>
                                    {receiveResult.success ? '¡Orden Recibida!' : 'Error al Procesar'}
                                </h2>
                                <p style={{ opacity: 0.9, fontSize: '0.85rem' }}>Orden {receiveResult.orderId}</p>
                            </div>

                            {/* Result Details */}
                            <div style={{ padding: '1.5rem 2rem' }}>
                                {/* Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{receiveResult.syncedCount}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Actualizados</p>
                                    </div>
                                    <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a' }}>{receiveResult.createdCount}</p>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Nuevos</p>
                                    </div>
                                </div>

                                {/* Details */}
                                {receiveResult.details && receiveResult.details.length > 0 && (
                                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1rem' }}>
                                        {receiveResult.details.map((d, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < receiveResult.details.length - 1 ? '1px solid #e2e8f0' : 'none', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Package size={14} style={{ color: d.action === 'created' ? '#16a34a' : '#2563eb' }} />
                                                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                                                </div>
                                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                                    {d.action === 'updated' ? `${d.oldStock} → ${d.newStock} uds.` : `+${d.newStock} uds. (nuevo)`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Close */}
                            <div style={{ padding: '1rem 2rem 1.5rem' }}>
                                <button
                                    onClick={() => setReceiveResult(null)}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                        color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                    }}
                                >
                                    Entendido
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* ===== PAYMENT MODAL ===== */}
                {showPaymentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !isPaying && setShowPaymentModal(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 2002,
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem',
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '400px', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
                        >
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>Registrar Pago</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Confirme el medio de pago para liquidar la orden <strong>{showPaymentModal.id}</strong> por un total de <strong>{showPaymentModal.total.toLocaleString()} Bs.</strong></p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button 
                                    disabled={isPaying}
                                    onClick={() => handleConfirmPayment('Efectivo')}
                                    style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>💵 Efectivo</span>
                                    <ChevronRight size={16} />
                                </button>
                                <button 
                                    disabled={isPaying}
                                    onClick={() => handleConfirmPayment('Transferencia')}
                                    style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>🏛️ Transferencia</span>
                                    <ChevronRight size={16} />
                                </button>
                                <button 
                                    disabled={isPaying}
                                    onClick={() => handleConfirmPayment('QR / Tigo Money')}
                                    style={{ padding: '16px', borderRadius: '16px', background: '#f8fafc', border: '1px solid var(--border)', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>📱 QR / Tigo Money</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <button 
                                onClick={() => setShowPaymentModal(null)}
                                style={{ width: '100%', marginTop: '2rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Purchases;
