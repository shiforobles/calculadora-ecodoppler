/**
 * Casos de prueba del informe focalizado (eco en cama).
 * Correr con: node tests/quick-report.test.js
 */
const path = require('path');
const BASE = path.join(__dirname, '..', 'js');

global.MotilityModel   = require(path.join(BASE, 'motility-model.js'));
global.MotilityEngine  = require(path.join(BASE, 'motility-engine.js'));
global.TerritoryEngine = require(path.join(BASE, 'territory-engine.js'));
const Quick = require(path.join(BASE, 'quick-report.js'));

/** Devuelve sólo los párrafos clínicos, sin el encabezado */
const cuerpo = texto => texto.split('\n').slice(3).filter(l => l.trim() && !/^(Paciente|Peso)/.test(l));

const segmentos = asign => {
    const s = {};
    for (let i = 1; i <= 17; i++) s[i] = 1;
    Object.entries(asign).forEach(([k, v]) => k.split(',').map(Number).forEach(i => { s[i] = v; }));
    return s;
};

const casos = [
    {
        nombre: 'Ejemplo de referencia — miocardiopatía dilatada con IM funcional',
        datos: {
            paciente: { nombre: 'X', edad: 70, sexo: 'M', peso: 75, talla: 170, fecha: '2026-09-14' },
            ritmo: 'sinusal',
            vi: { tamano: 'moderada', espesores: 'normales', fey: 35, motilidad: 'global' },
            diastolica: 'II', ai: 'moderada',
            derechas: { vd_tamano: 'leve', vd_funcion: 'conservada', htp: 'intermedia' },
            mitral: { morfologia: 'normal', insuficiencia: 'moderada', estenosis: 'no' },
            aortica: { morfologia: 'normal', insuficiencia: 'no', estenosis: 'no' },
            tricuspide: { insuficiencia: 'leve' },
            vci: 'dilatada_sin_colapso', pericardio: 'libre',
        },
        esperado: [
            'El ventrículo izquierdo se encuentra moderadamente dilatado, con espesores parietales conservados, hipoquinesia global y deterioro moderado de la función sistólica (FEy 35%).',
            'Desde el punto de vista hemodinámico, se evidencia disfunción diastólica grado II, con presiones de llenado elevadas, asociado a dilatación moderada de la aurícula izquierda.',
            'El aparato valvular mitral es morfológicamente normal, con insuficiencia mitral moderada de mecanismo funcional por dilatación de cavidades. La válvula aórtica es trivalva, sin estenosis ni insuficiencia significativas.',
            'Las cavidades derechas muestran dilatación leve del ventrículo derecho, con función sistólica conservada. Se constata insuficiencia tricuspídea leve, con probabilidad ecocardiográfica intermedia de hipertensión pulmonar. La vena cava inferior se encuentra dilatada sin colapso inspiratorio, sugestivo de presiones de llenado derechas elevadas.',
            'Pericardio libre.',
        ],
    },
    {
        nombre: 'Sin tamaño del VI cargado — no deja coma colgada',
        datos: { vi: { fey: 60 }, pericardio: 'libre' },
        esperado: [
            'El ventrículo izquierdo presenta función sistólica conservada (FEy 60%).',
            'Pericardio libre.',
        ],
    },
    {
        nombre: 'Estudio vacío — no inventa nada',
        datos: {},
        esperado: [],
    },
    {
        nombre: 'IM moderada con válvula NORMAL pero FEy conservada — no infiere mecanismo funcional',
        datos: {
            vi: { tamano: 'moderada', fey: 60 },
            mitral: { morfologia: 'normal', insuficiencia: 'moderada' },
        },
        contiene: ['insuficiencia mitral moderada'],
        noContiene: ['mecanismo funcional'],
    },
    {
        nombre: 'IM moderada con válvula ENFERMA y FEy baja — tampoco la infiere',
        datos: {
            vi: { tamano: 'severa', fey: 28 },
            mitral: { morfologia: 'reumatica', insuficiencia: 'moderada' },
        },
        contiene: ['aspecto reumático', 'insuficiencia mitral moderada'],
        noContiene: ['mecanismo funcional'],
    },
    {
        nombre: 'Fibrilación auricular — se enuncia el ritmo',
        datos: { ritmo: 'fa', vi: { tamano: 'normal', fey: 55 } },
        contiene: ['En fibrilación auricular, el ventrículo izquierdo es de dimensiones conservadas'],
    },
    {
        nombre: 'FEy en cada umbral',
        multi: [
            { datos: { vi: { fey: 52 } }, contiene: ['función sistólica conservada (FEy 52%)'] },
            { datos: { vi: { fey: 51 } }, contiene: ['deterioro leve de la función sistólica (FEy 51%)'] },
            { datos: { vi: { fey: 40 } }, contiene: ['deterioro moderado de la función sistólica (FEy 40%)'] },
            { datos: { vi: { fey: 29 } }, contiene: ['deterioro severo de la función sistólica (FEy 29%)'] },
        ],
    },
    {
        nombre: 'Motilidad segmentaria — delega en el Motor A y el Motor C',
        datos: {
            vi: { tamano: 'normal', fey: 45, motilidad: 'segmentaria', segmentos: segmentos({ '3,4,9,10,15': 2 }) },
        },
        contiene: ['hipoquinesia de la pared inferior en toda su extensión', 'territorio CD'],
    },
    {
        nombre: 'Nunca aparece un número que no sea la FEy',
        datos: {
            vi: { tamano: 'severa', espesores: 'moderada', fey: 30 },
            ai: 'severa', derechas: { vd_tamano: 'moderada', ad: 'leve' },
            mitral: { morfologia: 'mac', insuficiencia: 'severa' },
            vci: 'dilatada_sin_colapso', pericardio: 'moderado',
        },
        sinNumerosSalvoFey: true,
    },
    {
        nombre: 'Hallazgos asociados',
        datos: {
            extras: { pleural: 'bilateral', trombo: 'si', trombo_texto: 'trombo apical móvil', cateter: 'si' },
        },
        contiene: ['derrame pleural bilateral', 'trombo apical móvil', 'catéter/electrodo en cavidades derechas'],
    },
];

let ok = 0, fail = 0;

function evaluar(nombre, datos, spec) {
    const texto = Quick.generate(datos);
    const lineas = cuerpo(texto);

    if (spec.esperado) {
        const pasa = JSON.stringify(lineas) === JSON.stringify(spec.esperado);
        pasa ? ok++ : fail++;
        console.log(`\n${pasa ? '✅' : '❌'} ${nombre}`);
        if (!pasa) {
            console.log('   esperado:'); spec.esperado.forEach(l => console.log('     ' + l));
            console.log('   obtenido:'); lineas.forEach(l => console.log('     ' + l));
        } else {
            lineas.forEach(l => console.log('   ' + l));
        }
        return;
    }

    let pasa = true;
    const fallos = [];
    (spec.contiene || []).forEach(frag => {
        if (!texto.includes(frag)) { pasa = false; fallos.push(`falta: "${frag}"`); }
    });
    (spec.noContiene || []).forEach(frag => {
        if (texto.includes(frag)) { pasa = false; fallos.push(`no debería estar: "${frag}"`); }
    });
    if (spec.sinNumerosSalvoFey) {
        // Se quita la FEy y la fecha del encabezado; lo que quede no debe tener dígitos
        const sinFey = lineas.join(' ').replace(/\(FEy \d+%\)/g, '');
        const nums = sinFey.match(/\d/g);
        if (nums) { pasa = false; fallos.push(`aparecen números inventados: ${sinFey}`); }
    }
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} ${nombre}`);
    if (!pasa) fallos.forEach(f => console.log('   ' + f));
    else lineas.forEach(l => console.log('   ' + l));
}

console.log('═'.repeat(78));
console.log('INFORME FOCALIZADO — casos de prueba');
console.log('═'.repeat(78));

casos.forEach(c => {
    if (c.multi) {
        console.log(`\n▸ ${c.nombre}`);
        c.multi.forEach(sub => evaluar(`  FEy ${sub.datos.vi.fey}`, sub.datos, sub));
    } else {
        evaluar(c.nombre, c.datos, c);
    }
});

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
