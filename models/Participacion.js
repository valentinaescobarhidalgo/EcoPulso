
const mongoose = require('mongoose');

const participacionSchema = new mongoose.Schema({

    ciudadano: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },

    proyecto: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proyecto',
        required: true
    },

    cargo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    fechaInscripcion: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// Evitar que un ciudadano se inscriba dos veces
// en el mismo proyecto y cargo.
participacionSchema.index(
    { ciudadano: 1, proyecto: 1, cargo: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    'Participacion',
    participacionSchema
);
