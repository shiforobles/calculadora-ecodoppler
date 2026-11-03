/** MCH: lógica pura (js/mch.js). Especificación aprobada 02/11/2026. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MCH = require('../js/mch.js');

const dx = (rest, valsalva, extra = {}) => MCH.diagnosis({ pattern: 'septal asimétrica', rest, valsalva, ...extra });
const dxc = (rest, valsalva, extra = {}) => MCH.diagnosis({ pattern: 'septal asimétrica', rest, valsalva, ...extra }, { conclusion: true });

test('TSVI: bordes 29 / 30 / 49 / 50 mmHg en reposo', () => {
    assert.equal(dx('29', '20'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica no obstructiva.');
    assert.equal(dx('30', '30'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica obstructiva en reposo.');
    assert.equal(dx('49', '49'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica obstructiva en reposo.');
    assert.equal(dx('50', '50'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica obstructiva en reposo, hemodinámicamente significativa.');
});

test('TSVI: provocación ausente, negativa y positiva', () => {
    assert.equal(dx('20', ''), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica, sin obstrucción del TSVI en reposo (no se realizó maniobra de Valsalva).');
    assert.equal(dx('20', '29'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica no obstructiva.');
    assert.equal(dx('20', '30'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable.');
    assert.equal(dx('20', '49'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable.');
    assert.equal(dx('20', '50'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable, hemodinámicamente significativa.');
});

test('sin Valsalva nunca se escribe "no obstructiva"', () => {
    for (const rest of ['0', '10', '29']) assert.doesNotMatch(dx(rest, ''), /no obstructiva/);
    assert.equal(dx('', ''), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica.');
    assert.equal(dx('', '20'), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica.');
});

test('conclusión: gradiente máximo solo si es obstructiva, y SAM', () => {
    assert.equal(dxc('18', '62', { sam: 'contacto' }),
        'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica con obstrucción provocable, hemodinámicamente significativa (gradiente pico del TSVI de 18 mmHg en reposo y de 62 mmHg con Valsalva), con SAM y contacto septal.');
    assert.equal(dxc('10', '15', { sam: 'no' }), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica no obstructiva (gradiente pico del TSVI de 10 mmHg en reposo y de 15 mmHg con Valsalva), sin SAM.');
    assert.equal(dxc('20', ''), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica, sin obstrucción del TSVI en reposo (no se realizó maniobra de Valsalva) (gradiente pico del TSVI de 20 mmHg en reposo; Valsalva no realizado).');
    assert.equal(MCH.diagnosis({ pattern: '', rest: '', valsalva: '' }), 'Hallazgos compatibles con miocardiopatía hipertrófica.');
});

const base = { E: '96', septal: '5', lateral: '7', tr: '3.0', lavi: '41', mr: 'no' };   // E/e′ 16

test('presión de AI: mayoría de los criterios medidos', () => {
    assert.equal(MCH.diastolic(base).result, 'elevada');                                     // 3/3
    assert.equal(MCH.diastolic({ ...base, tr: '2.5' }).result, 'elevada');                   // 2/3
    assert.equal(MCH.diastolic({ ...base, tr: '2.5', lavi: '30' }).result, 'no-elevada');    // 1/3
    assert.equal(MCH.diastolic({ E: '60', septal: '8', lateral: '10', tr: '2.2', lavi: '28' }).result, 'no-elevada'); // 0/3
    assert.equal(MCH.diastolic({ ...base, tr: '2.5', lavi: '30', arDuration: '170', aDuration: '130' }).result, 'indeterminada'); // 2/4
});

test('presión de AI: menos de 2 criterios = no valorable; vacío no cuenta como normal', () => {
    const r = MCH.diastolic({ tr: '3.2' });
    assert.equal(r.measured, 1); assert.equal(r.result, 'no-valorable');
    assert.equal(MCH.diastolicConclusion(r), 'Función diastólica no valorable por datos insuficientes (criterios para MCH).');
    assert.equal(MCH.diastolic({}).result, 'no-valorable');
});

test('umbrales exactos: estrictos para E/e′, IT y LAVi; Ar−A inclusivo', () => {
    const st = d => Object.fromEntries(MCH.diastolic(d).criteria.map(c => [c.key, c.state]));
    assert.deepEqual(st({ E: '84', septal: '6', lateral: '6', tr: '2.8', lavi: '34', arDuration: '160', aDuration: '130' }),
        { ee: 'neg', tr: 'neg', lavi: 'neg', arA: 'pos' });                                  // 14 / 2.8 / 34 / 30
    assert.deepEqual(st({ E: '85', septal: '6', lateral: '6', tr: '2.81', lavi: '34.1', arDuration: '159', aDuration: '130' }),
        { ee: 'pos', tr: 'pos', lavi: 'pos', arA: 'neg' });
});

test('E/e′ promedio exige e′ septal y lateral; con MAC no cuenta', () => {
    assert.equal(MCH.diastolic({ E: '96', septal: '5', tr: '3', lavi: '41' }).criteria[0].state, 'na');
    const r = MCH.diastolic({ ...base, mac: true });
    assert.equal(r.criteria[0].excluded, 'MAC'); assert.equal(r.measured, 2);
    assert.match(MCH.diastolicNarrative(r), /no se consideró por la presencia de MAC/);
});

test('IM moderada o mayor: se cuenta igual y se advierte', () => {
    const r = MCH.diastolic({ ...base, mr: 'moderada' });
    assert.equal(r.result, 'elevada');
    assert.equal(MCH.diastolicConclusion(r),
        'Presiones de llenado del VI elevadas según criterios para MCH (3 de 3 positivos: E/e′ promedio 16 >14; Vmax IT 3.0 m/s >2.8; Vol. AI 41 mL/m² >34). En presencia de insuficiencia mitral moderada, el volumen auricular y la velocidad tricuspídea pueden estar influidos por la regurgitación.');
    assert.doesNotMatch(MCH.diastolicConclusion(MCH.diastolic({ ...base, mr: 'leve' })), /insuficiencia mitral/);
});

test('líneas de Lista y párrafo narrativo del caso aprobado', () => {
    const d = { pattern: 'septal asimétrica', thickness: '21', location: 'septum basal', siv: '21', pp: '10', sam: 'contacto',
        jet: 'posterior', hasMr: true, mrLabel: 'moderada', apical: 'no', rest: '18', valsalva: '62', ...base, mr: 'moderada' };
    assert.equal(MCH.morphologyListLine(d), 'MCH: Hipertrofia septal asimétrica, espesor máximo 21 mm (septum basal), relación septo/PP 2.1. SAM con contacto septal. IM de jet posterior. Sin aneurisma apical.');
    assert.equal(MCH.obstructionListLine(d), 'TSVI: gradiente pico 18 mmHg en reposo; 62 mmHg con Valsalva.');
    assert.equal(MCH.obstructionListLine({ rest: '18' }), 'TSVI: gradiente pico 18 mmHg en reposo; Valsalva no realizado.');
    assert.equal(MCH.diastolicListLine(MCH.diastolic(d)), 'Diástole (criterios MCH): E/e′ promedio 16 (>14); Vmax IT 3.0 m/s (>2.8); Vol. AI 41 mL/m² (>34).');
    assert.equal(MCH.morphologyNarrative(d),
        'El espesor parietal máximo es de 21 mm a nivel del septum basal, con una relación septo/pared posterior de 2.1, sin aneurisma apical. ' +
        'Se observa movimiento anterior sistólico de la valva mitral con contacto septal, asociado a insuficiencia mitral moderada de jet posterior. ' +
        'El gradiente pico del tracto de salida del ventrículo izquierdo es de 18 mmHg en reposo y aumenta a 62 mmHg con la maniobra de Valsalva.');
    assert.match(MCH.diastolicNarrative(MCH.diastolic(d)), /todos por encima de los valores de referencia, hallazgos compatibles con presiones de llenado del ventrículo izquierdo elevadas/);
});

test('caso de Lucas (03/11): relación con espesor máximo septal, síntesis con presiones valoradas', () => {
    const d = { pattern: 'concéntrica', thickness: '17', location: 'septum basal', siv: '9', pp: '9', sam: 'si',
        rest: '30', valsalva: '45', E: '100', septal: '6', lateral: '7', tr: '1.5', lavi: '28' };
    assert.match(MCH.morphologyNarrative(d), /relación septo\/pared posterior de 1\.9/);
    assert.equal(MCH.ratio('9', '9', '17', 'ápex'), 1);   // espesor máximo fuera del septum: SIV/PP
    const r = MCH.diastolic(d);
    assert.match(MCH.diastolicNarrative(r), /E\/e′ promedio de 15\.4 por encima del valor de referencia, con velocidad de la insuficiencia tricuspídea de 1\.5 m\/s y volumen indexado de la aurícula izquierda de 28 mL\/m² dentro de los valores de referencia, hallazgos compatibles con presiones de llenado del ventrículo izquierdo no elevadas/);
    assert.equal(MCH.narrativeSummary(d, r, 'función sistólica global preservada (FEy 60%)'),
        'En síntesis, hallazgos compatibles con miocardiopatía hipertrófica concéntrica obstructiva en reposo (gradiente pico del TSVI de 30 mmHg en reposo y de 45 mmHg con Valsalva), con movimiento anterior sistólico mitral sin contacto septal y función sistólica global preservada (FEy 60%). ' +
        'Presiones de llenado del ventrículo izquierdo no elevadas según los criterios específicos para miocardiopatía hipertrófica (1 de 3 criterios positivos).');
});

test('no inventa morfología: campos vacíos no aparecen', () => {
    assert.equal(MCH.morphologyListLine({}), '');
    assert.equal(MCH.obstructionListLine({}), '');
    assert.equal(MCH.morphologyNarrative({}), '');
    assert.equal(MCH.diastolicListLine(MCH.diastolic({})), '');
});

test('patrón sugerido: septo/PP ≥1.3 en septum → septal asimétrica; ápex → apical', () => {
    assert.equal(MCH.suggestedPattern({ thickness: '17', location: 'septum basal', siv: '9', pp: '9' }), 'septal asimétrica'); // 1.9
    assert.equal(MCH.suggestedPattern({ thickness: '13', location: 'septum medio', siv: '13', pp: '10' }), 'septal asimétrica'); // 1.3
    assert.equal(MCH.suggestedPattern({ thickness: '12', location: 'septum basal', siv: '12', pp: '10' }), '');                  // 1.2
    assert.equal(MCH.suggestedPattern({ thickness: '18', location: 'ápex', siv: '9', pp: '9' }), 'apical');
    assert.equal(MCH.suggestedPattern({ thickness: '18', location: 'pared lateral', siv: '9', pp: '9' }), '');
    assert.equal(MCH.suggestedPattern({ location: 'septum basal' }), '');
});

test('frase según contexto: conocida directa, primer hallazgo compatible, con confusores sugestivo', () => {
    const b = { pattern: 'septal asimétrica', thickness: '18', rest: '10', valsalva: '15' };
    assert.equal(MCH.diagnosis({ ...b, known: true }), 'Miocardiopatía hipertrófica septal asimétrica no obstructiva.');
    assert.equal(MCH.diagnosis(b), 'Hallazgos compatibles con miocardiopatía hipertrófica septal asimétrica no obstructiva.');
    assert.equal(MCH.diagnosis({ ...b, hta: true }),
        'Hallazgos sugestivos de miocardiopatía hipertrófica septal asimétrica no obstructiva, a correlacionar con el contexto clínico (hipertensión arterial).');
    assert.equal(MCH.diagnosis({ ...b, eaGrade: 'moderada-severa' }),
        'Hallazgos sugestivos de miocardiopatía hipertrófica septal asimétrica no obstructiva, a correlacionar con el contexto clínico (estenosis aórtica moderada a severa).');
    assert.equal(MCH.diagnosis({ ...b, eaGrade: 'leve' }), MCH.diagnosis(b));                       // EAo leve no cambia la frase
    assert.match(MCH.diagnosis({ ...b, thickness: '14' }), /^Hallazgos sugestivos.*\(espesor máximo de 14 mm\)\.$/);
    assert.equal(MCH.diagnosis({ ...b, thickness: '14', hta: true, known: true }), 'Miocardiopatía hipertrófica septal asimétrica no obstructiva.');
    const r = MCH.diastolic({ tr: '2', lavi: '30' });
    assert.match(MCH.narrativeSummary({ ...b, known: true }, r, ''), /^En síntesis, miocardiopatía hipertrófica septal asimétrica no obstructiva \(gradiente pico/);
    assert.match(MCH.narrativeSummary({ ...b, hta: true }, r, ''), /^En síntesis, hallazgos sugestivos de .*Valsalva\), a correlacionar con el contexto clínico \(hipertensión arterial\)\./);
});

test('aviso de espesor y lista de control', () => {
    assert.equal(MCH.thickWall('15', '9'), true);
    assert.equal(MCH.thickWall('9', '15'), true);
    assert.equal(MCH.thickWall('13', '10'), true);     // 1.3
    assert.equal(MCH.thickWall('13', '11'), false);    // 1.18
    assert.equal(MCH.thickWall('12', '9'), false);     // asimétrico pero <13
    assert.equal(MCH.thickWall('', ''), false);
    const vacia = MCH.checklist({});
    assert.ok(vacia.some(t => /velocidad en el TSVI en reposo/.test(t)));
    assert.ok(vacia.some(t => /Valsalva/.test(t)));
    assert.ok(vacia.some(t => /SAM/.test(t)));
    assert.equal(MCH.checklist({ rest: '60', sam: 'no', apical: 'no', thickness: '18' }).length, 0);  // reposo ≥50: no pide Valsalva
    assert.ok(MCH.checklist({ rest: '20', valsalva: '30', sam: 'contacto', hasMr: true, apical: 'no', thickness: '18' }).some(t => /dirección del jet/.test(t)));
    assert.ok(MCH.checklist({ thickness: '12', siv: '15', location: 'septum basal' }).some(t => /menor que el SIV/.test(t)));
    assert.ok(MCH.checklist({ thickness: '31' }).some(t => /≥30 mm/.test(t)));
});
