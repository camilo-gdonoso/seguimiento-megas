import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Minus, Trash2, Camera, Receipt, X, Box as BoxIcon, Printer, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const POS = () => {
    const { assets, addSale, updateAsset, searchTerm, setSearchTerm, actionTrigger, setActionTrigger, customers, addCustomer, projects, addPayment } = useApp();
    const [posMode, setPosMode] = useState('standard'); // 'standard' or 'project'
    const [selectedProjectForPayment, setSelectedProjectForPayment] = useState(null);
    const [projectPaymentAmount, setProjectPaymentAmount] = useState('');
    const [cart, setCart] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [receiptData, setReceiptData] = useState(null); // For the receipt modal
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerResults, setShowCustomerResults] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Efectivo');
    const customerSearchRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
                setShowCustomerResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen to global "Add New" button -> Clear sale / New sale
    useEffect(() => {
        if (actionTrigger?.type === 'CREATE_NEW') {
            if (cart.length > 0 && window.confirm('¿Deseas vaciar el carrito para iniciar una nueva venta?')) {
                setCart([]);
            } else if (cart.length === 0) {
                alert('Ya estás en una venta nueva. ¡Escanea o busca un producto!');
            }
            setActionTrigger(null); // Reset trigger
        }
    }, [actionTrigger, cart]);

    useEffect(() => {
        let scanner = null;
        if (showScanner) {
            // Check if library is loaded
            if (!window.Html5Qrcode) {
                console.error("Html5Qrcode library not found");
                setShowScanner(false);
                return;
            }

            // Small delay to ensure "reader" div is in DOM
            const timer = setTimeout(() => {
                const readerElement = document.getElementById("reader");
                if (!readerElement) {
                    console.error("Reader element not found");
                    return;
                }

                scanner = new window.Html5Qrcode("reader");
                const config = { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };
                
                scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        const product = assets.find(a => a.barcode === decodedText);
                        if (product) {
                            addToCart(product);
                            setSearchTerm('');
                        } else {
                            setSearchTerm(decodedText);
                        }
                        setShowScanner(false);
                        scanner.stop().catch(console.error);
                    },
                    (err) => {}
                ).catch(err => {
                    console.error("Scanner error:", err);
                    setShowScanner(false);
                });
            }, 100);

            return () => clearTimeout(timer);
        }
        return () => {
            if (scanner) {
                try {
                    if (scanner.getState() === 2) scanner.stop();
                } catch(e) {}
            }
        };
    }, [showScanner]);

    const filteredAssets = assets.filter(a => 
        a.category !== 'Materia Prima' && 
        (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         (a.barcode && a.barcode.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const addToCart = (product) => {
        // Check stock availability
        const currentAsset = assets.find(a => a.id === product.id);
        if (!currentAsset || currentAsset.stock <= 0) {
            return; // No stock available
        }
        
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                // Don't allow adding more than available stock
                if (existing.quantity >= currentAsset.stock) {
                    return prev;
                }
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const currentAsset = assets.find(a => a.id === id);
                const maxStock = currentAsset ? currentAsset.stock : item.quantity;
                const newQty = Math.max(1, Math.min(maxStock, item.quantity + delta));
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeItem = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (posMode === 'standard') {
            if (cart.length === 0) return;
            
            const saleId = `TK-${Date.now().toString().slice(-6)}`;
            const saleDate = new Date();
            
            const sale = {
                id: saleId,
                date: saleDate.toISOString().split('T')[0],
                items: cart,
                total,
                customer_name: customerName || 'Consumidor Final',
                payment_method: paymentMethod,
            };

            const success = await addSale(sale);
            if (!success) return;

            cart.forEach(cartItem => {
                const currentAsset = assets.find(a => a.id === cartItem.id);
                if (currentAsset) {
                    const newStock = Math.max(0, currentAsset.stock - cartItem.quantity);
                    updateAsset(cartItem.id, { stock: newStock });
                }
            });

            setReceiptData({
                id: saleId,
                date: saleDate,
                items: [...cart],
                total,
                customer_name: customerName || 'Consumidor Final',
                payment_method: paymentMethod,
                type: 'standard'
            });

            if (customerName && customerName !== 'Consumidor Final' && !selectedCustomer) {
                const exists = customers.find(c => 
                    c.name.toLowerCase() === customerName.toLowerCase() && 
                    (customerPhone ? c.phone === customerPhone : true)
                );
                if (!exists) {
                    await addCustomer({ name: customerName, phone: customerPhone || '' });
                }
            }

            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setSelectedCustomer(null);
            setShowCustomerResults(false);
            setPaymentMethod('Efectivo');
        } else {
            // Project Payment Mode
            if (!selectedProjectForPayment || !projectPaymentAmount) return;
            
            const payAmount = Number(projectPaymentAmount);
            const saleId = `AB-${Date.now().toString().slice(-6)}`;
            const saleDate = new Date();

            await addPayment({
                project_id: selectedProjectForPayment.id,
                amount: payAmount,
                method: paymentMethod,
                notes: `Abono desde Caja POS - ${customerName}`,
                date: saleDate.toISOString().split('T')[0]
            });

            setReceiptData({
                id: saleId,
                date: saleDate,
                items: [{ name: `Abono Orden de Trabajo: ${selectedProjectForPayment.name}`, quantity: 1, price: payAmount }],
                total: payAmount,
                customer_name: customerName || selectedProjectForPayment.client,
                payment_method: paymentMethod,
                type: 'project'
            });

            setSelectedProjectForPayment(null);
            setProjectPaymentAmount('');
            setCustomerName('');
            setCustomerPhone('');
            setPosMode('standard');
        }
    };

    const filteredCustomers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(customerName.toLowerCase())) ||
        (c.phone && c.phone.includes(customerName))
    );

    const handleSelectCustomer = (c) => {
        setSelectedCustomer(c);
        setCustomerName(c.name);
        setCustomerPhone(c.phone || '');
        setShowCustomerResults(false);
    };

    const closeReceipt = () => {
        setReceiptData(null);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="pos-layout slide-in">
            {/* ===== RECEIPT MODAL ===== */}
            <AnimatePresence>
                {receiptData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeReceipt}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white',
                                borderRadius: '28px',
                                width: '100%',
                                maxWidth: '420px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
                            }}
                        >
                            {/* Receipt Header - Success Banner */}
                            <div style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                padding: '2rem',
                                textAlign: 'center',
                                color: 'white',
                            }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                >
                                    <CheckCircle size={48} style={{ margin: '0 auto 12px' }} />
                                </motion.div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '4px' }}>¡Venta Exitosa!</h2>
                                <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>El stock se ha actualizado automáticamente</p>
                            </div>

                            {/* Receipt Body */}
                            <div style={{ padding: '1.5rem 2rem' }} id="receipt-print-area">
                                {/* Business & Ticket Info */}
                                <div style={{
                                    textAlign: 'center',
                                    paddingBottom: '1rem',
                                    marginBottom: '1rem',
                                    borderBottom: '2px dashed #e2e8f0',
                                }}>
                                    <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>MueblesERP</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>Comprobante de Venta</p>
                                    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span><strong>Ticket:</strong> {receiptData.id}</span>
                                            <span>{receiptData.date.toLocaleDateString('es-BO')} {receiptData.date.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span><strong>Cliente:</strong> {receiptData.customer_name}</span>
                                            <span><strong>Pago:</strong> {receiptData.payment_method}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div style={{ marginBottom: '1rem' }}>
                                    {receiptData.items.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 0',
                                            borderBottom: idx < receiptData.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                            fontSize: '0.9rem',
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '8px' }}>x{item.quantity}</span>
                                            </div>
                                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                                                {(item.price * item.quantity).toLocaleString()} Bs.
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div style={{
                                    borderTop: '2px solid #0f172a',
                                    paddingTop: '1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>TOTAL</span>
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>
                                        {receiptData.total.toLocaleString()} Bs.
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{
                                padding: '1rem 2rem 1.5rem',
                                display: 'flex',
                                gap: '10px',
                            }}>
                                <button
                                    onClick={handlePrint}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px',
                                        border: '1px solid var(--border)', background: 'white',
                                        fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        color: '#475569', transition: 'all 0.2s',
                                    }}
                                >
                                    <Printer size={16} /> Imprimir
                                </button>
                                <button
                                    onClick={closeReceipt}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                        color: 'white', fontWeight: 700, cursor: 'pointer',
                                        fontSize: '0.9rem', transition: 'all 0.2s',
                                    }}
                                >
                                    Nueva Venta
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pos-main">
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="p-search-box" style={{ flex: 1, background: 'white', border: '1px solid var(--border)', borderRadius: '16px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--shadow-sm)' }}>
                        <Search size={20} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o escanear código..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }}
                        />
                    </div>
                    <button 
                        onClick={() => setShowScanner(!showScanner)}
                        style={{ width: '50px', background: showScanner ? 'var(--danger)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}
                    >
                        {showScanner ? <X size={20} /> : <Camera size={20} />}
                    </button>
                </div>

                <AnimatePresence>
                    {showScanner && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginBottom: '1.5rem', borderRadius: '20px', background: 'black' }}
                        >
                            <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    {posMode === 'standard' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                            {filteredAssets.map(asset => (
                                <motion.div 
                                    key={asset.id} 
                                    style={{ 
                                        background: 'white', borderRadius: '20px', overflow: 'hidden', 
                                        border: '1px solid var(--border)', 
                                        cursor: asset.stock <= 0 ? 'not-allowed' : 'pointer',
                                        opacity: asset.stock <= 0 ? 0.5 : 1,
                                        transition: 'opacity 0.3s',
                                    }}
                                    whileTap={asset.stock > 0 ? { scale: 0.95 } : {}}
                                    onClick={() => asset.stock > 0 && addToCart(asset)}
                                >
                                    <div style={{ height: '120px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url(${asset.image})`, borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
                                        {asset.stock <= 0 && (
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'rgba(0,0,0,0.5)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 800, fontSize: '0.8rem',
                                                letterSpacing: '1px',
                                            }}>
                                                SIN STOCK
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ padding: '1rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>{asset.name}</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{asset.price.toLocaleString()} Bs.</span>
                                            <span style={{ 
                                                fontSize: '0.7rem', 
                                                color: asset.stock <= 0 ? 'var(--danger)' : asset.stock <= 3 ? 'var(--warning)' : 'var(--text-muted)',
                                                fontWeight: asset.stock <= 3 ? 700 : 400,
                                            }}>
                                                Stock: {asset.stock}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.5rem' }}>Seleccionar Orden de Trabajo para Cobro</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {projects.filter(p => (p.budget - p.paid) > 0).map(p => (
                                    <motion.div 
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedProjectForPayment(p);
                                            setCustomerName(p.client);
                                            setProjectPaymentAmount((p.budget - p.paid).toString());
                                        }}
                                        style={{ 
                                            padding: '1.5rem', borderRadius: '24px', background: 'white', border: selectedProjectForPayment?.id === p.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            cursor: 'pointer', boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}>{p.type}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{p.id}</span>
                                        </div>
                                        <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.name}</h4>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{p.client}</div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                            <div>
                                                <div style={{ opacity: 0.6 }}>Presupuesto</div>
                                                <div style={{ fontWeight: 700 }}>{p.budget.toLocaleString()} Bs.</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ opacity: 0.6 }}>Saldo Pendiente</div>
                                                <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{(p.budget - p.paid).toLocaleString()} Bs.</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {projects.filter(p => (p.budget - p.paid) > 0).length === 0 && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                                        No hay órdenes de trabajo con deudas pendientes.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pos-cart-panel">
                <div style={{ padding: '0.5rem 1.5rem', background: '#f8fafc', display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => { setPosMode('standard'); setSelectedProjectForPayment(null); }}
                        style={{ flex: 1, padding: '10px', border: 'none', background: posMode === 'standard' ? 'white' : 'transparent', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, color: posMode === 'standard' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: posMode === 'standard' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer' }}
                    >
                        VENTA DIRECTA
                    </button>
                    <button 
                        onClick={() => { setPosMode('project'); setCart([]); }}
                        style={{ flex: 1, padding: '10px', border: 'none', background: posMode === 'project' ? 'white' : 'transparent', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, color: posMode === 'project' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: posMode === 'project' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer' }}
                    >
                        COBRO ORDEN DE TRABAJO
                    </button>
                </div>

                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        {posMode === 'standard' ? '🛒 Carrito de Venta' : '📝 Detalle de Abono'}
                    </h2>
                    {posMode === 'standard' && (
                        <button onClick={() => setCart([])} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, cursor: 'pointer' }}>Vaciar</button>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {posMode === 'standard' ? (
                        <>
                            <AnimatePresence>
                                {cart.map(item => (
                                    <motion.div 
                                        key={item.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '14px' }}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <div>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.name}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.price.toLocaleString()} Bs. x {item.quantity}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                                                <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer' }}><Minus size={14} /></button>
                                                <span style={{ width: '30px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer' }}><Plus size={14} /></button>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {cart.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.3 }}>
                                    <BoxIcon size={40} style={{ margin: '0 auto 1rem' }} />
                                    <p>El carrito está vacío</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '1.5rem', borderRadius: '24px', background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase' }}>Resumen de Cobro</h4>
                            {selectedProjectForPayment ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ORDEN DE TRABAJO SELECCIONADA</div>
                                        <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{selectedProjectForPayment.name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CLIENTE</div>
                                        <div style={{ fontWeight: 700 }}>{selectedProjectForPayment.client}</div>
                                    </div>
                                    <div style={{ marginTop: '5px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>MONTO A COBRAR (BS.)</label>
                                        <input 
                                            type="number"
                                            value={projectPaymentAmount}
                                            onChange={(e) => setProjectPaymentAmount(e.target.value)}
                                            style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '2px solid var(--primary)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}
                                        />
                                        <div style={{ fontSize: '0.65rem', color: 'var(--danger)', marginTop: '4px', fontWeight: 700 }}>Pendiente: {(selectedProjectForPayment.budget - selectedProjectForPayment.paid).toLocaleString()} Bs.</div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                                    Selecciona una orden de trabajo del panel izquierdo
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div ref={customerSearchRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                                Cliente
                                {selectedCustomer && <span style={{ color: 'var(--success)', fontWeight: 900, cursor: 'pointer' }} onClick={() => { setSelectedCustomer(null); setCustomerName(''); setCustomerPhone(''); }}>Limpiar</span>}
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                    type="text"
                                    placeholder="Nombre o Teléfono..."
                                    value={customerName}
                                    onChange={(e) => {
                                        setCustomerName(e.target.value);
                                        setShowCustomerResults(true);
                                        if (selectedCustomer) setSelectedCustomer(null);
                                    }}
                                    onFocus={() => setShowCustomerResults(true)}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                                />
                            </div>
                            
                            {/* Customer Search Dropdown */}
                            {showCustomerResults && customerName.length > 1 && (
                                <div style={{ 
                                    position: 'absolute', bottom: '100%', left: 0, right: 0, 
                                    background: 'white', borderRadius: '12px', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
                                    border: '1px solid var(--border)', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                                    padding: '8px', marginBottom: '8px'
                                }}>
                                    {filteredCustomers.length > 0 ? (
                                        filteredCustomers.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => handleSelectCustomer(c)}
                                                style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', hover: { background: '#f1f5f9' } }}
                                                className="customer-search-item"
                                            >
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{c.name}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{c.phone || 'Sin cel.'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            No se encontraron clientes coincidentes
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Phone field appears if customer not selected or new */}
                        <AnimatePresence>
                            {!selectedCustomer && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}
                                >
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Celular (Registro Rápido)</label>
                                    <input 
                                        type="tel"
                                        placeholder="700123456"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Método de Pago</label>
                            <select 
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.85rem', background: 'white' }}
                            >
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Transferencia">🏦 Transferencia Bancaria</option>
                                <option value="QR">📱 Pago por QR</option>
                                <option value="Tarjeta">💳 Tarjeta Débito/Crédito</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: 800, fontSize: '1.4rem' }}>
                        <span>{posMode === 'standard' ? 'Total al Cobro' : 'Total Abono'}</span>
                        <span>{(posMode === 'standard' ? total : Number(projectPaymentAmount)).toLocaleString()} Bs.</span>
                    </div>
                    <button 
                        disabled={posMode === 'standard' ? cart.length === 0 : !selectedProjectForPayment || !projectPaymentAmount || Number(projectPaymentAmount) <= 0}
                        onClick={handleCheckout}
                        style={{ 
                            width: '100%', 
                            background: posMode === 'project' ? 'var(--primary)' : 'var(--success)', 
                            color: 'white', border: 'none', padding: '18px', borderRadius: '18px', 
                            fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', 
                            opacity: (posMode === 'standard' ? cart.length === 0 : !selectedProjectForPayment || !projectPaymentAmount || Number(projectPaymentAmount) <= 0) ? 0.5 : 1 
                        }}
                    >
                        <Receipt size={20} />
                        {posMode === 'standard' ? 'Confirmar Pago' : 'Confirmar Abono'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POS;
