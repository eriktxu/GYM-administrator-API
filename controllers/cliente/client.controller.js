const db = require('../../config/db');
const express = require("express");
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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
    let fechaVencimiento = new Date(fechaInicio.getTime());

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

    let tipo = tipo_suscripcion.toLowerCase();

    const tiposValidos = ['mensual', 'trimestral', 'semestral', 'anual'];
    if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({ error: 'Tipo de suscripción no válido' });
    }

    const fechaInicio = new Date();
    let fechaVencimiento = new Date(fechaInicio.getTime());

    switch (tipo) {
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
     SET tipo_suscripcion = ?, estado_suscripcion = 'activa', 
         inicio_suscripcion = ?, vencimiento_suscripcion = ?
     WHERE id = ?`,
            [tipo, formatDate(fechaInicio), formatDate(fechaVencimiento), clienteId]
        );

        res.status(200).json({ mensaje: 'Suscripción renovada' });
    } catch (error) {
        console.error('Error al renovar suscripción:', error);
        res.status(500).json({ error: 'Error al renovar la suscripción' });
    }
};

//Consultar clientes con información física completa
const getCompletos = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, nombre, edad, correo
            FROM clientes
            WHERE peso IS NOT NULL
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener clientes con info completa:', error);
        res.status(500).json({ message: 'Error del servidor al obtener clientes con info completa.' });
    }
};

//Endpont para generar plan de rutina y dieta, obtiene datos fisicos
//Y los manda al script de phyton
//Obtiene el resultado y combina los pdfs para descargar
const generarPlan = async (req, res) => {
    const idCliente = req.params.id;

    try {
        const PDFMerger = (await import('pdf-merger-js')).default;
        // 1. Obtener datos físicos del cliente
        const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [idCliente]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = rows[0];

        // 2. Preparar datos para Python
        const inputData = {
            edad: cliente.edad,
            genero: cliente.genero,
            altura: cliente.altura,
            cintura: cliente.cintura,
            imc: cliente.imc,
            tipo_cuerpo: cliente.tipo_cuerpo,
            nivel_actividad: cliente.nivel_actividad,
            objetivo: cliente.objetivo,
            restricciones_comida: cliente.restricciones_comida,
            enfermedades: cliente.enfermedades,
            peso: cliente.peso
        };

        // 3. Llamar al script de Python
        const py = spawn('python', ['ML/predecir.py', JSON.stringify(inputData)]);

        let output = '';
        py.stdout.on('data', (data) => output += data.toString());

        py.stderr.on('data', (data) => console.error(`Python error: ${data}`));

        py.on('close', async (code) => {
            if (code !== 0) return res.status(500).json({ error: 'Error en el modelo de ML' });

            // 4. Parsear la salida
            const result = JSON.parse(output);
            const rutina = result.rutina;
            const dieta = result.dieta;

            // 5. Rutas de los PDF individuales
            const rutinaPath = path.join(__dirname, '../../ML/recursos/rutinas', `${rutina}.pdf`);
            const dietaPath = path.join(__dirname, '../../ML/recursos/dietas', `${dieta}.pdf`);

            //Debug para probar que el modelo esta regresando rutina y dieta
            // console.log('Rutina:', rutina);
            // console.log('Dieta:', dieta);
            // console.log('Rutina Path:', rutinaPath);
            // console.log('Dieta Path:', dietaPath); 

            // Verifica que existan
            if (!fs.existsSync(rutinaPath) || !fs.existsSync(dietaPath)) {
                return res.status(404).json({ error: 'No se encontraron los PDFs' });
            }

            // 6. Combinar los PDFs
            const merger = new PDFMerger();
            await merger.add(rutinaPath);
            await merger.add(dietaPath);

            const outputPath = path.join(__dirname, `../../ML/recursos/resultados/plan_${idCliente}.pdf`);
            await merger.save(outputPath);

            // 7. Enviar el PDF como descarga
            res.download(outputPath, `plan_${cliente.nombre}.pdf`, (err) => {
                if (err) console.error('Error enviando PDF:', err);
                // Opcional: eliminar el archivo después de enviarlo
                fs.unlinkSync(outputPath);
            });
        });

    } catch (err) {
        console.error('Error en /generar-plan:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = router;

module.exports = {
    getCliente,
    getSuscripciones,
    registrarCliente,
    datosCliente,
    eliminarCliente,
    actualizarCliente,
    renovarSuscripcion,
    getCompletos,
    generarPlan
}