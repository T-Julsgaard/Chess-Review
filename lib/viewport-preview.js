export const SCREEN_SIZES={
  Desktop:[['Full HD',1920,1080],['QHD',2560,1440],['4K',3840,2160],['Ultrawide',3440,1440]],
  Laptop:[['Small laptop',1280,720],['Common laptop',1366,768],['Scaled laptop',1440,900],['Large laptop',1536,864],['Tall laptop',1920,1200]],
  Tablet:[['Small tablet',768,1024],['Tablet',820,1180],['Large tablet',1024,1366]],
  Phone:[['Small phone',320,568],['Phone',390,844],['Large phone',430,932]],
  Custom:[],
};

export function previewScale(width,height,availableWidth,availableHeight,mode='fit') {
  return mode==='fit'?Math.min(1,Math.max(1,availableWidth-48)/width,Math.max(1,availableHeight-48)/height):1;
}

export function mountViewportPreview(doc) {
  const win=doc.defaultView,$=id=>doc.getElementById(id);
  // The launch snapshot has already been copied into this tab's session storage.
  win.opener=null;
  const frame=$('preview-app'),stage=$('preview-stage'),surface=$('preview-surface');
  const preset=$('screen-preset'),widthInput=$('screen-width'),heightInput=$('screen-height');
  let group='Desktop',width=1920,height=1080,appZoom=1;
  const tabs=new Map();
  function render() {
    widthInput.value=width;heightInput.value=height;
    const scale=previewScale(width,height,stage.clientWidth,stage.clientHeight,$('preview-scale').value);
    surface.style.width=width*scale+'px';surface.style.height=height*scale+'px';
    // The inner document gets the same CSS viewport as a browser zoomed by the
    // application's normal layout fitter. Fit-to-window is only a visual scale.
    frame.dataset.previewZoom=appZoom;
    frame.style.width=Math.round(width/appZoom)+'px';frame.style.height=Math.round(height/appZoom)+'px';
    frame.style.transform=`scale(${scale*appZoom})`;
    $('screen-readout').textContent=`${width} × ${height} · ${Math.round(scale*100)}% view`;
    for(const [name,button]of tabs){button.setAttribute('aria-pressed',String(group===name));}
  }
  function chooseGroup(name) {
    group=name;
    preset.replaceChildren();
    const sizes=SCREEN_SIZES[name];
    for(const [index,[label,w,h]]of sizes.entries()){
      const option=doc.createElement('option');option.value=index;option.textContent=`${label} · ${w} × ${h}`;preset.append(option);
    }
    if(sizes.length){[,width,height]=sizes[0];preset.disabled=false;}
    else{const option=doc.createElement('option');option.textContent='Custom size';preset.append(option);preset.disabled=true;}
    render();
  }
  for(const name of Object.keys(SCREEN_SIZES)){
    const button=doc.createElement('button');button.type='button';button.textContent=name;
    button.addEventListener('click',()=>chooseGroup(name));tabs.set(name,button);$('device-tabs').append(button);
  }
  preset.addEventListener('change',()=>{const size=SCREEN_SIZES[group][Number(preset.value)];if(size){[,width,height]=size;render();}});
  function customSize(){
    if(!widthInput.checkValidity()||!heightInput.checkValidity()){widthInput.reportValidity();heightInput.reportValidity();return;}
    width=Number(widthInput.value);height=Number(heightInput.value);chooseGroup('Custom');
  }
  widthInput.addEventListener('change',customSize);heightInput.addEventListener('change',customSize);
  $('rotate-screen').addEventListener('click',()=>{[width,height]=[height,width];chooseGroup('Custom');});
  $('preview-scale').addEventListener('change',render);
  $('close-preview').addEventListener('click',()=>win.close());
  frame.addEventListener('preview-zoom',event=>{
    if(Number.isFinite(event.detail)&&event.detail>=0.5&&event.detail<=2){appZoom=event.detail;render();}
  });
  win.addEventListener('resize',render);
  const observer=win.ResizeObserver?new win.ResizeObserver(render):null;observer?.observe(stage);
  chooseGroup(group);
  // Keep this iframe alive across all size changes, including rotation and zoom.
  frame.src='analysis.html?viewport-preview=1';
  return {frame,render};
}

if(typeof document!=='undefined'&&document.getElementById('preview-app'))mountViewportPreview(document);
