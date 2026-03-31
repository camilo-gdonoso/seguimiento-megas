# Sistema de Seguimiento Estratégico MeGAs (MTEPS/AFCOOP)

Este repositorio contiene la plataforma integral para el seguimiento de metas estratégicas (MeGAs) del Ministerio de Trabajo, Empleo y Previsión Social (MTEPS) y la Autoridad de Fiscalización y Control de Cooperativas (AFCOOP).

## 🚀 Despliegue en Producción (Vercel + NeonDB)

El sistema está optimizado para ejecutarse en entornos serverless.

### Requisitos Previos
1. Una cuenta en [Vercel](https://vercel.com).
2. Una base de datos PostgreSQL en [Neon.tech](https://neon.tech).

### Variables de Entorno (Vercel)
Configura las siguientes variables en tu proyecto de Vercel:
- `DATABASE_URL`: La URL de conexión de Neon (debe incluir `sslmode=require`).

---

## 🛠️ Inicialización de Base de Datos (SQL Manual)

Si necesitas recrear la estructura o notas errores de "relation does not exist", ejecuta este script en el **SQL Editor** de tu consola de Neon:

```sql
-- 1. ESTRUCTURA DE JERARQUÍA Y USUARIOS
CREATE TABLE IF NOT EXISTS unidades_organizacionales (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, parent_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, fullname TEXT, unit_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE SET NULL);
CREATE TABLE IF NOT EXISTS ejes (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resultados (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, eje_id INTEGER REFERENCES ejes(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS estrategias (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, resultado_id INTEGER REFERENCES resultados(id) ON DELETE CASCADE);

-- 2. ESTRUCTURA DE SEGUIMIENTO (MeGAs)
CREATE TABLE IF NOT EXISTS megas (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, estrategia_id INTEGER REFERENCES estrategias(id) ON DELETE CASCADE, unit_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE SET NULL, period TEXT DEFAULT '2026-2030', avance_fisico DECIMAL(5,2) DEFAULT 0.00);
CREATE TABLE IF NOT EXISTS productos_intermedios (id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, mega_id INTEGER REFERENCES megas(id) ON DELETE CASCADE, ponderacion_total DECIMAL(5,2) DEFAULT 100.00, avance_fisico DECIMAL(5,2) DEFAULT 0.00, UNIQUE(name, mega_id));
CREATE TABLE IF NOT EXISTS actividades (id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, producto_id INTEGER REFERENCES productos_intermedios(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tareas (id SERIAL PRIMARY KEY, code TEXT UNIQUE, actividad_id INTEGER REFERENCES actividades(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT, ponderacion_producto DECIMAL(5,2) NOT NULL DEFAULT 0.00, fecha_inicio DATE, fecha_fin DATE, user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, director_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, avance_fisico DECIMAL(5,2) DEFAULT 0.00, responsable_nombre TEXT, responsable_cargo TEXT, medio_verificacion TEXT);

-- 3. SEMANAS Y AUDITORÍA
CREATE TABLE IF NOT EXISTS avances_semanales (id SERIAL PRIMARY KEY, tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE, semana INTEGER NOT NULL, avance_real DECIMAL(5,2) DEFAULT 0.00, observacion TEXT, evidencia_url TEXT, estado VARCHAR(20) DEFAULT 'Reportado', UNIQUE(tarea_id, semana));
CREATE TABLE IF NOT EXISTS auditoria (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, action TEXT NOT NULL, table_name TEXT NOT NULL, record_id INTEGER, old_data JSONB, new_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- 4. USUARIO ADMINISTRADOR INICIAL
INSERT INTO usuarios (username, password, role, fullname) VALUES ('admin', 'admin123', 'Admin', 'Administrador Sistema') ON CONFLICT (username) DO NOTHING;
```

---

## 🏗️ Carga de Datos de Ejemplo (Opcional)

Puedes usar este SQL para cargar algunos MeGAs y ver el Dashboard en acción:

```sql
-- Cargar un Eje y Estrategia
INSERT INTO ejes (code, description) VALUES ('Eje 1', 'Bolivia, economía para la gente') ON CONFLICT (code) DO NOTHING;
INSERT INTO resultados (code, description, eje_id) VALUES ('R6', 'Institucionalidad fortalecida', (SELECT id FROM ejes LIMIT 1)) ON CONFLICT (code) DO NOTHING;
INSERT INTO estrategias (code, description, resultado_id) VALUES ('E46', 'Modernización normativa', (SELECT id FROM resultados LIMIT 1)) ON CONFLICT (code) DO NOTHING;

-- Cargar un MeGA bajo el Despacho del Ministro (Unidad ID 1)
INSERT INTO megas (code, name, estrategia_id, unit_id) 
VALUES ('M1_DEMO', 'Fortalecimiento de la Digitalización Laboral', (SELECT id FROM estrategias LIMIT 1), 1)
ON CONFLICT (code) DO NOTHING;
```

---

## 📈 Funcionalidades Clave
1. **Generación de Formulario A Trimestral:** Exportable a Excel desde el módulo de Dashboard.
2. **Formulario 1 (Semanal):** Seguimiento detallado por responsable con evidencia digital.
3. **Semáforo de Cumplimiento:** Colores Rojo/Amarillo/Verde basados en fechas límite y avance real.
4. **Registro de Auditoría:** Control de todas las modificaciones realizadas por cada usuario.

---

## 🛡️ Seguridad
El sistema utiliza el header `x-user-id` para identificar al autor en los registros de auditoría. Para producción a escala, se recomienda implementar una capa de JWT (JSON Web Tokens).
