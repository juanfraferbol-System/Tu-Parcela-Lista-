const MAX_EXIF_SCAN_BYTES=512*1024;

export function isValidGoogleMapsLink(value=''){
 try{
  const url=new URL(String(value).trim());
  const host=url.hostname.toLowerCase(),googleHost=/^(?:www\.|maps\.)?google\.(?:[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/.test(host);
  if(!['http:','https:'].includes(url.protocol))return false;
  return host==='maps.app.goo.gl'||host==='goo.gl'&&url.pathname.startsWith('/maps')||googleHost&&url.pathname.startsWith('/maps');
 }catch{return false;}
}

export function hasPrivateCoordinates(coordinates){
 return Number.isFinite(coordinates?.latitude)&&coordinates.latitude>=-90&&coordinates.latitude<=90&&Number.isFinite(coordinates?.longitude)&&coordinates.longitude>=-180&&coordinates.longitude<=180;
}

export function locationIsMissing({mapsLink='',confirmedCoordinates=null,gpsConsent=false,gpsCoordinates=null}={}){
 const privateCoordinates=normalizePrivateCoordinates(confirmedCoordinates)||(gpsConsent?normalizePrivateCoordinates(gpsCoordinates):null);
 return !isValidGoogleMapsLink(mapsLink)&&!privateCoordinates;
}

export function shouldShowLocationWarning({mapsLink='',confirmedCoordinates=null,gpsConsent=false,gpsCoordinates=null,gpsAnalysisPending=false,evaluationReady=false,dismissed=false}={}){
 return Boolean(evaluationReady&&!dismissed&&!gpsAnalysisPending&&locationIsMissing({mapsLink,confirmedCoordinates,gpsConsent,gpsCoordinates}));
}

function normalizePrivateCoordinates(coordinates){return hasPrivateCoordinates(coordinates)?coordinates:null;}

function readExifGps(buffer){
 const view=new DataView(buffer);if(view.byteLength<4||view.getUint16(0,false)!==0xffd8)return null;
 let markerOffset=2;
 while(markerOffset+4<=view.byteLength){
  if(view.getUint8(markerOffset)!==0xff){markerOffset+=1;continue;}
  const marker=view.getUint8(markerOffset+1);markerOffset+=2;
  if(marker===0xd9||marker===0xda)break;
  if(markerOffset+2>view.byteLength)break;
  const length=view.getUint16(markerOffset,false);if(length<2||markerOffset+length>view.byteLength)break;
  const dataOffset=markerOffset+2;
  if(marker===0xe1&&length>=8&&view.getUint32(dataOffset,false)===0x45786966&&view.getUint16(dataOffset+4,false)===0){
   const tiff=dataOffset+6;if(tiff+8>view.byteLength)return null;
   const byteOrder=view.getUint16(tiff,false),little=byteOrder===0x4949;if(!little&&byteOrder!==0x4d4d)return null;
   if(view.getUint16(tiff+2,little)!==42)return null;
   const firstIfd=tiff+view.getUint32(tiff+4,little),gpsOffset=findGpsIfd(view,tiff,firstIfd,little);
   return gpsOffset==null?null:readGpsIfd(view,tiff,tiff+gpsOffset,little);
  }
  markerOffset+=length;
 }
 return null;
}

function findGpsIfd(view,tiff,ifd,little){
 if(ifd+2>view.byteLength)return null;const count=view.getUint16(ifd,little);
 for(let index=0;index<count;index+=1){const entry=ifd+2+index*12;if(entry+12>view.byteLength)return null;if(view.getUint16(entry,little)===0x8825)return view.getUint32(entry+8,little);}
 return null;
}

function asciiValue(view,tiff,entry,little){
 const count=view.getUint32(entry+4,little),offset=count<=4?entry+8:tiff+view.getUint32(entry+8,little);if(offset>=view.byteLength)return '';
 return String.fromCharCode(view.getUint8(offset));
}

function rationalTriplet(view,tiff,entry,little){
 const count=view.getUint32(entry+4,little),offset=tiff+view.getUint32(entry+8,little);if(count<3||offset+24>view.byteLength)return null;
 const values=[];for(let index=0;index<3;index+=1){const at=offset+index*8,numerator=view.getUint32(at,little),denominator=view.getUint32(at+4,little);if(!denominator)return null;values.push(numerator/denominator);}return values;
}

function readGpsIfd(view,tiff,ifd,little){
 if(ifd+2>view.byteLength)return null;const count=view.getUint16(ifd,little);let latRef='',lonRef='',lat=null,lon=null;
 for(let index=0;index<count;index+=1){const entry=ifd+2+index*12;if(entry+12>view.byteLength)return null;const tag=view.getUint16(entry,little);if(tag===1)latRef=asciiValue(view,tiff,entry,little);if(tag===2)lat=rationalTriplet(view,tiff,entry,little);if(tag===3)lonRef=asciiValue(view,tiff,entry,little);if(tag===4)lon=rationalTriplet(view,tiff,entry,little);}
 if(!lat||!lon)return null;const decimal=values=>values[0]+values[1]/60+values[2]/3600,latitude=decimal(lat)*(latRef==='S'?-1:1),longitude=decimal(lon)*(lonRef==='W'?-1:1),coordinates={latitude,longitude};return hasPrivateCoordinates(coordinates)?coordinates:null;
}

export async function extractPhotoGps(file){
 if(!file||file.type!=='image/jpeg'||typeof file.slice!=='function')return null;
 try{return readExifGps(await file.slice(0,MAX_EXIF_SCAN_BYTES).arrayBuffer());}catch{return null;}
}

export async function findFirstPhotoGps(files=[],extractor=extractPhotoGps){
 for(const file of files){const coordinates=await extractor(file);if(hasPrivateCoordinates(coordinates))return coordinates;}
 return null;
}
