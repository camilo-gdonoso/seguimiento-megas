const request = require('supertest');
const express = require('express');

// Mock the pg Pool before importing the app
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

const { app, pool } = require('../index');

describe('Pruebas Unitarias: Lógica de Matriz Institucional y Jerarquía', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('RF-JERARQUIA: Un Director debe ver solo los MeGAs de su unidad', async () => {
    // Simulamos respuesta de la BD para un Director de la Unidad 5
    pool.query.mockResolvedValueOnce({ 
      rows: [
        { id: 1, mega_code: 'M1', mega_name: 'MeGA Test', mega_unit_id: 5, name: 'Tarea 1', user_id: 10 }
      ] 
    });

    const res = await request(app)
      .get('/api/seguimiento/formulario1')
      .query({ userId: 100, role: 'Director' });

    expect(res.statusCode).toBe(200);
    // Verificamos que la consulta SQL incluyó el filtro de unidad (basado en el código de index.js)
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('m.unit_id = (SELECT unit_id FROM usuarios WHERE id = 100)'));
  });

  test('RF-PRIVACIDAD: Un Funcionario (Tecnico) debe ver solo sus propias tareas', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [
        { id: 10, name: 'Mi Tarea Privada', user_id: 10 }
      ] 
    });

    const res = await request(app)
      .get('/api/seguimiento/formulario1')
      .query({ userId: 10, role: 'Tecnico' });

    expect(res.statusCode).toBe(200);
    // Verificamos que el filtro fue por user_id personal
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('t.user_id = 10'));
  });

  test('FORMATO-MATRIZ: Los datos deben incluir la cadena de jerarquía completa', async () => {
    pool.query.mockResolvedValueOnce({ 
      rows: [
        { 
          mega_id: 1, 
          mega_code: 'M2', 
          producto_name: 'Prod A', 
          actividad_name: 'Act 1', 
          name: 'Tarea Final',
          avance_fisico: 50.0,
          estado_calculado: 'En Proceso' // Add mock data for the SQL CASE field
        }
      ] 
    });

    const res = await request(app).get('/api/seguimiento/formulario1');
    
    const row = res.body[0];
    expect(row).toHaveProperty('mega_code', 'M2');
    expect(row).toHaveProperty('producto_name', 'Prod A');
    expect(row).toHaveProperty('actividad_name', 'Act 1');
    expect(row).toHaveProperty('estado_calculado', 'En Proceso');
  });

});
