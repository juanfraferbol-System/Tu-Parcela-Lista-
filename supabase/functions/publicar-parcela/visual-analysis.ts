export const VISUAL_ANALYSIS_ALLOWED_PLANS=Object.freeze(['gold','platinum']);
export const MAX_VISUAL_ANALYSIS_PHOTOS=5;
export const VISUAL_ANALYSIS_DETAIL='low';

export function planAllowsVisualAnalysis(plan:string){
 return VISUAL_ANALYSIS_ALLOWED_PLANS.includes(String(plan||''));
}

export function buildVisualAnalysisRequest({model,images}:{model:string;images:string[]}){
 if(!model)throw new Error('visual_model_missing');
 if(!Array.isArray(images)||images.length<1||images.length>MAX_VISUAL_ANALYSIS_PHOTOS)throw new Error('visual_photo_count_invalid');
 return {
  model,
  store:false,
  max_output_tokens:800,
  input:[{
   role:'user',
   content:[
    {type:'input_text',text:'Analiza únicamente características claramente visibles de esta propiedad. No inventes servicios, ubicación, deslindes, estado legal ni infraestructura que no pueda verificarse visualmente. Devuelve una descripción inmobiliaria breve, una lista de características visibles y el índice base cero de la mejor portada.'},
    ...images.map(image_url=>({type:'input_image',image_url,detail:VISUAL_ANALYSIS_DETAIL}))
   ]
  }],
  text:{format:{type:'json_schema',name:'parcel_visual_analysis',strict:true,schema:{
   type:'object',additionalProperties:false,
   properties:{
    description:{type:'string',maxLength:1200},
    visibleFeatures:{type:'array',items:{type:'string',maxLength:120},maxItems:12},
    coverOrder:{type:'integer',minimum:0,maximum:MAX_VISUAL_ANALYSIS_PHOTOS-1}
   },
   required:['description','visibleFeatures','coverOrder']
  }}}
 };
}

function outputText(response:Record<string,unknown>){
 if(typeof response.output_text==='string')return response.output_text;
 const output=Array.isArray(response.output)?response.output:[];
 for(const item of output){
  const content=Array.isArray((item as Record<string,unknown>)?.content)?(item as Record<string,unknown>).content as Array<Record<string,unknown>>:[];
  for(const part of content)if(typeof part?.text==='string')return part.text;
 }
 return '';
}

export async function analyzeVisualPhotos({apiKey,model,images,fetchImpl=fetch}:{apiKey:string;model:string;images:string[];fetchImpl?:typeof fetch}){
 if(!apiKey)throw new Error('openai_not_configured');
 const response=await fetchImpl('https://api.openai.com/v1/responses',{
  method:'POST',
  headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},
  body:JSON.stringify(buildVisualAnalysisRequest({model,images}))
 });
 if(!response.ok)throw new Error('openai_visual_analysis_failed');
 const raw=await response.json() as Record<string,unknown>,text=outputText(raw);
 if(!text)throw new Error('openai_visual_analysis_invalid_response');
 let parsed:Record<string,unknown>;
 try{parsed=JSON.parse(text);}catch{throw new Error('openai_visual_analysis_invalid_response');}
 if(typeof parsed.description!=='string'||!Array.isArray(parsed.visibleFeatures)||!Number.isInteger(parsed.coverOrder))throw new Error('openai_visual_analysis_invalid_response');
 return {suggestions:parsed,model:String(raw.model||model),responseId:String(raw.id||'')};
}
