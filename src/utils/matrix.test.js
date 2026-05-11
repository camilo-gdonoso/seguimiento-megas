
import { describe, it, expect } from 'vitest';
import { groupTasksByUser } from './matrix';

describe('groupTasksByUser', () => {
  it('debe agrupar tareas por usuario correctamente', () => {
    const tasks = [
      { user_id: 1, responsable_nombre: 'Juan', vinculada_poa: 'SI', name: 'Tarea 1' },
      { user_id: 1, responsable_nombre: 'Juan', vinculada_poa: 'NO', name: 'Tarea 2' },
      { user_id: 2, responsable_nombre: 'Maria', vinculada_poa: 'SI', name: 'Tarea 3' }
    ];
    
    const result = groupTasksByUser(tasks);
    
    expect(result.length).toBe(2);
    expect(result[0].info.name).toBe('Juan');
    expect(result[0].planificadas.length).toBe(1);
    expect(result[0].noPlanificadas.length).toBe(1);
    expect(result[1].info.name).toBe('Maria');
  });

  it('debe manejar tareas sin usuario asignado', () => {
    const tasks = [
      { user_id: null, responsable_nombre: null, vinculada_poa: 'SI', name: 'Tarea 1' }
    ];
    const result = groupTasksByUser(tasks);
    expect(result[0].info.name).toBe('Sin Asignar');
  });

  it('debe retornar un array vacío si la entrada no es un array', () => {
    expect(groupTasksByUser(null)).toEqual([]);
    expect(groupTasksByUser(undefined)).toEqual([]);
  });
});
