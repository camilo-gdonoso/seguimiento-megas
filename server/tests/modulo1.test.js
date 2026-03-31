const request = require('supertest');
const { app, pool } = require('../index');

/**
 * Módulo 1: Configuración Estratégica - Batería de Pruebas Unitarias
 * Valida el cumplimiento de los requerimientos funcionales (RF-1 a RF-3).
 */
describe('Módulo 1: Configuración Estratégica', () => {
  
  // RF-1.1: Ejes Agenda 50/50
  test('GET /api/ejes debe retornar los ejes precargados', async () => {
    const res = await request(app).get('/api/ejes');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.some(e => e.code === 'Eje 1')).toBeTruthy();
  });

  // RF-1.2: Resultados Institucionales (R6)
  test('GET /api/resultados debe retornar el Resultado R6 vinculado a Eje 1', async () => {
    const res = await request(app).get('/api/resultados');
    expect(res.statusCode).toEqual(200);
    const r6 = res.body.find(r => r.code === 'R6');
    expect(r6).toBeDefined();
    expect(r6.description).toContain('Institucionalidad');
  });

  // RF-2.1 y 2.2: MeGAs y Productos (Join Logic)
  test('GET /api/megas_detail debe retornar MeGAs con su jerarquía completa (Eje y Resultado)', async () => {
    const res = await request(app).get('/api/megas_detail');
    expect(res.statusCode).toEqual(200);
    if (res.body.length > 0) {
      const firstMega = res.body[0];
      expect(firstMega).toHaveProperty('estrategia_code');
      expect(firstMega).toHaveProperty('resultado_code');
      expect(firstMega).toHaveProperty('eje_code');
      expect(firstMega).toHaveProperty('unit_name');
    }
  });

  // Regla de Negocio: Validación de Ponderación 100%
  test('POST /api/productos debe rechazar si la suma de pesos excede el 100%', async () => {
    // Obtenemos una MeGA de prueba (M1_AFC ya tiene 40% según el seed)
    const megaRes = await pool.query("SELECT id FROM megas WHERE code = 'M1_AFC'");
    const megaId = megaRes.rows[0].id;

    // Intentamos añadir un producto con 70% (Total sería 110%)
    const res = await request(app)
      .post('/api/productos')
      .send({
        name: 'Producto de Prueba Excedente',
        mega_id: megaId,
        ponderacion_total: 70
      });
    
    expect(res.statusCode).toEqual(400); // Bad Request
    expect(res.body.error).toContain('100%');
  });

  // RF-3.1: Estructura Orgánica (Macro)
  test('GET /api/unidades debe retornar el organigrama completo', async () => {
    const res = await request(app).get('/api/unidades');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(20); // El organigrama completo tiene muchas unidades
    expect(res.body.some(u => u.name.includes('AFCOOP'))).toBeTruthy();
  });

});
