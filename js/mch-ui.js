/** Formulario MCH aislado. Los campos y la procedencia viven en el DOM para
 * participar en seguimiento de ediciones, presets, reinicio y Deshacer.
 */
class MCHUI {
    constructor(controller) { this.controller = controller; this.renderedRecords = null; }
    value(id) { return document.getElementById(id)?.value || ''; }
    checked(id) { return !!document.getElementById(id)?.checked; }
    get active() { return this.checked('ctx_mcp'); }
    field(id, label, type = 'number', options = '') {
        if (type === 'select') return `<div class="form-group"><label for="${id}">${label}</label><select id="${id}"><option value="">No evaluado</option>${options}</select></div>`;
        return `<div class="form-group"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''}></div>`;
    }
    options(values) { return values.map(([value, label]) => `<option value="${value}">${label}</option>`).join(''); }
    quality(id, label) { return this.field(id, label, 'select', this.options([['valid','Medido y revisado'],['invalid','No interpretable']])); }
    init() {
        const yn = this.options([['presente','Presente'],['ausente','Ausente'],['no-interpretable','No interpretable']]);
        const posture = this.options([['supina','Supina'],['semisupina','Semisupina'],['semisentada','Semisentada'],['sentada','Sentada'],['de pie','De pie']]);
        const section = document.createElement('section');
        section.id = 'mch_section'; section.className = 'card mch-section'; section.hidden = true;
        section.innerHTML = `<h2 class="section-title">MCH · Registro e integración médica</h2>
            <p class="mch-help">Contexto seleccionado por el médico. No establece un diagnóstico nuevo ni aplica el algoritmo diastólico general.</p>
            <details open><summary>Morfología y aparato mitral</summary><div class="grid">
            ${this.field('mch_thickness','Espesor máximo telediastólico (mm)')}
            ${this.field('mch_location','Localización','select',this.options([['septum basal','Septum basal'],['septum medio','Septum medio'],['ápex','Ápex'],['pared anterior','Pared anterior'],['pared lateral','Pared lateral'],['pared inferior','Pared inferior']]))}
            ${this.field('mch_pattern','Patrón observado','select',this.options([['septal asimétrica','Septal asimétrica'],['apical','Apical'],['concéntrica','Concéntrica'],['medioventricular','Medioventricular']]))}
            ${this.field('mch_apical','Aneurisma apical','select',yn)}
            ${this.field('mch_sam','SAM','select',yn)}${this.field('mch_contact','Contacto mitroseptal','select',yn)}
            ${this.field('mch_jet','Dirección del jet de IM','select',this.options([['posterior','Posterior'],['anterior','Anterior'],['central','Central'],['multiple','Múltiple']]))}
            ${this.field('mch_mr_mechanism','Mecanismo de IM observado','select',this.options([['SAM','Relacionado con SAM'],['intrinseco','Enfermedad mitral intrínseca'],['mixto','Mixto'],['indeterminado','Indeterminado']]))}
            ${this.field('mch_la_ap','Diámetro AP de AI (mm)')}
            </div><label class="mch-check"><input type="checkbox" id="mch_ef_confirmed"> Revisé la FEVI del formulario para este estudio</label><input id="mch_ef_source" type="hidden"></details>
            <details open><summary>Obstrucción del TSVI</summary><div class="grid">
            ${this.field('mch_rest','Gradiente pico en reposo (mmHg)')}${this.field('mch_rest_posture','Postura en reposo','select',posture)}${this.quality('mch_rest_quality','Calidad del registro en reposo')}
            </div><div id="mch_maneuvers"></div><button type="button" id="mch_add" class="preset-btn">Agregar maniobra</button>
            <textarea id="mch_records" hidden aria-label="Registros de provocación"></textarea>
            <p class="mch-help">Registrar Valsalva o cambio a bipedestación. Excluir señales contaminadas por IM; no se realizan cálculos de ejercicio.</p>
            <div id="mch_obstruction" class="mch-summary" role="status"></div>
            <div class="grid">${this.field('mch_mid','Gradiente medioventricular (mmHg)')}${this.quality('mch_mid_quality','Calidad medioventricular')}</div></details>
            <details open><summary>Diástole · Datos y limitaciones</summary>
            <p class="mch-help">Se reutilizan E, A, e′ septal/lateral, Vmax IT, volumen indexado AI, ritmo y grado de IM del formulario. Revisá disponibilidad y calidad; un valor precargado no confirma una medición.</p>
            <div class="grid">${this.quality('mch_q_ee','E/e′ promedio: dos sitios medidos')}${this.quality('mch_q_tr','Vmax IT')}${this.quality('mch_q_lavi','Volumen máximo biplano indexado AI')}</div>
            <div class="mch-checks"><label class="mch-check"><input id="mch_avblock" type="checkbox"> BAV de primer grado</label><label class="mch-check"><input id="mch_atrial" type="checkbox"> Miopatía auricular</label><label class="mch-check"><input id="mch_fusion" type="checkbox"> Fusión de ondas E/A</label></div>
            <details><summary>Venas pulmonares (opcional)</summary><div class="grid">${this.field('mch_ar_peak','Velocidad pico de Ar (cm/s)')}${this.field('mch_ar_duration','Duración de Ar (ms)')}${this.field('mch_a_duration','Duración de A mitral (ms)')}${this.quality('mch_q_ara','Calidad de Ar−A')}</div></details>
            <div id="mch_parameters" class="mch-summary" aria-live="polite"></div></details>
            <details open><summary>Integración médica</summary><div class="grid">
            ${this.field('mch_pressure','Presión media de AI','select',this.options([['elevated','Estimada elevada'],['not-elevated','Estimada no elevada'],['indeterminate','Indeterminada tras revisión']]))}
            ${this.field('mch_ptd','Evidencia sobre PTD del VI','select',this.options([['elevated','Ar−A compatible con elevación'],['indeterminate','No concluyente']]))}
            ${this.field('mch_grade','Grado diastólico (sólo asignación médica)','select',this.options([['I','Grado I'],['II','Grado II'],['III','Grado III']]))}
            </div><button type="button" id="mch_confirm" class="preset-btn">Confirmar integración revisada</button><input id="mch_pressure_source" type="hidden"><input id="mch_ptd_source" type="hidden"><input id="mch_grade_source" type="hidden">
            <p id="mch_review" role="status"></p></details>
            <details><summary>Ayudas al operador · No se agregan al informe</summary><div class="grid">${this.field('mch_symptoms','Síntomas','select',this.options([['present','Presentes'],['absent','Ausentes']]))}</div><div id="mch_help" class="mch-summary"></div></details>`;
        document.getElementById('motility-regional-section').before(section);
        this.section = section;
        document.getElementById('mch_add').addEventListener('click', () => {
            const records = this.records(); records.push({key: this.nextKey(), maneuver:'',posture:'',gradient:'',quality:''}); this.setRecords(records);
        });
        document.getElementById('mch_confirm').addEventListener('click', () => {
            this.refresh();
            for (const id of ['pressure','ptd','grade']) document.getElementById(`mch_${id}_source`).value = this.value(`mch_${id}`) ? this.fingerprint(id) : '';
            this.controller.calculateNow();
        });
        section.addEventListener('input', e => this.changed(e)); section.addEventListener('change', e => this.changed(e));
        // Réplicas de presets o cambios fuera del módulo también pasan por refresh().
        const shared = new Set(['onda_e','onda_a','onda_e_prime_septal','onda_e_prime_lateral','vel_it','vol_ai','ritmo','conduccion','ctx_bcri','ctx_mac','ctx_im','im_grado','prot_check','prot_posicion','fevi']);
        const update = event => { if (this.active && shared.has(event.target.id)) this.controller.calculateAll(); };
        document.querySelector('.container').addEventListener('input', update);
        document.querySelector('.container').addEventListener('change', update);
        this.renderRecords();
    }
    nextKey() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
    records() { try { const r = JSON.parse(this.value('mch_records') || '[]'); return Array.isArray(r) ? r.filter(item => item && /^r[a-z0-9]+$/.test(item.key)) : []; } catch { return []; } }
    setRecords(records) {
        const el=document.getElementById('mch_records'); el.value=JSON.stringify(records); this.renderRecords();
        el.dispatchEvent(new Event('input',{bubbles:true}));
    }
    renderRecords() {
        const records=this.records(), serialized=JSON.stringify(records);
        if (this.renderedRecords === serialized) return;
        this.renderedRecords=serialized;
        const target=document.getElementById('mch_maneuvers'); target.replaceChildren();
        records.forEach((r,index)=>{
            const row=document.createElement('fieldset'); row.className='mch-maneuver';
            const key=r.key;
            row.innerHTML=`<legend>Maniobra ${index+1}</legend><div class="grid">${this.field(`mch_${key}_maneuver`,'Maniobra','select',this.options([['Valsalva','Valsalva'],['De pie','De pie']]))}${this.field(`mch_${key}_posture`,'Postura','select',this.options([['supina','Supina'],['semisupina','Semisupina'],['semisentada','Semisentada'],['sentada','Sentada'],['de pie','De pie']]))}${this.field(`mch_${key}_gradient`,'Gradiente pico (mmHg)')}${this.quality(`mch_${key}_quality`,'Calidad del registro')}</div><button type="button" class="preset-btn">Quitar esta maniobra</button>`;
            for (const field of ['maneuver','posture','gradient','quality']) {
                const el=row.querySelector(`#mch_${key}_${field}`); el.value=r[field]??'';
                const sync=()=>{const all=this.records();all[index][field]=el.value;document.getElementById('mch_records').value=JSON.stringify(all);this.renderedRecords=JSON.stringify(all);};
                el.addEventListener('input',sync);el.addEventListener('change',sync);
            }
            row.querySelector('button').addEventListener('click',()=>this.setRecords(this.records().filter((_,i)=>i!==index)));
            target.append(row);
        });
    }
    changed(event) {
        if (event.target.id === 'mch_ef_confirmed') document.getElementById('mch_ef_source').value = this.checked('mch_ef_confirmed') ? this.value('fevi') : '';

        if (/^mch_(pressure|ptd|grade)$/.test(event.target.id)) document.getElementById(event.target.id+'_source').value='';
        this.controller.calculateAll();
    }
    data() {
        const v=id=>this.value(id), c=id=>this.checked(id);
        return {E:v('onda_e'),A:v('onda_a'),septal:v('onda_e_prime_septal'),lateral:v('onda_e_prime_lateral'),tr:v('vel_it'),lavi:v('vol_ai'),
            arDuration:v('mch_ar_duration'),aDuration:v('mch_a_duration'),arPeak:v('mch_ar_peak'),rhythm:v('ritmo'),mr:v('im_grado'),
            qualities:{ee:v('mch_q_ee'),tr:v('mch_q_tr'),lavi:v('mch_q_lavi'),arA:v('mch_q_ara')},
            limitations:{bcri:c('ctx_bcri'),mac:c('ctx_mac'),mr:c('ctx_im')||['moderada','moderada-severa','severa'].includes(v('im_grado')),atrial:c('mch_atrial'),avBlock:c('mch_avblock'),fusion:c('mch_fusion'),prosthesis:c('prot_check')&&v('prot_posicion')==='mitral'}};
    }
    fingerprint(kind) {
        const data=this.data();
        // PTD depende de Ar−A, ritmo y limitaciones auriculares; no del TSVI o de la morfología.
        if (kind === 'grade') return JSON.stringify({data,ef:this.value('fevi'),motion:this.value('motilidad_global')});
        return JSON.stringify(kind==='ptd'?{ar:data.arDuration,a:data.aDuration,q:data.qualities.arA,rhythm:data.rhythm,atrial:data.limitations.atrial,av:data.limitations.avBlock,fusion:data.limitations.fusion}:data);
    }
    rest() {return {gradient:this.value('mch_rest'),quality:this.value('mch_rest_quality'),posture:this.value('mch_rest_posture')};}
    refresh() {
        if (!this.section) return;
        this.section.hidden=!this.active; this.renderRecords();
        for(const kind of ['pressure','ptd','grade']) {
            const source=document.getElementById(`mch_${kind}_source`), selection=document.getElementById(`mch_${kind}`);
            if (!this.active || source.value && source.value!==this.fingerprint(kind)) {source.value='';selection.value='';}
        }
        if (this.checked('mch_ef_confirmed') && this.value('mch_ef_source') !== this.value('fevi')) {
            document.getElementById('mch_ef_confirmed').checked = false;
            document.getElementById('mch_ef_source').value = '';
        }
        if (!this.active) return;
        const ia = document.getElementById('mode_ia');
        if (ia) ia.title = 'MCH: usar Lista o Narrativo para conservar la integración revisada.';
        const d=this.data(), params=MCH.diastolic(d), o=MCH.obstruction(this.rest(),this.records());
        this.params=params;
        document.querySelector('#mch_ptd option[value=\"elevated\"]').disabled=params.arA.state!=='above';
        document.getElementById('mch_contact').disabled=this.value('mch_sam')!=='presente';
        const labels={above:'Supera el umbral', 'not-above':'No supera el umbral (no equivale a normalidad)', 'not-measured':'No medido / pendiente de revisión', 'not-interpretable':'No interpretable para este criterio'};
        document.getElementById('mch_parameters').textContent=Object.entries(params).map(([k,p])=>`${{ee:'E/e′ promedio >14',tr:'Vmax IT >2,8 m/s',lavi:'Volumen AI >34 mL/m²',arA:'Ar−A ≥30 ms'}[k]}: ${p.value===null?'—':Number(p.value.toFixed(2))} · ${k === 'arA' && p.state === 'above' ? 'Cumple el umbral ≥30 ms' : labels[p.state]}`).join('\n');
        document.getElementById('mch_obstruction').textContent=(MCH.obstructionText(this.rest(),this.records())||'Evaluación del TSVI pendiente.')+(o.significant?'\nGradiente válido ≥50 mmHg.':'');
        document.getElementById('mch_review').textContent=this.reviewed('pressure')?'Integración de presión media AI revisada.':'Pendiente de revisión médica: no equivale a resultado indeterminado.';
        const help=[];
        if (['fa','flutter'].includes(d.rhythm)) help.push('FA/flutter: no interpretar los umbrales de ritmo sinusal ni Ar−A. La conclusión requiere integración médica individual.');
        if(d.limitations.mr)help.push('IM al menos moderada: revisar limitaciones de E/e′ y la atribución de los hallazgos de AI/IT. Puede existir elevación real de presión AI.');
        if(d.limitations.prosthesis)help.push('Prótesis mitral: revisar aplicabilidad individual. No se utiliza el algoritmo general.');
        if(['anterior','central'].includes(this.value('mch_jet')))help.push('Revisar mecanismo de IM; la dirección del jet no confirma enfermedad mitral intrínseca.');
        const t=MCH.number(this.value('mch_thickness')),age=MCH.number(this.value('edad'));
        if(t!==null&&t<15&&age!==null&&age>=18)help.push('Espesor <15 mm: revisar contexto familiar/genético, estudios previos y calidad. No confirma ni descarta MCH.');
        if(o.resting!==null&&o.resting<50&&!o.provoked.length)help.push('Evaluación provocativa pendiente o no interpretable.');
        if(o.resting!==null&&o.resting<50&&o.provoked.length&&o.provoked.every(r=>MCH.number(r.gradient,true)<50)){
            if(this.value('mch_symptoms')==='present')help.push('Paciente sintomático sin gradiente ≥50 documentado: considerar indicación de eco de ejercicio según AHA/ACC 2024 (se realiza fuera de este módulo).');
            if(this.value('mch_symptoms')==='absent')help.push('Paciente asintomático: puede considerarse evaluación con ejercicio según contexto clínico.');
        }
        help.push(`Datos para evaluación externa HCM Risk-SCD: diámetro AP AI ${this.value('mch_la_ap')||'no medido'} mm; máximo válido reposo/Valsalva ${o.riskDataMax??'no medido'} mmHg. No constituye un score.`);
        document.getElementById('mch_help').textContent=help.join('\n');
    }
    reviewed(kind) {return !!this.value(`mch_${kind}`)&&this.value(`mch_${kind}_source`)===this.fingerprint(kind);}
    ready() {
        this.refresh();
        return !this.active || this.reviewed('pressure') && ['ptd','grade'].every(k => !this.value(`mch_${k}`) || this.reviewed(k)) && (this.value('mch_ptd') !== 'elevated' || this.params.arA.state === 'above');
    }
    pressureText() { return this.reviewed('pressure') ? MCH.pressureText(this.value('mch_pressure')) : ''; }
    clinicalText() {
        const v=id=>this.value(id), lines=[];
        lines.push(MCH.morphology({thickness:v('mch_thickness'),location:v('mch_location'),pattern:v('mch_pattern'),ef:v('fevi'),efConfirmed:this.checked('mch_ef_confirmed'),apical:v('mch_apical'),sam:v('mch_sam'),contact:v('mch_contact')}));
        lines.push(MCH.obstructionText(this.rest(),this.records()));
        const jet={posterior:'posterior',anterior:'anterior',central:'central',multiple:'múltiple'}[v('mch_jet')];
        const mechanism={SAM:'relacionado con SAM',intrinseco:'intrínseco',mixto:'mixto',indeterminado:'indeterminado'}[v('mch_mr_mechanism')];
        if(v('im_grado')&&v('im_grado')!=='no'&&jet)lines.push(`Jet de insuficiencia mitral de dirección ${jet}.`);
        if(v('im_grado')&&v('im_grado')!=='no'&&mechanism)lines.push(`Mecanismo de insuficiencia mitral observado: ${mechanism}.`);
        if(v('mch_mid_quality')==='valid'&&MCH.number(v('mch_mid'),true)!==null)lines.push(`Gradiente pico medioventricular de ${MCH.number(v('mch_mid'),true)} mmHg.`);
        const motion = this.value('motilidad_global');
        if (motion && motion !== 'conservada' && this.controller.motility) {
            const description = this.controller.motility.generateConclusion();
            if (description) lines.push(description);
        }
        return lines.filter(Boolean).join(' ');
    }
    diastolicText() {
        const d=this.data(), p=MCH.diastolic(d), parts=[];
        if(p.ee.state==='above'||p.ee.state==='not-above')parts.push(`E/e′ promedio ${Number(p.ee.value.toFixed(2))}`);
        if(p.tr.state==='above'||p.tr.state==='not-above')parts.push(`Vmax IT ${p.tr.value} m/s`);
        if(p.lavi.state==='above'||p.lavi.state==='not-above')parts.push(`volumen máximo indexado de AI ${p.lavi.value} mL/m²`);
        const lines=parts.length?[`Datos diastólicos revisados: ${parts.join('; ')}.`]:[];
        lines.push(this.pressureText());
        if(this.reviewed('ptd')&&this.value('mch_ptd')==='elevated'&&p.arA.state==='above')lines.push(`Ar−A de ${p.arA.value} ms, hallazgo que aporta evidencia de elevación de la presión telediastólica del VI.`);
        if(this.reviewed('grade'))lines.push(`Grado diastólico ${this.value('mch_grade')}, asignado por integración médica.`);
        return lines.filter(Boolean).join(' ');
    }
    invalidatePreset() {
        for (const id of ['mch_pressure','mch_ptd','mch_grade','mch_pressure_source','mch_ptd_source','mch_grade_source','mch_ef_source','mch_q_ee','mch_q_tr','mch_q_lavi','mch_q_ara','mch_rest_quality','mch_mid_quality']) document.getElementById(id).value = '';
        document.getElementById('mch_ef_confirmed').checked = false;
        const records=this.records().map(r=>({...r,quality:''}));
        document.getElementById('mch_records').value=JSON.stringify(records);
        this.renderRecords();
    }
    serialize() {
        if(!this.active)return null;
        return {version:1,fevi:this.value('fevi'),rest:this.rest(),maneuvers:this.records(),fields:[...this.section.querySelectorAll('input[id],select[id],textarea[id]')].filter(el=>!/^mch_r.*_(maneuver|posture|gradient|quality)$/.test(el.id)).map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]),shared:this.data(),active:true};
    }
}
window.MCHUI=MCHUI;
