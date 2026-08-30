/**
 * Motility Engine (Motor A) — Redacción anatómica de la motilidad segmentaria.
 *
 * Función pura: recibe el estado de los segmentos y devuelve la frase del informe.
 * No toca el DOM, no depende del bull's-eye, no infiere territorios coronarios
 * (eso es el Motor C) y no sabe cómo se cargaron los segmentos (eso es el Motor B).
 * Determinístico: la misma entrada produce siempre la misma salida.
 *
 * Principio rector: exactitud primero, compresión después. Sólo se comprime cuando
 * no se pierde información anatómica; la enumeración es el último recurso.
 *
 * Grafía: la de los informes históricos y la base de datos — hipoquinesia,
 * aquinesia, disquinesia (con "qu", no con "c").
 */

const MotilityEngine = {

    /** Texto cuando no hay ninguna alteración */
    NORMAL_TEXT: 'Motilidad parietal global y segmentaria conservada.',

    /** Sustantivo por score de motilidad. 1 = normal (sin sustantivo) */
    NOUNS: {
        2: 'hipoquinesia',
        3: 'aquinesia',
        4: 'disquinesia',
    },

    /** Severidad: se redacta primero lo más severo (DK > AK > HK) */
    SEVERITY_ORDER: [4, 3, 2],

    LEVEL_ADJ:    { basal: 'basal',   medio: 'medio',   apical: 'apical' },
    LEVEL_FEM:    { basal: 'basal',   medio: 'media',   apical: 'apical' },
    LEVEL_PLURAL: { basal: 'basales', medio: 'medios',  apical: 'apicales' },

    // ─────────────────────────────────────────────────────────────────────────
    // API PÚBLICA
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param {Object} states  mapa {segmentId: score}. El 17 y los no evaluables
     *                         se ignoran silenciosamente.
     * @returns {string} frase completa, con mayúscula inicial y punto final.
     */
    describe(states) {
        const groups = this._groupBySeverity(states);
        if (!groups.length) return this.NORMAL_TEXT;

        // Cada grado se parte además en componentes anatómicamente conexas: dos focos
        // separados del mismo grado son dos lesiones distintas y se describen aparte,
        // nunca fusionadas en un nombre de pared que no está comprometida.
        const blocks = [];
        groups.forEach(g => {
            const focos = this._connectedComponents(g.segments);
            // Sólo vale la pena separarlos si cada foco tiene forma anatómica propia.
            // Si son segmentos sueltos y dispersos, enumerarlos juntos se lee mejor
            // que repetir el mismo grado en tres frases seguidas.
            const separar = focos.length > 1 &&
                focos.every(f => !this._describeSegments(f).enumerated);

            if (separar) focos.forEach(segments => blocks.push({ score: g.score, segments }));
            else         blocks.push({ score: g.score, segments: g.segments });
        });

        const [core, ...rest] = blocks;
        let text = this._capitalize(`${this.NOUNS[core.score]} ${this._describeSegments(core.segments).text}`);

        rest.forEach(block => {
            const adjacent = this._isAdjacentTo(block.segments, core.segments);
            const desc = this._describeSegments(block.segments);
            const noun = this.NOUNS[block.score];

            if (adjacent) {
                // Lesión continua: una sola frase. Si el bloque secundario tiene forma
                // anatómica propia (anillo, pared, región) se usa esa; si hubo que
                // enumerarlo, se marca explícitamente que es contiguo al núcleo.
                const sufijo = desc.enumerated
                    ? (block.segments.length > 1 ? ' adyacentes' : ' adyacente')
                    : '';
                text += `, con ${noun} ${desc.text}${sufijo}`;
            } else if (block.score === core.score) {
                // Mismo grado, otro foco: se enuncia como hallazgo aparte.
                text += `, con ${noun} ${desc.text}`;
            } else {
                // Distinto grado y sin continuidad anatómica: no se fusionan.
                text += ` ${this._conjunction(noun)} ${noun} ${desc.text}`;
            }
        });

        return text + '.';
    },

    /**
     * Parte un conjunto de segmentos en grupos conexos por adyacencia anatómica.
     * Devuelve los componentes ordenados por tamaño (el mayor primero).
     */
    _connectedComponents(segments) {
        const pendientes = new Set(segments);
        const componentes = [];

        while (pendientes.size) {
            const semilla = Math.min(...pendientes);
            const grupo = [];
            const cola = [semilla];
            pendientes.delete(semilla);

            while (cola.length) {
                const actual = cola.pop();
                grupo.push(actual);
                MotilityModel.getNeighbors(actual).forEach(vecino => {
                    if (pendientes.has(vecino)) {
                        pendientes.delete(vecino);
                        cola.push(vecino);
                    }
                });
            }
            componentes.push(grupo.sort((a, b) => a - b));
        }

        return componentes.sort((a, b) => b.length - a.length || a[0] - b[0]);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // JERARQUÍA DE REDACCIÓN (niveles 1 a 7)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Devuelve { text, enumerated } para un conjunto de segmentos del mismo grado.
     * `enumerated` indica que no se encontró ningún patrón anatómico y hubo que
     * listar los segmentos uno a uno (nivel 7).
     */
    _describeSegments(segments) {
        const segs = [...segments].sort((a, b) => a - b);
        const M = MotilityModel;
        const patron = text => ({ text, enumerated: false });

        // ── NIVEL 1 — Alteración global ──
        if (segs.length === M.ANALYZED_SEGMENTS.length) {
            return patron('global del ventrículo izquierdo');
        }

        // ── NIVEL 2 — Anillo completo ──
        if (this._sameSet(segs, M.LEVELS.basal))  return patron('circunferencial de los segmentos basales');
        if (this._sameSet(segs, M.LEVELS.medio))  return patron('circunferencial de los segmentos medios');
        // En el ápex se prefiere "difusa" antes que "circunferencial"
        if (this._sameSet(segs, M.LEVELS.apical)) return patron('difusa de los segmentos apicales');

        // ── NIVEL 2b — Varios anillos completos ──
        // Un nivel completo se nombra como anillo aunque acompañe a otro nivel y
        // comparta grado con él; enumerar sus seis paredes no aporta nada.
        const anillos = this._matchCompleteRings(segs);
        if (anillos) return patron(anillos);

        // ── NIVEL 3 — Pared longitudinal completa ──
        const columna = this._matchWallColumn(segs);
        if (columna) return patron(this._wallColumnText(columna));

        // ── NIVEL 4 — Dos niveles contiguos de la misma pared ──
        const par = this._matchWallPair(segs);
        if (par) return patron(par);

        // ── NIVEL 5 — Agrupaciones apicales ──
        const apical = this._matchApical(segs);
        if (apical) return patron(apical);

        // ── NIVEL 6 — Regiones combinadas ──
        const region = this._matchRegion(segs);
        if (region) return patron(region);

        // ── NIVEL 7 — Fallback: enumerar ──
        return { text: this._enumerate(segs), enumerated: true };
    },

    /** NIVEL 3 — ¿los segmentos son exactamente una columna de pared? */
    _matchWallColumn(segs) {
        const cols = MotilityModel.WALL_COLUMNS;
        return Object.keys(cols).find(wall => this._sameSet(segs, cols[wall])) || null;
    },

    _wallColumnText(wall) {
        // Anterior e inferior conservan el mismo nombre en los tres niveles.
        if (wall === 'anterior' || wall === 'inferior') {
            return `de la pared ${wall} en toda su extensión`;
        }
        // Las demás cambian de nombre en el ápex, así que no se puede decir
        // "anteroseptal apical": el segmento 14 es septal y el 16 lateral.
        const apicalName = (wall === 'anteroseptal' || wall === 'inferoseptal')
            ? 'al septum apical'
            : 'al segmento lateral apical';
        return `${wall} basal y media con extensión ${apicalName}`;
    },

    /** NIVEL 4 — dos segmentos contiguos de la misma columna */
    _matchWallPair(segs) {
        if (segs.length !== 2) return null;
        const cols = MotilityModel.WALL_COLUMNS;

        for (const wall of Object.keys(cols)) {
            const [basal, medio, apical] = cols[wall];
            if (this._sameSet(segs, [basal, medio])) return `${wall} baso-medial`;
            if (this._sameSet(segs, [medio, apical])) {
                if (wall === 'anterior' || wall === 'inferior') return `${wall} medio-apical`;
                const ext = (wall === 'anteroseptal' || wall === 'inferoseptal')
                    ? 'al septum apical'
                    : 'lateral apical';
                return `${wall} media con extensión ${ext}`;
            }
        }
        return null;
    },

    /** NIVEL 5 — combinaciones que involucran el anillo apical */
    _matchApical(segs) {
        const M = MotilityModel;
        const apicales = segs.filter(s => M.LEVELS.apical.includes(s));
        const otros    = segs.filter(s => !M.LEVELS.apical.includes(s));

        if (apicales.length < 2) return null;

        const nombres = apicales.map(s => M.SEGMENT_ANATOMY[s].wall);

        // Sólo apicales, sin extensión a otros niveles
        if (!otros.length) {
            // Dos apicales: "anterior y septal apical"
            if (apicales.length === 2) return `${this._joinList(nombres)} apical`;
            // Tres apicales: nombrarlos, no decir sólo "predominio apical" (perdería información)
            if (apicales.length === 3) return `de los segmentos apicales ${this._joinList(nombres)}`;
            return null; // los cuatro ya los resolvió el nivel 2
        }

        // Tres o cuatro apicales + extensión a otros niveles
        if (apicales.length >= 3) {
            return `de predominio apical con extensión ${this._extensionText(otros)}`;
        }
        return null;
    },

    /**
     * NIVEL 2b — el conjunto se descompone exactamente en anillos completos.
     * Se enuncian del ápex hacia la base.
     */
    _matchCompleteRings(segs) {
        const M = MotilityModel;
        const set = new Set(segs);
        const orden = [
            ['apical', 'difusa de los segmentos apicales'],
            ['medio',  'circunferencial de los segmentos medios'],
            ['basal',  'circunferencial de los segmentos basales'],
        ];

        const completos = orden.filter(([nivel]) => M.LEVELS[nivel].every(s => set.has(s)));
        if (completos.length < 2) return null;

        // Sólo si no sobra ningún segmento fuera de esos anillos
        const cubiertos = completos.reduce((acc, [nivel]) => acc + M.LEVELS[nivel].length, 0);
        if (cubiertos !== segs.length) return null;

        return this._joinList(completos.map(([, texto]) => texto));
    },

    /**
     * NIVEL 6 — varias paredes comprometidas.
     *
     * Reglas:
     *  - Nunca se inventa un "predominio" ni se sesga hacia una pared: si dos paredes
     *    están parejas se nombran ambas.
     *  - El núcleo, cuando existe, es la pared con más niveles comprometidos.
     *  - "En toda su extensión" exige los tres niveles de esa pared.
     *  - El apical compartido (14 septal, 16 lateral) se informa como extensión: no
     *    existe "anteroseptal apical" ni "inferolateral apical".
     */
    _matchRegion(segs) {
        // "Predominio" describe una zona, no uno o dos segmentos sueltos.
        if (segs.length < 3) return null;

        const { walls, sharedApical } = this._analyzeWalls(segs);
        if (walls.length < 2) return null;   // una sola pared: la resuelven los niveles 3 y 4

        // Nombrar paredes exige que al menos una esté consolidada en su cuerpo
        // (basal + medio). Si todas están apenas esbozadas —por ejemplo un compromiso
        // medio-apical que no llega a las bases— lo honesto es describir la región,
        // no anunciar paredes que en realidad están comprometidas a medias.
        if (!walls.some(w => w.bodyComplete)) {
            const region = this._regionName(segs);
            const span = this._levelSpan(segs);
            return (region && span) ? `de predominio ${region} ${span}` : null;
        }

        const extApical = this._sharedApicalText(sharedApical);
        const completas = walls.filter(w => w.complete);
        const parciales = walls.filter(w => !w.complete);

        // ── Una pared claramente más comprometida: núcleo + extensiones ──
        if (completas.length === 1 && parciales.length) {
            const nucleo = completas[0];
            const extensiones = parciales
                .map(w => `a la pared ${w.wall} (${this._levelWords(w.levels)})`);
            if (extApical) extensiones.push(extApical);
            return `${this._wallCoreText(nucleo)}, con extensión ${this._joinList(extensiones)}`;
        }

        // ── Paredes parejas: se nombran todas, sin elegir una ──
        const nombres = walls.map(w => w.wall);
        let texto = `de las paredes ${this._joinList(nombres)}`;

        const tieneApicalPropio = walls.some(w => w.ownApical);
        if (!tieneApicalPropio) {
            const niveles = this._commonLevels(walls);
            if (extApical) {
                if (niveles) texto += ` (${this._levelWords(niveles)})`;
                texto += `, con extensión ${extApical}`;
            } else {
                const span = this._levelSpan(segs);
                if (!span) return null;
                texto += `, ${span}`;
            }
            return texto;
        }

        // Alguna pared llega al ápex con su propio nombre: los niveles no son
        // homogéneos, así que no se califican; sólo se anexa el apical compartido.
        if (extApical) texto += `, con extensión ${extApical}`;
        return texto;
    },

    /**
     * Descompone el conjunto por columnas de pared.
     *
     * `complete` significa que la pared está comprometida en toda su altura. Para la
     * anterior y la inferior eso incluye su apical propio (13 y 15); para las demás,
     * cuya cúspide es el septum o el lateral apical, basta el cuerpo basal + medio.
     */
    _analyzeWalls(segs) {
        const set = new Set(segs);
        const cols = MotilityModel.WALL_COLUMNS;
        const APICAL_PROPIO = { anterior: 13, inferior: 15 };
        // Orden de presentación: anterior y sus vecinas, después inferior y las suyas
        const ORDEN = ['anterior', 'anteroseptal', 'anterolateral', 'inferior', 'inferoseptal', 'inferolateral'];

        const walls = [];
        ORDEN.forEach(wall => {
            const [basal, medio, apical] = cols[wall];
            const cuerpo = [basal, medio].filter(s => set.has(s));
            const esPura = APICAL_PROPIO[wall] !== undefined;
            const ownApical = esPura && set.has(apical);

            // Una columna cuyo único segmento presente es el apical COMPARTIDO no está
            // comprometida como pared: ese segmento se informa como extensión.
            if (!cuerpo.length && !ownApical) return;

            const levels = [
                ...cuerpo.map(s => MotilityModel.SEGMENT_ANATOMY[s].level),
                ...(ownApical ? ['apical'] : []),
            ];
            walls.push({
                wall, levels, ownApical,
                bodyComplete: cuerpo.length === 2,
                complete: esPura
                    ? (cuerpo.length === 2 && ownApical)
                    : (cuerpo.length === 2 && set.has(apical)),
            });
        });

        const sharedApical = [14, 16].filter(s => set.has(s));
        return { walls, sharedApical };
    },

    /** Texto del núcleo cuando una pared está completa */
    _wallCoreText(w) {
        return (w.wall === 'anterior' || w.wall === 'inferior')
            ? `de la pared ${w.wall} en toda su extensión`
            : `${w.wall} basal y media`;
    },

    /** Extensión al apical de nomenclatura distinta */
    _sharedApicalText(shared) {
        if (!shared.length) return '';
        const partes = shared.map(s => s === 14 ? 'al septum apical' : 'al segmento lateral apical');
        return this._joinList(partes);
    },

    /**
     * Nombre de la región que forman las paredes involucradas, para el caso en que
     * ninguna esté consolidada. Los apicales de nomenclatura distinta (septal,
     * lateral) se funden con su sector correspondiente.
     *
     * Sólo se combinan sectores CONTIGUOS: nunca se arma un nombre de pared a partir
     * de zonas separadas del ventrículo.
     */
    _regionName(segs) {
        const walls = new Set(segs.map(s => MotilityModel.SEGMENT_ANATOMY[s].wall));
        const has = (...w) => w.some(x => walls.has(x));

        const anterior = walls.has('anterior');
        const inferior = walls.has('inferior');
        const septal   = has('anteroseptal', 'inferoseptal', 'septal');
        const lateral  = has('anterolateral', 'inferolateral', 'lateral');

        // Sectores puros
        if (anterior && !inferior && !septal && !lateral) return 'anterior';
        if (inferior && !anterior && !septal && !lateral) return 'inferior';
        if (septal && !anterior && !inferior && !lateral) {
            if (walls.has('anteroseptal') && !walls.has('inferoseptal')) return 'anteroseptal';
            if (walls.has('inferoseptal') && !walls.has('anteroseptal')) return 'inferoseptal';
            return 'septal';
        }
        if (lateral && !anterior && !inferior && !septal) {
            if (walls.has('anterolateral') && !walls.has('inferolateral')) return 'anterolateral';
            if (walls.has('inferolateral') && !walls.has('anterolateral')) return 'inferolateral';
            return 'lateral';
        }

        // Dos sectores contiguos. Anterior+inferior o septal+lateral son opuestos:
        // no forman una región y quedan para el fallback.
        if (anterior && septal && !inferior && !lateral) return 'anteroseptal';
        if (anterior && lateral && !inferior && !septal) return 'anterolateral';
        if (inferior && septal && !anterior && !lateral) return 'inferoseptal';
        if (inferior && lateral && !anterior && !septal) return 'inferolateral';

        return null;
    },

    /** Niveles comunes a todas las paredes, o null si difieren */
    _commonLevels(walls) {
        const firma = w => [...new Set(w.levels)].sort().join('|');
        const base = firma(walls[0]);
        return walls.every(w => firma(w) === base) ? [...new Set(walls[0].levels)] : null;
    },

    /** ['basal','medio'] → "basal y media" */
    _levelWords(levels) {
        const orden = { basal: 0, medio: 1, apical: 2 };
        const palabras = [...new Set(levels)]
            .sort((a, b) => orden[a] - orden[b])
            .map(l => this.LEVEL_FEM[l]);
        return this._joinList(palabras);
    },

    /** Rango de niveles involucrados: "medio-apical", "baso-medial", "apical"… */
    _levelSpan(segs) {
        const levels = new Set(segs.map(s => MotilityModel.SEGMENT_ANATOMY[s].level));
        const basal = levels.has('basal'), medio = levels.has('medio'), apical = levels.has('apical');

        if (basal && medio && apical) return 'en toda su extensión';
        if (medio && apical && !basal) return 'medio-apical';
        if (basal && medio && !apical) return 'baso-medial';
        if (basal && !medio && apical) return null; // niveles salteados: no comprimir
        if (basal)  return 'basal';
        if (medio)  return 'medio';
        if (apical) return 'apical';
        return null;
    },

    /** Texto de la extensión a segmentos fuera del núcleo apical */
    _extensionText(segs) {
        const A = MotilityModel.SEGMENT_ANATOMY;
        const levels = new Set(segs.map(s => A[s].level));

        // Un solo nivel: "anteroseptal media", "anterior y anteroseptal medios"
        if (levels.size === 1) {
            const level = [...levels][0];
            const walls = segs.map(s => A[s].wall);
            return segs.length === 1
                ? `${walls[0]} ${this.LEVEL_FEM[level]}`
                : `${this._joinList(walls)} ${this.LEVEL_PLURAL[level]}`;
        }
        return this._enumerate(segs);
    },

    /**
     * NIVEL 7 — enumeración. Si todos los segmentos comparten nivel se compacta
     * ("los segmentos anterior y anteroseptal medios"); si no, se nombran uno a uno.
     */
    _enumerate(segs) {
        const A = MotilityModel.SEGMENT_ANATOMY;

        if (segs.length === 1) {
            const { wall, level } = A[segs[0]];
            return `del segmento ${wall} ${this.LEVEL_ADJ[level]}`;
        }

        const levels = new Set(segs.map(s => A[s].level));
        if (levels.size === 1) {
            const level = [...levels][0];
            return `de los segmentos ${this._joinList(segs.map(s => A[s].wall))} ${this.LEVEL_PLURAL[level]}`;
        }

        return `de los segmentos ${this._joinList(segs.map(s => `${A[s].wall} ${this.LEVEL_ADJ[A[s].level]}`))}`;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Agrupa los segmentos alterados por grado, de mayor a menor severidad */
    _groupBySeverity(states) {
        return this.SEVERITY_ORDER
            .map(score => ({
                score,
                segments: MotilityModel.ANALYZED_SEGMENTS.filter(id => states[id] === score),
            }))
            .filter(g => g.segments.length > 0);
    },

    /** ¿Algún segmento de A toca algún segmento de B? */
    _isAdjacentTo(a, b) {
        return a.some(seg => MotilityModel.getNeighbors(seg).some(n => b.includes(n)));
    },

    _sameSet(a, b) {
        if (a.length !== b.length) return false;
        const setB = new Set(b);
        return a.every(x => setB.has(x));
    },

    /** "a, b y c" — usa "e" cuando la palabra siguiente empieza con i/hi */
    _joinList(items) {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        const last = items[items.length - 1];
        return `${items.slice(0, -1).join(', ')} ${this._conjunction(last)} ${last}`;
    },

    /** "y" → "e" delante de i- / hi- (pero no hie-) */
    _conjunction(nextWord) {
        const w = String(nextWord).toLowerCase();
        return (w.startsWith('i') || (w.startsWith('hi') && !w.startsWith('hie'))) ? 'e' : 'y';
    },

    _capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    },
};

if (typeof window !== 'undefined') {
    window.MotilityEngine = MotilityEngine;

    /**
     * Atajo de consola para comparar generador actual vs Motor A sin tener que
     * clickear el bull's-eye. Temporal, mientras dure el modo comparación.
     *
     *   comparar({ 13:3, 14:3, 7:2, 8:2 })   // 13-14 aquinéticos, 7-8 hipoquinéticos
     *   comparar('13,14=AK 7,8=HK')          // misma carga, en texto
     *
     * Sin argumentos usa el estado que esté cargado en el bull's-eye.
     */
    window.comparar = function (entrada) {
        const ctrl = window.UIController?.motility;
        let states;

        if (entrada === undefined) {
            states = ctrl ? { ...ctrl.state } : {};
        } else if (typeof entrada === 'string') {
            const MAP = { N: 1, HK: 2, AK: 3, DK: 4 };
            states = {};
            for (let i = 1; i <= 17; i++) states[i] = 1;
            entrada.trim().split(/\s+/).forEach(bloque => {
                const [segs, grado] = bloque.split('=');
                const score = MAP[(grado || 'HK').toUpperCase()];
                segs.split(',').forEach(s => {
                    const [a, b] = s.split('-').map(Number);
                    for (let i = a; i <= (b || a); i++) states[i] = score;
                });
            });
        } else {
            states = {};
            for (let i = 1; i <= 17; i++) states[i] = 1;
            Object.assign(states, entrada);
        }

        const alterados = MotilityModel.ANALYZED_SEGMENTS
            .filter(id => states[id] > 1)
            .map(id => `${id}:${['', 'N', 'HK', 'AK', 'DK'][states[id]]}`);

        const prev = ctrl ? { ...ctrl.state } : null;
        let actualDesc = '(controlador no disponible)', actualConcl = '';
        if (ctrl) {
            ctrl.state = states;
            actualDesc = (ctrl.generateMotilityReport() || '').replace(/\s*\(WMSI:.*?\)\.?\s*$/, '').trim();
            actualConcl = (ctrl.generateConclusion() || '').trim();
            ctrl.state = prev; // no ensuciar el estudio cargado
        }

        const w = typeof WMSIEngine !== 'undefined' ? WMSIEngine.calculate(states) : null;

        console.log('%c── COMPARACIÓN DE MOTILIDAD ──', 'font-weight:bold');
        console.log('Segmentos  :', alterados.length ? alterados.join('  ') : '(todos normales)');
        if (w) console.log(`WMSI       : ${w.text}  (${w.evaluated} evaluables)  — ${WMSIEngine.interpret(w.wmsi).label}`);
        console.log('%cACTUAL     : ' + actualDesc, 'color:#b45309');
        if (actualConcl) console.log('%c  conclusión: ' + actualConcl, 'color:#b45309');
        console.log('%cMOTOR A    : ' + MotilityEngine.describe(states), 'color:#0369a1');
        return undefined;
    };
}
if (typeof module !== 'undefined' && module.exports) module.exports = MotilityEngine;
