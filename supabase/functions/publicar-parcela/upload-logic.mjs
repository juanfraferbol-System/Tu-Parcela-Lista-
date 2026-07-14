export function isDuplicateObjectError(error){
 const status=Number(error?.statusCode||error?.status);
 return status===409||/already exists|duplicate|asset already exists/i.test(String(error?.message||''));
}

function validStorageResponse(response){
 return response&&typeof response==='object'&&('data' in response||'error' in response);
}

export async function uploadMissingPhotos({storage,bucket,publicationId,photos,manifest,mimeExtensions}){
 const folder=storage.from(bucket);
 const listing=await folder.list(publicationId,{limit:100,offset:0,sortBy:{column:'name',order:'asc'}});
 if(!validStorageResponse(listing)||listing.error||!Array.isArray(listing.data))throw new Error('storage_inspection_failed');

 const existing=new Set(listing.data.map(item=>String(item?.name||'')).filter(Boolean));
 let uploaded=0,reused=0;
 for(let index=0;index<photos.length;index++){
  const file=photos[index],extension=mimeExtensions[file.type];
  const objectName=`${manifest[index].id}.${extension}`;
  if(existing.has(objectName)){reused++;continue;}

  const storagePath=`${publicationId}/${objectName}`;
  const result=await folder.upload(storagePath,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(!validStorageResponse(result)||(result.data==null&&result.error==null))throw new Error(`storage_partial_response:${index}`);
  if(result.error){
   if(isDuplicateObjectError(result.error)){reused++;existing.add(objectName);continue;}
   throw new Error(`photo_upload_failed:${index}`);
  }
  if(!result.data?.path)throw new Error(`storage_partial_response:${index}`);
  uploaded++;existing.add(objectName);
 }
 return {processed:photos.length,uploaded,reused};
}
