const {test}=require('node:test');
const assert=require('node:assert/strict');
const MCH=require('../js/mch');
const valid=g=>({gradient:g,quality:'valid',posture:'semisupina'});
const prov=g=>({...valid(g),maneuver:'Valsalva'});
test('TSVI: límites exactos, incluido gradiente cero',()=>{
    for(const [g,type,significant] of [[0,'not-documented',false],[29,'not-documented',false],[30,'rest',false],[49,'rest',false],[50,'rest',true]]){
        const o=MCH.obstruction(valid(g)); assert.equal(o.type,type); assert.equal(o.significant,significant);
    }
});
test('sin reposo no se afirma obstrucción únicamente provocada',()=>{
    assert.equal(MCH.obstruction({},[prov(55)]).type,'provoked-rest-unknown');
    assert.equal(MCH.obstruction(valid(20),[prov(55)]).type,'provoked-only');
    assert.doesNotMatch(MCH.obstructionText({},[prov(55)]),/únicamente|reposo/);
});
test('señales inválidas, vacías y no identificadas no definen máximos',()=>{
    const o=MCH.obstruction(valid(20),[{...prov(80),quality:'invalid'},{...prov(90),posture:''},{...prov(100),maneuver:''},prov('')]);
    assert.equal(o.max,20);assert.equal(o.significant,false);assert.equal(o.provoked.length,0);
});
test('se conservan maniobras y máximo para Risk-SCD excluye bipedestación',()=>{
    const rows=[prov(25),{...prov(80),maneuver:'De pie',posture:'de pie'}];
    const o=MCH.obstruction(valid(20),rows);assert.equal(o.max,80);assert.equal(o.riskDataMax,25);assert.equal(o.provoked.length,2);
});
test('sin provocación no se afirma no obstructiva',()=>{
    assert.match(MCH.obstructionText(valid(20),[]),/No se evaluaron/);
    assert.doesNotMatch(MCH.obstructionText(valid(20),[]),/no obstructiva|No se documenta/);
});
const base=()=>({E:140,septal:10,lateral:10,tr:2.8,lavi:34,arDuration:150,aDuration:120,qualities:{ee:'valid',tr:'valid',lavi:'valid',arA:'valid'},rhythm:'sinusal'});
test('diástole: operadores estrictos y Ar−A inclusivo',()=>{
    const p=MCH.diastolic(base());assert.equal(p.ee.state,'not-above');assert.equal(p.tr.state,'not-above');assert.equal(p.lavi.state,'not-above');assert.equal(p.arA.state,'above');
    const q=MCH.diastolic({...base(),E:140.1,tr:2.81,lavi:34.1,arDuration:149});assert.equal(q.ee.state,'above');assert.equal(q.tr.state,'above');assert.equal(q.lavi.state,'above');assert.equal(q.arA.state,'not-above');
});
test('sin venas pulmonares no se genera mayoría ni normalidad',()=>{
    const p=MCH.diastolic({...base(),arDuration:'',aDuration:''});assert.equal(p.arA.state,'not-measured');assert.equal(p.arA.value,null);assert.equal(p.grade,undefined);assert.equal(p.pressure,undefined);
});
test('sin dos sitios no se presenta E/e′ promedio',()=>{
    assert.equal(MCH.diastolic({...base(),lateral:''}).ee.state,'not-measured');
    assert.equal(MCH.diastolic({...base(),septal:0}).ee.value,null);
});
test('un valor precargado sin calidad revisada no es un criterio confirmado',()=>{
    const p=MCH.diastolic({...base(),qualities:{}});for(const r of Object.values(p))assert.equal(r.state,'not-measured');
});
test('FA, BAV, miopatía auricular y fusión impiden interpretar Ar−A',()=>{
    assert.equal(MCH.diastolic({...base(),rhythm:'fa'}).arA.state,'not-interpretable');
    for(const key of ['avBlock','atrial','fusion'])assert.equal(MCH.diastolic({...base(),limitations:{[key]:true}}).arA.state,'not-interpretable');
});
test('IM limita E/e′; no convierte AI e IT elevados en falsos',()=>{
    const p=MCH.diastolic({...base(),tr:3,lavi:40,limitations:{mr:true}});assert.equal(p.ee.state,'not-interpretable');assert.equal(p.tr.state,'above');assert.equal(p.lavi.state,'above');assert.equal(p.arA.state,'above');
});
test('pendiente no equivale a indeterminada',()=>{
    assert.equal(MCH.pressureText(''),'');assert.match(MCH.pressureText('indeterminate'),/no permite definir/);assert.match(MCH.pressureText('not-elevated'),/no sugiere/);
});
test('no inventa morfología ni FEVI desde valores por defecto',()=>{
    assert.equal(MCH.morphology({ef:60}),'');assert.equal(MCH.morphology({ef:60,efConfirmed:true}),'FEVI de 60%.');
    assert.doesNotMatch(MCH.morphology({sam:'ausente',contact:'presente'}),/contacto/);
});
