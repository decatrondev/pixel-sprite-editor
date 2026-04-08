// --- Rutas de Pixel Art (pixelArtRoutes.js) ---
// Propósito: Manejar todas las operaciones de backend para proyectos de pixel art.

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const fs = require('fs-extra');
const path = require('path');
const { isAuthenticated } = require('../middleware/auth');
const { saveLimiter } = require('../middleware/rateLimiter');

// --- Funciones auxiliares ---
function validateProjectData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push('El nombre del proyecto debe tener al menos 3 caracteres.');
    }

    if (data.name && data.name.length > 50) {
        errors.push('El nombre del proyecto no puede exceder 50 caracteres.');
    }

    if (!data.width || !data.height || data.width < 8 || data.height < 8) {
        errors.push('Las dimensiones del canvas deben ser al menos 8x8 píxeles.');
    }

    if (!data.imageData) {
        errors.push('Los datos de imagen son requeridos.');
    }

    return errors;
}

function sanitizeProjectName(name) {
    return name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
}

// --- Rutas de la API ---

// [POST] /api/pixelart/save-project
router.post('/save-project', isAuthenticated, saveLimiter, async (req, res) => {
    const { name, width, height, imageData, frames_data, palette, settings, animations_data, isUpdate, projectId } = req.body;
    const userId = req.session.user.id;

    try {
        const validationErrors = validateProjectData({ name, width, height, imageData });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: validationErrors[0]
            });
        }

        if (isUpdate && projectId) {
            const { rows: existingProjects } = await db.pool.query(
                'SELECT id FROM pixelart_projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (existingProjects.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Proyecto no encontrado o no autorizado.'
                });
            }

            await db.pool.query(
                `UPDATE pixelart_projects SET
                 canvas_width = $1, canvas_height = $2, image_data = $3,
                 frames_data = $4, palette = $5, settings = $6, animations_data = $7
                 WHERE id = $8 AND user_id = $9`,
                [width, height, imageData, frames_data, JSON.stringify(palette), JSON.stringify(settings), animations_data ? JSON.stringify(animations_data) : null, projectId, userId]
            );

            return res.json({
                success: true,
                message: 'Proyecto actualizado correctamente.',
                projectId: projectId
            });
        }

        const { rows: duplicateCheck } = await db.pool.query(
            'SELECT id FROM pixelart_projects WHERE user_id = $1 AND project_name = $2',
            [userId, name]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Ya tienes un proyecto de pixel art llamado "${name}". Elige otro nombre.`
            });
        }

        const maxSize = 256;
        if (width > maxSize || height > maxSize) {
            return res.status(400).json({
                success: false,
                message: `Tamaño máximo permitido: ${maxSize}x${maxSize}px`
            });
        }

        const { rows } = await db.pool.query(
            `INSERT INTO pixelart_projects
             (user_id, project_name, canvas_width, canvas_height, image_data, frames_data, palette, settings, animations_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [userId, name, width, height, imageData, frames_data, JSON.stringify(palette), JSON.stringify(settings), animations_data ? JSON.stringify(animations_data) : null]
        );

        res.json({
            success: true,
            message: '¡Proyecto de pixel art guardado con éxito!',
            projectId: rows[0].id
        });

    } catch (error) {
        console.error('Error al guardar proyecto de pixel art:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al guardar el proyecto.'
        });
    }
});

// [GET] /api/pixelart/get-projects
router.get('/get-projects', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const { rows: projects } = await db.pool.query(
            `SELECT id, project_name, canvas_width, canvas_height, created_at, updated_at
             FROM pixelart_projects
             WHERE user_id = $1
             ORDER BY updated_at DESC`,
            [userId]
        );

        res.json({ success: true, projects });
    } catch (error) {
        console.error('Error al obtener proyectos de pixel art:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al obtener los proyectos.'
        });
    }
});

// [GET] /api/pixelart/load-project/:id
router.get('/load-project/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        const { rows } = await db.pool.query(
            'SELECT * FROM pixelart_projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (rows.length > 0) {
            const project = rows[0];

            if (!project.image_data) {
                return res.status(404).json({
                    success: false,
                    message: 'Los datos de imagen del proyecto no se encontraron.'
                });
            }

            res.json({ success: true, project });
        } else {
            res.status(404).json({
                success: false,
                message: 'Proyecto no encontrado o no te pertenece.'
            });
        }
    } catch (error) {
        console.error('Error al cargar proyecto de pixel art:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al cargar el proyecto.'
        });
    }
});

// [DELETE] /api/pixelart/delete-project/:id
router.delete('/delete-project/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        const { rows: projects } = await db.pool.query(
            'SELECT project_name FROM pixelart_projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proyecto no encontrado o no autorizado.'
            });
        }

        const project = projects[0];

        await db.pool.query(
            'DELETE FROM pixelart_projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        res.json({
            success: true,
            message: `Proyecto "${project.project_name}" eliminado correctamente.`
        });

    } catch (error) {
        console.error('Error al eliminar proyecto de pixel art:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al eliminar el proyecto.'
        });
    }
});

// [GET] /api/pixelart/export/:id
router.get('/export/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;
    const scale = parseInt(req.query.scale) || 1;

    try {
        const { rows } = await db.pool.query(
            'SELECT project_name, image_data FROM pixelart_projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proyecto no encontrado.'
            });
        }

        const project = rows[0];

        const base64Data = project.image_data.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const filename = `${sanitizeProjectName(project.project_name)}_${scale}x.png`;
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        res.send(buffer);

    } catch (error) {
        console.error('Error al exportar proyecto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al exportar el proyecto.'
        });
    }
});

// [GET] /api/pixelart/export-frames/:id
router.get('/export-frames/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        const { rows } = await db.pool.query(
            'SELECT project_name, frames_data FROM pixelart_projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proyecto no encontrado.'
            });
        }

        const project = rows[0];

        if (!project.frames_data) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron datos de frames.'
            });
        }

        const framesData = JSON.parse(project.frames_data);

        res.json({
            success: true,
            projectName: project.project_name,
            frames: framesData.frames || [],
            metadata: {
                totalFrames: framesData.frames ? framesData.frames.length : 0,
                transparentBackground: framesData.transparentBackground || false
            }
        });

    } catch (error) {
        console.error('Error al exportar frames:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al exportar frames.'
        });
    }
});

module.exports = router;
