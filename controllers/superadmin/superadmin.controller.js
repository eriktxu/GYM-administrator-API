const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_temporal';

//Registro de entrenador 
const registerGimnasio = async (req, res) => {
    const { nombre, correo, telefono, password } = req.body;

    if (!nombre || !correo || !telefono || !password) {
        return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM gimnasios WHERE correo = ?', [correo]);

        if (existing.length > 0) {
            return res.status(409).json({ message: 'El correo ya está registrado.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query(
            'INSERT INTO gimnasios (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
            [nombre, correo, telefono, hashedPassword]
        );

        res.status(201).json({ message: 'Entrenador registrado con éxito.' });
    } catch (error) {
        console.error('Error al registrar entrenador:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

//Login global
const login = async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ message: 'Correo y contraseña obligatorios.' });
    }

    try {
        const rolesQuery = `
            SELECT id, nombre FROM roles
        `;
        const [roles] = await db.query(rolesQuery);

        let usuario = null;
        let rol = '';
        let rol_id = null;
        let gimnasio_id = null;

        // Buscar en superusuarios
        const [superUserRows] = await db.query(`
            SELECT su.id, su.nombre, su.correo, su.password, su.rol_id, r.nombre AS rol
            FROM superusuarios su
            JOIN roles r ON su.rol_id = r.id
            WHERE su.correo = ?
        `, [correo]);

        if (superUserRows.length > 0) {
            usuario = superUserRows[0];
            rol = usuario.rol;
            rol_id = usuario.rol_id;
        }

        // Buscar en gimnasios
        if (!usuario) {
            const [gymRows] = await db.query(`
                SELECT g.id, g.nombre, g.correo, g.password, g.rol_id, r.nombre AS rol
                FROM gimnasios g
                JOIN roles r ON g.rol_id = r.id
                WHERE g.correo = ?
            `, [correo]);

            if (gymRows.length > 0) {
                usuario = gymRows[0];
                rol = usuario.rol;
                rol_id = usuario.rol_id;
            }
        }

        // Buscar en clientes
        if (!usuario) {
            const [clienteRows] = await db.query(`
                SELECT c.id, c.nombre, c.correo, c.password, c.rol_id, c.gimnasio_id, r.nombre AS rol
                FROM clientes c
                JOIN roles r ON c.rol_id = r.id
                WHERE c.correo = ?
            `, [correo]);

            if (clienteRows.length > 0) {
                usuario = clienteRows[0];
                rol = usuario.rol;
                rol_id = usuario.rol_id;
                gimnasio_id = usuario.gimnasio_id;
            }
        }

        if (!usuario) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        // Validar contraseña
        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        // Generar token
        const tokenPayload = {
            id: usuario.id,
            correo: usuario.correo,
            rol: rol,
            rol_id: rol_id,
            gimnasio_id: gimnasio_id || null
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

        // Responder con datos mínimos + token + tipo de redirección
        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol,
                rol_id,
                gimnasio_id: gimnasio_id || null,
                // Aquí puedes usar este campo para que el frontend sepa a qué pantalla redirigir
                redireccion: getRedireccionPorRol(rol_id)
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Consultar gimnasios 

const getGimnasios = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, nombre, correo, telefono
            FROM gimnasios
            ORDER BY nombre ASC
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener gimnasios:", error);
        res.status(500).json({ message: "Error del servidor." });
    }
};

// Función auxiliar para decidir a qué pantalla redirigir según el rol
function getRedireccionPorRol(rol_id) {
    switch (rol_id) {
        case 1:
            return '/superadmin';
        case 2:
            return '/admin-gimnasio';
        case 3:
            return '/cliente';
        default:
            return '/'; // Por si acaso
    }
}


module.exports = { 
    registerGimnasio,
    login,
    getGimnasios
};
