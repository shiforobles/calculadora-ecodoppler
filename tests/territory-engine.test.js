/**
 * Casos de prueba del Motor C — Fase 2 (territorios coronarios y patrones).
 * Correr con: node tests/territory-engine.test.js
 */
const path = require('path');
const BASE = path.join(__dirname, '..', 'js');

global.MotilityModel = require(path.join(BASE, 'motility-model.js'));
const Territory = require(path.join(BASE, 'territory-engine.js'));

const N = 1, HK = 2, AK = 3, DK = 4;

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
    // ── TERRITORIO ──
    { bloque: 'TERRITORIO', nombre: '3,4,9,10,15 (inferior + inferoseptal, sin el 14)',
      estados: estado({ '3,4,9,10,15': HK }), esperado: 'territorio CD' },

    { bloque: 'TERRITORIO', nombre: '3,4,9,10,14,15 (+ septal apical, 1 solo DA → se ignora)',
      estados: estado({ '3,4,9,10,14,15': HK }), esperado: 'territorio CD' },

    { bloque: 'TERRITORIO', nombre: '1,2,7,8,13,14 (DA completo)',
      estados: estado({ '1,2,7,8,13,14': HK }), esperado: 'territorio DA' },

    { bloque: 'TERRITORIO', nombre: '5,6,11,12,16 (Cx)',
      estados: estado({ '5,6,11,12,16': HK }), esperado: 'territorio Cx' },

    // DA 3 / Cx 2 es 1.5× exacto: NO es dominancia real. La pared anterior y la
    // inferolateral son dos regiones separadas, no una prolongación de la otra.
    { bloque: 'TERRITORIO', nombre: '1,7,13 + 5,11 (DA 3 / Cx 2, parejo 1.5×)',
      estados: estado({ '1,7,13,5,11': HK }), esperado: 'territorios DA y Cx' },

    { bloque: 'TERRITORIO', nombre: '1-16 (tres territorios parejos)',
      estados: estado({ [rango(1, 16)]: HK }), esperado: 'compromiso multiterritorial',
      // Con todo alterado además matchea el patrón de miocardiopatía dilatada
      esperadoPatron: 'compromiso global, compatible con miocardiopatía dilatada' },

    // ── PATRONES ──
    { bloque: 'PATRONES', nombre: '7-12 anillo medio aislado → NO Takotsubo',
      estados: estado({ [rango(7, 12)]: HK }), esperado: 'compromiso multiterritorial',
      esperadoPatron: null },

    { bloque: 'PATRONES', nombre: '1-6 anillo basal aislado → NO Takotsubo',
      estados: estado({ [rango(1, 6)]: HK }), esperado: 'compromiso multiterritorial',
      esperadoPatron: null },

    { bloque: 'PATRONES', nombre: '7-16 apical + medio, bases respetadas → SÍ Takotsubo',
      estados: estado({ [rango(7, 16)]: HK }),
      esperadoPatron: 'patrón apical con bases respetadas, compatible con miocardiopatía por estrés (Takotsubo)' },

    { bloque: 'PATRONES', nombre: '1-16 → dilatada, NO Takotsubo',
      estados: estado({ [rango(1, 16)]: HK }),
      esperadoPatron: 'compromiso global, compatible con miocardiopatía dilatada' },

    { bloque: 'PATRONES', nombre: '2,3,8,9,14 septum → disincronía',
      estados: estado({ '2,3,8,9,14': HK }),
      esperadoPatron: 'compromiso septal, compatible con disincronía (BCRI, estimulación por marcapasos o post-quirúrgica)' },

    { bloque: 'PATRONES', nombre: '13-16 apicales solos → sin patrón (ambiguo DA distal / Takotsubo)',
      estados: estado({ '13,14,15,16': HK }), esperadoPatron: null },

    // ── CHAGAS ──
    { bloque: 'CHAGAS', nombre: '13=DK + 4=HK (apical disquinético + inferobasal) → SÍ',
      estados: estado({ '13': DK, '4': HK }),
      esperadoPatron: 'distribución compatible con miocardiopatía chagásica (aneurisma apical con compromiso inferobasal)' },

    { bloque: 'CHAGAS', nombre: '13=DK + 5=HK (apical disquinético + inferolateral basal) → SÍ',
      estados: estado({ '13': DK, '5': HK }),
      esperadoPatron: 'distribución compatible con miocardiopatía chagásica (aneurisma apical con compromiso inferobasal)' },

    { bloque: 'CHAGAS', nombre: '13=HK + 4=HK (apical sólo hipoquinético) → NO',
      estados: estado({ '13': HK, '4': HK }), esperadoPatron: null },

    { bloque: 'CHAGAS', nombre: '13=DK solo (sin componente inferobasal) → NO',
      estados: estado({ '13': DK }), esperadoPatron: null, esperado: 'territorio DA' },

    { bloque: 'CHAGAS', nombre: '1,2,7,8,13,14 con 13=DK (sigue territorio DA) → NO',
      estados: estado({ '1,2,7,8,14': HK, '13': DK }), esperadoPatron: null, esperado: 'territorio DA' },

    // ── UMBRAL SEGÚN EL TOTAL ──
    // Con pocos segmentos alterados, uno solo es un tercio de la información: antes
    // se descartaba por no llegar a dos y el informe atribuía todo al vaso dominante.
    { bloque: 'UMBRAL POR TOTAL', nombre: '1,2,9 (DA 2 / CD 1, total 3) → la CD no se descarta',
      estados: estado({ '1,2,9': HK }), esperado: 'territorio DA con extensión a territorio CD' },

    { bloque: 'UMBRAL POR TOTAL', nombre: '1,2,7,9 (DA 3 / CD 1, total 4) → la CD no se descarta',
      estados: estado({ '1,2,7,9': HK }), esperado: 'territorio DA con extensión a territorio CD' },

    // De cinco en adelante vuelve a valer el umbral: ahí un segmento suelto sí es
    // ruido anatómico.
    { bloque: 'UMBRAL POR TOTAL', nombre: '1,2,7,8,9 (DA 4 / CD 1, total 5) → la CD se ignora',
      estados: estado({ '1,2,7,8,9': HK }), esperado: 'territorio DA' },

    // ── DA ENVOLVENTE (wrap-around) ──
    // La DA que dobla el ápex irriga el apical inferior. Si lo único fuera de su
    // territorio es apical, es un solo vaso largo y no enfermedad de dos vasos.
    { bloque: 'DA DISTAL', nombre: '8,14,15 (lo no-DA es el apical inferior)',
      estados: estado({ '8,14,15': HK }),
      esperado: 'compatible con territorio de la descendente anterior distal' },

    { bloque: 'DA DISTAL', nombre: '13,14,15,16 (anillo apical completo)',
      estados: estado({ '13,14,15,16': HK }),
      esperado: 'compatible con territorio de la descendente anterior distal' },

    { bloque: 'DA DISTAL', nombre: '1,2,7,8,13,14,15 (DA extensa + apical inferior)',
      estados: estado({ '1,2,7,8,13,14,15': HK }),
      esperado: 'compatible con territorio de la descendente anterior distal' },

    // Un segmento no-DA que NO es apical descarta la regla: ahí sí hay dos vasos.
    { bloque: 'DA DISTAL', nombre: '1,2,7,8,10 (el no-DA es inferior medio) → no aplica',
      estados: estado({ '1,2,7,8,10': HK }), esperado: 'territorio DA' },

    // Con un solo segmento de DA no hay con qué sostener la regla de DA distal. Y
    // 1 vs 1 no es multiterritorial: son dos apicales vecinos de distinto territorio.
    { bloque: 'DA DISTAL', nombre: '14,15 (DA 1 / CD 1) → no aplica DA distal, parejo',
      estados: estado({ '14,15': HK }), esperado: 'territorios DA y CD' },

    // ── PAREJOS vs DOMINANCIA (regla estricta >1.5×) ──
    // El caso que motivó la regla: dos paredes opuestas con extensión pareja. Cada
    // una es su territorio; el 14 (septal apical, DA) es un solo segmento y se
    // descarta como ruido. Cx 3 / CD 2 = 1.5× → parejo, no "con extensión a".
    { bloque: 'PAREJO vs DOMINANCIA', nombre: '3,9,14 + 6,12,16 (Cx 3 / CD 2 / DA 1 ruido)',
      estados: estado({ '3,9,14,6,12,16': HK }), esperado: 'territorios CD y Cx' },

    // Empate puro 3-3: también en paralelo, en orden canónico DA, CD, Cx.
    { bloque: 'PAREJO vs DOMINANCIA', nombre: '1,7,8 + 4,10,15 (DA 3 / CD 3, empate)',
      estados: estado({ '1,7,8,4,10,15': HK }), esperado: 'territorios DA y CD' },

    // Tres parejos SIN patrón de fondo: sigue siendo multiterritorial.
    { bloque: 'PAREJO vs DOMINANCIA', nombre: '1,7,13 + 4,10,15 + 6,12,16 (3-3-3)',
      estados: estado({ '1,7,13,4,10,15,6,12,16': HK }), esperado: 'compromiso multiterritorial', esperadoPatron: null },

    // Dominancia REAL (>1.5×): estas DEBEN seguir diciendo "con extensión a".
    { bloque: 'PAREJO vs DOMINANCIA', nombre: '1,2,7,8 + 5,11 (DA 4 / Cx 2, 2.0×)',
      estados: estado({ '1,2,7,8,5,11': HK }), esperado: 'territorio DA con extensión a territorio Cx' },

    { bloque: 'PAREJO vs DOMINANCIA', nombre: '5,6,11,12 + 4,10 (Cx 4 / CD 2, 2.0×)',
      estados: estado({ '5,6,11,12,4,10': HK }), esperado: 'territorio Cx con extensión a territorio CD' },
];

let ok = 0, fail = 0, bloqueActual = '';

casos.forEach(c => {
    if (c.bloque !== bloqueActual) {
        bloqueActual = c.bloque;
        console.log(`\n${'═'.repeat(78)}\nBLOQUE ${c.bloque}\n${'═'.repeat(78)}`);
    }

    const r = Territory.interpret(c.estados);
    console.log(`\n• ${c.nombre}`);
    console.log(`   conteo    : DA ${r.counts.DA} | CD ${r.counts.CD} | Cx ${r.counts.Cx}`);

    if (c.esperado !== undefined) {
        const pasa = r.territory === c.esperado;
        pasa ? ok++ : fail++;
        console.log(`   ${pasa ? '✅' : '❌'} territorio: ${r.territory}`);
        if (!pasa) console.log(`      esperado : ${c.esperado}`);
    }

    if (c.esperadoPatron !== undefined) {
        const pasa = r.pattern === c.esperadoPatron;
        pasa ? ok++ : fail++;
        console.log(`   ${pasa ? '✅' : '❌'} patrón    : ${r.pattern === null ? '(ninguno)' : r.pattern}`);
        if (!pasa) console.log(`      esperado : ${c.esperadoPatron === null ? '(ninguno)' : c.esperadoPatron}`);
    }
});

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
