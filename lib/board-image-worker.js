// Scans screenshots off the main thread, so the board keeps animating meanwhile.
// The model only loads here, on the first import.
import {parseModel} from './board-model.js';
import {scanImage} from './board-scan.js';

let model;
self.addEventListener('message',async({data:{id,image,crop}})=>{
  try {
    model??=fetch(new URL('./board-model.bin',import.meta.url)).then(response=>response.arrayBuffer()).then(parseModel);
    self.postMessage({id,result:scanImage(image,await model,{crop})});
  } catch(error) {model=undefined;self.postMessage({id,error:error.message});}
});
