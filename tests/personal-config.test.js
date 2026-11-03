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
