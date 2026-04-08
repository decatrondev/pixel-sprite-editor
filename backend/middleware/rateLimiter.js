// Rate limiting por tipo de endpoint

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,
    message: { success: false, message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3,
    message: { success: false, message: 'Demasiados registros. Intenta de nuevo en 1 hora.' },
    standardHeaders: true,
    legacyHeaders: false
});

const saveLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 30,
    message: { success: false, message: 'Demasiados guardados. Intenta de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});

const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100,
    message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { loginLimiter, registerLimiter, saveLimiter, generalLimiter };
