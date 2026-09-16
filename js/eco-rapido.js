/**
 * Eco Focalizado — controlador de pantalla.
 *
 * Recoge los hallazgos cualitativos que el operador va tocando y se los pasa a
 * QuickReport, que arma el informe. Reutiliza los motores de la app principal:
 * MotilityEngine y TerritoryEngine para la motilidad segmentaria, y el bull's-eye
 * existente cuando hace falta marcar segmentos.
 */
(function () {
    'use strict';

    /** Estado del estudio. Las claves vacías se omiten del informe. */
    const datos = {
        paciente: {}, vi: {}, derechas: {}, mitral: {}, aortica: {},
        tricuspide: {}, extras: {},
    };

    let motility = null;   // MotilityController, sólo si se usa el bull's-eye

    // ── Utilidades ───────────────────────────────────────────────────────────

    const $ = id => document.getElementById(id);

    /** Escribe "vi.tamano" dentro del objeto anidado */
    function setCampo(ruta, valor) {
        const partes = ruta.split('.');
        let obj = datos;
        while (partes.length > 1) obj = obj[partes.shift()];
        obj[partes[0]] = valor;
    }

    function toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 2200);
    }

    // ── Entrada ──────────────────────────────────────────────────────────────

    document.querySelectorAll('.opts').forEach(grupo => {
        const campo = grupo.dataset.campo;
        grupo.querySelectorAll('button.opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const yaEstaba = btn.getAttribute('aria-pressed') === 'true';
                grupo.querySelectorAll('button.opt').forEach(b => b.setAttribute('aria-pressed', 'false'));

                // Volver a tocar la opción activa la deselecciona: el campo queda sin
                // completar y por lo tanto fuera del informe.
                if (yaEstaba) {
                    setCampo(campo, undefined);
                } else {
                    btn.setAttribute('aria-pressed', 'true');
                    setCampo(campo, btn.dataset.val);
                }
                alCambiar(campo);
            });
        });
    });

    const inputs = {
        // Nombre/HC sólo sirve para ubicarse entre pacientes: no va al informe
        p_nombre: 'paciente.nombre', p_peso: 'paciente.peso', p_talla: 'paciente.talla',
        fey: 'vi.fey', trombo_texto: 'extras.trombo_texto',
    };
    Object.entries(inputs).forEach(([id, ruta]) => {
        $(id)?.addEventListener('input', e => {
            setCampo(ruta, e.target.value || undefined);
            if (id === 'fey') mostrarGradoFey(e.target.value);
            regenerar();
        });
    });

    /** Etiqueta del grado junto al campo de FEy, para confirmar lo que se dedujo */
    function mostrarGradoFey(valor) {
        const n = parseFloat(valor);
        const el = $('fey_grado');
        if (!n || isNaN(n)) { el.textContent = ''; return; }
        const [txt, color] =
            n >= 52 ? ['conservada', '#16a34a'] :
            n >= 41 ? ['deterioro leve', '#ca8a04'] :
            n >= 30 ? ['deterioro moderado', '#ea580c'] :
                      ['deterioro severo', '#dc2626'];
        el.textContent = txt;
        el.style.color = color;
    }

    // ── Reacciones a campos que abren o cierran secciones ────────────────────

    function alCambiar(campo) {
        if (campo === 'vi.motilidad') toggleBullseye(datos.vi.motilidad === 'segmentaria');
        if (campo === 'extras.trombo') {
            const visible = datos.extras.trombo === 'si';
            $('trombo_texto').style.display = visible ? '' : 'none';
            if (!visible) { $('trombo_texto').value = ''; datos.extras.trombo_texto = undefined; }
        }
        regenerar();
    }

    /** El bull's-eye se monta una sola vez, la primera vez que hace falta */
    function toggleBullseye(mostrar) {
        const caja = $('bullseye_box');
        caja.classList.toggle('visible', mostrar);
        if (!mostrar) return;

        if (!motility) {
            if (typeof MotilityController === 'undefined' || typeof MotilitySVG === 'undefined') {
                caja.innerHTML = '<p style="font-size:.8rem;color:#b45309;margin:0;">' +
                    'No se pudo cargar el bull\'s-eye. Se puede informar igual eligiendo otra opción de motilidad.</p>';
                return;
            }
            $('motility-svg-container').innerHTML =
                '<svg id="svg-bullseye" xmlns="http://www.w3.org/2000/svg"></svg>';
            motility = new MotilityController();
            new MotilitySVG(motility);
            motility.addListener(() => {
                datos.vi.segmentos = { ...motility.state };
                const w = motility.calculateWMSI();
                $('wmsi_txt').textContent = `WMSI ${w}`;
                regenerar();
            });
            datos.vi.segmentos = { ...motility.state };
            $('wmsi_txt').textContent = `WMSI ${motility.calculateWMSI()}`;
        }
    }

    // ── Salida ───────────────────────────────────────────────────────────────

    let editadoAMano = false;
    $('informe').addEventListener('input', () => { editadoAMano = true; });

    function regenerar() {
        // Si el operador retocó el texto, no se lo pisamos sin avisar
        if (editadoAMano) return;
        $('informe').value = QuickReport.generate(datos);
    }

    $('btn_copiar').addEventListener('click', async () => {
        const txt = $('informe').value;
        if (!txt.trim()) { toast('No hay informe para copiar'); return; }
        try {
            await navigator.clipboard.writeText(txt);
            toast('✅ Informe copiado');
        } catch {
            $('informe').select();
            document.execCommand('copy');
            toast('✅ Informe copiado');
        }
    });

    /**
     * Estado de partida: cada estructura preseleccionada en su opción normal. En sala
     * la mayoría de los hallazgos son normales, así que el operador sólo toca lo que
     * está alterado. La FEy queda vacía: es el único dato que siempre se mide.
     */
    const DEFAULTS = {
        'ritmo':                  'sinusal',
        'vi.tamano':              'normal',
        'vi.espesores':           'normales',
        'vi.motilidad':           'conservada',
        'diastolica':             'normal',
        'ai':                     'normal',
        'derechas.vd_tamano':     'normal',
        'derechas.vd_funcion':    'conservada',
        'derechas.ad':            'normal',
        'derechas.htp':           'baja',
        'mitral.morfologia':      'normal',
        'mitral.insuficiencia':   'no',
        'mitral.estenosis':       'no',
        'aortica.morfologia':     'normal',
        'aortica.insuficiencia':  'no',
        'aortica.estenosis':      'no',
        'tricuspide.insuficiencia': 'no',
        'vci':                    'normal',
        'pericardio':             'libre',
        'extras.pleural':         'no',
        'extras.trombo':          'no',
        'extras.cateter':         'no',
    };

    const FEY_INICIAL = 60;

    /** Vuelve todo al estado normal de partida (arranque y botón Limpiar) */
    function estadoNormal() {
        Object.keys(datos).forEach(k => { datos[k] = undefined; });
        Object.assign(datos, {
            paciente: {}, vi: {}, derechas: {}, mitral: {}, aortica: {}, tricuspide: {}, extras: {},
        });

        document.querySelectorAll('input').forEach(i => { i.value = ''; });
        document.querySelectorAll('.opts').forEach(grupo => {
            const valor = DEFAULTS[grupo.dataset.campo];
            grupo.querySelectorAll('button.opt').forEach(b => {
                b.setAttribute('aria-pressed', b.dataset.val === valor ? 'true' : 'false');
            });
            if (valor !== undefined) setCampo(grupo.dataset.campo, valor);
        });

        // La FEy arranca en 60, el valor normal más frecuente: sólo se cambia si está
        // alterada. Sigue siendo un número editable, no un botón.
        $('fey').value = FEY_INICIAL;
        datos.vi.fey = FEY_INICIAL;
        mostrarGradoFey(FEY_INICIAL);

        $('trombo_texto').style.display = 'none';
        toggleBullseye(false);
        if (motility) motility.reset();


        editadoAMano = false;
        regenerar();
    }

    $('btn_limpiar').addEventListener('click', () => {
        if (!confirm('¿Empezar un estudio nuevo? Todo vuelve a normal.')) return;
        estadoNormal();
        toast('Estudio nuevo');
    });

    // ── Arranque ─────────────────────────────────────────────────────────────

    estadoNormal();
})();
