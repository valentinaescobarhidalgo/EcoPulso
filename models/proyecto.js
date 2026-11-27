
const mongoose = require('mongoose');

// =====================================
// ECOPULSO - CARGOS DE LOS PROYECTOS
// =====================================

const cargoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    cupos: {
        type: Number,
        required: true,
        min: 1
    }
});


// =====================================
// ECOPULSO - MODELO DE PROYECTOS
// =====================================

const proyectoSchema = new mongoose.Schema({

    nombre: {
        type: String,
        required: true,
        trim: true
    },

    empresa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },

    responsable: {
        type: String,
        required: true,
        trim: true
    },


    // =====================================
    // PROBLEMÁTICA AMBIENTAL
    // =====================================

    problematica: {
        type: String,
        enum: [
            'Contaminación del agua',
            'Acumulación de residuos',
            'Desperdicio de agua',
            'Deterioro de zonas verdes',
            'Otras problemáticas ambientales'
        ],
        default: 'Otras problemáticas ambientales',
        trim: true
    },


    // =====================================
    // UBICACIÓN DEL PROYECTO
    // =====================================

    ubicacion: {
        type: String,
        required: true,
        trim: true
    },

    // Coordenadas seleccionadas en Leaflet.
    // Son opcionales para conservar la
    // compatibilidad con proyectos antiguos.

    latitud: {
        type: Number,
        min: -90,
        max: 90,
        default: null
    },

    longitud: {
        type: Number,
        min: -180,
        max: 180,
        default: null
    },


    // =====================================
    // DESCRIPCIÓN DEL PROYECTO
    // =====================================

    descripcion: {
        type: String,
        required: true,
        trim: true
    },


    // =====================================
    // CARGOS Y CUPOS DISPONIBLES
    // =====================================

    cargos: {
        type: [cargoSchema],
        validate: {
            validator: cargos => cargos.length > 0,
            message: 'El proyecto debe tener al menos un cargo.'
        }
    },


    // =====================================
    // ESTADO DEL PROYECTO
    // =====================================

    estado: {
        type: String,
        enum: [
            'pendiente',
            'aprobado',
            'finalizado'
        ],
        default: 'pendiente'
    },

    fechaAprobacion: {
        type: Date,
        default: null
    },

    fechaFinalizacion: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});


// =====================================
// EXPORTAR MODELO
// =====================================

module.exports = mongoose.model(
    'Proyecto',
    proyectoSchema
);
