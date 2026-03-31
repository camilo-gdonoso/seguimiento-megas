import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
    Users, UserPlus, Trash2, Phone, Briefcase, 
    Calendar, DollarSign, Search, Filter, 
    Edit3, ChevronRight, CheckCircle2, XCircle,
    Clock, CreditCard, Fingerprint, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

const Personnel = () => {
    const { 
        personnel, addPersonnel, updatePersonnel, deletePersonnel, 
        activeRole, projects, personnelPayments, addPersonnelPayment, deletePersonnelPayment 
    } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('Todos');
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPersonForPayment, setSelectedPersonForPayment] = useState(null);
    const [editingPerson, setEditingPerson] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });
    const [newPayment, setNewPayment] = useState({ 
        amount: '', 
        date: new Date().toISOString().split('T')[0], 
        request_date: new Date().toISOString().split('T')[0],
        method: 'Efectivo', 
        notes: '', 
        project_id: '' 
    });
    const [formData, setFormData] = useState({
        name: '',
        role: 'Carpintería',
        type: 'Ocasional',
        phone: '',
        status: 'Activo',
        carnet: '',
        last_payment_method: 'Efectivo',
        last_payment_date: ''
    });

    const roles = ['Carpintería', 'Pintura', 'Instalación', 'Ayudante', 'Diseño', 'Otros'];
    const types = ['Permanente', 'Ocasional'];

    const filteredPersonnel = personnel.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (p.phone && p.phone.includes(searchTerm));
        const matchesRole = filterRole === 'Todos' || p.role === filterRole;
        
        // Excluir personal con roles de ERP
        const erpRoles = ['Vendedor/Cajero', 'Almacén', 'Producción', 'Contador'];
        const isNotERP = !erpRoles.includes(p.role);

        return matchesSearch && matchesRole && isNotERP;
    });

    const totalPlanilla = filteredPersonnel.reduce((acc, p) => acc + (Number(p.salary_base) || 0), 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingPerson) {
            updatePersonnel(editingPerson.id, formData);
        } else {
            addPersonnel(formData);
        }
        setShowModal(false);
        setEditingPerson(null);
        setFormData({ 
            name: '', role: 'Carpintería', type: 'Ocasional', phone: '', status: 'Activo',
            carnet: '', last_payment_method: 'Efectivo', last_payment_date: ''
        });
    };

    const generateReceipt = (person, payment) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(184, 134, 11); // Mismo Dorado de la app
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('INFRABOL', 105, 18, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Servicios de Carpintería y Obras', 105, 26, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('RECIBO DE PAGO AL PERSONAL', 105, 34, { align: 'center' });

        // Body
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleString()}`, 145, 50);

        // Recipient Info Section
        doc.setDrawColor(226, 232, 240);
        doc.line(20, 55, 190, 55);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL BENEFICIARIO', 20, 65);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Nombre Completo: ${person.name}`, 20, 75);
        doc.text(`C.I. / Carnet: ${person.carnet || 'S/N'}`, 20, 82);
        doc.text(`Especialidad / Rol: ${person.role}`, 20, 89);
        doc.text(`Tipo de Contrato: ${person.type}`, 20, 96);

        // Payment Details Box
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 105, 170, 55, 'F');
        doc.setDrawColor(184, 134, 11);
        doc.setLineWidth(0.5);
        doc.rect(20, 105, 170, 55, 'S');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLES DEL DESEMBOLSO', 25, 115);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Monto Percibido:`, 25, 125);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`${Number(payment.amount).toLocaleString()} Bs.`, 100, 125);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Método de Pago:`, 25, 132);
        doc.text(`${payment.method}`, 100, 132);
        
        doc.text(`Fecha de Requerimiento:`, 25, 139);
        doc.text(`${payment.request_date || 'No registrada'}`, 100, 139);

        doc.text(`Fecha de Pago:`, 25, 146);
        doc.text(`${payment.date}`, 100, 146);

        // Optional Project info
        if (payment.project_id) {
            const project = projects.find(pj => pj.id == payment.project_id);
            if (project) {
                doc.text(`Orden de Trabajo Asociada:`, 25, 153);
                doc.setFont('helvetica', 'italic');
                doc.text(`${project.name}`, 100, 153);
            }
        }

        if (payment.notes) {
            doc.setFont('helvetica', 'bold');
            doc.text('Glosa / Observaciones:', 20, 165);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(payment.notes, 20, 172, { maxWidth: 170 });
        }

        // Space for signatures
        doc.setFontSize(9);
        doc.line(40, 230, 90, 230);
        doc.text('Firma Recibí Conforme', 48, 236);
        doc.setFontSize(8);
        doc.text(`CI: ${person.carnet || '_________'}`, 48, 241);
        
        doc.setFontSize(9);
        doc.line(130, 230, 180, 230);
        doc.text('Sello y Firma INFRABOL', 135, 236);

        // Security Footnote
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Documento generado digitalmente por el Sistema ERP de INFRABOL.', 105, 270, { align: 'center' });

        doc.save(`RECIBO_${person.name.replace(' ', '_')}_${payment.date}.pdf`);
    };

    const openEdit = (person) => {
        setEditingPerson(person);
        setFormData({
            name: person.name,
            role: person.role,
            type: person.type || 'Ocasional',
            phone: person.phone || '',
            status: person.status,
            carnet: person.carnet || ''
        });
        setShowModal(true);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();

        if (!newPayment.project_id) {
            addNotification('Por favor selecciona una orden de trabajo para este pago.', 'info');
            return;
        }

        const monto = Number(newPayment.amount);
        if (monto <= 0) {
            addNotification('El monto debe ser mayor a cero.', 'info');
            return;
        }

        // --- VALIDACIÓN DE SALDO ---
        const proj = projects.find(p => p.id === newPayment.project_id);
        const workerInProj = proj?.workers?.find(w => w.personnel_id === selectedPersonForPayment.id || w.name === selectedPersonForPayment.name);
        
        const totalAcordado = Number(workerInProj?.salary) || 0;
        const abonoPrevio = personnelPayments
            .filter(p => p.personnel_id === selectedPersonForPayment.id && p.project_id === newPayment.project_id)
            .reduce((acc, p) => acc + Number(p.amount), 0);
        
        const saldoPendiente = totalAcordado - abonoPrevio;

        if (saldoPendiente <= 0 && totalAcordado > 0) {
            addNotification(`ATENCIÓN: La cuenta para "${selectedPersonForPayment.name}" en la orden de trabajo "${proj?.name}" YA ESTÁ SALDADA.`, 'info');
            return;
        }

        if (monto > saldoPendiente && totalAcordado > 0) {
            if (!window.confirm(`El monto (${monto} Bs.) supera el saldo pendiente (${saldoPendiente} Bs.). ¿Deseas registrar este excedente?`)) {
                return;
            }
        }
        // --- FIN VALIDACIÓN ---

        const paymentData = {
            ...newPayment,
            personnel_id: selectedPersonForPayment.id
        };
        await addPersonnelPayment(paymentData);
        
        // Preguntar si desea generar recibo
        if (window.confirm('¿Deseas generar el recibo de pago PDF ahora?')) {
            generateReceipt(selectedPersonForPayment, paymentData);
        }
        
        setNewPayment({ 
            amount: '', 
            date: new Date().toISOString().split('T')[0], 
            request_date: new Date().toISOString().split('T')[0],
            method: 'Efectivo', 
            notes: '', 
            project_id: '' 
        });
        setShowPaymentModal(false);
    };

    return (
        <div className="personnel-page slide-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>Gestión de Personal Ocasional</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Seguimiento de requerimientos y pagos por obra</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={() => {
                            setEditingPerson(null);
                            setFormData({ 
                                name: '', role: 'Carpintería', type: 'Ocasional', phone: '', status: 'Activo',
                                carnet: '', last_payment_method: 'Efectivo', last_payment_date: ''
                            });
                            setShowModal(true);
                        }}
                        className="btn-primary" 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                    >
                        <UserPlus size={18} /> Registrar Persona Ocasional
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{ 
                display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'white', 
                padding: '1rem', borderRadius: '18px', border: '1px solid var(--border)',
                alignItems: 'center'
            }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o teléfono..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Todos', ...roles].map(r => (
                        <button 
                            key={r}
                            onClick={() => setFilterRole(r)}
                            style={{ 
                                padding: '8px 16px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700,
                                border: '1px solid var(--border)',
                                background: filterRole === r ? 'var(--secondary)' : 'white',
                                color: filterRole === r ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Personnel Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredPersonnel.map(person => {
                    const assignedProjects = projects.filter(proj => 
                        (proj.workers || []).some(w => w.name === person.name)
                    );

                    return (
                        <motion.div 
                            layout
                            key={person.id}
                            className="data-card"
                            style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ 
                                        width: 50, height: 50, borderRadius: '16px', 
                                        background: person.status === 'Activo' ? '#ecfdf5' : '#fef2f2', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: person.status === 'Activo' ? '#10b981' : '#ef4444',
                                        fontSize: '1.2rem', fontWeight: 800
                                    }}>
                                        {person.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary)' }}>{person.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            <Briefcase size={12} /> {person.role} • {person.type}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button onClick={() => openEdit(person)} className="icon-btn" style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', color: 'var(--primary)' }}><Edit3 size={14} /></button>
                                    <button onClick={() => setConfirmDelete({ isOpen: true, id: person.id, name: person.name })} className="icon-btn" style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#ef4444' }}><Trash2 size={14} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Carnet / CI</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Fingerprint size={12} /> {person.carnet || 'S/N'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Contacto</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Phone size={12} /> {person.phone || 'S/N'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '14px', marginBottom: '1.5rem', border: '1px solid #e0f2fe' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 800, textTransform: 'uppercase' }}>HISTORIAL DE PAGOS</div>
                                    <button 
                                        onClick={() => { setSelectedPersonForPayment(person); setShowPaymentModal(true); }}
                                        style={{ fontSize: '0.65rem', background: '#0369a1', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                    >
                                        Ver / Pagar
                                    </button>
                                </div>
                                {(() => {
                                    const history = personnelPayments.filter(pay => String(pay.personnel_id) === String(person.id));
                                    const lastPay = history[0]; // Assuming sorted by desc
                                    if (!lastPay) return <div style={{ fontSize: '0.8rem', color: '#0369a1', fontStyle: 'italic' }}>Sin pagos registrados</div>;
                                    return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CreditCard size={12} /> {lastPay.amount.toLocaleString()} Bs. ({lastPay.method})
                                            </div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1' }}>
                                                {new Date(lastPay.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ÓRDENES DE TRABAJO ACTIVAS</span>
                                    <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 900 }}>{assignedProjects.length}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {assignedProjects.length > 0 ? assignedProjects.map(proj => (
                                        <div key={proj.id} style={{ fontSize: '0.65rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, color: '#475569' }}>
                                            {proj.name}
                                        </div>
                                    )) : (
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin asignaciones actuales</div>
                                    )}
                                </div>
                            </div>

                            {/* Status Stripe */}
                            <div style={{ 
                                position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', 
                                background: person.status === 'Activo' ? '#10b981' : '#ef4444' 
                            }} />
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.form 
                            onSubmit={handleSubmit}
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}
                        >
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>{editingPerson ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Nombre Completo</label>
                                    <input 
                                        type="text" required
                                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Especialidad / Rol</label>
                                        <select 
                                            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'white' }}
                                        >
                                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Teléfono</label>
                                        <input 
                                            type="text" 
                                            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Carnet de Identidad (CI)</label>
                                        <input 
                                            type="text" 
                                            value={formData.carnet} onChange={e => setFormData({...formData, carnet: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            placeholder="Ej: 1234567 LP"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Estado Laboral</label>
                                        <select 
                                            value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'white' }}
                                        >
                                            <option value="Activo">🟢 Activo / Trabajando</option>
                                            <option value="Inactivo">🔴 Inactivo / De Baja</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                                <button 
                                    type="button" onClick={() => setShowModal(false)}
                                    style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {editingPerson ? 'Guardar Cambios' : 'Registrar Persona Ocasional'}
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal for Payments History */}
            <AnimatePresence>
                {showPaymentModal && selectedPersonForPayment && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontWeight: 800 }}>Requerimientos y Pagos - {selectedPersonForPayment.name}</h2>
                                <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleAddPayment} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '1rem' }}>REGISTRAR NUEVO REQUERIMIENTO / PAGO</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Orden de Trabajo</label>
                                        <select 
                                            required
                                            value={newPayment.project_id} onChange={e => setNewPayment({...newPayment, project_id: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white' }}
                                        >
                                            <option value="">Seleccionar Orden de Trabajo...</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Fecha de Solicitud/Requerimiento</label>
                                        <input 
                                            type="date" required
                                            value={newPayment.request_date} onChange={e => setNewPayment({...newPayment, request_date: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Monto a Pagar (Bs.)</label>
                                        <input 
                                            type="number" required placeholder="0.00"
                                            value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Fecha de Pago (Efectivo hoy)</label>
                                        <input 
                                            type="date" required
                                            value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Método de Pago</label>
                                        <select 
                                            value={newPayment.method} onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white' }}
                                        >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="Cheque">Cheque</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ background: 'white', padding: '12px', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                    {(() => {
                                        const proj = projects.find(p => p.id === newPayment.project_id);
                                        const workerInProj = proj?.workers?.find(w => w.personnel_id === selectedPersonForPayment.id || w.name === selectedPersonForPayment.name);
                                        
                                        // If project selected, use project salary. Else use base salary.
                                        const totalSalary = newPayment.project_id ? (Number(workerInProj?.salary) || 0) : (Number(selectedPersonForPayment.salary_base) || 0);
                                        const abono = personnelPayments
                                            .filter(p => p.personnel_id === selectedPersonForPayment.id && p.project_id === newPayment.project_id)
                                            .reduce((acc, p) => acc + Number(p.amount), 0);
                                        const pending = totalSalary - abono;

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Sueldo total</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{totalSalary.toLocaleString()} Bs.</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Abono</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{abono.toLocaleString()} Bs.</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Monto pendiente</div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: pending > 0 ? '#ef4444' : '#10b981' }}>{pending.toLocaleString()} Bs.</div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>Notas</label>
                                    <input 
                                        type="text" placeholder="Concepto (ej. Sueldo Mayo, Anticipo...)"
                                        value={newPayment.notes} onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                                        style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <button className="btn-primary" style={{ width: '100%', padding: '12px' }}>Confirmar Pago</button>
                            </form>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--secondary)' }}>HISTORIAL</h4>
                                {personnelPayments.filter(p => p.personnel_id === selectedPersonForPayment.id).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay registros aún.</div>
                                ) : (
                                    personnelPayments.filter(p => p.personnel_id === selectedPersonForPayment.id).map(p => {
                                        const proj = projects.find(pj => pj.id == p.project_id);
                                        return (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{Number(p.amount).toLocaleString()} Bs.</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{proj?.name || 'Obra Desconocida'}</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        Sol: {p.request_date || 'N/A'} • Pago: {p.date} • {p.method}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button 
                                                            onClick={() => generateReceipt(selectedPersonForPayment, p)} 
                                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }} 
                                                            title="Re-imprimir Recibo"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <button onClick={() => {if(window.confirm('¿Borrar registro?')) deletePersonnelPayment(p.id)}} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <ConfirmModal 
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
                onConfirm={() => deletePersonnel(confirmDelete.id)}
                title="¿Eliminar ficha de personal?"
                message={`Estás por eliminar a ${confirmDelete.name}. Esta acción no se puede deshacer y borrará su historial.`}
                confirmText="Eliminar permanentemente"
            />
        </div>
    );
};

export default Personnel;
