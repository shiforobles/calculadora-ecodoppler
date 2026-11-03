/**
 * Botón "Borrar todo": borra sin preguntar, deja la página como recién abierta
 * (valores de carga, cajas y badges ocultos, informe vacío), sube al principio y
 * "Deshacer" devuelve el estudio. Datos ficticios, sin red.
 * Correr con: node --test tests/reset-all.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch {}
const root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:9877';

const leerCampos = page => page.evaluate(() =>
    [...document.querySelectorAll('input, select, textarea')]
        .filter(el => el.id && el.type !== 'file' && el.type !== 'hidden' && !el.closest('.modal, dialog'))
        .map(el => [el.id, el.type === 'checkbox' || el.type === 'radio' ? el.checked
            : el.tagName === 'SELECT' ? el.value : el.value]));

test('Borrar todo', { skip: !chromium && 'Playwright no disponible' }, async t => {
    const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({ headless: true, ...(fs.existsSync(systemChrome) ? { executablePath: systemChrome } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            const file = path.resolve(root, decodeURIComponent(url.pathname).slice(1) || 'index.html');
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html' });
        });
        const page = await context.newPage();
        const errores = []; page.on('pageerror', e => errores.push(e.message));
        const dialogos = []; page.on('dialog', d => { dialogos.push(d.message()); d.accept(); });
        await page.goto(origin + '/index.html', { waitUntil: 'load' });
        await page.waitForTimeout(200);
        const inicial = await leerCampos(page);
        const visibles = () => page.evaluate(() => [...document.querySelectorAll('section.card [id]')]
            .filter(el => el.getClientRects().length > 0).map(el => el.id).sort());
        const vistaInicial = await visibles();

        // Estudio ficticio con valvulopatías graduadas, derrame y antecedentes.
        await page.fill('#edad', '70'); await page.fill('#peso', '80'); await page.fill('#altura', '170');
        await page.fill('#ddvi', '62'); await page.fill('#fevi', '30');
        await page.selectOption('#im_grado', 'severa');
        await page.selectOption('#it_grado', { index: 0 });
        await page.fill('#vel_it', '3.6');
        await page.check('#pe_presente'); await page.fill('#pe_tamano', '15');
        await page.selectOption('#motilidad_global', 'alterada');
        await page.selectOption('#it_grado', 'severa');
        await page.click('#mode_lista');
        await page.click('#btn_generate');
        await page.waitForTimeout(300);
        assert.ok((await page.inputValue('#resultado')).trim().length > 0);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const estudio = await leerCampos(page);
        dialogos.length = 0;

        await page.click('#btn_reset');
        await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 3000 });

        await t.test('no pregunta nada', () => assert.deepEqual(dialogos, []));
        await t.test('todos los campos vuelven a su valor de carga', async () => {
            const ahora = new Map(await leerCampos(page));
            // it_vel_max es un espejo de vel_it: al restaurar vel_it se copia su valor normal.
            const distintos = inicial.filter(([id, v]) => id !== 'it_vel_max' && ahora.get(id) !== v);
            assert.deepEqual(distintos.map(([id]) => id), []);
        });
        await t.test('el informe queda vacío', async () => assert.equal(await page.inputValue('#resultado'), ''));
        await t.test('las cajas de IM se ocultan', async () => assert.equal(await page.locator('#im_fields').isVisible(), false));
        await t.test('ninguna caja queda abierta que no lo esté al abrir la app (IT, motilidad…)', async () => {
            const ahora = await visibles();
            assert.deepEqual(ahora.filter(id => !vistaInicial.includes(id)), []);
            assert.deepEqual(vistaInicial.filter(id => !ahora.includes(id)), []);
        });
        await t.test('respeta el modo de informe elegido', async () =>
            assert.match(await page.getAttribute('#mode_lista', 'class'), /mode-btn-active/));
        await t.test('lleva arriba de todo', async () => assert.equal(await page.evaluate(() => window.scrollY), 0));

        await t.test('Deshacer devuelve el estudio', async () => {
            await page.click('#undo-reset .undo-bar__btn');
            const devuelto = new Map(await leerCampos(page));
            const distintos = estudio.filter(([id, v]) => id !== 'it_vel_max' && devuelto.get(id) !== v);
            assert.deepEqual(distintos.map(([id]) => id), []);
            assert.equal(await page.locator('#im_fields').isVisible(), true);
            assert.equal(await page.locator('#motility-regional-section').isVisible(), true);
        });
        assert.deepEqual(errores, []);
    } finally { await browser.close(); }
});
