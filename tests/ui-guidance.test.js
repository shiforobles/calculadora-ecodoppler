const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../js/ui-guidance');
test('Semáforo AI conserva los límites actuales del informe y distingue datos ausentes', () => {
    for (const [raw, level] of [['', 'neutral'], ['0', 'neutral'], ['-1', 'neutral'], ['no', 'neutral'], ['28','normal'], ['33.9','normal'], ['34','mild'], ['41.9','mild'], ['42','moderate'], ['48','moderate'], ['48.1','severe']]) assert.equal(G.atrialStatus(raw).level, level, raw);
});
test('Abrir desempate solo cuando el resultado actual pide parámetros secundarios', () => {
    const data = { additional: [] };
    assert.deepEqual(G.reasons({ description: 'Esperando datos Doppler...', severity:'neutral' }, data), []);
    assert.deepEqual(G.reasons({ description: 'FA: Datos insuficientes para clasificar presiones de llenado.', severity:'yellow' }, data), []);
    assert.equal(G.reasons({ description: 'Datos insuficientes de parámetros secundarios (LARS, V. Pulmonares, LAVi).' }, data)[0].key, 'secondary');
});
test('Contextos explícitos, parámetros presentes y sugerencias no modifican los datos recibidos', () => {
    const data = { ctx_mac: true, ctx_bcri:false, ctx_im:false, conduction:'bcri', mitralRegurgitation:'severa', mitralProsthesis:true, additional:['td'] };
    const original = JSON.stringify(data);
    assert.deepEqual(G.reasons(null,data).map(x=>x.key), ['contexts:MAC','bcri','im','prosthesis','additional:td']);
    assert.equal(JSON.stringify(data), original);
});
