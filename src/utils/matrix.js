
export const groupTasksByUser = (tasks) => {
  if (!Array.isArray(tasks)) return [];
  
  const grouped = tasks.reduce((acc, task) => {
    const userId = task.user_id || 'unassigned';
    if (!acc[userId]) acc[userId] = { 
      info: { 
        name: task.responsable_nombre || 'Sin Asignar',
        cargo: task.responsable_cargo || '---',
        unidad: task.unit_name || '---' 
      },
      planificadas: [],
      noPlanificadas: []
    };
    
    if (task.vinculada_poa === 'SI') {
      acc[userId].planificadas.push(task);
    } else {
      acc[userId].noPlanificadas.push(task);
    }
    return acc;
  }, {});

  return Object.values(grouped);
};
