import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BROKER_PLANS,VISUAL_ANALYSIS_ALLOWED_PLAN_IDS,planIncludesVisualAnalysis} from './plans-config.js';
import {visualAnalysisRequestFor} from './submission-service.js';
import {MAX_VISUAL_ANALYSIS_PHOTOS,VISUAL_ANALYSIS_DETAIL,analyzeVisualPhotos,buildVisualAnalysisRequest} from '../../supabase/functions/publicar-parcela/visual-analysis.ts';

assert.deepEqual(BROKER_PLANS.map(plan=>plan.id),['inicio','profesional','gold','platinum']);
assert.deepEqual([...VISUAL_ANALYSIS_ALLOWED_PLAN_IDS],['gold','platinum']);
assert.equal(planIncludesVisualAnalysis('inicio'),false);
assert.equal(planIncludesVisualAnalysis('profesional'),false);
assert.equal(planIncludesVisualAnalysis('gold'),true);
assert.equal(planIncludesVisualAnalysis('platinum'),true);
assert.equal(planIncludesVisualAnalysis('Plan Gold'),false,'la autorización no depende del nombre visible');

const draft=plan=>({tipoPublicador:'corredor',planCorredor:plan,analisisVisual:{consent:true}});
assert.deepEqual(visualAnalysisRequestFor(draft('profesional')),{requested:false,included:false,consent:false,maxPhotos:5,detail:'low',reviewStatus:null,acceptedSuggestions:null});
assert.equal(visualAnalysisRequestFor(draft('gold')).requested,true);
assert.equal(visualAnalysisRequestFor(draft('platinum')).included,true);
assert.equal(visualAnalysisRequestFor({tipoPublicador:'dueno',planCorredor:'gold',analisisVisual:{consent:true}}).requested,false);

const images=Array.from({length:5},(_,index)=>`data:image/jpeg;base64,foto${index}`);
const request=buildVisualAnalysisRequest({model:'modelo-prueba',images});
assert.equal(MAX_VISUAL_ANALYSIS_PHOTOS,5);assert.equal(VISUAL_ANALYSIS_DETAIL,'low');
assert.equal(request.input[0].content.filter(item=>item.type==='input_image').length,5);
assert.ok(request.input[0].content.filter(item=>item.type==='input_image').every(item=>item.detail==='low'));
assert.throws(()=>buildVisualAnalysisRequest({model:'modelo-prueba',images:[...images,'sexta']}),/visual_photo_count_invalid/);

let calls=0;
const mocked=await analyzeVisualPhotos({apiKey:'solo-prueba',model:'modelo-prueba',images:[images[0]],fetchImpl:async(url,options)=>{
 calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.match(String(options.headers.Authorization),/^Bearer /);
 return new Response(JSON.stringify({id:'resp_mock',model:'modelo-prueba',output_text:JSON.stringify({description:'Vista despejada.',visibleFeatures:['Pradera visible'],coverOrder:0})}),{status:200,headers:{'Content-Type':'application/json'}});
}});
assert.equal(calls,1);assert.equal(mocked.suggestions.coverOrder,0);assert.equal(mocked.model,'modelo-prueba');

const edge=await readFile(new URL('../../supabase/functions/publicar-parcela/index.ts',import.meta.url),'utf8');
const migration=await readFile(new URL('../../supabase/migrations/202607130005_analisis_visual_planes_superiores.sql',import.meta.url),'utf8');
const ui=await readFile(new URL('./publicar-parcela.js',import.meta.url),'utf8');
const css=await readFile(new URL('./publicar-parcela.css',import.meta.url),'utf8');
assert.match(edge,/const allowedPlans=\['gold','platinum'\]/);
assert.match(edge,/visualConsent&&!visualIncluded/);assert.match(edge,/OPENAI_API_KEY/);assert.match(edge,/OPENAI_VISUAL_MODEL/);
assert.match(edge,/MAX_VISUAL_ANALYSIS_PHOTOS/);assert.match(edge,/processVisualAnalysis/);
assert.doesNotMatch(ui,/OPENAI_API_KEY|Bearer\s+[A-Za-z0-9]/);
assert.match(ui,/✨ Potenciado con IA/);assert.match(ui,/Análisis inteligente de fotografías: no incluido/);
assert.match(ui,/planIncludesVisualAnalysis\(plan\.id\)/);assert.match(ui,/autorizaAnalisisVisual/);
assert.match(ui,/Aceptar sugerencias/);assert.match(ui,/Guardar correcciones/);assert.match(ui,/Rechazar ayuda/);
assert.match(css,/\.plan-card\.is-ai-premium/);assert.match(css,/\.visual-analysis-option/);

assert.match(migration,/alter function public\.crear_publicacion_pendiente\(jsonb, uuid, jsonb\)[\s\S]*rename to crear_publicacion_pendiente_v2/);
assert.match(migration,/v_plan = any\(array\['gold','platinum'\]\)/);
assert.match(migration,/cardinality\(foto_hashes\) between 1 and 5/);
assert.match(migration,/publicacion_analisis_visual_publicacion_hash_unique/);
assert.match(migration,/publicacion_analisis_visual_un_inicial_idx/);
assert.match(migration,/VISUAL_REANALYSIS_REQUIRES_ADMIN/);
assert.match(migration,/sugerencias_aceptadas/);assert.match(migration,/sugerencias_revisadas_en/);
assert.match(migration,/set search_path = pg_catalog/gi);
assert.doesNotMatch(migration,/grant (select|insert|update|delete).*anon/i);
assert.doesNotMatch(migration,/grant execute[\s\S]{0,120}to (anon|authenticated)/i);
assert.match(migration,/grant execute on function public\.confirmar_plan_analisis_visual[\s\S]*to service_role/);

console.log('OK: Gold/Platinum, autorización server-side, máximo 5, detail low y OpenAI simulado sin llamadas reales.');
