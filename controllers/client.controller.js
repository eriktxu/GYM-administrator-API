const db = require('../config/db');

// Crear clientes
exports.createClient = async (req, res) => {
    const {name, email, phone} = req.body;

    if(!name){
        return res.status(400).json({error: 'El nombre es obligatorio'})
    }

    try {
        const [result] = await db.execute(
            'INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)',
            [name, email, phone]
        );

        res.status(201).json({ id: result.insertId, name, email, phone});

    } catch (error) {
        console.error('Error al agregar el cliente', err);
        res.status(500).json({error: 'Error interno del servidor'});
    }
}

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