import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Edit2, Trash2, MapPin, Box, AlertCircle, X, Camera, Plus, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const Inventory = () => {
    const { assets, updateAsset, addAsset, deleteAsset, setAssets, actionTrigger, searchTerm, setActionTrigger, activeRole, addNotification } = useApp();
    const canModify = activeRole === 'Dueno' || activeRole === 'Almacen';
    const [filter, setFilter] = useState('Todos');
    const [editingAsset, setEditingAsset] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

    // Listen to global "Add New" button
    useEffect(() => {
        if (actionTrigger?.type === 'CREATE_NEW') {
            setEditingAsset({ name: '', price: 0, stock: 0, category: 'Stock', barcode: '', location: 'Bodega Principal', image: '' });
            setActionTrigger(null); // Reset trigger
        }
    }, [actionTrigger]);

    useEffect(() => {
        let scanner = null;
        if (showScanner && editingAsset) {
            const timer = setTimeout(() => {
                const readerElement = document.getElementById("modal-reader");
                if (!readerElement) return;

                scanner = new window.Html5Qrcode("modal-reader");
                scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 150 } },
                    (decodedText) => {
                        setEditingAsset(prev => ({ ...prev, barcode: decodedText }));
                        setShowScanner(false);
                        scanner.stop().catch(console.error);
                    },
                    (err) => {}
                ).catch(console.error);
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
    }, [showScanner, editingAsset]);

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este activo permanentemente?')) {
            deleteAsset(id);
        }
    };

    const imageInputRef = useRef(null);

    const handleEdit = (asset) => {
        setEditingAsset({ ...asset });
    };

    const handleImageUpload = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Maximum dimensions for the product image
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality to keep size small
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setEditingAsset(prev => ({ ...prev, image: compressedBase64 }));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = () => {
        if (!editingAsset.name) {
            addNotification('El nombre del producto es obligatorio', 'info');
            return;
        }
        if (editingAsset.id) {
            updateAsset(editingAsset.id, editingAsset);
        } else {
            addAsset(editingAsset);
        }
        setEditingAsset(null);
        setShowScanner(false);
    };

    const categories = ['Todos', 'Exposición', 'Stock', 'Materia Prima', 'Herramientas'];
    
    const filteredAssets = assets.filter(a => {
        const matchesType = filter === 'Todos' || a.category === filter;
        const matchesSearch = !searchTerm || 
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.location.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="inventory slide-in">
            <div className="filter-shelf" style={{ display: 'flex', gap: '10px', marginBottom: '2rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {categories.map(cat => (
                        <button 
                            key={cat} 
                            className={`filter-btn ${filter === cat ? 'active' : ''}`}
                            onClick={() => setFilter(cat)}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                background: filter === cat ? 'var(--secondary)' : 'white',
                                color: filter === cat ? 'white' : 'var(--text-muted)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                
                {canModify && (
                    <button 
                        onClick={() => {
                            const initialCat = filter === 'Todos' ? 'Stock' : filter;
                            setEditingAsset({ 
                                name: '', 
                                price: 0, 
                                stock: 0, 
                                category: initialCat, 
                                barcode: '', 
                                location: 'Almacén Central', 
                                image: '' 
                            });
                        }}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '12px',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Plus size={18} />
                        Agregar Producto
                    </button>
                )}
            </div>

            <div className="data-card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Stock</th>
                                <th>Precio</th>
                                <th>Código</th>
                                {canModify && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssets.map((asset) => (
                                <tr key={asset.id}>
                                    <td>
                                        <div 
                                            className="asset-thumbnail" 
                                            style={{ 
                                                width: '50px', 
                                                height: '50px', 
                                                backgroundImage: `url(${asset.image})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                borderRadius: '12px',
                                                backgroundColor: '#f1f5f9'
                                            }}
                                        >
                                            {!asset.image && <Box size={24} color="#ddd" />}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="product-cell">
                                            <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{asset.name}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={10} /> {asset.location || 'Almacén Central'}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge-pill cat-${asset.category?.toLowerCase().replace(' ', '-')}`}>
                                            {asset.category}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px', color: asset.stock < 5 ? 'var(--danger)' : 'inherit' }}>
                                            {asset.stock} {asset.stock < 5 && <AlertCircle size={12} />}
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{asset.price?.toLocaleString()} Bs.</td>
                                    <td>
                                        <div style={{ background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-block' }}>
                                            <code style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>
                                                {asset.barcode || 'SIN CÓDIGO'}
                                            </code>
                                        </div>
                                    </td>
                                    {canModify && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    className="icon-btn" 
                                                    onClick={() => handleEdit(asset)}
                                                    style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    className="icon-btn" 
                                                    onClick={() => handleDelete(asset.id)}
                                                    style={{ padding: '6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', color: 'var(--danger)' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {editingAsset && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)', position: 'relative' }}
                        >
                            <button 
                                onClick={() => { setEditingAsset(null); setShowScanner(false); }}
                                style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <X size={24} />
                            </button>
                            <h2 style={{ marginBottom: '1.5rem', fontWeight: 800 }}>{editingAsset.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* ── Image Upload ── */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Foto del Producto</label>
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleImageUpload(e.target.files[0])}
                                    />
                                    <div
                                        onClick={() => imageInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files[0]); }}
                                        style={{
                                            width: '100%', height: editingAsset.image ? '140px' : '100px',
                                            borderRadius: '16px',
                                            border: `2px dashed ${editingAsset.image ? 'var(--primary)' : 'var(--border)'}`,
                                            background: editingAsset.image ? 'transparent' : '#f8fafc',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden', position: 'relative',
                                            transition: 'border-color 0.2s, background 0.2s',
                                        }}
                                    >
                                        {editingAsset.image ? (
                                            <>
                                                <img
                                                    src={editingAsset.image}
                                                    alt="preview"
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                                                />
                                                <div style={{
                                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '14px', opacity: 0,
                                                    transition: 'opacity 0.2s',
                                                }}
                                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                                >
                                                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <ImagePlus size={16} /> Cambiar foto
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                <ImagePlus size={28} style={{ margin: '0 auto 6px' }} />
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>Clic o arrastra una imagen</p>
                                                <p style={{ fontSize: '0.7rem', margin: '2px 0 0', opacity: 0.7 }}>PNG, JPG, WEBP</p>
                                            </div>
                                        )}
                                    </div>
                                    {editingAsset.image && (
                                        <button
                                            onClick={() => setEditingAsset(prev => ({ ...prev, image: '' }))}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', marginTop: '4px', padding: '0' }}
                                        >
                                            × Quitar foto
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Nombre del Producto</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej: Plancha de Madera Mara"
                                        value={editingAsset.name} 
                                        onChange={(e) => setEditingAsset({...editingAsset, name: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Precio (Bs.)</label>
                                        <input 
                                            type="number" 
                                            value={editingAsset.price} 
                                            onChange={(e) => setEditingAsset({...editingAsset, price: parseInt(e.target.value) || 0})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Stock Inicial</label>
                                        <input 
                                            type="number" 
                                            value={editingAsset.stock} 
                                            onChange={(e) => setEditingAsset({...editingAsset, stock: parseInt(e.target.value) || 0})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Categoría</label>
                                        <select 
                                            value={editingAsset.category} 
                                            onChange={(e) => setEditingAsset({...editingAsset, category: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'white' }}
                                        >
                                            <option value="Stock">📦 Stock (Muebles)</option>
                                            <option value="Materia Prima">🪵 Materia Prima</option>
                                            <option value="Exposición">🏢 Exposición</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Ubicación</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ej: Pasillo A-1"
                                            value={editingAsset.location} 
                                            onChange={(e) => setEditingAsset({...editingAsset, location: e.target.value})}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Código de Barras</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input 
                                            type="text" 
                                            value={editingAsset.barcode || ''} 
                                            onChange={(e) => setEditingAsset({...editingAsset, barcode: e.target.value})}
                                            placeholder="Escanear o ingresar código"
                                            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', fontFamily: 'monospace', fontWeight: 700 }}
                                        />
                                        <button 
                                            onClick={() => setShowScanner(!showScanner)}
                                            style={{ background: showScanner ? 'var(--danger)' : 'var(--primary)', color: 'white', border: 'none', padding: '0 12px', borderRadius: '12px', cursor: 'pointer' }}
                                        >
                                            <Camera size={18} />
                                        </button>
                                        <button 
                                            onClick={() => setEditingAsset({...editingAsset, barcode: Math.floor(Math.random() * 1000000000000).toString()})}
                                            style={{ background: '#f1f5f9', border: 'none', padding: '0 12px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}
                                        >
                                            Generar
                                        </button>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {showScanner && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden', marginTop: '1rem', borderRadius: '16px', background: 'black' }}
                                            >
                                                <div id="modal-reader" style={{ width: '100%', minHeight: '200px' }}></div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                                <button 
                                    onClick={() => { setEditingAsset(null); setShowScanner(false); }}
                                    style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSave}
                                    style={{ flex: 1, background: 'var(--primary)', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inventory;
