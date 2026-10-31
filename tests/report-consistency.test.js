/** Regression de coherencia con el controlador y motores reales, sin red ni storage real. */
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const UI = require('../js/ui-controller.js');
const Calc = require('../js/hemodynamics.js');
global.MotilityModel = require('../js/motility-model.js');
global.MotilityEngine = require('../js/motility-engine.js');
global.TerritoryEngine = require('../js/territory-engine.js');
global.WMSIEngine = require('../js/wmsi-engine.js');
const Motility = require('../js/motility-controller.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let active;
afterEach(() => { clearTimeout(active?._calcDebounceTimer); });
function screen() {
    const nodes = new Map(), fields = [];
    const make = (id, tagName = 'DIV') => {
        const listeners = {}, classes = new Set();
        return { id, tagName, value: '', type: '', checked: false, defaultChecked: false, defaultValue: '',
            selectedIndex: 0, options: [{ text: '', value: '', defaultSelected: true }], dataset: {}, style: {}, textContent: '', innerHTML: '', hidden: false,
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains: c => classes.has(c) },
            addEventListener(t, f) { (listeners[t] ||= []).push(f); },
            dispatchEvent(e) { const event = { type: e.type, target: this }; (listeners[e.type] || []).forEach(f => f(event)); if (e.bubbles && this !== container) (container.listeners?.[e.type] || []).forEach(f => f(event)); },
            listeners, removeAttribute() {}, setAttribute() {}, focus() {}, select() {}, remove() {}, appendChild() {}, closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
        };
    };
    const container = make('container');
    for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        const e = make(m[3], m[1].toUpperCase()), attrs = m[2];
        e.type = (attrs.match(/\btype="([^"]*)"/) || [,'text'])[1];
        e.readOnly = /\breadonly\b/i.test(attrs); e.disabled = /\bdisabled\b/.test(attrs);
        e.checked = e.defaultChecked = /\bchecked\b/.test(attrs);
        e.value = e.defaultValue = (attrs.match(/\bvalue="([^"]*)"/) || [,''])[1];
        if (e.tagName === 'SELECT') {
            const body = html.slice(m.index + m[0].length).split('</select>')[0];
            e.options = [...body.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(o => ({ value: (o[1].match(/value="([^"]*)"/) || [,''])[1], text: o[2], defaultSelected: /\bselected\b/.test(o[1]) }));
            e.selectedIndex = Math.max(0, e.options.findIndex(o => o.defaultSelected)); e.value = e.options[e.selectedIndex]?.value || '';
        }
        fields.push(e); nodes.set(e.id, e);
    }
    const get = id => { if (!nodes.has(id)) nodes.set(id, make(id)); return nodes.get(id); };
    global.window = global;
    global.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    global.document = { getElementById: get, querySelector: s => s === '.container' ? container : null,
        querySelectorAll: s => s.includes('input') ? fields : [], createElement: tag => make('', tag.toUpperCase()), body: { appendChild() {} } };
    const copied = [], sent = [], toasts = [], confirms = [];
    global.alert = () => {};
    global.confirm = msg => { confirms.push(msg); return true; };
    Object.defineProperty(global, 'navigator', { configurable: true, value: { clipboard: { async writeText(t) { copied.push(t); } } } });
    global.GoogleSync = { isConfigured: () => true, getFirma: () => '', async send(r) { sent.push(r); } };
    global.GeminiAI = { isConfigured: () => true, async generateNarrative() { return 'IA FICTICIA'; } };
    const mot = new Motility();
    const ui = active = new UI(new Calc(), { validateAll() {} }, null, null, mot);
    ui.showToast = msg => toasts.push(msg);
    // La pantalla real llama a este enlace desde init; no se necesita montar los otros módulos visuales.
    ui._initReportTracking?.();
    const set = (id, value) => { const e = get(id); if (e.type === 'checkbox') e.checked = value; else e.value = String(value); e.dispatchEvent(new Event(e.tagName === 'SELECT' || e.type === 'checkbox' ? 'change' : 'input', { bubbles: true })); };
    const edit = value => { set('resultado', value); ui.reportEdited = true; };
    const flush = () => { if (ui.calculateNow) ui.calculateNow(); else { clearTimeout(ui._calcDebounceTimer); for (const m of ['calculateBSA','calculateLVMassAndGeometry','calculateDiastolicFunction','calculatePSAP','calculateCardiacOutput','calculateRightChambers','evaluarProtesis']) ui[m](); } };
    set('peso', 80); set('altura', 175); set('edad', 65); flush();
    return { ui, mot, get, set, edit, copied, sent, confirms, toasts, flush };
}

test('Generar inmediato usa PP nueva en Lista y Narrativo, sin depender del debounce', async () => {
    for (const mode of ['lista','narrativo']) {
        const p = screen(); p.ui.reportMode = mode; p.set('pp', 16); p.ui.calculateAll();
        await p.ui.generateReport();
        const expected = p.ui.calc.calculateLVMass(46, 16, 9) / p.ui.state.bsa;
        assert.equal(Math.round(p.ui.state.lvMassIndex), Math.round(expected));
        assert.match(p.get('resultado').value, new RegExp(`Masa(?: VI Indexada: | )${Math.round(expected)}`));
        clearTimeout(p.ui._calcDebounceTimer);
    }
});
test('borrar antropometría elimina SC/IMC, masa, indexaciones y CI sin fingir cero', () => {
    const p = screen(); p.set('lvot_diam',20); p.set('lvot_vti',20); p.set('fc',70); p.flush();
    assert.ok(p.ui.state.cardiacOutput.ci > 0); p.set('peso',''); p.flush();
    assert.equal(p.ui.state.bsa,null); assert.equal(p.ui.state.bmi,null); assert.equal(p.ui.state.lvMassIndex,null);
    assert.equal(p.ui.state.cardiacOutput.ci,null); assert.equal(p.get('sc_display').value,'');
});
test('borrar VTI, SIV y Vmax elimina gasto, fenotipo y PSAP previos', () => {
    const p = screen(); p.set('peso',110); p.set('siv',16); p.set('pp',16); p.set('lvot_diam',20); p.set('lvot_vti',20); p.set('fc',70); p.flush();
    assert.equal(p.ui.state.hypertensivePhenotype,true);
    p.set('lvot_vti',''); p.set('siv',''); p.set('vel_it',''); p.flush();
    assert.equal(p.ui.state.cardiacOutput,null); assert.equal(p.ui.state.lvMass,null); assert.equal(p.ui.state.hypertensivePhenotype,false); assert.equal(p.ui.state.psap,null);
    assert.doesNotMatch(p.ui._buildCompactHeader(), /GC:/); assert.doesNotMatch(p.ui._buildNarrativeConclusion(), /fenotipo hipertensivo/i);
});
test('borrar mediciones protésicas no conserva una alerta previa', () => {
    const p = screen(); p.set('prot_check',true); p.set('prot_vmax',4); p.set('prot_gm',40); p.flush(); assert.ok(p.ui.state.protAlert);
    for(const id of ['prot_vmax','prot_gm','prot_vti_pr','prot_vti_tsvi','prot_diam_tsvi'])p.set(id,''); p.flush();
    assert.equal(p.ui.state.protAlert,null);
});
test('Copiar actualiza texto automático tras campos nuevos, sin preguntar', async () => {
    const p = screen(); await p.ui.generateReport(); p.set('fevi',45); await p.ui.copyReport();
    assert.match(p.copied[0],/FEy 45%/); assert.equal(p.confirms.length,0);
});
test('preparar guardado tras preset no mezcla mediciones nuevas y texto viejo', async () => {
    const p = screen(); await p.ui.generateReport(); global.PresetStore = { get: () => ({ campos:{ fevi:35 } }) };
    p.ui.applyPreset('sintetico'); await p.ui.saveStudy(); assert.equal(p.sent.length,1);
    assert.ok(p.sent[0].some(v=>typeof v==='string'&&v.includes('FEy 35%')));
    assert.ok(!p.sent[0].some(v=>typeof v==='string'&&v.includes('FEy 60%')));
});
test('copia y guardado vigentes conservan retoques manuales sin confirmaciones', async () => {
    const p=screen();await p.ui.generateReport();p.edit('INFORME REVISADO');await p.ui.copyReport();await p.ui.saveStudy();
    assert.deepEqual(p.copied,['INFORME REVISADO']);assert.ok(p.sent[0].includes('INFORME REVISADO'));assert.equal(p.confirms.length,0);
});
test('conflicto manual: Cancelar aborta copia/guardado y no reemplaza texto', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL');p.set('fevi',35);p.ui._resolveReportConflict=async()=> 'cancel';
    await p.ui.copyReport();await p.ui.saveStudy();assert.equal(p.copied.length,0);assert.equal(p.sent.length,0);assert.equal(p.get('resultado').value,'MANUAL');
});
test('conflicto manual: conservar revisado sirve una vez, nuevo cambio requiere decisión', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL');p.set('fevi',35);let asked=0;p.ui._resolveReportConflict=async()=>{asked++;return 'keep';};
    await p.ui.copyReport();await p.ui.copyReport();assert.equal(asked,1);assert.equal(p.copied[0],'MANUAL');
    p.set('fevi',30);p.edit('MANUAL MAS NUEVO');await p.ui.saveStudy();assert.equal(asked,2);assert.ok(p.sent[0].includes('MANUAL MAS NUEVO'));
});
test('conflicto manual: regenerar usa campos actuales, y la fila cruda no admite mezcla', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL');p.set('fevi',35);
    assert.throws(()=>p.ui._buildDatasetRow(),/actualiz|pendiente|cambi/i);
    p.ui._resolveReportConflict=async()=> 'regenerate';await p.ui.saveStudy();assert.equal(p.sent.length,1);assert.ok(p.sent[0].some(v=>typeof v==='string'&&v.includes('FEy 35%')));
});
test('cancelar regeneración al cambiar modo mantiene el modo anterior', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL');global.confirm=()=>false;await p.ui.setReportMode('lista');
    assert.equal(p.ui.reportMode,'narrativo');assert.equal(p.get('resultado').value,'MANUAL');
});
test('IA no solicita ni reemplaza si se cancela la pérdida de ediciones', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL');global.confirm=()=>false;let calls=0;GeminiAI.generateNarrative=async()=>{calls++;return 'IA';};
    await p.ui.generateAIReport();assert.equal(calls,0);assert.equal(p.get('resultado').value,'MANUAL');
});
test('IA atrasada no reemplaza modificaciones del texto, datos o motilidad', async () => {
    for (const kind of ['text','data','motion','mode','regenerate']) {
        const p=screen();await p.ui.generateReport();let resolve;GeminiAI.generateNarrative=()=>new Promise(r=>{resolve=r;});
        const running=p.ui.generateAIReport();await Promise.resolve();
        if(kind==='text')p.edit('EDICION DURANTE IA');
        if(kind==='data')p.set('pp',16);
        if(kind==='motion')p.mot.toggleSegment(1);
        if(kind==='mode')await p.ui.setReportMode('lista');
        if(kind==='regenerate')await p.ui.generateReport();
        const current=p.get('resultado').value;resolve('RESPUESTA IA ATRASADA');await running;
        assert.equal(p.get('resultado').value,current,kind);assert.doesNotMatch(p.get('resultado').value,/RESPUESTA IA ATRASADA/);
        clearTimeout(p.ui._calcDebounceTimer);
    }
});
test('fallback de cuota IA tampoco mezcla encabezado viejo con datos nuevos', async () => {
    const p=screen();await p.ui.generateReport();let reject;GeminiAI.generateNarrative=()=>new Promise((_,r)=>{reject=r;});
    const running=p.ui.generateAIReport();p.set('fevi',35);const current=p.get('resultado').value;reject(new Error('429 quota'));await running;assert.equal(p.get('resultado').value,current);
});
test('IA vigente conserva respuesta y prepara encabezado con última medición', async () => {
    const p=screen();p.set('pp',16);await p.ui.generateAIReport();assert.match(p.get('resultado').value,/IA FICTICIA/);
    const mass=Math.round(p.ui.calc.calculateLVMass(46,16,9)/p.ui.state.bsa);assert.match(p.get('resultado').value,new RegExp(`Masa ${mass}`));
    await p.ui.copyReport();assert.match(p.copied[0],/IA FICTICIA/);assert.equal(p.confirms.length,0);
});

test('borradores de minicalculadoras sin inyectar no invalidan texto manual vigente', async () => {
    const p=screen();await p.ui.generateReport();p.edit('MANUAL VIGENTE');let asked=0;p.ui._resolveReportConflict=async()=>{asked++;return 'cancel';};
    for (const id of ['cont_vti_ao','pisa_radio','lanus_longitud','it_pisa_radio'])p.set(id,'40');
    await p.ui.copyReport();assert.equal(asked,0);assert.deepEqual(p.copied,['MANUAL VIGENTE']);
});
// Las extensiones usan la clase global antes de que app.js publique la instancia.
global.UIController=UI; global.window=global;
require('../js/mini-calculators.js');
require('../js/ui-extensions.js');
require('../js/ui-lanus.js');

test('inyectar continuidad inmediatamente después de cambiar peso usa SC actual y sigue su indexación', async () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('cont_diam_tsvi',20);p.set('cont_vti_tsvi',20);p.set('cont_vti_ao',80);p.set('peso',120);
    p.ui.injectAVA();const bsa=p.ui.calc.calculateBodySurface(120,175);const expected=p.ui.miniCalc.calculateContinuity(20,20,80,bsa);
    assert.equal(p.get('ea_ava_index').value,expected.avaIndex);
    p.set('peso',80);await p.ui.generateReport();const expected2=p.ui.miniCalc.calculateContinuity(20,20,80,p.ui.state.bsa);
    assert.equal(p.get('ea_ava_index').value,expected2.avaIndex);
    p.set('peso','');p.flush();assert.equal(p.get('ea_ava_index').value,'');assert.equal(p.get('ea_ava').value,expected.ava);
});
test('una indexación ingresada manualmente no es reemplazada por el seguimiento de inyección', () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('cont_diam_tsvi',20);p.set('cont_vti_tsvi',20);p.set('cont_vti_ao',80);p.ui.injectAVA();
    p.set('ea_ava_index','0.55');p.set('peso',120);p.flush();assert.equal(p.get('ea_ava_index').value,'0.55');
});
test('Lanús inyectado se reindexa al cambiar SC; sin antropometría no inventa índice', () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('lanus_area_4c',20);p.set('lanus_longitud',50);p.ui.injectLanus();
    p.set('peso',120);p.flush();assert.equal(p.get('vol_ai').value,p.ui.miniCalc.calculateLanusAI(20,50,p.ui.state.bsa).volumeIndexed);
    p.set('altura','');p.flush();assert.equal(p.get('vol_ai').value,'');
});
test('aplicar preset cancela seguimiento de indexaciones del estudio anterior', () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('lanus_area_4c',20);p.set('lanus_longitud',50);p.ui.injectLanus();
    global.PresetStore={get:()=>({campos:{vol_ai:25}})};p.ui.applyPreset('sintetico');p.set('peso',120);p.flush();assert.equal(String(p.get('vol_ai').value),'25');
});
test('reinyectar sólo coeficiente no conserva AVA e índice de una medición anterior', () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('cont_diam_tsvi',20);p.set('cont_vti_tsvi',20);p.set('cont_vti_ao',80);p.ui.injectAVA();
    assert.ok(p.get('ea_ava').value);p.set('cont_diam_tsvi','');p.set('cont_vti_ao',160);p.ui.injectAVA();
    assert.equal(p.get('ea_coef').value,'0.13');assert.equal(p.get('ea_ava').value,'');assert.equal(p.get('ea_ava_index').value,'');
    p.set('peso',120);p.flush();assert.equal(p.get('ea_ava_index').value,'');
});
test('editar un índice cancela procedencia aunque se restaure antes del recálculo', () => {
    const p=screen();p.ui.miniCalc=new global.MiniCalculators();p.set('cont_diam_tsvi',20);p.set('cont_vti_tsvi',20);p.set('cont_vti_ao',80);p.ui.injectAVA();
    const original=p.get('ea_ava_index').value;p.set('ea_ava_index','0.55');p.set('ea_ava_index',original);p.set('peso',120);p.flush();assert.equal(p.get('ea_ava_index').value,original);
});
