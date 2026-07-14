export const ALLOWED_PHOTO_TYPES=['image/jpeg','image/png','image/webp'];
export const MAX_PHOTOS=12;
export const MAX_ORIGINAL_PHOTO_BYTES=20*1024*1024;
export const MAX_FINAL_TOTAL_PHOTO_BYTES=20*1024*1024;
export const OPTIMIZE_ABOVE_BYTES=Math.round(1.5*1024*1024);
export const MAX_PHOTO_DIMENSION=2000;

const extensionFor=type=>type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
const clampDimension=value=>Math.max(1,Math.round(value));

export function formatMegabytes(bytes){
 return (Number(bytes||0)/1024/1024).toLocaleString('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1});
}

export function formatPhotoUsage(count,totalBytes){
 return `${count} de ${MAX_PHOTOS} fotografías · ${formatMegabytes(totalBytes)} MB de 20 MB`;
}

export function validateOriginalPhoto(file){
 if(!file||!ALLOWED_PHOTO_TYPES.includes(file.type))throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
 if(!Number(file.size))throw new Error('La fotografía está vacía.');
 if(file.size>MAX_ORIGINAL_PHOTO_BYTES)throw new Error('La fotografía original supera el límite de seguridad de 20 MB.');
 return file;
}

async function decodeBrowserImage(file){
 if(typeof createImageBitmap==='function'){
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
 }
 if(typeof document==='undefined')throw new Error('Este navegador no permite procesar imágenes.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  image.src=url;await image.decode();
  return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
 }catch(error){URL.revokeObjectURL(url);throw error;}
}

async function encodeBrowserImage({source,width,height,type,quality}){
 if(typeof document==='undefined')throw new Error('Este navegador no permite convertir imágenes.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:type!=='image/jpeg'});
 if(!context)throw new Error('No fue posible preparar la fotografía.');
 // Canvas copia únicamente los píxeles ya orientados; no conserva EXIF ni GPS.
 context.drawImage(source,0,0,width,height);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('El navegador no pudo generar la fotografía optimizada.')),type,quality));
}

function fittedDimensions(width,height,maxDimension=MAX_PHOTO_DIMENSION){
 const largest=Math.max(width,height);if(largest<=maxDimension)return {width:clampDimension(width),height:clampDimension(height)};
 const scale=maxDimension/largest;return {width:clampDimension(width*scale),height:clampDimension(height*scale)};
}

export async function optimizePhoto(file,options={}){
 validateOriginalPhoto(file);
 const decode=options.decodeImage||decodeBrowserImage,encode=options.encodeImage||encodeBrowserImage;
 let decoded;
 try{
  decoded=await decode(file);
  if(!decoded?.source||!decoded.width||!decoded.height)throw new Error('No fue posible leer las dimensiones de la fotografía.');
  let {width,height}=fittedDimensions(decoded.width,decoded.height),type=file.type;
  let quality=type==='image/png'?undefined:.9,blob=null;
  for(let attempt=0;attempt<10;attempt+=1){
   blob=await encode({source:decoded.source,width,height,type,quality});
   if(blob?.size>0&&blob.size<=OPTIMIZE_ABOVE_BYTES)break;
   if(type==='image/png'){type='image/webp';quality=.88;continue;}
   if(quality>.7){quality=Math.max(.7,quality-.07);continue;}
   width=clampDimension(width*.85);height=clampDimension(height*.85);quality=.82;
  }
  if(!blob?.size||blob.size>OPTIMIZE_ABOVE_BYTES)throw new Error('No fue posible reducir la fotografía a un tamaño seguro.');
  const optimized=new File([blob],`foto-optimizada.${extensionFor(type)}`,{type,lastModified:Date.now()});
  return {file:optimized,originalSize:file.size,optimizedSize:optimized.size,originalType:file.type,width,height,wasOptimized:file.size>OPTIMIZE_ABOVE_BYTES||Math.max(decoded.width,decoded.height)>MAX_PHOTO_DIMENSION||optimized.size!==file.size};
 }catch(error){
  throw new Error(`No pudimos optimizar ${file?.name||'la fotografía'}: ${error?.message||'error desconocido'}`);
 }finally{decoded?.close?.();}
}
