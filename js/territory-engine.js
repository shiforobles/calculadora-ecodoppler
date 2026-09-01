/**
 * Territory Engine (Motor C) — Interpretación etiológica.
 *
 * Separado a propósito del Motor A: la descripción anatómica es un hecho observado,
 * el territorio coronario es una inferencia. Los territorios tienen variabilidad
 * anatómica entre pacientes, así que esto SUGIERE, nunca afirma.
 *
 * No redacta la motilidad ni calcula el WMSI: sólo dice de qué territorio parece.
 *
 * Reglas:
 *  - Territorio dominante = el que más segmentos alterados tiene.
 *  - Un territorio menor se menciona sólo si tiene >= 2 segmentos Y >= 30% del total.
 *    Con un solo segmento es ruido anatómico —típicamente el ápex, que es zona de
 *    solapamiento— y su compromiso ya lo describe el Motor A.
 *  - Sin dominante claro (empate o tres territorios parejos) => multiterritorial,
 *    sin listar los tres sueltos.
 *  - La severidad no se repite acá: ya la da el Motor A.
 */

const TerritoryEngine = {

    /** Un territorio menor necesita ambas cosas para nombrarse */
    MIN_SEGMENTS_EXTENSION: 2,
    MIN_RATIO_EXTENSION: 0.30,

    /**
     * Margen para considerar que un territorio domina de verdad. Con 6-5-5 sobre 16
     * segmentos nadie domina: eso es enfermedad difusa, no un territorio con extensión.
     */
    DOMINANCE_FACTOR: 1.5,

    /**
     * Patrones reconocibles.
     *
     * Definidos acá y no en MotilityModel.PATTERNS porque aquéllos existen para
     * APLICAR un preset al bull's-eye (qué segmentos pintar), no para RECONOCER una
     * distribución ya cargada. Reconocer exige criterios más estrictos.
     *
     * Se excluyen a propósito los patrones de menos de 4 segmentos (Chagas, BCRD):
     * con dos o tres segmentos cualquier cosa "coincide al 100%" y se dispararían
     * como falsos positivos constantemente.
     */
    PATTERNS: [
        {
            id: 'dilated',
            segments: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            text: 'compromiso global, compatible con miocardiopatía dilatada',
        },
        {
            // Takotsubo clásico: ápex y segmentos medios con las bases respetadas.
            // Si hay cualquier basal alterado deja de serlo, y por eso el patrón se
            // exige como subconjunto: un basal comprometido lo descarta solo.
            id: 'takotsubo',
            segments: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            text: 'patrón apical con bases respetadas, compatible con miocardiopatía por estrés (Takotsubo)',
        },
        {
            id: 'septal_dyssynchrony',
            segments: [2, 3, 8, 9, 14],
            text: 'compromiso septal, compatible con disincronía (BCRI, estimulación por marcapasos o post-quirúrgica)',
        },
    ],

    /** Coincidencia mínima con el patrón para sugerirlo */
    MIN_PATTERN_MATCH: 0.9,

    /**
     * Chagas se evalúa aparte porque no se define por un conjunto de segmentos sino
     * por una combinación que incluye el GRADO: lo característico es el aneurisma
     * apical (disquinesia), no el mero compromiso apical.
     */
    CHAGAS: {
        // Disquinesia apical. El 17 se admite acá —única excepción a su exclusión—
        // porque el aneurisma chagásico asienta justamente en la punta.
        APICAL: [13, 17],
        // Compromiso inferobasal / inferolateral basal
        INFEROBASAL: [4, 5],
        // Con la mayoría de los segmentos medios tomados ya no es un patrón chagásico
        // sino un compromiso difuso
        MAX_MEDIOS_ALTERADOS: 2,
        text: 'distribución compatible con miocardiopatía chagásica (aneurisma apical con compromiso inferobasal)',
    },

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @param {Object} states mapa {segmentId: score}
     * @returns {{territory: string|null, dominant: string|null, extension: string|null,
     *            multiterritorial: boolean, pattern: string|null, counts: Object,
     *            text: string}}
     */
    interpret(states) {
        const altered = MotilityModel.ANALYZED_SEGMENTS.filter(id => states[id] > 1);
        const counts = { DA: 0, CD: 0, Cx: 0 };
        altered.forEach(id => { counts[MotilityModel.SEGMENTS[id].artery]++; });

        const vacio = {
            territory: null, dominant: null, extension: null,
            multiterritorial: false, pattern: null, counts, text: '',
        };
        if (!altered.length) return vacio;

        // Chagas se evalúa primero: tiene prioridad sobre el territorio y sobre los
        // patrones por conjunto, porque su rasgo distintivo es no respetar territorios.
        const pattern = this._matchChagas(states, altered) || this._matchPattern(altered);
        const terr = this._territory(counts, altered.length);

        return {
            ...terr,
            counts,
            pattern,
            // El patrón, cuando calza, es más informativo que el territorio suelto.
            // "Compromiso multiterritorial" ya es una frase cerrada y no admite el
            // prefijo de compatibilidad.
            text: pattern || this._territoryText(terr),
        };
    },

    _territoryText(terr) {
        if (!terr.territory) return '';
        return terr.multiterritorial
            ? terr.territory
            : `distribución compatible con ${terr.territory}`;
    },

    /** Territorio dominante y, si corresponde, su extensión */
    _territory(counts, total) {
        const orden = Object.keys(counts)
            .filter(t => counts[t] > 0)
            .sort((a, b) => counts[b] - counts[a]);

        if (!orden.length) return { territory: null, dominant: null, extension: null, multiterritorial: false };

        const [primero, segundo] = orden;

        // Un solo territorio comprometido
        if (orden.length === 1) {
            return {
                territory: `territorio ${primero}`,
                dominant: primero, extension: null, multiterritorial: false,
            };
        }

        // ¿Domina alguno de verdad?
        const domina = counts[primero] >= counts[segundo] * this.DOMINANCE_FACTOR;
        if (!domina) {
            return {
                territory: 'compromiso multiterritorial',
                dominant: null, extension: null, multiterritorial: true,
            };
        }

        // Territorios menores que califican como extensión
        const extensiones = orden.slice(1).filter(t =>
            counts[t] >= this.MIN_SEGMENTS_EXTENSION &&
            counts[t] / total >= this.MIN_RATIO_EXTENSION
        );

        if (!extensiones.length) {
            return {
                territory: `territorio ${primero}`,
                dominant: primero, extension: null, multiterritorial: false,
            };
        }

        const lista = extensiones.map(t => `territorio ${t}`).join(' y ');
        return {
            territory: `territorio ${primero} con extensión a ${lista}`,
            dominant: primero, extension: extensiones.join(', '), multiterritorial: false,
        };
    },

    /**
     * Miocardiopatía chagásica. Requiere las tres cosas:
     *
     *  1. Aneurisma apical: disquinesia (no alcanza la hipoquinesia) en el segmento
     *     apical anterior o en el ápex. Es el marcador característico.
     *  2. Compromiso inferobasal o inferolateral basal, en cualquier grado.
     *  3. Que la distribución NO siga un territorio coronario: si todo lo alterado
     *     pertenece a una sola arteria es una isquemia territorial, no Chagas. Y con
     *     la mayoría de los segmentos medios tomados es un compromiso difuso.
     *
     * Justamente por no respetar territorios es que la combinación resulta sugestiva.
     */
    _matchChagas(states, altered) {
        const C = this.CHAGAS;
        const DISQUINESIA = 4;

        const aneurismaApical = C.APICAL.some(id => states[id] === DISQUINESIA);
        if (!aneurismaApical) return null;

        const inferobasal = C.INFEROBASAL.some(id => states[id] > 1);
        if (!inferobasal) return null;

        // Un solo territorio comprometido => es isquemia territorial.
        // El ápex entra en esta cuenta cuando es el que porta el aneurisma: si no,
        // un aneurisma apical puro con compromiso inferobasal quedaría fuera por no
        // figurar entre los segmentos analizados.
        const apicalesDK = C.APICAL.filter(id => states[id] === DISQUINESIA);
        const relevantes = [...new Set([...altered, ...apicalesDK])];
        const arterias = new Set(relevantes.map(id => MotilityModel.SEGMENTS[id].artery));
        if (arterias.size < 2) return null;

        // Anillo medio mayormente tomado => compromiso difuso, no chagásico
        const mediosAlterados = MotilityModel.LEVELS.medio.filter(id => states[id] > 1).length;
        if (mediosAlterados > C.MAX_MEDIOS_ALTERADOS) return null;

        return C.text;
    },

    /**
     * Un patrón se sugiere sólo si NO hay nada alterado fuera de él y cubre al menos
     * el 90% de sus segmentos. Ambas condiciones: sin la primera, cualquier compromiso
     * extenso "contiene" a los patrones chicos; sin la segunda, un fragmento del
     * patrón bastaría para invocarlo.
     */
    _matchPattern(altered) {
        const candidatos = this.PATTERNS
            .map(p => {
                const set = new Set(p.segments);
                const dentro = altered.every(id => set.has(id));
                const cobertura = altered.filter(id => set.has(id)).length / p.segments.length;
                return { p, ok: dentro && cobertura >= this.MIN_PATTERN_MATCH, cobertura };
            })
            .filter(c => c.ok);

        if (!candidatos.length) return null;

        // A igual cobertura gana el patrón más específico (menos segmentos)
        candidatos.sort((a, b) => b.cobertura - a.cobertura || a.p.segments.length - b.p.segments.length);
        return candidatos[0].p.text;
    },
};

if (typeof window !== 'undefined') window.TerritoryEngine = TerritoryEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = TerritoryEngine;
