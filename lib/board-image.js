// Screenshot intake for the position editor. Everything stays on this device:
// the image is decoded here and scanned in a local worker, then discarded.
const MAX_SIDE=1600, MAX_PIXELS=24000000;
let worker=null,nextId=0;
const pending=new Map();

function settle(id,finish) {
  const request=pending.get(id);
  if(!request)return;
  pending.delete(id);finish(request);
}
function scanner() {
  if(worker)return worker;
  worker=new Worker(new URL('./board-image-worker.js',import.meta.url),{type:'module'});
  worker.addEventListener('message',({data:{id,result,error}})=>settle(id,({resolve,reject})=>error?reject(Error(error)):resolve(result)));
  worker.addEventListener('error',()=>{
    const message='Board recognition could not start.';
    for(const id of [...pending.keys()])settle(id,({reject})=>reject(Error(message)));
    stopBoardScan();
  });
  return worker;
}
// Requests answer in order, so a newer scan simply makes the older result stale.
export function scanBoard({pixels},crop=null) {
  const id=++nextId;
  return new Promise((resolve,reject)=>{
    pending.set(id,{resolve,reject});
    scanner().postMessage({id,image:{data:pixels.data,width:pixels.width,height:pixels.height},crop});
  });
}
export function stopBoardScan() {worker?.terminate();worker=null;pending.clear();}

export async function readBoardImage(file) {
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP screenshot.');
  if(file.size>20*1024*1024)throw Error('Use an image smaller than 20 MB.');
  let bitmap;
  try {bitmap=await createImageBitmap(file);} catch {throw Error('This image could not be opened. Try a PNG or JPEG screenshot.');}
  try {
    if(bitmap.width<64||bitmap.height<64||bitmap.width*bitmap.height>MAX_PIXELS)throw Error('Use an image at least 64 × 64 pixels and no larger than 24 megapixels.');
    const scale=Math.min(1,MAX_SIDE/Math.max(bitmap.width,bitmap.height));
    const canvas=Object.assign(document.createElement('canvas'),{width:Math.round(bitmap.width*scale),height:Math.round(bitmap.height*scale)});
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return {canvas,pixels:context.getImageData(0,0,canvas.width,canvas.height)};
  } finally {bitmap.close();}
}

export function resizeCrop(crop,point,delta,width,height) {
  const size=Math.round(Math.max(64,Math.min(width,height,crop.size*Math.exp(-Math.max(-300,Math.min(300,delta))*.002))));
  const anchorX=Math.max(0,Math.min(1,(point.x-crop.x)/crop.size)),anchorY=Math.max(0,Math.min(1,(point.y-crop.y)/crop.size));
  return {size,x:Math.round(Math.max(0,Math.min(width-size,crop.x+(crop.size-size)*anchorX))),y:Math.round(Math.max(0,Math.min(height-size,crop.y+(crop.size-size)*anchorY)))};
}
