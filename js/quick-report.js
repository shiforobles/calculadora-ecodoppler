/**
 * QuickReport — Informe narrativo para evaluación focalizada (eco en cama).
 *
 * En sala la evaluación es cualitativa: el operador ve y califica, no mide. La única
 * excepción es la FEy, que sí se mide siempre y por eso lleva su número.
 *
 * Por qué no reutiliza _buildNarrativeConclusion de ui-controller: aquel motor deriva
 * todo de valores numéricos (la geometría sale de masa y RWT, la diastólica de E/A y
 * e', el tamaño auricular del LAVI) y además lee directo del DOM de index.html. Sin
 * esos números no puede expresar "moderadamente dilatado": diría "conservado". Este
 * módulo comparte el ESTILO de redacción pero opera sobre grados cualitativos.
 *
 * Función pura: recibe un objeto de datos y devuelve texto. Sin DOM, determinístico.
 *
 * REGLA CENTRAL: nunca inventa un número. Lo que no se midió se describe en palabras,
 * y lo que no se completó se omite.
 */

const QuickReport = {

    ENCABEZADO: 'ECOCARDIOGRAMA DOPPLER CARDÍACO',
    SUBTITULO:  'Estudio realizado en cama del paciente.',

    // ── Diccionarios de grados ───────────────────────────────────────────────

    DILATACION: {
        normal:   null,                    // se redacta aparte según la estructura
        leve:     'levemente dilatad',
        moderada: 'moderadamente dilatad',
        severa:   'severamente dilatad',
    },

    HIPERTROFIA: {
        normales: null,
        leve:     'hipertrofia parietal leve',
        moderada: 'hipertrofia parietal moderada',
        severa:   'hipertrofia parietal severa',
    },

    /** Grados de insuficiencia, en el orden en que se muestran */
    REGURGITACION: {
        no:               null,
        trace:            'trivial',
        leve:             'leve',
        'leve-moderada':  'leve a moderada',
        moderada:         'moderada',
        'moderada-severa': 'moderada a severa',
        severa:           'severa',
        masiva:           'masiva/torrencial',
    },

    ESTENOSIS: {
        no:           null,
        leve:         'leve',
        moderada:     'moderada',
        severa:       'severa',
        'muy-severa': 'muy severa',
    },

    /** Una regurgitación trivial no se considera hallazgo significativo */
    _esSignificativa(grado) {
        return grado && grado !== 'no' && grado !== 'trace';
    },

    // ── API ──────────────────────────────────────────────────────────────────

    /**
     * @param {Object} d datos del estudio focalizado
     * @returns {string} informe narrativo completo
     */
    generate(d = {}) {
        const parrafos = [
            this._encabezado(d),
            this._ventriculoIzquierdo(d),
            this._hemodinamica(d),
            this._valvulas(d),
            this._derechas(d),
            this._pericardio(d),
            this._extras(d),
        ].filter(Boolean);

        return parrafos.join('\n\n');
    },

    // ── Encabezado y datos del paciente ──────────────────────────────────────

    _encabezado(d) {
        const p = d.paciente || {};
        // Encabezado fijo, tal cual se pidió: sin línea de filiación y sin rótulos
        // de tipo de estudio. Sólo se agrega la antropometría si está cargada.
        let h = `${this.ENCABEZADO}\n${'='.repeat(80)}\n${this.SUBTITULO}\n`;

        // SC por Mosteller
        if (p.peso && p.talla) {
            const sc = Math.sqrt((p.talla * p.peso) / 3600);
            h += `Peso ${p.peso} kg | Talla ${p.talla} cm | SC ${sc.toFixed(2)} m²\n`;
        }
        return h.trimEnd();
    },

    // ── P1: Ventrículo izquierdo ─────────────────────────────────────────────

    _ventriculoIzquierdo(d) {
        const vi = d.vi || {};
        const partes = [];

        // Ritmo: sólo se enuncia si no es sinusal, donde aporta información
        let apertura = '';
        if (d.ritmo === 'fa')        apertura = 'En fibrilación auricular, e';
        else if (d.ritmo === 'otro') apertura = 'E';
        else                         apertura = 'E';

        // Tamaño. Si no se calificó, la frase arranca con "presenta" para que los
        // hallazgos siguientes se encadenen sin dejar una coma colgada.
        let frase, sinTamano = false;
        if (vi.tamano && vi.tamano !== 'normal') {
            frase = `${apertura}l ventrículo izquierdo se encuentra ${this.DILATACION[vi.tamano]}o`;
        } else if (vi.tamano === 'normal') {
            frase = `${apertura}l ventrículo izquierdo es de dimensiones conservadas`;
        } else {
            frase = `${apertura}l ventrículo izquierdo presenta`;
            sinTamano = true;
        }

        // Espesores
        if (vi.espesores === 'normales') partes.push('espesores parietales conservados');
        else if (vi.espesores && this.HIPERTROFIA[vi.espesores]) partes.push(this.HIPERTROFIA[vi.espesores]);

        // Motilidad
        const mot = this._motilidad(vi);
        if (mot) partes.push(mot);

        // FEy — el único número del informe
        const fey = this._funcionSistolica(vi.fey);

        // Sin ningún hallazgo del ventrículo no hay párrafo que escribir
        if (!partes.length && !fey) return sinTamano ? '' : frase + '.';

        // La función sistólica cierra la frase precedida de ", y": igual que en la app
        // principal, porque la cláusula de motilidad suele traer sus propias comas y
        // conjunciones ("...con extensión al septum apical, territorio DA, y deterioro…").
        // Los hallazgos previos van separados por comas y la conjunción queda sólo para
        // el final; si no, se encadenan dos "y" ("...conservados y motilidad…, y función…").
        let cuerpo;
        if (fey) cuerpo = partes.length ? `${partes.join(', ')}, y ${fey}` : fey;
        else     cuerpo = this._unir(partes);

        frase += sinTamano ? ` ${cuerpo}` : `, con ${cuerpo}`;
        return frase + '.';
    },

    /** Descripción de la motilidad. La segmentaria la redacta el Motor A. */
    _motilidad(vi) {
        if (vi.motilidad === 'conservada')  return 'motilidad parietal conservada';
        if (vi.motilidad === 'global')      return 'hipoquinesia global';

        if (vi.motilidad === 'segmentaria' && vi.segmentos && typeof MotilityEngine !== 'undefined') {
            const texto = MotilityEngine.describe(vi.segmentos).replace(/\.$/, '');
            if (!/^Motilidad parietal/i.test(texto)) {
                const desc = texto.charAt(0).toLowerCase() + texto.slice(1);
                // El territorio, cuando se identifica, lo aporta el Motor C
                let territorio = '';
                if (typeof TerritoryEngine !== 'undefined') {
                    const t = TerritoryEngine.interpret(vi.segmentos);
                    if (t.pattern || t.territory) territorio = `, ${t.pattern || t.territory}`;
                }
                return desc + territorio;
            }
        }
        return '';
    },

    /**
     * Grado de deterioro deducido de la FEy. No se pide por botón: el número manda.
     * Umbrales: >=52 conservada · 41-51 leve · 30-40 moderado · <30 severo
     */
    _funcionSistolica(fey) {
        const n = parseFloat(fey);
        if (!n || isNaN(n)) return '';
        if (n >= 52) return `función sistólica conservada (FEy ${n}%)`;
        if (n >= 41) return `deterioro leve de la función sistólica (FEy ${n}%)`;
        if (n >= 30) return `deterioro moderado de la función sistólica (FEy ${n}%)`;
        return `deterioro severo de la función sistólica (FEy ${n}%)`;
    },

    // ── P2: Hemodinámica — diastólica y aurícula izquierda ───────────────────

    _hemodinamica(d) {
        const DIAST = {
            normal:        'la función diastólica es normal, con presiones de llenado dentro de límites fisiológicos',
            I:             'se evidencia disfunción diastólica grado I, con presiones de llenado normales',
            II:            'se evidencia disfunción diastólica grado II, con presiones de llenado elevadas',
            III:           'se evidencia disfunción diastólica grado III, con presiones de llenado marcadamente elevadas',
            indeterminada: 'la evaluación diastólica resulta indeterminada',
            no_valorable:  'la función diastólica no resulta valorable en este estudio',
        };

        const diast = DIAST[d.diastolica];
        const ai    = d.ai;
        if (!diast && !ai) return '';

        let p = 'Desde el punto de vista hemodinámico, ';
        if (diast) p += diast;

        if (ai && ai !== 'normal') {
            const grado = { leve: 'leve', moderada: 'moderada', severa: 'severa' }[ai];
            p += diast
                ? `, asociado a dilatación ${grado} de la aurícula izquierda`
                : `se constata dilatación ${grado} de la aurícula izquierda`;
        } else if (ai === 'normal') {
            p += diast
                ? '; la aurícula izquierda es de dimensiones conservadas'
                : 'la aurícula izquierda es de dimensiones conservadas';
        }
        return p + '.';
    },

    // ── P3: Válvulas mitral y aórtica ───────────────────────────────────────

    _valvulas(d) {
        const frases = [];
        const m = d.mitral || {}, a = d.aortica || {};

        // ── Mitral ──
        const MORF_M = {
            normal:      'El aparato valvular mitral es morfológicamente normal',
            esclerosis:  'La válvula mitral presenta esclerosis valvular',
            mac:         'Se evidencia calcificación del anillo mitral (MAC)',
            engrosamiento: 'La válvula mitral presenta engrosamiento de sus valvas',
            prolapso:    'La válvula mitral presenta prolapso valvular',
            reumatica:   'La válvula mitral presenta cambios de aspecto reumático',
            protesis:    'Portador de prótesis valvular en posición mitral',
        };
        if (MORF_M[m.morfologia]) {
            let s = MORF_M[m.morfologia];
            const hallazgos = [];

            if (this._esSignificativa(m.insuficiencia) || m.insuficiencia === 'trace') {
                let im = `insuficiencia mitral ${this.REGURGITACION[m.insuficiencia]}`;
                // Se conserva la inferencia del motor principal: con la válvula
                // estructuralmente sana, un VI dilatado y deteriorado tensa las valvas
                // y la regurgitación es funcional, no primaria.
                if (this._imFuncional(d, m)) im += ' de mecanismo funcional por dilatación de cavidades';
                hallazgos.push(im);
            }
            if (this.ESTENOSIS[m.estenosis]) {
                hallazgos.push(`estenosis mitral ${this.ESTENOSIS[m.estenosis]}`);
            }

            if (hallazgos.length) s += `, con ${this._unir(hallazgos)}`;
            else if (m.morfologia === 'normal') s += ', sin estenosis ni insuficiencia significativas';
            frases.push(s);
        }

        // ── Aórtica ──
        const MORF_A = {
            normal:     'La válvula aórtica es trivalva',
            esclerosis: 'La válvula aórtica presenta esclerosis valvular',
            calcificada: 'La válvula aórtica se encuentra calcificada',
            bicuspide:  'La válvula aórtica es bicúspide',
            protesis:   'Portador de prótesis valvular en posición aórtica',
        };
        if (MORF_A[a.morfologia]) {
            let s = MORF_A[a.morfologia];
            const hallazgos = [];
            if (this._esSignificativa(a.insuficiencia) || a.insuficiencia === 'trace') {
                hallazgos.push(`insuficiencia aórtica ${this.REGURGITACION[a.insuficiencia]}`);
            }
            if (this.ESTENOSIS[a.estenosis]) {
                hallazgos.push(`estenosis aórtica ${this.ESTENOSIS[a.estenosis]}`);
            }
            if (hallazgos.length) s += `, con ${this._unir(hallazgos)}`;
            else if (a.morfologia === 'normal') s += ', sin estenosis ni insuficiencia significativas';
            frases.push(s);
        }

        return frases.length ? frases.join('. ') + '.' : '';
    },

    /** IM funcional: válvula sana + ventrículo dilatado y deteriorado */
    _imFuncional(d, m) {
        const vi = d.vi || {};
        const fey = parseFloat(vi.fey);
        return m.morfologia === 'normal'
            && vi.tamano && vi.tamano !== 'normal'
            && fey && fey < 41;
    },

    // ── P4: Cavidades derechas, tricúspide, HTP y VCI ───────────────────────

    _derechas(d) {
        const r = d.derechas || {};
        const frases = [];

        // VD y AD. La función del ventrículo derecho se encadena con "con" al tamaño,
        // que es como se lee en el informe: "dilatación leve con función conservada".
        const hallazgos = [];
        if (r.vd_tamano && r.vd_tamano !== 'normal') {
            hallazgos.push(`dilatación ${r.vd_tamano} del ventrículo derecho`);
        }
        if (r.ad && r.ad !== 'normal') hallazgos.push(`dilatación ${r.ad} de la aurícula derecha`);

        const FUNC_VD = {
            conservada: 'función sistólica conservada',
            leve:       'deterioro leve de la función sistólica del ventrículo derecho',
            moderado:   'deterioro moderado de la función sistólica del ventrículo derecho',
            severo:     'deterioro severo de la función sistólica del ventrículo derecho',
        };
        const funcionVD = FUNC_VD[r.vd_funcion];

        if (hallazgos.length) {
            let s = `Las cavidades derechas muestran ${this._unir(hallazgos)}`;
            if (funcionVD) s += `, con ${funcionVD}`;
            frases.push(s);
        } else if (r.vd_tamano === 'normal' || r.ad === 'normal') {
            frases.push(funcionVD && r.vd_funcion !== 'conservada'
                ? `Las cavidades derechas son de dimensiones conservadas, con ${funcionVD}`
                : 'Las cavidades derechas son de dimensiones y función conservadas');
        } else if (funcionVD) {
            frases.push(`Se constata ${funcionVD}`);
        }

        // Insuficiencia tricuspídea + probabilidad de hipertensión pulmonar
        const it = (d.tricuspide || {}).insuficiencia;
        // La PSAP no se midió: se informa el RANGO que corresponde a cada probabilidad,
        // nunca un valor puntual que sugiera una medición.
        const HTP = {
            baja:         'con baja probabilidad ecocardiográfica de hipertensión pulmonar (PSAP estimada ≤35 mmHg)',
            intermedia:   'con probabilidad ecocardiográfica intermedia de hipertensión pulmonar (PSAP estimada 36-50 mmHg)',
            alta:         'con alta probabilidad ecocardiográfica de hipertensión pulmonar (PSAP estimada >50 mmHg)',
            no_valorable: 'sin poder estimar la probabilidad de hipertensión pulmonar',
        };
        if (it && it !== 'no') {
            let s = `Se constata insuficiencia tricuspídea ${this.REGURGITACION[it]}`;
            if (HTP[r.htp]) s += `, ${HTP[r.htp]}`;
            frases.push(s);
        } else if (r.htp === 'no_valorable') {
            frases.push(`No se observa flujo de insuficiencia tricuspídea, ${HTP.no_valorable}`);
        } else if (HTP[r.htp]) {
            frases.push(`Se estima ${HTP[r.htp].replace(/^con /, '')}`);
        }

        // Vena cava inferior — marcador de presiones derechas
        const VCI = {
            normal:          'La vena cava inferior es de calibre normal, con colapso inspiratorio conservado',
            dilatada_colapso: 'La vena cava inferior se encuentra dilatada con colapso inspiratorio conservado',
            dilatada_sin_colapso: 'La vena cava inferior se encuentra dilatada sin colapso inspiratorio, sugestivo de presiones de llenado derechas elevadas',
            colapsada:       'La vena cava inferior se encuentra colapsada, sugestivo de bajo volumen intravascular',
        };
        if (VCI[d.vci]) frases.push(VCI[d.vci]);

        return frases.length ? frases.join('. ') + '.' : '';
    },

    // ── P5: Pericardio ──────────────────────────────────────────────────────

    _pericardio(d) {
        const PERICARDIO = {
            libre:       'Pericardio libre',
            leve:        'Se constata derrame pericárdico leve, sin signos de compromiso hemodinámico',
            moderado:    'Se constata derrame pericárdico moderado, sin signos de compromiso hemodinámico',
            severo:      'Se constata derrame pericárdico severo',
            compromiso:  'Se constata derrame pericárdico con signos de compromiso hemodinámico',
            engrosamiento: 'Se evidencia engrosamiento pericárdico',
        };
        return PERICARDIO[d.pericardio] ? PERICARDIO[d.pericardio] + '.' : '';
    },

    // ── P6: Hallazgos asociados ─────────────────────────────────────────────

    _extras(d) {
        const e = d.extras || {};
        const frases = [];

        const PLEURAL = {
            derecho:   'Se observa derrame pleural derecho',
            izquierdo: 'Se observa derrame pleural izquierdo',
            bilateral: 'Se observa derrame pleural bilateral',
        };
        if (PLEURAL[e.pleural]) frases.push(PLEURAL[e.pleural]);

        if (e.trombo === 'si') {
            frases.push(e.trombo_texto?.trim()
                ? `Se evidencia imagen compatible con trombo/masa: ${e.trombo_texto.trim()}`
                : 'Se evidencia imagen compatible con trombo/masa intracavitaria');
        }

        if (e.cateter === 'si') frases.push('Se visualiza catéter/electrodo en cavidades derechas');

        return frases.length ? frases.join('. ') + '.' : '';
    },

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** "a, b y c", con "e" delante de i-/hi- */
    _unir(items) {
        if (!items.length) return '';
        if (items.length === 1) return items[0];
        const ultimo = items[items.length - 1];
        const w = ultimo.toLowerCase();
        const conj = (w.startsWith('i') || (w.startsWith('hi') && !w.startsWith('hie'))) ? 'e' : 'y';
        return `${items.slice(0, -1).join(', ')} ${conj} ${ultimo}`;
    },
};

if (typeof window !== 'undefined') window.QuickReport = QuickReport;
if (typeof module !== 'undefined' && module.exports) module.exports = QuickReport;
