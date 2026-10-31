/**
 * Guardia contra colores fijos en el marcado.
 *
 * Un style="..." inline le gana a [data-theme="dark"], así que un color
 * escrito ahí no se puede invertir en modo oscuro. Así fue como la tarjeta
 * de antecedentes terminó con fondo casi blanco y texto casi blanco:
 * catorce rótulos clínicos a 1.05:1, ilegibles con poca luz.
 *
 * Este test falla si vuelve a aparecer uno. El color va en styles.css,
 * detrás de una variable que el tema pueda redefinir.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const ARCHIVOS = ['index.html', 'eco-rapido.html'];

// Propiedades cuyo valor es un color y por lo tanto depende del tema.
const PROPIEDADES_DE_COLOR = /(^|[;\s])(color|background|background-color|border(-top|-right|-bottom|-left)?-color|outline-color|fill|stroke|box-shadow|text-shadow)\s*:/i;

// Un color literal: #abc, #aabbcc, rgb(), rgba(), hsl(), o un nombre básico.
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\b(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|navy|teal|olive|maroon|lime|aqua|fuchsia)\b/i;

/** Un borde o sombra puede declararse en atajo: border: 1px solid #ccc */
const ATAJOS_CON_COLOR = /(^|[;\s])(border|border-top|border-right|border-bottom|border-left|outline)\s*:/i;

function declaracionesConColor(style) {
    const problemas = [];
    for (const decl of style.split(';')) {
        if (!decl.trim()) continue;
        const esDeColor = PROPIEDADES_DE_COLOR.test(decl + ':') || ATAJOS_CON_COLOR.test(decl + ':');
        if (!esDeColor) continue;
        // var(--algo) es justamente lo que queremos; un literal al lado, no.
        const sinVariables = decl.replace(/var\(\s*--[^)]*\)/g, '');
        if (COLOR_LITERAL.test(sinVariables)) problemas.push(decl.trim());
    }
    return problemas;
}

function buscar(archivo) {
    const texto = fs.readFileSync(path.join(root, archivo), 'utf8');
    const hallazgos = [];
    for (const m of texto.matchAll(/style="([^"]*)"/g)) {
        const problemas = declaracionesConColor(m[1]);
        if (!problemas.length) continue;
        const linea = texto.slice(0, m.index).split('\n').length;
        hallazgos.push(`${archivo}:${linea} → ${problemas.join('; ')}`);
    }
    return hallazgos;
}

test('el marcado no trae colores fijos en atributos style', () => {
    const hallazgos = ARCHIVOS.flatMap(buscar);
    assert.deepEqual(hallazgos, [],
        '\n\nHay colores fijos en atributos style. El modo oscuro no puede tocarlos.\n' +
        'Movelos a styles.css detrás de una variable del tema:\n\n' +
        hallazgos.map(h => '  ' + h).join('\n') + '\n');
});

test('el detector reconoce un color fijo y deja pasar una variable', () => {
    assert.deepEqual(declaracionesConColor('background-color: #f0f7ff'), ['background-color: #f0f7ff']);
    assert.deepEqual(declaracionesConColor('color: white'), ['color: white']);
    assert.deepEqual(declaracionesConColor('border-left: 5px solid #3b82f6'), ['border-left: 5px solid #3b82f6']);
    assert.deepEqual(declaracionesConColor('background: rgba(0,0,0,.5)'), ['background: rgba(0,0,0,.5)']);
    assert.deepEqual(declaracionesConColor('color: var(--color-text-primary)'), []);
    assert.deepEqual(declaracionesConColor('background: var(--tint-info-bg)'), []);
    assert.deepEqual(declaracionesConColor('display: none; margin-top: 1rem'), []);
    // una variable con respaldo literal sigue siendo un literal suelto
    assert.deepEqual(declaracionesConColor('color: var(--x)'), []);
});

test('las variables que usa el marcado existen en alguna hoja de estilo', () => {
    // eco-rapido define las suyas en un <style> propio, no en styles.css
    const FUENTES = ['styles.css', 'css/voice-styles.css', 'eco-rapido.html'];
    const definidas = new Set();
    for (const archivo of FUENTES) {
        const texto = fs.readFileSync(path.join(root, archivo), 'utf8');
        for (const m of texto.matchAll(/(--[a-z0-9-]+)\s*:/gi)) definidas.add(m[1]);
    }
    const usadas = new Set();
    for (const archivo of [...ARCHIVOS, 'js/ui-controller.js', 'js/motility-controller.js']) {
        const texto = fs.readFileSync(path.join(root, archivo), 'utf8');
        for (const m of texto.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) {
            // var(--sev-${nivel}-text) se arma en tiempo de ejecución
            if (texto.slice(m.index, m.index + m[0].length + 2).includes('${')) continue;
            usadas.add(m[1]);
        }
    }
    const faltantes = [...usadas].filter(v => !definidas.has(v)).sort();
    assert.deepEqual(faltantes, [],
        '\n\nEstas variables se usan pero no están definidas en ninguna hoja.\n' +
        'Una var() indefinida deja la propiedad sin valor: así el diálogo de\n' +
        'conflicto del informe salía transparente.\n\n' +
        faltantes.map(v => '  ' + v).join('\n') + '\n');
});
