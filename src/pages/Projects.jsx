import React from 'react';
import { useApp } from '../context/AppContext';
import { 
    Settings, Share2, User, Calendar, X, CheckCircle2, 
    LayoutGrid, Plus, History, DollarSign, Wallet, 
    ArrowRight, Trash2, Hammer, Paintbrush, Ruler, 
    Users, Briefcase, FileText, Package, Wrench, 
    TrendingUp, ClipboardCheck, AlertTriangle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

const Projects = () => {
    const { 
        projects, updateProject, addProject, deleteProject, setProjects, 
        actionTrigger, searchTerm, setActionTrigger, activeRole, 
        getPaymentsByProject, addPayment, deletePayment, addNotification,
        assets, addExpense, personnel, updateAsset, personnelPayments,
        addPersonnel, addAsset, suppliers, addPurchase, addPersonnelPayment
    } = useApp();

    const canManageFull = activeRole === 'Dueno' || activeRole === 'Vendedor';
    const isProduction = activeRole === 'Produccion';
    const canEditProgress = canManageFull || isProduction;

    const [selectedProject, setSelectedProject] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('details'); // details, personnel, supplies, tools, finances
    const [showPurchaseModal, setShowPurchaseModal] = React.useState(false);
    const [purchaseItems, setPurchaseItems] = React.useState([]);
    const [selectedSupplier, setSelectedSupplier] = React.useState('');
    const [payments, setPayments] = React.useState([]);
    const [newPayment, setNewPayment] = React.useState({ amount: '', method: 'Efectivo', notes: '' });
    const [isAddingPayment, setIsAddingPayment] = React.useState(false);
    
    // PaySlip states
    const [showPaySlip, setShowPaySlip] = React.useState(null);
    
    // States for workers, supplies, tools forms
    const [newWorker, setNewWorker] = React.useState({ id: '', name: '', role: 'Carpintería', salary: '', type: 'Ocasional', personnel_id: '' });
    const [newSupply, setNewSupply] = React.useState({ id: '', name: '', qty: '', actualQty: '', price: 0 });
    const [newTool, setNewTool] = React.useState({ name: '', returned: false });
    const [showWorkerSuggestions, setShowWorkerSuggestions] = React.useState(false);
    const [showSupplySuggestions, setShowSupplySuggestions] = React.useState(false);
    const [showToolSuggestions, setShowToolSuggestions] = React.useState(false);
    const [confirmModal, setConfirmModal] = React.useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: true });
    const [shareModal, setShareModal] = React.useState({ isOpen: false, url: '', name: '' });

    React.useEffect(() => {
        if (selectedProject?.id && isModalOpen) {
            fetchPayments();
        }
    }, [selectedProject?.id, isModalOpen]);

    const fetchPayments = async () => {
        if (!selectedProject?.id) return;
        const data = await getPaymentsByProject(selectedProject.id);
        setPayments(data);
    };

    // Global "New Project" trigger
    React.useEffect(() => {
        if (actionTrigger?.type === 'CREATE_NEW' && canManageFull) {
            handleCreateNew();
            setActionTrigger(null);
        }
    }, [actionTrigger]);

    const handleCreateNew = () => {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const newP = { 
            id: `P-${Math.floor(Date.now()/100000)}`, 
            name: '', 
            client: '', 
            progress: 0, 
            type: 'Pedido a Medida', 
            stage: 'Diseño',
            budget: '', 
            paid: 0,
            workers: [],
            supplies: [],
            tools: [],
            start_date: today,
            end_date: nextMonth
        };
        setSelectedProject(newP);
        setActiveTab('details');
        setIsModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedProject) return;
        if (!selectedProject.name.trim()) {
            addNotification('El nombre de la orden es obligatorio', 'info');
            return;
        }

        const projectToSave = {
            ...selectedProject,
            budget: Number(selectedProject.budget) || 0,
            workers: selectedProject.workers || [],
            supplies: selectedProject.supplies || [],
            tools: selectedProject.tools || []
        };

        const existing = projects.find(p => p.id === selectedProject.id);
        const isNowReady = selectedProject.stage === 'Listo' && (!existing || existing.stage !== 'Listo');

        if (existing) {
            await updateProject(selectedProject.id, projectToSave);
        } else {
            await addProject({
                ...projectToSave,
                date: new Date().toISOString().split('T')[0],
            });
        }

        // Logic for finalization adjustment
        if (isNowReady) {
            let toPurchase = [];
            for (const supply of selectedProject.supplies) {
                const est = Number(supply.qty) || 0;
                const act = Number(supply.actualQty) || est; // Default to est if act is empty
                const diff = act - est;

                const matchingAsset = assets.find(a => a.name.toLowerCase() === supply.name.toLowerCase());
                if (matchingAsset) {
                    if (diff !== 0) {
                        await updateAsset(matchingAsset.id, {
                            stock: (Number(matchingAsset.stock) || 0) - diff
                        });
                    }

                    // Check if final stock is negative to suggest purchase
                    const finalStock = (Number(matchingAsset.stock) || 0) - diff;
                    if (finalStock < 0) {
                        toPurchase.push({
                            name: matchingAsset.name,
                            qty: Math.abs(finalStock),
                            price: matchingAsset.price || 0
                        });
                    }
                }
            }

            if (toPurchase.length > 0) {
                setPurchaseItems(toPurchase);
                setShowPurchaseModal(true);
            }
        }

        setIsModalOpen(false);
    };

    const handleConfirmPurchase = async () => {
        if (!selectedSupplier) {
            addNotification('Por favor seleccione un proveedor', 'info');
            return;
        }

        const purchase = {
            id: `ORD-${Date.now().toString().slice(-4)}`,
            supplier: selectedSupplier,
            supplierNit: suppliers.find(s => s.name === selectedSupplier)?.nit || 'N/A',
            date: new Date().toISOString().split('T')[0],
            items: purchaseItems.map(item => ({
                name: item.name,
                qty: item.qty,
                price: item.price
            })),
            total: purchaseItems.reduce((acc, item) => acc + (item.qty * item.price), 0),
            status: 'Pendiente',
            payment_status: 'Pendiente'
        };

        await addPurchase(purchase);
        setShowPurchaseModal(false);
        setPurchaseItems([]);
        setSelectedSupplier('');
    };

    // Workers Handlers
    const addWorkerToProject = async () => {
        if (!newWorker.name) return addNotification('Ingresa el nombre del trabajador', 'info');
        if (!newWorker.salary && newWorker.salary !== 0) return addNotification('Ingresa el monto o pago pactado', 'info');
        
        let workerToAssign = { ...newWorker };
        
        // 1. Verificar si ya existe en la base de datos de Personal por nombre antes de crear duplicados
        if (!workerToAssign.personnel_id) {
            const existing = personnel.find(p => p.name.toLowerCase().trim() === workerToAssign.name.toLowerCase().trim());
            if (existing) {
                workerToAssign.personnel_id = existing.id;
            }
        }
        
        // 2. Si realmente es nuevo, registrarlo en la base de datos global de Personal
        if (!workerToAssign.personnel_id) {
            try {
                const newPerson = await addPersonnel({
                    name: workerToAssign.name,
                    role: workerToAssign.role,
                    type: workerToAssign.type || 'Ocasional', 
                    status: 'Activo',
                    phone: '',
                    carnet: '',
                    salary_base: Number(workerToAssign.salary) || 0
                });
                
                if (newPerson && newPerson.id) {
                    workerToAssign.personnel_id = newPerson.id;
                } else {
                    // Si falló el registro global, no lo agregamos a la obra para evitar desincronías
                    return;
                }
            } catch (err) {
                console.error("Error al registrar personal desde obra:", err);
                addNotification('Error al registrar nuevo personal', 'error');
                return;
            }
        }

        setSelectedProject(prev => {
            const workers = [...(prev.workers || []), { 
                ...workerToAssign, 
                salary: Number(workerToAssign.salary) || 0,
                id: Date.now() 
            }];
            return { ...prev, workers };
        });
        
        setNewWorker({ id: '', name: '', role: 'Carpintería', salary: '', type: 'Ocasional', personnel_id: '' });
    };

    const removeWorker = (id) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Remover trabajador?',
            message: 'El trabajador dejará de aparecer en la lista de esta obra.',
            isDanger: true,
            onConfirm: () => {
                const workers = selectedProject.workers.filter(w => w.id !== id);
                setSelectedProject({ ...selectedProject, workers });
            }
        });
    };

    const toggleWorkerPaid = async (id) => {
        const worker = selectedProject.workers.find(w => w.id === id);
        if (!worker) return;
        
        // Calculate remaining balance
        const workerPayments = personnelPayments.filter(p => 
            String(p.personnel_id) === String(worker.personnel_id) && 
            (String(p.project_id) === String(selectedProject.id))
        );
        const amountPaid = workerPayments.reduce((acc, p) => acc + Number(p.amount), 0);
        const balance = Math.max(0, Number(worker.salary) - amountPaid);

        if (balance > 0) {
            setConfirmModal({
                isOpen: true,
                title: '¿Registrar pago?',
                message: `¿Deseas registrar el pago de ${worker.name} (${balance} Bs.) como un gasto global y en su historial de personal?`,
                isDanger: false,
                onConfirm: async () => {
                    await addPersonnelPayment({
                        personnel_id: worker.personnel_id,
                        project_id: selectedProject.id,
                        amount: balance,
                        date: new Date().toISOString().split('T')[0],
                        method: 'Efectivo',
                        notes: `Pago Saldo - Obra: ${selectedProject.name}`
                    });
                    
                    // Update project local state too (deprecated if we use balance calc but good for safety)
                    const workers = selectedProject.workers.map(w => w.id === id ? { ...w, paid: true } : w);
                    setSelectedProject({ ...selectedProject, workers });
                }
            });
        }
    };

    // Supplies Handlers
    const addSupplyToProject = async () => {
        if (!newSupply.name || !newSupply.qty) return addNotification('Ingresa el nombre y la cantidad', 'info');
        
        const asset = assets.find(a => a.name.toLowerCase() === newSupply.name.toLowerCase());
        const consumeQty = Number(newSupply.qty);

        const finishAdd = async () => {
            let finalAsset = asset;
            if (!finalAsset) {
                try {
                    // Si no existe, lo creamos con stock NEGATIVO de una vez y el precio
                    finalAsset = await addAsset({
                        name: newSupply.name,
                        category: 'Materia Prima',
                        price: Number(newSupply.price) || 0,
                        stock: -consumeQty, 
                        location: 'Almacén Central'
                    });
                } catch (err) {
                    console.error("Error al registrar insumo:", err);
                }
            } else {
                // Si existe, actualizamos stock y precio. Pasamos el objeto actual para evitar race conditions
                await updateAsset(finalAsset.id, { 
                    stock: (Number(finalAsset.stock) || 0) - consumeQty,
                    price: Number(newSupply.price) || finalAsset.price || 0
                }, finalAsset);
            }

            setSelectedProject(prev => {
                const supplies = [...(prev.supplies || []), { ...newSupply, actualQty: newSupply.qty, id: Date.now() }];
                return { ...prev, supplies };
            });
            setNewSupply({ id: '', name: '', qty: '', actualQty: '', price: 0, personnel_id: '' });
        };

        if (asset && asset.stock < consumeQty) {
            setConfirmModal({
                isOpen: true,
                title: 'Stock Insuficiente',
                message: `Solo tienes ${asset.stock} en stock. ¿Deseas usar lo que hay y quedar en inventario negativo?`,
                isDanger: true,
                onConfirm: finishAdd
            });
            return;
        }

        finishAdd();
    };

    const removeSupply = (id) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Quitar material?',
            message: '¿Deseas devolver este material al inventario del almacén?',
            isDanger: true,
            onConfirm: async () => {
                const supply = selectedProject.supplies.find(s => s.id === id);
                if (supply) {
                    const asset = assets.find(a => a.name.toLowerCase() === supply.name.toLowerCase());
                    if (asset) {
                        await updateAsset(asset.id, { stock: Number(asset.stock) + Number(supply.qty) }, asset);
                        addNotification(`Se devolvieron ${supply.qty} ${supply.name || 'unidades'} al inventario real.`, 'info');
                    }
                }
                const supplies = selectedProject.supplies.filter(s => s.id !== id);
                setSelectedProject({ ...selectedProject, supplies });
            }
        });
    };

    // Tools Handlers
    const addToolToProject = async () => {
        if (!newTool.name) return;
        
        let existingAsset = assets.find(a => a.name.toLowerCase() === newTool.name.toLowerCase() && a.category === 'Herramientas');
        
        if (!existingAsset) {
            try {
                // Registrar nueva herramienta directamente asignada
                existingAsset = await addAsset({
                    name: newTool.name,
                    category: 'Herramientas',
                    price: 0,
                    stock: 0,
                    location: `Asignado a: ${selectedProject.name}`
                });
            } catch (err) {
                console.error("Error al registrar herramienta:", err);
            }
        } else {
            // Si ya existe, solo cambiamos su ubicación
            await updateAsset(existingAsset.id, { 
                location: `Asignado a: ${selectedProject.name}`
            }, existingAsset);
        }

        const tools = [...(selectedProject.tools || []), { ...newTool, id: Date.now() }];
        setSelectedProject({ ...selectedProject, tools });
        setNewTool({ name: '', returned: false });
    };

    const removeTool = (id) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Quitar herramienta?',
            message: 'Se eliminará el registro de esta herramienta en la obra y se marcará como Disponible en el inventario.',
            isDanger: true,
            onConfirm: async () => {
                const toolToRemove = selectedProject.tools.find(t => t.id === id);
                if (toolToRemove) {
                    // Buscar la herramienta en inventario global para resetear su ubicación
                    const asset = assets.find(a => a.name.toLowerCase() === toolToRemove.name.toLowerCase() && a.category === 'Herramientas');
                    if (asset) {
                        await updateAsset(asset.id, { 
                            location: 'Almacén Central'
                        }, asset);
                    }
                }
                const tools = selectedProject.tools.filter(t => t.id !== id);
                setSelectedProject({ ...selectedProject, tools });
            }
        });
    };

    const toggleToolReturned = (id) => {
        const tools = selectedProject.tools.map(t => t.id === id ? { ...t, returned: !t.returned } : t);
        setSelectedProject({ ...selectedProject, tools });
    };

    const filteredProjects = projects.filter(p => 
        !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleIcon = (role) => {
        switch(role) {
            case 'Pintura': return <Paintbrush size={16} />;
            case 'Carpintería': return <Hammer size={16} />;
            default: return <Ruler size={16} />;
        }
    };

    return (
        <div className="projects-container slide-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '4px' }}>Gestión de Orden de Trabajo</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Seguimiento detallado de obras en curso</p>
                </div>
                {canManageFull && (
                    <button 
                        onClick={handleCreateNew} 
                        className="btn-primary" 
                        style={{ padding: '12px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, boxShadow: '0 8px 15px -5px rgba(184,134,11,0.3)' }}
                    >
                        <Plus size={20} /> Nueva Orden de Trabajo
                    </button>
                )}
            </div>
            <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredProjects.map((p, i) => (
                    <motion.div 
                        key={p.id}
                        className="project-card-premium"
                        style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', background: p.type === 'Remodelación' ? '#fdf2f8' : '#eff6ff', color: p.type === 'Remodelación' ? '#9d174d' : '#1e40af' }}>
                                {p.type || 'Pedido'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{p.id}</div>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.4rem' }}>{p.name}</h3>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                            <User size={14} />
                            <span>{p.client}</span>
                        </div>

                        <div className="p-progress-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 700 }}>{p.stage || 'Progreso'}</span>
                                <strong style={{ color: 'var(--primary)' }}>{p.progress}%</strong>
                            </div>
                            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.progress}%` }}
                                    style={{ height: '100%', borderRadius: '10px', background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <Briefcase size={12} />
                                <span>{(p.workers || []).length} Trabajadores</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button 
                                    onClick={() => { setSelectedProject(p); setIsModalOpen(true); }}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                                >
                                    <Settings size={16} />
                                </button>
                                <button 
                                    onClick={() => {
                                        const url = `${window.location.origin}/track/${p.id}`;
                                        setShareModal({ isOpen: true, url, name: p.name });
                                    }}
                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}
                                    title="Compartir enlace de seguimiento"
                                >
                                    <Share2 size={16} />
                                </button>
                                {canManageFull && (
                                    <button 
                                        onClick={() => {
                                            setConfirmModal({
                                                isOpen: true,
                                                title: '¿Eliminar orden de trabajo?',
                                                message: `Estás por eliminar "${p.name}". Se borrarán todos los registros de personal, materiales y pagos asociados. ¿Continuar?`,
                                                onConfirm: () => deleteProject(p.id)
                                            });
                                        }}
                                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && selectedProject && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2rem', borderRadius: '32px', width: '700px', maxWidth: '98vw', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}
                        >
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <X size={20} />
                            </button>
                            
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>
                                    {projects.find(p => p.id === selectedProject.id) ? 'Gestión de Orden de Trabajo' : 'Configurar Orden de Trabajo'}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>#{selectedProject.id} — Detalle administrativo y técnico</p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', paddingBottom: '4px' }}>
                                {[
                                    { id: 'details', label: 'General', icon: <ClipboardCheck size={16} /> },
                                    { id: 'personal', label: 'Personal', icon: <Users size={16} /> },
                                    { id: 'materials', label: 'Materiales', icon: <Package size={16} /> },
                                    { id: 'tools', label: 'Herramientas', icon: <Wrench size={16} /> },
                                    { id: 'finance', label: 'Finanzas', icon: <Wallet size={16} /> }
                                ].map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '10px 16px', border: 'none', background: 'none', 
                                            borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent', 
                                            fontWeight: 700, fontSize: '0.85rem',
                                            color: activeTab === tab.id ? 'var(--secondary)' : 'var(--text-muted)', 
                                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                        }}
                                    >
                                        {tab.icon} {tab.label}
                                    </button>
                                ))}
                            </div>
                            
                            {/* TAB: GENERAL DETAILS */}
                            {activeTab === 'details' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="fade-in">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre de la Orden</label>
                                            <input 
                                                type="text" 
                                                value={selectedProject.name} 
                                                readOnly={!canManageFull}
                                                onChange={(e) => setSelectedProject({...selectedProject, name: e.target.value})}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontSize: '1rem', fontWeight: 600 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cliente</label>
                                            <input 
                                                type="text" 
                                                value={selectedProject.client} 
                                                readOnly={!canManageFull}
                                                onChange={(e) => setSelectedProject({...selectedProject, client: e.target.value})}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontSize: '1rem', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha de Inicio</label>
                                            <input 
                                                type="date" 
                                                value={selectedProject.start_date || ''} 
                                                readOnly={!canManageFull}
                                                onChange={(e) => setSelectedProject({...selectedProject, start_date: e.target.value})}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontSize: '1rem', fontWeight: 600 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha de Término (Estimada)</label>
                                            <input 
                                                type="date" 
                                                value={selectedProject.end_date || ''} 
                                                readOnly={!canManageFull}
                                                onChange={(e) => setSelectedProject({...selectedProject, end_date: e.target.value})}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontSize: '1rem', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo de Obra</label>
                                            <select 
                                                value={selectedProject.type} 
                                                disabled={!canManageFull}
                                                onChange={(e) => setSelectedProject({...selectedProject, type: e.target.value})}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontWeight: 600 }}
                                            >
                                                <option value="Pedido a Medida">🪑 Pedido a Medida</option>
                                                <option value="Remodelación">🏠 Remodelación / Obra</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Etapa y Progreso</label>
                                            <select 
                                                value={selectedProject.stage || 'Diseño'} 
                                                disabled={!canEditProgress}
                                                onChange={(e) => {
                                                    const stageMap = { 'Diseño': 25, 'Producción': 50, 'Detallado': 75, 'Listo': 100 };
                                                    setSelectedProject({
                                                        ...selectedProject, 
                                                        stage: e.target.value,
                                                        progress: stageMap[e.target.value] || 0
                                                    });
                                                }}
                                                style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canEditProgress ? '#f8fafc' : 'white', fontWeight: 700 }}
                                            >
                                                <option value="Diseño">📐 Diseño y Cotización</option>
                                                <option value="Producción">⚒️ En Fabricación / Obra</option>
                                                <option value="Detallado">✨ Acabados / Pintura</option>
                                                <option value="Listo">✅ Entrega Final</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Presupuesto Estimado (Bs.)</label>
                                        <input 
                                            type="number" 
                                            value={selectedProject.budget === 0 ? '' : selectedProject.budget} 
                                            readOnly={!canManageFull}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // Convert to number to strip leading zeros, but allow empty string
                                                setSelectedProject({...selectedProject, budget: val === '' ? '' : Number(val)});
                                            }}
                                            style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid var(--border)', background: !canManageFull ? '#f8fafc' : 'white', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TAB: PERSONAL / WORKERS */}
                            {activeTab === 'personal' && (
                                <div className="fade-in">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--secondary)' }}>ASIGNAR PERSONAL</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    placeholder="Buscar en planilla (ej. Juan)..." 
                                                    value={newWorker.name} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewWorker({...newWorker, name: val});
                                                        setShowWorkerSuggestions(true);
                                                    }}
                                                    onFocus={() => setShowWorkerSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowWorkerSuggestions(false), 200)}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                                />
                                                {showWorkerSuggestions && newWorker.name.length > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: '105%', left: 0, right: 0, 
                                                        background: 'white', borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                        zIndex: 200, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)'
                                                    }}>
                                                        {personnel
                                                            .filter(p => {
                                                                const matches = p.name.toLowerCase().includes(newWorker.name.toLowerCase());
                                                                const erpRoles = ['Vendedor/Cajero', 'Almacén', 'Producción', 'Contador'];
                                                                return matches && !erpRoles.includes(p.role);
                                                            })
                                                            .map(p => (
                                                            <div 
                                                                key={p.id}
                                                                onClick={() => {
                                                                    setNewWorker({
                                                                        ...newWorker, 
                                                                        name: p.name, 
                                                                        role: p.role || 'Carpintería', 
                                                                        salary: p.salary_base || '', 
                                                                        type: p.type || 'Ocasional',
                                                                        personnel_id: p.id
                                                                    });
                                                                    setShowWorkerSuggestions(false);
                                                                }}
                                                                style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                                                            >
                                                                <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{p.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.role} • {Number(p.salary_base).toLocaleString()} Bs.</div>
                                                            </div>
                                                        ))}
                                                        {personnel.filter(p => p.name.toLowerCase().includes(newWorker.name.toLowerCase())).length === 0 && (
                                                            <div style={{ padding: '10px 15px', fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic', fontWeight: 700 }}>
                                                                ✨ Se registrará como nuevo personal
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                                <input 
                                                    list="worker-roles"
                                                    placeholder="Especialidad/Rol"
                                                    value={newWorker.role} 
                                                    onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                                                    style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                                />
                                                <datalist id="worker-roles">
                                                    <option value="Carpintería" />
                                                    <option value="Pintura" />
                                                    <option value="Instalación" />
                                                    <option value="Diseño" />
                                                    <option value="Ayudante" />
                                                    <option value="Barnizado" />
                                                    <option value="Electricidad" />
                                                    <option value="Vidriería" />
                                                </datalist>
                                            <input 
                                                type="number" placeholder="Sueldo/Pago" 
                                                value={newWorker.salary} onChange={e => setNewWorker({...newWorker, salary: e.target.value})}
                                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <select 
                                                value={newWorker.type} onChange={e => setNewWorker({...newWorker, type: e.target.value})}
                                                style={{ padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.8rem' }}
                                            >
                                                <option value="Ocasional">⚠️ Ocasional (Boleta)</option>
                                                <option value="Permanente">🏢 Permanente (Planilla)</option>
                                            </select>
                                            <button onClick={addWorkerToProject} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.8rem' }}>Añadir</button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        { (selectedProject.workers || []).length === 0 ? (
                                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay personal asignado todavía.</p>
                                        ) : (selectedProject.workers || []).map(w => {
                                            const workerPayments = personnelPayments.filter(p => 
                                                p.personnel_id === w.personnel_id && 
                                                (p.project_id == selectedProject.id || p.project_id === String(selectedProject.id))
                                            );
                                            const amountPaid = workerPayments.reduce((acc, p) => acc + Number(p.amount), 0);
                                            const balance = Number(w.salary) - amountPaid;
                                            const isFullyPaid = balance <= 0;

                                            return (
                                                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'white', border: '1px solid var(--border)', borderRadius: '16px' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                            {getRoleIcon(w.role)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{w.name}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.role} • {w.type}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>Sueldo total: {Number(w.salary).toLocaleString()} Bs.</div>
                                                        {amountPaid > 0 && (
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>Abono: {amountPaid.toLocaleString()} Bs.</div>
                                                        )}
                                                        <div style={{ fontWeight: 800, color: isFullyPaid ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
                                                            {isFullyPaid ? 'Saldado' : `Monto pendiente: ${balance.toLocaleString()} Bs.`}
                                                        </div>
                                                        <button 
                                                            onClick={() => toggleWorkerPaid(w.id)}
                                                            style={{ border: 'none', background: 'none', color: isFullyPaid || w.paid ? '#10b981' : '#f59e0b', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', width: '100%' }}
                                                        >
                                                            {isFullyPaid || w.paid ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                                            {isFullyPaid || w.paid ? 'MARCAR COMO SALDADO' : 'MARCAR COMO PAGADO'}
                                                        </button>
                                                    </div>
                                                        {w.type === 'Ocasional' && (
                                                            <button 
                                                                onClick={() => setShowPaySlip({ ...w, project: selectedProject.name, salary: balance > 0 ? balance : w.salary })}
                                                                style={{ padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }} title="Generar Boleta"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => removeWorker(w.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TAB: MATERIALS */}
                            {activeTab === 'materials' && (
                                <div className="fade-in">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--secondary)' }}>CONSUMO DE INSUMOS</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input 
                                                    placeholder="Insumo (Barniz, Pintura)" 
                                                    value={newSupply.name} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setNewSupply({...newSupply, name: val});
                                                        setShowSupplySuggestions(true);
                                                    }}
                                                    onFocus={() => setShowSupplySuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowSupplySuggestions(false), 200)}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                                />
                                                {showSupplySuggestions && newSupply.name.length > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: '105%', left: 0, right: 0, 
                                                        background: 'white', borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                        zIndex: 200, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)'
                                                    }}>
                                                        {assets.filter(a => a.name.toLowerCase().includes(newSupply.name.toLowerCase())).map(a => (
                                                            <div 
                                                                  key={a.id}
                                                                  onClick={() => {
                                                                      setNewSupply({
                                                                          ...newSupply, 
                                                                          name: a.name, 
                                                                          price: a.price || 0
                                                                      });
                                                                      setShowSupplySuggestions(false);
                                                                  }}
                                                                  style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                                                            >
                                                                <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{a.name}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Materia Prima • {a.price || 0} Bs. Ud.</div>
                                                            </div>
                                                        ))}
                                                        {assets.filter(a => a.name.toLowerCase().includes(newSupply.name.toLowerCase())).length === 0 && (
                                                            <div style={{ padding: '10px 15px', fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic', fontWeight: 700 }}>
                                                                ✨ Se registrará como nuevo Material
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <input 
                                                type="number" placeholder="Precio Bs." 
                                                value={newSupply.price} onChange={e => setNewSupply({...newSupply, price: e.target.value})}
                                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            />
                                            <input 
                                                type="number" placeholder="Cant." 
                                                value={newSupply.qty} onChange={e => setNewSupply({...newSupply, qty: e.target.value})}
                                                style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <button onClick={addSupplyToProject} className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.8rem', width: 'fit-content' }}>Asignar Insumo</button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        { (selectedProject.supplies || []).length === 0 ? (
                                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Sin materiales registrados.</p>
                                        ) : (selectedProject.supplies || []).map(s => (
                                            <div key={s.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'white', border: '1px solid var(--border)', borderRadius: '16px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800 }}>{s.name}</div>
                                                    <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            ESTIMADO: <strong>{s.qty} uds.</strong>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>CONSUMO REAL</div>
                                                            <input 
                                                                type="number" 
                                                                value={s.actualQty || ''} 
                                                                placeholder={s.qty}
                                                                onChange={(e) => {
                                                                    const supplies = selectedProject.supplies.map(x => x.id === s.id ? { ...x, actualQty: e.target.value } : x);
                                                                    setSelectedProject({...selectedProject, supplies});
                                                                }}
                                                                style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--primary)', fontSize: '0.9rem', fontWeight: 800 }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedProject({...selectedProject, supplies: selectedProject.supplies.filter(sup => sup.id !== s.id)})} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fffbeb', borderRadius: '16px', display: 'flex', gap: '10px', alignItems: 'start' }}>
                                        <Info size={16} className="text-amber-600" style={{ marginTop: '2px' }} />
                                        <p style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: '1.4' }}>
                                            <strong>Nota:</strong> Al finalizar la obra, el valor del "Consumo Real" se utilizará para corregir el promedio de gastos por labor y ajustar el inventario final.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* TAB: TOOLS */}
                            {activeTab === 'tools' && (
                                <div className="fade-in">
                                    <div style={{ display: 'flex', gap: '0.75rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '24px', marginBottom: '1.5rem', position: 'relative' }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <input 
                                                placeholder="Herramienta (Escalera, Brocha, etc)" 
                                                value={newTool.name} 
                                                onChange={e => {
                                                    setNewTool({...newTool, name: e.target.value});
                                                    setShowToolSuggestions(true);
                                                }}
                                                onFocus={() => setShowToolSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowToolSuggestions(false), 200)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                            />
                                            {showToolSuggestions && newTool.name.length > 0 && (
                                                <div style={{
                                                    position: 'absolute', top: '105%', left: 0, right: 0, 
                                                    background: 'white', borderRadius: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                    zIndex: 200, maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)'
                                                }}>
                                                    {assets.filter(a => a.category === 'Herramientas' && a.name.toLowerCase().includes(newTool.name.toLowerCase())).map(a => (
                                                        <div 
                                                            key={a.id}
                                                            onClick={() => {
                                                                setNewTool({ ...newTool, name: a.name });
                                                                setShowToolSuggestions(false);
                                                            }}
                                                            style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                                                        >
                                                            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{a.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: {a.location || 'Disponible'}</div>
                                                        </div>
                                                    ))}
                                                    {assets.filter(a => a.category === 'Herramientas' && a.name.toLowerCase().includes(newTool.name.toLowerCase())).length === 0 && (
                                                        <div style={{ padding: '10px 15px', fontSize: '0.8rem', color: 'var(--primary)', fontStyle: 'italic', fontWeight: 700 }}>
                                                            ✨ Se registrará como nueva herramienta
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={addToolToProject} className="btn-primary" style={{ padding: '10px 20px' }}>Añadir</button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                        { (selectedProject.tools || []).length === 0 ? (
                                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', gridColumn: '1/-1' }}>No hay herramientas asignadas.</p>
                                        ) : (selectedProject.tools || []).map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: '16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', textDecoration: t.returned ? 'line-through' : 'none', color: t.returned ? 'var(--text-muted)' : 'var(--secondary)' }}>{t.name}</span>
                                                    <span style={{ fontSize: '0.65rem', color: t.returned ? '#10b981' : '#f59e0b', fontWeight: 800 }}>{t.returned ? 'DEVUELTO' : 'EN OBRA'}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => toggleToolReturned(t.id)} style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}>
                                                        <CheckCircle2 size={16} className={t.returned ? 'text-green-500' : 'text-slate-300'} />
                                                    </button>
                                                    <button onClick={() => removeTool(t.id)} style={{ border: 'none', background: 'none', color: '#f43f5e', cursor: 'pointer' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* TAB: FINANCE (Existing logic kept but styled) */}
                            {activeTab === 'finance' && (
                                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div style={{ background: '#ecfdf5', padding: '1.5rem', borderRadius: '24px', border: '1px solid #d1fae5' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 800, display: 'block', marginBottom: '4px' }}>INGRESOS (CLIENTE)</span>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                <strong style={{ fontSize: '1.5rem', color: '#10b981' }}>{Number(selectedProject.paid).toLocaleString()} Bs.</strong>
                                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>PAGADO</span>
                                            </div>
                                            
                                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #a7f3d0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#065f46' }}>
                                                    <span>Monto Total de Obra:</span>
                                                    <span style={{ fontWeight: 800 }}>{(Number(selectedProject.budget) || 0).toLocaleString()} Bs.</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '4px', fontWeight: 800, color: (Number(selectedProject.budget) || 0) - (Number(selectedProject.paid) || 0) > 0 ? '#ef4444' : '#10b981' }}>
                                                    <span>{(Number(selectedProject.budget) || 0) - (Number(selectedProject.paid) || 0) > 0 ? 'SALDO PENDIENTE:' : 'OBRA SALDADA'}</span>
                                                    <span>{Math.max(0, (Number(selectedProject.budget) || 0) - (Number(selectedProject.paid) || 0)).toLocaleString()} Bs.</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '24px', border: '1px solid #fef3c7' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 800, display: 'block', marginBottom: '4px' }}>COSTOS ESTIMADOS</span>
                                            {(() => {
                                                const personnelCost = (selectedProject.workers || []).reduce((acc, w) => acc + Number(w.salary), 0);
                                                const materialCost = (selectedProject.supplies || []).reduce((acc, s) => acc + (Number(s.qty) * (Number(s.price) || 0)), 0);
                                                const totalCost = personnelCost + materialCost;
                                                const budgetNum = Number(selectedProject.budget) || 0;
                                                const margin = budgetNum - totalCost;
                                                return (
                                                    <>
                                                        <strong style={{ fontSize: '1.5rem', color: '#d97706' }}>{totalCost.toLocaleString()} Bs.</strong>
                                                        <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px' }}>Utilidad Proyectada: {margin.toLocaleString()} Bs.</div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                        <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem' }}>DESGLOSE DE EGRESOS PROYECTADOS</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span>Mano de Obra (Comprometido)</span>
                                                <span style={{ fontWeight: 700 }}>{(selectedProject.workers || []).reduce((acc, w) => acc + Number(w.salary), 0).toLocaleString()} Bs.</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span>Materiales / Insumos</span>
                                                <span style={{ fontWeight: 700 }}>{(selectedProject.supplies || []).reduce((acc, s) => acc + (Number(s.qty) * (Number(s.price) || 0)), 0).toLocaleString()} Bs.</span>
                                            </div>
                                            <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, color: 'var(--secondary)' }}>
                                                <span>TOTAL EGRESOS ESTIMADOS</span>
                                                <span>{((selectedProject.workers || []).reduce((acc, w) => acc + Number(w.salary), 0) + (selectedProject.supplies || []).reduce((acc, s) => acc + (Number(s.qty) * (Number(s.price) || 0)), 0)).toLocaleString()} Bs.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isAddingPayment ? (
                                        <button 
                                            onClick={() => setIsAddingPayment(true)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '16px', border: '1px dashed var(--primary)', background: '#fffbeb', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                            <Plus size={18} /> Registrar Nuevo Abono
                                        </button>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '1.5rem', border: '1px solid var(--primary)', borderRadius: '24px', background: 'white' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px', color: 'var(--primary)' }}>MONTO BS.</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="0.00" 
                                                        value={newPayment.amount} 
                                                        onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '1rem', fontWeight: 700 }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>MÉTODO</label>
                                                    <select 
                                                        value={newPayment.method} 
                                                        onChange={(e) => setNewPayment({...newPayment, method: e.target.value})}
                                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: 600 }}
                                                    >
                                                        <option value="Efectivo">💵 Efectivo</option>
                                                        <option value="Transferencia">🏛️ Transferencia / QR</option>
                                                        <option value="Punto de Venta">💳 Tarjeta / Punto</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Nota (ej. Abono inicial)" 
                                                value={newPayment.notes} 
                                                onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1rem' }}
                                            />
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={async () => {
                                                    const amount = parseInt(newPayment.amount) || 0;
                                                    if (amount <= 0) return;

                                                    const budget = Number(selectedProject.budget) || 0;
                                                    const alreadyPaid = Number(selectedProject.paid) || 0;
                                                    const remaining = budget - alreadyPaid;

                                                    if (amount > remaining && remaining > 0) {
                                                        addNotification(`El monto excede el saldo pendiente (${remaining.toLocaleString()} Bs.). Ajuste el presupuesto si es necesario.`, 'info');
                                                        return;
                                                    }
                                                    
                                                    if (remaining <= 0) {
                                                        addNotification('Esta obra ya se encuentra saldada en su totalidad.', 'info');
                                                        return;
                                                    }

                                                    await addPayment({
                                                        project_id: selectedProject.id,
                                                        amount: amount,
                                                        method: newPayment.method,
                                                        notes: newPayment.notes,
                                                        date: new Date().toISOString().split('T')[0]
                                                    });
                                                    setIsAddingPayment(false);
                                                    setNewPayment({ amount: '', method: 'Efectivo', notes: '' });
                                                    fetchPayments();
                                                    setSelectedProject(prev => ({...prev, paid: (Number(prev.paid) || 0) + amount}));
                                                }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Guardar Pago</button>
                                                <button onClick={() => setIsAddingPayment(false)} style={{ padding: '12px', borderRadius: '12px', background: '#f1f5f9', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Cancelar</button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                                        <h4 style={{ fontSize: '0.8rem', marginBottom: '12px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Historial Cronológico</h4>
                                        {payments.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '16px' }}>Sin registros de flujo financiero.</p>
                                        ) : payments.map(pmt => (
                                            <div key={pmt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--secondary)' }}>{Number(pmt.amount).toLocaleString()} Bs.</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        <span style={{ background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{pmt.method}</span> • {pmt.date}
                                                    </div>
                                                </div>
                                                <button onClick={() => { 
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: '¿Eliminar pago?',
                                                        message: 'Esta acción borrará el registro de este ingreso/abono.',
                                                        isDanger: true,
                                                        onConfirm: () => {
                                                            deletePayment(pmt.id); 
                                                            fetchPayments(); 
                                                            setSelectedProject(prev => ({...prev, paid: Math.max(0, prev.paid - pmt.amount)}));
                                                        }
                                                    });
                                                }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                {selectedProject.progress === 100 && (
                                    <button 
                                        onClick={() => {
                                            const personnelCost = (selectedProject.workers?.reduce((a,b) => a + Number(b.salary), 0) || 0);
                                            const profit = selectedProject.paid - personnelCost;
                                            addNotification(`OBRA FINALIZADA. Rentabilidad: ${profit.toLocaleString()} Bs.`, 'success');
                                            handleSaveEdit();
                                        }}
                                        style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                    >
                                        Cerrar Obra <TrendingUp size={18} />
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveEdit}
                                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(184,134,11,0.3)' }}
                                >
                                    Guardar Cambios
                                </button>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ padding: '14px 24px', borderRadius: '16px', background: '#f1f5f9', color: 'var(--secondary)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Salir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* PAY SLIP MODAL */}
            <AnimatePresence>
                {showPaySlip && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.95)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                            style={{ width: '400px', padding: '3rem', border: '2px solid #000', background: 'white', position: 'relative', fontFamily: 'serif' }}
                        >
                            <button onClick={() => setShowPaySlip(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }} className="no-print"><X size={20} /></button>
                            
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '5px' }}>INFRABOL ERP</h1>
                                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Comprobante de Pago a Personal Ocasional</p>
                            </div>

                            <div style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '1.5rem 0', marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span>FECHA:</span>
                                    <strong>{new Date().toLocaleDateString()}</strong>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <span>TRABAJADOR:</span><br/>
                                    <strong>{showPaySlip.name.toUpperCase()}</strong>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <span>LABOR / ROL:</span><br/>
                                    <strong>{showPaySlip.role}</strong>
                                </div>
                                <div style={{ marginBottom: '10px' }}>
                                    <span>PROYECTO:</span><br/>
                                    <strong>{showPaySlip.project}</strong>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', marginBottom: '3rem' }}>
                                <span style={{ fontSize: '0.9rem' }}>TOTAL CANCELADO:</span><br/>
                                <strong style={{ fontSize: '1.8rem' }}>{Number(showPaySlip.salary).toLocaleString()} Bs.</strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem' }}>
                                <div style={{ width: '150px', borderTop: '1px solid #000', textAlign: 'center', fontSize: '0.7rem' }}>Firma Administrador</div>
                                <div style={{ width: '150px', borderTop: '1px solid #000', textAlign: 'center', fontSize: '0.7rem' }}>Recibí conforme</div>
                            </div>

                            <div style={{ marginTop: '3rem', textAlign: 'center' }} className="no-print">
                                <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#000', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', borderRadius: '8px' }}>Imprimir Boleta</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body * { visibility: hidden; }
                    .manual-page, .projects-container, .sidebar, .topbar { display: none !important; }
                    [style*="zIndex: 1100"], [style*="zIndex: 1100"] * { visibility: visible; }
                    [style*="zIndex: 1100"] { position: absolute; left: 0; top: 0; width: 100%; }
                }
                .fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .project-card-premium { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .project-card-premium:hover { transform: translateY(-5px); box-shadow: 0 12px 25px -5px rgba(0,0,0,0.1); }
            `}</style>
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({...confirmModal, isOpen: false})}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={confirmModal.isDanger}
            />

            <AnimatePresence>
                {shareModal.isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShareModal({ ...shareModal, isOpen: false })}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', maxWidth: '450px', background: 'white', borderRadius: '32px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center' }}
                        >
                            <div style={{ width: 60, height: 60, borderRadius: '20px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Share2 size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem' }}>Compartir Seguimiento</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Copia este enlace para que tu cliente pueda ver el progreso de <strong>{shareModal.name}</strong> sin iniciar sesión.</p>
                            
                            <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '10px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                                <input 
                                    readOnly value={shareModal.url} 
                                    style={{ flex: 1, border: 'none', background: 'none', fontSize: '0.8rem', color: '#475569', fontWeight: 600, outline: 'none' }} 
                                />
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareModal.url);
                                        addNotification('Enlace copiado', 'success');
                                    }}
                                    style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                    Copiar
                                </button>
                            </div>

                            <button 
                                onClick={() => setShareModal({ ...shareModal, isOpen: false })}
                                style={{ width: '100%', padding: '14px', borderRadius: '18px', border: '1px solid var(--border)', background: 'white', color: 'var(--secondary)', fontWeight: 800, cursor: 'pointer' }}
                            >
                                Cerrar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
                {showPurchaseModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '500px', boxShadow: 'var(--shadow-xl)' }}
                        >
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <Package size={42} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                                <h2 style={{ fontWeight: 800 }}>Reponer Materiales</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Existen materiales con stock negativo tras finalizar la obra.</p>
                            </div>

                            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '20px', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                                {purchaseItems.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < purchaseItems.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                                        <span style={{ color: '#ef4444', fontWeight: 800 }}>{item.qty} uds.</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>Seleccionar Proveedor</label>
                                <select 
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                    style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: '#f8fafc', fontWeight: 700 }}
                                >
                                    <option value="">Elegir proveedor...</option>
                                    {suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => setShowPurchaseModal(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#f1f5f9', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Omitir
                                </button>
                                <button 
                                    onClick={handleConfirmPurchase}
                                    style={{ flex: 1, padding: '14px', borderRadius: '16px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                                >
                                    Generar Orden
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Projects;
