// --- Servidor Principal (server.js) ---
// API REST pura — frontend React servido por Nginx

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const { pool, createTables } = require('./config/database');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const pixelArtRoutes = require('./routes/pixelArtRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3011;

createTables();

// --- Seguridad ---
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://sprites.decatron.net',
    credentials: true
}));

app.use(generalLimiter);

// --- Middlewares ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// --- Sesiones en PostgreSQL ---
app.set('trust proxy', 1);
app.use(session({
    store: new PgSession({
        pool: pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// --- Rutas API ---
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/pixelart', pixelArtRoutes);
app.use('/api/admin', adminRoutes);

// --- Error handler global ---
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
