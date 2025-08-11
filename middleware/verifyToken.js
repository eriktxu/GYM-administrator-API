const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    console.log('verifyToken middleware ejecutado'); // <-- log inmediato para saber si entra

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('Token no proporcionado');
        return res.status(401).json({ message: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('verifyToken - decoded token payload:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Token inválido o expirado');
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        console.log('authorizeRoles middleware ejecutado');
        console.log('authorizeRoles - req.user:', req.user);
        console.log('authorizeRoles - allowedRoles:', allowedRoles);
        if (!req.user || !allowedRoles.includes(req.user.rol_id)) {
            console.log('authorizeRoles - Acceso denegado por rol:', req.user?.rol_id);
            return res.status(403).json({ message: 'No tienes permiso para acceder a esta ruta.' });
        }
        next();
    };
};

module.exports = {
        verifyToken, 
        authorizeRoles,
}
