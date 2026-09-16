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
            'El ventrículo izquierdo se encuentra moderadamente dilatado, con espesores parietales conservados, hipoquinesia global, y deterioro moderado de la función sistólica (FEy 35%).',
            'Desde el punto de vista hemodinámico, se evidencia disfunción diastólica grado II, con presiones de llenado elevadas, asociado a dilatación moderada de la aurícula izquierda.',
            'El aparato valvular mitral es morfológicamente normal, con insuficiencia mitral moderada de mecanismo funcional por dilatación de cavidades. La válvula aórtica es trivalva, sin estenosis ni insuficiencia significativas.',
            'Las cavidades derechas muestran dilatación leve del ventrículo derecho, con función sistólica conservada. Se constata insuficiencia tricuspídea leve, con probabilidad ecocardiográfica intermedia de hipertensión pulmonar (PSAP estimada 36-50 mmHg). La vena cava inferior se encuentra dilatada sin colapso inspiratorio, sugestivo de presiones de llenado derechas elevadas.',
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

// ── Encabezado: exactamente estas líneas, sin rótulos de tipo de estudio ──
{
    const esperado = [
        'ECOCARDIOGRAMA DOPPLER CARDÍACO',
        '='.repeat(80),
        'Estudio realizado en cama del paciente.',
        'Peso 80 kg | Talla 178 cm | SC 1.99 m²',
    ].join('\n');
    const obtenido = Quick.generate({
        paciente: { nombre: 'X', edad: 70, sexo: 'M', peso: 80, talla: 178, fecha: '2026-09-15' },
    }).split('\n\n')[0];
    const pasa = obtenido === esperado && !/focalizada|cualitativa/i.test(obtenido);
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} Encabezado exacto`);
    console.log(obtenido.split('\n').map(l => '   ' + l).join('\n'));
    if (!pasa) console.log('   esperado:\n' + esperado.split('\n').map(l => '   ' + l).join('\n'));
}

// ── Todo en su opción normal (estado de partida de la pantalla) ──
casos.unshift({
    nombre: 'Estado de partida: todo normal, FEy cargada',
    datos: {
        ritmo: 'sinusal',
        vi: { tamano: 'normal', espesores: 'normales', motilidad: 'conservada', fey: 60 },
        diastolica: 'normal', ai: 'normal',
        derechas: { vd_tamano: 'normal', vd_funcion: 'conservada', ad: 'normal', htp: 'baja' },
        mitral: { morfologia: 'normal', insuficiencia: 'no', estenosis: 'no' },
        aortica: { morfologia: 'normal', insuficiencia: 'no', estenosis: 'no' },
        tricuspide: { insuficiencia: 'no' },
        vci: 'normal', pericardio: 'libre',
        extras: { pleural: 'no', trombo: 'no', cateter: 'no' },
    },
    esperado: [
        'El ventrículo izquierdo es de dimensiones conservadas, con espesores parietales conservados, motilidad parietal conservada, y función sistólica conservada (FEy 60%).',
        'Desde el punto de vista hemodinámico, la función diastólica es normal, con presiones de llenado dentro de límites fisiológicos; la aurícula izquierda es de dimensiones conservadas.',
        'El aparato valvular mitral es morfológicamente normal, sin estenosis ni insuficiencia significativas. La válvula aórtica es trivalva, sin estenosis ni insuficiencia significativas.',
        'Las cavidades derechas son de dimensiones y función conservadas. Se estima baja probabilidad ecocardiográfica de hipertensión pulmonar (PSAP estimada ≤35 mmHg). La vena cava inferior es de calibre normal, con colapso inspiratorio conservado.',
        'Pericardio libre.',
    ],
});

casos.forEach(c => {
    if (c.multi) {
        console.log(`\n▸ ${c.nombre}`);
        c.multi.forEach(sub => evaluar(`  FEy ${sub.datos.vi.fey}`, sub.datos, sub));
    } else {
        evaluar(c.nombre, c.datos, c);
    }
});

// ── Rango de PSAP según probabilidad de HTP ──
{
    const RANGOS = {
        baja:         'con baja probabilidad ecocardiográfica de hipertensión pulmonar (PSAP estimada ≤35 mmHg)',
        intermedia:   'con probabilidad ecocardiográfica intermedia de hipertensión pulmonar (PSAP estimada 36-50 mmHg)',
        alta:         'con alta probabilidad ecocardiográfica de hipertensión pulmonar (PSAP estimada >50 mmHg)',
        no_valorable: 'sin poder estimar la probabilidad de hipertensión pulmonar',
    };
    console.log('\n▸ Rango de PSAP por probabilidad de HTP');
    ['no', 'leve', 'moderada'].forEach(it => {
        Object.entries(RANGOS).forEach(([htp, frase]) => {
            const texto = Quick.generate({ derechas: { htp }, tricuspide: { insuficiencia: it } });
            let pasa = texto.includes(frase.replace(/^con /, it === 'no' && htp !== 'no_valorable' ? '' : 'con '));
            // "no valorable" nunca lleva rango
            if (htp === 'no_valorable' && /PSAP/.test(texto)) pasa = false;
            pasa ? ok++ : fail++;
            const linea = texto.split('\n\n').pop();
            console.log(`${pasa ? '✅' : '❌'}   IT ${it.padEnd(8)} · HTP ${htp.padEnd(12)} → ${linea}`);
        });
    });
}

// ── Nunca un valor puntual de PSAP: cualquier "mmHg" debe ser uno de los tres rangos ──
{
    const PERMITIDOS = ['≤35', '36-50', '>50'];
    const htps = ['baja', 'intermedia', 'alta', 'no_valorable', undefined];
    const its  = ['no', 'trace', 'leve', 'moderada', 'severa', 'masiva', undefined];
    let violaciones = [];
    htps.forEach(htp => its.forEach(it => {
        const texto = Quick.generate({
            vi: { tamano: 'moderada', fey: 40 },
            derechas: { htp, vd_tamano: 'leve', vd_funcion: 'leve' },
            tricuspide: { insuficiencia: it }, vci: 'dilatada_sin_colapso',
        });
        const valores = [...texto.matchAll(/(\S+)\s*mmHg/g)].map(m => m[1]);
        valores.filter(v => !PERMITIDOS.includes(v)).forEach(v => violaciones.push(`${v} (HTP ${htp}, IT ${it})`));
    }));
    const pasa = violaciones.length === 0;
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} Ningún valor puntual de PSAP en ${htps.length * its.length} combinaciones`);
    if (!pasa) violaciones.forEach(v => console.log('   aparece: ' + v));
}

// ── Coma antes de la función sistólica, también con motilidad segmentaria ──
{
    const texto = Quick.generate({
        vi: { tamano: 'normal', fey: 45, motilidad: 'segmentaria', segmentos: segmentos({ '1,2,7,8,13,14': 2 }) },
    });
    const pasa = texto.includes('con extensión al septum apical, territorio DA, y deterioro leve de la función sistólica (FEy 45%)');
    pasa ? ok++ : fail++;
    console.log(`\n${pasa ? '✅' : '❌'} Coma antes de la función sistólica (motilidad segmentaria)`);
    console.log('   ' + cuerpo(texto)[0]);
}

console.log(`\n${'═'.repeat(78)}`);
console.log(`RESULTADO: ${ok} correctos, ${fail} fallidos`);
console.log('═'.repeat(78));
process.exit(fail ? 1 : 0);
