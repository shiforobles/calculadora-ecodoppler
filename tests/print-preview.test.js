const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/print-preview');
const store = () => { const values = new Map(); return { values, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; };
test('Genérico inicial sin datos personales', () => {
    const { state, error } = P.load(store());
    assert.equal(error, false); assert.equal(state.defaultProfileId, 'generic');
    for (const p of Object.values(state.profiles)) { assert.equal(p.professional, ''); assert.equal(p.registration, ''); }
    assert.equal(state.profiles.generic.institution, '');
});
test('Persistencia de perfil explícita y lista permitida sin datos de estudios', () => {
    const s = store(); const state = P.load(s).state; state.defaultProfileId = 'hospital';
    state.patient = 'NO-GUARDAR'; state.profiles.hospital.report = 'NO-GUARDAR'; state.profiles.hospital.professional = 'Profesional ficticio';
    assert.equal(P.save(s, state), true);
    const saved = s.getItem(P.STORAGE_KEY); assert.equal(saved.includes('NO-GUARDAR'), false);
    assert.equal(P.load(s).state.defaultProfileId, 'hospital');
    assert.equal(P.load(s).state.profiles.hospital.professional, 'Profesional ficticio'); assert.equal(s.values.size, 1);
});
test('JSON inválido, versión incompatible y almacenamiento bloqueado no impiden imprimir', () => {
    for (const value of ['{', '{"schemaVersion":2}']) {
        assert.equal(P.load({ getItem: () => value }).error, true);
        assert.equal(P.load({ getItem: () => value }).state.defaultProfileId, 'generic');
    }
    const blocked = { getItem() { throw Error(); }, setItem() { throw Error(); } };
    assert.equal(P.load(blocked).error, true); assert.equal(P.save(blocked, {}), false);
    assert.equal(P.load(null).state.defaultProfileId, 'generic');
});
test('No admitir URLs remotas, SVG ni campos ajenos en logos persistidos', () => {
    for (const logoLeft of ['https://example.test/paciente', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,' + 'a'.repeat(500000)]) {
        const state = P.cleanState({ profiles: { hospital: { logoLeft, patient: 'NO' } } });
        assert.equal(state.profiles.hospital.logoLeft, ''); assert.equal('patient' in state.profiles.hospital, false);
    }
});
test('Ocultar solo separador automático; todos los caracteres originales permanecen', () => {
    const header = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n' + '='.repeat(80) + '\n';
    const text = header + 'Texto manual á ≤ ≥ <script>literal</script>\n' + '='.repeat(80);
    const parts = P.reportParts(text); assert.equal(parts.length, 3); assert.equal(parts.join(''), text);
    for (const manual of ['Nota\n' + header, '== Nota manual ==', 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n====\nNota']) assert.deepEqual(P.reportParts(manual), [manual]);
});
