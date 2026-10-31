const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/print-preview');
const store = () => { const values = new Map(); return { values, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; };
test('Genérico inicial y preferencia sin datos de perfiles ni pacientes', () => {
    const { state, error } = P.load(store());
    assert.equal(error, false);
    assert.deepEqual(state, { schemaVersion: 2, defaultProfileId: 'generic' });
});
test('Persistencia explícita solo de plantilla, sin datos personales ni estudios', () => {
    const s = store();
    assert.equal(P.save(s, { defaultProfileId: 'hospital', patient: 'NO-GUARDAR', report: 'NO-GUARDAR', profiles: { generic: { professional: 'NO-GUARDAR' } } }), true);
    assert.deepEqual(JSON.parse(s.getItem(P.STORAGE_KEY)), { schemaVersion: 2, defaultProfileId: 'hospital' });
    assert.equal(P.load(s).state.defaultProfileId, 'hospital'); assert.equal(s.values.size, 1);
});
test('JSON inválido, versión incompatible y almacenamiento bloqueado no impiden imprimir', () => {
    for (const value of ['{', '{"schemaVersion":1}']) {
        assert.equal(P.load({ getItem: () => value }).error, true);
        assert.equal(P.load({ getItem: () => value }).state.defaultProfileId, 'generic');
    }
    const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); } };
    assert.equal(P.load(blocked).error, true); assert.equal(P.save(blocked, {}), false);
    assert.equal(P.load(null).state.defaultProfileId, 'generic');
});
test('Configuraciones antiguas o inyectadas no pueden modificar las plantillas', () => {
    assert.deepEqual(P.cleanState({ defaultProfileId: 'otra', profiles: { hospital: { professional: 'AJENO', logoLeft: 'https://example.test/' } } }), { schemaVersion: 2, defaultProfileId: 'generic' });
    assert.equal(P.load({ getItem: () => '{"schemaVersion":1,"profiles":{"generic":{"professional":"AJENO"}}}' }).error, true);
});
test('Ocultar solo separador automático; todos los caracteres originales permanecen', () => {
    const header = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n' + '='.repeat(80) + '\n';
    const text = header + 'Texto manual á ≤ ≥ <script>literal</script>\n' + '='.repeat(80);
    const parts = P.reportParts(text); assert.equal(parts.length, 3); assert.equal(parts.join(''), text);
    for (const manual of ['Nota\n' + header, '== Nota manual ==', 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n====\nNota']) assert.deepEqual(P.reportParts(manual), [manual]);
});

test('Fecha local: no adelantar el día al pasar medianoche UTC y respetar el cambio de año', () => {
    const { execFileSync } = require('node:child_process');
    for (const [instant, expected] of [['2026-10-30T01:30:00Z', '2026-10-29'], ['2026-10-30T03:01:00Z', '2026-10-30'], ['2027-01-01T01:00:00Z', '2026-12-31']]) {
        const script = `const P=require(${JSON.stringify(require.resolve('../js/print-preview'))}); process.stdout.write(P.localStudyDate(new Date(${JSON.stringify(instant)})));`;
        const value = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: 'America/Argentina/Buenos_Aires' }, encoding: 'utf8' });
        assert.equal(value, expected);
    }
});
