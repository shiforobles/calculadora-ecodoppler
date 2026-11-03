/** Caja MCH del formulario: 9 campos + venas pulmonares opcionales (plegado).
 * Se muestra solo con la casilla MCH (ctx_mcp) tildada. Reutiliza los datos que
 * ya existen en la calculadora (SIV/PP, E, e′, IT, volumen AI, grado de IM).
 * Los campos son estáticos: Borrar todo, Deshacer y los presets los tratan como
 * a cualquier otro campo del formulario.
 */
class MCHUI {
    constructor(controller) { this.controller = controller; }
    value(id) { return document.getElementById(id)?.value || ''; }
    get active() { return !!document.getElementById('ctx_mcp')?.checked; }

    /** MCH reemplaza al algoritmo diastólico general salvo en FA/flutter y prótesis mitral. */
    applies() {
        if (!this.active) return false;
        if (['fa', 'flutter'].includes(this.value('ritmo'))) return false;
        const protMitral = document.getElementById('prot_check')?.checked && this.value('prot_posicion') === 'mitral';
        return !protMitral;
    }

    field(id, label, input) {
        return `<div class="form-group"><label for="${id}">${label}</label>${input}</div>`;
    }
    num(id, label, placeholder = '') {
        return this.field(id, label, `<input type="number" id="${id}" min="0" step="any"${placeholder ? ` placeholder="${placeholder}"` : ''}>`);
    }
    select(id, label, options, empty = 'No evaluado') {
        const opts = options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
        return this.field(id, label, `<select id="${id}"><option value="">${empty}</option>${opts}</select>`);
    }

    init() {
        const section = document.createElement('section');
        section.id = 'mch_section';
        section.className = 'card mch-section';
        section.hidden = true;
        section.innerHTML = `<h2 class="section-title">Miocardiopatía hipertrófica</h2>
            <div class="grid">
            ${this.num('mch_thickness', 'Espesor máximo (mm)')}
            ${this.select('mch_location', 'Localización', [['septum basal', 'Septum basal'], ['septum medio', 'Septum medio'], ['ápex', 'Ápex'], ['pared anterior', 'Pared anterior'], ['pared lateral', 'Pared lateral'], ['pared inferior', 'Pared inferior']], '—')}
            ${this.select('mch_pattern', 'Patrón', [['septal asimétrica', 'Septal asimétrica'], ['apical', 'Apical'], ['concéntrica', 'Concéntrica'], ['medioventricular', 'Medioventricular']], '—')}
            ${this.select('mch_sam', 'SAM', [['no', 'No'], ['si', 'Sí, sin contacto septal'], ['contacto', 'Sí, con contacto septal']])}
            ${this.num('mch_rest', 'Gradiente TSVI en reposo (mmHg)')}
            ${this.num('mch_valsalva', 'Gradiente TSVI con Valsalva (mmHg)', 'vacío = no realizado')}
            ${this.num('mch_mid', 'Gradiente medioventricular (mmHg)', 'opcional')}
            ${this.select('mch_apical', 'Aneurisma apical', [['no', 'No'], ['si', 'Sí']])}
            ${this.select('mch_jet', 'Jet de IM', [['posterior', 'Posterior'], ['anterior o central', 'Anterior o central']], '—')}
            </div>
            <details class="mch-pv"><summary>Venas pulmonares (opcional)</summary><div class="grid">
            ${this.num('mch_ar_duration', 'Duración de Ar (ms)')}
            ${this.num('mch_a_duration', 'Duración de A mitral (ms)')}
            </div></details>
            <div id="mch_summary" class="mch-summary" role="status" aria-live="polite"></div>`;
        document.getElementById('motility-regional-section').before(section);
        this.section = section;
        const recalc = () => this.controller.calculateAll();
        section.addEventListener('input', recalc);
        section.addEventListener('change', recalc);
    }

    /** Datos que usa la lógica de MCH (campos propios + compartidos). */
    data() {
        const v = id => this.value(id);
        const mr = v('im_grado');
        return {
            thickness: v('mch_thickness'), location: v('mch_location'), pattern: v('mch_pattern'),
            sam: v('mch_sam'), rest: v('mch_rest'), valsalva: v('mch_valsalva'), mid: v('mch_mid'),
            apical: v('mch_apical'), jet: v('mch_jet'),
            arDuration: v('mch_ar_duration'), aDuration: v('mch_a_duration'),
            siv: v('siv'), pp: v('pp'),
            E: v('onda_e'), septal: v('onda_e_prime_septal'), lateral: v('onda_e_prime_lateral'),
            tr: v('vel_it'), lavi: v('vol_ai'), mr,
            hasMr: !!mr && mr !== 'no', mrLabel: MCH.MR_LABEL[mr] || '',
            mac: !!document.getElementById('ctx_mac')?.checked,
        };
    }

    diastolic() { return MCH.diastolic(this.data()); }

    /** Resultado para el semáforo diastólico y para el informe. */
    diastolicResult() {
        const r = this.diastolic();
        const severity = { 'elevada': 'red', 'no-elevada': 'green', 'indeterminada': 'yellow', 'no-valorable': 'neutral' }[r.result];
        return { grade: 'MCH', description: MCH.diastolicConclusion(r), severity, mch: r };
    }

    /** Muestra/oculta la caja y actualiza el resumen en pantalla (no va al informe). */
    refresh() {
        if (!this.section) return;
        this.section.hidden = !this.active;
        if (!this.active) return;
        const d = this.data(), o = MCH.obstruction(d.rest, d.valsalva);
        const lines = [MCH.diagnosis(d, { conclusion: true })];
        if (o.kind === 'sin-valsalva') lines.push('Sin Valsalva no se puede afirmar que sea no obstructiva.');
        if (this.applies()) {
            const r = MCH.diastolic(d);
            const estado = { pos: 'supera', neg: 'no supera', na: 'no medido' };
            lines.push('', 'Criterios MCH (ASE):');
            for (const c of r.criteria) {
                const val = c.value === null ? '—' : MCH.criterionValue(c);
                lines.push(`· ${c.label} ${MCH.threshold(c)}${c.unit ? ' ' + c.unit : ''}: ${val} → ${c.excluded ? `no válido (${c.excluded})` : estado[c.state]}`);
            }
            lines.push(`Resultado automático: ${MCH.diastolicConclusion(r)}`);
        } else {
            lines.push('', 'FA o prótesis mitral: la diástole sigue el algoritmo general de la app.');
        }
        const t = MCH.number(d.thickness);
        if (t !== null && t < 15) lines.push('', 'Espesor máximo <15 mm: revisar contexto (antecedente familiar, genética, estudios previos).');
        document.getElementById('mch_summary').textContent = lines.join('\n');
    }

    /** Para Sheets: solo los campos de la caja MCH y el resultado automático. */
    serialize() {
        if (!this.active) return null;
        const fields = {};
        this.section.querySelectorAll('input[id], select[id]').forEach(el => { fields[el.id.replace(/^mch_/, '')] = el.value; });
        const r = this.applies() ? this.diastolic() : null;
        return { version: 1, ...fields, presionAI: r ? r.result : 'algoritmo-general', criterios: r ? `${r.pos}/${r.measured}` : '' };
    }
}
window.MCHUI = MCHUI;
