const bcrypt = require('bcrypt');
const db = require('./db'); // importa tu conexión a la base de datos

async function hashearTabla(tabla) {
    const [usuarios] = await db.query(`SELECT id, password FROM ${tabla}`);

    for (const user of usuarios) {
        const pwd = user.password;

        // Si es texto plano (ejemplo: menos de 20 caracteres), lo hasheamos
        if (pwd && pwd.length < 20) {
            const hash = await bcrypt.hash(pwd, 10);
            await db.query(`UPDATE ${tabla} SET password = ? WHERE id = ?`, [hash, user.id]);
            console.log(`✔️ ${tabla} - Usuario ID ${user.id} actualizado.`);
        }
    }
}

async function main() {
    try {
        console.log('🔐 Iniciando hash de contraseñas...');

        await hashearTabla('superusuarios');
        await hashearTabla('clientes');

        console.log('✅ Contraseñas actualizadas exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al hashear contraseñas:', error);
        process.exit(1);
    }
}

main();