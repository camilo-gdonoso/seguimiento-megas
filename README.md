# Sistema Web de Seguimiento de Resultados Estratégicos (MeGAs) - MTEPS / AFCOOP

Este sistema ha sido diseñado para la gestión y seguimiento de resultados institucionales. Para garantizar la integridad del organigrama ministerial, se ha implementado un esquema de **"Estructura Blindada"**.

## 🛠️ Guía de Despliegue para el Equipo Técnico

### 1. Requisitos Previos
*   Node.js v18+
*   PostgreSQL
*   Variables de entorno: `DATABASE_URL` vinculada a la instancia de Postgres.

### 2. Inicialización de la Base de Datos
El sistema cuenta con un motor de inicialización automática de tablas en el primer arranque. Sin embargo, para que las uniones relacionales funcionen con el organigrama estático, se debe ejecutar la **Semilla de la Estructura** una sola vez.

#### Paso A: Cargar el Organigrama Ministerial (52 Nodos)
Ejecutar una petición `POST` al siguiente endpoint (puede hacerse vía Postman o cURL):
```bash
POST /api/admin/seed-organigram
```
Este comando insertará los 52 nodos oficiales con sus IDs exactos para coincidir con la lógica del frontend. 

### 3. Carga de Catálogo (Ejes, Resultados, Estrategias)
Por diseño, el sistema **no carga datos de ejemplo automáticamente** (como Ejes o Resultados) para respetar los borrados definitivos realizados por el usuario.
*   El equipo de planificación debe cargar estos datos **manualmente** a través del módulo de **Catálogo** en la plataforma.

### 4. Estructura Blindada (Frontend)
El organigrama es **estático** en el código por seguridad institucional. Si se requiere modificar un nombre o añadir una oficina de forma permanente, se debe editar el archivo:
`src/constants/organigram.js`

### 5. Auditoría
Todas las acciones de creación, edición y borrado se registran automáticamente en la tabla `auditoria` de la base de datos, incluyendo el usuario y el timestamp.

---
© 2026 Kallpatech - Soluciones digitales para la gestión pública.
