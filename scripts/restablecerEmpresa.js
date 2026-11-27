
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

const Usuario = require('../models/Usuario');

async function restablecerEmpresa() {
    const rl = readline.createInterface({ input, output });

    try {
        const correo = (await rl.question(
            'Correo de la empresa: '
        )).trim().toLowerCase();

        const nuevaContrasena = await rl.question(
            'Nueva contraseña (mínimo 12 caracteres): '
        );

        if (nuevaContrasena.length < 12) {
            console.log('❌ La contraseña debe tener al menos 12 caracteres.');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI);

        const empresa = await Usuario.findOne({
            correo,
            rol: 'empresa'
        }).select('+contrasenaHash');

        if (!empresa) {
            console.log('❌ No se encontró una empresa con ese correo.');
            return;
        }

        empresa.contrasenaHash = await bcrypt.hash(nuevaContrasena, 12);

        await empresa.save();

        console.log('✅ Contraseña empresarial actualizada correctamente.');

    } catch (error) {
        console.error('Error al restablecer la contraseña:', error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
}

restablecerEmpresa();
