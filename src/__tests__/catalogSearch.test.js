import { describe, it, expect } from 'vitest';

// Simulación extraída de la lógica de filtrado global de Catalog.jsx
const filterCatalogData = (data, searchTerm, activeTab = 'tareas', user = { role: 'Admin' }) => {
    return data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        
        // Búsqueda global a través de múltiples campos clave (Observación 11)
        const matchSearch = (
            (item.name || '') + ' ' + 
            (item.description || '') + ' ' + 
            (item.code || '') + ' ' + 
            (item.mega_name || '') + ' ' + 
            (item.producto_name || '') + ' ' + 
            (item.actividad_name || '') + ' ' + 
            (item.responsable_nombre || '') + ' ' + 
            (item.responsable_directo || '') + ' ' +
            (item.director_responsable || '')
        ).toLowerCase().includes(searchLower);
        
        // Filtros de roles simulados
        if (activeTab === 'tareas' && user?.role === 'Tecnico') {
            return matchSearch && Number(item.user_assigned_id) === Number(user?.id);
        }
        
        return matchSearch;
    });
};

describe('Lógica de Búsqueda Global (Matriz de Planificación)', () => {
    const mockData = [
        { id: 1, name: 'Desarrollar Frontend', responsable_nombre: 'Juan Perez', mega_name: 'Implementación ERP' },
        { id: 2, name: 'Revisión de Base de Datos', responsable_nombre: 'Maria Gomez', actividad_name: 'Auditoría inicial', user_assigned_id: 200 },
        { id: 3, code: 'TR-10', description: 'Capacitación a funcionarios', producto_name: 'Manuales listos' }
    ];

    it('debe buscar y encontrar por nombre del responsable (Funcionario asignado)', () => {
        const result = filterCatalogData(mockData, 'Juan Perez');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('debe buscar y encontrar por nombre del Resultado (MeGA)', () => {
        const result = filterCatalogData(mockData, 'erp');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(1);
    });

    it('debe buscar y encontrar por nombre de Actividad', () => {
        const result = filterCatalogData(mockData, 'Auditoría');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);
    });

    it('debe buscar y encontrar por código o descripción general', () => {
        const result = filterCatalogData(mockData, 'TR-10');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(3);
    });

    it('debe manejar filtros de rol combinados con la búsqueda', () => {
        // Técnico 200 buscando "Base de datos"
        const result = filterCatalogData(
            mockData, 
            'Base de Datos', 
            'tareas', 
            { role: 'Tecnico', id: 200 }
        );
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(2);

        // Técnico 100 intentando buscar una tarea que no le corresponde
        const resultWrongUser = filterCatalogData(
            mockData, 
            'Base de Datos', 
            'tareas', 
            { role: 'Tecnico', id: 100 }
        );
        expect(resultWrongUser).toHaveLength(0);
    });
});
