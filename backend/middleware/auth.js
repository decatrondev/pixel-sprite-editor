// Middleware de autenticación

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, message: 'No autorizado. Por favor, inicia sesión.' });
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ success: false, message: 'Acceso denegado.' });
};

module.exports = { isAuthenticated, isAdmin };
