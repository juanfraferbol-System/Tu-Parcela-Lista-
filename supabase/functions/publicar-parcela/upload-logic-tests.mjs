import assert from 'node:assert/strict';
import {uploadMissingPhotos} from './upload-logic.mjs';

const MIME_EXTENSIONS={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const photos=[
 new File([new Uint8Array(10)],'nombre-no-confiable.jpg',{type:'image/jpeg'}),
 new File([new Uint8Array(20)],'otro.png',{type:'image/png'}),
 new File([new Uint8Array(30)],'tercero.webp',{type:'image/webp'})
];
const manifest=[
 {id:'11111111-1111-4111-8111-111111111111'},
 {id:'22222222-2222-4222-8222-222222222222'},
 {id:'33333333-3333-4333-8333-333333333333'}
];

function fakeStorage({failOnceAt=-1,partialAt=-1}={}){
 const objects=new Set(),uploads=[],lists=[];let failed=false;
 return {
  objects,uploads,lists,
  from(bucket){
   assert.equal(bucket,'publicaciones-pendientes');
   return {
    async list(folder){lists.push(folder);return {data:[...objects].map(path=>({name:path.split('/').at(-1)})),error:null};},
    async upload(path){
     const index=uploads.length;uploads.push(path);
     if(index===partialAt)return {data:null,error:null};
     if(index===failOnceAt&&!failed){failed=true;return {data:null,error:{statusCode:500,message:'fallo simulado'}};}
     objects.add(path);return {data:{path},error:null};
    }
   };
  }
 };
}

const publicationId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const storage=fakeStorage({failOnceAt:1});
await assert.rejects(()=>uploadMissingPhotos({storage,bucket:'publicaciones-pendientes',publicationId,photos,manifest,mimeExtensions:MIME_EXTENSIONS}),/photo_upload_failed:1/);
assert.equal(storage.objects.size,1,'la primera foto permanece cargada tras el fallo parcial');
assert.equal(storage.uploads.length,2);

const retry=await uploadMissingPhotos({storage,bucket:'publicaciones-pendientes',publicationId,photos,manifest,mimeExtensions:MIME_EXTENSIONS});
assert.deepEqual(retry,{processed:3,uploaded:2,reused:1});
assert.equal(storage.objects.size,3);assert.equal(storage.uploads.length,4,'el reintento omite la primera foto ya existente');

const identical=await uploadMissingPhotos({storage,bucket:'publicaciones-pendientes',publicationId,photos,manifest,mimeExtensions:MIME_EXTENSIONS});
assert.deepEqual(identical,{processed:3,uploaded:0,reused:3});
assert.equal(storage.uploads.length,4,'un reintento idéntico no vuelve a subir objetos');
assert.ok([...storage.objects].every(path=>!path.includes('nombre-no-confiable')&&!path.includes('otro.png')));

const partial=fakeStorage({partialAt:0});
await assert.rejects(()=>uploadMissingPhotos({storage:partial,bucket:'publicaciones-pendientes',publicationId,photos:[photos[0]],manifest:[manifest[0]],mimeExtensions:MIME_EXTENSIONS}),/storage_partial_response:0/);

console.log('OK: recuperación parcial de Storage, omisión de existentes y respuesta incompleta.');
