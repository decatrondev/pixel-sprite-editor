// --- Módulo: Rutas de la API (apiRoutes.js) ---
// Propósito: Manejar todas las peticiones de datos (guardar, cargar, etc.).

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');

// --- Middleware de Autenticación ---
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'No autorizado. Por favor, inicia sesión.' });
};

// --- Configuración de Multer para la Subida de Archivos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userUploadsPath = path.join(__dirname, `../uploads/${req.session.user.username}`);
        fs.ensureDirSync(userUploadsPath);
        cb(null, userUploadsPath);
    },
    filename: (req, file, cb) => {
        const projectName = req.body.projectName || 'proyecto';
        const sanitizedName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const extension = path.extname(file.originalname);
        cb(null, `${sanitizedName}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// --- Rutas de la API ---

// [POST] /api/save-project
router.post('/save-project', isAuthenticated, upload.single('spriteImage'), async (req, res) => {
    const { projectName, jsonData, isUpdate, projectId } = req.body;
    const userId = req.session.user.id;
    const username = req.session.user.username;

    if (!req.file && !isUpdate) {
        return res.status(400).json({ success: false, message: 'No se ha subido ninguna imagen.' });
    }

    try {
        if (isUpdate && projectId) {
            const { rows: existingProjects } = await db.pool.query(
                'SELECT id, image_path FROM projects WHERE id = $1 AND user_id = $2',
                [projectId, userId]
            );

            if (existingProjects.length === 0) {
                return res.status(404).json({ success: false, message: 'Proyecto no encontrado o no autorizado.' });
            }

            await db.pool.query(
                'UPDATE projects SET json_data = $1 WHERE id = $2 AND user_id = $3',
                [jsonData, projectId, userId]
            );

            return res.json({
                success: true,
                message: 'Proyecto actualizado correctamente.',
                projectId: projectId
            });
        }

        const { rows: duplicateCheck } = await db.pool.query(
            'SELECT id FROM projects WHERE user_id = $1 AND project_name = $2',
            [userId, projectName]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Ya tienes un proyecto llamado "${projectName}". Elige otro nombre o actualiza el proyecto existente.`
            });
        }

        const imagePath = `/uploads/${username}/${req.file.filename}`;

        const { rows } = await db.pool.query(
            'INSERT INTO projects (user_id, project_name, image_path, json_data) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, projectName, imagePath, jsonData]
        );

        res.json({
            success: true,
            message: '¡Proyecto guardado con éxito!',
            projectId: rows[0].id
        });

    } catch (error) {
        console.error('Error al guardar en la base de datos:', error);

        if (req.file) {
            try {
                await fs.remove(req.file.path);
            } catch (cleanupError) {
                console.error('Error al limpiar archivo:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Error del servidor al guardar el proyecto.'
        });
    }
});

// [GET] /api/get-projects
router.get('/get-projects', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows: projects } = await db.pool.query(
            'SELECT id, project_name, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
            [userId]
        );
        res.json({ success: true, projects });
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ success: false, message: 'Error del servidor al obtener los proyectos.' });
    }
});

// [GET] /api/load-project/:id
router.get('/load-project/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;
    try {
        const { rows } = await db.pool.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (rows.length > 0) {
            const project = rows[0];
            const imagePath = path.join(__dirname, '..', project.image_path);

            if (!await fs.pathExists(imagePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'La imagen del proyecto no se encuentra en el servidor.'
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
        console.error('Error al cargar proyecto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al cargar el proyecto.'
        });
    }
});

// [DELETE] /api/delete-project/:id
router.delete('/delete-project/:id', isAuthenticated, async (req, res) => {
    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        const { rows: projects } = await db.pool.query(
            'SELECT project_name, image_path FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, userId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proyecto no encontrado o no autorizado.'
            });
        }

        const project = projects[0];

        const imagePath = path.join(__dirname, '../public', project.image_path);
        try {
            await fs.remove(imagePath);
        } catch (fileError) {
            console.warn('No se pudo eliminar el archivo de imagen:', fileError);
        }

        await db.pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);

        res.json({
            success: true,
            message: `Proyecto "${project.project_name}" eliminado correctamente.`
        });

    } catch (error) {
        console.error('Error al eliminar proyecto:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor al eliminar el proyecto.'
        });
    }
});

module.exports = router;
