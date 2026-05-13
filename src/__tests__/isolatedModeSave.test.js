import { describe, it, expect } from 'vitest';

// Simulación de la lógica de enrutamiento al guardar registros en la Matriz
const getEndpointResource = (activeTab, isIsolatedMode) => {
    const resourceMap = {
        'organigrama': 'unidades',
        'ejes': 'ejes',
        'resultados': 'resultados',
        'estrategias': 'estrategias',
        'megas': 'megas',
        'productos': 'productos',
        'actividades': 'actividades',
        'tareas': 'tareas',
        'tareas_aisladas': 'tareas',
    };

    // Lógica corregida: El modo aislado siempre corresponde a una 'Tarea' en la base de datos
    return isIsolatedMode ? 'tareas' : resourceMap[activeTab];
};

describe('Lógica de Enrutamiento para Guardar Registros (Observación 13)', () => {
    it('debe enrutar a "tareas" si el modo aislado está activo, independientemente de la pestaña', () => {
        expect(getEndpointResource('actividades', true)).toBe('tareas');
        expect(getEndpointResource('productos', true)).toBe('tareas');
        expect(getEndpointResource('resultados', true)).toBe('tareas');
        expect(getEndpointResource('tareas', true)).toBe('tareas');
    });

    it('debe enrutar a la tabla correspondiente según el mapa si NO está en modo aislado', () => {
        expect(getEndpointResource('actividades', false)).toBe('actividades');
        expect(getEndpointResource('productos', false)).toBe('productos');
        expect(getEndpointResource('resultados', false)).toBe('resultados');
        expect(getEndpointResource('tareas', false)).toBe('tareas');
    });

    it('debe mapear "tareas_aisladas" a "tareas" en modo normal', () => {
        expect(getEndpointResource('tareas_aisladas', false)).toBe('tareas');
    });
});
