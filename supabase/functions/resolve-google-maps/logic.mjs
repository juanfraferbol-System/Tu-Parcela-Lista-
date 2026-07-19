const GOOGLE_MAPS_HOSTS=/(^|\.)(google\.[a-z.]+|googleusercontent\.com|goo\.gl)$/i;

export function isAllowedGoogleMapsUrl(value=''){
  try{
    const url=new URL(String(value).trim());
    return ['http:','https:'].includes(url.protocol)&&GOOGLE_MAPS_HOSTS.test(url.hostname);
  }catch{return false;}
}

export function validCoordinates(latitude,longitude){
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
}

function candidate(latitude,longitude,source){
  const lat=Number(latitude),lng=Number(longitude);
  return validCoordinates(lat,lng)?{latitude:lat,longitude:lng,source}:null;
}

export function extractCoordinates(value=''){
  const text=decodeURIComponent(String(value||'')).replace(/\\u003d/g,'=').replace(/\\u0026/g,'&');
  const patterns=[
    {source:'url_at',regex:/\/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:[,/]|$)/},
    {source:'query',regex:/[?&](?:q|query|ll|center|destination)=(-?\d{1,2}(?:\.\d+)?)[,%20+]+(-?\d{1,3}(?:\.\d+)?)(?:[&#/]|$)/i},
    {source:'data',regex:/!3d(-?\d{1,2}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/},
    {source:'data_reverse',regex:/!2d(-?\d{1,3}(?:\.\d+)?)!3d(-?\d{1,2}(?:\.\d+)?)/},
    {source:'json_center',regex:/["']?(?:lat|latitude)["']?\s*[:=]\s*(-?\d{1,2}(?:\.\d+)?)[\s,;]+["']?(?:lng|lon|longitude)["']?\s*[:=]\s*(-?\d{1,3}(?:\.\d+)?)/i}
  ];
  for(const item of patterns){
    const match=text.match(item.regex);if(!match)continue;
    const result=item.source==='data_reverse'?candidate(match[2],match[1],item.source):candidate(match[1],match[2],item.source);
    if(result)return result;
  }
  return null;
}
