// --- Módulo: Servidor Principal (server.js) ---
// Propósito: Punto de entrada de la aplicación, configuración de Express y rutas.

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const mainRoutes = require('./routes/mainRoutes');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const pixelArtRoutes = require('./routes/pixelArtRoutes');

const { createTables } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

createTables();

// --- Middlewares ---
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware específico para servir archivos CSS con el MIME type correcto
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Rutas ---
app.use('/', mainRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/pixelart', pixelArtRoutes);

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});