
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Usuario = require('../models/Usuario');

async function crearAdministrador() {
    try {
        // Obtener los datos del administrador
        const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
        const clave = process.env.ADMIN_CLAVE;

        if (!correo || !clave || clave.length < 12) {
            throw new Error(
                'Debes proporcionar un correo y una contraseña de al menos 12 caracteres.'
            );
        }

        // Conectar con MongoDB Atlas
        await mongoose.connect(process.env.MONGODB_URI);

        // Comprobar que se hayan creado los índices
        await Usuario.init();

        // Impedir la creación de un segundo administrador
        const administradorExistente = await Usuario.findOne({
            rol: 'admin'
        });

        if (administradorExistente) {
            console.log('Ya existe un administrador en EcoPulso.');
            return;
        }

        // Proteger la contraseña
        const contrasenaHash = await bcrypt.hash(clave, 12);

        // Crear la cuenta del administrador
        await Usuario.create({
            nombre: 'Administrador EcoPulso',
            correo: correo,
            contrasenaHash: contrasenaHash,
            rol: 'admin',
            activo: true
        });

        console.log('Administrador creado correctamente.');

    } catch (error) {
        console.error('Error al crear el administrador:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

crearAdministrador();
