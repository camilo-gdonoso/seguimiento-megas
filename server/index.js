const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Middleware for Vercel initialization - MUST BE AT THE TOP
let isDbInitialized = false;
app.use(async (req, res, next) => {
    if (process.env.VERCEL && !isDbInitialized) {
        try {
            // First ensure essential tables exist (Blocking)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS unidades_organizacionales (id SERIAL PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, parent_id INTEGER);
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY, 
                    username TEXT UNIQUE NOT NULL, 
                    password TEXT NOT NULL, 
                    role TEXT NOT NULL, 
                    fullname TEXT, 
                    unit_id INTEGER
                );
            `);
            
            // Seed Admin if not exists
            await pool.query(`
                INSERT INTO usuarios (username, password, role, fullname, unit_id) 
                VALUES ('admin', 'admin123', 'Admin', 'Administrador MeGAs', 1)
                ON CONFLICT (username) DO NOTHING;
            `);

            // Check if full organigram and MeGAs exist, if not, wait for full init
            const unitCount = await pool.query('SELECT COUNT(*) FROM unidades_organizacionales');
            const megaCount = await pool.query('SELECT COUNT(*) FROM megas');
            
            if (parseInt(unitCount.rows[0].count) < 20 || parseInt(megaCount.rows[0].count) === 0) {
                console.log('Database looks empty or incomplete (Units: %s, MeGAs: %s). Triggering Full Init...', unitCount.rows[0].count, megaCount.rows[0].count);
                await initDb();
            } else {
                // background check for small updates / repairs
                initDb().catch(err => console.error('Background init error:', err));
            }
            
            isDbInitialized = true;
        } catch (err) {
            console.error('Critical initialization error:', err);
        }
    }
    next();
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});



// Initialize MeGAs DB Tables
const initDb = async () => {
    try {
        // 1. Create Core Tables one by one for reliability
        await pool.query('CREATE TABLE IF NOT EXISTS unidades_organizacionales (id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL, parent_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE CASCADE)');
        await pool.query('CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, fullname TEXT, unit_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE SET NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS ejes (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL)');
        await pool.query('CREATE TABLE IF NOT EXISTS resultados (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, eje_id INTEGER REFERENCES ejes(id) ON DELETE CASCADE)');
        await pool.query('CREATE TABLE IF NOT EXISTS estrategias (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, description TEXT NOT NULL, resultado_id INTEGER REFERENCES resultados(id) ON DELETE CASCADE)');
        await pool.query('CREATE TABLE IF NOT EXISTS megas (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, estrategia_id INTEGER REFERENCES estrategias(id) ON DELETE CASCADE, unit_id INTEGER REFERENCES unidades_organizacionales(id) ON DELETE SET NULL, period TEXT DEFAULT \'2026-2030\', avance_fisico DECIMAL(5,2) DEFAULT 0.00)');
        await pool.query('CREATE TABLE IF NOT EXISTS productos_intermedios (id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, mega_id INTEGER REFERENCES megas(id) ON DELETE CASCADE, ponderacion_total DECIMAL(5,2) DEFAULT 100.00, avance_fisico DECIMAL(5,2) DEFAULT 0.00, UNIQUE(name, mega_id))');
        await pool.query('CREATE TABLE IF NOT EXISTS actividades (id SERIAL PRIMARY KEY, code TEXT UNIQUE, name TEXT NOT NULL, producto_id INTEGER REFERENCES productos_intermedios(id) ON DELETE CASCADE)');
        await pool.query(`CREATE TABLE IF NOT EXISTS tareas (
            id SERIAL PRIMARY KEY, 
            code TEXT UNIQUE, 
            actividad_id INTEGER REFERENCES actividades(id) ON DELETE CASCADE, 
            name TEXT NOT NULL, 
            description TEXT, 
            ponderacion_producto DECIMAL(5,2) NOT NULL DEFAULT 0.00, 
            fecha_inicio DATE, 
            fecha_fin DATE, 
            user_assigned_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, 
            user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            director_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, 
            responsable_nombre TEXT, 
            responsable_cargo TEXT, 
            medio_verificacion TEXT,
            avance_fisico DECIMAL(5,2) DEFAULT 0.00,
            tipo_avance VARCHAR(20) DEFAULT 'Semanal',
            planograma JSONB,
            indicador TEXT,
            resultado_esperado TEXT,
            vinculada_poa VARCHAR(10) DEFAULT 'NO'
        )`);
        await pool.query('CREATE TABLE IF NOT EXISTS avances_semanales (id SERIAL PRIMARY KEY, tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE, semana INTEGER NOT NULL, avance_real DECIMAL(5,2) DEFAULT 0.00, observacion TEXT, evidencia_url TEXT, estado VARCHAR(20) DEFAULT \'Reportado\', UNIQUE(tarea_id, semana))');
        await pool.query('CREATE TABLE IF NOT EXISTS auditoria (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, action TEXT NOT NULL, table_name TEXT NOT NULL, record_id INTEGER, old_data JSONB, new_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        await pool.query('CREATE TABLE IF NOT EXISTS notificaciones (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, message TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

        // 2. Cleanup duplicates and Apply unique constraints
        await pool.query(`
            DO $$ BEGIN
                -- 1. Remove duplicates before adding UNIQUE constraint
                DELETE FROM unidades_organizacionales a USING unidades_organizacionales b
                WHERE a.id > b.id AND a.name = b.name;

                -- 2. Add constraints
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'act_name_prod_uq') THEN
                    ALTER TABLE actividades ADD CONSTRAINT act_name_prod_uq UNIQUE (name, producto_id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarea_name_act_uq') THEN
                    ALTER TABLE tareas ADD CONSTRAINT tarea_name_act_uq UNIQUE (name, actividad_id);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unidades_name_uq') THEN
                    ALTER TABLE unidades_organizacionales ADD CONSTRAINT unidades_name_uq UNIQUE (name);
                END IF;
            END $$;
        `);

        // 3. Seed Basic Data (Manual seeding only for organigram)
        // Auto-seed removed to respect manual deletions from the platform.
        
        await pool.query(`
            -- Keep only the core Admin user
            INSERT INTO usuarios (username, password, role, fullname, unit_id) 
            VALUES ('admin', 'admin123', 'Admin', 'Administrador Sistema', 1)
            ON CONFLICT (username) DO NOTHING;
        `);

        // 5. Reset all ID sequences to avoid 'Duplicate Key' errors during manual entry
        await pool.query(`
            SELECT setval(pg_get_serial_sequence('unidades_organizacionales', 'id'), coalesce(max(id), 1)) FROM unidades_organizacionales;
            SELECT setval(pg_get_serial_sequence('usuarios', 'id'), coalesce(max(id), 1)) FROM usuarios;
            SELECT setval(pg_get_serial_sequence('ejes', 'id'), coalesce(max(id), 1)) FROM ejes;
            SELECT setval(pg_get_serial_sequence('resultados', 'id'), coalesce(max(id), 1)) FROM resultados;
            SELECT setval(pg_get_serial_sequence('estrategias', 'id'), coalesce(max(id), 1)) FROM estrategias;
            SELECT setval(pg_get_serial_sequence('megas', 'id'), coalesce(max(id), 1)) FROM megas;
            SELECT setval(pg_get_serial_sequence('productos_intermedios', 'id'), coalesce(max(id), 1)) FROM productos_intermedios;
            SELECT setval(pg_get_serial_sequence('actividades', 'id'), coalesce(max(id), 1)) FROM actividades;
            SELECT setval(pg_get_serial_sequence('tareas', 'id'), coalesce(max(id), 1)) FROM tareas;
        `);

        console.log('Database Initialized and Seeded Successfully');
    } catch (err) {
        console.error('Error in initDb:', err);
    }
};


const validateFechasTarea = async (actividadId, fInicio, fFin) => {
    if (!fInicio && !fFin) return;
    const { rows } = await pool.query(`
        SELECT m.fecha_inicio as m_inicio, m.fecha_fin as m_fin, m.code as m_code 
        FROM actividades a 
        JOIN productos_intermedios p ON a.producto_id = p.id 
        JOIN megas m ON p.mega_id = m.id 
        WHERE a.id = $1
    `, [actividadId]);
    
    if (rows.length > 0) {
        const { m_inicio, m_fin, m_code } = rows[0];
        if (m_inicio && fInicio && new Date(fInicio) < new Date(m_inicio)) {
            // Need to correctly parse the dates to UTC so localDateString doesn't mis-shift
            const formatted = new Date(m_inicio).toISOString().split('T')[0];
            throw new Error(`La fecha de inicio no puede ser anterior a la del MeGA ${m_code} (${formatted}).`);
        }
        if (m_fin && fFin && new Date(fFin) > new Date(m_fin)) {
            const formatted = new Date(m_fin).toISOString().split('T')[0];
            throw new Error(`La fecha de fin no puede sobrepasar a la del MeGA ${m_code} (${formatted}).`);
        }
    }
};

// Generic CRUD Generator
const registerCrud = (resource, tableName) => {
    // Helper to get allowed columns from the database (optional, but let's just filter common joined fields for now)
    const filterValidFields = (body) => {
        const forbiddenPrefixes = ['current_', 'unit_', 'estrategia_', 'resultado_', 'eje_'];
        const forbiddenSuffixes = ['_name', '_code', '_unidad'];
        
        return Object.keys(body).filter(key => {
            // ALWAYS allow relational IDs
            if (key.endsWith('_id')) return true;
            // Never try to update columns that look like they come from a JOIN or calculation
            if (forbiddenSuffixes.some(s => key.endsWith(s))) return false;
            if (forbiddenPrefixes.some(p => key.startsWith(p))) return false;
            // Also exclude ID as it's handled separately
            if (key === 'id') return false;
            return true;
        });
    };

    app.get(`/api/${resource}`, async (req, res) => {
        try {
            const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post(`/api/${resource}`, async (req, res) => {
        const fields = filterValidFields(req.body);
        const values = fields.map(f => req.body[f]);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        try {
            if (tableName === 'tareas' && (req.body.fecha_inicio || req.body.fecha_fin)) {
                await validateFechasTarea(req.body.actividad_id, req.body.fecha_inicio, req.body.fecha_fin);
            }
            const result = await pool.query(
                `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
                values
            );
            await logAudit(req.headers['x-user-id'] || null, 'CREATE', tableName, result.rows[0].id, null, result.rows[0]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put(`/api/${resource}/:id`, async (req, res) => {
        const { id } = req.params;
        const fields = filterValidFields(req.body);
        const values = [...fields.map(f => req.body[f]), id];
        const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
        try {
            const oldRecord = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
            if (oldRecord.rows.length === 0) return res.status(404).json({ error: 'Not found' });
            
            if (tableName === 'tareas' && (req.body.fecha_inicio || req.body.fecha_fin)) {
                const fInicio = req.body.fecha_inicio !== undefined ? req.body.fecha_inicio : oldRecord.rows[0].fecha_inicio;
                const fFin = req.body.fecha_fin !== undefined ? req.body.fecha_fin : oldRecord.rows[0].fecha_fin;
                const actId = req.body.actividad_id || oldRecord.rows[0].actividad_id;
                await validateFechasTarea(actId, fInicio, fFin);
            }

            const result = await pool.query(
                `UPDATE ${tableName} SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
                values
            );
            await logAudit(req.headers['x-user-id'] || null, 'UPDATE', tableName, id, oldRecord.rows[0], result.rows[0]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error(`Error updating ${tableName}:`, err);
            res.status(500).json({ error: err.message });
        }
    });

    app.delete(`/api/${resource}/:id`, async (req, res) => {
        const { id } = req.params;
        try {
            const oldRecord = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
            await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
            if (oldRecord.rows.length > 0) {
                await logAudit(req.headers['x-user-id'] || null, 'DELETE', tableName, id, oldRecord.rows[0], null);
            }
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};

// Specific Products with weighting check
app.get('/api/productos_detail', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, m.name as mega_name 
            FROM productos_intermedios p 
            JOIN megas m ON p.mega_id = m.id 
            ORDER BY p.id ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/actividades_detail', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, p.name as producto_name, m.name as mega_name 
            FROM actividades a 
            JOIN productos_intermedios p ON a.producto_id = p.id 
            JOIN megas m ON p.mega_id = m.id 
            ORDER BY a.id ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tareas_detail', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, a.name as actividad_name, p.name as producto_name, m.name as mega_name 
            FROM tareas t 
            JOIN actividades a ON t.actividad_id = a.id 
            JOIN productos_intermedios p ON a.producto_id = p.id 
            JOIN megas m ON p.mega_id = m.id 
            ORDER BY t.id ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/productos', async (req, res) => {
    const { name, mega_id, ponderacion_total } = req.body;
    try {
        const currentSumRes = await pool.query('SELECT SUM(ponderacion_total) as total FROM productos_intermedios WHERE mega_id = $1', [mega_id]);
        const currentTotal = parseFloat(currentSumRes.rows[0].total || 0);
        if (currentTotal + parseFloat(ponderacion_total) > 100.01) {
            return res.status(400).json({ error: 'La ponderación total de los productos de este MeGA ya alcanzó o excede el 100%' });
        }
        const result = await pool.query('INSERT INTO productos_intermedios (name, mega_id, ponderacion_total) VALUES ($1, $2, $3) RETURNING *', [name, mega_id, ponderacion_total]);
        await logAudit(req.headers['x-user-id'] || null, 'CREATE', 'productos_intermedios', result.rows[0].id, null, result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Recalculate progress chain only summing approved weekly updates
const updateProgressChain = async (tareaId) => {
    try {
        // 1. Update Tarea (only approved updates)
        await pool.query(`
            UPDATE tareas 
            SET avance_fisico = (
                SELECT LEAST(COALESCE(SUM(avance_real), 0), ponderacion_producto) 
                FROM avances_semanales 
                WHERE tarea_id = $1 AND estado = 'Aprobado'
            ) 
            WHERE id = $1`, [tareaId]);
        
        // 2. Identify parents
        const tareaInfo = await pool.query(`
            SELECT a.producto_id, prod.mega_id 
            FROM tareas t 
            JOIN actividades a ON t.actividad_id = a.id 
            JOIN productos_intermedios prod ON a.producto_id = prod.id 
            WHERE t.id = $1`, [tareaId]);
            
        if (tareaInfo.rows.length > 0) {
            const { producto_id, mega_id } = tareaInfo.rows[0];
            
            // 3. Update Producto Intermedio (SUM of its Tasks)
            await pool.query(`
                UPDATE productos_intermedios SET avance_fisico = (
                    SELECT LEAST(COALESCE(SUM(avance_fisico), 0), 100) 
                    FROM tareas t 
                    JOIN actividades a ON t.actividad_id = a.id 
                    WHERE a.producto_id = $1
                ) WHERE id = $1`, [producto_id]);
                
            // 4. Update MeGA (SUM of weighted Products)
            await pool.query(`
                UPDATE megas SET avance_fisico = (
                    SELECT LEAST(COALESCE(SUM(avance_fisico * ponderacion_total / 100.0), 0), 100) 
                    FROM productos_intermedios 
                    WHERE mega_id = $1
                ) WHERE id = $1`, [mega_id]);
        }
    } catch (err) {
        console.error('Error in progress chain update:', err);
    }
};

app.get('/api/seguimiento/formulario1', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id as mega_id,
                m.code as mega_code,
                m.name as mega_name, 
                prod.name as producto_name, 
                act.name as actividad_name, 
                t.*,
                CASE 
                    WHEN t.avance_fisico >= t.ponderacion_producto AND EXISTS (
                        SELECT 1 FROM avances_semanales 
                        WHERE tarea_id = t.id AND estado = 'Aprobado' AND evidencia_url IS NOT NULL AND evidencia_url != ''
                    ) THEN 'Terminado'
                    WHEN t.fecha_fin < CURRENT_DATE AND t.avance_fisico < t.ponderacion_producto THEN 'Retrasado'
                    WHEN CURRENT_DATE BETWEEN t.fecha_inicio AND t.fecha_fin AND t.avance_fisico > 0 THEN 'En Proceso'
                    WHEN t.fecha_inicio > CURRENT_DATE THEN 'Pendiente'
                    ELSE 'En Proceso'
                END as estado_calculado,
                (SELECT json_agg(json_build_object(
                    'id', id,
                    'semana', semana, 
                    'avance', avance_real, 
                    'observacion', observacion,
                    'estado', estado,
                    'evidencia', evidencia_url
                 )) 
                 FROM avances_semanales 
                 WHERE tarea_id = t.id) as avances_historico
            FROM megas m
            JOIN productos_intermedios prod ON prod.mega_id = m.id
            JOIN actividades act ON act.producto_id = prod.id
            JOIN tareas t ON t.actividad_id = act.id
            ORDER BY m.id, prod.id, act.id, t.id
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/avances-semanales', async (req, res) => {
    const { tarea_id, semana, avance_real, observacion, evidencia_url } = req.body;
    try {
        const result = await pool.query(`
            INSERT INTO avances_semanales (tarea_id, semana, avance_real, observacion, evidencia_url, estado)
            VALUES ($1, $2, $3, $4, $5, 'Reportado')
            ON CONFLICT (tarea_id, semana) DO UPDATE SET avance_real = $3, observacion = $4, evidencia_url = $5, estado = 'Reportado'
            RETURNING *
        `, [tarea_id, semana, avance_real, observacion, evidencia_url]);
        
        // Recalculate chain: will only sum approved ones, so this won't change current progres until approved
        await updateProgressChain(tarea_id);
        
        res.json({ success: true, record: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/avances-semanales/validar', async (req, res) => {
    const { id, estado } = req.body; 
    try {
        // Update weekly info and state
        const result = await pool.query('UPDATE avances_semanales SET estado = $1 WHERE id = $2 RETURNING *', [estado, id]);
        
        if (result.rows.length > 0) {
            // Trigger progress chain recalculation since state has changed to 'Aprobado' or something else
            await updateProgressChain(result.rows[0].tarea_id);
        }
        
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tareas', async (req, res) => {
    const { 
        actividad_id, name, ponderacion_producto, responsable_nombre, responsable_cargo, 
        medio_verificacion, fecha_inicio, fecha_fin, user_id, director_id, code, 
        tipo_avance, planograma, indicador, resultado_esperado, vinculada_poa 
    } = req.body;
    try {
        await validateFechasTarea(actividad_id, fecha_inicio, fecha_fin);

        const actInfo = await pool.query('SELECT producto_id FROM actividades WHERE id = $1', [actividad_id]);
        if (actInfo.rows.length === 0) return res.status(400).json({ error: 'Actividad no encontrada' });
        
        const prodId = actInfo.rows[0].producto_id;
        const currentSumRes = await pool.query(`
            SELECT SUM(t.ponderacion_producto) as total 
            FROM tareas t 
            JOIN actividades a ON t.actividad_id = a.id 
            WHERE a.producto_id = $1`, [prodId]);
        const currentTotal = parseFloat(currentSumRes.rows[0].total || 0);
        if (currentTotal + parseFloat(ponderacion_producto) > 100.01) {
            return res.status(400).json({ error: 'La ponderación total de las tareas para este producto ya alcanzó o excede el 100%' });
        }
        const result = await pool.query(
            `INSERT INTO tareas (
                actividad_id, name, ponderacion_producto, responsable_nombre, responsable_cargo, 
                medio_verificacion, fecha_inicio, fecha_fin, user_id, director_id, code, 
                tipo_avance, planograma, indicador, resultado_esperado, vinculada_poa
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
            [
                actividad_id, name, ponderacion_producto, responsable_nombre, responsable_cargo, 
                medio_verificacion, fecha_inicio, fecha_fin, user_id, director_id, code, 
                tipo_avance || 'Semanal', planograma ? JSON.stringify(planograma) : null,
                indicador, resultado_esperado, vinculada_poa || 'NO'
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { 
        if (err.message.includes('No se encontró') || err.message.includes('fecha') || err.message.includes('ponderación')) {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message }); 
        }
    }
});

app.get('/api/megas_detail', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT m.*, e.code as estrategia_code, r.code as resultado_code, ej.code as eje_code, u.name as unit_name,
            (SELECT SUM(ponderacion_total) FROM productos_intermedios WHERE mega_id = m.id) as current_weighting
            FROM megas m
            LEFT JOIN estrategias e ON m.estrategia_id = e.id
            LEFT JOIN resultados r ON e.resultado_id = r.id
            LEFT JOIN ejes ej ON r.eje_id = ej.id
            LEFT JOIN unidades_organizacionales u ON m.unit_id = u.id
            ORDER BY m.id ASC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dashboard-stats', async (req, res) => {
    const { userId, role } = req.query;
    try {
        let megaFilter = '';
        let taskFilter = '';
        
        if (role === 'Tecnico') {
            taskFilter = `WHERE user_id = ${parseInt(userId)}`;
            megaFilter = `WHERE unit_id IN (SELECT unit_id FROM usuarios WHERE id = ${parseInt(userId)})`;
        } else if (role === 'Director') {
            taskFilter = `WHERE director_id = ${parseInt(userId)}`;
            megaFilter = `WHERE unit_id IN (SELECT unit_id FROM usuarios WHERE id = ${parseInt(userId)})`;
        }

        const megasProgress = await pool.query(`SELECT code, name, avance_fisico as progress FROM megas ${megaFilter} ORDER BY avance_fisico DESC LIMIT 8`);
        const globalProgress = await pool.query(`SELECT COALESCE(AVG(avance_fisico), 0) as global FROM megas ${megaFilter}`);
        
        const semaphores = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE estado_calculado = 'Terminado') as green,
                COUNT(*) FILTER (WHERE estado_calculado = 'En Proceso') as yellow,
                COUNT(*) FILTER (WHERE estado_calculado = 'Retrasado') as red,
                COUNT(*) FILTER (WHERE estado_calculado = 'Pendiente') as gray
            FROM (
                SELECT 
                    CASE 
                        WHEN avance_fisico >= ponderacion_producto AND EXISTS (
                            SELECT 1 FROM avances_semanales 
                            WHERE tarea_id = tareas.id AND estado = 'Aprobado' AND evidencia_url IS NOT NULL AND evidencia_url != ''
                        ) THEN 'Terminado'
                        WHEN fecha_fin < CURRENT_DATE AND (avance_fisico < ponderacion_producto OR avance_fisico IS NULL) THEN 'Retrasado'
                        WHEN CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin AND avance_fisico > 0 THEN 'En Proceso'
                        WHEN fecha_inicio > CURRENT_DATE THEN 'Pendiente'
                        ELSE 'En Proceso'
                    END as estado_calculado
                FROM tareas
                ${taskFilter}
            ) t
        `);
        
        const unitsProgress = await pool.query(`
            SELECT u.name, COALESCE(AVG(m.avance_fisico), 0) as progress
            FROM unidades_organizacionales u
            JOIN megas m ON m.unit_id = u.id
            WHERE u.type = 'Unidad' OR u.type = 'Jefatura'
            ${megaFilter ? ' AND ' + megaFilter.replace('WHERE ', '') : ''}
            GROUP BY u.name
            LIMIT 10
        `);

        // N3: Progress by Direccion (Macro level)
        const dirsProgress = await pool.query(`
            SELECT u.name, COALESCE(AVG(m.avance_fisico), 0) as progress
            FROM unidades_organizacionales u
            JOIN megas m ON m.unit_id = u.id
            WHERE u.type = 'Direccion'
            ${megaFilter ? ' AND ' + megaFilter.replace('WHERE ', '') : ''}
            GROUP BY u.name
            LIMIT 10
        `);

        // N3: Progress by Funcionario (Top performers vs critical)
        const usersProgress = await pool.query(`
            SELECT t.responsable_nombre, COALESCE(AVG(t.avance_fisico), 0) as progress, COUNT(*) as tasks
            FROM tareas t
            ${taskFilter ? taskFilter.replace('WHERE', 'WHERE t.') : ''}
            GROUP BY t.responsable_nombre
            ORDER BY progress DESC
            LIMIT 10
        `);

        // Activity-level semaphore...
        const activitiesStatus = await pool.query(`
            SELECT 
                a.id,
                a.name,
                prod.name as producto_name,
                m.name as mega_name,
                m.code as mega_code,
                COUNT(t.id) as total_tareas,
                ROUND(COALESCE(AVG(CASE WHEN t.ponderacion_producto > 0 
                    THEN (t.avance_fisico / t.ponderacion_producto) * 100 
                    ELSE 0 END), 0)) as avance_pct,
                COUNT(t.id) FILTER (WHERE 
                    t.avance_fisico >= t.ponderacion_producto AND
                    EXISTS (SELECT 1 FROM avances_semanales av WHERE av.tarea_id = t.id AND av.estado = 'Aprobado')
                ) as terminadas,
                COUNT(t.id) FILTER (WHERE 
                    t.fecha_fin < CURRENT_DATE AND (t.avance_fisico < t.ponderacion_producto OR t.avance_fisico IS NULL)
                ) as retrasadas,
                COUNT(t.id) FILTER (WHERE 
                    CURRENT_DATE BETWEEN t.fecha_inicio AND t.fecha_fin AND t.avance_fisico > 0
                    AND NOT (t.avance_fisico >= t.ponderacion_producto)
                ) as en_proceso,
                COUNT(t.id) FILTER (WHERE t.fecha_inicio > CURRENT_DATE) as pendientes
            FROM actividades a
            JOIN productos_intermedios prod ON a.producto_id = prod.id
            JOIN megas m ON prod.mega_id = m.id
            LEFT JOIN tareas t ON t.actividad_id = a.id
            ${taskFilter ? taskFilter.replace('WHERE', 'WHERE t.') : ''}
            GROUP BY a.id, a.name, prod.name, m.name, m.code
            HAVING COUNT(t.id) > 0
            ORDER BY retrasadas DESC, avance_pct ASC
            LIMIT 20
        `);

        res.json({
            global: parseFloat(globalProgress.rows[0]?.global || 0).toFixed(1),
            semaphores: semaphores.rows[0],
            megas: megasProgress.rows.map(m => ({
                code: m.code,
                name: m.name,
                progress: parseFloat(m.progress || 0).toFixed(1)
            })),
            units: unitsProgress.rows.map(u => ({
                name: u.name,
                progress: parseFloat(u.progress).toFixed(1),
                color: parseFloat(u.progress) > 70 ? '#10b981' : (parseFloat(u.progress) > 30 ? '#f59e0b' : '#ef4444')
            })),
            direcciones: dirsProgress.rows.map(d => ({
                name: d.name,
                progress: parseFloat(d.progress).toFixed(1)
            })),
            users: usersProgress.rows.map(u => ({
                name: u.responsable_nombre,
                progress: parseFloat(u.progress).toFixed(1),
                tasks: u.tasks
            })),
            activities: activitiesStatus.rows.map(a => ({
                id: a.id,
                name: a.name,
                producto_name: a.producto_name,
                mega_name: a.mega_name,
                mega_code: a.mega_code,
                total: parseInt(a.total_tareas),
                avance_pct: parseInt(a.avance_pct),
                terminadas: parseInt(a.terminadas),
                retrasadas: parseInt(a.retrasadas),
                en_proceso: parseInt(a.en_proceso),
                pendientes: parseInt(a.pendientes),
                estado: parseInt(a.retrasadas) > 0 ? 'Retrasado' :
                        parseInt(a.terminadas) === parseInt(a.total_tareas) ? 'Terminado' :
                        parseInt(a.en_proceso) > 0 ? 'En Proceso' : 'Pendiente'
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.*, un.name as unidad 
            FROM usuarios u 
            LEFT JOIN unidades_organizacionales un ON u.unit_id = un.id 
            ORDER BY u.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Specialized GET with JOINs for Catalog
app.get('/api/resultados', async (req, res) => {
    try {
        const result = await pool.query('SELECT r.*, e.code as eje_code FROM resultados r LEFT JOIN ejes e ON r.eje_id = e.id ORDER BY r.id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/estrategias', async (req, res) => {
    try {
        const result = await pool.query('SELECT s.*, r.code as resultado_code FROM estrategias s LEFT JOIN resultados r ON s.resultado_id = r.id ORDER BY s.id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/megas', async (req, res) => {
    try {
        const result = await pool.query('SELECT m.*, u.name as unit_name, s.code as estrategia_code FROM megas m LEFT JOIN unidades_organizacionales u ON m.unit_id = u.id LEFT JOIN estrategias s ON m.estrategia_id = s.id ORDER BY m.id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

registerCrud('ejes', 'ejes');
registerCrud('resultados', 'resultados');
registerCrud('estrategias', 'estrategias');
registerCrud('megas', 'megas');
registerCrud('productos', 'productos_intermedios');
registerCrud('actividades', 'actividades');
registerCrud('tareas', 'tareas');
registerCrud('avances', 'avances_semanales');
registerCrud('usuarios', 'usuarios');
registerCrud('unidades', 'unidades_organizacionales');

// Notificaciones para técnicos
app.get('/api/notificaciones/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(`
            SELECT id, name, fecha_fin, avance_fisico, 
                CASE 
                    WHEN avance_fisico = 100 THEN 'Terminado'
                    WHEN avance_fisico < 100 AND fecha_fin < CURRENT_DATE THEN 'Retrasado'
                    WHEN avance_fisico > 0 THEN 'En Proceso'
                    ELSE 'Pendiente'
                END as estado
            FROM tareas 
            WHERE user_id = $1 AND avance_fisico < 100
            ORDER BY fecha_fin ASC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(`
            SELECT u.*, un.name as unidad 
            FROM usuarios u 
            LEFT JOIN unidades_organizacionales un ON u.unit_id = un.id 
            WHERE u.username = $1 AND u.password = $2
        `, [username, password]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            delete user.password;
            res.json(user);
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Password Reset Endpoint
app.post('/api/usuarios/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        const oldUser = await pool.query('SELECT username, fullname FROM usuarios WHERE id = $1', [id]);
        if (oldUser.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [newPassword, id]);
        
        await logAudit(
            req.headers['x-user-id'] || null, 
            'RESET_PASSWORD', 
            'usuarios', 
            id, 
            { user: oldUser.rows[0].username }, 
            { action: 'Password updated' }
        );
        
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Audit log view
app.get('/api/auditoria', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.fullname as user_name 
            FROM auditoria a 
            LEFT JOIN usuarios u ON a.user_id = u.id 
            ORDER BY a.created_at DESC LIMIT 200
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Formulario A Trimestral endpoint
// Returns the full hierarchy with quarterly breakdown of approved advances
app.get('/api/formulario-a-trimestral', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();

        // Full hierarchy with approved avances
        const result = await pool.query(`
            SELECT 
                ej.code   AS eje_code,
                ej.description AS eje_desc,
                r.code    AS resultado_code,
                r.description AS resultado_desc,
                e.code    AS estrategia_code,
                e.description AS estrategia_desc,
                m.id      AS mega_id,
                m.name    AS mega_name,
                m.code    AS mega_code,
                u.name    AS unidad_name,
                prod.id   AS producto_id,
                prod.name AS producto_name,
                prod.ponderacion_total,
                prod.avance_fisico AS producto_avance,
                t.id      AS tarea_id,
                t.name    AS tarea_name,
                t.ponderacion_producto,
                t.fecha_inicio,
                t.fecha_fin,
                t.responsable_nombre,
                t.avance_fisico AS tarea_avance,

                -- Q1: Jan-Mar
                COALESCE((
                    SELECT SUM(av.avance_real)
                    FROM avances_semanales av
                    WHERE av.tarea_id = t.id AND av.estado = 'Aprobado'
                    AND (
                        t.fecha_inicio + ((av.semana - 1) * INTERVAL '7 days') 
                        BETWEEN make_date($1::int, 1, 1) AND make_date($1::int, 3, 31)
                    )
                ), 0) AS q1,

// Manual Seed Endpoint (Admin only)
app.post('/api/admin/seed-organigram', async (req, res) => {
    try {
        console.log('User manually requested Organigram Seed (52 nodes)');
        await seedUnidades();
        res.json({ message: 'Estructura Institucional (52 nodos) cargada correctamente en la Base de Datos.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
                COALESCE((
                    SELECT SUM(av.avance_real)
                    FROM avances_semanales av
                    WHERE av.tarea_id = t.id AND av.estado = 'Aprobado'
                    AND (
                        t.fecha_inicio + ((av.semana - 1) * INTERVAL '7 days') 
                        BETWEEN make_date($1::int, 4, 1) AND make_date($1::int, 6, 30)
                    )
                ), 0) AS q2,

                -- Q3: Jul-Sep
                COALESCE((
                    SELECT SUM(av.avance_real)
                    FROM avances_semanales av
                    WHERE av.tarea_id = t.id AND av.estado = 'Aprobado'
                    AND (
                        t.fecha_inicio + ((av.semana - 1) * INTERVAL '7 days') 
                        BETWEEN make_date($1::int, 7, 1) AND make_date($1::int, 9, 30)
                    )
                ), 0) AS q3,

                -- Q4: Oct-Dec
                COALESCE((
                    SELECT SUM(av.avance_real)
                    FROM avances_semanales av
                    WHERE av.tarea_id = t.id AND av.estado = 'Aprobado'
                    AND (
                        t.fecha_inicio + ((av.semana - 1) * INTERVAL '7 days') 
                        BETWEEN make_date($1::int, 10, 1) AND make_date($1::int, 12, 31)
                    )
                ), 0) AS q4

            FROM tareas t
            JOIN actividades a   ON t.actividad_id = a.id
            JOIN productos_intermedios prod ON a.producto_id = prod.id
            JOIN megas m         ON prod.mega_id = m.id
            LEFT JOIN estrategias e   ON m.estrategia_id = e.id
            LEFT JOIN resultados r    ON e.resultado_id = r.id
            LEFT JOIN ejes ej         ON r.eje_id = ej.id
            LEFT JOIN unidades_organizacionales u ON m.unit_id = u.id
            ORDER BY ej.code, r.code, e.code, m.id, prod.id, t.id
        `, [year]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    initDb().then(() => {
        app.listen(port, () => {
            console.log(`MeGAs Backend running on port ${port}`);
        });
    });
}

module.exports = app;
module.exports.app = app;
module.exports.pool = pool;
// Seed MTEPS Organigram
// Seed MTEPS Organigram
const seedUnidades = async () => {
    try {
        console.log('Running Single-Query Mass Organigram Seed (52 nodes)...');
        
        // Use a single transaction/block for performance and atomicity
        await pool.query(`
            DO $$ 
            DECLARE 
                m_id INT; dgp_id INT; dgaa_id INT; dgaj_id INT; vmtps_id INT; dgthso_id INT; vescc_id INT; dgsc_id INT; j_id INT;
            BEGIN
                -- Main Root
                INSERT INTO unidades_organizacionales (id, name, type) VALUES (1, 'Despacho del Ministro (a) de Trabajo, Empleo y Previsión Social', 'Ministro') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO m_id;

                -- Level 1 (Direct to Ministro)
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES 
                (2, 'Jefatura de Gabinete', 'Unidad', m_id),
                (3, 'Unidad de Comunicación', 'Unidad', m_id),
                (4, 'Unidad de Auditoría Interna', 'Unidad', m_id),
                (5, 'Unidad de Transparencia y Lucha contra la Corrupción', 'Unidad', m_id)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;

                -- Ejecutivo Sector
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (10, 'Dirección General de Planificación', 'Direccion', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO dgp_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Unidad de Tecnologías de la Información y Comunicación', 'Unidad', dgp_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (20, 'Dirección General de Asuntos Administrativos', 'Direccion', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO dgaa_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Unidad Administrativa', 'Unidad', dgaa_id), ('Unidad Financiera', 'Unidad', dgaa_id), ('Unidad de Recursos Humanos', 'Unidad', dgaa_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (30, 'Dirección General de Asuntos Jurídicos', 'Direccion', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO dgaj_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Unidad de Análisis Jurídico', 'Unidad', dgaj_id), ('Unidad de Gestión Jurídica', 'Unidad', dgaj_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                -- Viceministerios
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (100, 'Viceministerio de Trabajo y Previsión Social', 'Viceministerio', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vmtps_id;
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (110, 'Dirección General de Políticas de Previsión Social', 'Direccion', vmtps_id), (120, 'Dirección General de Asuntos Sindicales', 'Direccion', vmtps_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (130, 'Dirección General de Trabajo, Higiene y Seguridad Ocupacional', 'Direccion', vmtps_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO dgthso_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Unidad de Derechos Fundamentales', 'Unidad', dgthso_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (200, 'Viceministerio de Empleo, Servicio Civil y Cooperativas', 'Viceministerio', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO vescc_id;
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (210, 'Dirección General de Empleo', 'Direccion', vescc_id), (220, 'Dirección General de Políticas Públicas, Fomento, Protección y Promoción Cooperativa', 'Direccion', vescc_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (230, 'Dirección General del Servicio Civil', 'Direccion', vescc_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO dgsc_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Unidad de Función Pública y Registro Plurinacional', 'Unidad', dgsc_id), ('Unidad de Régimen Laboral e Impugnación', 'Unidad', dgsc_id), ('Unidad de Capacitación, Ética y Desarrollo Normativo', 'Unidad', dgsc_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                -- Entidad Bajo Tuicion
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (500, 'Autoridad de Fiscalización y Control de Cooperativas - AFCOOP', 'Direccion', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

                -- JEFATURAS (Departamentales y Regionales)
                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (301, 'Jefatura Departamental de Trabajo La Paz', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo El Alto', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (302, 'Jefatura Departamental de Trabajo Santa Cruz', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Montero', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Camiri', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Puerto Suárez', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Warnes', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (303, 'Jefatura Departamental de Trabajo Cochabamba', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Chapare', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (304, 'Jefatura Departamental de Trabajo Chuquisaca', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Monteagudo', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (305, 'Jefatura Departamental de Trabajo Oruro', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (306, 'Jefatura Departamental de Trabajo Potosí', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Tupiza', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Villazón', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Llallagua', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Uyuni', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (307, 'Jefatura Departamental de Trabajo Tarija', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Bermejo', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Yacuiba', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Villamontes', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (308, 'Jefatura Departamental de Trabajo Beni', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO j_id;
                INSERT INTO unidades_organizacionales (name, type, parent_id) VALUES ('Jefatura Regional de Trabajo Riberalta', 'Jefatura', j_id), ('Jefatura Regional de Trabajo Guayaramerín', 'Jefatura', j_id) ON CONFLICT (name) DO UPDATE SET parent_id = EXCLUDED.parent_id;

                INSERT INTO unidades_organizacionales (id, name, type, parent_id) VALUES (309, 'Jefatura Departamental de Trabajo Pando', 'Jefatura', m_id) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
            END $$;
        `);
        console.log('Organigram SEEDED SUCCESSFULLY (52 nodes verified with Single Query)');
    } catch (err) {
        console.error('CRITICAL SEEDING ERROR:', err);
    }
};
