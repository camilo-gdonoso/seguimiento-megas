
export const calculatePlanograma = ({ fecha_inicio, fecha_fin, targetValue, tipo_avance, is_hitos_mode }) => {
    if (!fecha_inicio || !fecha_fin || !targetValue) return null;
    
    const s = new Date(fecha_inicio);
    const e = new Date(fecha_fin);
    if (e < s) return null;
    
    let periods = 0;
    const tipo = tipo_avance || 'Semanal';
    
    if (tipo === 'Semanal') {
      let cur = new Date(s);
      while (cur <= e) {
        periods++;
        cur.setDate(cur.getDate() + 7);
      }
      periods = Math.max(1, periods);
    } else {
      let cur = new Date(s);
      while (cur <= e) {
        periods++;
        cur.setDate(cur.getDate() + 1);
      }
      periods = Math.max(1, periods);
    }

    const plan = [];
    const valPerPeriod = (parseFloat(targetValue) / periods).toFixed(is_hitos_mode ? 0 : 2);
    let currentSum = 0;

    for (let i = 1; i <= periods; i++) {
      let val = parseFloat(valPerPeriod);
      // Adjust the last period to match total exactly
      if (i === periods) {
        val = (parseFloat(targetValue) - currentSum).toFixed(is_hitos_mode ? 0 : 2);
      }
      plan.push({ periodo: i, valor: parseFloat(val) });
      currentSum += parseFloat(val);
    }

    return plan;
};
