
/* =====================================
   ECOPULSO - MAPA INTERACTIVO

   PROYECTOS AMBIENTALES APROBADOS
   UBICACIONES EXACTAS
   COLORES POR PROBLEMÁTICA
===================================== */

document.addEventListener('DOMContentLoaded', async () => {

    // =====================================
    // 1. COMPROBAR ELEMENTOS DEL MAPA
    // =====================================

    const contenedorMapa = document.getElementById(
        'mapaAmbiental'
    );

    if (!contenedorMapa || typeof L === 'undefined') {
        return;
    }


    // =====================================
    // 2. CREAR EL MAPA
    // =====================================

    const mapa = L.map('mapaAmbiental').setView(
        [4.5709, -74.2973],
        6
    );

    L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }
    ).addTo(mapa);


    // =====================================
    // 3. OBTENER PROYECTOS APROBADOS
    // =====================================

    const elementos = document.querySelectorAll(
        '#datosProyectos .dato-proyecto'
    );

    const proyectos = Array.from(elementos).map(elemento => ({

        id: elemento.dataset.id,

        nombre: elemento.dataset.nombre,

        ubicacion: elemento.dataset.ubicacion,

        descripcion: elemento.dataset.descripcion,

        empresa: elemento.dataset.empresa,

        responsable: elemento.dataset.responsable,

        problematica: elemento.dataset.problematica,

        latitud: elemento.dataset.latitud,

        longitud: elemento.dataset.longitud

    }));


    // =====================================
    // 4. VARIABLES AUXILIARES
    // =====================================

    // Posiciones válidas para ajustar el mapa
    const posiciones = [];

    // Reutilizar resultados de una misma ubicación
    const ubicacionesProcesadas = new Map();

    // Evitar solicitudes demasiado frecuentes
    // al servicio público de geocodificación.
    const esperar = milisegundos => {
        return new Promise(resolve => {
            setTimeout(resolve, milisegundos);
        });
    };


    // =====================================
    // 5. VALIDAR COORDENADAS
    // =====================================

    function coordenadasValidas(latitud, longitud) {

        return (
            Number.isFinite(latitud) &&
            Number.isFinite(longitud) &&
            latitud >= -90 &&
            latitud <= 90 &&
            longitud >= -180 &&
            longitud <= 180
        );

    }


    // =====================================
    // 6. OBTENER COORDENADAS EXACTAS
    // =====================================

    function obtenerCoordenadasGuardadas(proyecto) {

        // Evitar interpretar valores vacíos como cero.
        if (
            proyecto.latitud === undefined ||
            proyecto.longitud === undefined ||
            proyecto.latitud === null ||
            proyecto.longitud === null ||
            String(proyecto.latitud).trim() === '' ||
            String(proyecto.longitud).trim() === ''
        ) {
            return null;
        }

        const latitud = Number(proyecto.latitud);
        const longitud = Number(proyecto.longitud);

        if (!coordenadasValidas(latitud, longitud)) {
            return null;
        }

        return [latitud, longitud];

    }


    // =====================================
    // 7. BUSCAR COORDENADAS POR DIRECCIÓN
    //    COMPATIBILIDAD CON PROYECTOS ANTIGUOS
    // =====================================

    async function buscarCoordenadas(ubicacion) {

        const clave = ubicacion.trim().toLowerCase();

        if (!clave) {
            return null;
        }

        // Revisar resultados de esta sesión
        if (ubicacionesProcesadas.has(clave)) {
            return ubicacionesProcesadas.get(clave);
        }

        const claveCache = 'ecopulso_geo_' + clave;

        // =====================================
        // REVISAR CACHÉ DEL NAVEGADOR
        // =====================================

        try {

            const guardado = localStorage.getItem(claveCache);

            if (guardado) {

                const datos = JSON.parse(guardado);

                let informacionGuardada = null;

                // Compatibilidad con caché antigua
                if (Array.isArray(datos)) {

                    informacionGuardada = {
                        coordenadas: datos,
                        nombreEncontrado: ''
                    };

                } else if (
                    datos &&
                    Array.isArray(datos.coordenadas)
                ) {

                    informacionGuardada = datos;

                }

                if (
                    informacionGuardada &&
                    informacionGuardada.coordenadas.length === 2
                ) {

                    const latitud = Number(
                        informacionGuardada.coordenadas[0]
                    );

                    const longitud = Number(
                        informacionGuardada.coordenadas[1]
                    );

                    if (coordenadasValidas(latitud, longitud)) {

                        const informacionValida = {
                            coordenadas: [latitud, longitud],
                            nombreEncontrado:
                                informacionGuardada.nombreEncontrado || ''
                        };

                        ubicacionesProcesadas.set(
                            clave,
                            informacionValida
                        );

                        return informacionValida;

                    }

                }

            }

        } catch (error) {

            console.warn(
                'No se pudo consultar la caché de ubicaciones:',
                error
            );

        }


        // =====================================
        // CONSULTAR OPENSTREETMAP
        // =====================================

        const parametros = new URLSearchParams({

            q: ubicacion,

            format: 'json',

            limit: '1',

            countrycodes: 'co',

            addressdetails: '1',

            'accept-language': 'es'

        });

        const url =
            'https://nominatim.openstreetmap.org/search?' +
            parametros.toString();

        const respuesta = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!respuesta.ok) {

            throw new Error(
                'Error al buscar la ubicación: ' + ubicacion
            );

        }

        const resultados = await respuesta.json();

        const lugarEncontrado = resultados[0];

        if (!lugarEncontrado) {

            ubicacionesProcesadas.set(clave, null);

            return null;

        }

        const latitud = Number(lugarEncontrado.lat);
        const longitud = Number(lugarEncontrado.lon);

        if (!coordenadasValidas(latitud, longitud)) {

            ubicacionesProcesadas.set(clave, null);

            return null;

        }

        const informacion = {

            coordenadas: [latitud, longitud],

            nombreEncontrado:
                lugarEncontrado.display_name || ''

        };


        // =====================================
        // GUARDAR RESULTADO EN CACHÉ
        // =====================================

        try {

            localStorage.setItem(
                claveCache,
                JSON.stringify(informacion)
            );

        } catch (error) {

            console.warn(
                'No se pudo guardar la caché de ubicaciones:',
                error
            );

        }

        ubicacionesProcesadas.set(clave, informacion);

        return informacion;

    }


    // =====================================
    // 8. IDENTIFICAR COLOR POR PROBLEMÁTICA
    // =====================================

    function obtenerClaseProyecto(problematica) {

        switch (problematica) {

            case 'Contaminación del agua':
                return 'eco-marcador-agua';

            case 'Acumulación de residuos':
                return 'eco-marcador-residuos';

            case 'Desperdicio de agua':
                return 'eco-marcador-desperdicio';

            case 'Deterioro de zonas verdes':
                return 'eco-marcador-verdes';

            case 'Otras problemáticas ambientales':
                return 'eco-marcador-otro';

            default:

                // Los proyectos antiguos no tienen
                // una problemática registrada.
                return 'eco-marcador-otro';

        }

    }


    // =====================================
    // 9. NOMBRE DE LA PROBLEMÁTICA
    // =====================================

    function obtenerNombreProblematica(problematica) {

        const problematicasValidas = [

            'Contaminación del agua',

            'Acumulación de residuos',

            'Desperdicio de agua',

            'Deterioro de zonas verdes',

            'Otras problemáticas ambientales'

        ];

        if (problematicasValidas.includes(problematica)) {
            return problematica;
        }

        return 'Otras problemáticas ambientales';

    }


    // =====================================
    // 10. CREAR CONTENIDO DE LA VENTANA
    // =====================================

    function crearContenidoVentana(
        proyecto,
        informacion
    ) {

        // Crear elementos HTML de forma segura.
        const contenido = document.createElement('div');

        // =====================================
        // NOMBRE DEL PROYECTO
        // =====================================

        const titulo = document.createElement('strong');

        titulo.textContent =
            '🌿 ' + (proyecto.nombre || 'Proyecto ambiental');

        contenido.appendChild(titulo);


        // =====================================
        // PROBLEMÁTICA AMBIENTAL
        // =====================================

        const problematica = document.createElement('p');

        problematica.textContent =
            '🌎 Problemática: ' +
            obtenerNombreProblematica(proyecto.problematica);

        contenido.appendChild(problematica);


        // =====================================
        // UBICACIÓN
        // =====================================

        const lugar = document.createElement('p');

        lugar.textContent =
            '📍 Ubicación: ' +
            (proyecto.ubicacion || 'No disponible');

        contenido.appendChild(lugar);


        // =====================================
        // DESCRIPCIÓN
        // =====================================

        const descripcion = document.createElement('p');

        descripcion.textContent =
            proyecto.descripcion || '';

        contenido.appendChild(descripcion);


        // =====================================
        // EMPRESA
        // =====================================

        const empresa = document.createElement('p');

        empresa.textContent =
            '🏢 Empresa: ' +
            (proyecto.empresa || 'No disponible');

        contenido.appendChild(empresa);


        // =====================================
        // RESPONSABLE
        // =====================================

        if (proyecto.responsable) {

            const responsable = document.createElement('p');

            responsable.textContent =
                '👤 Responsable: ' + proyecto.responsable;

            contenido.appendChild(responsable);

        }


        // =====================================
        // LUGAR ENCONTRADO POR GEOCODIFICACIÓN
        // SOLO PARA PROYECTOS ANTIGUOS
        // =====================================

        if (
            informacion &&
            informacion.nombreEncontrado
        ) {

            const lugarIdentificado =
                document.createElement('p');

            lugarIdentificado.textContent =
                '🗺️ Lugar encontrado: ' +
                informacion.nombreEncontrado;

            contenido.appendChild(lugarIdentificado);

        }


        // =====================================
        // ENLACE A ECOJORNADAS
        // =====================================

        if (proyecto.id) {

            const enlaceParticipar =
                document.createElement('a');

            enlaceParticipar.href =
                '/ecojornadas?proyecto=' +
                encodeURIComponent(proyecto.id);

            enlaceParticipar.textContent =
                'Ver proyecto y participar';

            enlaceParticipar.className =
                'btn btn-success btn-sm mt-2';

            contenido.appendChild(enlaceParticipar);

        }

        return contenido;

    }


    // =====================================
    // 11. CREAR MARCADOR DE PROYECTO
    // =====================================

    function crearMarcador(proyecto, coordenadas, informacion) {

        const claseProyecto = obtenerClaseProyecto(
            proyecto.problematica
        );

        const iconoProyecto = L.divIcon({

            className:
                'eco-marcador ' + claseProyecto,

            iconSize: [24, 24],

            iconAnchor: [12, 12],

            popupAnchor: [0, -12]

        });

        const contenido = crearContenidoVentana(
            proyecto,
            informacion
        );

        L.marker(coordenadas, {
            icon: iconoProyecto
        })
            .addTo(mapa)
            .bindPopup(contenido)
            .bindTooltip(
                proyecto.nombre || 'Proyecto ambiental',
                {
                    direction: 'top',
                    offset: [0, -14]
                }
            );

        posiciones.push(coordenadas);

    }


    // =====================================
    // 12. PROCESAR PROYECTOS
    // =====================================

    let ultimaConsulta = 0;

    for (const proyecto of proyectos) {

        try {

            // =====================================
            // A. BUSCAR COORDENADAS GUARDADAS
            // =====================================

            const coordenadasExactas =
                obtenerCoordenadasGuardadas(proyecto);

            if (coordenadasExactas) {

                // Este proyecto ya tiene coordenadas
                // seleccionadas por la empresa.
                // No necesita consultar Nominatim.

                crearMarcador(
                    proyecto,
                    coordenadasExactas,
                    null
                );

                continue;

            }


            // =====================================
            // B. PROYECTOS ANTIGUOS SIN COORDENADAS
            // =====================================

            const ubicacion =
                (proyecto.ubicacion || '').trim();

            if (!ubicacion) {

                console.warn(
                    'El proyecto no tiene una ubicación:',
                    proyecto.nombre
                );

                continue;

            }

            const clave = ubicacion.toLowerCase();

            let informacion = null;

            if (ubicacionesProcesadas.has(clave)) {

                informacion =
                    ubicacionesProcesadas.get(clave);

            } else {

                // Limitar consultas nuevas al servicio
                // público de geocodificación.
                const tiempoActual = Date.now();

                const tiempoEspera = Math.max(
                    0,
                    1200 - (tiempoActual - ultimaConsulta)
                );

                if (tiempoEspera > 0) {
                    await esperar(tiempoEspera);
                }

                // Registrar inicio de consulta.
                // La caché evita solicitudes repetidas.
                ultimaConsulta = Date.now();

                informacion = await buscarCoordenadas(
                    ubicacion
                );

            }

            if (
                !informacion ||
                !Array.isArray(informacion.coordenadas)
            ) {

                console.warn(
                    'No se encontró la ubicación del proyecto:',
                    ubicacion
                );

                continue;

            }

            crearMarcador(
                proyecto,
                informacion.coordenadas,
                informacion
            );

        } catch (error) {

            console.error(
                'No se pudo ubicar el proyecto ' +
                proyecto.nombre + ':',
                error
            );

        }

    }


    // =====================================
    // 13. AJUSTAR MAPA A LOS PROYECTOS
    // =====================================

    if (posiciones.length > 0) {

        mapa.fitBounds(posiciones, {

            padding: [50, 50],

            maxZoom: 14

        });

    }

});
