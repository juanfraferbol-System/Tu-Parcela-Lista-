export const ALLOWED_PHOTO_TYPES=['image/jpeg','image/png','image/webp','image/heic','image/heif'];
export const MAX_PHOTOS=12;
export const MAX_FINAL_TOTAL_PHOTO_BYTES=20*1024*1024;

const MAX_ORIGINAL_PHOTO_BYTES=25*1024*1024;
const MAX_IMAGE_SIDE=2000;
const OUTPUT_QUALITY=0.84;

export function formatMegabytes(bytes=0){return (Number(bytes)/1024/1024).toFixed(2).replace('.',',');}
export function formatPhotoUsage(count=0,totalBytes=0){return `${count} de ${MAX_PHOTOS} fotografías · ${formatMegabytes(totalBytes)} de ${formatMegabytes(MAX_FINAL_TOTAL_PHOTO_BYTES)} MB`;}

export function validateOriginalPhoto(file){
 if(!(file instanceof Blob))throw new Error('El archivo seleccionado no es una imagen válida.');
 if(!ALLOWED_PHOTO_TYPES.includes(file.type))throw new Error(`${file.name||'La fotografía'} tiene un formato no compatible. Usa JPG, PNG o WEBP.`);
 if(file.size<=0)throw new Error(`${file.name||'La fotografía'} está vacía.`);
 if(file.size>MAX_ORIGINAL_PHOTO_BYTES)throw new Error(`${file.name||'La fotografía'} supera el máximo de 25 MB.`);
 return true;
}

function canvasToBlob(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('No pudimos preparar la fotografía.')),type,quality));}

async function decodeImage(file){
 if(typeof createImageBitmap==='function')return createImageBitmap(file,{imageOrientation:'from-image'});
 return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('El navegador no pudo leer esta fotografía. Convierte archivos HEIC a JPG antes de subirlos.'));};image.src=url;});
}

export async function optimizePhoto(file){
 validateOriginalPhoto(file);
 let image;
 try{image=await decodeImage(file);}catch(error){throw new Error(error?.message||'No pudimos leer la fotografía seleccionada.');}
 const sourceWidth=image.width||image.naturalWidth,sourceHeight=image.height||image.naturalHeight;
 if(!sourceWidth||!sourceHeight){image.close?.();throw new Error('No pudimos determinar el tamaño de la fotografía.');}
 const scale=Math.min(1,MAX_IMAGE_SIDE/Math.max(sourceWidth,sourceHeight));
 const width=Math.max(1,Math.round(sourceWidth*scale)),height=Math.max(1,Math.round(sourceHeight*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:false});
 if(!context){image.close?.();throw new Error('El navegador no pudo optimizar la fotografía.');}
 context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);image.close?.();
 const outputType='image/webp';
 const blob=await canvasToBlob(canvas,outputType,OUTPUT_QUALITY);
 const baseName=(file.name||'fotografia').replace(/\.[^.]+$/,'');
 const optimizedFile=new File([blob],`${baseName}.webp`,{type:outputType,lastModified:Date.now()});
 return {file:optimizedFile,originalSize:file.size,optimizedSize:optimizedFile.size,width,height};
}
