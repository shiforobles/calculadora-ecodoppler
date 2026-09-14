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
        p_nombre: 'paciente.nombre', p_edad: 'paciente.edad', p_peso: 'paciente.peso',
        p_talla: 'paciente.talla', p_fecha: 'paciente.fecha',
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

    $('btn_limpiar').addEventListener('click', () => {
        if (!confirm('¿Empezar un estudio nuevo? Se borra todo lo cargado.')) return;
        document.querySelectorAll('button.opt').forEach(b => b.setAttribute('aria-pressed', 'false'));
        document.querySelectorAll('input').forEach(i => { i.value = ''; });
        Object.keys(datos).forEach(k => {
            datos[k] = (typeof datos[k] === 'object' && datos[k] !== null) ? {} : undefined;
        });
        ['ritmo', 'diastolica', 'ai', 'vci', 'pericardio'].forEach(k => { datos[k] = undefined; });
        $('fey_grado').textContent = '';
        $('trombo_texto').style.display = 'none';
        toggleBullseye(false);
        if (motility) motility.reset();
        editadoAMano = false;
        $('informe').value = '';
        $('p_fecha').value = new Date().toISOString().slice(0, 10);
        datos.paciente.fecha = $('p_fecha').value;
        toast('Estudio nuevo');
    });

    // ── Guardado en la planilla ──────────────────────────────────────────────

    $('btn_guardar').addEventListener('click', async () => {
        if (typeof GoogleSync === 'undefined' || !GoogleSync.isConfigured()) {
            toast('⚙️ Configurá Google Sheets desde el estudio completo');
            return;
        }
        const btn = $('btn_guardar');
        btn.disabled = true;
        try {
            await GoogleSync.send(construirFila());
            toast('✅ Guardado como estudio focalizado');
        } catch (err) {
            toast(`⚠️ Error al guardar: ${err.message}`);
        } finally {
            btn.disabled = false;
        }
    });

    /**
     * Arma la fila con la misma estructura que el estudio completo, para que ambos
     * convivan en la misma planilla. Se llena por NOMBRE de columna y no por posición,
     * así un cambio futuro en HEADERS no desalinea los datos. Lo no medido queda en
     * "-": en un focalizado la mayoría de las columnas numéricas no existen.
     */
    function construirFila() {
        const H = StudyStorage.HEADERS;
        const fila = new Array(H.length).fill('-');
        const poner = (col, val) => {
            const i = H.indexOf(col);
            if (i >= 0 && val !== undefined && val !== null && val !== '') fila[i] = val;
        };

        const p = datos.paciente;
        poner('Fecha', p.fecha || new Date().toISOString().slice(0, 10));
        poner('HC', p.nombre);
        poner('Edad', p.edad);
        poner('Sexo', p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : undefined);
        poner('Peso', p.peso);
        poner('Altura', p.talla);
        if (p.peso && p.talla) poner('SC', Math.sqrt((p.talla * p.peso) / 3600).toFixed(2));
        poner('Ritmo', datos.ritmo);
        poner('FEy', datos.vi.fey);
        poner('Motilidad Global', datos.vi.motilidad);
        poner('Diástole', datos.diastolica);
        poner('IM Grado', datos.mitral.insuficiencia);
        poner('EM Grado', datos.mitral.estenosis);
        poner('IAo Grado', datos.aortica.insuficiencia);
        poner('EAo Grado', datos.aortica.estenosis);
        poner('IT Grado', datos.tricuspide.insuficiencia);
        poner('VD Estado', datos.derechas.vd_tamano);
        poner('AD Estado', datos.derechas.ad);
        poner('Informe', $('informe').value);
        poner('Tipo Estudio', 'Focalizado');

        if (datos.vi.segmentos && typeof MotilityEngine !== 'undefined') {
            poner('Motilidad Detalle', MotilityEngine.describe(datos.vi.segmentos));
        }
        return fila;
    }

    // ── Arranque ─────────────────────────────────────────────────────────────

    $('p_fecha').value = new Date().toISOString().slice(0, 10);
    datos.paciente.fecha = $('p_fecha').value;
    regenerar();
})();
