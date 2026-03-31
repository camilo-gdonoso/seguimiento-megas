const request = require('supertest');
const { app, pool } = require('../index');

/**
 * Suite: Módulo 5 — Auditoría e Historial de Cambios
 *
 * Cubre:
 *  - RF-7.1: Toda acción CRUD genera un registro en la tabla 'auditoria'.
 *  - RF-7.2: El endpoint GET /api/auditoria retorna logs completos con user_name.
 *  - RF-7.3: La validación de un avance (Aprobado/Rechazado) genera su propio log.
 */
describe('Módulo 5 — Auditoría e Historial', () => {

  // ── RF-7.2: El endpoint de auditoría responde y tiene la estructura correcta ─
  test('GET /api/auditoria retorna array con estructura válida', async () => {
    const res = await request(app)
      .get('/api/auditoria')
      .set('x-user-id', '1'); // ID de Admin

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const log = res.body[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('table_name');
      expect(log).toHaveProperty('record_id');
      expect(log).toHaveProperty('created_at');
      // user_name comes from the LEFT JOIN with usuarios
      // May be null if action was system-triggered
      expect(log).toHaveProperty('user_name');
    }
  });

  // ── RF-7.1: Crear una tarea debe generar un log de auditoría (CREATE) ─────
  test('Crear un eje genera registro de auditoría con acción CREATE', async () => {
    const uniqueCode = 'EjeTest_' + Date.now();
    const adminId = 1; // Assume admin user has id=1 in seeded DB

    await request(app)
      .post('/api/ejes')
      .set('x-user-id', String(adminId))
      .send({ code: uniqueCode, description: 'Eje de prueba unitaria' });

    // Allow a brief moment for the async audit log insert
    await new Promise(r => setTimeout(r, 300));

    const logs = await pool.query(
      `SELECT * FROM auditoria WHERE table_name='ejes' AND action='CREATE' ORDER BY created_at DESC LIMIT 5`
    );
    expect(logs.rows.length).toBeGreaterThan(0);
    const lastLog = logs.rows[0];
    expect(lastLog.action).toBe('CREATE');
    expect(lastLog.table_name).toBe('ejes');
    expect(lastLog.new_value).not.toBeNull();
  });

  // ── RF-7.3: La validación de avances genera log con acción correcta ──────
  test('Validar un avance genera log de AVANCE_VALIDACION en auditoría', async () => {
    const tareaRes = await pool.query('SELECT id FROM tareas LIMIT 1');
    if (!tareaRes.rows.length) return;

    const tareaId = tareaRes.rows[0].id;
    const SEMANA_AUDIT = 97;

    // Create avance
    await request(app)
      .post('/api/avances-semanales')
      .send({ tarea_id: tareaId, semana: SEMANA_AUDIT, avance_real: 10 });

    const avRes = await pool.query(
      `SELECT id FROM avances_semanales WHERE tarea_id=$1 AND semana=$2`,
      [tareaId, SEMANA_AUDIT]
    );
    if (!avRes.rows.length) return;
    const avanceId = avRes.rows[0].id;

    // Director validates
    await request(app)
      .post('/api/avances-semanales/validar')
      .set('x-user-id', '1')
      .send({ avance_id: avanceId, estado: 'Aprobado', observacion: 'Audit test' });

    // Allow a brief moment for the async audit log insert
    await new Promise(r => setTimeout(r, 600));

    const auditLog = await pool.query(
      `SELECT * FROM auditoria WHERE table_name='avances_semanales' AND action='AVANCE_VALIDACION' ORDER BY created_at DESC LIMIT 3`
    );
    expect(auditLog.rows.length).toBeGreaterThan(0);
    expect(auditLog.rows[0].record_id).toBe(avanceId);
  }, 20000);

  // ── Integrity: límite de 200 registros no rompe la respuesta ─────────────
  test('GET /api/auditoria no retorna más de 200 registros', async () => {
    const res = await request(app).get('/api/auditoria');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(200);
  });
});
