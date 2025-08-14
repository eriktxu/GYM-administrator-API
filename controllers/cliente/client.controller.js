const db = require('../../config/db');
const express = require("express");
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Consultar clientes por gimnasio
const getCliente = async (req, res) => {
    try {
        // 1. Obtenemos el ID del gimnasio del objeto 'req.user'.
        // Este objeto es añadido por el middleware de autenticación.
        const gimnasioId = req.user.id;

        // 2. Modificamos la consulta SQL para filtrar por 'gimnasio_id'.
        // Asegúrate de que tu tabla 'clientes' tenga una columna llamada 'gimnasio_id'.
        const [rows] = await db.query(
            'SELECT id, nombre, correo, telefono FROM clientes WHERE gimnasio_id = ?',
            [gimnasioId] // Pasamos el ID como parámetro para seguridad
        );

        res.status(200).json(rows);

    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error del servidor al obtener clientes.' });
    }
};

//Consultar suscripciones
const getSuscripciones = async (req, res) => {
    try {
        // 1. Obtenemos el ID del gimnasio autenticado desde el middleware.
        const gimnasioId = req.user.id;

        // 2. Añadimos el filtro WHERE a la consulta SQL.
        // Esto asume que tu tabla `clientes` tiene una columna `gimnasio_id`.
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
            WHERE 
                gimnasio_id = ? 
        `, [gimnasioId]); // Pasamos el ID del gimnasio como parámetro

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener suscripciones:', error);
        res.status(500).json({ message: 'Error al obtener las suscripciones.' });
    }
};

//Registrar clientes 
// En tu controlador del backend
const registrarCliente = async (req, res) => {
    const gimnasioId = req.user.id;
    const ROL_CLIENTE_ID = 1;

    // 2. Obtén la contraseña del cuerpo de la petición
    const { nombre, correo, telefono, tipo_suscripcion, password } = req.body;

    // --- Validación de contraseña (opcional pero recomendado) ---
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'La contraseña es obligatoria y debe tener al menos 6 caracteres.' });
    }
    // -----------------------------------------------------------

    const tiposValidos = ['mensual', 'trimestral', 'semestral', 'anual'];
    if (!tiposValidos.includes(tipo_suscripcion)) {
        return res.status(400).json({ error: 'Tipo de suscripción no válido' });
    }

    // ... (toda tu lógica para calcular fechas se queda igual)
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

    const formatDate = (date) => date.toISOString().split('T')[0];
    const inicio_suscripcion = formatDate(fechaInicio);
    const vencimiento_suscripcion = formatDate(fechaVencimiento);

    try {
        // 3. Hashea la contraseña antes de guardarla
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 4. Añade la columna 'password' a la consulta INSERT
        const [result] = await db.execute(
            `INSERT INTO clientes 
                (nombre, correo, telefono, tipo_suscripcion, estado_suscripcion, inicio_suscripcion, vencimiento_suscripcion, gimnasio_id, rol_id, password)
             VALUES (?, ?, ?, ?, 'activa', ?, ?, ?, ?, ?)`,
            // 5. Añade la contraseña hasheada al array de valores
            [nombre, correo, telefono, tipo_suscripcion, inicio_suscripcion, vencimiento_suscripcion, gimnasioId, ROL_CLIENTE_ID, hashedPassword]
        );

        res.status(201).json({ mensaje: 'Cliente registrado con éxito', clienteId: result.insertId });
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        res.status(500).json({ error: 'Error al registrar el cliente' });
    }
};

//Enviar datos de cliente
//Enviar datos de cliente y guardar historial
const datosCliente = async (req, res) => {
    // 1. Obtener el ID del usuario desde el token (fuente segura)
    const clienteId = req.user.id;

    // 2. Obtener los datos del cuerpo de la petición
    const {
        edad, genero, altura, peso, cintura, tipo_cuerpo,
        nivel_actividad, objetivo, restricciones_comida,
        enfermedades, imc
    } = req.body;

    // Obtener una conexión del pool para manejar la transacción
    const connection = await db.getConnection();

    try {
        // Iniciar la transacción
        await connection.beginTransaction();

        // TAREA A: Insertar los datos actuales en la tabla de historial
        const historialQuery = `
            INSERT INTO historial_clientes (cliente_id, peso, altura, cintura, imc)
            VALUES (?, ?, ?, ?, ?)
        `;
        const historialValues = [clienteId, peso, altura, cintura, imc];
        await connection.query(historialQuery, historialValues);

        // TAREA B: Actualizar la tabla principal de clientes con toda la información
        const updateQuery = `
            UPDATE clientes SET
                edad = ?, genero = ?, altura = ?, peso = ?, cintura = ?,
                tipo_cuerpo = ?, nivel_actividad = ?, objetivo = ?,
                restricciones_comida = ?, enfermedades = ?, imc = ?
            WHERE id = ?
        `;
        const updateValues = [
            edad, genero, altura, peso, cintura, tipo_cuerpo,
            nivel_actividad, objetivo, JSON.stringify(restricciones_comida),
            JSON.stringify(enfermedades), imc,
            clienteId // Usar el ID seguro del token
        ];
        const [result] = await connection.query(updateQuery, updateValues);

        // Si todo fue exitoso, confirmar los cambios
        await connection.commit();

        if (result.affectedRows === 0) {
            // Este caso es raro si el token es válido, pero es bueno tenerlo
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.status(200).json({ message: 'Perfil actualizado y progreso guardado correctamente' });

    } catch (error) {
        // Si ocurre cualquier error, revertir todos los cambios
        await connection.rollback();
        console.error('Error al actualizar datos del cliente:', error);
        res.status(500).json({ message: 'Error del servidor al guardar los datos' });
    } finally {
        // Siempre liberar la conexión al final, sin importar si hubo éxito o error
        connection.release();
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

//Generarplan con IA\
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
require('dotenv').config();
const generarPlanIA = async (req, res) => {
    const idCliente = req.params.id;
    console.log("Iniciando generación de plan COMPLETO con IA para el cliente:", idCliente);

    try {
        // 1. Obtener datos físicos del cliente (sin cambios)
        const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [idCliente]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        const cliente = rows[0];

        // Se eliminó por completo la llamada al script de Python.

        // 2. ✨ CREAR EL NUEVO "SÚPER PROMPT" PARA RUTINA Y DIETA ✨
        const modeloIA = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const restriccionesStr = JSON.parse(cliente.restricciones_comida).join(', ') || 'Ninguna';
        const enfermedadesStr = JSON.parse(cliente.enfermedades).join(', ') || 'Ninguna';

        const prompt = `
            Actúa como un entrenador personal y nutricionista de élite. Genera un plan integral que incluya tanto una rutina de ejercicios para un día como un plan de alimentación para un día para el siguiente perfil:

            **Datos del Usuario:**
            - Edad: ${cliente.edad} años
            - Género: ${cliente.genero}
            - Peso: ${cliente.peso} kg
            - Altura: ${cliente.altura} cm
            - Objetivo Principal: ${cliente.objetivo}
            - Nivel de Actividad: ${cliente.nivel_actividad}
            - Enfermedades a considerar: ${enfermedadesStr}
            - Restricciones Alimentarias: ${restriccionesStr}

            **Requisitos de Formato y Contenido:**
            1.  **Formato Obligatorio:** La respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional, explicaciones o markdown.
            2.  **Estructura JSON Principal:** El objeto raíz debe tener dos claves: "rutina" y "dieta".
            3.  **Estructura de "dieta":** Debe ser un objeto con claves "desayuno", "almuerzo" y "cena". Cada comida debe ser un objeto con "platillo" (string), "ingredientes" (array de strings) y "preparacion" (string). Los ingredientes deben ser comunes en México.
            4.  **Estructura de "rutina":** Debe ser un objeto con "nombre" (ej: "Día de Empuje - Pecho y Tríceps"), "enfoque" (ej: "Hipertrofia y Fuerza"), y "ejercicios" (un array de objetos). Cada ejercicio debe tener "nombre" (string), "series" (número), "repeticiones" (string, ej: "8-12") y "descanso_seg" (número). Los ejercicios deben ser para un gimnasio estándar.

            El plan completo debe estar alineado con el objetivo principal del usuario.
        `;

        console.log("----- PROMPT QUE SE ENVIARÁ A LA IA -----");
        console.log(prompt);
        console.log("-----------------------------------------");

        // 3. LLAMAR A LA API Y PROCESAR LA RESPUESTA
        // Creamos un objeto de petición más estructurado
        const request = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        // Enviamos el objeto de petición en lugar del texto simple
        const resultIA = await modeloIA.generateContent(request);
        const responseIA = await resultIA.response;

        const MAX_REINTENTOS = 3;
        let planCompleto;

        for (let i = 0; i < MAX_REINTENTOS; i++) {
            try {
                console.log(`Intento de llamada a la IA #${i + 1}`);

                const modeloIA = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const prompt = `... tu prompt ...`;

                const resultIA = await modeloIA.generateContent(prompt);
                const responseIA = await resultIA.response;

                const textoLimpio = responseIA.text().replace(/```json/g, '').replace(/```/g, '').trim();
                // ¡AGREGA ESTA LÍNEA PARA VER LA RESPUESTA!
                console.log("===== TEXTO RECIBIDO DE LA IA =====");
                console.log(textoLimpio);
                console.log("===================================");
                planCompleto = JSON.parse(textoLimpio);

                // Si llegamos aquí, todo salió bien, rompemos el bucle.
                break;

            } catch (error) {
                // Verificamos si es un error de sobrecarga (503)
                if (error.status === 503 && i < MAX_REINTENTOS - 1) {
                    console.warn(`Modelo sobrecargado. Reintentando en ${Math.pow(2, i)} segundos...`);
                    // Esperamos un tiempo antes del siguiente reintento (1s, 2s, 4s...)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                } else {
                    // Si es otro error o el último reintento, lanzamos la excepción para que el catch principal la maneje
                    throw error;
                }
            }
        }

        if (!planCompleto) {
            return res.status(503).json({ error: "El modelo de IA está actualmente sobrecargado. Por favor, inténtalo más tarde." });
        }

        // ENVIAR EL PLAN COMPLETO AL FRONTEND
        res.json({
            ...planCompleto,
            mensaje: "Plan de rutina y dieta generado exitosamente por IA."
        });

    } catch (err) {
        console.error('Error en /generarPlanIA:', err);
        res.status(500).json({ error: 'Error interno del servidor', details: err.message });
    }
};

// No olvides exportar la función si estás en un archivo de controlador
module.exports = {
    // ...tus otras funciones
    generarPlanIA
};
//Endpont para generar plan de rutina y dieta, obtiene datos fisicos
//Y los manda al script de phyton
//Obtiene el resultado y combina los pdfs para descargar
const generarPlan = async (req, res) => {
    const idCliente = req.params.id;

    try {
        const PDFMerger = (await import('pdf-merger-js')).default;
        const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [idCliente]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = rows[0];

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

        const py = spawn('python', ['ML/predecir.py', JSON.stringify(inputData)]);

        let output = '';
        py.stdout.on('data', (data) => output += data.toString());
        py.stderr.on('data', (data) => console.error(`Python error: ${data}`));

        py.on('close', async (code) => {
            if (code !== 0) return res.status(500).json({ error: 'Error en el modelo de ML' });

            const result = JSON.parse(output);
            const rutina = result.rutina;
            const dieta = result.dieta;

            const rutinaPath = path.join(__dirname, '../../ML/recursos/rutinas', `${rutina}.pdf`);
            const dietaPath = path.join(__dirname, '../../ML/recursos/dietas', `${dieta}.pdf`);

            if (!fs.existsSync(rutinaPath) || !fs.existsSync(dietaPath)) {
                return res.status(404).json({ error: 'No se encontraron los PDFs' });
            }

            const merger = new PDFMerger();
            await merger.add(rutinaPath);
            await merger.add(dietaPath);

            const buffer = await merger.saveAsBuffer();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=plan_${cliente.nombre}.pdf`);
            res.send(buffer);
        });

    } catch (err) {
        console.error('Error en /generar-plan:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


const getProgresoCliente = async (req, res) => {
    const clienteId = req.user.id; // Obtiene el ID del cliente logueado

    try {
        const query = `
            SELECT peso, imc, fecha_registro 
            FROM historial_clientes 
            WHERE cliente_id = ? 
            ORDER BY fecha_registro ASC
        `;
        const [historial] = await db.query(query, [clienteId]);
        res.status(200).json(historial);
    } catch (error) {
        console.error('Error al obtener el historial del cliente:', error);
        res.status(500).json({ message: 'Error del servidor.' });
    }
};

const getEstadoActual = async (req, res) => {
    // El ID se obtiene del token, es seguro y no se puede falsificar.
    const clienteId = req.user.id;

    try {
        // Seleccionamos los campos necesarios para la tarjeta de resumen del dashboard.
        const query = `
            SELECT 
                nombre,
                peso,
                imc,
                tipo_suscripcion,
                vencimiento_suscripcion,
                estado_suscripcion
            FROM 
                clientes 
            WHERE 
                id = ?
        `;

        const [rows] = await db.query(query, [clienteId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Perfil de cliente no encontrado.' });
        }

        // Devolvemos el primer (y único) resultado.
        res.status(200).json(rows[0]);

    } catch (error) {
        console.error('Error al obtener el perfil del cliente:', error);
        res.status(500).json({ message: 'Error del servidor.' });
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
    generarPlan,
    getProgresoCliente,
    getEstadoActual,
    generarPlanIA
}