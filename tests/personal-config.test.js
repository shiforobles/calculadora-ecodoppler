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
        Utilities:{getUuid:()=>'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', formatDate:d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},
        Logger:{log(){}},
        ContentService:{MimeType:{JSON:'json'}, createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
        SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:()=>({getLastRow:()=>2, getDataRange:()=>({getDisplayValues:()=>[['Fecha','IMC'],['1/2/2026','22,6']], getValues:()=>[['Fecha','IMC'],[new Date(2026,1,1),22.6]]})}), getSpreadsheetTimeZone:()=>'America/Argentina/Buenos_Aires'})},
    });
    gas.Date = Date; // mismas fechas que el stub
    vm.runInContext(ctx.GoogleSync.scriptCode(), gas);
    const get = q => vm.runInContext(`doGet(${JSON.stringify({parameter:q})})`, gas);
    assert.equal(get({action:'test'}).message, 'Script activo ✓');
    assert.equal(get({action:'panel', key:'x'}).status, 'denied');   // sin clave creada, nadie lee
    vm.runInContext('crearClavePanel()', gas);
    assert.equal(props.PANEL_KEY.length, 64);
    assert.equal(get({action:'panel'}).status, 'denied');
    assert.equal(get({action:'panel', key:'otra'}).status, 'denied');
    assert.deepEqual(get({action:'panel', key:props.PANEL_KEY}), {status:'ok', headers:['Fecha','IMC'], rows:[['2026-02-01','22,6']]});
});

function loadGoogleSync(extra = {}) {
    const src = fs.readFileSync(path.join(root, 'js/google-sync.js'), 'utf8');
    const storage = fs.readFileSync(path.join(root, 'js/study-storage.js'), 'utf8');
    const store = {};
    const ctx = vm.createContext({ window:{}, URL, AbortController, setTimeout, clearTimeout,
        localStorage:{getItem:k=>store[k] ?? null, setItem:(k,v)=>{store[k]=String(v);}}, ...extra });
    vm.runInContext(storage + '; window.StudyStorage = StudyStorage;' + src + '; this.GoogleSync = GoogleSync;', ctx);
    return ctx;
}
function fakeSheet() {
    const cells = [];   // filas de la planilla ficticia
    const sheet = {
        getLastRow:()=>cells.length, getLastColumn:()=>Math.max(0, ...cells.map(r=>r.length)),
        appendRow:row=>{ cells.push([...row]); },
        setFrozenRows(){},
        getRange:(r,c,nr=1)=>({
            setFontWeight(){return this;}, setBackground(){return this;}, setFontColor(){return this;},
            getValue:()=>cells[r-1]?.[c-1] ?? '', setValue:v=>{ while(cells[r-1].length<c) cells[r-1].push(''); cells[r-1][c-1]=v; },
            createTextFinder:text=>({matchEntireCell(){return this;}, findNext:()=>cells.slice(r-1,r-1+nr).some(row=>row[c-1]===text) ? {} : null}),
        }),
    };
    const gas = vm.createContext({
        LockService:{getScriptLock:()=>({waitLock(){}, releaseLock(){}})},
        PropertiesService:{getScriptProperties:()=>({getProperty:()=>null})},
        ContentService:{MimeType:{JSON:'json'}, createTextOutput:t=>({setMimeType:()=>JSON.parse(t)})},
        SpreadsheetApp:{flush(){}, getActiveSpreadsheet:()=>({getSheetByName:()=>sheet})},
    });
    return {cells, gas};
}

test('Apps Script: guarda decimales como número, confirma y no duplica reintentos', () => {
    const ctx = loadGoogleSync();
    const {cells, gas} = fakeSheet();
    vm.runInContext(ctx.GoogleSync.scriptCode(), gas);
    const H = vm.runInContext('HEADERS', gas);
    assert.equal(H.at(-1), 'ID Estudio');
    assert.equal(H.at(-2), 'Institución');
    const row = H.slice(0, -1).map(() => '-');
    row[H.indexOf('HC')] = '00123'; row[H.indexOf('IMC')] = '22.6'; row[H.indexOf('SC')] = '1.64';
    row[H.indexOf("E/e'")] = '29.6 (no válido — MAC)'; row[H.indexOf('FEy')] = '60';
    row[H.indexOf('Observaciones')] = '12.5'; row[H.indexOf('Institución')] = 'CENTRO FICTICIO';
    const post = body => vm.runInContext(`doPost(${JSON.stringify({postData:{contents:JSON.stringify(body)}})})`, gas);
    assert.deepEqual(post({action:'save', row, studyId:'E-1'}), {status:'ok', studyId:'E-1', duplicate:false});
    assert.equal(cells.length, 2);                                   // encabezado + estudio
    const saved = cells[1];
    assert.strictEqual(saved[H.indexOf('IMC')], 22.6);               // número, no texto que la planilla lea como fecha
    assert.strictEqual(saved[H.indexOf('SC')], 1.64);
    assert.strictEqual(saved[H.indexOf('FEy')], 60);
    assert.strictEqual(saved[H.indexOf('HC')], '00123');             // la HC no se toca
    assert.strictEqual(saved[H.indexOf('Observaciones')], '12.5');   // texto libre no se toca
    assert.strictEqual(saved[H.indexOf("E/e'")], '29.6 (no válido — MAC)');
    assert.strictEqual(saved[H.indexOf('Institución')], 'CENTRO FICTICIO');
    assert.strictEqual(saved[H.indexOf('ID Estudio')], 'E-1');
    assert.deepEqual(post({action:'save', row, studyId:'E-1'}), {status:'ok', studyId:'E-1', duplicate:true});
    assert.equal(cells.length, 2);                                   // el reintento no agregó fila
    assert.equal(post({action:'save', row, studyId:'E-2'}).duplicate, false);
    assert.equal(cells.length, 3);
    assert.equal(post({action:'save', studyId:'E-3'}).status, 'error'); // sin fila: error controlado
    assert.equal(cells.length, 3);
});
test('Apps Script: en una planilla vieja agrega el título de la columna ID sin tocar el resto', () => {
    const ctx = loadGoogleSync();
    const {cells, gas} = fakeSheet();
    cells.push(['Fecha', 'HC- Nombre y Apellido']);                  // encabezado propio y más corto
    vm.runInContext(ctx.GoogleSync.scriptCode(), gas);
    const H = vm.runInContext('HEADERS', gas);
    vm.runInContext(`doPost(${JSON.stringify({postData:{contents:JSON.stringify({row:['1/1/2026','FICTICIO'], studyId:'E-9'})}})})`, gas);
    assert.equal(cells[0][1], 'HC- Nombre y Apellido');
    assert.equal(cells[0][H.length - 1], 'ID Estudio');
    assert.equal(cells[1][H.length - 1], 'E-9');
});
test('guardado: solo se da por confirmado con el acuse del script', async () => {
    const answers = [];
    const ctx = loadGoogleSync({ fetch: async (url, opt) => { const a = answers.shift(); if (a instanceof Error) throw a; return a; } });
    ctx.localStorage.setItem('ecodoppler_script_url', 'https://script.google.com/macros/s/FICTICIO/exec');
    const send = () => vm.runInContext("GoogleSync.send(['FICTICIO'], 'E-1')", ctx);
    answers.push({json:async()=>({status:'ok', studyId:'E-1', duplicate:false})});
    assert.deepEqual({...await send()}, {confirmed:true, duplicate:false});
    answers.push({json:async()=>({status:'ok', duplicate:true})});
    assert.deepEqual({...await send()}, {confirmed:true, duplicate:true});
    answers.push(new TypeError('Failed to fetch'));                  // sin respuesta legible: no se afirma nada
    assert.deepEqual({...await send()}, {confirmed:false});
    answers.push({json:async()=>{ throw new SyntaxError('html'); }});
    assert.deepEqual({...await send()}, {confirmed:false});
    answers.push({json:async()=>({status:'error', msg:'planilla llena'})});
    await assert.rejects(send(), /planilla llena/);
});
test('instituciones: lista propia en el navegador, sin nombres en el código', () => {
    const ctx = loadGoogleSync();
    const G = ctx.GoogleSync;
    assert.equal(vm.runInContext('GoogleSync.getInstituciones().length', ctx), 0);
    vm.runInContext("GoogleSync.setInstituciones(' Centro A \\n\\nCentro B\\nCentro A'); GoogleSync.setInstitucion('Centro B')", ctx);
    assert.equal(vm.runInContext('GoogleSync.getInstituciones().join("|")', ctx), 'Centro A|Centro B');
    assert.equal(vm.runInContext('GoogleSync.getInstitucion()', ctx), 'Centro B');
    vm.runInContext("GoogleSync.setInstituciones('Centro A')", ctx);
    assert.equal(vm.runInContext('GoogleSync.getInstitucion()', ctx), '');   // la que se quitó de la lista ya no se guarda
    const code = fs.readFileSync(path.join(root, 'index.html'), 'utf8') + fs.readFileSync(path.join(root, 'js/ui-controller.js'), 'utf8');
    assert.doesNotMatch(code, /OSECAC|Hospital Español|Bioim[aá]genes|La Esperanza/i);
});
