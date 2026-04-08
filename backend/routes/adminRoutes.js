// --- Rutas de Administración (adminRoutes.js) ---

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const path = require('path');
const fs = require('fs-extra');

// Todos los endpoints requieren auth + admin
router.use(isAuthenticated, isAdmin);

// --- GET /api/admin/stats ---
router.get('/stats', async (req, res) => {
    try {
        const [usersResult, projectsResult, pixelartResult, activeResult, adminResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM users'),
            pool.query('SELECT COUNT(*) as total FROM projects'),
            pool.query('SELECT COUNT(*) as total FROM pixelart_projects'),
            pool.query('SELECT COUNT(*) as total FROM users WHERE is_active = true'),
            pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'admin'")
        ]);

        // Calcular tamaño de uploads
        const uploadsPath = path.join(__dirname, '..', 'uploads');
        let uploadsSize = 0;
        try {
            uploadsSize = await getDirectorySize(uploadsPath);
        } catch (e) { /* directorio puede no existir */ }

        // Tamaño de DB
        const dbSizeResult = await pool.query(
            "SELECT pg_size_pretty(pg_database_size('pixel_sprites')) as size"
        );

        // Usuarios recientes
        const recentUsersResult = await pool.query(
            'SELECT COUNT(*) as total FROM users WHERE created_at > NOW() - INTERVAL \'7 days\''
        );

        res.json({
            success: true,
            stats: {
                users: {
                    total: parseInt(usersResult.rows[0].total),
                    active: parseInt(activeResult.rows[0].total),
                    admins: parseInt(adminResult.rows[0].total),
                    recentWeek: parseInt(recentUsersResult.rows[0].total)
                },
                projects: {
                    sprites: parseInt(projectsResult.rows[0].total),
                    pixelart: parseInt(pixelartResult.rows[0].total),
                    total: parseInt(projectsResult.rows[0].total) + parseInt(pixelartResult.rows[0].total)
                },
                system: {
                    dbSize: dbSizeResult.rows[0].size,
                    uploadsSize: formatBytes(uploadsSize),
                    nodeVersion: process.version,
                    uptime: formatUptime(process.uptime())
                }
            }
        });
    } catch (error) {
        console.error('Error obteniendo stats:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo estadísticas.' });
    }
});

// --- GET /api/admin/users ---
router.get('/users', async (req, res) => {
    try {
        const { rows: users } = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login,
                   COALESCE(p.sprite_count, 0) as sprite_count,
                   COALESCE(pa.pixelart_count, 0) as pixelart_count
            FROM users u
            LEFT JOIN (SELECT user_id, COUNT(*) as sprite_count FROM projects GROUP BY user_id) p ON p.user_id = u.id
            LEFT JOIN (SELECT user_id, COUNT(*) as pixelart_count FROM pixelart_projects GROUP BY user_id) pa ON pa.user_id = u.id
            ORDER BY u.created_at DESC
        `);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo usuarios.' });
    }
});

// --- GET /api/admin/users/:id ---
router.get('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'ID inválido.' });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = $1',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const [spriteProjects, pixelartProjects] = await Promise.all([
            pool.query(
                'SELECT id, project_name, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
                [userId]
            ),
            pool.query(
                'SELECT id, project_name, canvas_width, canvas_height, created_at, updated_at FROM pixelart_projects WHERE user_id = $1 ORDER BY updated_at DESC',
                [userId]
            )
        ]);

        res.json({
            success: true,
            user: users[0],
            projects: {
                sprites: spriteProjects.rows,
                pixelart: pixelartProjects.rows
            }
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo usuario.' });
    }
});

// --- PATCH /api/admin/users/:id ---
router.patch('/users/:id', async (req, res) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'ID inválido.' });
    }

    // No permitir auto-modificación de rol
    if (userId === req.session.user.id && req.body.role) {
        return res.status(400).json({ success: false, message: 'No puedes cambiar tu propio rol.' });
    }

    const { role, is_active } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (role !== undefined) {
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Rol inválido.' });
        }
        updates.push(`role = $${paramIndex++}`);
        values.push(role);
    }

    if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(Boolean(is_active));
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No hay campos para actualizar.' });
    }

    values.push(userId);

    try {
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
        );

        res.json({ success: true, message: 'Usuario actualizado.' });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ success: false, message: 'Error actualizando usuario.' });
    }
});

// --- GET /api/admin/projects ---
router.get('/projects', async (req, res) => {
    const { type } = req.query; // 'sprites', 'pixelart', o undefined para todos

    try {
        let sprites = [];
        let pixelart = [];

        if (!type || type === 'sprites') {
            const result = await pool.query(`
                SELECT p.id, p.project_name, p.image_path, p.created_at, p.updated_at,
                       u.username, u.id as user_id
                FROM projects p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.updated_at DESC
            `);
            sprites = result.rows;
        }

        if (!type || type === 'pixelart') {
            const result = await pool.query(`
                SELECT p.id, p.project_name, p.canvas_width, p.canvas_height,
                       p.created_at, p.updated_at,
                       u.username, u.id as user_id
                FROM pixelart_projects p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.updated_at DESC
            `);
            pixelart = result.rows;
        }

        res.json({ success: true, projects: { sprites, pixelart } });
    } catch (error) {
        console.error('Error obteniendo proyectos:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo proyectos.' });
    }
});

// --- DELETE /api/admin/projects/:type/:id ---
router.delete('/projects/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    const projectId = parseInt(id);

    if (isNaN(projectId) || !['sprites', 'pixelart'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Parámetros inválidos.' });
    }

    try {
        const table = type === 'sprites' ? 'projects' : 'pixelart_projects';

        // Si es sprite, eliminar archivo de imagen
        if (type === 'sprites') {
            const { rows } = await pool.query(
                'SELECT image_path FROM projects WHERE id = $1', [projectId]
            );
            if (rows.length > 0 && rows[0].image_path) {
                const imagePath = path.join(__dirname, '..', rows[0].image_path);
                await fs.remove(imagePath).catch(() => {});
            }
        }

        const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [projectId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
        }

        res.json({ success: true, message: 'Proyecto eliminado.' });
    } catch (error) {
        console.error('Error eliminando proyecto:', error);
        res.status(500).json({ success: false, message: 'Error eliminando proyecto.' });
    }
});

// --- GET /api/admin/activity ---
router.get('/activity', async (req, res) => {
    try {
        const [recentLogins, recentProjects, recentPixelart, recentUsers] = await Promise.all([
            pool.query(`
                SELECT id, username, last_login
                FROM users
                WHERE last_login IS NOT NULL
                ORDER BY last_login DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT p.id, p.project_name, p.updated_at, u.username,
                       'sprite' as type
                FROM projects p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.updated_at DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT p.id, p.project_name, p.updated_at, u.username,
                       'pixelart' as type
                FROM pixelart_projects p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.updated_at DESC
                LIMIT 10
            `),
            pool.query(`
                SELECT id, username, created_at
                FROM users
                ORDER BY created_at DESC
                LIMIT 10
            `)
        ]);

        // Combinar proyectos recientes y ordenar por fecha
        const recentProjectsAll = [...recentProjects.rows, ...recentPixelart.rows]
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 10);

        res.json({
            success: true,
            activity: {
                recentLogins: recentLogins.rows,
                recentProjects: recentProjectsAll,
                recentUsers: recentUsers.rows
            }
        });
    } catch (error) {
        console.error('Error obteniendo actividad:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo actividad.' });
    }
});

// --- Utilidades ---

async function getDirectorySize(dirPath) {
    let totalSize = 0;
    try {
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                totalSize += await getDirectorySize(fullPath);
            } else {
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
            }
        }
    } catch (e) { /* ignore */ }
    return totalSize;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

module.exports = router;
