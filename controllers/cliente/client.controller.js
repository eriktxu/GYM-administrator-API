const db = require('../../config/db');

// Crear clientes
const registerClient = async (req, res) => {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
        return res.status(400).json({ message: 'Faltan datos obligatorios.' });
    }

    try {
        const [existing] = await pool.query('SELECT * FROM clients WHERE correo = ?', [correo]);

        if (existing.length > 0) {
            return res.status(409).json({ message: 'El correo ya está registrado.' });
        }

        await pool.query('INSERT INTO clients (nombre, correo, password) VALUES (?, ?, ?)', [nombre, correo, password]);

        res.status(201).json({ message: 'Cliente registrado con éxito.' });
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

// Eliminar clientes
exports.deleteClient = async (req, res) => {
    const {id} = req.params;

    try {
        const [result] = await db.execute(
            'DELETE FROM clients WHERE id = ?', [id]
        );

        if(result.affectedRows = 0){
            return res(404).json({error: 'Cliente no encontrado'});
        }

        res(201).json({message: 'Cliente eliminado correctamente'});
 
    } catch (error) {
        console.error('Error al eliminar al cliente', err);
        res.status(500).json({error: 'Error interno del servidor'});
    }

}

// Editar clientes
exports.editClient = async (req, res) => {
    
}