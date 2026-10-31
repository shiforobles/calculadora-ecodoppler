const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'eco-rapido.html'), 'utf8');

function pantalla() {
    const elements = new Map();
    function element(id, attrs = '') {
        const listeners = {};
        const classes = new Set();
        return { id, value: '', textContent: '', hidden: /\bhidden\b/.test(attrs), style: {}, dataset: {},
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { on ? classes.add(c) : classes.delete(c); } },
            addEventListener(type, fn) { listeners[type] = fn; },
            async fire(type) { return listeners[type]?.({ target: this }); },
            select() {}, setAttribute() {}, querySelectorAll() { return []; } };
    }
    for (const m of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) elements.set(m[1], element(m[1], m[0]));
    const groups = [...html.matchAll(/<div class="opts" data-campo="([^"]+)">([\s\S]*?)<\/div>/g)].map(m => {
        const group = element(); group.dataset.campo = m[1];
        const buttons = [...m[2].matchAll(/data-val="([^"]+)"/g)].map(b => {
            const el = element(); el.dataset.val = b[1]; const attrs = {};
            el.setAttribute = (k, v) => { attrs[k] = v; }; el.getAttribute = k => attrs[k]; return el;
        });
        group.querySelectorAll = () => buttons; return group;
    });
    const copied = []; const confirmations = []; let allowConfirmation = true;
    const context = { document: { getElementById: id => elements.get(id), querySelectorAll: sel => sel === '.opts' ? groups : sel === 'input' ? ['p_nombre','p_peso','p_talla','fey','trombo_texto'].map(id => elements.get(id)) : [], execCommand() { throw Error('unexpected fallback'); } },
        QuickReport: require('../js/quick-report.js'), navigator: { clipboard: { async writeText(t) { copied.push(t); } } },
        confirm: msg => { confirmations.push(msg); return allowConfirmation; }, setTimeout: () => 1, clearTimeout() {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'js/eco-rapido.js'), 'utf8'), context);
    const get = id => { assert.ok(elements.has(id), `Falta UI ${id}`); return elements.get(id); };
    return { get, copied, confirmations, denyConfirmation() { allowConfirmation = false; }, click: id => get(id).fire('click'), async input(id, value) { get(id).value = value; await get(id).fire('input'); }, async option(campo, value) { const g = groups.find(g => g.dataset.campo === campo); await g.querySelectorAll().find(b => b.dataset.val === value).fire('click'); } };
}

test('default FEy 60 y copia actualizada sin decisión', async () => {
    const p = pantalla(); assert.equal(p.get('fey').value, 60); assert.match(p.get('informe').value, /FEy 60%/);
    await p.click('btn_copiar'); assert.equal(p.copied.length, 1); assert.deepEqual(p.confirmations, []);
});
test('edición previa: preserva manual, avisa y bloquea copia hasta decisión; cancelar aborta', async () => {
    const p = pantalla(); await p.input('informe', 'Texto manual'); await p.input('fey', '35');
    assert.equal(p.get('informe').value, 'Texto manual'); assert.equal(p.get('informe_estado').hidden, false);
    assert.match(p.get('informe_estado').textContent, /desactualizado/i);
    await p.click('btn_copiar'); assert.equal(p.copied.length, 0); assert.equal(p.get('informe_conflicto').hidden, false);
    await p.click('btn_cancelar_copia'); assert.equal(p.copied.length, 0); assert.equal(p.get('informe').value, 'Texto manual');
});
test('regenerar usa mediciones actuales sin limpiar formulario y resuelve conflicto', async () => {
    const p = pantalla(); await p.input('p_nombre', 'Paciente'); await p.input('informe', 'Manual'); await p.input('fey', '35');
    await p.option('vi.tamano', 'moderada'); await p.click('btn_regenerar');
    assert.match(p.get('informe').value, /FEy 35%/); assert.match(p.get('informe').value, /moderadamente dilatado/);
    assert.equal(p.get('p_nombre').value, 'Paciente'); assert.equal(p.get('fey').value, '35');
    await p.click('btn_copiar'); assert.equal(p.copied.length, 1); assert.equal(p.get('informe_estado').hidden, true);
});
test('conservar explícitamente revisado permite copia y un cambio posterior exige otra decisión', async () => {
    const p = pantalla(); await p.input('informe', 'Manual'); await p.input('fey', '35'); await p.click('btn_copiar');
    await p.click('btn_conservar'); assert.deepEqual(p.copied, ['Manual']);
    await p.input('informe', 'Revisión posterior'); await p.click('btn_copiar'); assert.equal(p.copied.length, 2);
    await p.input('fey', '30'); await p.click('btn_copiar'); assert.equal(p.copied.length, 2);
    assert.equal(p.get('informe_conflicto').hidden, false);
});
test('escribir después del cambio pendiente no lo valida automáticamente', async () => {
    const p = pantalla(); await p.input('informe', 'Manual'); await p.input('fey', '35');
    await p.input('informe', 'Manual corregido'); await p.click('btn_copiar'); assert.equal(p.copied.length, 0);
    await p.click('btn_regenerar_conflicto'); assert.equal(p.copied.length, 1); assert.match(p.copied[0], /FEy 35%/);
});
test('editar después de actualización automática queda vigente hasta próximo cambio', async () => {
    const p = pantalla(); await p.input('fey', '35'); await p.input('informe', 'Revisado');
    await p.click('btn_copiar'); assert.deepEqual(p.copied, ['Revisado']);
    await p.option('pericardio', 'leve'); await p.click('btn_copiar'); assert.equal(p.copied.length, 1);
});
test('limpiar reinicia también edición y conflicto', async () => {
    const p = pantalla(); await p.input('informe', 'Manual'); await p.input('fey', '35'); await p.click('btn_copiar');
    await p.click('btn_limpiar'); assert.equal(p.get('fey').value, 60); assert.equal(p.get('informe_conflicto').hidden, true);
    await p.input('fey', '45'); assert.match(p.get('informe').value, /FEy 45%/); await p.click('btn_copiar'); assert.equal(p.copied.length, 1);
});
test('borrar FEy no conserva el valor previo ni informa cero', async () => {
    const p = pantalla(); await p.input('fey', '35'); assert.match(p.get('informe').value, /FEy 35%/);
    await p.input('fey', ''); assert.doesNotMatch(p.get('informe').value, /FEy (35|0)%/);
});
test('volver a ingresar la FEy inicial sin cambiar su valor no pide revisión', async () => {
    const p = pantalla(); await p.input('informe','Manual vigente'); await p.input('fey','60');
    await p.click('btn_copiar'); assert.deepEqual(p.copied,['Manual vigente']);
});
test('cancelar regeneración explícita mantiene texto manual y formulario', async () => {
    const p = pantalla(); await p.input('informe','Manual'); await p.input('fey','35');p.denyConfirmation();
    await p.click('btn_regenerar');assert.equal(p.get('informe').value,'Manual');assert.equal(p.get('fey').value,'35');
});
