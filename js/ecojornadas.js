document.addEventListener('DOMContentLoaded', () => {

    // Buscamos los botones de las EcoJornadas
    const botonesJornada = document.querySelectorAll('[data-jornada]');

    // Buscamos el selector del formulario
    const selectorJornada = document.getElementById('jornada');

    // Comprobamos que el selector exista
    if (!selectorJornada) {
        return;
    }

    // Recorremos los botones
    botonesJornada.forEach((boton) => {

        boton.addEventListener('click', () => {

            // Obtenemos la jornada que seleccionó la persona
            const jornadaSeleccionada = boton.dataset.jornada;

            // Seleccionamos esa jornada en el formulario
            selectorJornada.value = jornadaSeleccionada;

        });

    });

});
