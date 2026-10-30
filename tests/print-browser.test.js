/** Real browser tests, all requests served locally or blocked. No real study sends. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium; try { ({ chromium } = require('playwright')); } catch {}
const root = path.resolve(process.env.ECO_PRINT_ROOT || path.join(__dirname, '..'));
const origin = 'http://127.0.0.1:9876';
const key = 'ecodoppler_print_template_v2';
const artifacts = process.env.ECO_PRINT_ARTIFACTS;

test('Imprimir/PDF en ambas pantallas, aislado de servicios externos', { skip: !chromium && 'Falta Playwright para ejecutar navegador' }, async t => {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) });
    const errors = [];
    async function setup(file = 'index.html', width = 1280) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: 'America/Argentina/Buenos_Aires' });
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
            await t.test(file + ': captura literal, sin IA, cálculos ni envío; plantilla genérica con profesional fijo', async () => {
                const { context, page, report, preview } = await setup(file);
                const text = 'ECOCARDIOGRAMA DOPPLER CARDÍACO\n' + '='.repeat(80) + '\nObservación manual ficticia: á, ñ, ≤ ≥.\n<b>Esto es texto</b>\n<script>window.INJECTED=1</script>\n' + '='.repeat(80);
                await page.fill(report, text);
                await page.evaluate(() => {
                    if (window.UIController) for (const method of ['generateReport', 'generateAIReport', 'calculateAll', 'saveStudy', 'copyReport']) window.UIController[method] = () => { throw Error('No debe invocarse ' + method); };
                    if (window.GoogleSync) GoogleSync.send = () => { throw Error('No enviar'); };
                });
                const popup = await preview();
                assert.equal(await popup.locator('#print-profile').inputValue(), 'generic');
                assert.equal(await popup.locator('.institution').count(), 0); assert.equal(await popup.locator('.professional').count(), 1);
                assert.match(await popup.locator('.professional').textContent(), /Dr\. Lucas Sebastián Robles/);
                assert.match(await popup.locator('.professional').textContent(), /Matrícula 166\.452/);
                assert.equal(await popup.locator('#print-report').textContent(), text); assert.equal(await popup.locator('#print-report script, #print-report b').count(), 0);
                assert.equal(await popup.locator('.app-separator').isVisible(), false);
                assert.equal((await popup.locator('#print-report').innerText()).includes('Observación manual ficticia'), true);
                await popup.click('#print-now'); await popup.waitForFunction(() => window.__printCalls === 1);
                assert.equal(await page.inputValue(report), text); assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
                assert.equal(await popup.locator('#print-date').inputValue(), await page.evaluate(() => PrintPreview.localStudyDate())); assert.equal(await popup.evaluate(() => window.INJECTED), undefined);
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
        await t.test('Copiar y Guardar consecutivos; solo dos plantillas sin editor, con preferencia explícita', async () => {
            const { context, page, report, preview } = await setup();
            assert.deepEqual(await page.locator('.action-buttons button').evaluateAll(nodes => nodes.slice(1, 5).map(n => n.id)), ['btn_generate', 'btn_copy', 'btn_save_study', 'btn_print']);
            await page.fill('#paciente_id', 'FICTICIO-NO-GUARDAR'); await page.fill(report, 'TEXTO-NO-GUARDAR');
            let popup = await preview();
            assert.deepEqual(await popup.locator('#print-profile option').allTextContents(), ['Genérico', 'Hospital Español']);
            assert.equal(await popup.locator('input[type=text], input[type=file], input[type=checkbox], #print-save-config').count(), 0);
            await popup.selectOption('#print-profile', 'hospital');
            assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
            await popup.fill('#print-date', '2026-10-29'); await popup.click('#print-set-default');
            const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
            assert.deepEqual(saved, { schemaVersion: 2, defaultProfileId: 'hospital' });
            await popup.selectOption('#print-profile', 'generic'); await popup.close();
            popup = await preview(); assert.equal(await popup.locator('#print-profile').inputValue(), 'hospital'); assert.equal(await popup.locator('#print-date').inputValue(), await page.evaluate(() => PrintPreview.localStudyDate()));
            assert.match(await popup.locator('.professional').textContent(), /Dr\. Lucas Sebastián RoblesMatrícula 166\.452/); assert.equal(await popup.locator('.institution img').count(), 2);
            await popup.selectOption('#print-profile', 'generic'); await popup.close();
            await page.reload(); await page.fill(report, 'NUEVO FICTICIO'); popup = await preview(); assert.equal(await popup.locator('#print-profile').inputValue(), 'hospital');
            assert.equal(await popup.locator('#print-report').textContent(), 'NUEVO FICTICIO'); assert.doesNotMatch(await popup.locator('.patient').textContent().catch(() => ''), /FICTICIO-NO-GUARDAR/);
            await context.close();
        });
        await t.test('Fecha automática local en ambas plantillas, editable y sin persistir', async () => {
            for (const file of ['index.html', 'eco-rapido.html']) {
                const { context, page, report, preview } = await setup(file);
                await page.clock.setFixedTime(new Date('2026-10-30T01:30:00Z'));
                await page.fill(report, 'ESTUDIO FICTICIO PARA FECHA');
                let popup = await preview();
                assert.equal(await popup.locator('#print-date').inputValue(), '2026-10-29');
                assert.match(await popup.locator('.patient').textContent(), /Fecha del estudio: 29\/10\/2026/);
                if (artifacts && file === 'index.html') await popup.pdf({ path: path.join(artifacts, 'fecha-automatica.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
                await popup.selectOption('#print-profile', 'hospital');
                assert.match(await popup.locator('.patient').textContent(), /29\/10\/2026/);
                await popup.fill('#print-date', '2026-10-20');
                assert.match(await popup.locator('.patient').textContent(), /20\/10\/2026/);
                await popup.selectOption('#print-profile', 'generic');
                assert.equal(await popup.locator('#print-date').inputValue(), '2026-10-20');
                await popup.click('#print-set-default');
                const preference = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
                assert.deepEqual(preference, { schemaVersion: 2, defaultProfileId: 'generic' });
                assert.equal(await page.inputValue(report), 'ESTUDIO FICTICIO PARA FECHA');
                await popup.close();
                await page.clock.setFixedTime(new Date('2026-10-30T04:00:00Z'));
                popup = await preview();
                assert.equal(await popup.locator('#print-date').inputValue(), '2026-10-30');
                assert.match(await popup.locator('.patient').textContent(), /30\/10\/2026/);
                await context.close();
            }
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
        await t.test('plantillas fijas ignoran membretes antiguos y guardados ajenos; texto literal seguro', async () => {
            const { context, page, report, preview } = await setup('eco-rapido.html');
            await page.evaluate(key => {
                localStorage.setItem('ecodoppler_print_profiles_v1', JSON.stringify({ schemaVersion: 1, profiles: { generic: { professional: 'OTRO PROFESIONAL' } } }));
                localStorage.setItem(key, JSON.stringify({ schemaVersion: 2, defaultProfileId: 'hospital', profiles: { hospital: { professional: 'OTRO PROFESIONAL', institution: '<script>malicioso</script>', logoLeft: 'https://example.test/secreto' } } }));
            }, key);
            await page.fill(report, '<img src="https://example.test/secreto" onerror="alert(1)">');
            const popup = await preview();
            assert.equal(await popup.locator('#print-report img, #print-report script').count(), 0);
            assert.match(await popup.locator('.institution .name').textContent(), /Hospital Español/);
            assert.match(await popup.locator('.professional').textContent(), /Dr\. Lucas Sebastián RoblesMatrícula 166\.452/);
            assert.equal(await popup.locator('.institution img').evaluateAll(images => images.every(img => new URL(img.src).origin === 'http://127.0.0.1:9876')), true);
            await popup.selectOption('#print-profile', 'generic');
            assert.equal(await popup.locator('.institution').count(), 0);
            assert.match(await popup.locator('.professional').textContent(), /166\.452/);
            await context.close();
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
            await popup.selectOption('#print-profile', 'hospital'); await popup.fill('#print-date', '2026-10-29');
            await popup.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
            if (artifacts) {
                fs.mkdirSync(artifacts, { recursive: true });
                await popup.pdf({ path: path.join(artifacts, 'impresion-larga.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
                await page.fill(report, original + '\n\nObservación manual ficticia: control evolutivo.'); await popup.close();
                const short = await preview(); await short.selectOption('#print-profile', 'hospital'); await short.fill('#print-date', '2026-10-29');
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
