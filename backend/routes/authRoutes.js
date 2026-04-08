// --- Rutas de Autenticación (authRoutes.js) ---

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../middleware/validation');
const { isAuthenticated } = require('../middleware/auth');

// --- Vistas (EJS temporal) ---
router.get('/register', (req, res) => {
    res.render('register', { errors: [], user: req.session.user || null });
});

router.get('/login', (req, res) => {
    res.render('login', { errors: [], user: req.session.user || null });
});

// Helper: detectar si el request espera JSON
function wantsJson(req) {
    return req.headers['content-type']?.includes('application/json') ||
           req.headers.accept?.includes('application/json');
}

// --- POST /auth/register ---
router.post('/register', registerLimiter, async (req, res) => {
    const { username, email, password, password2 } = req.body;

    const result = registerSchema.safeParse({ username, email, password, password2 });
    if (!result.success) {
        const errors = result.error.errors.map(e => ({ msg: e.message }));
        if (wantsJson(req)) {
            return res.status(400).json({ success: false, errors, message: errors[0].msg });
        }
        return res.render('register', { errors, user: req.session.user || null });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]
        );
        if (users.length > 0) {
            const errors = [{ msg: 'El nombre de usuario o el email ya están registrados' }];
            if (wantsJson(req)) {
                return res.status(409).json({ success: false, errors, message: errors[0].msg });
            }
            return res.render('register', { errors, user: req.session.user || null });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        if (wantsJson(req)) {
            return res.json({ success: true, message: 'Cuenta creada correctamente.' });
        }
        res.redirect('/auth/login');

    } catch (err) {
        console.error('Error en registro:', err);
        if (wantsJson(req)) {
            return res.status(500).json({ success: false, message: 'Error en el servidor.' });
        }
        res.status(500).send("Error en el servidor");
    }
});

// --- POST /auth/login ---
router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
        const errors = [{ msg: 'Credenciales incorrectas.' }];
        if (wantsJson(req)) {
            return res.status(400).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        return res.render('login', { errors, user: req.session.user || null });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );

        const genericError = [{ msg: 'Credenciales incorrectas.' }];

        if (users.length === 0) {
            if (wantsJson(req)) {
                return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
            }
            return res.render('login', { errors: genericError, user: req.session.user || null });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            if (wantsJson(req)) {
                return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
            }
            return res.render('login', { errors: genericError, user: req.session.user || null });
        }

        // Actualizar last_login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]).catch(() => {});

        // Regenerar session ID para prevenir session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Error regenerando sesión:', err);
                if (wantsJson(req)) {
                    return res.status(500).json({ success: false, message: 'Error en el servidor.' });
                }
                return res.status(500).send("Error en el servidor");
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            };

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Error guardando sesión:', saveErr);
                }
                if (wantsJson(req)) {
                    return res.json({ success: true, user: req.session.user });
                }
                res.redirect('/editor');
            });
        });

    } catch (err) {
        console.error('Error en login:', err);
        if (wantsJson(req)) {
            return res.status(500).json({ success: false, message: 'Error en el servidor.' });
        }
        res.status(500).send("Error en el servidor");
    }
});

// --- GET /auth/logout ---
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            if (wantsJson(req)) {
                return res.status(500).json({ success: false, message: 'Error cerrando sesión.' });
            }
            return res.redirect('/editor');
        }
        res.clearCookie('connect.sid');
        if (wantsJson(req)) {
            return res.json({ success: true, message: 'Sesión cerrada.' });
        }
        res.redirect('/');
    });
});

// --- GET /auth/me --- (para frontend React)
router.get('/me', isAuthenticated, (req, res) => {
    res.json({ success: true, user: req.session.user });
});

module.exports = router;
