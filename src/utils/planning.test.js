
import { describe, it, expect } from 'vitest';
import { calculatePlanograma } from './planning';

describe('calculatePlanograma', () => {
  it('debe calcular correctamente un cronograma semanal de porcentajes', () => {
    const data = {
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-31',
      targetValue: 100,
      tipo_avance: 'Semanal',
      is_hitos_mode: false
    };
    const plan = calculatePlanograma(data);
    
    // Debería haber ~5 semanas
    expect(plan.length).toBeGreaterThan(0);
    const sum = plan.reduce((acc, p) => acc + p.valor, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it('debe calcular correctamente un cronograma de hitos (enteros)', () => {
    const data = {
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-31',
      targetValue: 10,
      tipo_avance: 'Semanal',
      is_hitos_mode: true
    };
    const plan = calculatePlanograma(data);
    
    const sum = plan.reduce((acc, p) => acc + p.valor, 0);
    expect(sum).toBe(10);
    // Verificar que los valores son enteros
    plan.forEach(p => {
      expect(Number.isInteger(p.valor)).toBe(true);
    });
  });

  it('debe retornar null si la fecha fin es anterior a la inicio', () => {
    const data = {
      fecha_inicio: '2026-05-31',
      fecha_fin: '2026-05-01',
      targetValue: 100
    };
    expect(calculatePlanograma(data)).toBeNull();
  });
});
