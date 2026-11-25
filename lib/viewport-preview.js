import {browserAPI} from '../browser-compat.js';

export const SCREEN_SIZES={
  Desktop:[['1080p (Full HD)',1920,1080],['1440p (QHD)',2560,1440],['4K',3840,2160],['Ultrawide',3440,1440]],
  Laptop:[['Small laptop',1280,720],['Common laptop',1366,768],['Scaled laptop',1440,900],['Large laptop',1536,864],['Tall laptop',1920,1200]],
  Tablet:[['Small tablet',768,1024],['Tablet',820,1180],['Large tablet',1024,1366]],
  Custom:[],
};

export function previewScale(width,height,availableWidth,availableHeight,mode='fit') {
  return mode==='fit'?Math.min(1,Math.max(1,availableWidth)/width,Math.max(1,availableHeight)/height):1;
}

export function monitorViewport(width,height,displayScale,{insetWidth=0,insetHeight=0}={}) {
  return [Math.max(1,Math.round(width/displayScale-insetWidth)),
    Math.max(1,Math.round(height/displayScale-insetHeight))];
}

function measureDisplay(win) {
  const {screen}=win;
  // A maximized window can report outer bounds that include invisible resize
  // borders past the work area. Those borders leave the viewport unchanged.
  const reserved=(size,available,outer,inner)=>{
    const workArea=available||size;
    const windowSize=inner<=workArea?Math.min(outer,workArea):outer;
    return Math.max(0,size-workArea)+Math.max(0,windowSize-inner);
  };
  return {scale:win.devicePixelRatio||1,
    insetWidth:reserved(screen.width,screen.availWidth,win.outerWidth,win.innerWidth),
    insetHeight:reserved(screen.height,screen.availHeight,win.outerHeight,win.innerHeight)};
}

export async function normalizePreviewZoom(tabs=browserAPI?.tabs) {
  if(!tabs?.getCurrent)return;
  try {
    const tab=await tabs.getCurrent();
    if(tab?.id==null)return;
    await tabs.setZoomSettings(tab.id,{scope:'per-tab',mode:'automatic'}).catch(()=>{});
    if(Math.abs((await tabs.getZoom(tab.id))-1)>.005)await tabs.setZoom(tab.id,1);
  } catch { /* The viewer also works outside extension tabs. */ }
}

export function mountViewportPreview(doc) {
  const win=doc.defaultView,$=id=>doc.getElementById(id);
  // The launch snapshot has already been copied into this tab's session storage.
  win.opener=null;
  const frame=$('preview-app'),stage=$('preview-stage'),surface=$('preview-surface');
  const preset=$('screen-preset'),widthInput=$('screen-width'),heightInput=$('screen-height');
  const settings=$('preview-settings'),toggle=$('toggle-settings'),toolbar=$('preview-toolbar'),show=$('show-controls'),fullscreen=$('fullscreen-preview');
  const monitorSettings=$('monitor-settings'),displayScale=$('display-scale'),targetWindow=$('target-window');
  let snapshot;
  try{snapshot=JSON.parse(win.sessionStorage.getItem('screen-size-preview'));}catch{}
  const {width:currentWidth,height:currentHeight}=snapshot?.display||{width:win.innerWidth,height:win.innerHeight};
  const sizesByGroup={Current:[['Current window',currentWidth,currentHeight]],...SCREEN_SIZES};
  let group='Current',width=currentWidth,height=currentHeight,display;
  const tabs=new Map();
  const isMonitor=()=>group==='Desktop'||group==='Laptop';
  function setSettings(open) {
    settings.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
  }
  function setControls(visible) {
    toolbar.hidden=!visible;show.hidden=visible;
    if(!visible)setSettings(false);
  }
  function fullscreenChanged() {
    const active=doc.fullscreenElement===doc.documentElement;
    fullscreen.textContent=active?'Exit full screen':'Full screen';
    fullscreen.setAttribute('aria-pressed',String(active));
    render();
  }
  function render() {
    widthInput.value=width;heightInput.value=height;
    const mode=$('preview-scale').value;
    const scale=previewScale(width,height,stage.clientWidth,stage.clientHeight,mode);
    surface.style.width=width*scale+'px';surface.style.height=height*scale+'px';
    // Display scaling belongs only to the preview viewer. The app always gets
    // the requested CSS viewport, exactly as it does at 100% browser zoom.
    frame.style.width=width+'px';frame.style.height=height+'px';
    frame.style.transform=`scale(${scale})`;
    $('screen-readout').textContent=`${width} × ${height} CSS px · ${mode==='fit'?'Fit '+Math.round(scale*100)+'%':'Actual size'}`;
    $('screen-readout').title='Browser viewport in CSS pixels. Fit shrinks the preview to show the whole layout. Actual size may require scrolling.';
    for(const [name,button]of tabs){button.setAttribute('aria-pressed',String(group===name));}
  }
  function chooseGroup(name) {
    group=name;
    monitorSettings.hidden=!isMonitor();
    preset.replaceChildren();
    const sizes=sizesByGroup[name];
    for(const [index,[label,w,h]]of sizes.entries()){
      const option=doc.createElement('option');option.value=index;option.textContent=`${label} · ${w} × ${h}`;preset.append(option);
    }
    if(sizes.length){preset.disabled=false;selectSize();}
    else{const option=doc.createElement('option');option.textContent='Custom size';preset.append(option);preset.disabled=true;}
    render();
  }
  function selectSize() {
    const size=sizesByGroup[group][Number(preset.value)];
    if(!size)return;
    const [,w,h]=size;
    const scale=displayScale.value==='current'?display.scale:Number(displayScale.value);
    [width,height]=isMonitor()?monitorViewport(w,h,scale,targetWindow.value==='maximized'?display:undefined):[w,h];
  }
  function updateDisplay() {
    display=measureDisplay(win);
    const current=displayScale.querySelector('[value=current]');
    current.textContent=`This display (${Math.round(display.scale*100)}%)`;
    if(isMonitor())selectSize();
    render();
  }
  for(const name of Object.keys(sizesByGroup)){
    const button=doc.createElement('button');button.type='button';button.textContent=name;
    button.addEventListener('click',()=>chooseGroup(name));tabs.set(name,button);$('device-tabs').append(button);
  }
  for(const control of [preset,displayScale,targetWindow]){
    control.addEventListener('change',()=>{selectSize();render();});
  }
  function customSize(){
    if(!widthInput.checkValidity()||!heightInput.checkValidity()){widthInput.reportValidity();heightInput.reportValidity();return;}
    width=widthInput.valueAsNumber;height=heightInput.valueAsNumber;chooseGroup('Custom');
  }
  widthInput.addEventListener('change',customSize);heightInput.addEventListener('change',customSize);
  $('rotate-screen').addEventListener('click',()=>{[width,height]=[height,width];chooseGroup('Custom');});
  $('preview-scale').addEventListener('change',render);
  toggle.addEventListener('click',()=>{setSettings(settings.hidden);if(!settings.hidden)$('close-settings').focus();});
  $('close-settings').addEventListener('click',()=>{setSettings(false);toggle.focus();});
  $('hide-controls').addEventListener('click',()=>{setControls(false);show.focus();});
  show.addEventListener('click',()=>{setControls(true);toggle.focus();});
  fullscreen.hidden=!doc.documentElement.requestFullscreen;
  fullscreen.addEventListener('click',async()=>{
    $('preview-status').hidden=true;
    try {
      if(doc.fullscreenElement)await doc.exitFullscreen();
      else {await doc.documentElement.requestFullscreen();setControls(false);show.focus();}
    } catch {
      $('preview-status').textContent='Full screen could not open. You can still use the preview in this tab.';
      $('preview-status').hidden=false;
    }
  });
  doc.addEventListener('fullscreenchange',fullscreenChanged);
  doc.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!settings.hidden){setSettings(false);toggle.focus();event.preventDefault();}
  });
  $('close-preview').addEventListener('click',()=>win.close());
  win.addEventListener('resize',render);
  const observer=win.ResizeObserver?new win.ResizeObserver(render):null;observer?.observe(stage);
  updateDisplay();
  chooseGroup(group);
  normalizePreviewZoom().then(updateDisplay);
  // Keep this iframe alive across all size changes, including rotation and zoom.
  frame.src='analysis.html?viewport-preview=1';
  return {frame,render};
}

if(typeof document!=='undefined'&&document.getElementById('preview-app'))mountViewportPreview(document);
