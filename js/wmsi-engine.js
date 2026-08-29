/**
 * WMSI Engine — Wall Motion Score Index.
 *
 * Responsable EXCLUSIVAMENTE del cálculo. No redacta ni interpreta.
 *
 * Reglas:
 *  - Sólo entran los segmentos 1–16. El 17 (apical cap) nunca entra.
 *  - WMSI = suma de scores / cantidad de segmentos EVALUABLES.
 *  - Los no evaluables (NE) y equívocos (EQ) no suman al numerador ni al
 *    denominador: un segmento que no se pudo ver no puede puntuar.
 *
 * Corrige el cálculo anterior, que dividía por 17 fijo e incluía el ápex: eso
 * diluía cualquier alteración (un WMSI real de 1.44 se informaba como 1.41).
 */

const WMSIEngine = {

    /** Scores válidos que participan del índice */
    SCORES: { NORMAL: 1, HIPOQUINESIA: 2, AQUINESIA: 3, DISQUINESIA: 4 },

    /** Estados que existen pero no puntúan */
    NON_SCORING: ['NE', 'EQ', 0, null, undefined],

    /**
     * @param {Object} states mapa {segmentId: score}
     * @returns {{ wmsi: number|null, evaluated: number, excluded: number[], text: string }}
     */
    calculate(states) {
        const segments = MotilityModel.ANALYZED_SEGMENTS;
        const excluded = [];
        let sum = 0, evaluated = 0;

        segments.forEach(id => {
            const score = states[id];
            if (this._isScoring(score)) {
                sum += score;
                evaluated++;
            } else {
                excluded.push(id);
            }
        });

        // Sin un solo segmento evaluable no hay índice posible
        if (evaluated === 0) {
            return { wmsi: null, evaluated: 0, excluded, text: 'No valorable' };
        }

        const wmsi = sum / evaluated;
        return {
            wmsi: parseFloat(wmsi.toFixed(2)),
            evaluated,
            excluded,
            text: wmsi.toFixed(2),
        };
    },

    /**
     * Interpretación cualitativa del índice.
     *
     * Reemplaza a la "FEVI estimada" que la app derivaba del WMSI: un rango como
     * "45-55%" presentado junto a la FEy de Simpson sugiere una equivalencia que
     * no existe. El WMSI mide extensión de alteración regional, no volumen
     * eyectado. Se informa el índice y su lectura cualitativa, nada más.
     */
    interpret(wmsi) {
        if (wmsi === null)  return { label: 'no valorable', severity: 'none' };
        if (wmsi === 1)     return { label: 'sin alteraciones segmentarias', severity: 'normal' };
        if (wmsi <= 1.3)    return { label: 'alteración regional leve', severity: 'mild' };
        if (wmsi <= 1.7)    return { label: 'alteración regional moderada', severity: 'moderate' };
        return { label: 'alteración regional severa', severity: 'severe' };
    },

    _isScoring(score) {
        if (this.NON_SCORING.includes(score)) return false;
        return Number.isFinite(score) && score >= 1 && score <= 4;
    },
};

if (typeof window !== 'undefined') window.WMSIEngine = WMSIEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = WMSIEngine;
