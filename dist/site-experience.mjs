import {SCENES,sceneIndex} from './scene-data.mjs';

const dialog=document.getElementById('scene-dialog');
const image=document.getElementById('scene-full-image');
const loadStatus=document.getElementById('scene-load-status');
const thumbnails=document.getElementById('scene-thumbnails');
let requested=0,requestToken=0;

const thumbnailButtons=SCENES.map((scene,index)=>{
  const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Ver ${scene.title}`);button.setAttribute('aria-pressed','false');
  const thumb=document.createElement('img');thumb.src=scene.src;thumb.alt='';thumb.loading='lazy';thumb.width=128;thumb.height=74;
  const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
  button.append(thumb,number);button.addEventListener('click',()=>showScene(index));thumbnails.append(button);return button;
});

async function showScene(value) {
  const index=sceneIndex(value);if(index<0)return;
  requested=index;const token=++requestToken,scene=SCENES[index];
  dialog.setAttribute('aria-busy','true');loadStatus.textContent='Cargando escena…';
  const preload=new Image();preload.src=scene.src;
  try {
    await preload.decode();if(token!==requestToken||!dialog.open)return;
    image.src=scene.src;image.alt=scene.alt;
    document.getElementById('scene-title').textContent=scene.title;
    document.getElementById('scene-description').textContent=scene.description;
    document.getElementById('scene-location').textContent=scene.location;
    document.getElementById('scene-count').textContent=`ARCHIVO ${String(index+1).padStart(2,'0')} / ${String(SCENES.length).padStart(2,'0')}`;
    thumbnailButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(index===i)));
    loadStatus.textContent='';
  }catch{if(token===requestToken)loadStatus.textContent='No se pudo cargar la imagen. Puedes elegir otra escena.';}
  finally{if(token===requestToken)dialog.removeAttribute('aria-busy');}
}

export function openScene(value) {
  if(sceneIndex(value)<0)return;
  if(!dialog.open){dialog.showModal();document.documentElement.classList.add('has-modal');}
  showScene(value);
}

document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>openScene(button.dataset.scene)));
document.getElementById('close-scene').addEventListener('click',()=>dialog.close());
document.getElementById('scene-prev').addEventListener('click',()=>showScene(requested-1));
document.getElementById('scene-next').addEventListener('click',()=>showScene(requested+1));
dialog.addEventListener('keydown',event=>{
  let value;if(event.key==='ArrowRight')value=requested+1;if(event.key==='ArrowLeft')value=requested-1;if(event.key==='Home')value=0;if(event.key==='End')value=SCENES.length-1;
  if(value!==undefined){event.preventDefault();showScene(value);}
});
dialog.addEventListener('close',()=>{requestToken++;dialog.removeAttribute('aria-busy');if(!document.querySelector('dialog[open]'))document.documentElement.classList.remove('has-modal');});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
let swipeStart=null;
image.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')swipeStart={x:event.clientX,y:event.clientY};});
image.addEventListener('pointerup',event=>{if(!swipeStart)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>55&&Math.abs(dy)<70)showScene(requested+(dx<0?1:-1));});
image.addEventListener('pointercancel',()=>swipeStart=null);
const expandCamera=document.getElementById('expand-camera');expandCamera.hidden=false;
expandCamera.addEventListener('click',()=>{const src=document.getElementById('camera-image').getAttribute('src');const scene=SCENES.find(s=>s.src===src);if(scene)openScene(scene.id);});

// A quiet soundscape is created only after an explicit user click. No autoplay.
const soundButtons=[...document.querySelectorAll('[data-ambience-toggle]')];
const volume=document.getElementById('ambience-volume');
const soundStatus=document.getElementById('sound-status');
let context=null,master=null,audioOn=false,audioChanging=false;

function makeSoundscape() {
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)throw new Error('Audio unavailable');
  context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const buffer=context.createBuffer(1,context.sampleRate*5,context.sampleRate),data=buffer.getChannelData(0);
  let last=0;
  for(let i=0;i<data.length;i++){last=(last+Math.random()*.08-.04)/1.02;data[i]=last*2.3;}
  const rain=context.createBufferSource();rain.buffer=buffer;rain.loop=true;
  const high=context.createBiquadFilter();high.type='highpass';high.frequency.value=350;
  const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=3300;
  rain.connect(high);high.connect(low);low.connect(master);rain.start();
  for(const [frequency,gain] of [[53,.10],[58,.025]]) {
    const hum=context.createOscillator();hum.type='sine';hum.frequency.value=frequency;
    const level=context.createGain();level.gain.value=gain;hum.connect(level);level.connect(master);hum.start();
  }
}

function updateSoundUI() {
  soundButtons.forEach(button=>{button.hidden=false;button.setAttribute('aria-pressed',String(audioOn));button.querySelector('[data-sound-label]').textContent=audioOn?'Silenciar ambiente':'Activar ambiente';});
  document.querySelector('.sound-volume').hidden=!audioOn;
  document.documentElement.classList.toggle('sound-on',audioOn);
}

function setLevel(){if(master&&context.state!=='closed')master.gain.setTargetAtTime(audioOn?Number(volume.value)/100*.45:0,context.currentTime,.4);}

soundButtons.forEach(button=>button.addEventListener('click',async()=>{
  if(audioChanging)return;audioChanging=true;
  try {
    if(!context||context.state==='closed')makeSoundscape();
    if(!audioOn)await context.resume();
    audioOn=!audioOn;setLevel();soundStatus.textContent=audioOn?'Ambiente activado.':'Ambiente silenciado.';
  }catch{audioOn=false;soundStatus.textContent='El audio no está disponible en este navegador.';}
  finally{audioChanging=false;updateSoundUI();}
}));
volume.addEventListener('input',setLevel);
document.addEventListener('visibilitychange',()=>{
  if(!context||context.state==='closed')return;
  if(document.hidden)context.suspend().catch(()=>{});
  else if(audioOn)context.resume().catch(()=>{audioOn=false;updateSoundUI();});
});
updateSoundUI();
