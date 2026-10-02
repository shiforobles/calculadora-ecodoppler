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

    // ── NIVEL 6 — casos que fallaban (correcciones_motor_A.md) ──
    { bloque: 'NIVEL 6', n: 1, nombre: 'BUG1a — anterior completa + anteroseptal (no inventar predominio)',
      estados: estado({ '1,2,7,8,13,14': HK }),
      esperado: 'Hipoquinesia de las paredes anterior y anteroseptal, con extensión al septum apical.' },

    { bloque: 'NIVEL 6', n: 2, nombre: 'BUG1b — inferior completa = núcleo, inferoseptal = extensión',
      estados: estado({ '3,4,9,10,15': HK }),
      esperado: 'Hipoquinesia de la pared inferior en toda su extensión, con extensión a la pared inferoseptal (basal y media).' },

    { bloque: 'NIVEL 6', n: 3, nombre: 'BUG1c — dos paredes parejas baso-mediales',
      estados: estado({ '1,7,2,8': HK }),
      esperado: 'Hipoquinesia de las paredes anterior y anteroseptal, baso-medial.' },

    { bloque: 'NIVEL 6', n: 4, nombre: 'BUG2 — sin pared completa, no decir "toda su extensión"',
      estados: estado({ '5,6,11,12,16': HK }),
      esperado: 'Hipoquinesia de las paredes anterolateral e inferolateral (basal y media), con extensión al segmento lateral apical.' },

    { bloque: 'NIVEL 6', n: 5, nombre: 'BUG3 — anillo completo como extensión (Takotsubo medio-apical)',
      estados: estado({ [rango(7, 16)]: HK }),
      esperado: 'Hipoquinesia difusa de los segmentos apicales y circunferencial de los segmentos medios.' },

    // Sigue sin fusionar nombres de paredes no contiguas (no inventa "anterolateral"),
    // pero el grado se nombra una sola vez porque ambos focos lo comparten.
    { bloque: 'NIVEL 6', n: 6, nombre: 'BUG4 — regiones no contiguas, sin fusionar nombres',
      estados: estado({ '1,7,13': HK, '5,11': HK }),
      esperado: 'Hipoquinesia de la pared anterior en toda su extensión e inferolateral baso-medial.' },

    { bloque: 'NIVEL 6', n: 7, nombre: 'CASI GLOBAL — 15/16 no se enumera',
      estados: estado({ '13': DK, '1,2,3,4,5,6,7,8,9,10,11,12,14,15,16': HK }),
      esperado: 'Disquinesia del segmento anterior apical, con hipoquinesia del resto del ventrículo izquierdo.' },

    { bloque: 'NIVEL 6', n: 8, nombre: 'CASI GLOBAL — 13/16 como núcleo',
      estados: estado({ '1,2,3,4,5,6,7,8,9,10,11,12,13': HK }),
      esperado: 'Hipoquinesia de casi la totalidad del ventrículo izquierdo.' },

    // ── MISMO GRADO: el grado se nombra una sola vez ──
    { bloque: 'MISMO GRADO', n: 1, nombre: '2,8 + 6,12 HK — sufijo común se dice una vez',
      estados: estado({ '2,8': HK, '6,12': HK }),
      esperado: 'Hipoquinesia anteroseptal y anterolateral baso-medial.' },

    { bloque: 'MISMO GRADO', n: 2, nombre: '1,7,13 + 5,11 HK — focos distintos, sin repetir el grado',
      estados: estado({ '1,7,13': HK, '5,11': HK }),
      esperado: 'Hipoquinesia de la pared anterior en toda su extensión e inferolateral baso-medial.' },

    // 4,10 y 5,11 son anatómicamente contiguos: forman un solo foco de dos paredes.
    // Al no ser prefijos simples no se fusiona el sufijo, pero el grado se dice una vez.
    { bloque: 'MISMO GRADO', n: 3, nombre: 'Dos focos con estructura distinta',
      estados: estado({ '1,7': HK, '4,10': HK, '5,11': HK }),
      esperado: 'Hipoquinesia de las paredes inferior e inferolateral, baso-medial y anterior baso-medial.' },

    // Los grados distintos siguen nombrando cada uno
    { bloque: 'MISMO GRADO', n: 4, nombre: 'Grados mixtos contiguos — sin cambios',
      estados: estado({ '13,14': AK, '7,8': HK }),
      esperado: 'Aquinesia anterior y septal apical, con hipoquinesia de los segmentos anterior y anteroseptal medios adyacentes.' },

    { bloque: 'MISMO GRADO', n: 5, nombre: 'Grados mixtos no contiguos — sin cambios',
      estados: estado({ '13': AK, '4': HK }),
      esperado: 'Aquinesia del segmento anterior apical e hipoquinesia del segmento inferior basal.' },

    // ── REGIÓN VERIFICADA ──
    // El nivel 6 fundía dos sectores contiguos en un nombre de pared y le pegaba el
    // alcance del conjunto entero, así que afirmaba segmentos que estaban normales.
    // Ahora la región nombrada tiene que tener segmentos marcados Y su alcance propio
    // tiene que ser el que se escribe; si no, se enumera.
    { bloque: 'REGIÓN VERIFICADA', n: 1, nombre: 'Septal + inferior no es "inferoseptal" (8,14,15)',
      estados: estado({ '8,14,15': HK }),
      esperado: 'Hipoquinesia de los segmentos anteroseptal medio, septal apical e inferior apical.' },

    { bloque: 'REGIÓN VERIFICADA', n: 2, nombre: 'Ningún segmento anteroseptal marcado (1,9,13)',
      estados: estado({ '1,9,13': HK }),
      esperado: 'Hipoquinesia de los segmentos anterior basal, inferoseptal medio y anterior apical.' },

    { bloque: 'REGIÓN VERIFICADA', n: 3, nombre: 'Un solo anteroseptal no abarca "toda su extensión" (1,8,13)',
      estados: estado({ '1,8,13': HK }),
      esperado: 'Hipoquinesia de los segmentos anterior basal, anteroseptal medio y anterior apical.' },

    { bloque: 'REGIÓN VERIFICADA', n: 4, nombre: 'Alcance menor que el del conjunto (1,2,9)',
      estados: estado({ '1,2,9': HK }),
      esperado: 'Hipoquinesia de los segmentos anterior basal, anteroseptal basal e inferoseptal medio.' },

    // La región válida se conserva: de la columna anteroseptal están marcados el 8 y
    // el 14, y su alcance propio es justamente medio-apical.
    { bloque: 'REGIÓN VERIFICADA', n: 5, nombre: 'Región legítima intacta (7,8,13,14)',
      estados: estado({ '7,8,13,14': HK }),
      esperado: 'Hipoquinesia de predominio anteroseptal medio-apical.' },

    // "septal" nombra el sector, no una columna: con las dos columnas septales
    // tomadas en los tres niveles la frase es verdadera.
    { bloque: 'REGIÓN VERIFICADA', n: 6, nombre: 'Sector septal completo (2,9,14)',
      estados: estado({ '2,9,14': HK }),
      esperado: 'Hipoquinesia de predominio septal en toda su extensión.' },

    // ── TECHO DE LA ENUMERACIÓN ──
    { bloque: 'TECHO ENUMERACIÓN', n: 1, nombre: 'Seis segmentos dispersos todavía se enumeran',
      estados: estado({ '1,4,8,11,14,15': HK }),
      esperado: 'Hipoquinesia de los segmentos anterior basal, inferior basal, anteroseptal medio, '
              + 'inferolateral medio, septal apical e inferior apical.' },

    { bloque: 'TECHO ENUMERACIÓN', n: 2, nombre: 'Siete dispersos: se describe la dispersión',
      estados: estado({ '1,3,4,6,8,11,14': HK }),
      esperado: 'Hipoquinesia de distribución parcheada, sin patrón territorial definido.' },
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
