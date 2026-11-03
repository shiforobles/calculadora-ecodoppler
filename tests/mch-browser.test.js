/** MCH en el navegador, con datos ficticios y sin red. Requiere Playwright. */
const { test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
let available = false; try { require.resolve('playwright'); available = true; } catch {}
const options = { skip: !available && 'Requiere Playwright; ejecutar con las dependencias del navegador' };

const set = (page, id, value) => page.evaluate(({ id, value }) => {
    const e = document.getElementById(id);
    if (e.type === 'checkbox') e.checked = value; else e.value = value;
    e.dispatchEvent(new Event(e.tagName === 'SELECT' || e.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
    window.UIController.calculateNow();
}, { id, value });
const report = (page, mode) => page.evaluate(async mode => {
    const ui = window.UIController; ui.reportMode = mode; ui.qc = null;
    await ui.generateReport({ confirmEdits: false });
    return document.getElementById('resultado').value;
}, mode);

const CASO = {
    siv: '21', pp: '10', fevi: '68', onda_e: '96', onda_a: '60', onda_e_prime_septal: '5', onda_e_prime_lateral: '7',
    vel_it: '3.0', vol_ai: '41', im_grado: 'moderada',
};
const MCH_CAMPOS = {
    mch_thickness: '21', mch_location: 'septum basal', mch_pattern: 'septal asimétrica', mch_sam: 'contacto',
    mch_rest: '18', mch_valsalva: '62', mch_apical: 'no', mch_jet: 'posterior',
};
async function cargar(page, valores) { for (const [id, v] of Object.entries(valores)) await set(page, id, v); }

test('MCH: seis informes sin MCH idénticos a la versión anterior', options, async () => {
    const { open, scenarios } = require('./helpers/mch-browser.cjs'); const { browser, page, errors } = await open();
    try {
        assert.deepEqual(await scenarios(page), JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/mch-without-baseline.json'))));
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});

test('MCH: Lista y Narrativo del caso aprobado, Sheets y FA', options, async () => {
    const { open, out } = require('./helpers/mch-browser.cjs'); const { browser, page, errors } = await open();
    try {
        assert.equal(await page.locator('#mch_section').isVisible(), false);
        await cargar(page, CASO);
        const sinMch = { lista: await report(page, 'lista'), narrativo: await report(page, 'narrativo') };

        await set(page, 'ctx_mcp', true);
        assert.equal(await page.locator('#mch_section').isVisible(), true);
        await cargar(page, MCH_CAMPOS);
        assert.equal(await page.evaluate(() => window.UIController.state.diastolicResult.mch.result), 'elevada');
        assert.match(await page.textContent('#mch_summary'), /Resultado automático: Presiones de llenado del VI elevadas según criterios para MCH \(3 de 3/);

        const lista = await report(page, 'lista');
        assert.match(lista, /Función Sistólica: FEy 68%/);
        assert.match(lista, /MCH: Hipertrofia septal asimétrica, espesor máximo 21 mm \(septum basal\), relación septo\/PP 2\.1\. SAM con contacto septal\. IM de jet posterior\. Sin aneurisma apical\./);
        assert.match(lista, /TSVI: gradiente pico 18 mmHg en reposo; 62 mmHg con Valsalva\./);
        assert.match(lista, /Diástole \(criterios MCH\): E\/e′ promedio 16 \(>14\); Vmax IT 3\.0 m\/s \(>2\.8\); Vol\. AI 41 mL\/m² \(>34\)\./);
        assert.match(lista, /\d\. Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable, hemodinámicamente significativa \(gradiente pico del TSVI de 18 mmHg en reposo y de 62 mmHg con Valsalva\), con SAM y contacto septal\. Función sistólica del VI conservada\./);
        assert.match(lista, /\d\. Presiones de llenado del VI elevadas según criterios para MCH \(3 de 3 positivos: E\/e′ promedio 16 >14; Vmax IT 3\.0 m\/s >2\.8; Vol\. AI 41 mL\/m² >34\)\. En presencia de insuficiencia mitral moderada/);
        assert.doesNotMatch(lista, /Disfunción Diastólica Grado|Función Diastólica Normal/);

        const narr = await report(page, 'narrativo');
        assert.match(narr, /Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable, hemodinámicamente significativa\. En ritmo sinusal, el ventrículo izquierdo/);
        assert.match(narr, /función sistólica global preservada \(FEy 68%\)\. El espesor parietal máximo es de 21 mm a nivel del septum basal/);
        assert.match(narr, /aumenta a 62 mmHg con la maniobra de Valsalva\./);
        assert.match(narr, /La función diastólica se evaluó con criterios específicos para miocardiopatía hipertrófica: E\/e′ promedio de 16/);
        assert.doesNotMatch(narr, /se identifica disfunción diastólica grado/);
        assert.doesNotMatch(narr, /espesores parietales conservados/);
        assert.match(narr, /En síntesis, hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable, hemodinámicamente significativa \(gradiente pico del TSVI de 18 mmHg en reposo y de 62 mmHg con Valsalva\), con movimiento anterior sistólico mitral con contacto septal y función sistólica global preservada \(FEy 68%\)\. Presiones de llenado del ventrículo izquierdo elevadas según los criterios específicos para miocardiopatía hipertrófica \(3 de 3 criterios positivos\)\./);
        assert.match(narr, /el ventrículo izquierdo presenta diámetros conservados/);
        if (out) fs.writeFileSync(path.join(out, 'mch-informes.txt'), `LISTA\n\n${lista}\n\nNARRATIVO\n\n${narr}\n`);

        // Guardado: una columna más al final, con los datos de MCH
        const row = await page.evaluate(() => window.UIController._buildDatasetRow());
        assert.equal(await page.evaluate(() => window.StudyStorage.HEADERS.length), row.length);
        const json = JSON.parse(row.at(-1));
        assert.equal(json.version, 1); assert.equal(json.valsalva, '62'); assert.equal(json.presionAI, 'elevada');

        // FA: la diástole vuelve al algoritmo de FA de la app; la morfología MCH se mantiene
        await set(page, 'ritmo', 'fa');
        assert.notEqual(await page.evaluate(() => window.UIController.state.diastolicResult.grade), 'MCH');
        const listaFA = await report(page, 'lista');
        assert.match(listaFA, /Hallazgos compatibles con miocardiopatía hipertrófica/);
        assert.doesNotMatch(listaFA, /criterios para MCH/);
        await set(page, 'ritmo', 'sinusal');

        // Destildar MCH: el informe vuelve a ser exactamente el de antes
        await set(page, 'ctx_mcp', false);
        assert.equal(await page.locator('#mch_section').isVisible(), false);
        assert.equal(await report(page, 'lista'), sinMch.lista);
        assert.equal(await report(page, 'narrativo'), sinMch.narrativo);
        assert.equal(await page.evaluate(() => window.UIController._buildDatasetRow().at(-1)), '-');

        // Teléfono: sin desborde horizontal
        await set(page, 'ctx_mcp', true);
        await page.setViewportSize({ width: 375, height: 812 });
        await page.locator('#mch_section').scrollIntoViewIfNeeded();
        // Solo la caja MCH: la fila de botones rápidos de IM ya desbordaba en main (no es de este módulo)
        assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#mch_section *')]
            .filter(e => e.getClientRects().length && e.getBoundingClientRect().right > window.innerWidth + 1).map(e => e.id || e.tagName)), []);
        if (out) await page.locator('#mch_section').screenshot({ path: path.join(out, 'mch-telefono.png') });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});

test('MCH: Borrar todo, Deshacer y presets', options, async () => {
    const { open, out } = require('./helpers/mch-browser.cjs'); const { browser, page, errors } = await open();
    try {
        await cargar(page, CASO); await set(page, 'ctx_mcp', true); await cargar(page, MCH_CAMPOS);
        if (out) await page.locator('#mch_section').screenshot({ path: path.join(out, 'mch-caja.png') });

        await page.evaluate(() => window.UIController.resetAll());
        assert.equal(await page.locator('#mch_section').isVisible(), false);
        assert.equal(await page.inputValue('#mch_valsalva'), '');

        await page.locator('#undo-reset button').click();
        assert.equal(await page.locator('#mch_section').isVisible(), true);
        assert.equal(await page.inputValue('#mch_valsalva'), '62');
        assert.equal(await page.evaluate(() => window.UIController.state.diastolicResult.mch?.result), 'elevada');

        // Los presets no guardan ni aplican campos de MCH (son de cada paciente)
        const campos = await page.evaluate(() => window.UIController._camposDePreset());
        assert.equal(Object.keys(campos).some(k => k.startsWith('mch_')), false);
        await page.evaluate(() => {
            const ui = window.UIController; const old = window.PresetStore.get;
            window.PresetStore.get = () => ({ campos: { mch_valsalva: '99', mch_rest: '99' } });
            ui.applyPreset('ficticio'); window.PresetStore.get = old; ui.calculateNow();
        });
        // Aplicar un preset arranca un estudio nuevo: los campos MCH quedan vacíos, no con los del preset
        assert.equal(await page.inputValue('#mch_valsalva'), '');
        assert.equal(await page.inputValue('#mch_rest'), '');
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});

test('MCH: el patrón se autocompleta sin pisar una elección manual', options, async () => {
    const { open } = require('./helpers/mch-browser.cjs'); const { browser, page, errors } = await open();
    try {
        await cargar(page, { siv: '9', pp: '9', ctx_mcp: true, mch_thickness: '17', mch_location: 'septum basal' });
        assert.equal(await page.inputValue('#mch_pattern'), 'septal asimétrica');
        await set(page, 'mch_location', 'ápex');
        assert.equal(await page.inputValue('#mch_pattern'), 'apical');
        await set(page, 'mch_location', 'pared lateral');
        assert.equal(await page.inputValue('#mch_pattern'), '');
        // Elección manual: no se pisa y se avisa la discordancia
        await set(page, 'mch_pattern', 'concéntrica');
        await set(page, 'mch_location', 'septum basal');
        assert.equal(await page.inputValue('#mch_pattern'), 'concéntrica');
        assert.match(await page.textContent('#mch_summary'), /las mediciones sugieren "septal asimétrica"/);
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
