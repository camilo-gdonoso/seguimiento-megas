
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

export const calculateAverages = (tasks) => {
  if (!Array.isArray(tasks) || tasks.length === 0) return { poa: '0.0', noPoa: '0.0' };
  
  const poaTasks = tasks.filter(t => t.vinculada_poa === 'SI');
  const noPoaTasks = tasks.filter(t => t.vinculada_poa !== 'SI');
  
  const calc = (ts) => ts.length > 0 ? (ts.reduce((acc, t) => acc + (parseFloat(t.avance_fisico) || 0), 0) / ts.length) : 0;
  
  return {
    poa: calc(poaTasks).toFixed(1),
    noPoa: calc(noPoaTasks).toFixed(1)
  };
};
