const request = require('supertest');
const { app, pool } = require('../index');

describe('Monitoreo: Estados Automáticos y Cascada', () => {

    test('Lógica de Estados: Pendiente', async () => {
        const res = await request(app).get('/api/seguimiento/formulario1');
        const pendiente = res.body.find(t => parseFloat(t.avance_fisico) === 0 && new Date(t.fecha_fin) >= new Date());
        if (pendiente) {
            expect(pendiente.estado_calculado).toBe('Pendiente');
        }
    });

    test('Lógica de Estados: Retrasado', async () => {
        // Creamos una tarea con fecha pasada para forzar el estado
        const actRes = await pool.query('SELECT id FROM actividades LIMIT 1');
        const actId = actRes.rows[0].id;
        
        const taskName = 'Tarea Retrasada Test ' + Date.now();
        await pool.query(
            "INSERT INTO tareas (actividad_id, name, ponderacion_producto, fecha_inicio, fecha_fin, avance_fisico) VALUES ($1, $2, 10, '2020-01-01', '2020-02-01', 50)",
            [actId, taskName]
        );

        const res = await request(app).get('/api/seguimiento/formulario1');
        const task = res.body.find(t => t.name === taskName);
        expect(task.estado_calculado).toBe('Retrasado');
    });

    test('Cascada de Progreso: Tarea -> Producto -> MeGA', async () => {
        // Buscamos una tarea y su jerarquía
        const fullData = await request(app).get('/api/seguimiento/formulario1');
        const row = fullData.body[0];
        const { id, actividad_id } = row;
        
        // Obtenemos IDs de niveles superiores
        const hierarchy = await pool.query(`
            SELECT a.producto_id, p.mega_id 
            FROM actividades a 
            JOIN productos_intermedios p ON a.producto_id = p.id 
            WHERE a.id = $1`, [actividad_id]);
        const { producto_id, mega_id } = hierarchy.rows[0];

        // Reportamos avance del 100% en la tarea
        await request(app)
            .post('/api/avances-semanales')
            .send({
                tarea_id: id,
                semana: 1,
                avance_real: 100
            });

        // Verificamos que el producto se actualizó (al menos un poco)
        const prod = await pool.query('SELECT avance_fisico FROM productos_intermedios WHERE id = $1', [producto_id]);
        expect(parseFloat(prod.rows[0].avance_fisico)).toBeGreaterThan(0);

        // Verificamos que el MeGA se actualizó
        const mega = await pool.query('SELECT avance_fisico FROM megas WHERE id = $1', [mega_id]);
        expect(parseFloat(mega.rows[0].avance_fisico)).toBeGreaterThan(0);
    });
});
