// --- Módulo: Rutas Principales (mainRoutes.js) ---
// Propósito: Manejar las rutas principales de la aplicación como la página de inicio y editores.

const express = require('express');
const router = express.Router();

// GET / - Muestra la página de inicio
router.get('/', (req, res) => {
    // Pasamos explícitamente la variable 'user' a la vista.
    // Estará llena si el usuario inició sesión, o será null si no.
    res.render('index', { user: req.session.user || null });
});

// GET /editor - Muestra la página del editor de sprites
router.get('/editor', (req, res) => {
    // Hacemos lo mismo para la vista del editor.
    res.render('editor', { user: req.session.user || null });
});

// GET /pixelart - Muestra la página del editor de pixel art
router.get('/pixelart', (req, res) => {
    res.render('pixelart', { user: req.session.user || null });
});

module.exports = router;