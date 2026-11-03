/** MCH (miocardiopatía hipertrófica): lógica pura, sin DOM.
 *
 * Especificación aprobada por Lucas el 02/11/2026 (Project, claude/prompt-mch.md v3):
 * - Obstrucción del TSVI: ≥30 mmHg obstrucción; ≥50 mmHg hemodinámicamente significativa
 *   (AHA/ACC 2024). Sin Valsalva no se afirma "no obstructiva".
 * - Presión media de AI automática con los criterios de MCH de la ASE (tabla 7):
 *   E/e′ promedio >14, Vmax IT >2,8 m/s, LAVi >34 mL/m², Ar−A ≥30 ms.
 *   Integración por mayoría (regla de la ASE 2016; la ASE 2025 no define conteo).
 * - Campo vacío = no evaluado; nunca se informa como normal.
 */
class MCH {
    static number(value) {
        if (value === null || value === undefined || String(value).trim() === '') return null;
        const n = Number(String(value).replace(',', '.'));
        return Number.isFinite(n) && n >= 0 ? n : null;
    }

    /** Muestra un número sin ceros de más (3 → "3", 3.25 → "3.25"). */
    static fmt(n, decimals = 1) {
        return String(Number(n.toFixed(decimals)));
    }

    static IM_SIGNIFICATIVA = ['moderada', 'moderada-severa', 'severa'];
    static MR_LABEL = { 'minima': 'mínima', 'leve': 'leve', 'leve-moderada': 'leve a moderada',
        'moderada': 'moderada', 'moderada-severa': 'moderada a severa', 'severa': 'severa' };

    // ─── Obstrucción del TSVI ──────────────────────────────────────────────

    static obstruction(restValue, valsalvaValue) {
        const rest = this.number(restValue);
        const valsalva = this.number(valsalvaValue);
        const values = [rest, valsalva].filter(v => v !== null);
        const max = values.length ? Math.max(...values) : null;
        let kind;
        if (rest === null && valsalva === null) kind = 'sin-datos';
        else if (rest !== null && rest >= 30) kind = 'reposo';
        else if (rest !== null && valsalva !== null && valsalva >= 30) kind = 'provocable';
        else if (rest === null && valsalva >= 30) kind = 'valsalva';
        else if (rest !== null && valsalva !== null) kind = 'no';
        else if (rest !== null) kind = 'sin-valsalva';
        else kind = 'sin-reposo';   // solo Valsalva <30: no alcanza para calificar
        const obstructive = ['reposo', 'provocable', 'valsalva'].includes(kind);
        return { rest, valsalva, max, kind, obstructive, significant: obstructive && max >= 50 };
    }

    /** "obstructiva en reposo", "con obstrucción provocable, hemodinámicamente significativa"… */
    static obstructionPhrase(o) {
        const sig = o.significant ? ', hemodinámicamente significativa' : '';
        switch (o.kind) {
            case 'reposo':       return ` obstructiva en reposo${sig}`;
            case 'provocable':   return ` con obstrucción provocable${sig}`;
            case 'valsalva':     return ` con obstrucción del TSVI con Valsalva${sig}`;
            case 'no':           return ' no obstructiva';
            case 'sin-valsalva': return ', sin obstrucción del TSVI en reposo (no se realizó maniobra de Valsalva)';
            default:             return '';
        }
    }

    /** Frase diagnóstica: "Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica no obstructiva." */
    static diagnosis(d, { conclusion = false } = {}) {
        const o = this.obstruction(d.rest, d.valsalva);
        let s = `Hallazgos compatibles con miocardiopatía hipertrófica${d.pattern ? ' ' + d.pattern : ''}${this.obstructionPhrase(o)}`;
        if (conclusion) {
            const g = this.gradientDetail(o);
            if (g) s += ` (${g})`;
            if (d.sam === 'contacto') s += ', con SAM y contacto septal';
            else if (d.sam === 'si') s += ', con SAM sin contacto septal';
            else if (d.sam === 'no') s += ', sin SAM';
        }
        return s + '.';
    }

    /** "gradiente pico del TSVI de 30 mmHg en reposo y de 45 mmHg con Valsalva" */
    static gradientDetail(o) {
        const r = o.rest !== null ? `${this.fmt(o.rest, 0)} mmHg en reposo` : '';
        const v = o.valsalva !== null ? `${this.fmt(o.valsalva, 0)} mmHg con Valsalva` : '';
        if (r && v) return `gradiente pico del TSVI de ${r} y de ${v}`;
        if (r) return `gradiente pico del TSVI de ${r}; Valsalva no realizado`;
        if (v) return `gradiente pico del TSVI de ${v}`;
        return '';
    }

    // ─── Diástole: criterios de MCH y presión media de AI ──────────────────

    static diastolic(d) {
        const E = this.number(d.E), sep = this.number(d.septal), lat = this.number(d.lateral);
        const ee = E !== null && sep > 0 && lat > 0 ? E / ((sep + lat) / 2) : null;
        const ar = this.number(d.arDuration), a = this.number(d.aDuration);
        const arA = ar !== null && a !== null ? ar - a : null;
        const crit = (key, label, value, unit, threshold, inclusive, excluded = '') => {
            let state = 'na';
            if (!excluded && value !== null) state = (inclusive ? value >= threshold : value > threshold) ? 'pos' : 'neg';
            return { key, label, value, unit, threshold, inclusive, state, excluded };
        };
        const criteria = [
            crit('ee', 'E/e′ promedio', ee, '', 14, false, d.mac && ee !== null ? 'MAC' : ''),
            crit('tr', 'Vmax IT', this.number(d.tr), 'm/s', 2.8, false),
            crit('lavi', 'Vol. AI', this.number(d.lavi), 'mL/m²', 34, false),
            crit('arA', 'Ar−A', arA, 'ms', 30, true),
        ];
        const pos = criteria.filter(c => c.state === 'pos').length;
        const neg = criteria.filter(c => c.state === 'neg').length;
        const measured = pos + neg;
        let result;
        if (measured < 2) result = 'no-valorable';
        else if (pos > neg) result = 'elevada';
        else if (neg > pos) result = 'no-elevada';
        else result = 'indeterminada';
        const imWarning = this.IM_SIGNIFICATIVA.includes(d.mr) ? this.MR_LABEL[d.mr] : '';
        return { criteria, pos, neg, measured, result, imWarning };
    }

    static imWarningText(grade) {
        return grade ? `En presencia de insuficiencia mitral ${grade}, el volumen auricular y la velocidad tricuspídea pueden estar influidos por la regurgitación.` : '';
    }

    /** Conclusión numerada (Lista y Narrativo). */
    static diastolicConclusion(r) {
        const detalle = this.criteriaDetail(r, { bare: true });
        const n = `según criterios para MCH (${r.pos} de ${r.measured} positivos${detalle ? ': ' + detalle : ''})`;
        const base = {
            'elevada': `Presiones de llenado del VI elevadas ${n}.`,
            'no-elevada': `Presiones de llenado del VI no elevadas ${n}.`,
            'indeterminada': `Presiones de llenado del VI indeterminadas ${n}.`,
            'no-valorable': 'Función diastólica no valorable por datos insuficientes (criterios para MCH).',
        }[r.result];
        return [base, r.result !== 'no-valorable' ? this.imWarningText(r.imWarning) : ''].filter(Boolean).join(' ');
    }

    static criterionValue(c) {
        const v = c.key === 'ee' ? this.fmt(c.value, 1) : c.key === 'tr' ? (Number.isInteger(c.value) ? c.value.toFixed(1) : this.fmt(c.value, 2)) : this.fmt(c.value, 0);
        return c.unit ? `${v} ${c.unit}` : v;
    }

    static threshold(c) {
        return `${c.inclusive ? '≥' : '>'}${String(c.threshold)}`;
    }

    /** "E/e′ promedio 16 (>14); Vmax IT 3.0 m/s (>2.8); …" — solo los criterios cargados */
    static criteriaDetail(r, { bare = false } = {}) {
        return r.criteria.filter(c => c.value !== null).map(c => {
            if (c.excluded) return `${c.label} ${this.criterionValue(c)} ${bare ? '— ' : '('}no válido por ${c.excluded}${bare ? '' : ')'}`;
            const rel = c.state === 'pos' ? this.threshold(c) : `${c.inclusive ? '<' : '≤'}${c.threshold}`;
            return bare ? `${c.label} ${this.criterionValue(c)} ${rel}` : `${c.label} ${this.criterionValue(c)} (${rel})`;
        }).join('; ');
    }

    /** Línea del cuerpo en Lista. */
    static diastolicListLine(r) {
        const d = this.criteriaDetail(r);
        return d ? `Diástole (criterios MCH): ${d}.` : '';
    }

    /** Párrafo diastólico del Narrativo (sin punto final). */
    static diastolicNarrative(r) {
        const names = {
            ee: c => `E/e′ promedio de ${this.criterionValue(c)}`,
            tr: c => `velocidad de la insuficiencia tricuspídea de ${this.criterionValue(c)}`,
            lavi: c => `volumen indexado de la aurícula izquierda de ${this.criterionValue(c)}`,
            arA: c => `diferencia Ar−A de ${this.criterionValue(c)}`,
        };
        const usable = r.criteria.filter(c => c.state !== 'na');
        if (r.result === 'no-valorable') {
            return 'La función diastólica no resulta valorable con los criterios específicos para miocardiopatía hipertrófica por datos insuficientes';
        }
        const join = l => l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l.at(-1)}` : l[0];
        const ref = (n, dentro) => (dentro ? 'dentro ' : 'por encima ') + (n > 1 ? 'de los valores de referencia' : 'del valor de referencia');
        const P = usable.filter(c => c.state === 'pos').map(c => names[c.key](c));
        const N = usable.filter(c => c.state === 'neg').map(c => names[c.key](c));
        let s = 'La función diastólica se evaluó con criterios específicos para miocardiopatía hipertrófica: ';
        if (!N.length) s += `${join(P)}, ${P.length > 1 ? 'todos ' : ''}${ref(P.length, false)}`;
        else if (!P.length) s += `${join(N)}, ${N.length > 1 ? 'todos ' : ''}${ref(N.length, true)}`;
        else s += `${join(P)} ${ref(P.length, false)}, con ${join(N)} ${ref(N.length, true)}`;
        s += {
            'elevada': ', hallazgos compatibles con presiones de llenado del ventrículo izquierdo elevadas',
            'no-elevada': ', hallazgos compatibles con presiones de llenado del ventrículo izquierdo no elevadas',
            'indeterminada': '; con criterios contrapuestos, las presiones de llenado del ventrículo izquierdo resultan indeterminadas',
        }[r.result];
        const ex = r.criteria.find(c => c.excluded);
        if (ex) s += `. El E/e′ no se consideró por la presencia de ${ex.excluded}`;
        const im = this.imWarningText(r.imWarning);
        if (im) s += `. ${im.replace(/\.$/, '')}`;
        return s;
    }

    /** Párrafo de cierre del Narrativo: diagnóstico con gradientes + presiones de llenado. */
    static narrativeSummary(d, r, systolic) {
        const o = this.obstruction(d.rest, d.valsalva);
        let s = this.diagnosis(d).replace(/^Hallazgos/, 'En síntesis, hallazgos').replace(/\.$/, '');
        const g = this.gradientDetail(o);
        if (g) s += ` (${g})`;
        const extras = [];
        if (d.sam === 'contacto') extras.push('movimiento anterior sistólico mitral con contacto septal');
        else if (d.sam === 'si') extras.push('movimiento anterior sistólico mitral sin contacto septal');
        if (d.apical === 'si') extras.push('aneurisma apical');
        if (systolic) extras.push(systolic);
        if (extras.length) s += `, con ${join2(extras)}`;
        s += '.';
        if (r) {
            if (r.result === 'no-valorable') s += ' Presiones de llenado del ventrículo izquierdo no valorables por datos insuficientes.';
            else s += ` Presiones de llenado del ventrículo izquierdo ${{ 'elevada': 'elevadas', 'no-elevada': 'no elevadas', 'indeterminada': 'indeterminadas' }[r.result]} según los criterios específicos para miocardiopatía hipertrófica (${r.pos} de ${r.measured} criterios positivos).`;
        }
        return s;
        function join2(l) { return l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l.at(-1)}` : l[0]; }
    }

    // ─── Morfología ────────────────────────────────────────────────────────

    /** Patrón que se deduce de las mediciones, o '' si no se puede deducir.
     * Septum con relación septo/PP ≥1.3 → septal asimétrica; espesor máximo en ápex → apical.
     * Concéntrica y medioventricular no se deducen: las elige el médico. */
    static suggestedPattern(d) {
        const loc = d.location || '';
        if (loc === 'ápex' && this.number(d.thickness) !== null) return 'apical';
        const r = this.ratio(d.siv, d.pp, d.thickness, loc);
        if (/^septum/.test(loc) && r !== null && r >= 1.3) return 'septal asimétrica';
        return '';
    }

    /** Relación septo/pared posterior: con el espesor máximo si está en el septum; si no, SIV/PP. */
    static ratio(siv, pp, thickness = null, location = '') {
        const p = this.number(pp), t = this.number(thickness);
        const s = t > 0 && /^septum/.test(location || '') ? t : this.number(siv);
        return s > 0 && p > 0 ? s / p : null;
    }

    /** Línea "MCH:" del cuerpo en Lista. */
    static morphologyListLine(d) {
        const parts = [];
        if (d.pattern) parts.push(`hipertrofia ${d.pattern}`);
        const t = this.number(d.thickness);
        if (t !== null) parts.push(`espesor máximo ${this.fmt(t, 0)} mm${d.location ? ` (${d.location})` : ''}`);
        const r = this.ratio(d.siv, d.pp, d.thickness, d.location);
        if (r !== null) parts.push(`relación septo/PP ${this.fmt(r, 1)}`);
        const s = [];
        if (parts.length) s.push(parts.join(', ').replace(/^./, c => c.toUpperCase()) + '.');
        if (d.sam === 'contacto') s.push('SAM con contacto septal.');
        else if (d.sam === 'si') s.push('SAM sin contacto septal.');
        else if (d.sam === 'no') s.push('Sin SAM.');
        if (d.jet && d.hasMr) s.push(`IM de jet ${d.jet}.`);
        if (d.apical === 'si') s.push('Aneurisma apical.');
        else if (d.apical === 'no') s.push('Sin aneurisma apical.');
        return s.length ? `MCH: ${s.join(' ')}` : '';
    }

    /** Línea "TSVI:" del cuerpo en Lista. */
    static obstructionListLine(d) {
        const o = this.obstruction(d.rest, d.valsalva);
        const parts = [];
        if (o.rest !== null) parts.push(`gradiente pico ${this.fmt(o.rest, 0)} mmHg en reposo`);
        if (o.valsalva !== null) parts.push(`${this.fmt(o.valsalva, 0)} mmHg con Valsalva`);
        else if (o.rest !== null) parts.push('Valsalva no realizado');
        const mid = this.number(d.mid);
        let line = parts.length ? `TSVI: ${parts.join('; ')}.` : '';
        if (mid !== null) line += `${line ? ' ' : ''}Gradiente medioventricular ${this.fmt(mid, 0)} mmHg.`;
        return line;
    }

    /** Oraciones de MCH que se agregan al párrafo del VI en Narrativo (después de la FEy). */
    static morphologyNarrative(d) {
        const s = [];
        const t = this.number(d.thickness), r = this.ratio(d.siv, d.pp, d.thickness, d.location);
        if (t !== null) {
            let x = `El espesor parietal máximo es de ${this.fmt(t, 0)} mm${d.location ? ` a nivel del ${d.location}` : ''}`;
            if (r !== null) x += `, con una relación septo/pared posterior de ${this.fmt(r, 1)}`;
            if (d.apical === 'si') x += ', con aneurisma apical';
            else if (d.apical === 'no') x += ', sin aneurisma apical';
            s.push(x + '.');
        } else if (d.apical === 'si') s.push('Se observa aneurisma apical.');
        else if (d.apical === 'no') s.push('No se observa aneurisma apical.');
        const im = d.hasMr ? `insuficiencia mitral${d.mrLabel ? ' ' + d.mrLabel : ''}${d.jet ? ` de jet ${d.jet}` : ''}` : '';
        if (d.sam === 'contacto' || d.sam === 'si') {
            s.push(`Se observa movimiento anterior sistólico de la valva mitral ${d.sam === 'contacto' ? 'con' : 'sin'} contacto septal${im ? `, asociado a ${im}` : ''}.`);
        } else if (d.sam === 'no') {
            s.push('No se observa movimiento anterior sistólico mitral.');
        }
        const o = this.obstruction(d.rest, d.valsalva);
        if (o.rest !== null && o.valsalva !== null) {
            const verbo = o.valsalva > o.rest ? 'aumenta a' : 'es de';
            s.push(`El gradiente pico del tracto de salida del ventrículo izquierdo es de ${this.fmt(o.rest, 0)} mmHg en reposo y ${verbo} ${this.fmt(o.valsalva, 0)} mmHg con la maniobra de Valsalva.`);
        } else if (o.rest !== null) {
            s.push(`El gradiente pico del tracto de salida del ventrículo izquierdo es de ${this.fmt(o.rest, 0)} mmHg en reposo; no se realizó maniobra de Valsalva.`);
        } else if (o.valsalva !== null) {
            s.push(`El gradiente pico del tracto de salida del ventrículo izquierdo con la maniobra de Valsalva es de ${this.fmt(o.valsalva, 0)} mmHg.`);
        }
        const mid = this.number(d.mid);
        if (mid !== null) s.push(`Se registra un gradiente medioventricular de ${this.fmt(mid, 0)} mmHg.`);
        return s.join(' ');
    }
}
if (typeof module !== 'undefined' && module.exports) module.exports = MCH;
else window.MCH = MCH;
