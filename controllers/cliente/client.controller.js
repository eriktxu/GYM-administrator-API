const db = require('../../config/db');
const express = require("express");
const router = express.Router();

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
                id AS cliente_id,
                nombre AS nombre_cliente,
                tipo_suscripcion,
                inicio_suscripcion,
                vencimiento_suscripcion,
                estado_suscripcion
            FROM 
                clientes
        `);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({ message: 'Error al obtener las suscripciones.' });
    }
};

//Registrar clientes 
const registrarCliente = async (req, res) => {
    const { nombre, correo, telefono, tipo_suscripcion } = req.body;

    // Validar tipo de suscripción
    const tiposValidos = ['mensual', 'trimestral', 'semestral', 'anual'];
    if (!tiposValidos.includes(tipo_suscripcion)) {
        return res.status(400).json({ error: 'Tipo de suscripción no válido' });
    }

    // Calcular fechas
    const fechaInicio = new Date();
    let fechaVencimiento = new Date(fechaInicio);

    switch (tipo_suscripcion) {
        case 'mensual':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
            break;
        case 'trimestral':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3);
            break;
        case 'semestral':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 6);
            break;
        case 'anual':
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
            break;
    }

    // Convertir a formato YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    const inicio_suscripcion = formatDate(fechaInicio);
    const vencimiento_suscripcion = formatDate(fechaVencimiento);

    try {
        const [result] = await db.execute(
            `INSERT INTO clientes 
                (nombre, correo, telefono, tipo_suscripcion, estado_suscripcion, inicio_suscripcion, vencimiento_suscripcion)
                VALUES (?, ?, ?, ?, 'activa', ?, ?)`,
            [nombre, correo, telefono, tipo_suscripcion, inicio_suscripcion, vencimiento_suscripcion]
        );

        res.status(201).json({ mensaje: 'Cliente registrado', clienteId: result.insertId });
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ error: 'Error al registrar el cliente' });
    }
};

//Enviar datos de cliente
const datosCliente = async (req, res) => {
    const {
        id,
        edad,
        genero,
        altura,
        peso,
        cintura,
        tipo_cuerpo,
        nivel_actividad,
        objetivo,
        restricciones_comida,
        enfermedades,
        imc
    } = req.body;

    try {
        const query = `
            UPDATE clientes SET 
                edad = ?,
                genero = ?,
                altura = ?,
                peso = ?,
                cintura = ?,
                tipo_cuerpo = ?,
                nivel_actividad = ?,
                objetivo = ?,
                restricciones_comida = ?,
                enfermedades = ?,
                imc = ?
            WHERE id = ?
        `;

        const values = [
            edad,
            genero,
            altura,
            peso,
            cintura,
            tipo_cuerpo,
            nivel_actividad,
            objetivo,
            JSON.stringify(restricciones_comida),
            JSON.stringify(enfermedades),
            imc,
            id
        ];

        // console.log("Datos recibidos:", req.body); // Para verificar lo que llega
        // console.log("Query:", query);
        // console.log("Values:", values);

        const [result] = await db.query(query, values);

        // console.log("Resultado de la actualización:", result);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.status(200).json({ message: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error('Error al actualizar datos del cliente:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Eliminar cliente por ID
const eliminarCliente = async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM clientes WHERE id = ?';
        const [result] = await db.query(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.status(200).json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

//Actualizar clientes
const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, telefono } = req.body;

    try {
        const query = 'UPDATE clientes SET nombre = ?, correo = ?, telefono = ? WHERE id = ?';
        const [result] = await db.query(query, [nombre, correo, telefono, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.status(200).json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error al actualizar cliente:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Renovar suscripción por ID en la URL
const renovarSuscripcion = async (req, res) => {
    const { tipo_suscripcion } = req.body;
    const clienteId = req.params.id;

    const tiposValidos = ['mensual', 'trimestral', 'semestral', 'anual'];
    if (!tiposValidos.includes(tipo_suscripcion.toLowerCase())) {
        return res.status(400).json({ error: 'Tipo de suscripción no válido' });
    }

    const fechaInicio = new Date();
    let fechaVencimiento = new Date(fechaInicio);

    switch (tipo_suscripcion) {
        case 'mensual':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
            break;
        case 'trimestral':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3);
            break;
        case 'semestral':
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 6);
            break;
        case 'anual':
            fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
            break;
    }

    const formatDate = (date) => date.toISOString().split('T')[0];

    try {
        await db.execute(
            `UPDATE clientes 
            SET tipo_suscripcion = ?, estado_suscripcion = 'activa', inicio_suscripcion = ?, vencimiento_suscripcion = ?
            WHERE id = ?`,
            [tipo_suscripcion, formatDate(fechaInicio), formatDate(fechaVencimiento), clienteId]
        );

        res.status(200).json({ mensaje: 'Suscripción renovada' });
    } catch (error) {
        console.error('Error al renovar suscripción:', error);
        res.status(500).json({ error: 'Error al renovar la suscripción' });
    }
};



module.exports = {
    getCliente,
    getSuscripciones,
    registrarCliente,
    datosCliente,
    eliminarCliente,
    actualizarCliente,
    renovarSuscripcion
}