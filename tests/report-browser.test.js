/**
 * Pruebas de interacción reales, sin servidores ni red externa.
 * Requiere Playwright + Chrome. Correr con NODE_PATH apuntando a sus dependencias
 * si no está instalado en el proyecto: node --test tests/report-browser.test.js
 * Sin Playwright se marca omitido explícitamente; las pruebas de motores siguen independientes.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch {}
const root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:9876';

test('interacción de informes y siglas en ambas pantallas (sin red)', { skip: !chromium && 'Playwright no disponible; ejecutar con las dependencias del navegador' }, async t => {
    const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({ headless: true, ...(fs.existsSync(systemChrome) ? { executablePath: systemChrome } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            const file = path.resolve(root, decodeURIComponent(url.pathname).slice(1) || 'index.html');
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html' });
        });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        page.on('dialog', d => d.accept());
        page.setDefaultTimeout(10000);
        await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            window.__copied = []; window.__sent = [];
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied.push(text); } } });
            GoogleSync.isConfigured = () => true;
            GoogleSync.send = async row => { window.__sent.push(row); };
        });
        await t.test('Generar inmediato, copia actualizada y diálogo de revisión antes de enviar', async () => {
            await page.evaluate(async () => {
                for (const [id, value] of Object.entries({ peso:80, altura:175, edad:65, pp:16 })) {
                    const e = document.getElementById(id); e.value = value; e.dispatchEvent(new Event('input', { bubbles:true }));
                }
                await window.UIController.generateReport();
            });
            assert.match(await page.inputValue('#resultado'), /Masa 111g/);
            await page.fill('#fevi', '45'); await page.click('#btn_copy');
            assert.match(await page.evaluate(() => window.__copied.at(-1)), /FEy 45%/);
            await page.fill('#resultado', 'TEXTO MANUAL FICTICIO'); await page.fill('#fevi', '35');
            await page.click('#btn_copy'); await page.click('[data-decision="cancel"]');
            assert.equal(await page.evaluate(() => window.__copied.length), 1);
            assert.equal(await page.inputValue('#resultado'), 'TEXTO MANUAL FICTICIO');
            await page.click('#btn_copy'); await page.click('[data-decision="keep"]');
            assert.equal(await page.evaluate(() => window.__copied.at(-1)), 'TEXTO MANUAL FICTICIO');
            await page.click('#btn_copy'); assert.equal(await page.locator('#report-conflict-dialog').count(), 0);
            await page.fill('#fevi', '30'); await page.click('#btn_save_study'); await page.click('[data-decision="regenerate"]');
            assert.equal(await page.evaluate(() => window.__sent.length), 1);
            assert.equal(await page.evaluate(() => window.__sent[0].length), 88);
            assert.ok(await page.evaluate(() => window.__sent[0].some(v => typeof v === 'string' && v.includes('FEy 30%'))));
        });
        await t.test('click real sobre sigla en calculadora completa', async () => {
            await page.selectOption('#motilidad_global', 'alterada');
            const label = page.locator('#svg-bullseye .anatomy-label').first();
            await label.scrollIntoViewIfNeeded(); const box = await label.boundingBox();
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
            assert.equal(await page.evaluate(() => EcoDoppler.motilityController.state[1]), 2);
        });
        await t.test('indexaciones inyectadas siguen SC sin afectar borradores auxiliares', async () => {
            const values = await page.evaluate(async () => {
                const set = (id,v) => { const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true})); };
                set('cont_diam_tsvi',20);set('cont_vti_tsvi',20);set('cont_vti_ao',80);set('peso',120);
                window.UIController.injectAVA(); const first=document.getElementById('ea_ava_index').value;
                const expected=EcoDoppler.miniCalc.calculateContinuity(20,20,80,EcoDoppler.calculator.calculateBodySurface(120,175)).avaIndex;
                set('peso','');window.UIController.calculateNow();const cleared=document.getElementById('ea_ava_index').value;
                set('peso',80);await window.UIController.generateReport();
                return {first,expected,cleared};
            });
            assert.equal(values.first,values.expected);assert.equal(values.cleared,'');
            await page.fill('#resultado','MANUAL VIGENTE SIN INYECTAR');
            await page.evaluate(() => {const e=document.getElementById('cont_vti_ao');e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));});
            await page.click('#btn_copy');assert.equal(await page.locator('#report-conflict-dialog').count(),0);
            assert.equal(await page.evaluate(()=>window.__copied.at(-1)),'MANUAL VIGENTE SIN INYECTAR');
        });
        await page.goto(origin + '/eco-rapido.html', { waitUntil: 'domcontentloaded' });
        await t.test('eco rápido regenera sin limpiar el paciente ni persistir el borrador', async () => {
            await page.fill('#p_nombre', 'AUDITORIA FICTICIA'); await page.fill('#informe', 'MANUAL'); await page.fill('#fey', '35');
            assert.equal(await page.locator('#informe_estado').isVisible(), true);
            assert.equal(await page.inputValue('#informe'), 'MANUAL');
            await page.click('#btn_regenerar'); assert.match(await page.inputValue('#informe'), /FEy 35%/);
            assert.equal(await page.inputValue('#p_nombre'), 'AUDITORIA FICTICIA');
            assert.equal(await page.evaluate(() => localStorage.length), 0);
        });
        await t.test('click real sobre sigla en eco rápido llega al segmento', async () => {
            await page.click('.opts[data-campo="vi.motilidad"] [data-val="segmentaria"]');
            const label = page.locator('#svg-bullseye .anatomy-label').first();
            await label.scrollIntoViewIfNeeded(); const box = await label.boundingBox();
            await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
            assert.equal(await page.locator('#wmsi_txt').textContent(), 'WMSI 1.06');
        });
        assert.deepEqual(errors, []);
        await context.close();
    } finally { await browser.close(); }
});
