const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_temporal';

// Registro de gimnasio
const registerGimnasio = async (req, res) => {
    const { nombre, correo, telefono, password } = req.body;
    const ROL_GIMNASIO_ID = 2;

    // 1. Validación de datos de entrada
    if (!nombre || !correo || !telefono || !password) {
        return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    try {
        // 2. Verificar si el correo ya existe en la tabla 'gimnasios'
        const [existing] = await db.query('SELECT * FROM gimnasios WHERE correo = ?', [correo]);

        if (existing.length > 0) {
            return res.status(409).json({ message: 'El correo ya está registrado para otro gimnasio.' });
        }

        // 3. Hashear la contraseña antes de guardarla
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Insertar el nuevo gimnasio en la base de datos
        await db.query(
            'INSERT INTO gimnasios (nombre, correo, telefono, password, rol_id) VALUES (?, ?, ?, ?, ?)',
            [nombre, correo, telefono, hashedPassword, ROL_GIMNASIO_ID] // Se añade el ID del rol al final
        );

        // --- CORREGIDO --- Mensaje de éxito
        res.status(201).json({ message: 'Gimnasio registrado con éxito.' });

    } catch (error) {
        // --- CORREGIDO --- Mensaje de error
        console.error('Error al registrar gimnasio:', error);
        res.status(500).json({ message: 'Error en el servidor al registrar el gimnasio.' });
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
    login
};
