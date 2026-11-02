/** MCH: datos explícitos y clasificación del TSVI. Sin conteo diastólico ni score de riesgo.
 * Referencias: ASE 2025 tabla 7/sección MCH; AHA/ACC 2024.
 * La integración médica es independiente de los umbrales descriptivos.
 */
class MCH {
    static number(value, zero = false) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const n = Number(String(value).replace(',', '.'));
        return Number.isFinite(n) && (zero ? n >= 0 : n > 0) ? n : null;
    }

    static valid(record) {
        return record?.quality === 'valid' && this.number(record.gradient, true) !== null;
    }

    static obstruction(rest = {}, maneuvers = []) {
        const resting = this.valid(rest) ? this.number(rest.gradient, true) : null;
        // Un gradiente sin identificación de maniobra/postura no se atribuye a una provocación.
        const provoked = maneuvers.filter(r => this.valid(r) && ['Valsalva', 'De pie'].includes(r.maneuver) && r.posture);
        const positives = provoked.filter(r => this.number(r.gradient, true) >= 30);
        const values = [...(resting === null ? [] : [resting]), ...provoked.map(r => this.number(r.gradient, true))];
        return {
            resting, provoked,
            type: resting !== null && resting >= 30 ? 'rest' : positives.length ? (resting === null ? 'provoked-rest-unknown' : 'provoked-only') : values.length ? 'not-documented' : 'not-assessed',
            max: values.length ? Math.max(...values) : null,
            significant: values.some(n => n >= 50),
            // HCM Risk-SCD: nunca sustituir por el máximo de pie.
            riskDataMax: (() => { const v = [...(resting === null ? [] : [resting]), ...provoked.filter(r => r.maneuver === 'Valsalva').map(r => this.number(r.gradient, true))]; return v.length ? Math.max(...v) : null; })()
        };
    }

    static obstructionText(rest, maneuvers) {
        const o = this.obstruction(rest, maneuvers);
        const posture = rest?.posture ? ` en posición ${rest.posture}` : '';
        const lines = [];
        if (o.resting !== null) {
            lines.push(o.resting >= 30
                ? `Obstrucción del TSVI en reposo, con gradiente pico de ${o.resting} mmHg${posture}.`
                : `Gradiente pico del TSVI en reposo de ${o.resting} mmHg${posture}.`);
        }
        for (const r of o.provoked) lines.push(`Gradiente pico del TSVI de ${this.number(r.gradient, true)} mmHg con ${r.maneuver} en posición ${r.posture}.`);
        if (o.type === 'provoked-only') lines.push('Se documenta obstrucción provocada.');
        if (!maneuvers.length && o.resting !== null) lines.push('No se evaluaron maniobras de provocación.');
        // No declarar ausencia general: solamente las condiciones documentadas.
        if (o.resting !== null && o.resting < 30 && o.provoked.length && o.provoked.every(r => this.number(r.gradient, true) < 30)) {
            lines.push('No se documenta obstrucción del TSVI en reposo ni con las maniobras realizadas.');
        }
        return lines.join(' ');
    }

    static diastolic(data) {
        const { E, septal, lateral, tr, lavi, arDuration, aDuration, qualities = {}, rhythm, limitations = {} } = data;
        const n = v => this.number(v);
        const both = n(E) !== null && n(septal) !== null && n(lateral) !== null;
        const ee = both ? n(E) / ((n(septal) + n(lateral)) / 2) : null;
        const arA = n(arDuration) !== null && n(aDuration) !== null ? n(arDuration) - n(aDuration) : null;
        const atrialInvalid = ['fa', 'flutter'].includes(rhythm) || limitations.atrial || limitations.avBlock || limitations.fusion;
        const make = (value, quality, threshold, inclusive, invalid = false) => ({
            value,
            state: invalid || quality === 'invalid' ? 'not-interpretable' : value === null || quality !== 'valid' ? 'not-measured' : (inclusive ? value >= threshold : value > threshold) ? 'above' : 'not-above'
        });
        return {
            ee: make(ee, qualities.ee, 14, false, limitations.bcri || limitations.mac || limitations.mr || limitations.prosthesis || ['fa','flutter'].includes(rhythm)),
            tr: make(n(tr), qualities.tr, 2.8, false),
            lavi: make(n(lavi), qualities.lavi, 34, false),
            arA: make(arA, qualities.arA, 30, true, atrialInvalid)
        };
    }

    static pressureText(selection) {
        return {
            elevated: 'La evaluación integrada es compatible con elevación de la presión media de la aurícula izquierda.',
            'not-elevated': 'La evaluación integrada no sugiere elevación de la presión media de la aurícula izquierda.',
            indeterminate: 'La evaluación disponible no permite definir la presión media de la aurícula izquierda.'
        }[selection] || '';
    }

    static morphology(data) {
        const lines = [];
        const max = this.number(data.thickness);
        if (max !== null) lines.push(`Espesor parietal máximo de ${max} mm${data.location ? `, localizado en ${data.location}` : ''}.`);
        if (data.pattern) lines.push(`Patrón de hipertrofia ${data.pattern}.`);
        if (data.efConfirmed && this.number(data.ef) !== null) lines.push(`FEVI de ${this.number(data.ef)}%.`);
        if (['presente', 'ausente'].includes(data.apical)) lines.push(data.apical === 'presente' ? 'Se observa aneurisma apical.' : 'No se observa aneurisma apical.');
        if (['presente', 'ausente'].includes(data.sam)) lines.push(data.sam === 'presente' ? 'Se observa movimiento anterior sistólico mitral (SAM).' : 'No se observa movimiento anterior sistólico mitral (SAM).');
        if (data.sam === 'presente' && ['presente', 'ausente'].includes(data.contact)) lines.push(data.contact === 'presente' ? 'Se observa contacto mitroseptal.' : 'No se observa contacto mitroseptal.');
        return lines.join(' ');
    }
}
if (typeof module !== 'undefined' && module.exports) module.exports = MCH;
else window.MCH = MCH;
