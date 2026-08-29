/**
 * Casos de prueba del Motor A — Fase 1.
 * Los textos esperados vienen del prompt, adaptados a la grafía "qu"
 * (hipoquinesia / aquinesia / disquinesia) que usan los informes históricos.
 */
const path = require('path');
const BASE = path.join(__dirname, '..', 'js');

global.MotilityModel = require(path.join(BASE, 'motility-model.js'));
const Engine = require(path.join(BASE, 'motility-engine.js'));
const WMSI   = require(path.join(BASE, 'wmsi-engine.js'));

const N = 1, HK = 2, AK = 3, DK = 4;

/** Construye el mapa de estados: por defecto todos normales */
function estado(asignaciones) {
    const s = {};
    for (let i = 1; i <= 17; i++) s[i] = N;
    Object.entries(asignaciones).forEach(([segs, val]) => {
        segs.split(',').map(Number).forEach(id => { s[id] = val; });
    });
    return s;
}
const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i).join(',');

const casos = [
    // ── BLOQUE OBLIGATORIO (7) ──
    { bloque: 'OBLIGATORIO', n: 1, nombre: 'Todos 1-16 normales',
      estados: estado({}),
      esperado: 'Motilidad parietal global y segmentaria conservada.', wmsi: 1.00 },

    { bloque: 'OBLIGATORIO', n: 2, nombre: '13-16 AK + 7-12 HK',
      estados: estado({ '13,14,15,16': AK, [rango(7, 12)]: HK }),
      esperado: 'Aquinesia difusa de los segmentos apicales, con hipoquinesia circunferencial de los segmentos medios.' },

    { bloque: 'OBLIGATORIO', n: 3, nombre: '13,14 AK + 7,8 HK (contiguos)',
      estados: estado({ '13,14': AK, '7,8': HK }),
      esperado: 'Aquinesia anterior y septal apical, con hipoquinesia de los segmentos anterior y anteroseptal medios adyacentes.' },

    { bloque: 'OBLIGATORIO', n: 4, nombre: '13 AK + 4 HK (no contiguos)',
      estados: estado({ '13': AK, '4': HK }),
      esperado: 'Aquinesia del segmento anterior apical e hipoquinesia del segmento inferior basal.' },

    { bloque: 'OBLIGATORIO', n: 5, nombre: '1-16 todos HK',
      estados: estado({ [rango(1, 16)]: HK }),
      esperado: 'Hipoquinesia global del ventrículo izquierdo.' },

    { bloque: 'OBLIGATORIO', n: 6, nombre: '1,7,13 HK (pared anterior completa)',
      estados: estado({ '1,7,13': HK }),
      esperado: 'Hipoquinesia de la pared anterior en toda su extensión.' },

    { bloque: 'OBLIGATORIO', n: 7, nombre: '7,8,13,14 HK',
      estados: estado({ '7,8,13,14': HK }),
      esperado: 'Hipoquinesia de predominio anteroseptal medio-apical.' },

    // ── BLOQUE DE TESTS (13) ──
    { bloque: 'TESTS', n: 1, nombre: 'NORMAL',
      estados: estado({}),
      esperado: 'Motilidad parietal global y segmentaria conservada.', wmsi: 1.00 },

    { bloque: 'TESTS', n: 2, nombre: 'APICAL COMPLETO 13-16 HK',
      estados: estado({ '13,14,15,16': HK }),
      esperado: 'Hipoquinesia difusa de los segmentos apicales.' },

    { bloque: 'TESTS', n: 3, nombre: 'ANTERIOR COMPLETA 1+7+13 HK',
      estados: estado({ '1,7,13': HK }),
      esperado: 'Hipoquinesia de la pared anterior en toda su extensión.' },

    { bloque: 'TESTS', n: 4, nombre: 'ANTERIOR MEDIO-APICAL 7+13 HK',
      estados: estado({ '7,13': HK }),
      esperado: 'Hipoquinesia anterior medio-apical.' },

    { bloque: 'TESTS', n: 5, nombre: 'ANTERIOR BASO-MEDIAL 1+7 HK',
      estados: estado({ '1,7': HK }),
      esperado: 'Hipoquinesia anterior baso-medial.' },

    { bloque: 'TESTS', n: 6, nombre: 'APICALES 3/4 — 13+14+16 HK',
      estados: estado({ '13,14,16': HK }),
      esperado: 'Hipoquinesia de los segmentos apicales anterior, septal y lateral.' },

    { bloque: 'TESTS', n: 7, nombre: 'PREDOMINIO APICAL + EXTENSIÓN — 8+13+14+16 HK',
      estados: estado({ '8,13,14,16': HK }),
      esperado: 'Hipoquinesia de predominio apical con extensión anteroseptal media.' },

    { bloque: 'TESTS', n: 8, nombre: 'ANTEROSEPTAL MEDIO-APICAL 7+8+13+14 HK',
      estados: estado({ '7,8,13,14': HK }),
      esperado: 'Hipoquinesia de predominio anteroseptal medio-apical.' },

    { bloque: 'TESTS', n: 9, nombre: 'GRADOS MIXTOS CONTIGUOS',
      estados: estado({ '13,14': AK, '7,8': HK }),
      esperado: 'Aquinesia anterior y septal apical, con hipoquinesia de los segmentos anterior y anteroseptal medios adyacentes.' },

    { bloque: 'TESTS', n: 10, nombre: 'GRADOS MIXTOS NO CONTIGUOS',
      estados: estado({ '13': AK, '4': HK }),
      esperado: 'Aquinesia del segmento anterior apical e hipoquinesia del segmento inferior basal.' },

    { bloque: 'TESTS', n: 11, nombre: 'MEDIOS COMPLETOS 7-12 HK',
      estados: estado({ [rango(7, 12)]: HK }),
      esperado: 'Hipoquinesia circunferencial de los segmentos medios.' },

    { bloque: 'TESTS', n: 12, nombre: 'BASALES COMPLETOS 1-6 HK',
      estados: estado({ [rango(1, 6)]: HK }),
      esperado: 'Hipoquinesia circunferencial de los segmentos basales.' },

    { bloque: 'TESTS', n: 13, nombre: 'GLOBAL 1-16 HK',
      estados: estado({ [rango(1, 16)]: HK }),
      esperado: 'Hipoquinesia global del ventrículo izquierdo.' },
];

let ok = 0, fail = 0;
let bloqueActual = '';

casos.forEach(c => {
    if (c.bloque !== bloqueActual) {
        bloqueActual = c.bloque;
        console.log(`\n${'═'.repeat(78)}\nBLOQUE ${c.bloque}\n${'═'.repeat(78)}`);
    }

    const obtenido = Engine.describe(c.estados);
    const pasa = obtenido === c.esperado;
    pasa ? ok++ : fail++;

    console.log(`\n${pasa ? '✅' : '❌'} ${c.n}. ${c.nombre}`);
    if (!pasa) {
        console.log(`   esperado : ${c.esperado}`);
        console.log(`   obtenido : ${obtenido}`);
    } else {
        console.log(`   → ${obtenido}`);
    }

    if (c.wmsi !== undefined) {
        const r = WMSI.calculate(c.estados);
        const wOk = r.wmsi === c.wmsi;
        if (!wOk) fail++; else ok++;
        console.log(`   ${wOk ? '✅' : '❌'} WMSI ${r.text} (esperado ${c.wmsi.toFixed(2)}, ${r.evaluated} segmentos evaluados)`);
    }
});

// ── Verificación del segmento 17 fuera del WMSI ──
console.log(`\n${'═'.repeat(78)}\nSEGMENTO 17 — debe quedar fuera\n${'═'.repeat(78)}`);
const con17 = estado({ '17': DK });   // ápex disquinético, resto normal
const r17 = WMSI.calculate(con17);
const t17 = Engine.describe(con17);
const wmsi17ok = r17.wmsi === 1.00 && r17.evaluated === 16;
const txt17ok  = t17 === 'Motilidad parietal global y segmentaria conservada.';
console.log(`\n${wmsi17ok ? '✅' : '❌'} WMSI con 17=DK → ${r17.text} sobre ${r17.evaluated} segmentos (no debe alterarse)`);
console.log(`${txt17ok ? '✅' : '❌'} Redacción con 17=DK → "${t17}"`);
wmsi17ok ? ok++ : fail++;
txt17ok  ? ok++ : fail++;

// ── Comparación con el cálculo viejo (÷17) ──
console.log(`\n${'═'.repeat(78)}\nWMSI: cálculo viejo (÷17) vs nuevo (÷16 evaluables)\n${'═'.repeat(78)}`);
[
    { nombre: '13-16 AK + 7-12 HK', st: estado({ '13,14,15,16': AK, [rango(7, 12)]: HK }) },
    { nombre: '1-16 HK',            st: estado({ [rango(1, 16)]: HK }) },
    { nombre: '1,7,13 HK',          st: estado({ '1,7,13': HK }) },
].forEach(({ nombre, st }) => {
    const viejo = (Object.values(st).reduce((a, b) => a + b, 0) / 17).toFixed(2);
    const nuevo = WMSI.calculate(st);
    console.log(`  ${nombre.padEnd(24)} viejo ${viejo}  →  nuevo ${nuevo.text}   (${WMSI.interpret(nuevo.wmsi).label})`);
});

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
