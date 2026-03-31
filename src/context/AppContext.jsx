import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();

// Detect environment and set API URL correctly
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    const hostname = window.location.hostname;
    // If on Render, point to the known API service via HTTPS
    if (hostname.includes('onrender.com')) {
        return 'https://muebles-erp-api.onrender.com/api';
    }
    // Local workshop network fallback
    return `http://${hostname}:3000/api`;
};

export const API_URL = getApiUrl();

export const AppProvider = ({ children }) => {
    const [assets, setAssets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [personnelPayments, setPersonnelPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState(localStorage.getItem('muebles_last_view') || 'dashboard');
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('muebles_user')) || null);
    const [isAuthenticated, setIsAuthenticated] = useState(!!user);
    const [activeRole, setActiveRole] = useState(user?.role || 'Dueno');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Navigation Sync Logic
    const navigateTo = (view) => {
        if (view === activeView) return;
        setActiveView(view);
        localStorage.setItem('muebles_last_view', view);
        // Sync URL without refreshing (Pseudo-routing)
        const path = view === 'dashboard' ? '/' : `/${view}`;
        window.history.pushState({ view }, '', path);
    };

    useEffect(() => {
        // Handle Back/Forward buttons
        const handlePopState = (event) => {
            if (event.state && event.state.view) {
                setActiveView(event.state.view);
            } else {
                // Fallback for base path
                const path = window.location.pathname.replace('/', '');
                setActiveView(path || 'dashboard');
            }
        };

        // Sync initial URL on load
        const path = window.location.pathname.split('/')[1];
        const allowedViews = ['dashboard', 'inventory', 'projects', 'pos', 'purchases', 'reports', 'sales', 'expenses', 'personal', 'leads', 'customers', 'tech-doc'];

        if (path && allowedViews.includes(path)) {
            setActiveView(path);
        } else if (path) {
            // If path is invalid, redirect to home
            window.history.replaceState({}, '', '/');
            setActiveView('dashboard');
        }

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            const isCloud = API_URL.includes('onrender.com');

            try {
                const [assetsRes, projectsRes, salesRes, purchasesRes, suppliersRes, usersRes, paymentsRes, expensesRes, customersRes, personnelRes, personnelPaymentsRes] = await Promise.all([
                    axios.get(`${API_URL}/assets`),
                    axios.get(`${API_URL}/projects`),
                    axios.get(`${API_URL}/sales`),
                    axios.get(`${API_URL}/purchases`),
                    axios.get(`${API_URL}/suppliers`),
                    axios.get(`${API_URL}/users`),
                    axios.get(`${API_URL}/payments`),
                    axios.get(`${API_URL}/expenses`),
                    axios.get(`${API_URL}/customers`),
                    axios.get(`${API_URL}/personnel`),
                    axios.get(`${API_URL}/personnel_payments`)
                ]);

                setAssets(assetsRes.data || []);
                setProjects(projectsRes.data || []);
                setSales(salesRes.data || []);
                setPurchases(purchasesRes.data || []);
                setSuppliers(suppliersRes.data || []);
                setUsers(usersRes.data || []);
                setPayments(paymentsRes.data || []);
                setExpenses(expensesRes.data || []);
                setCustomers(customersRes.data || []);
                setPersonnel(personnelRes.data || []);
                setPersonnelPayments(personnelPaymentsRes.data || []);

                // Alert the user only on the first load
                if (loading) {
                    addNotification(
                        isCloud ? '🟢 Conectado a la NUBE (Sincronización Activa)' : '🏠 Modo Local (Solo esta PC)',
                        'info'
                    );
                }
            } catch (e) {
                console.error('Sync error:', e.message);
            } finally {
                setLoading(false);
            }
        };

        bootstrap();
        const interval = setInterval(bootstrap, 30000);
        return () => clearInterval(interval);
    }, [loading]); // Added loading to deps to trigger initial notification

    const saveAndSync = (key, data) => {
        // localStorage is not a source of truth — only API is
        // Kept only for non-data UI preferences
    };

    const addAsset = async (asset) => {
        try {
            // Remove temp ID if any, let DB handle it
            const { id, ...assetData } = asset;
            const res = await axios.post(`${API_URL}/assets`, assetData);
            const newAsset = res.data;

            setAssets(prev => [newAsset, ...prev]);
            addNotification(`Producto "${newAsset.name}" agregado al inventario`, 'success');
            return newAsset;
        } catch (err) {
            console.error("Error adding asset:", err);
            addNotification('Error al guardar en la nube', 'error');
            return null;
        }
    };

    const updateAsset = async (id, updatedFields, existingObject = null) => {
        let itemToUpdate = existingObject || assets.find(a => a.id === id);
        if (!itemToUpdate) return;

        const updatedItem = { ...itemToUpdate, ...updatedFields };

        // Update local state
        setAssets(prev => prev.map(a => a.id === id ? updatedItem : a));

        // Sync with DB
        try {
            await axios.post(`${API_URL}/assets`, updatedItem);
            addNotification(`Producto "${updatedItem.name}" actualizado`, 'info');
        } catch (err) {
            console.error("Error updating asset:", err);
            addNotification('Error al actualizar inventario', 'error');
        }
    };

    const deleteAsset = async (id) => {
        const asset = assets.find(a => a.id === id);
        const updated = assets.filter(a => a.id !== id);
        setAssets(updated);
        saveAndSync('assets', updated);
        await axios.delete(`${API_URL}/assets/${id}`).catch(console.error);
        if (asset) addNotification(`Producto "${asset.name}" eliminado`, 'info');
    };

    const addSupplier = async (supplier) => {
        try {
            const res = await axios.post(`${API_URL}/suppliers`, supplier);
            setSuppliers(prev => [...prev, res.data]);
            addNotification(`Proveedor "${supplier.name}" registrado`, 'success');
        } catch (err) {
            console.error("Error adding supplier:", err);
            addNotification('Error al registrar proveedor', 'error');
        }
    };

    const addPurchase = async (purchase) => {
        const purchaseWithDate = { ...purchase, date: formatDate() };
        try {
            const res = await axios.post(`${API_URL}/purchases`, purchaseWithDate);
            setPurchases(prev => [res.data, ...prev]);
            addNotification(`Orden ${purchase.id} generada correctamente`, 'success');
        } catch (err) {
            console.error("Error adding purchase:", err);
            addNotification('Error al guardar la orden', 'error');
        }
    };

    const formatDate = (date = new Date()) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const addSale = async (sale) => {
        const saleWithDate = { ...sale, date: formatDate() };
        try {
            const res = await axios.post(`${API_URL}/sales`, saleWithDate);
            if (res.status === 201 || res.status === 200) {
                setSales(prev => [saleWithDate, ...prev]);
                addNotification(`Nueva venta registrada: ${sale.total.toLocaleString()} Bs.`, 'success');
                return true;
            }
            return false;
        } catch (err) {
            console.error(err);
            addNotification('Error al guardar venta en la base de datos', 'error');
            return false;
        }
    };

    const updateProject = async (id, updatedFields) => {
        try {
            const currentProj = projects.find(p => p.id === id);
            if (!currentProj) return;
            const updatedProj = { ...currentProj, ...updatedFields };

            setProjects(prev => prev.map(p => p.id === id ? updatedProj : p));
            await axios.post(`${API_URL}/projects`, updatedProj);
            addNotification(`Orden de Trabajo "${updatedProj.name}" actualizada`, 'info');
        } catch (err) {
            console.error("Error updating project:", err);
        }
    };

    const addProject = async (project) => {
        const projectWithDate = { ...project, date: formatDate() };
        try {
            const res = await axios.post(`${API_URL}/projects`, projectWithDate);
            setProjects(prev => [res.data, ...prev]);
            addNotification(`Nueva Orden de Trabajo "${project.name}" creada`, 'success');
        } catch (err) {
            console.error("Error adding project:", err);
            addNotification('Error al crear orden de trabajo', 'error');
        }
    };

    const addPayment = async (payment) => {
        const paymentWithDate = { ...payment, date: formatDate() };
        const res = await axios.post(`${API_URL}/payments`, paymentWithDate).catch(console.error);
        if (res) {
            const newPay = res.data;
            setPayments(prev => [newPay, ...prev]);

            // Sync project paid amount
            const proj = projects.find(p => p.id === payment.project_id);
            if (proj) {
                const newPaid = (Number(proj.paid) || 0) + (Number(payment.amount) || 0);
                await updateProject(proj.id, { paid: newPaid });
            }
        }
    };

    const deletePayment = async (paymentId) => {
        try {
            const pmt = payments.find(p => p.id === paymentId);
            await axios.delete(`${API_URL}/payments/${paymentId}`);
            setPayments(prev => prev.filter(p => p.id !== paymentId));

            if (pmt) {
                const proj = projects.find(p => p.id === pmt.project_id);
                if (proj) {
                    const newPaid = Math.max(0, (Number(proj.paid) || 0) - (Number(pmt.amount) || 0));
                    await updateProject(proj.id, { paid: newPaid });
                }
            }
            addNotification('Pago eliminado', 'info');
        } catch (err) {
            console.error(err);
        }
    };

    const addExpense = async (expense) => {
        const expenseWithDate = { ...expense, date: expense.date || formatDate() };
        const res = await axios.post(`${API_URL}/expenses`, expenseWithDate).catch(console.error);
        if (res) {
            setExpenses(prev => [res.data, ...prev]);
        }
    };

    const deleteExpense = async (id) => {
        await axios.delete(`${API_URL}/expenses/${id}`).catch(console.error);
        setExpenses(prev => prev.filter(e => e.id !== id));
    };

    const getPaymentsByProject = async (projectId) => {
        try {
            const res = await axios.get(`${API_URL}/projects/${projectId}/payments`);
            return res.data;
        } catch (err) {
            console.error(err);
            return [];
        }
    };

    const [notifications, setNotifications] = useState([]);
    const [actionTrigger, setActionTrigger] = useState(null);

    const dispatchAction = (action) => {
        setActionTrigger({ type: action, timestamp: Date.now() });
    };

    const addNotification = (msg, type = 'info') => {
        setNotifications(prev => [{ id: Date.now() + Math.random(), msg, type, read: false }, ...prev].slice(0, 10));
    };

    const markAllNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const addUser = async (newUser) => {
        const res = await axios.post(`${API_URL}/users`, newUser);
        setUsers([...users, res.data]);
        addNotification(`Usuario ${newUser.username} creado`, 'success');
    };

    const deleteUser = async (id) => {
        await axios.delete(`${API_URL}/users/${id}`);
        setUsers(users.filter(u => u.id !== id));
        addNotification('Usuario eliminado', 'info');
    };

    const addCustomer = async (newCustomer) => {
        const customerWithDate = { ...newCustomer, date: formatDate() };
        try {
            const res = await axios.post(`${API_URL}/customers`, customerWithDate);
            setCustomers(prev => [res.data, ...prev]);
            addNotification(`Cliente "${newCustomer.name}" registrado con éxito`, 'success');
            return res.data;
        } catch (err) {
            console.error("Error adding customer:", err);
            addNotification('Error al registrar cliente', 'error');
            return null;
        }
    };

    const deleteCustomer = async (id) => {
        try {
            await axios.delete(`${API_URL}/customers/${id}`);
            setCustomers(prev => prev.filter(c => c.id !== id));
            addNotification('Cliente eliminado de la base de datos', 'info');
        } catch (err) {
            console.error("Error deleting customer:", err);
            addNotification('Error al eliminar cliente', 'error');
        }
    };

    const deleteProject = async (id) => {
        const projectToDelete = projects.find(p => p.id == id || p.id === String(id));

        try {
            // Re-establish materials/supplies stock in inventory
            if (projectToDelete && projectToDelete.supplies && Array.isArray(projectToDelete.supplies)) {
                for (const s of projectToDelete.supplies) {
                    const asset = assets.find(a => a.name.toLowerCase() === s.name.toLowerCase());
                    if (asset) {
                        const currentStock = Number(asset.stock) || 0;
                        const qtyToRestore = Number(s.qty) || 0;
                        await updateAsset(asset.id, { stock: currentStock + qtyToRestore });
                    }
                }
                addNotification('Materiales de la orden reincorporados al inventario real.', 'info');
            }

            await axios.delete(`${API_URL}/projects/${id}`);
            setProjects(prev => prev.filter(p => p.id !== id));
            addNotification('Orden de trabajo eliminada permanentemente', 'success');
        } catch (err) {
            console.error("Error deleting project:", err);
            addNotification('Error al eliminar orden de trabajo', 'error');
        }
    };

    const addPersonnel = async (person) => {
        const personWithDate = { ...person, date_joined: formatDate() };
        try {
            const res = await axios.post(`${API_URL}/personnel`, personWithDate);
            setPersonnel(prev => [res.data, ...prev]);
            addNotification(`Empleado "${person.name}" registrado`, 'success');
            return res.data;
        } catch (err) {
            console.error("Error adding personnel:", err);
            addNotification('Error al registrar personal', 'error');
            return null;
        }
    };

    const updatePersonnel = async (id, updatedFields) => {
        try {
            const res = await axios.post(`${API_URL}/personnel`, { id, ...updatedFields });
            setPersonnel(prev => prev.map(p => p.id === id ? res.data : p));
            addNotification(`Datos de "${res.data.name}" actualizados`, 'info');
        } catch (err) {
            console.error("Error updating personnel:", err);
        }
    };

    const deletePersonnel = async (id) => {
        try {
            await axios.delete(`${API_URL}/personnel/${id}`);
            setPersonnel(prev => prev.filter(p => p.id !== id));
            addNotification('Ficha de personal eliminada', 'info');
        } catch (err) {
            console.error("Error deleting personnel:", err);
        }
    };

    const addPersonnelPayment = async (data) => {
        try {
            const res = await axios.post(`${API_URL}/personnel_payments`, data);
            const newPayment = res.data;
            setPersonnelPayments(prev => [newPayment, ...prev]);

            // Also register as expense automatically
            const person = personnel.find(p => p.id === data.personnel_id);
            const projectName = projects.find(p => p.id === data.project_id)?.name || '';

            await addExpense({
                description: `Pago Personal: ${person?.name || 'Empleado'} ${projectName ? `(Orden: ${projectName})` : ''} - ${data.notes || 'Sueldo'}`,
                amount: Number(data.amount),
                category: 'Mano de Obra',
                date: data.date,
                method: data.method
            });

            addNotification('Pago y gasto registrados con éxito', 'success');
            return newPayment;
        } catch (err) {
            console.error("Error adding personnel payment:", err);
            addNotification('Error al registrar pago', 'error');
        }
    };

    const deletePersonnelPayment = async (id) => {
        try {
            await axios.delete(`${API_URL}/personnel_payments/${id}`);
            setPersonnelPayments(prev => prev.filter(p => p.id !== id));
            addNotification('Pago eliminado', 'info');
        } catch (err) {
            console.error("Error deleting personnel payment:", err);
        }
    };

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { username, password });
            const userData = res.data;
            setUser(userData);
            setActiveRole(userData.role);
            setIsAuthenticated(true);
            localStorage.setItem('muebles_user', JSON.stringify(userData));
            addNotification(`Bienvenido, ${userData.fullname || userData.username}`, 'success');
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.error || 'Error de conexión' };
        }
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('muebles_user');
    };

    return (
        <AppContext.Provider value={{
            assets, setAssets,
            projects, setProjects,
            sales, setSales,
            purchases, setPurchases,
            suppliers, setSuppliers,
            loading,
            activeView, setActiveView: navigateTo,
            activeRole, setActiveRole,
            addAsset, updateAsset, deleteAsset,
            addSupplier, addPurchase, addSale, updateProject, addProject, deleteProject, addPayment, deletePayment, getPaymentsByProject,
            payments,
            expenses, addExpense, deleteExpense,
            users, addUser, deleteUser,
            customers, addCustomer, deleteCustomer,
            personnel, addPersonnel, updatePersonnel, deletePersonnel,
            personnelPayments, addPersonnelPayment, deletePersonnelPayment,
            notifications, addNotification, markAllNotificationsAsRead, clearNotifications,
            actionTrigger, dispatchAction, setActionTrigger,
            searchTerm, setSearchTerm,
            isSidebarOpen, setIsSidebarOpen,
            user, isAuthenticated, login, logout
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
