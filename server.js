const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const bcrypt = require('bcryptjs');

require('dotenv').config();

const Usuario = require('./models/Usuario');
const Proyecto = require('./models/proyecto');
const Participacion = require('./models/Participacion');

// =====================================
// CONFIGURACIÓN GENERAL
// =====================================

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/css', express.static(
    path.join(__dirname, 'css')
));

app.use('/js', express.static(
    path.join(__dirname, 'js')
));

app.use('/images', express.static(
    path.join(__dirname, 'public', 'images')
));

app.use('/leaflet', express.static(
    path.join(__dirname, 'node_modules', 'leaflet', 'dist')
));

app.use('/bootstrap', express.static(
    path.join(__dirname, 'node_modules', 'bootstrap', 'dist')
));

app.use('/bootstrap-icons', express.static(
    path.join(__dirname, 'node_modules', 'bootstrap-icons', 'font')
));

// =====================================
// SESIONES DE USUARIOS
// =====================================

app.use(session({
    name: 'ecopulso.sid',

    secret: process.env.SESSION_SECRET,

    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sesiones'
    }),

    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

// Usuario disponible en todas las vistas

app.use((req, res, next) => {
    res.locals.usuarioActual = req.session.usuario || null;
    next();
});

// =====================================
// CONEXIÓN A MONGODB ATLAS
// =====================================

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Conexión a MongoDB Atlas establecida');
    })
    .catch(error => {
        console.error(
            '❌ Error de conexión a MongoDB Atlas:',
            error
        );
    });

// =====================================
// PROTECCIÓN DE RUTAS
// =====================================

function soloAdministrador(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    if (req.session.usuario.rol !== 'admin') {
        return res.status(403).send(
            'No tienes permiso para acceder a esta sección.'
        );
    }

    next();
}

function soloEmpresa(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    if (req.session.usuario.rol !== 'empresa') {
        return res.status(403).send(
            'No tienes permiso para acceder a esta sección.'
        );
    }

    next();
}

function soloCiudadano(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    if (req.session.usuario.rol !== 'ciudadano') {
        return res.status(403).send(
            'No tienes permiso para acceder a esta sección.'
        );
    }

    next();
}

// =====================================
// PÁGINA PRINCIPAL
// =====================================

app.get('/', (req, res) => {
    return res.render('inicio', {
        titulo: 'Inicio',
        paginaactual: 'inicio'
    });
});

// =====================================
// INICIO DE SESIÓN
// =====================================
/* Inicio de sesión */

app.get('/login', (req, res) => {
    return res.render('login', {
        titulo: 'Iniciar sesión',
        paginaactual: 'login',
        errorLogin: null,
        correoAnterior: ''
    });
});

app.post('/login', async (req, res) => {

    const { correo, contrasena } = req.body;

    // Mostrar el formulario con una alerta cuando haya un error.
    function mostrarError(mensaje, estado = 400) {
        return res.status(estado).render('login', {
            titulo: 'Iniciar sesión',
            paginaactual: 'login',
            errorLogin: mensaje,
            correoAnterior:
                typeof correo === 'string'
                    ? correo.trim().slice(0, 254)
                    : ''
        });
    }

    try {

        // Validar los datos recibidos.
        if (
            typeof correo !== 'string' ||
            typeof contrasena !== 'string' ||
            !correo.trim() ||
            !contrasena
        ) {
            return mostrarError(
                'Debes ingresar tu correo electrónico y contraseña.'
            );
        }

        // Buscar al usuario activo.
        const usuario = await Usuario.findOne({
            correo: correo.trim().toLowerCase(),
            activo: true
        }).select('+contrasenaHash');

        // Verificar la contraseña.
        const contrasenaValida = usuario
            ? await bcrypt.compare(
                contrasena,
                usuario.contrasenaHash
            )
            : false;

        if (!contrasenaValida) {
            return mostrarError(
                'El correo electrónico o la contraseña no son correctos. Revisa tus datos e inténtalo nuevamente.',
                401
            );
        }

        // Crear una nueva sesión segura.
        req.session.regenerate(error => {

            if (error) {
                console.error(
                    'Error al crear la sesión:',
                    error
                );

                return mostrarError(
                    'No fue posible iniciar sesión en este momento. Inténtalo nuevamente.',
                    500
                );
            }

            req.session.usuario = {
                id: usuario._id.toString(),
                rol: usuario.rol,
                nombre: usuario.nombre
            };

            // Guardar la sesión antes de redirigir.
            req.session.save(error => {

                if (error) {
                    console.error(
                        'Error al guardar la sesión:',
                        error
                    );

                    return mostrarError(
                        'No fue posible guardar tu sesión. Inténtalo nuevamente.',
                        500
                    );
                }

                if (usuario.rol === 'admin') {
                    return res.redirect('/admin');
                }

                if (
                    usuario.rol === 'empresa' ||
                    usuario.rol === 'ciudadano'
                ) {
                    return res.redirect('/');
                }

                return res.status(403).send(
                    'Tu cuenta no tiene un rol válido.'
                );

            });

        });

    } catch (error) {

        console.error(
            'Error en el inicio de sesión:',
            error
        );

        return mostrarError(
            'Ocurrió un problema al iniciar sesión. Inténtalo nuevamente.',
            500
        );
    }

});

// =====================================
// CERRAR SESIÓN
// =====================================

app.post('/logout', (req, res) => {
    req.session.destroy(error => {
        if (error) {
            console.error(
                'Error al cerrar sesión:',
                error
            );

            return res.status(500).send(
                'No fue posible cerrar sesión.'
            );
        }

        res.clearCookie('ecopulso.sid');

        return res.redirect('/login');
    });
});

// =====================================
// REGISTRO DE CIUDADANOS
// =====================================

app.get('/registro-ciudadano', (req, res) => {
    return res.render('registro-ciudadano', {
        titulo: 'Registro de ciudadanos',
        paginaactual: 'registro-ciudadano'
    });
});

app.post('/registro-ciudadano', async (req, res) => {
    try {
        const { nombre, correo, contrasena } = req.body;

        if (
            typeof nombre !== 'string' ||
            typeof correo !== 'string' ||
            typeof contrasena !== 'string' ||
            !nombre.trim() ||
            !correo.trim() ||
            contrasena.length < 12
        ) {
            return res.status(400).send(
                'Completa todos los campos y utiliza una contraseña de al menos 12 caracteres.'
            );
        }

        const correoNormalizado = correo.trim().toLowerCase();

        const usuarioExistente = await Usuario.findOne({
            correo: correoNormalizado
        });

        if (usuarioExistente) {
            return res.status(409).send(
                'Este correo electrónico ya está registrado.'
            );
        }

        const contrasenaHash = await bcrypt.hash(
            contrasena,
            12
        );

        await Usuario.create({
            nombre: nombre.trim(),
            correo: correoNormalizado,
            contrasenaHash,
            rol: 'ciudadano',
            activo: true
        });

        return res.redirect('/login');

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).send(
                'Este correo electrónico ya está registrado.'
            );
        }

        console.error(
            'Error al registrar ciudadano:',
            error
        );

        return res.status(500).send(
            'No fue posible crear la cuenta ciudadana.'
        );
    }
});

// =====================================
// REGISTRO DE EMPRESAS
// =====================================

app.get('/registro-empresa', (req, res) => {
    return res.render('registro-empresa', {
        titulo: 'Registro de empresas',
        paginaactual: 'registro-empresa'
    });
});

app.post('/registro-empresa', async (req, res) => {
    try {
        const { nombre, correo, contrasena } = req.body;

        if (
            typeof nombre !== 'string' ||
            typeof correo !== 'string' ||
            typeof contrasena !== 'string' ||
            !nombre.trim() ||
            !correo.trim() ||
            contrasena.length < 12
        ) {
            return res.status(400).send(
                'Completa todos los campos y utiliza una contraseña de al menos 12 caracteres.'
            );
        }

        const correoNormalizado = correo.trim().toLowerCase();

        const usuarioExistente = await Usuario.findOne({
            correo: correoNormalizado
        });

        if (usuarioExistente) {
            return res.status(409).send(
                'Este correo electrónico ya está registrado.'
            );
        }

        const contrasenaHash = await bcrypt.hash(
            contrasena,
            12
        );

        await Usuario.create({
            nombre: nombre.trim(),
            correo: correoNormalizado,
            contrasenaHash,
            rol: 'empresa',
            activo: true
        });

        return res.redirect('/login');

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).send(
                'Este correo electrónico ya está registrado.'
            );
        }

        console.error(
            'Error al registrar empresa:',
            error
        );

        return res.status(500).send(
            'No fue posible crear la cuenta empresarial.'
        );
    }
});

// =====================================
// ADMINISTRADOR - PANEL PRINCIPAL
// =====================================

app.get('/admin', soloAdministrador, async (req, res) => {
    try {
        const proyectos = await Proyecto.find({
            estado: 'pendiente'
        })
            .populate('empresa', 'nombre correo')
            .sort({ createdAt: -1 });

        const proyectosAprobados = await Proyecto.find({
            estado: 'aprobado'
        })
            .populate('empresa', 'nombre correo')
            .sort({ fechaAprobacion: -1 });

        const proyectosFinalizados = await Proyecto.find({
            estado: 'finalizado'
        })
            .populate('empresa', 'nombre correo')
            .sort({ fechaFinalizacion: -1 });

        return res.render('admin', {
            titulo: 'Panel de administración',
            paginaactual: 'admin',

            proyectos,
            proyectosAprobados,
            proyectosFinalizados,

            finalizacionExitosa:
                req.query.finalizacion === 'exitosa'
        });

    } catch (error) {
        console.error(
            'Error al cargar el panel del administrador:',
            error
        );

        return res.status(500).send(
            'No fue posible cargar los proyectos del administrador.'
        );
    }
});

// =====================================
// ADMINISTRADOR - APROBAR PROYECTO
// =====================================

app.post(
    '/admin/proyectos/:id/aprobar',
    soloAdministrador,
    async (req, res) => {
        try {
            const proyectoId = req.params.id;

            if (!mongoose.isValidObjectId(proyectoId)) {
                return res.status(400).send(
                    'El identificador del proyecto no es válido.'
                );
            }

            const proyecto = await Proyecto.findOneAndUpdate(
                {
                    _id: proyectoId,
                    estado: 'pendiente'
                },
                {
                    $set: {
                        estado: 'aprobado',
                        fechaAprobacion: new Date()
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!proyecto) {
                return res.status(404).send(
                    'El proyecto no existe o ya fue revisado.'
                );
            }

            return res.redirect('/admin');

        } catch (error) {
            console.error(
                'Error al aprobar proyecto:',
                error
            );

            return res.status(500).send(
                'No fue posible aprobar el proyecto.'
            );
        }
    }
);

// =====================================
// ADMINISTRADOR - FINALIZAR PROYECTO
// =====================================

app.post(
    '/admin/proyectos/:id/finalizar',
    soloAdministrador,
    async (req, res) => {
        try {
            const proyectoId = req.params.id;

            if (!mongoose.isValidObjectId(proyectoId)) {
                return res.status(400).send(
                    'El identificador del proyecto no es válido.'
                );
            }

            const proyecto = await Proyecto.findOneAndUpdate(
                {
                    _id: proyectoId,
                    estado: 'aprobado'
                },
                {
                    $set: {
                        estado: 'finalizado',
                        fechaFinalizacion: new Date()
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!proyecto) {
                return res.status(404).send(
                    'No se encontró un proyecto aprobado para finalizar.'
                );
            }

            return res.redirect(
                '/admin?finalizacion=exitosa'
            );

        } catch (error) {
            console.error(
                'Error al finalizar proyecto:',
                error
            );

            return res.status(500).send(
                'No fue posible finalizar el proyecto.'
            );
        }
    }
);

// =====================================
// EMPRESA - MIS PROYECTOS
// =====================================

app.get('/empresa', soloEmpresa, async (req, res) => {
    try {
        const empresaId = req.session.usuario.id;

        const proyectos = await Proyecto.find({
            empresa: empresaId
        }).sort({ createdAt: -1 });

        const proyectosIds = proyectos.map(
            proyecto => proyecto._id
        );

        const participaciones = await Participacion.find({
            proyecto: { $in: proyectosIds }
        }).select('proyecto cargo');

        const inscritosPorCargo = {};

        participaciones.forEach(participacion => {
            const clave =
                participacion.proyecto.toString() +
                '_' +
                participacion.cargo.toString();

            inscritosPorCargo[clave] =
                (inscritosPorCargo[clave] || 0) + 1;
        });

        return res.render('mis-proyectos', {
            titulo: 'Mis proyectos',
            paginaactual: 'empresa',
            proyectos,
            inscritosPorCargo
        });

    } catch (error) {
        console.error(
            'Error al cargar los proyectos de la empresa:',
            error
        );

        return res.status(500).send(
            'No fue posible cargar los proyectos de tu empresa.'
        );
    }
});

// =====================================
// EMPRESA - CREAR PROYECTO
// =====================================

app.get(
    '/empresa/crear-proyecto',
    soloEmpresa,
    (req, res) => {
        return res.render('crear-proyecto', {
            titulo: 'Crear proyecto ambiental',
            paginaactual: 'crear-proyecto'
        });
    }
);

// =====================================
// EMPRESA - GUARDAR PROYECTO
// =====================================

app.post(
    '/empresa/proyectos',
    soloEmpresa,
    async (req, res) => {
        try {
            const {
                nombre,
                responsable,
                problematica,
                ubicacion,
                latitud,
                longitud,
                descripcion,
                cargoNombre,
                cargoCupos
            } = req.body;

            if (
                [nombre, responsable, ubicacion, descripcion].some(
                    dato => typeof dato !== 'string' || !dato.trim()
                )
            ) {
                return res.status(400).send(
                    'Debes completar todos los datos del proyecto.'
                );
            }

            // Validar la problemática ambiental seleccionada.
            const problematicasValidas = [
                'Contaminación del agua',
                'Acumulación de residuos',
                'Desperdicio de agua',
                'Deterioro de zonas verdes',
                'Otras problemáticas ambientales'
            ];

            if (
                typeof problematica !== 'string' ||
                !problematicasValidas.includes(problematica)
            ) {
                return res.status(400).send(
                    'Selecciona una problemática ambiental válida.'
                );
            }

            // La ubicación puede conservarse solo como texto.
            // Si hay coordenadas, ambas deben ser válidas.
            const tieneLatitud =
                typeof latitud === 'string' && latitud.trim() !== '';

            const tieneLongitud =
                typeof longitud === 'string' && longitud.trim() !== '';

            if (tieneLatitud !== tieneLongitud) {
                return res.status(400).send(
                    'Confirma nuevamente la ubicación en el mapa.'
                );
            }

            let latitudGuardada = null;
            let longitudGuardada = null;

            if (tieneLatitud && tieneLongitud) {
                const formatoCoordenada = /^-?\d+(?:\.\d+)?$/;

                if (
                    !formatoCoordenada.test(latitud.trim()) ||
                    !formatoCoordenada.test(longitud.trim())
                ) {
                    return res.status(400).send(
                        'Las coordenadas del proyecto no son válidas.'
                    );
                }

                latitudGuardada = Number(latitud);
                longitudGuardada = Number(longitud);

                if (
                    !Number.isFinite(latitudGuardada) ||
                    !Number.isFinite(longitudGuardada) ||
                    latitudGuardada < -90 ||
                    latitudGuardada > 90 ||
                    longitudGuardada < -180 ||
                    longitudGuardada > 180
                ) {
                    return res.status(400).send(
                        'Las coordenadas están fuera del rango permitido.'
                    );
                }
            } else if (
                (latitud !== undefined && typeof latitud !== 'string') ||
                (longitud !== undefined && typeof longitud !== 'string')
            ) {
                return res.status(400).send(
                    'Las coordenadas del proyecto no son válidas.'
                );
            }

            // Validación de cargos y cupos.
            const nombres = Array.isArray(cargoNombre)
                ? cargoNombre
                : [cargoNombre];

            const cupos = Array.isArray(cargoCupos)
                ? cargoCupos
                : [cargoCupos];

            if (
                nombres.length === 0 ||
                nombres.length !== cupos.length ||
                nombres.length > 30 ||
                nombres.some((cargo, i) =>
                    typeof cargo !== 'string' ||
                    !cargo.trim() ||
                    !/^[1-9]\d*$/.test(String(cupos[i])) ||
                    !Number.isSafeInteger(Number(cupos[i]))
                )
            ) {
                return res.status(400).send(
                    'Revisa los cargos y sus cupos disponibles.'
                );
            }

            const cargos = nombres.map((cargo, i) => ({
                nombre: cargo.trim(),
                cupos: Number(cupos[i])
            }));

            // Guardar proyecto con problemática y coordenadas.
            const nuevoProyecto = new Proyecto({
                nombre: nombre.trim(),
                empresa: req.session.usuario.id,
                responsable: responsable.trim(),
                problematica,
                ubicacion: ubicacion.trim(),
                latitud: latitudGuardada,
                longitud: longitudGuardada,
                descripcion: descripcion.trim(),
                cargos,
                estado: 'pendiente'
            });

            await nuevoProyecto.save();

            return res.redirect('/empresa?proyectoEnviado=1');

        } catch (error) {
            console.error(
                'Error al guardar proyecto:',
                error
            );

            if (error.name === 'ValidationError') {
                return res.status(400).send(
                    'Revisa los datos del proyecto e inténtalo nuevamente.'
                );
            }

            return res.status(500).send(
                'No fue posible guardar el proyecto ambiental.'
            );
        }
    }
);

// =====================================
// CIUDADANO - MIS PARTICIPACIONES
// =====================================

app.get(
    '/ciudadano',
    soloCiudadano,
    async (req, res) => {
        try {
            const ciudadanoId = req.session.usuario.id;

            const participaciones = await Participacion.find({
                ciudadano: ciudadanoId
            })
                .populate({
                    path: 'proyecto',
                    populate: {
                        path: 'empresa',
                        select: 'nombre'
                    }
                })
                .sort({ fechaInscripcion: -1 });

            return res.render('mis-participaciones', {
                titulo: 'Mis participaciones',
                paginaactual: 'ciudadano',
                participaciones
            });

        } catch (error) {
            console.error(
                'Error al cargar participaciones:',
                error
            );

            return res.status(500).send(
                'No fue posible cargar tus participaciones.'
            );
        }
    }
);

// =====================================
// PROYECTOS AMBIENTALES APROBADOS
// =====================================

app.get('/proyectos', async (req, res) => {
    try {
        const proyectos = await Proyecto.find({
            estado: 'aprobado'
        })
            .populate('empresa', 'nombre')
            .sort({ fechaAprobacion: -1 });

        return res.render('proyectos', {
            titulo: 'Proyectos ambientales',
            paginaactual: 'proyectos',
            proyectos
        });

    } catch (error) {
        console.error(
            'Error al cargar proyectos:',
            error
        );

        return res.status(500).send(
            'No fue posible cargar los proyectos ambientales.'
        );
    }
});

// =====================================
// CIUDADANO - INSCRIBIRSE EN UN CARGO
// =====================================

app.post(
    '/proyectos/:id/inscribirse',
    soloCiudadano,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { cargoId } = req.body;

            if (
                !mongoose.isValidObjectId(id) ||
                !mongoose.isValidObjectId(cargoId)
            ) {
                return res.status(400).send(
                    'Los datos de inscripción no son válidos.'
                );
            }

            const proyecto = await Proyecto.findOne({
                _id: id,
                estado: 'aprobado'
            });

            if (!proyecto) {
                return res.status(404).send(
                    'El proyecto no está disponible.'
                );
            }

            const cargo = proyecto.cargos.id(cargoId);

            if (!cargo) {
                return res.status(404).send(
                    'El cargo seleccionado no existe.'
                );
            }

            const ciudadanoId = req.session.usuario.id;

            const inscripcionExistente = await Participacion.findOne({
                ciudadano: ciudadanoId,
                proyecto: proyecto._id,
                cargo: cargo._id
            });

            if (inscripcionExistente) {
                return res.status(409).send(
                    'Ya estás inscrito en este cargo.'
                );
            }

            const inscritos = await Participacion.countDocuments({
                proyecto: proyecto._id,
                cargo: cargo._id
            });

            if (inscritos >= cargo.cupos) {
                return res.status(409).send(
                    'Lo sentimos, este cargo ya no tiene cupos disponibles.'
                );
            }

            await Participacion.create({
                ciudadano: ciudadanoId,
                proyecto: proyecto._id,
                cargo: cargo._id
            });

            return res.redirect(
                '/ecojornadas?proyecto=' +
                encodeURIComponent(proyecto._id.toString()) +
                '&inscripcion=exitosa'
            );

        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).send(
                    'Ya estás inscrito en este cargo.'
                );
            }

            console.error(
                'Error al registrar participación:',
                error
            );

            return res.status(500).send(
                'No fue posible registrar tu participación.'
            );
        }
    }
);

// =====================================
// CIUDADANO - CANCELAR PARTICIPACIÓN
// =====================================

app.post(
    '/proyectos/:id/cancelar-participacion',
    soloCiudadano,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { cargoId } = req.body;

            if (
                !mongoose.isValidObjectId(id) ||
                !mongoose.isValidObjectId(cargoId)
            ) {
                return res.status(400).send(
                    'Los datos de la participación no son válidos.'
                );
            }

            const ciudadanoId = req.session.usuario.id;

            const participacion =
                await Participacion.findOneAndDelete({
                    ciudadano: ciudadanoId,
                    proyecto: id,
                    cargo: cargoId
                });

            if (!participacion) {
                return res.status(404).send(
                    'No encontramos una participación tuya en este cargo.'
                );
            }

            return res.redirect(
                '/ecojornadas?proyecto=' +
                encodeURIComponent(id) +
                '&cancelacion=exitosa'
            );

        } catch (error) {
            console.error(
                'Error al cancelar participación:',
                error
            );

            return res.status(500).send(
                'No fue posible cancelar la participación.'
            );
        }
    }
);

// =====================================
// ECOMAPA
// =====================================

app.get('/ecomapa', async (req, res) => {
    try {
        const proyectos = await Proyecto.find({
            estado: 'aprobado'
        })
            .populate('empresa', 'nombre')
            .sort({ fechaAprobacion: -1 });

        return res.render('ecomapa', {
            titulo: 'EcoMapa',
            paginaactual: 'ecomapa',
            proyectos
        });

    } catch (error) {
        console.error(
            'Error al cargar EcoMapa:',
            error
        );

        return res.status(500).send(
            'No fue posible cargar EcoMapa.'
        );
    }
});

// =====================================
// ECOJORNADAS
// =====================================

app.get('/ecojornadas', async (req, res) => {
    try {
        const proyectos = await Proyecto.find({
            estado: 'aprobado'
        })
            .populate('empresa', 'nombre')
            .sort({ fechaAprobacion: -1 });

        const proyectosIds = proyectos.map(
            proyecto => proyecto._id
        );

        const participaciones = await Participacion.find({
            proyecto: { $in: proyectosIds }
        }).select('ciudadano proyecto cargo');

        const inscritosPorCargo = {};
        const misInscripciones = new Set();

        const usuario = req.session.usuario;

        participaciones.forEach(participacion => {
            const clave =
                participacion.proyecto.toString() +
                '_' +
                participacion.cargo.toString();

            inscritosPorCargo[clave] =
                (inscritosPorCargo[clave] || 0) + 1;

            if (
                usuario &&
                usuario.rol === 'ciudadano' &&
                participacion.ciudadano.toString() === usuario.id
            ) {
                misInscripciones.add(clave);
            }
        });

        const proyectoId = req.query.proyecto;

        const proyectoSeleccionado = proyectoId
            ? proyectos.find(
                proyecto =>
                    proyecto._id.toString() === proyectoId
            )
            : null;

        return res.render('ecojornadas', {
            titulo: 'EcoJornadas',
            paginaactual: 'ecojornadas',

            inscripcionExitosa:
                req.query.inscripcion === 'exitosa',

            cancelacionExitosa:
                req.query.cancelacion === 'exitosa',

            proyectos,
            proyectoSeleccionado,
            inscritosPorCargo,
            misInscripciones
        });

    } catch (error) {
        console.error(
            'Error al cargar EcoJornadas:',
            error
        );

        return res.status(500).send(
            'No fue posible cargar los proyectos ambientales.'
        );
    }
});

// =====================================
// NUESTRO PROPÓSITO
// =====================================

app.get('/proposito', (req, res) => {
    return res.render('proposito', {
        titulo: 'Nuestro propósito',
        paginaactual: 'proposito'
    });
});

// =====================================
// INICIAR SERVIDOR
// =====================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('🌿 EcoPulso');
    console.log(`🚀 Servidor funcionando en el puerto ${PORT}`);
});
