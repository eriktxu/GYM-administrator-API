require('dotenv').config();
const db = require('../../config/db');
const express = require("express");
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
        // const historialQuery = `
        //     INSERT INTO historial_clientes (cliente_id, peso, altura, cintura, imc)
        //     VALUES (?, ?, ?, ?, ?)
        // `;
        // const historialValues = [clienteId, peso, altura, cintura, imc];
        // await connection.query(historialQuery, historialValues);

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


const generarPlanIA = async (req, res) => {
    const idCliente = req.params.id;
    console.log(`[1] Iniciando generación de plan COMPLETO con OpenAI para el cliente: ${idCliente}`);

    try {
        // 1. Obtener datos del cliente de la BD
        const [rows] = await db.query('SELECT * FROM clientes WHERE id = ?', [idCliente]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        const cliente = rows[0];

        // 2. Preparar datos y construir el prompt
        const restricciones = cliente.restricciones_comida ? JSON.parse(cliente.restricciones_comida) : [];
        const restriccionesStr = restricciones.join(', ') || 'Ninguna';
        const enfermedades = cliente.enfermedades ? JSON.parse(cliente.enfermedades) : [];
        const enfermedadesStr = enfermedades.join(', ') || 'Ninguna';

        const prompt = `
    Actúa como un entrenador personal y nutricionista de élite. Genera un plan integral para una SEMANA COMPLETA (Lunes a Domingo) que incluya tanto una rutina de ejercicios como un plan de alimentación para el siguiente perfil:

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
    1.  **Formato Obligatorio:** La respuesta DEBE ser únicamente un objeto JSON válido, sin texto adicional.
    2.  **Estructura Principal:** El objeto raíz debe tener dos claves: "dieta_semanal" y "rutina_semanal".
    3.  **Estructura de "dieta_semanal":** Debe ser un ARRAY de 7 objetos. Cada objeto debe representar un día y tener las claves: "dia" (ej: "Lunes"), "desayuno" (objeto con "platillo" e "ingredientes"), "almuerzo" (objeto con "platillo" e "ingredientes") y "cena" (objeto con "platillo" e "ingredientes").
    4.  **Estructura de "rutina_semanal":** Debe ser un ARRAY de 7 objetos. Cada objeto debe representar un día y tener las claves: "dia" (ej: "Lunes"), "nombre_rutina" (ej: "Tren Superior - Empuje"), "enfoque" (ej: "Hipertrofia"), y "ejercicios" (un array de objetos, donde cada uno tiene "nombre", "series", "repeticiones" y "descanso_seg"). Un día puede ser de descanso (ej: "dia": "Domingo", "nombre_rutina": "Descanso Activo").
    5.  **Variedad:** Asegúrate de que haya variedad en los platillos y ejercicios durante la semana para evitar la monotonía.

    El plan completo debe estar alineado con el objetivo principal del usuario.
`;
        
        console.log("[2] Prompt creado. A punto de llamar a la API de OpenAI...");

        // 3. Llamar a la API de OpenAI con el timeout corregido
        const responseIA = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Eres un experto en fitness y nutrición que solo responde con objetos JSON válidos." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        }, { 
            timeout: 30000, // 30 segundos en un objeto de opciones separado
        });
        
        console.log("[3] ¡Respuesta recibida de la API de OpenAI!");

        // 4. Parsear y adaptar la respuesta
        let planCompleto;
        try {
            const textoJSON = responseIA.choices[0].message.content;
            
            console.log("===== RESPUESTA CRUDA DE OPENAI =====");
            console.log(textoJSON);
            console.log("=====================================");

            console.log("[4] Parseando la respuesta JSON...");
            const planRecibido = JSON.parse(textoJSON);

            // ¡ADAPTADOR! Mapeamos la respuesta de la IA a la estructura que el frontend espera.
   planCompleto = {
                rutina: planRecibido.rutina_semanal,
                dieta: planRecibido.dieta_semanal,
            };

        } catch (parseError) {
            console.error("Error al parsear la respuesta de OpenAI:", parseError, "Texto recibido:", responseIA.choices[0]?.message?.content);
            return res.status(500).json({ error: "La respuesta de la IA no tuvo un formato JSON válido." });
        }
        
        // 5. Enviar el plan formateado al frontend
        console.log("[5] ¡Plan completo generado y formateado exitosamente!");
        res.json({
            ...planCompleto,
            mensaje: "Plan de rutina y dieta generado exitosamente con OpenAI (GPT)."
        });

    } catch (err) {
        console.error('Error en /generarPlanIA:', err);
        if (err instanceof OpenAI.APIError) {
            if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
                return res.status(504).json({ error: 'La solicitud a OpenAI tardó demasiado en responder (Timeout).', details: 'Esto puede ser un problema de red o un firewall.' });
            }
            return res.status(err.status || 500).json({ error: 'Error de la API de OpenAI', details: err.message });
        } else {
            return res.status(500).json({ error: 'Error interno del servidor', details: err.message });
        }
    }
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