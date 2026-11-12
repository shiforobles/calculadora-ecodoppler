/**
 * FEy baja ≠ miocardiopatía dilatada.
 * El informe describe por separado la morfología (dilatado o no, por diámetro) y la
 * función sistólica (por FEy), y nunca nombra una etiología por su cuenta
 * (miocardiopatía dilatada, cardiopatía isquémica, hipertensiva, valvular).
 * Requiere Playwright + Chrome, igual que report-browser.test.js. Datos ficticios, sin red.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch {}
const root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:9876';

const ETIOLOGIA = /miocardiopat[ií]a dilatada|cardiopat[ií]a isqu[eé]mica|(cardiopat[ií]a|miocardiopat[ií]a) hipertensiva|miocardiopat[ií]a valvular/i;
const GLOBAL = Array.from({ length: 16 }, (_, i) => i + 1);

// Varón; dilatado = DDVI > 58 mm (ASE 2015, corte vigente en la app)
const CASOS = [
    { nombre: 'FEy 60 %, VI normal', ddvi: 48, fevi: 60, seg: [],
      si: [/Función sistólica del VI conservada/], no: [/dilatad/i] },
    { nombre: 'FEy 25 %, VI no dilatado, hipoquinesia global', ddvi: 50, fevi: 25, seg: GLOBAL,
      si: [/severamente deprimida \(25%\)/, /hipoquinesia global/i], no: [/dilatad/i] },
    { nombre: 'FEy 25 %, VI no dilatado, sin motilidad cargada', ddvi: 50, fevi: 25, seg: [],
      si: [/severamente deprimida \(25%\)/], no: [/dilatad/i] },
    { nombre: 'FEy 25 %, VI dilatado', ddvi: 66, fevi: 25, seg: GLOBAL,
      si: [/dilatado|dilatación ventricular/, /severamente deprimida \(25%\)/], no: [] },
    { nombre: 'FEy 42 %, VI dilatado', ddvi: 64, fevi: 42, seg: [],
      si: [/dilatado|dilatación ventricular/, /levemente deprimida \(42%\)/], no: [] },
    { nombre: 'FEy 28 %, VI dilatado, alteraciones segmentarias', ddvi: 64, fevi: 28, seg: [1, 2, 7, 8, 13, 14, 17], grado: 3,
      si: [/dilatado|dilatación ventricular/, /severamente deprimida \(28%\)/, /aquinesia/i], no: [] },
];

test('FEy baja no genera diagnósticos etiológicos (lista y narrativo)',
    { skip: !chromium && 'Playwright no disponible; ejecutar con las dependencias del navegador' }, async t => {
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
        page.on('dialog', d => d.accept());
        page.setDefaultTimeout(10000);

        for (const caso of CASOS) {
            await t.test(caso.nombre, async () => {
                await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
                await page.evaluate(() => localStorage.clear());
                await page.reload({ waitUntil: 'domcontentloaded' });
                const informes = await page.evaluate(async caso => {
                    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
                    set('sexo', 'M'); set('peso', 80); set('altura', 175); set('edad', 60);
                    set('siv', 9); set('pp', 9); set('ddvi', caso.ddvi); set('fevi', caso.fevi);
                    if (caso.seg.length) {
                        set('motilidad_global', 'alterada');
                        caso.seg.forEach(id => EcoDoppler.motilityController.setSegmentState(id, caso.grado || 2));
                    }
                    const out = {};
                    for (const modo of ['lista', 'narrativo']) {
                        window.UIController.reportMode = modo;
                        await window.UIController.generateReport({ confirmEdits: false });
                        out[modo] = document.getElementById('resultado').value;
                    }
                    return out;
                }, caso);
                for (const [modo, texto] of Object.entries(informes)) {
                    assert.ok(texto.length > 50, `${modo}: informe vacío`);
                    assert.doesNotMatch(texto, ETIOLOGIA, `${modo}: aparece un diagnóstico etiológico`);
                    for (const re of caso.no) assert.doesNotMatch(texto, re, `${modo}: no debía decir ${re}`);
                }
                for (const re of caso.si) assert.match(informes.lista, re);
                if (process.env.VER_INFORMES) console.log(`\n### ${caso.nombre}\n` + informes.lista.split('\n').filter(l => /^2\. /.test(l)).join('\n') + '\n--- narrativo ---\n' + informes.narrativo.slice(0, 700));
            });
        }
    } finally { await browser.close(); }
});
