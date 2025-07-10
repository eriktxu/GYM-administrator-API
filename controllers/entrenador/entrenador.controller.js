const db = require('../../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Registro de entrenador 
const registerEntrenador = async (req, res) => {
    const { nombre, correo, telefono, password } = req.body;

    if (!nombre || !correo || !telefono || !password) {
        return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM entrenadores WHERE correo = ?', [correo]);

        if (existing.length > 0) {
            return res.status(409).json({ message: 'El correo ya está registrado.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query(
            'INSERT INTO entrenadores (nombre, correo, telefono, password) VALUES (?, ?, ?, ?)',
            [nombre, correo, telefono, hashedPassword]
        );

        res.status(201).json({ message: 'Entrenador registrado con éxito.' });
    } catch (error) {
        console.error('Error al registrar entrenador:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

//Login de entrenador 
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_temporal';

const loginEntrenador = async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ message: 'Correo y contraseña obligatorios.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM entrenadores WHERE correo = ?', [correo]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        const trainer = rows[0];

        const isMatch = await bcrypt.compare(password, trainer.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
        }

        // 🔐 Generar JWT
        const token = jwt.sign(
            { id: trainer.id, correo: trainer.correo },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            trainer: {
                id: trainer.id,
                nombre: trainer.nombre,
                correo: trainer.correo,
                telefono: trainer.telefono
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};


module.exports = { 
    registerEntrenador,
    loginEntrenador
};
