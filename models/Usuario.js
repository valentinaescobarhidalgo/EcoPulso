
const mongoose = require('mongoose');

// Modelo de usuarios de EcoPulso
const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    contrasenaHash: {
        type: String,
        required: true,
        select: false
    },

   
rol: {
    type: String,
    enum: ['admin', 'empresa', 'ciudadano'],
    required: true
},


    activo: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

/* =====================================
   ECOPULSO - ADMINISTRADOR ÚNICO
===================================== */

// Permitir solamente una cuenta con el rol de administrador
usuarioSchema.index(
    { rol: 1 },
    {
        unique: true,
        partialFilterExpression: {
            rol: 'admin'
        }
    }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
