
/* =====================================
   ECOPULSO - BARRAS DE PARTICIPACIÓN
   Y CONFIRMACIÓN DE CANCELACIÓN
===================================== */

document.addEventListener('DOMContentLoaded', () => {

    // =====================================
    // BARRAS DE PROGRESO
    // =====================================

    const barras = document.querySelectorAll(
        '.eco-cupos-barra'
    );

    barras.forEach(barra => {

        const porcentaje = Number(barra.dataset.porcentaje);

        const porcentajeValido = Number.isFinite(porcentaje)
            ? Math.min(100, Math.max(0, porcentaje))
            : 0;

        barra.style.width = `${porcentajeValido}%`;

    });


    // =====================================
    // CONFIRMACIÓN DE CANCELACIÓN
    // =====================================

    const formularios = document.querySelectorAll(
        '.form-cancelar-participacion'
    );

    formularios.forEach(formulario => {

        formulario.addEventListener('submit', (evento) => {

            const confirmar = window.confirm(
                '¿Estás seguro de que deseas cancelar tu participación?\n\n' +
                'Si continúas, tu cupo quedará disponible para otra persona.'
            );

            if (!confirmar) {
                evento.preventDefault();
            }

        });

    });

});
