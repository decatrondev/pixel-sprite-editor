// --- Rutas de Autenticación (authRoutes.js) ---
// API JSON pura — sin EJS

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/auth');

// --- POST /auth/register ---
router.post('/register', registerLimiter, async (req, res) => {
    const { username, email, password, password2 } = req.body;

    const result = registerSchema.safeParse({ username, email, password, password2 });
    if (!result.success) {
        const errors = result.error.errors.map(e => ({ msg: e.message }));
        return res.status(400).json({ success: false, errors, message: errors[0].msg });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]
        );
        if (users.length > 0) {
            return res.status(409).json({ success: false, message: 'El nombre de usuario o el email ya estan registrados.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        res.json({ success: true, message: 'Cuenta creada correctamente.' });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

// --- POST /auth/login ---
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
        return res.status(400).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }

        // Actualizar last_login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]).catch(() => {});

        // Regenerar session ID para prevenir session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Error regenerando sesion:', err);
                return res.status(500).json({ success: false, message: 'Error en el servidor.' });
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Error guardando sesion:', saveErr);
                }
                res.json({ success: true, user: req.session.user });
            });
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor.' });
    }
});

// --- POST /auth/logout ---
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error cerrando sesion.' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Sesion cerrada.' });
    });
});

// --- GET /auth/me ---
router.get('/me', isAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.user });
});

module.exports = router;
