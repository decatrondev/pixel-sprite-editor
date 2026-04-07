// --- Módulo: Rutas de Autenticación (authRoutes.js) ---
// Propósito: Manejar las rutas de registro, login y logout.

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

// --- Vistas ---
router.get('/register', (req, res) => {
    res.render('register', { errors: [], user: req.session.user || null });
});

router.get('/login', (req, res) => {
    res.render('login', { errors: [], user: req.session.user || null });
});

// --- Lógica ---
router.post('/register', async (req, res) => {
    const { username, email, password, password2 } = req.body;
    let errors = [];

    if (!username || !email || !password || !password2) {
        errors.push({ msg: 'Por favor, completa todos los campos' });
    }
    if (password !== password2) {
        errors.push({ msg: 'Las contraseñas no coinciden' });
    }
    if (password.length < 6) {
        errors.push({ msg: 'La contraseña debe tener al menos 6 caracteres' });
    }

    if (errors.length > 0) {
        return res.render('register', { errors, user: req.session.user || null });
    }

    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]
        );
        if (users.length > 0) {
            errors.push({ msg: 'El nombre de usuario o el email ya están registrados' });
            return res.render('register', { errors, user: req.session.user || null });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );

        res.redirect('/auth/login');

    } catch (err) {
        console.error(err);
        res.status(500).send("Error en el servidor");
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { rows: users } = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );
        if (users.length === 0) {
            return res.render('login', { errors: [{ msg: 'El email no está registrado' }], user: req.session.user || null });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            req.session.user = { id: user.id, username: user.username, email: user.email };
            res.redirect('/editor');
        } else {
            res.render('login', { errors: [{ msg: 'Contraseña incorrecta' }], user: req.session.user || null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en el servidor");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if(err) {
            return res.redirect('/editor');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

module.exports = router;
