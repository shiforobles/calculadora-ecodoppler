/**
 * Casos de prueba de la frase tricuspídea del informe narrativo.
 * Correr con: node tests/narrative-it.test.js
 *
 * Lo que se protege: que la gravedad cargada en el select aparezca escrita en el
 * informe. Una IT severa que se informa sin decir "severa" es un hallazgo perdido
 * en un documento firmado, y el modo narrativo la perdía en cuanto había una Vmax
 * IT cargada: "La insuficiencia tricuspídea (Vmax IT 3.2 m/s) determina una
 * probabilidad..." sale igual para una leve que para una torrencial.
 */
const path = require('path');
const BASE = path.join(__dirname, '..', 'js');

// ── DOM mínimo: cada id devuelve un elemento con el valor que le puso el caso ──
function montarDOM(valores) {
    const creados = {};
    const crear = id => ({
        id,
        value: valores[id] !== undefined ? String(valores[id]) : '',
        checked: valores[id] === true,
        textContent: '', innerHTML: '', style: {}, dataset: {},
        // los <select> se leen también por su opción elegida, no sólo por .value
        selectedIndex: 0, options: [{ text: valores[id] !== undefined ? String(valores[id]) : '' }],
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        querySelector: () => null, querySelectorAll: () => [],
        addEventListener() {}, dispatchEvent() {}, remove() {}, appendChild() {},
    });
    global.document = {
        getElementById: id => creados[id] || (creados[id] = crear(id)),
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => crear('creado'),
        body: { appendChild() {} },
    };
    global.window = global;
}

const HemodynamicsCalculator = require(path.join(BASE, 'hemodynamics.js'));
global.MotilityModel   = require(path.join(BASE, 'motility-model.js'));
global.MotilityEngine  = require(path.join(BASE, 'motility-engine.js'));
global.TerritoryEngine = require(path.join(BASE, 'territory-engine.js'));
global.WMSIEngine      = require(path.join(BASE, 'wmsi-engine.js'));
const UIController = require(path.join(BASE, 'ui-controller.js'));

/** Genera la conclusión narrativa con los campos de IT que pide el caso */
function narrativo(campos) {
    montarDOM(Object.assign({
        sexo: 'masculino', edad: '65', peso: '80', altura: '175',
        siv: '11', pp: '10', ddvi: '48', fevi: '55',
        ritmo: 'sinusal', pad: '5',
    }, campos));

    const ui = new UIController(new HemodynamicsCalculator(), null, null, null, {
        getMotilityTexts: () => ({ alterada: false, descripcion: '', descripcionMinuscula: '', territorio: '', wmsi: '1.00' }),
    });
    const vel = parseFloat(campos.vel_it) || 0;
    ui.state.psap = vel > 0 ? Math.round(4 * vel * vel + 5) : 0;
    return ui._buildNarrativeConclusion();
}

/** La(s) oración(es) que hablan de la tricúspide */
const fraseIT = texto => texto.split(/(?<=\.)\s+/).filter(f => /tricusp/i.test(f)).join(' ').replace(/\s+/g, ' ');

const GRADOS = ['leve', 'moderada', 'severa', 'masiva', 'torrencial'];
const COMBOS = [
    { id: 'a', desc: 'sólo el grado',             campos: {} },
    { id: 'b', desc: '+ velocidad',               campos: { vel_it: '3.2', it_vel_max: '3.2' } },
    { id: 'c', desc: '+ velocidad + VC/ORE/VR',   campos: { vel_it: '3.2', it_vel_max: '3.2', it_vc: '8', it_ore: '0.45', it_vr: '50' } },
    { id: 'd', desc: '+ flujo hepático reverso',  campos: { it_flujo_hep: 'reverso' } },
    { id: 'e', desc: '+ velocidad baja (HTP baja)', campos: { vel_it: '2.2', it_vel_max: '2.2' } },
];

let ok = 0, fail = 0;

console.log('═'.repeat(78));
console.log('La gravedad de la IT tiene que estar escrita en todas las ramas');
console.log('═'.repeat(78));

for (const grado of GRADOS) {
    for (const combo of COMBOS) {
        const texto = narrativo(Object.assign({ it_grado: grado }, combo.campos));
        const frase = fraseIT(texto);
        const pasa = frase.includes(grado);
        pasa ? ok++ : fail++;
        console.log(`\n${pasa ? '✅' : '❌'} ${grado} · ${combo.desc}`);
        console.log('   ' + frase);
    }
}

// ── "No valorable" no tiene gravedad que nombrar: se exige que lo diga ──
{
    const frase = fraseIT(narrativo({ it_grado: 'no_valorable', vel_it: '3.2', it_vel_max: '3.2' }));
    const pasa = /no se observa flujo de insuficiencia tricusp/i.test(frase);
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} no_valorable · se informa como no valorable, sin inventar un grado`);
    console.log('   ' + frase);
}

// ── El flujo hepático no puede partir la oración al medio ──
{
    const frase = fraseIT(narrativo({ it_grado: 'severa', vel_it: '3.2', it_vel_max: '3.2', it_flujo_hep: 'normal' }));
    const pasa = !/suprahep[áa]ticas determina/i.test(frase);
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} el inciso de venas suprahepáticas no queda intercalado en el verbo`);
    console.log('   ' + frase);
}

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
