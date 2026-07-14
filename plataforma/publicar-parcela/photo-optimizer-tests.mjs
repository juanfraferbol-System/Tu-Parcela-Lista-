import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ALLOWED_PHOTO_TYPES,MAX_PHOTOS,MAX_ORIGINAL_PHOTO_BYTES,MAX_FINAL_TOTAL_PHOTO_BYTES,MAX_PHOTO_DIMENSION,OPTIMIZE_ABOVE_BYTES,formatPhotoUsage,optimizePhoto,validateOriginalPhoto} from './photo-optimizer.js';

const MB=1024*1024;
const original=(name,size,type)=>({name,size,type});
const decoder=(width,height)=>async()=>({source:{},width,height,close(){}});
const encoder=(sizes,calls)=>async options=>{calls.push({...options,source:undefined});const size=sizes[Math.min(calls.length-1,sizes.length-1)];return new Blob([new Uint8Array(size)],{type:options.type});};

assert.deepEqual(ALLOWED_PHOTO_TYPES,['image/jpeg','image/png','image/webp']);
assert.equal(MAX_PHOTOS,12);assert.equal(MAX_ORIGINAL_PHOTO_BYTES,20*MB);assert.equal(MAX_FINAL_TOTAL_PHOTO_BYTES,20*MB);assert.equal(MAX_PHOTO_DIMENSION,2000);
assert.equal(formatPhotoUsage(4,8.5*MB),'4 de 12 fotografías · 8,5 MB de 20 MB');
assert.doesNotThrow(()=>validateOriginalPhoto(original('exacta.jpg',20*MB,'image/jpeg')));
assert.throws(()=>validateOriginalPhoto(original('excesiva.jpg',20*MB+1,'image/jpeg')),/20 MB/);
assert.throws(()=>validateOriginalPhoto(original('archivo.gif',100,'image/gif')),/Formato no permitido/);

const verticalCalls=[];
const vertical=await optimizePhoto(original('vertical.jpg',10*MB,'image/jpeg'),{decodeImage:decoder(1200,3600),encodeImage:encoder([1.2*MB],verticalCalls)});
assert.equal(vertical.width,667);assert.equal(vertical.height,2000);assert.equal(vertical.file.type,'image/jpeg');assert.ok(vertical.file.size<=OPTIMIZE_ABOVE_BYTES);

const horizontalCalls=[];
const horizontal=await optimizePhoto(original('horizontal.webp',10*MB,'image/webp'),{decodeImage:decoder(4000,2000),encodeImage:encoder([1.1*MB],horizontalCalls)});
assert.equal(horizontal.width,2000);assert.equal(horizontal.height,1000);assert.equal(horizontal.file.type,'image/webp');

const pngCalls=[];
const png=await optimizePhoto(original('plano.png',10*MB,'image/png'),{decodeImage:decoder(2500,2500),encodeImage:encoder([2*MB,1.3*MB],pngCalls)});
assert.equal(pngCalls[0].type,'image/png');assert.equal(pngCalls[1].type,'image/webp');assert.equal(png.file.type,'image/webp');

const twoTenMb=await Promise.all([0,1].map(index=>optimizePhoto(original(`grande-${index}.jpg`,10*MB,'image/jpeg'),{decodeImage:decoder(3000,2000),encodeImage:encoder([1.25*MB],[])})));
assert.equal(twoTenMb.length,2);assert.ok(twoTenMb.reduce((sum,item)=>sum+item.file.size,0)<20*MB);

const twelve=await Promise.all(Array.from({length:12},(_,index)=>optimizePhoto(original(`foto-${index}.webp`,2*MB,'image/webp'),{decodeImage:decoder(1800,1200),encodeImage:encoder([1*MB],[])})));
assert.equal(twelve.length,12);assert.equal(twelve.reduce((sum,item)=>sum+item.file.size,0),12*MB);

await assert.rejects(()=>optimizePhoto(original('fallo.jpg',10*MB,'image/jpeg'),{decodeImage:decoder(3000,2000),encodeImage:async()=>{throw new Error('fallo simulado');}}),/No pudimos optimizar/);

const source=await readFile(new URL('./photo-optimizer.js',import.meta.url),'utf8');
assert.match(source,/imageOrientation:'from-image'/);assert.match(source,/drawImage\(source,0,0,width,height\)/);assert.match(source,/canvas\.toBlob/);assert.match(source,/no conserva EXIF ni GPS/);
console.log('OK: optimización JPG/PNG/WebP, orientación, 20 MB original, dos de 10 MB, doce fotos y fallo explícito.');
