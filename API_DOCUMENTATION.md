# Documentación de API REST — Sistema MeGAs (Producción)

Esta documentación detalla los endpoints disponibles en el backend del sistema de seguimiento MeGAs para el MTEPS/AFCOOP.

## Base URL
En desarrollo: `http://localhost:3000/api`
En producción (Nginx Proxy): `/api`

---

## 1. Configuración Estratégica
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/ejes` | Listar todos los Ejes del POA |
| `GET` | `/api/resultados` | Listar Resultados articulados |
| `GET` | `/api/estrategias` | Listar Estrategias institucionales |
| `GET` | `/api/megas` | Listar Metas de Gestión Anual 2030 |
| `GET` | `/api/unidades` | Estructura Orgánica (Organigrama) |

---

## 2. Gestión de Catálogo y Seguimiento (Jerarquía)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/megas_detail` | Listar MeGAs con su jerarquía de Ejes/Resultados |
| `GET` | `/api/productos_detail` | Listar Productos vinculados a MeGAs |
| `GET` | `/api/actividades_detail` | Listar Actividades por Producto |
| `GET` | `/api/tareas_detail` | Listar Tareas con su avance y responsable |

---

## 3. Reportes de Avance (Flujo de Gestión)
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/avances-semanales` | **Reportar:** Técnico envía avance con observación y evidencia (URL) |
| `POST` | `/api/avances-semanales/validar` | **Aprobar/Rechazar:** El Director valida el reporte (Actualiza cascada de progreso) |
| `GET` | `/api/seguimiento/formulario1` | Data completa para exportar Formulario 1 (Semanal) |
| `GET` | `/api/formulario-a-trimestral` | **Nuevo:** Estructura trimestral agregada por Producto (Q1-Q4) |

---

## 4. Dashboard e Inteligencia de Negocio
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/dashboard-stats` | Estadísticas globales, avance por unidad, funcionarios y semáforos |

---

## 5. Auditoría y Seguridad
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/auditoria` | Histórico completo de cambios con comparativa JSON |
| `GET` | `/api/usuarios` | Gestión de usuarios y roles (Admin/Director/Tecnico) |
| `POST` | `/api/login` | Autenticación y generación de sesión |

---

## Notas Técnicas:
*   **Seguridad:** Los endpoints de creación/edición requieren el header `x-user-id` para el registro automático en la tabla de auditoría.
*   **Cascada de Progreso:** La actualización del avance físico de MeGAs y Productos es **automática** y ocurre únicamente cuando un Director aprueba una tarea (`/api/avances-semanales/validar`).

---
**Kallpatech Solutions** | 2026
