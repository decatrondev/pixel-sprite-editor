// --- Servidor Principal (server.js) ---
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
const PORT = process.env.PORT || 3011;

createTables();

// --- Middlewares ---
// Servir archivos estáticos del frontend legacy (temporal hasta migración a React)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Servir uploads desde backend/uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

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

// EJS temporal — se elimina en Fase 3
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// --- Rutas ---
app.use('/', mainRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/pixelart', pixelArtRoutes);

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
