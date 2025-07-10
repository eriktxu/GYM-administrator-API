const db = require('../../config/db');

//Consultar clientes
const getCliente = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, nombre, correo, telefono FROM clientes');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error del servidor al obtener clientes.' });
    }
};

//Consultar suscripciones
const getSuscripciones = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.cliente_id,
                c.nombre AS nombre_cliente,
                s.tipo,
                s.fecha_inicio,
                s.fecha_vencimiento,
                s.estado
            FROM 
                suscripciones s
            JOIN 
                clientes c ON s.cliente_id = c.id
        `);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({ message: 'Error al obtener las suscripciones.' });
    }
};

// Editar clientes
module.exports = {
    getCliente,
    getSuscripciones
}