const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let available=false;try{require.resolve('playwright');available=true;}catch{}
const options={skip:!available && 'Requiere Playwright; ejecutar con las dependencias del navegador'};
test('MCH: seis informes sin MCH idénticos a la versión anterior',options,async()=>{
 const {open,scenarios}=require('./helpers/mch-browser.cjs');const {browser,page,errors}=await open();
 try{assert.deepEqual(await scenarios(page),JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/mch-without-baseline.json'))));assert.deepEqual(errors,[]);}finally{await browser.close();}
});
test('MCH: informe, procedencia, maniobras, guardado, reinicio y teléfono',options,async()=>{
const{open}=require('./helpers/mch-browser.cjs');
const{browser,page,errors}=await open();try{
 const set=async(id,value)=>page.evaluate(({id,value})=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event(e.tagName==='SELECT'||e.type==='checkbox'?'change':'input',{bubbles:true}));window.UIController.calculateNow();},{id,value});
 await set('ctx_mcp',true);assert.equal(await page.locator('#mch_section').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.UIController.state.diastolicResult.grade),'MCH');
 await page.evaluate(()=>{window.UIController.qc=null;});
 assert.equal(await page.evaluate(()=>window.UIController.generateReport({confirmEdits:false})),false);
 await set('mch_thickness','19');await set('mch_location','septum basal');await set('mch_pattern','septal asimétrica');
 await set('mch_rest','20');await set('mch_rest_posture','semisupina');await set('mch_rest_quality','valid');
 await page.locator('#mch_add').click();
 const first=await page.evaluate(()=>window.UIController.mch.records()[0].key);
 for(const[k,v]of Object.entries({maneuver:'Valsalva',posture:'semisentada',gradient:'55',quality:'valid'}))await set(`mch_${first}_${k}`,v);
 await set('mch_pressure','indeterminate');await page.locator('#mch_confirm').click();
 assert.equal(await page.evaluate(()=>window.UIController.mch.ready()),true);
 for(const mode of ['lista','narrativo']){
  const text=await page.evaluate(async mode=>{window.UIController.reportMode=mode;await window.UIController.generateReport({confirmEdits:false});return document.getElementById('resultado').value;},mode);
  assert.match(text,/19 mm/);assert.match(text,/55 mmHg con Valsalva/);assert.match(text,/no permite definir/);
  assert.doesNotMatch(text,/función diastólica es normal|Función Diastólica Normal|espesores conservados|grado II|Grado II/);
 }
 const row=await page.evaluate(()=>window.UIController._buildDatasetRow());assert.equal(JSON.parse(row.at(-1)).version,1);
 assert.equal(await page.evaluate(()=>window.StudyStorage.HEADERS.length),row.length);
 await set(`mch_${first}_gradient`,'49');assert.equal(await page.evaluate(()=>window.UIController.mch.reviewed('pressure')),true);
 await set('onda_e','90');assert.equal(await page.evaluate(()=>window.UIController.mch.reviewed('pressure')),false);
 assert.equal(await page.inputValue('#mch_pressure'),'');
 await set('mch_pressure','elevated');await page.locator('#mch_confirm').click();
 await page.evaluate(()=>window.UIController.resetAll());assert.equal(await page.locator('#mch_section').isVisible(),false);
 await page.locator('#undo-reset button').click();assert.equal(await page.locator('#mch_section').isVisible(),true);
 assert.equal(await page.evaluate(()=>window.UIController.mch.records().length),1);assert.equal(await page.inputValue(`#mch_${first}_gradient`),'49');assert.equal(await page.evaluate(()=>window.UIController.mch.reviewed('pressure')),true);
 await page.locator('#mch_maneuvers button').click();assert.equal(await page.evaluate(()=>window.UIController.mch.records().length),0);
 await set('ctx_bcri',true);await set('onda_e_prime_septal','7');assert.equal(await page.inputValue('#onda_e_prime_septal'),'7');
 await set('ctx_mcp',false);assert.equal(await page.locator('#mch_section').isVisible(),false);
 await set('ctx_bcri',false);await set('ctx_mcp',true);
 await set('mch_pressure','indeterminate');await page.locator('#mch_confirm').click();
 await page.locator('#mch_section').scrollIntoViewIfNeeded();
 await page.setViewportSize({width:375,height:812});await page.locator('#mch_section').scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);

 await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));

assert.deepEqual(errors,[]);
}finally{await browser.close();}});
test('MCH: presets y FEVI no heredan confirmaciones; Deshacer conserva vigencia',options,async()=>{
const{open}=require('./helpers/mch-browser.cjs');
const{browser,page,errors}=await open();try{
 const set=async(id,val)=>page.evaluate(({id,val})=>{const el=document.getElementById(id);if(el.type==='checkbox')el.checked=val;else el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));window.UIController.calculateNow();},{id,val});
 await set('ctx_mcp',true);await set('mch_pressure','indeterminate');await page.locator('#mch_confirm').click();await set('mch_ef_confirmed',true);assert.equal(await page.isChecked('#mch_ef_confirmed'),true);await set('fevi','45');assert.equal(await page.isChecked('#mch_ef_confirmed'),false);
 await set('mch_rest','50');await set('mch_rest_quality','valid');await set('mch_rest_posture','supina');await page.locator('#mch_add').click();
 const key=await page.evaluate(()=>window.UIController.mch.records()[0].key);
 for(const[k,v]of Object.entries({maneuver:'Valsalva',posture:'sentada',gradient:'60',quality:'valid'}))await set(`mch_${key}_${k}`,v);
 await set('mch_ef_confirmed',true);await set('mch_q_tr','valid');
 const preset=await page.evaluate(()=>window.UIController._camposDePreset());assert.equal(preset.mch_ef_confirmed,undefined);assert.equal(preset.mch_q_tr,undefined);assert.equal(preset.mch_rest_quality,undefined);assert.equal(preset.mch_records,undefined);
 await page.evaluate(()=>{const ui=window.UIController;const campos={...ui._camposDePreset(),mch_ef_confirmed:true,mch_rest_quality:'valid',mch_pressure:'elevated',mch_pressure_source:'old'};const old=window.PresetStore.get;window.PresetStore.get=()=>({campos});ui.applyPreset('fake');window.PresetStore.get=old;ui.calculateNow();});
 assert.equal(await page.isChecked('#mch_ef_confirmed'),false);assert.equal(await page.inputValue('#mch_rest_quality'),'');assert.equal(await page.inputValue('#mch_pressure'),'');assert.equal(await page.evaluate(()=>window.UIController.mch.records().length),0);
 await set('ctx_mcp',false);await page.evaluate(async()=>{window.UIController.qc=null;await window.UIController.generateReport({confirmEdits:false});});await set('onda_e','150');
 assert.equal(await page.evaluate(()=>window.UIController._isReportStale()),true);await page.evaluate(()=>window.UIController.resetAll());await page.locator('#undo-reset button').click();assert.equal(await page.evaluate(()=>window.UIController._isReportStale()),true);

assert.deepEqual(errors,[]);
}finally{await browser.close();}});
