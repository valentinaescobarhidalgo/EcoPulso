
/* =====================================
   ECOPULSO - CREAR PROYECTO AMBIENTAL
   CARGOS, MAPA Y DIRECCIÓN AUTOMÁTICA
===================================== */

document.addEventListener('DOMContentLoaded', () => {

    // =====================================
    // 1. AGREGAR Y ELIMINAR CARGOS
    // =====================================

    const listaCargos = document.getElementById('listaCargos');
    const botonAgregar = document.getElementById('agregarCargo');

    if (listaCargos && botonAgregar) {

        botonAgregar.addEventListener('click', () => {

            const cantidadCargos = listaCargos.querySelectorAll(
                '.eco-cargo-fila'
            ).length;

            if (cantidadCargos >= 30) {
                alert('Puedes agregar un máximo de 30 cargos.');
                return;
            }

            const plantilla = listaCargos.querySelector(
                '.eco-cargo-fila'
            );

            if (!plantilla) {
                return;
            }

            const nuevoCargo = plantilla.cloneNode(true);

            nuevoCargo.querySelectorAll('input').forEach(input => {
                input.value = '';
            });

            nuevoCargo.querySelectorAll(
                '.eco-eliminar-cargo'
            ).forEach(boton => {
                boton.remove();
            });

            const botonEliminar = document.createElement('button');

            botonEliminar.type = 'button';

            botonEliminar.className =
                'btn btn-outline-danger btn-sm mt-2 eco-eliminar-cargo';

            botonEliminar.innerHTML =
                '<i class="bi bi-trash me-1"></i>Eliminar cargo';

            botonEliminar.addEventListener('click', () => {
                nuevoCargo.remove();
            });

            nuevoCargo.appendChild(botonEliminar);

            listaCargos.appendChild(nuevoCargo);

        });

    }


    // =====================================
    // 2. ELEMENTOS DEL MAPA
    // =====================================

    const botonAbrirMapa = document.getElementById(
        'abrirMapaProyecto'
    );

    const botonCerrarMapa = document.getElementById(
        'cerrarMapaProyecto'
    );

    const panelMapa = document.getElementById(
        'panelMapaProyecto'
    );

    const contenedorMapa = document.getElementById(
        'mapaSeleccionProyecto'
    );

    const botonConfirmar = document.getElementById(
        'confirmarUbicacionProyecto'
    );

    const estadoUbicacion = document.getElementById(
        'estadoUbicacionProyecto'
    );

    const campoLatitud = document.getElementById(
        'latitudProyecto'
    );

    const campoLongitud = document.getElementById(
        'longitudProyecto'
    );

    const campoDireccion = document.getElementById(
        'ubicacion'
    );

    if (
        !botonAbrirMapa ||
        !botonCerrarMapa ||
        !panelMapa ||
        !contenedorMapa ||
        !botonConfirmar ||
        !estadoUbicacion ||
        !campoLatitud ||
        !campoLongitud ||
        !campoDireccion
    ) {
        return;
    }


    // =====================================
    // 3. VARIABLES DEL MAPA
    // =====================================

    let mapa = null;
    let marcador = null;

    let coordenadasSeleccionadas = null;

    // Controlar las consultas de direcciones
    let consultaActual = null;
    let versionSeleccion = 0;
    let versionDireccion = 0;

    // Evitar repetir consultas del mismo lugar
    const cacheDirecciones = new Map();

    const centroInicial = [4.5709, -74.2973];
    const zoomInicial = 6;


    // =====================================
    // 4. MOSTRAR ESTADO
    // =====================================

    function mostrarEstado(mensaje, confirmada = false) {

        estadoUbicacion.textContent = '';

        const icono = document.createElement('i');

        icono.className = confirmada
            ? 'bi bi-check-circle-fill me-2'
            : 'bi bi-geo-alt-fill me-2';

        const texto = document.createElement('span');

        texto.textContent = mensaje;

        estadoUbicacion.append(icono, texto);

        estadoUbicacion.classList.toggle(
            'text-success',
            confirmada
        );

    }


    // =====================================
    // 5. INVALIDAR CONFIRMACIÓN ANTERIOR
    // =====================================

    function invalidarConfirmacion() {

        campoLatitud.value = '';
        campoLongitud.value = '';

    }


    // =====================================
    // 6. SELECCIONAR PUNTO EN EL MAPA
    // =====================================

    function seleccionarPunto(latitud, longitud) {

        // Si hay una búsqueda de dirección activa,
        // cancelarla porque cambió el punto.
        if (consultaActual) {
            consultaActual.abort();
            consultaActual = null;
        }

        versionSeleccion++;

        coordenadasSeleccionadas = [
            latitud,
            longitud
        ];

        invalidarConfirmacion();

        if (!marcador) {

            marcador = L.marker(
                coordenadasSeleccionadas,
                {
                    draggable: true
                }
            ).addTo(mapa);

            marcador.on('dragend', () => {

                const posicion = marcador.getLatLng();

                seleccionarPunto(
                    posicion.lat,
                    posicion.lng
                );

            });

        } else {

            marcador.setLatLng(
                coordenadasSeleccionadas
            );

        }

        botonConfirmar.disabled = false;

        mostrarEstado(
            'Punto seleccionado. Pulsa "Confirmar ubicación".'
        );

    }


    // =====================================
    // 7. INICIALIZAR MAPA
    // =====================================

    function inicializarMapa() {

        if (mapa) {
            return;
        }

        if (typeof L === 'undefined') {

            mostrarEstado(
                'No se pudo cargar el mapa. Verifica tu conexión.'
            );

            return;
        }

        mapa = L.map('mapaSeleccionProyecto').setView(
            centroInicial,
            zoomInicial
        );

        L.tileLayer(
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }
        ).addTo(mapa);

        mapa.on('click', evento => {

            seleccionarPunto(
                evento.latlng.lat,
                evento.latlng.lng
            );

        });

    }


    // =====================================
    // 8. ABRIR MAPA
    // =====================================

    botonAbrirMapa.addEventListener('click', () => {

        panelMapa.hidden = false;

        botonAbrirMapa.setAttribute(
            'aria-expanded',
            'true'
        );

        inicializarMapa();

        if (mapa) {

            requestAnimationFrame(() => {
                mapa.invalidateSize();
            });

        }

    });


    // =====================================
    // 9. CERRAR MAPA
    // =====================================

    function cerrarMapa() {

        panelMapa.hidden = true;

        botonAbrirMapa.setAttribute(
            'aria-expanded',
            'false'
        );

    }

    botonCerrarMapa.addEventListener('click', cerrarMapa);


    // =====================================
    // 10. BUSCAR DIRECCIÓN DEL PUNTO
    // =====================================

    async function buscarDireccion(latitud, longitud, signal) {

        const clave = [
            latitud.toFixed(5),
            longitud.toFixed(5)
        ].join(',');

        if (cacheDirecciones.has(clave)) {
            return cacheDirecciones.get(clave);
        }

        const parametros = new URLSearchParams({
            format: 'jsonv2',
            lat: String(latitud),
            lon: String(longitud),
            zoom: '18',
            addressdetails: '1',
            'accept-language': 'es'
        });

        const url =
            'https://nominatim.openstreetmap.org/reverse?' +
            parametros.toString();

        const respuesta = await fetch(url, {
            method: 'GET',
            signal,
            headers: {
                Accept: 'application/json'
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                'No fue posible consultar la dirección.'
            );
        }

        const datos = await respuesta.json();

        const direccion = typeof datos.display_name === 'string'
            ? datos.display_name.trim()
            : '';

        if (direccion) {
            cacheDirecciones.set(clave, direccion);
        }

        return direccion;

    }


    // =====================================
    // 11. CONFIRMAR UBICACIÓN
    // =====================================

    botonConfirmar.addEventListener('click', async () => {

        if (!coordenadasSeleccionadas) {
            return;
        }

        // Guardar una copia del punto confirmado.
        const [latitud, longitud] =
            coordenadasSeleccionadas;

        const seleccionAlConfirmar = versionSeleccion;
        const direccionAlConfirmar = versionDireccion;

        // Guardar siempre las coordenadas exactas.
        campoLatitud.value = latitud.toFixed(7);
        campoLongitud.value = longitud.toFixed(7);

        botonConfirmar.disabled = true;

        mostrarEstado(
            'Ubicación seleccionada. Buscando dirección...'
        );

        // Cancelar una consulta anterior, si existe.
        if (consultaActual) {
            consultaActual.abort();
        }

        const controlador = new AbortController();

        consultaActual = controlador;

        try {

            const direccion = await buscarDireccion(
                latitud,
                longitud,
                controlador.signal
            );

            // Si la empresa cambió el punto durante
            // la búsqueda, no utilizar un resultado viejo.
            if (seleccionAlConfirmar !== versionSeleccion) {
                return;
            }

            // Tampoco sobrescribir lo que la empresa
            // escribió mientras se buscaba la dirección.
            if (direccionAlConfirmar !== versionDireccion) {

                mostrarEstado(
                    'Ubicación confirmada. Se conservó la dirección que escribiste.',
                    true
                );

                cerrarMapa();
                return;

            }

            if (direccion) {

                // Completar automáticamente el campo.
                campoDireccion.value = direccion;

                mostrarEstado(
                    'Ubicación y dirección confirmadas correctamente.',
                    true
                );

                cerrarMapa();

            } else {

                mostrarEstado(
                    'El punto está confirmado, pero no encontramos una dirección. Escríbela manualmente.'
                );

                cerrarMapa();

                campoDireccion.focus();

            }

        } catch (error) {

            // Una consulta cancelada por mover el marcador
            // no debe mostrar mensajes de error.
            if (error.name === 'AbortError') {
                return;
            }

            console.warn(
                'No fue posible obtener la dirección:',
                error.message
            );

            if (seleccionAlConfirmar !== versionSeleccion) {
                return;
            }

            mostrarEstado(
                'Ubicación confirmada. No fue posible obtener la dirección; puedes escribirla manualmente.'
            );

            cerrarMapa();

            campoDireccion.focus();

        } finally {

            if (consultaActual === controlador) {
                consultaActual = null;
            }

        }

    });


    // =====================================
    // 12. CAMBIOS EN LA DIRECCIÓN ESCRITA
    // =====================================

    campoDireccion.addEventListener('input', () => {

        versionDireccion++;

        // Si la empresa cambia manualmente la dirección,
        // conservar el punto solamente cuando ya estaba
        // confirmado. El texto podría ser una aclaración
        // del lugar seleccionado.
        //
        // Si después necesita mover el marcador, el
        // sistema invalidará las coordenadas anteriores
        // hasta que confirme el nuevo punto.

        if (
            campoLatitud.value &&
            campoLongitud.value
        ) {

            mostrarEstado(
                'Dirección editada. El punto seleccionado en el mapa se conserva.',
                true
            );

        }

    });

});
