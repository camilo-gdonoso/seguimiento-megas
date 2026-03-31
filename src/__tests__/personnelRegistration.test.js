import { describe, it, expect, vi } from 'vitest';

// Simulación de la lógica de negocio para las pruebas unitarias
const addWorkerToProjectLogic = async ({
    newWorker,
    personnel,
    addPersonnel,
    setSelectedProject,
    addNotification
}) => {
    if (!newWorker.name) {
        addNotification('Ingresa el nombre del trabajador', 'info');
        return;
    }
    
    let workerToAssign = { ...newWorker };
    
    // Si no tiene personnel_id, significa que es nuevo. Registrar en la base de datos de Personal.
    if (!workerToAssign.personnel_id) {
        try {
            const newPerson = await addPersonnel({
                name: workerToAssign.name,
                role: workerToAssign.role,
                type: 'Ocasional',
                status: 'Activo'
            });
            
            if (newPerson && newPerson.id) {
                workerToAssign.personnel_id = newPerson.id;
                addNotification(`"${workerToAssign.name}" se registró automáticamente`, 'success');
            }
        } catch (err) {
            addNotification('Error al registrar nuevo personal', 'error');
            return;
        }
    }

    setSelectedProject(prev => {
        const workers = [...(prev.workers || []), { 
            ...workerToAssign, 
            salary: Number(workerToAssign.salary) || 0,
            id: 12345 // Mock ID
        }];
        return { ...prev, workers };
    });
};

describe('Registro de Personal Ocasional desde Obra', () => {
    it('debe registrar un nuevo trabajador en Personal si no existe previamente', async () => {
        const addPersonnel = vi.fn().mockResolvedValue({ id: 'P001', name: 'Juan Perez' });
        const setSelectedProject = vi.fn();
        const addNotification = vi.fn();
        
        const newWorker = { name: 'Juan Perez', role: 'Carpintería', salary: 100, personnel_id: '' };
        
        await addWorkerToProjectLogic({
            newWorker,
            addPersonnel,
            setSelectedProject,
            addNotification
        });
        
        expect(addPersonnel).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Juan Perez',
            type: 'Ocasional'
        }));
        expect(addNotification).toHaveBeenCalledWith(expect.stringContaining('Juan Perez'), 'success');
        expect(setSelectedProject).toHaveBeenCalled();
    });

    it('no debe registrar en Personal si el trabajador ya tiene un personnel_id', async () => {
        const addPersonnel = vi.fn();
        const setSelectedProject = vi.fn();
        const addNotification = vi.fn();
        
        const newWorker = { name: 'Juan Perez', role: 'Carpintería', salary: 100, personnel_id: 'P001' };
        
        await addWorkerToProjectLogic({
            newWorker,
            addPersonnel,
            setSelectedProject,
            addNotification
        });
        
        expect(addPersonnel).not.toHaveBeenCalled();
        expect(setSelectedProject).toHaveBeenCalled();
    });

    it('no debe permitir un pago si la cuenta ya está saldada', async () => {
        const addNotification = vi.fn();
        const addPersonnelPayment = vi.fn();
        
        // Simulación locales de la validación
        const handleAddPaymentLogic = async ({ amount, totalAcordado, abonoPrevio }) => {
            const saldoPendiente = totalAcordado - abonoPrevio;
            if (saldoPendiente <= 0 && totalAcordado > 0) {
                addNotification('Cuenta saldada', 'error');
                return false;
            }
            return true;
        };

        const canPay = await handleAddPaymentLogic({
            amount: 50,
            totalAcordado: 100,
            abonoPrevio: 100
        });

        expect(canPay).toBe(false);
        expect(addNotification).toHaveBeenCalledWith('Cuenta saldada', 'error');
    });
});
