/**
 * Casos de prueba de la rama de FIBRILACIÓN AURICULAR del clasificador diastólico.
 *
 * hemodynamics.js no tenía ninguna prueba y es donde vive TODA la lógica
 * diastólica (el músculo clínico de la app). Esta es su primera red de seguridad;
 * cubre la rama de FA, que usa 3 criterios (E/e' septal ≥11, IT >2.8, Vol AI >34)
 * con umbral ≥2 para "presiones elevadas".
 *
 * Correr con: node tests/hemodynamics.test.js
 */
const path = require('path');
const HemodynamicsCalculator = require(path.join(__dirname, '..', 'js', 'hemodynamics.js'));
const calc = new HemodynamicsCalculator();

// Cada caso: params al clasificador, y lo que se espera (grade, severity y
// subcadenas que la descripción tiene que contener).
const casos = [
    {
        nombre: 'FA · 0 criterios → presiones normales',
        params: { ritmo: 'fa', E: 80, ePrime: 12, eSeptal: 12, TRVel: 2.0, LAVolIndex: 28 },
        grade: 'Normal', severity: 'green', incluye: ['normales', '0/3'],
    },
    {
        nombre: 'FA · 1 criterio (solo AI dilatada) → indeterminado, NO elevadas',
        params: { ritmo: 'fa', E: 90, ePrime: 12, eSeptal: 12, TRVel: 2.0, LAVolIndex: 40 },
        grade: 'Indeterminado', severity: 'yellow', incluye: ['1/3', 'Valorar en conjunto'],
    },
    {
        nombre: 'FA · 2 criterios (E/e\' septal ≥11 + IT) → presiones elevadas',
        params: { ritmo: 'fa', E: 120, ePrime: 10, eSeptal: 10, TRVel: 3.2, LAVolIndex: 28 },
        grade: 'II', severity: 'red', incluye: ['elevadas', '2/3'],
    },
    {
        nombre: 'FA · <2 criterios medibles → datos insuficientes',
        params: { ritmo: 'fa', E: 90, ePrime: 11, eSeptal: 11 },
        grade: 'Indeterminado', severity: 'yellow', incluye: ['Datos insuficientes'],
    },
    {
        nombre: 'FA + BCRI · E/e\' no suma; elevadas por IT + Vol AI',
        params: { ritmo: 'fa', E: 140, ePrime: 10, eSeptal: 8, eLateral: 12, TRVel: 3.2, LAVolIndex: 40, context: { bcri: true } },
        grade: 'II', severity: 'red', incluye: ['elevadas', '2/2', 'no valorable por BCRI'],
    },
    {
        nombre: 'FA + FC >100 · advertencia de llenado acortado (no cambia el grado)',
        params: { ritmo: 'fa', E: 120, ePrime: 10, eSeptal: 10, TRVel: 3.2, LAVolIndex: 40, fc: 120 },
        grade: 'II', severity: 'red', incluye: ['elevadas', 'FC >100'],
    },
    {
        nombre: 'FA + IM severa · E/e\' excluido; elevadas por IT + Vol AI',
        params: { ritmo: 'fa', E: 140, ePrime: 10, eSeptal: 8, TRVel: 3.2, LAVolIndex: 40, context: { imSevera: true } },
        grade: 'II', severity: 'red', incluye: ['elevadas', '2/2', 'IM Severa'],
    },
];

let ok = 0, fail = 0;

console.log(`${'═'.repeat(78)}\nRama FA del clasificador diastólico (hemodynamics.js)\n${'═'.repeat(78)}`);

casos.forEach(c => {
    const r = calc.classifyDiastolicFunction(c.params);
    const checks = [];
    if (c.grade !== undefined)    checks.push([`grade=${c.grade}`,    r.grade === c.grade]);
    if (c.severity !== undefined) checks.push([`sev=${c.severity}`,   r.severity === c.severity]);
    (c.incluye || []).forEach(sub => checks.push([`"${sub}"`, (r.description || '').includes(sub)]));

    const pasa = checks.every(ch => ch[1]);
    pasa ? ok++ : fail++;

    console.log(`\n${pasa ? '✅' : '❌'} ${c.nombre}`);
    console.log(`   ${r.grade} · ${r.severity}`);
    console.log(`   ${r.description}`);
    if (!pasa) checks.filter(ch => !ch[1]).forEach(ch => console.log(`      ✗ falló: ${ch[0]}`));
});

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
