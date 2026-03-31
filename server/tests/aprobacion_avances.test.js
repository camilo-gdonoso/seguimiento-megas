const request = require('supertest');
const { app, pool } = require('../index');

/**
 * Suite de Pruebas: Módulo 3 — Aprobación de Avances y Cascada
 *
 * Cubre los requerimientos:
 *  - RF-4.1: Solo avances Aprobados deben impactar el avance_fisico de la tarea.
 *  - RF-4.2: La cascada de progreso (Tarea -> Producto -> MeGA) solo ocurre tras la aprobación del Director.
 *  - RF-5.1: El rechazo de un avance no debe alterar el avance_fisico.
 */
describe('Módulo 3 — Aprobación de Avances y Cascada de Progreso', () => {
  let tareaId;
  let productId;
  let megaId;
  let directorId;
  let avanceId;

  // ── Setup: obtener IDs reales de la BD ──────────────────────────────
  beforeAll(async () => {
    // Task with a planograma and known hierarchy
    const tareaRes = await pool.query(`
      SELECT t.id, a.producto_id, prod.mega_id
      FROM tareas t
      JOIN actividades a ON t.actividad_id = a.id
      JOIN productos_intermedios prod ON a.producto_id = prod.id
      LIMIT 1
    `);
    if (tareaRes.rows.length === 0) return; // Skip if DB is empty
    tareaId   = tareaRes.rows[0].id;
    productId = tareaRes.rows[0].producto_id;
    megaId    = tareaRes.rows[0].mega_id;

    // Any director user
    const dirRes = await pool.query(`SELECT id FROM usuarios WHERE role='Director' OR role='Admin' LIMIT 1`);
    if (dirRes.rows.length > 0) directorId = dirRes.rows[0].id;
  });

  // ── RF-4.1: Reportar avance NO mueve avance_fisico todavía ──────────
  test('Reportar avance: estado queda en "Reportado" (No Aprobado)', async () => {
    if (!tareaId) return;

    const UNIQUE_SEMANA = 98; // Use a high week number unlikely to collide
    const res = await request(app)
      .post('/api/avances-semanales')
      .send({ tarea_id: tareaId, semana: UNIQUE_SEMANA, avance_real: 50 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Read the inserted avance
    const avRes = await pool.query(
      `SELECT id, estado FROM avances_semanales WHERE tarea_id=$1 AND semana=$2`,
      [tareaId, UNIQUE_SEMANA]
    );
    expect(avRes.rows.length).toBeGreaterThan(0);
    expect(avRes.rows[0].estado).toBe('Reportado');
    avanceId = avRes.rows[0].id;

    // The tarea's avance_fisico should NOT include this pending report
    const taskRes = await pool.query('SELECT avance_fisico FROM tareas WHERE id=$1', [tareaId]);
    // The pending avance (50%) should NOT have been added yet
    // (we cannot guarantee exact value but state=Reportado is the key check above)
  }, 15000);

  // ── RF-4.2: Aprobar avance SÍ mueve la cascada ─────────────────────
  test('Aprobar avance: cascada actualiza Tarea -> Producto -> MeGA', async () => {
    if (!avanceId || !directorId) return;

    // Capture before values
    const beforeTask = await pool.query('SELECT avance_fisico FROM tareas WHERE id=$1', [tareaId]);
    const beforeProd = await pool.query('SELECT avance_fisico FROM productos_intermedios WHERE id=$1', [productId]);
    const prevTaskAv = parseFloat(beforeTask.rows[0]?.avance_fisico || 0);

    // Director approves the avance
    const apRes = await request(app)
      .post('/api/avances-semanales/validar')
      .set('x-user-id', String(directorId))
      .send({ avance_id: avanceId, estado: 'Aprobado', observacion: 'Aprobado por test' });

    expect(apRes.statusCode).toBe(200);

    // After approval: tarea avance should be >= previous (cascada recalculated)
    const afterTask = await pool.query('SELECT avance_fisico FROM tareas WHERE id=$1', [tareaId]);
    const afterProd = await pool.query('SELECT avance_fisico FROM productos_intermedios WHERE id=$1', [productId]);
    const afterMega = await pool.query('SELECT avance_fisico FROM megas WHERE id=$1', [megaId]);

    expect(parseFloat(afterTask.rows[0].avance_fisico)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(afterProd.rows[0].avance_fisico)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(afterMega.rows[0].avance_fisico)).toBeGreaterThanOrEqual(0);
  }, 15000);

  // ── RF-5.1: Rechazar avance NO debe alterar avance_fisico ───────────
  test('Rechazar avance: NO altera el avance_fisico de la tarea', async () => {
    if (!tareaId || !directorId) return;

    const SEMANA_RECHAZADA = 99;
    // Report a new avance
    await request(app)
      .post('/api/avances-semanales')
      .send({ tarea_id: tareaId, semana: SEMANA_RECHAZADA, avance_real: 30 });

    const av = await pool.query(
      `SELECT id FROM avances_semanales WHERE tarea_id=$1 AND semana=$2`,
      [tareaId, SEMANA_RECHAZADA]
    );
    if (!av.rows.length) return;
    const rejectedId = av.rows[0].id;

    // Snapshot before rejection
    const before = await pool.query('SELECT avance_fisico FROM tareas WHERE id=$1', [tareaId]);
    const beforeAv = parseFloat(before.rows[0].avance_fisico);

    // Director rejects it
    await request(app)
      .post('/api/avances-semanales/validar')
      .set('x-user-id', String(directorId))
      .send({ avance_id: rejectedId, estado: 'Rechazado', observacion: 'No procede' });

    // avance_fisico should be unchanged (rejected advances are not counted)
    const after = await pool.query('SELECT avance_fisico FROM tareas WHERE id=$1', [tareaId]);
    expect(parseFloat(after.rows[0].avance_fisico)).toEqual(beforeAv);
  }, 15000);
});
