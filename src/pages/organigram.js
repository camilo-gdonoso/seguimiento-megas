export const ORGANIGRAM = [
  // NIVEL DIRECTIVO
  { id: 1, name: 'Despacho del Ministro (a) de Trabajo, Empleo y Previsión Social', type: 'Ministro' },
  
  // UNIDADES OPERATIVAS (Bajo Ministro)
  { id: 2, name: 'Jefatura de Gabinete', type: 'Unidad', parent_id: 1 },
  { id: 3, name: 'Unidad de Comunicación', type: 'Unidad', parent_id: 1 },
  { id: 4, name: 'Unidad de Auditoría Interna', type: 'Unidad', parent_id: 1 },
  { id: 5, name: 'Unidad de Transparencia y Lucha contra la Corrupción', type: 'Unidad', parent_id: 1 },

  // EJECUTIVO SECTOR (Derecha del Ministro)
  { id: 10, name: 'Dirección General de Planificación', type: 'Direccion', parent_id: 1 },
  { id: 11, name: 'Unidad de Tecnologías de la Información y Comunicación', type: 'Unidad', parent_id: 10 },
  
  { id: 20, name: 'Dirección General de Asuntos Administrativos', type: 'Direccion', parent_id: 1 },
  { id: 21, name: 'Unidad Administrativa', type: 'Unidad', parent_id: 20 },
  { id: 22, name: 'Unidad Financiera', type: 'Unidad', parent_id: 20 },
  { id: 23, name: 'Unidad de Recursos Humanos', type: 'Unidad', parent_id: 20 },

  { id: 30, name: 'Dirección General de Asuntos Jurídicos', type: 'Direccion', parent_id: 1 },
  { id: 31, name: 'Unidad de Análisis Jurídico', type: 'Unidad', parent_id: 30 },
  { id: 32, name: 'Unidad de Gestión Jurídica', type: 'Unidad', parent_id: 30 },

  // VICEMINISTERIO 1: TRABAJO Y PREVISION SOCIAL
  { id: 100, name: 'Viceministerio de Trabajo y Previsión Social', type: 'Viceministerio', parent_id: 1 },
  { id: 110, name: 'Dirección General de Políticas de Previsión Social', type: 'Direccion', parent_id: 100 },
  { id: 120, name: 'Dirección General de Asuntos Sindicales', type: 'Direccion', parent_id: 100 },
  { id: 130, name: 'Dirección General de Trabajo, Higiene y Seguridad Ocupacional', type: 'Direccion', parent_id: 100 },
  { id: 131, name: 'Unidad de Derechos Fundamentales', type: 'Unidad', parent_id: 130 },

  // VICEMINISTERIO 2: EMPLEO, SERVICIO CIVIL Y COOPERATIVAS
  { id: 200, name: 'Viceministerio de Empleo, Servicio Civil y Cooperativas', type: 'Viceministerio', parent_id: 1 },
  { id: 210, name: 'Dirección General de Empleo', type: 'Direccion', parent_id: 200 },
  { id: 220, name: 'Dirección General de Políticas Públicas, Fomento, Protección y Promoción Cooperativa', type: 'Direccion', parent_id: 200 },
  { id: 230, name: 'Dirección General del Servicio Civil', type: 'Direccion', parent_id: 200 },
  { id: 231, name: 'Unidad de Función Pública y Registro Plurinacional', type: 'Unidad', parent_id: 230 },
  { id: 232, name: 'Unidad de Régimen Laboral e Impugnación', type: 'Unidad', parent_id: 230 },
  { id: 233, name: 'Unidad de Capacitación, Ética y Desarrollo Normativo', type: 'Unidad', parent_id: 230 },

  // ENTIDAD BAJO TUICIÓN
  { id: 500, name: 'Autoridad de Fiscalización y Control de Cooperativas - AFCOOP', type: 'Direccion', parent_id: 1 },

  // JEFATURAS DEPARTAMENTALES Y REGIONALES
  { id: 301, name: 'Jefatura Departamental de Trabajo La Paz', type: 'Jefatura', parent_id: 1 },
  { id: 3011, name: 'Jefatura Regional de Trabajo El Alto', type: 'Jefatura', parent_id: 301 },

  { id: 302, name: 'Jefatura Departamental de Trabajo Santa Cruz', type: 'Jefatura', parent_id: 1 },
  { id: 3021, name: 'Jefatura Regional de Trabajo Montero', type: 'Jefatura', parent_id: 302 },
  { id: 3022, name: 'Jefatura Regional de Trabajo Camiri', type: 'Jefatura', parent_id: 302 },
  { id: 3023, name: 'Jefatura Regional de Trabajo Puerto Suárez', type: 'Jefatura', parent_id: 302 },
  { id: 3024, name: 'Jefatura Regional de Trabajo Warnes', type: 'Jefatura', parent_id: 302 },

  { id: 303, name: 'Jefatura Departamental de Trabajo Cochabamba', type: 'Jefatura', parent_id: 1 },
  { id: 3031, name: 'Jefatura Regional de Trabajo Chapare', type: 'Jefatura', parent_id: 303 },

  { id: 304, name: 'Jefatura Departamental de Trabajo Chuquisaca', type: 'Jefatura', parent_id: 1 },
  { id: 3041, name: 'Jefatura Regional de Trabajo Monteagudo', type: 'Jefatura', parent_id: 304 },

  { id: 305, name: 'Jefatura Departamental de Trabajo Oruro', type: 'Jefatura', parent_id: 1 },

  { id: 306, name: 'Jefatura Departamental de Trabajo Potosí', type: 'Jefatura', parent_id: 1 },
  { id: 3061, name: 'Jefatura Regional de Trabajo Tupiza', type: 'Jefatura', parent_id: 306 },
  { id: 3062, name: 'Jefatura Regional de Trabajo Villazón', type: 'Jefatura', parent_id: 306 },
  { id: 3063, name: 'Jefatura Regional de Trabajo Llallagua', type: 'Jefatura', parent_id: 306 },
  { id: 3064, name: 'Jefatura Regional de Trabajo Uyuni', type: 'Jefatura', parent_id: 306 },

  { id: 307, name: 'Jefatura Departamental de Trabajo Tarija', type: 'Jefatura', parent_id: 1 },
  { id: 3071, name: 'Jefatura Regional de Trabajo Bermejo', type: 'Jefatura', parent_id: 307 },
  { id: 3072, name: 'Jefatura Regional de Trabajo Yacuiba', type: 'Jefatura', parent_id: 307 },
  { id: 3073, name: 'Jefatura Regional de Trabajo Villamontes', type: 'Jefatura', parent_id: 307 },

  { id: 308, name: 'Jefatura Departamental de Trabajo Beni', type: 'Jefatura', parent_id: 1 },
  { id: 3081, name: 'Jefatura Regional de Trabajo Riberalta', type: 'Jefatura', parent_id: 308 },
  { id: 3082, name: 'Jefatura Regional de Trabajo Guayaramerín', type: 'Jefatura', parent_id: 308 },

  { id: 309, name: 'Jefatura Departamental de Trabajo Pando', type: 'Jefatura', parent_id: 1 }
];
