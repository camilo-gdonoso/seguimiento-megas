import { describe, test, expect, beforeAll, afterAll } from 'vitest';
const request = require('supertest');
const { app, pool } = require('../index');

describe('Pruebas Unitarias: Lógica de Clasificación de Estados', () => {
    
    let testTaskId;
    let actId;

    beforeAll(async () => {
        // Obtenemos una actividad existente para las pruebas
        const res = await pool.query('SELECT id FROM actividades LIMIT 1');
        actId = res.rows[0].id;
    });

    afterAll(async () => {
        if (testTaskId) {
            await pool.query('DELETE FROM tareas WHERE id = $1', [testTaskId]);
        }
        await pool.end();
    });

    test('Debe clasificar como RETRASADO si la fecha fin pasó y no está al 100%', async () => {
        const name = 'Tarea Retrasada ' + Date.now();
        const res = await pool.query(
            "INSERT INTO tareas (actividad_id, name, ponderacion_producto, fecha_inicio, fecha_fin, avance_fisico) VALUES ($1, $2, 100, '2023-01-01', '2023-01-31', 50) RETURNING id",
            [actId, name]
        );
        testTaskId = res.rows[0].id;

        const response = await request(app).get('/api/seguimiento/formulario1');
        const task = response.body.find(t => t.id === testTaskId);
        
        expect(task.estado_calculado).toBe('Retrasado');
    });

    test('Debe clasificar como TERMINADO solo si tiene 100% Y evidencia aprobada', async () => {
        const name = 'Tarea Terminada ' + Date.now();
        const res = await pool.query(
            "INSERT INTO tareas (actividad_id, name, ponderacion_producto, fecha_inicio, fecha_fin, avance_fisico) VALUES ($1, $2, 100, '2023-01-01', '2030-12-31', 100) RETURNING id",
            [actId, name]
        );
        const taskId = res.rows[0].id;

        // Primero verificamos sin evidencia aprobada (debería ser "En Proceso" o "Terminado" dependiendo de la lógica actual)
        // Según server/index.js línea 412, necesita evidencia aprobada para ser 'Terminado'
        let response = await request(app).get('/api/seguimiento/formulario1');
        let task = response.body.find(t => t.id === taskId);
        expect(task.estado_calculado).not.toBe('Terminado');

        // Insertamos avance aprobado con evidencia
        const avRes = await pool.query(
            "INSERT INTO avances_semanales (tarea_id, semana, avance_real, estado, evidencia_url) VALUES ($1, 1, 100, 'Aprobado', 'http://evidencia.com') RETURNING id",
            [taskId]
        );

        response = await request(app).get('/api/seguimiento/formulario1');
        task = response.body.find(t => t.id === taskId);
        
        expect(task.estado_calculado).toBe('Terminado');

        // Limpieza local
        await pool.query('DELETE FROM tareas WHERE id = $1', [taskId]);
    });

    test('Debe clasificar como PENDIENTE si la fecha de inicio es futura', async () => {
        const name = 'Tarea Pendiente ' + Date.now();
        const res = await pool.query(
            "INSERT INTO tareas (actividad_id, name, ponderacion_producto, fecha_inicio, fecha_fin, avance_fisico) VALUES ($1, $2, 100, '2029-01-01', '2029-12-31', 0) RETURNING id",
            [actId, name]
        );
        const taskId = res.rows[0].id;

        const response = await request(app).get('/api/seguimiento/formulario1');
        const task = response.body.find(t => t.id === taskId);
        
        expect(task.estado_calculado).toBe('Pendiente');

        await pool.query('DELETE FROM tareas WHERE id = $1', [taskId]);
    });
});
