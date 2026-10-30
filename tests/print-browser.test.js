/** Real browser tests, all requests served locally or blocked. No real study sends. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch {}
const root = path.resolve(process.env.ECO_PRINT_ROOT || path.join(__dirname, '..'));
const origin = 'http://127.0.0.1:9876';
const key = 'ecodoppler_print_profiles_v1';
const artifacts = process.env.ECO_PRINT_ARTIFACTS;

test('Imprimir/PDF en ambas pantallas, aislado de servicios externos', { skip: !chromium && 'Falta Playwright para ejecutar navegador' }, async t => {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) });
    const errors = [];
    async function setup(file = 'index.html', width = 1280) {
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.abort();
            const filePath = path.resolve(root, decodeURIComponent(url.pathname).slice(1) || 'index.html');
            if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return route.fulfill({ status: 404, body: '' });
            const ext = path.extname(filePath);
            return route.fulfill({ body: fs.readFileSync(filePath), contentType: ({ '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' })[ext] || 'text/html' });
        });
        context.setDefaultTimeout(7000);
        context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
        const page = await context.newPage(); await page.goto(origin + '/' + file, { waitUntil: 'load' });
        const quick = file === 'eco-rapido.html';
        const report = quick ? '#informe' : '#resultado'; const button = quick ? '#btn_imprimir' : '#btn_print';
        async function preview() {
            const promise = page.waitForEvent('popup'); await page.click(button); const popup = await promise;
            await popup.waitForSelector('#print-report'); await popup.waitForLoadState('load');
            await popup.waitForFunction(() => document.styleSheets.length > 0);
            await popup.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; window.dispatchEvent(new Event('beforeprint')); }; });
            return popup;
        }
        return { context, page, report, button, preview };
    }
    try {
        await t.test('vacío no abre popup ni genera; ventana bloqueada conserva el texto', async () => {
            const { context, page, report, button } = await setup(); const messages = [];
            page.on('dialog', async d => { messages.push(d.message()); await d.accept(); });
            await page.evaluate(() => { UIController.generateReport = () => { throw Error('No generar'); }; });
            await page.click(button); assert.match(messages[0], /Primero/); assert.equal(context.pages().length, 1);
            await page.fill(report, 'INFORME FICTICIO'); await page.evaluate(() => { window.open = () => null; });
            await page.click(button); assert.match(messages.at(-1), /bloqueó/); assert.equal(await page.inputValue(report), 'INFORME FICTICIO'); await context.close();
        });
        for (const file of ['index.html', 'eco-rapido.html']) {
            await t.test(file + ': captura literal, sin IA, cálculos ni envío; encabezado vacío inicial', async () => {
                const { context, page, report, preview } = await setup(file);
                const text = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n' + '='.repeat(80) + '\nObservación manual ficticia: á, ñ, ≤ ≥.\n<b>Esto es texto</b>\n<script>window.INJECTED=1</script>\n' + '='.repeat(80);
                await page.fill(report, text);
                await page.evaluate(() => {
                    if (window.UIController) for (const method of ['generateReport', 'generateAIReport', 'calculateAll', 'saveStudy', 'copyReport']) window.UIController[method] = () => { throw Error('No debe invocarse ' + method); };
                    if (window.GoogleSync) GoogleSync.send = () => { throw Error('No enviar'); };
                });
                const popup = await preview();
                assert.equal(await popup.locator('#print-profile').inputValue(), 'generic');
                assert.equal(await popup.locator('.institution').count(), 0); assert.equal(await popup.locator('.professional').count(), 0);
                assert.equal(await popup.locator('#print-report').textContent(), text); assert.equal(await popup.locator('#print-report script, #print-report b').count(), 0);
                assert.equal(await popup.locator('.app-separator').isVisible(), false);
                assert.equal((await popup.locator('#print-report').innerText()).includes('Observación manual ficticia'), true);
                await popup.click('#print-now'); await popup.waitForFunction(() => window.__printCalls === 1);
                assert.equal(await page.inputValue(report), text); assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
                assert.equal(await popup.locator('#print-date').inputValue(), ''); assert.equal(await popup.evaluate(() => window.INJECTED), undefined);
                await context.close();
            });
            await t.test(file + ': datos nuevos después de edición requieren decisión; captura abierta se invalida', async () => {
                const { context, page, report, button, preview } = await setup(file);
                await page.fill(report, 'TEXTO MANUAL FICTICIO'); await page.fill(file === 'index.html' ? '#fevi' : '#fey', '35');
                let confirmations = 0;
                const cancel = async d => { confirmations++; await d.dismiss(); }; page.on('dialog', cancel);
                await page.click(button); assert.equal(confirmations, 1); assert.equal(context.pages().length, 1);
                assert.equal(await page.inputValue(report), 'TEXTO MANUAL FICTICIO'); page.off('dialog', cancel);
                page.on('dialog', d => d.accept());
                const popup = await preview(); assert.equal(await popup.locator('#print-report').textContent(), 'TEXTO MANUAL FICTICIO');
                await page.fill(file === 'index.html' ? '#paciente_id' : '#p_nombre', 'OTRO-PACIENTE-FICTICIO');
                await popup.waitForSelector('#print-stale:not([hidden])'); assert.equal(await popup.locator('#print-now').isDisabled(), true);
                await popup.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
                await popup.emulateMedia({ media: 'print' }); assert.equal(await popup.locator('.paper').isVisible(), false); assert.equal(await popup.locator('.print-guard').isVisible(), true);
                await context.close();
            });
        }
        await t.test('informe generado vigente no pide confirmación; cambiar preset queda advertido', async () => {
            const { context, page, preview } = await setup(); const dialogs = [];
            page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
            await page.evaluate(() => window.UIController.generateReport());
            let popup = await preview(); assert.equal(dialogs.length, 0); await popup.close();
            await page.fill('#fevi', '42'); popup = await preview(); assert.equal(dialogs.length, 1); await popup.close();
            await page.evaluate(() => window.UIController.generateReport()); popup = await preview(); assert.equal(dialogs.length, 1); await popup.close();
            const name = await page.locator('#preset_selector option').evaluateAll(options => options.find(o => o.value)?.value);
            await page.evaluate(name => window.UIController.applyPreset(name), name);
            // Presets can regenerate according to the existing controller; if so, the new report is current.
            await preview(); assert.equal(await page.locator('#resultado').inputValue() !== '', true); await context.close();
        });
        await t.test('perfil puntual no cambia predeterminado; persistencia explícita sin paciente, fecha ni texto', async () => {
            const { context, page, report, preview } = await setup();
            await page.fill('#paciente_id', 'FICTICIO-NO-GUARDAR'); await page.fill(report, 'TEXTO-NO-GUARDAR');
            let popup = await preview(); await popup.selectOption('#print-profile', 'hospital');
            assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
            await popup.fill('#print-professional', 'Dra. Ana Ejemplo'); await popup.fill('#print-registration', 'DEMO'); await popup.check('#print-showProfessional');
            await popup.fill('#print-date', '2026-10-29'); await popup.click('#print-save-config');
            let saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key); assert.equal(saved.defaultProfileId, 'generic');
            assert.doesNotMatch(JSON.stringify(saved), /FICTICIO-NO-GUARDAR|TEXTO-NO-GUARDAR|2026-10-29/);
            await popup.click('#print-set-default'); await popup.selectOption('#print-profile', 'generic'); await popup.close();
            popup = await preview(); assert.equal(await popup.locator('#print-profile').inputValue(), 'hospital'); assert.equal(await popup.locator('#print-date').inputValue(), '');
            assert.match(await popup.locator('.professional').textContent(), /Dra. Ana Ejemplo/); assert.equal(await popup.locator('.institution img').count(), 2);
            await popup.selectOption('#print-profile', 'generic'); await popup.click('#print-save-config'); await popup.close();
            await page.reload(); await page.fill(report, 'NUEVO FICTICIO'); popup = await preview(); assert.equal(await popup.locator('#print-profile').inputValue(), 'hospital');
            assert.equal(await popup.locator('#print-report').textContent(), 'NUEVO FICTICIO'); assert.doesNotMatch(await popup.locator('.patient').textContent().catch(() => ''), /FICTICIO-NO-GUARDAR/);
            await context.close();
        });
        await t.test('almacenamiento bloqueado/cuota: impresión disponible y otras claves intactas', async () => {
            for (const mode of ['get', 'set', 'json']) {
                const { context, page, report, preview } = await setup('eco-rapido.html');
                await page.fill(report, 'SIN ALMACENAMIENTO - FICTICIO');
                await page.evaluate(({ mode, key }) => {
                    localStorage.setItem('otra_configuracion', 'conservar');
                    if (mode === 'get') Object.defineProperty(window, 'localStorage', { get() { throw Error('Bloqueado'); } });
                    if (mode === 'set') Storage.prototype.setItem = () => { throw Error('QuotaExceeded'); };
                    if (mode === 'json') localStorage.setItem(key, '{');
                }, { mode, key });
                const popup = await preview(); await popup.selectOption('#print-profile', 'hospital'); await popup.click('#print-set-default');
                if (mode !== 'json') assert.match(await popup.locator('#print-status').textContent(), /No se pudo guardar/);
                await popup.click('#print-now'); await popup.waitForFunction(() => window.__printCalls === 1);
                if (mode !== 'get') assert.equal(await page.evaluate(() => localStorage.getItem('otra_configuracion')), 'conservar');
                await context.close();
            }
        });
        await t.test('logos locales validados; datos como texto y no como HTML', async () => {
            const { context, page, report, preview } = await setup('eco-rapido.html'); await page.fill(report, 'FICTICIO');
            const popup = await preview();
            await popup.fill('#print-institution', '<img src="https://example.test/secreto" onerror="alert(1)">');
            assert.match(await popup.locator('.institution .name').textContent(), /<img/); assert.equal(await popup.locator('.institution img').count(), 0);
            await popup.setInputFiles('#print-logoLeft', { name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
            assert.match(await popup.locator('#print-status').textContent(), /No se pudo cargar/);
            await popup.setInputFiles('#print-logoLeft', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(await popup.evaluate(() => { const c = document.createElement('canvas'); c.width = 10; c.height = 10; c.getContext('2d').fillRect(0, 0, 10, 10); return c.toDataURL('image/png').split(',')[1]; }), 'base64') });
            await popup.waitForFunction(() => document.getElementById('print-status').textContent.includes('Logo cargado'));
            await popup.check('#print-showLogos'); await popup.click('#print-save-config');
            const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
            assert.match(stored.profiles.generic.logoLeft, /^data:image\/png;base64,/); await context.close();
        });
        await t.test('móvil/tablet: controles accesibles, hoja desplazable y sin desbordes en el panel', async () => {
            for (const width of [390, 768]) {
                const { context, page, report, preview } = await setup('eco-rapido.html', width); await page.fill(report, 'FICTICIO'); const popup = await preview();
                await popup.setViewportSize({ width, height: 844 });
                assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                assert.equal(await popup.locator('#print-profile').isVisible(), true); assert.equal(await popup.locator('#print-now').isVisible(), true);
                if (artifacts) await popup.screenshot({ path: path.join(artifacts, 'movil-' + width + '.png'), fullPage: true });
                await context.close();
            }
        });
        await t.test('informe largo, símbolos y profesional no dividido: PDF y muestras reales', async () => {
            const { context, page, report, preview } = await setup();
            page.on('dialog', d => d.accept()); await page.fill('#paciente_id', 'DEMO-002 · María de los Ángeles Álvarez Fernández de la Torre - paciente ficticia');
            await page.evaluate(() => window.UIController.generateReport());
            const original = await page.inputValue(report);
            const text = original + '\n\nObservación manual ficticia: control evolutivo.\n\n' + Array.from({ length: 16 }, (_, i) => 'Observación adicional de prueba ' + (i + 1) + '. Párrafo ficticio para comprobar varias páginas sin resumir el texto original: á, é, í, ó, ú, ñ, ≥ y ≤.\n').join('\n') + '\nTexto literal: <b>esto no es HTML</b>.';
            await page.fill(report, text); const popup = await preview();
            assert.equal(await popup.locator('#print-report').textContent(), text);
            await popup.selectOption('#print-profile', 'hospital'); await popup.fill('#print-professional', 'Dra. Ana Ejemplo'); await popup.fill('#print-registration', 'DEMO'); await popup.check('#print-showProfessional'); await popup.fill('#print-date', '2026-10-29');
            await popup.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
            if (artifacts) {
                fs.mkdirSync(artifacts, { recursive: true });
                await popup.pdf({ path: path.join(artifacts, 'impresion-larga.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
                await page.fill(report, original + '\n\nObservación manual ficticia: control evolutivo.'); await popup.close();
                const short = await preview(); await short.selectOption('#print-profile', 'hospital'); await short.fill('#print-professional', 'Dra. Ana Ejemplo'); await short.fill('#print-registration', 'DEMO'); await short.check('#print-showProfessional'); await short.fill('#print-date', '2026-10-29');
                await short.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
                await short.screenshot({ path: path.join(artifacts, 'vista-hospital.png'), fullPage: true });
                await short.pdf({ path: path.join(artifacts, 'impresion-hospital.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
                await short.selectOption('#print-profile', 'generic'); await short.pdf({ path: path.join(artifacts, 'impresion-generico.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
                fs.writeFileSync(path.join(artifacts, 'informe-original-ficticio.txt'), original);
            }
            await context.close();
        });
        assert.deepEqual(errors, []);
    } finally { await browser.close(); }
});
