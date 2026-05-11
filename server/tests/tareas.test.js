const request = require('supertest');
const { app, pool } = require('../index.js');

// Mock pool.query directly
jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
        connect: jest.fn(),
        on: jest.fn()
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('Tareas API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/tareas', () => {
        it('should allow creating an isolated task without actividad_id', async () => {
            // Mock the pool query response inside index.js by overriding pool.query
            pool.query = jest.fn().mockResolvedValueOnce({
                rows: [{ id: 1, name: 'Tarea Aislada Test', is_isolated: true, actividad_id: null }]
            });

            const res = await request(app)
                .post('/api/tareas')
                .send({
                    name: 'Tarea Aislada Test',
                    is_isolated: true,
                    ponderacion_producto: 10,
                    actividad_id: null
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.id).toBe(1);
            expect(res.body.is_isolated).toBe(true);
            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO tareas');
        });

        it('should validate dates for non-isolated (POA) tasks', async () => {
            // Actividad mock
            pool.query = jest.fn().mockResolvedValueOnce({
                rows: [{ fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' }]
            });

            const res = await request(app)
                .post('/api/tareas')
                .send({
                    name: 'Tarea POA Normal',
                    is_isolated: false,
                    actividad_id: 100,
                    fecha_inicio: '2025-01-01', // Invalid date (before actividad)
                    fecha_fin: '2026-06-01'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('fecha_inicio no puede ser anterior');
        });
    });

    describe('GET /api/dashboard-stats', () => {
        it('should return delayed_tasks successfully', async () => {
            pool.query = jest.fn((query) => {
                if (query.includes('FROM unidades_organizacionales')) {
                    return Promise.resolve({ rows: [{ name: 'Unidad A', progress: 50 }] });
                }
                if (query.includes('dias_retraso')) {
                    return Promise.resolve({ rows: [{ id: 1, name: 'Tarea Crítica', dias_retraso: 10 }] });
                }
                if (query.includes('COUNT(t.id) as total_tasks')) {
                    return Promise.resolve({ rows: [{ progress: 50 }] });
                }
                return Promise.resolve({ rows: [] });
            });

            const res = await request(app).get('/api/dashboard-stats');

            expect(res.statusCode).toEqual(200);
            expect(res.body.delayed_tasks).toBeDefined();
            expect(res.body.delayed_tasks[0].dias_retraso).toBe(10);
            expect(res.body.units).toBeDefined();
            expect(res.body.units[0].name).toBe('Unidad A');
        });
    });
});
