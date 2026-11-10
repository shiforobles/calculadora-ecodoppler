const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('dashboard sin configuración no consulta Sheets ni contiene estudios incrustados', async () => {
    const html = fs.readFileSync(path.join(root, 'dashboard_ecodoppler.html'), 'utf8');
    assert.match(html, /window.SEED_STUDIES = \[\];/);
    assert.doesNotMatch(html, /2PACX-|Dr\. Robles|Dr\. Lucas/);
    const calls = [];
    const context = vm.createContext({ window:{}, localStorage:{getItem:()=>null}, document:{getElementById:()=>({})}, fetch:async url=>calls.push(url), actualizarContador:()=>{}, Date });
    const layer = html.slice(html.indexOf("const STORE_KEY"), html.indexOf('function saveImported'));
    vm.runInContext(layer, context);
    assert.equal(await vm.runInContext('fetchSheet()', context), false);
    assert.deepEqual(calls, []);
    assert.equal(vm.runInContext('mergeStudies(); STUDIES.length', context), 0);
});
test('dashboard mantiene estudios locales existentes sin fuente remota', () => {
    const html = fs.readFileSync(path.join(root, 'dashboard_ecodoppler.html'), 'utf8');
    const saved = [{'HC- Nombre y Apellido':'TEST FICTICIO', Fecha:'2026-01-01'}];
    const context = vm.createContext({window:{},localStorage:{getItem:key=>key==='ecodash_studies'?JSON.stringify(saved):null},parseDate:()=>null});
    const layer = html.slice(html.indexOf('const STORE_KEY'), html.indexOf('// Parser CSV'));
    vm.runInContext(layer, context);
    assert.equal(vm.runInContext('mergeStudies(); STUDIES.length', context), 1);
});

function panelContext(store, respond) {
    const html = fs.readFileSync(path.join(root, 'dashboard_ecodoppler.html'), 'utf8');
    const calls = [], estados = [];
    const context = vm.createContext({
        window:{}, URL, console:{warn(){}}, Date, encodeURIComponent,
        localStorage:{getItem:key=>store[key] ?? null},
        document:{getElementById:()=>({})},
        fetch:async url=>{ calls.push(url); return respond(url); },
        actualizarContador:estado=>estados.push(estado),
    });
    vm.runInContext(html.slice(html.indexOf('const STORE_KEY'), html.indexOf('function saveImported')), context);
    return {context, calls, estados};
}
const SCRIPT = 'https://script.google.com/macros/s/FICTICIO/exec';

test('panel con clave: lee los estudios del Apps Script y no usa el CSV publicado', async () => {
    const {context, calls} = panelContext(
        {ecodoppler_script_url:SCRIPT, ecodoppler_panel_key:'clave ficticia', ecodoppler_sheet_csv_url:'https://example.com/pub?output=csv'},
        async () => ({ok:true, json:async()=>({status:'ok', headers:['Fecha','HC- Nombre y Apellido',''], rows:[['2026-01-01',' TEST FICTICIO ','x'],['','','']]})}));
    assert.equal(await vm.runInContext('fetchSheet()', context), true);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].startsWith(SCRIPT + '?action=panel&key=clave%20ficticia&_t='));
    assert.equal(vm.runInContext('JSON.stringify(SHEET_ROWS)', context), JSON.stringify([{Fecha:'2026-01-01','HC- Nombre y Apellido':'TEST FICTICIO'}]));
});
test('panel con clave: clave rechazada o script viejo avisan sin cargar datos', async () => {
    for (const [body, estado] of [[{status:'denied'}, 'clave'], [{status:'ok', message:'Script activo'}, 'script']]) {
        const {context, estados} = panelContext({ecodoppler_script_url:SCRIPT, ecodoppler_panel_key:'k'}, async () => ({ok:true, json:async()=>body}));
        assert.equal(await vm.runInContext('fetchSheet()', context), false);
        assert.equal(estados.at(-1), estado);
        assert.equal(vm.runInContext('SHEET_ROWS.length', context), 0);
    }
});
test('panel con clave: la clave nunca se envía a una URL que no sea de Apps Script', async () => {
    const {context, calls} = panelContext({ecodoppler_script_url:'https://example.com/macros/s/X/exec', ecodoppler_panel_key:'k'}, async () => ({ok:true}));
    assert.equal(await vm.runInContext('fetchSheet()', context), false);
    assert.deepEqual(calls, []);
});
test('código de Apps Script: la lectura del panel exige la clave guardada', () => {
    const src = fs.readFileSync(path.join(root, 'js/google-sync.js'), 'utf8');
    const ctx = vm.createContext({window:{}});
    vm.runInContext(src + '; this.GoogleSync = GoogleSync;', ctx);
    const props = {};
    const gas = vm.createContext({
        PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k] ?? null, setProperty:(k,v)=>{props[k]=v;}})},
        Utilities:{getUuid:()=>'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'},
        Logger:{log(){}},
        ContentService:{MimeType:{JSON:'json'}, createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
        SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>({getLastRow:()=>2, getDataRange:()=>({getDisplayValues:()=>[['Fecha'],['2026-01-01']]})})})},
    });
    vm.runInContext(ctx.GoogleSync.scriptCode(), gas);
    const get = q => vm.runInContext(`doGet(${JSON.stringify({parameter:q})})`, gas);
    assert.equal(get({action:'test'}).message, 'Script activo ✓');
    assert.equal(get({action:'panel', key:'x'}).status, 'denied');   // sin clave creada, nadie lee
    vm.runInContext('crearClavePanel()', gas);
    assert.equal(props.PANEL_KEY.length, 64);
    assert.equal(get({action:'panel'}).status, 'denied');
    assert.equal(get({action:'panel', key:'otra'}).status, 'denied');
    assert.deepEqual(get({action:'panel', key:props.PANEL_KEY}), {status:'ok', headers:['Fecha'], rows:[['2026-01-01']]});
});
