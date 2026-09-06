import {buildHotel, cameraAt, cameraMatrix, floorState, markerAt, project, orbitCamera, clamp, smooth, mix, CHAPTERS, STOPS, LABELS} from './hotel-model.mjs';
import {openScene} from './site-experience.mjs';

const root = document.documentElement;
const journey = document.getElementById('recorrido');
const stage = journey.querySelector('.journey-stage');
const viewport = journey.querySelector('.map-viewport');
const canvas = document.getElementById('hotel-canvas');
const toggle = journey.querySelector('.motion-toggle');
const buttons = [...journey.querySelectorAll('[data-stop]')];
const heroTrack = document.querySelector('.hero-track');
const hero = heroTrack.querySelector('.hero');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let storedMotion = null;
try { storedMotion = localStorage.getItem('247-motion'); } catch { /* Preferences are optional. */ }
let reduced = storedMotion ? storedMotion === 'reduced' : motionQuery.matches;
let progress = 0, target = 0, selectedChapter = -1, frame = null, previousFrame = 0;
let renderer = null, renderWidth = 0, renderHeight = 0;
let freeMode=false;
let freeView={yaw:.62,elevation:1.0,zoom:1,floor:-1};
const freeDialog=document.getElementById('map-dialog');
const freeBody=document.getElementById('free-map-body');
const freeButton=document.getElementById('open-map');
const floorSelect=document.getElementById('map-floor-select');
const originalParent=viewport.parentElement,originalNext=viewport.nextElementSibling;
const originalMapLabel=viewport.getAttribute('aria-label');

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aMaterial;
uniform mat4 uMatrix;
uniform vec3 uOffset;
varying mediump vec3 vWorld;
varying mediump vec3 vNormal;
varying mediump vec3 vColor;
varying mediump float vMaterial;
void main() {
  vWorld = aPosition + uOffset;
  vNormal = aNormal;
  vColor = aColor;
  vMaterial = aMaterial;
  vec4 clip = uMatrix * vec4(vWorld, 1.0);
  gl_Position = clip;
}`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uEye;
uniform vec3 uFocus;
uniform float uOpacity;
uniform float uAlarm;
uniform vec3 uAnomaly;
varying mediump vec3 vWorld;
varying mediump vec3 vNormal;
varying mediump vec3 vColor;
varying mediump float vMaterial;
float noise(vec2 p) { vec2 q=fract(p*vec2(.06711056,.00583715)); return fract((q.x+q.y)*5.9829189); }
void main() {
  vec3 n = normalize(vNormal);
  vec3 color = vColor;
  float grain = noise(floor(vWorld.xz * 9.0 + vWorld.y * 4.0));
  if (vMaterial > 0.5 && vMaterial < 1.5) {
    vec2 cell = fract(vWorld.xz * 2.6);
    float diamond = abs(cell.x-.5) + abs(cell.y-.5);
    color *= diamond < .27 ? 1.23 : .82;
    color *= .87 + grain * .22;
  } else if (vMaterial > 1.5 && vMaterial < 2.5) {
    float strip = fract((vWorld.x + vWorld.z) * 4.0);
    color *= .76 + grain * .20 + (strip > .9 ? .2 : 0.0);
  } else if (vMaterial > 2.5 && vMaterial < 3.5) {
    float pattern = sin(vWorld.x*9.0 + vWorld.z*9.0) * sin(vWorld.y*13.0);
    color *= .81 + grain*.22 + max(0.0,pattern)*.12;
  } else if (vMaterial > 3.5 && vMaterial < 4.5) {
    vec2 cell = fract(vWorld.xz * 1.5);
    color *= min(cell.x,cell.y) < .045 ? .48 : .96;
  }
  float light = .51 + max(dot(n,normalize(vec3(-.35,1.0,.55))),0.0)*.63;
  float focus = exp(-length(vWorld-uFocus)*.40);
  color *= light;
  color += vec3(.11,.09,.035)*focus;
  if (vMaterial > 4.5) color = vColor * (vMaterial > 5.5 ? .95 : 1.13);
  float redPool = exp(-length(vWorld-uAnomaly)*.36)*uAlarm;
  color += vec3(.28,.023,.006)*redPool;
  float fog = clamp((distance(uEye,vWorld)-32.0)/100.0,0.0,.43);
  color = mix(color,vec3(.043,.064,.046),fog);
  float dither = mod(gl_FragCoord.x+gl_FragCoord.y*2.0,4.0)/4.0;
  color *= mix(.38,1.0,uOpacity);
  color = floor(clamp(color,0.0,1.0)*63.0+dither*.45)/63.0;
  gl_FragColor = vec4(color,1.0);
}`;

function createRenderer() {
  const gl = canvas.getContext('webgl', {antialias:false,alpha:true,depth:true,powerPreference:'low-power'});
  if (!gl) throw new Error('WebGL unavailable');
  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(message);
    }
    return s;
  }
  const vs=shader(gl.VERTEX_SHADER,vertexSource), fs=shader(gl.FRAGMENT_SHADER,fragmentSource);
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const attributes=[['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aMaterial',1,36]].map(([name,size,offset])=>({location:gl.getAttribLocation(program,name),size,offset}));
  const uniforms=Object.fromEntries(['uMatrix','uOffset','uEye','uFocus','uOpacity','uAlarm','uAnomaly'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const hotel=buildHotel();
  const buffers=[...hotel.floors,hotel.marker].map(data=>{
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    return {buffer,count:data.length/10};
  });
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.disable(gl.BLEND);
  gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);
  gl.clearColor(0,0,0,0);
  function draw(mesh, offset, opacity) {
    if(opacity<.025)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
    for(const a of attributes){gl.enableVertexAttribArray(a.location);gl.vertexAttribPointer(a.location,a.size,gl.FLOAT,false,40,a.offset);}
    gl.uniform3fv(uniforms.uOffset,offset);gl.uniform1f(uniforms.uOpacity,opacity);
    gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  return {
    resize() {
      const rect=viewport.getBoundingClientRect();
      renderWidth=rect.width;renderHeight=rect.height;
      // Deliberate console-era framebuffer. UI text retains full browser resolution.
      const scale=Math.min(.92,1280/Math.max(1,rect.width));
      canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));
      gl.viewport(0,0,canvas.width,canvas.height);
    },
    render(p) {
      if(!renderWidth||!renderHeight)return;
      const camera=freeMode?orbitCamera(freeView):cameraAt(p),matrix=cameraMatrix(camera,renderWidth/renderHeight);
      const floors=freeMode?[0,1,2].map(i=>({offset:[0,freeView.floor<0?[0,9.1,18.2][i]:0,0],opacity:freeView.floor<0||freeView.floor===i?1:0})):floorState(p);
      const focus=freeMode?camera.target:markerAt(p);
      gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(uniforms.uMatrix,false,matrix);
      gl.uniform3fv(uniforms.uEye,camera.eye);gl.uniform3fv(uniforms.uFocus,focus);gl.uniform1f(uniforms.uAlarm,freeMode?.45:smooth((p-.74)/.22));
      gl.uniform3fv(uniforms.uAnomaly,[6.85,floors[1].offset[1]+.2,3.0]);
      floors.forEach((f,i)=>draw(buffers[i],f.offset,f.opacity));
      if(!freeMode&&(p<.46||p>.66))draw(buffers[3],focus,1);
      updateLabels(p,matrix,floors);
    },
    destroy() {buffers.forEach(b=>gl.deleteBuffer(b.buffer));gl.deleteProgram(program);}
  };
}

const labelElements=LABELS.map(label=>{
  const element=document.createElement(label.scene?'button':'span');element.className=`map-label${label.red?' is-red':''}`;element.textContent=label.text;element.hidden=true;
  if(label.scene){element.type='button';element.setAttribute('aria-label',`Ver escena: ${label.text}`);element.addEventListener('click',()=>openScene(label.scene));}
  journey.querySelector('.map-labels').append(element);return element;
});

function updateLabels(p,matrix,floors) {
  LABELS.forEach((label,i)=>{
    const element=labelElements[i],floor=floors[label.floor];
    if((!freeMode&&(p<label.from||p>label.to))||floor.opacity<.65){element.hidden=true;return;}
    const point=label.point.map((n,k)=>n+floor.offset[k]),ndc=project(point,matrix);
    const x=(ndc[0]*.5+.5)*renderWidth,y=(-ndc[1]*.5+.5)*renderHeight;
    const margin=label.red?75:43;
    if(x<margin||x>renderWidth-margin||y<24||y>renderHeight-45||ndc[2]<-1||ndc[2]>1){element.hidden=true;return;}
    element.hidden=false;
    element.style.transform=`translate(${Math.round(x)}px,${Math.round(y-17)}px) translate(-50%,-100%)`;
    element.style.opacity=String(floor.opacity);
  });
}

function chapterFor(p) {
  if(p<.16)return 0;if(p<.335)return 1;if(p<.57)return 2;if(p<.845)return 3;return 4;
}

function updateChapter(p) {
  const index=chapterFor(p);
  if(index===selectedChapter)return;
  selectedChapter=index;
  const chapter=CHAPTERS[index],heading=document.getElementById('journey-heading');
  heading.replaceChildren(document.createTextNode(chapter.title[0]+' '),document.createElement('br'),document.createTextNode(chapter.title[1]));
  document.getElementById('journey-kicker').textContent=chapter.time;
  document.getElementById('journey-description').textContent=chapter.text;
  document.getElementById('journey-location').textContent=chapter.location;
  document.getElementById('map-floor').textContent=chapter.floor;
  stage.dataset.chapter=String(index);
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  if(!reduced){heading.classList.remove('is-changing');requestAnimationFrame(()=>heading.classList.add('is-changing'));}
}

function isPinned() {return !reduced&&renderer!==null&&innerHeight>=640&&!freeMode;}

function updateHero() {
  if(reduced||innerWidth<=760||innerHeight<640)return;
  const r=heroTrack.getBoundingClientRect();
  if(r.bottom<0||r.top>innerHeight)return;
  const p=clamp(-r.top/Math.max(1,heroTrack.offsetHeight-hero.offsetHeight));
  hero.style.setProperty('--hero-scale',String(1+p*.25));
  hero.style.setProperty('--hero-shift',`${-p*95}px`);
  hero.style.setProperty('--hero-opacity',String(1-smooth((p-.24)/.7)));
}

function tick(time) {
  frame=null;
  if(document.hidden)return;
  if(time-previousFrame<(freeMode?15:28)){schedule();return;}
  previousFrame=time;
  if(freeMode){renderer?.render(progress);return;}
  updateHero();
  const rect=journey.getBoundingClientRect();
  if(isPinned())target=clamp(-rect.top/Math.max(1,journey.offsetHeight-stage.offsetHeight));
  if(rect.bottom<-100||rect.top>innerHeight+150)return;
  progress=reduced?target:mix(progress,target,.17);
  if(Math.abs(progress-target)<.0002)progress=target;
  if(renderer)renderer.render(progress);
  updateChapter(progress);
  document.getElementById('journey-progress-fill').style.transform=`scaleX(${progress})`;
  document.getElementById('journey-percent').textContent=`${String(Math.round(progress*100)).padStart(2,'0')}%`;
  if(Math.abs(progress-target)>.0002)schedule();
}

function schedule(){if(frame===null)frame=requestAnimationFrame(tick);}

function updateMotion() {
  root.classList.toggle('no-motion',reduced);root.classList.toggle('motion-full',!reduced);
  toggle.setAttribute('aria-pressed',String(reduced));toggle.textContent=reduced?'Activar movimiento':'Reducir movimiento';
  document.getElementById('journey-instruction').textContent=isPinned()?'DESLIZA PARA RECORRER':'ELIGE UNA ETAPA';
}

toggle.addEventListener('click',()=>{
  const current=selectedChapter<0?0:selectedChapter;
  reduced=!reduced;try{localStorage.setItem('247-motion',reduced?'reduced':'full');}catch{}
  updateMotion();target=STOPS[current];progress=target;
  renderer?.resize();
  if(isPinned()) {
    const top=journey.getBoundingClientRect().top+scrollY;
    window.scrollTo({top:top+target*(journey.offsetHeight-stage.offsetHeight),behavior:'instant'});
  } else journey.scrollIntoView({behavior:'instant',block:'start'});
  schedule();
});

buttons.forEach(button=>button.addEventListener('click',()=>{
  const destination=STOPS[Number(button.dataset.stop)];
  if(isPinned()) {
    const top=journey.getBoundingClientRect().top+scrollY;
    window.scrollTo({top:top+destination*(journey.offsetHeight-stage.offsetHeight),behavior:'smooth'});
  } else {target=destination;schedule();}
}));

function resize(){renderer?.resize();updateMotion();schedule();}

try {
  renderer=createRenderer();renderer.resize();renderer.render(0);journey.classList.add('has-3d');freeButton.hidden=false;
} catch {
  renderer?.destroy();renderer=null;journey.classList.add('no-webgl');
  document.getElementById('journey-instruction').textContent='ELIGE UNA ETAPA';
}

canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();renderer=null;freeButton.hidden=true;if(freeDialog.open)freeDialog.close();journey.classList.remove('has-3d');journey.classList.add('no-webgl');
  labelElements.forEach(el=>el.hidden=true);updateMotion();schedule();
});
canvas.addEventListener('webglcontextrestored',()=>{
  try {renderer=createRenderer();freeButton.hidden=false;journey.classList.add('has-3d');journey.classList.remove('no-webgl');resize();}catch{}
});

if('IntersectionObserver' in window) {
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}});
  },{threshold:.12,rootMargin:'0px 0px -25px 0px'});
  document.querySelectorAll('.story-grid>*,.section-intro,.experience-grid article,.art-direction,.end-note-inner').forEach(el=>{
    el.classList.add('revealable','will-reveal');observer.observe(el);
  });
}

root.classList.add('motion-ready');toggle.hidden=false;updateMotion();
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame!==null){cancelAnimationFrame(frame);frame=null;}else schedule();});
motionQuery.addEventListener('change',()=>{let pref=null;try{pref=localStorage.getItem('247-motion');}catch{}if(!pref){reduced=motionQuery.matches;updateMotion();resize();}});
if('ResizeObserver' in window)new ResizeObserver(resize).observe(viewport);
updateChapter(0);schedule();


function refreshFreeLabel(){document.getElementById('map-floor').textContent=freeView.floor<0?'HOTEL / 3 PLANTAS':['PLANTA BAJA','SEGUNDO PISO','TERCER PISO'][freeView.floor];}
function zoomBy(factor){freeView.zoom=clamp(freeView.zoom*factor,.5,2.2);schedule();}
freeButton.addEventListener('click',()=>{
  if(!renderer)return;
  freeMode=true;freeView={yaw:.62,elevation:1.0,zoom:1,floor:-1};floorSelect.value='all';
  freeBody.append(viewport);freeDialog.showModal();root.classList.add('has-modal');
  viewport.setAttribute('aria-label','Mapa 3D del hotel. Gira, acerca y selecciona una planta. Los lugares señalados abren su imagen.');
  canvas.removeAttribute('aria-hidden');canvas.tabIndex=0;canvas.setAttribute('aria-label','Mapa 3D interactivo');canvas.setAttribute('aria-describedby','map-keyboard-help');
  refreshFreeLabel();renderer.resize();renderer.render(progress);canvas.focus({preventScroll:true});
});
document.getElementById('close-map').addEventListener('click',()=>freeDialog.close());
freeDialog.addEventListener('close',()=>{
  for(const id of pointers.keys())if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);
  pointers.clear();pinchDistance=0;
  freeMode=false;originalParent.insertBefore(viewport,originalNext);
  viewport.setAttribute('aria-label',originalMapLabel);canvas.setAttribute('aria-hidden','true');canvas.removeAttribute('tabindex');canvas.removeAttribute('aria-describedby');
  if(!document.querySelector('dialog[open]'))root.classList.remove('has-modal');
  selectedChapter=-1;renderer?.resize();updateChapter(progress);updateMotion();schedule();freeButton.focus({preventScroll:true});
});
floorSelect.addEventListener('change',()=>{freeView.floor=floorSelect.value==='all'?-1:Number(floorSelect.value);freeView.zoom=1;refreshFreeLabel();schedule();});
document.getElementById('map-zoom-in').addEventListener('click',()=>zoomBy(.85));
document.getElementById('map-zoom-out').addEventListener('click',()=>zoomBy(1.18));
document.getElementById('map-reset').addEventListener('click',()=>{freeView={...freeView,yaw:.62,elevation:1.0,zoom:1};schedule();});
const pointers=new Map();let pinchDistance=0;
viewport.addEventListener('pointerdown',event=>{
  if(!freeMode||event.button!==0||event.target.closest('button'))return;
  event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});viewport.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});
  if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}
});
viewport.addEventListener('pointermove',event=>{
  if(!freeMode||!pointers.has(event.pointerId))return;
  const old=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===1){freeView.yaw-=(event.clientX-old.x)*.008;freeView.elevation=clamp(freeView.elevation+(event.clientY-old.y)*.005,.42,1.43);}
  else{const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance>0&&pinchDistance>0)zoomBy(pinchDistance/distance);pinchDistance=distance;}
  schedule();
});
function releasePointer(event){pointers.delete(event.pointerId);if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);pinchDistance=0;}
viewport.addEventListener('pointerup',releasePointer);viewport.addEventListener('pointercancel',releasePointer);
viewport.addEventListener('lostpointercapture',event=>{pointers.delete(event.pointerId);pinchDistance=0;});
viewport.addEventListener('wheel',event=>{if(!freeMode)return;event.preventDefault();zoomBy(Math.exp(clamp(event.deltaY,-120,120)*.0017));},{passive:false});
canvas.addEventListener('keydown',event=>{
  if(!freeMode)return;let used=true;
  if(event.key==='ArrowLeft')freeView.yaw+=.1;
  else if(event.key==='ArrowRight')freeView.yaw-=.1;
  else if(event.key==='ArrowUp')freeView.elevation=clamp(freeView.elevation-.07,.42,1.43);
  else if(event.key==='ArrowDown')freeView.elevation=clamp(freeView.elevation+.07,.42,1.43);
  else if(event.key==='+'||event.key==='=')zoomBy(.85);
  else if(event.key==='-')zoomBy(1.18);
  else if(event.key.toLowerCase()==='r')freeView={...freeView,yaw:.62,elevation:1.0,zoom:1};
  else used=false;
  if(used){event.preventDefault();schedule();}
});
