const GOOGLE_MAPS_HOSTS=/(^|\.)(google\.[a-z.]+|googleusercontent\.com|goo\.gl)$/i;

export function hasPrivateCoordinates(value){return Boolean(value&&Number.isFinite(Number(value.latitude))&&Number.isFinite(Number(value.longitude))&&Math.abs(Number(value.latitude))<=90&&Math.abs(Number(value.longitude))<=180);}

export function isValidGoogleMapsLink(value=''){
 const text=String(value).trim();if(!text)return false;
 try{const url=new URL(text);return ['http:','https:'].includes(url.protocol)&&GOOGLE_MAPS_HOSTS.test(url.hostname)&&(url.hostname.includes('maps')||url.pathname.includes('maps')||url.searchParams.has('q')||url.hostname==='goo.gl');}catch{return false;}
}

export function locationIsMissing({mapsLink='',confirmedCoordinates=null}={}){return !isValidGoogleMapsLink(mapsLink)&&!hasPrivateCoordinates(confirmedCoordinates);}
export function shouldShowLocationWarning({mapsLink='',confirmedCoordinates=null,gpsAnalysisPending=false,evaluationReady=false,dismissed=false}={}){return Boolean(evaluationReady&&!dismissed&&!gpsAnalysisPending&&locationIsMissing({mapsLink,confirmedCoordinates}));}

function readGpsFromJpeg(buffer){
 const view=new DataView(buffer);if(view.byteLength<4||view.getUint16(0,false)!==0xffd8)return null;
 let offset=2;
 while(offset+4<=view.byteLength){
  if(view.getUint8(offset)!==0xff){offset+=1;continue;}
  const marker=view.getUint8(offset+1),length=view.getUint16(offset+2,false);
  if(marker===0xe1&&offset+2+length<=view.byteLength){
   const start=offset+4;
   if(view.getUint32(start,false)===0x45786966&&view.getUint16(start+4,false)===0){
    const tiff=start+6,little=view.getUint16(tiff,false)===0x4949;
    const u16=position=>view.getUint16(position,little),u32=position=>view.getUint32(position,little);
    if(u16(tiff+2)!==42)return null;
    const readIfd=position=>{const entries=new Map(),count=u16(position);for(let index=0;index<count;index+=1){const entry=position+2+index*12;if(entry+12>view.byteLength)break;entries.set(u16(entry),entry);}return entries;};
    const root=readIfd(tiff+u32(tiff+4)),gpsEntry=root.get(0x8825);if(!gpsEntry)return null;
    const gps=readIfd(tiff+u32(gpsEntry+8));
    const ascii=tag=>{const entry=gps.get(tag);if(!entry)return '';const count=u32(entry+4),position=count<=4?entry+8:tiff+u32(entry+8);return String.fromCharCode(view.getUint8(position));};
    const rationals=tag=>{const entry=gps.get(tag);if(!entry)return null;const count=u32(entry+4),position=tiff+u32(entry+8),values=[];for(let index=0;index<count;index+=1){const item=position+index*8;if(item+8>view.byteLength)return null;const denominator=u32(item+4);values.push(denominator?u32(item)/denominator:0);}return values;};
    const latitudeParts=rationals(0x0002),longitudeParts=rationals(0x0004);if(!latitudeParts||!longitudeParts)return null;
    const decimal=parts=>parts[0]+parts[1]/60+parts[2]/3600;
    const latitude=decimal(latitudeParts)*(ascii(0x0001)==='S'?-1:1),longitude=decimal(longitudeParts)*(ascii(0x0003)==='W'?-1:1);
    return hasPrivateCoordinates({latitude,longitude})?{latitude,longitude}:null;
   }
  }
  if(marker===0xda||length<2)break;offset+=2+length;
 }
 return null;
}

export async function findFirstPhotoGps(files=[]){
 for(const file of files){
  if(!(file instanceof Blob)||file.type!=='image/jpeg')continue;
  try{const coordinates=readGpsFromJpeg(await file.arrayBuffer());if(coordinates)return coordinates;}catch{}
 }
 return null;
}
