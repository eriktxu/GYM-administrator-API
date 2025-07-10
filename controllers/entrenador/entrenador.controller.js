const db = require('../../config/db');
const bcrypt = require('bcrypt');

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

module.exports = { registerEntrenador };
