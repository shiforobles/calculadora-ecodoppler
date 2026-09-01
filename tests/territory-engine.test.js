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

    { bloque: 'TERRITORIO', nombre: '1,7,13 + 5,11 (Cx = 40% del total)',
      estados: estado({ '1,7,13,5,11': HK }), esperado: 'territorio DA con extensión a territorio Cx' },

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
