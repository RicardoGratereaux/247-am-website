// Roofless, explorable model of the approved hotel plan. All positions are in metres.
export const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
const V = (a, b, t) => a.map((n, i) => mix(n, b[i], t));

export const STOPS = [0, .225, .425, .685, .955];
export const CHAPTERS = [
  { title: ['CONOCE', 'EL TERRENO.'], time: '00:00 AM / LLEGADA', text: 'Tres plantas. Demasiadas puertas. Antes de empezar tu turno, memoriza el camino de vuelta.', location: 'HOTEL / VISTA GENERAL', floor: 'HOTEL / 3 PLANTAS' },
  { title: ['EMPIEZA', 'TU TURNO.'], time: '00:15 AM / RECEPCIÓN', text: 'Recoge las llaves. Revisa el registro. El hotel parece tranquilo. Por ahora.', location: 'PLANTA BAJA / RECEPCIÓN', floor: 'PLANTA BAJA' },
  { title: ['NO DEJES', 'DE MIRAR.'], time: '01:30 AM / VIGILANCIA', text: 'Los monitores muestran pasillos vacíos. El teléfono suena desde una habitación que debería estar cerrada.', location: 'PLANTA BAJA / VIGILANCIA', floor: 'PLANTA BAJA' },
  { title: ['ALGO', 'HA CAMBIADO.'], time: '02:46 AM / SEGUNDO PISO', text: 'Subes las escaleras. Reconoces las puertas, pero el camino ya no coincide con el que recuerdas.', location: 'PISO 02 / PASILLO PRINCIPAL', floor: 'SEGUNDO PISO' },
  { title: ['ESA PUERTA', 'NO EXISTÍA.'], time: '02:47 AM / HABITACIÓN 247', text: 'El pasillo debería terminar aquí. Al otro lado se oye un manojo de llaves. La llamada sigue en línea.', location: 'PISO 02 / HABITACIÓN 247', floor: 'HABITACIÓN 247 / SIN REGISTRO' }
];

const palette = {
  foundation: [.13, .16, .12], plaster: [.48, .43, .30], wood: [.25, .16, .085],
  trim: [.37, .28, .12], carpet: [.31, .13, .08], tile: [.33, .35, .27],
  linen: [.55, .51, .35], blanket: [.29, .29, .16], dark: [.08, .095, .07],
  brass: [.57, .43, .19], lamp: [.97, .66, .25], crt: [.29, .62, .43], red: [.67, .15, .065]
};

class MeshBuilder {
  constructor() { this.vertices = []; this.count = 0; }
  box(x, y, z, w, h, d, color, material = 0, angle = 0) {
    const c = typeof color === 'string' ? palette[color] : color;
    const cs = Math.cos(angle), sn = Math.sin(angle);
    const faces = [
      [[0,1,0], [[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
      [[0,-1,0], [[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
      [[0,0,1], [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
      [[0,0,-1], [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
      [[1,0,0], [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],
      [[-1,0,0], [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]]
    ];
    for (const [n, points] of faces) {
      const normal = [n[0]*cs+n[2]*sn, n[1], -n[0]*sn+n[2]*cs];
      for (const i of [0,1,2,0,2,3]) {
        const p = points[i], px = p[0]*w/2, pz = p[2]*d/2;
        this.vertices.push(x+px*cs+pz*sn,y+p[1]*h/2,z-px*sn+pz*cs,...normal,...c,material);
      }
    }
    this.count++;
  }
  wall(x, z, w, d, h = 1.4) {
    this.box(x,h/2+.13,z,w,h,d,'plaster',3);
    this.box(x,.3,z,w+.02,.34,d+.02,'wood',2);
    this.box(x,h+.14,z,w+.05,.045,d+.05,'trim');
  }
  door(x,z,angle=0,red=false) {
    this.box(x,1.01,z,1.0,1.76,.12,red?'red':'wood',2,angle);
    this.box(x,1.92,z,1.2,.09,.2,'trim',0,angle);
    this.box(x+Math.cos(angle)*.44,1.0,z-Math.sin(angle)*.44+.085,.07,.07,.09,'brass');
  }
  lamp(x,z,y=.8) {
    this.box(x,y+.02,z,.42,.07,.42,'wood');
    this.box(x,y+.25,z,.055,.45,.055,'brass');
    this.box(x,y+.51,z,.45,.28,.45,'lamp',5);
  }
  bed(x,z) {
    this.box(x+.09,.131,z+.1,1.96,.008,2.76,[.11,.10,.06]);
    this.box(x,.31,z,1.75,.44,2.5,'wood',2);
    this.box(x,.62,z,1.69,.23,2.4,'linen');
    this.box(x,.755,z+.33,1.7,.05,1.72,'blanket',1);
    this.box(x-.4,.83,z-.84,.63,.17,.41,'linen');
    this.box(x+.4,.83,z-.84,.63,.17,.41,'linen');
    this.box(x,1.02,z-1.22,1.8,1.4,.15,'wood',2);
    this.box(x+1.15,.4,z-1.05,.43,.6,.45,'wood',2);
    this.lamp(x+1.15,z-1.05,.72);
  }
  desk(x,z,w=2.4,d=.95) {
    this.box(x,.99,z,w,.16,d,'wood',2);
    for (const dx of [-w/2+.12,w/2-.12]) for (const dz of [-d/2+.1,d/2-.1]) this.box(x+dx,.5,z+dz,.12,1,.12,'dark');
  }
  crt(x,z,y=1.1,w=.7) {
    this.box(x,y+.27,z,w,.53,.5,'dark');
    this.box(x,y+.29,z+.259,w*.81,.37,.014,'crt',5);
    this.box(x,y+.04,z+.30,w*.75,.05,.10,'wood');
  }
  data() { return new Float32Array(this.vertices); }
}

function floorBase(b) {
  b.box(0,-.3,0,24.7,.65,13.4,'foundation',2);
  b.box(0,.065,0,24.3,.12,13.05,'carpet',1);
  b.box(0,-.04,-6.64,24.8,.12,.1,'trim');
  b.box(0,-.04,6.64,24.8,.12,.1,'trim');
  b.box(-12.34,-.04,0,.1,.12,13.3,'trim');
  b.box(12.34,-.04,0,.1,.12,13.3,'trim');
}

function stairs(b,x,z,direction=1) {
  b.box(x,.13,z,3.65,.14,3.7,'tile',4);
  for(let i=0;i<9;i++) b.box(x-.66,.2+i*.13,z+direction*(1.5-i*.32),1.35,.16+i*.24,.34,'tile',4);
  for(let i=0;i<5;i++) b.box(x+.16,.6+i*.2,z+direction*(1.5-i*.56),.055,.7,.055,'brass');
  b.box(x+.82,1.36,z-1.25,1.7,.13,.9,'tile',4);
}

function lobbyFloor() {
  const b=new MeshBuilder(); floorBase(b);
  // North: reception, security, elevator. South: cleaning, storage, bathroom, stairs.
  b.wall(0,-6.5,24.3,.2,1.8); b.wall(12.1,0,.2,13,1.2);
  b.wall(-12.1,-4.35,.2,4.3,1.5); b.wall(-12.1,3.4,.2,6.2,1.1);
  b.wall(0,6.5,24.3,.2,.95); b.wall(1,-3,.2,6.85,1.5); b.wall(7,-3,.2,6.85,1.5);
  b.wall(9.8,.5,4.65,.18,1.0); b.wall(2.4,.5,2.8,.18,1.0); b.wall(6,.5,2,.18,1.0);
  b.wall(-10,.5,4,.18,1.0); b.wall(-2,.5,6,.18,1.0);
  b.box(0,.15,1.42,24.05,.05,1.65,[.37,.20,.105],1);
  for(const [x,w] of [[-10,4],[-5.5,4.5],[0,6.2],[9.6,4.8]]) b.wall(x,2.3,w,.18,1.1);
  for(const x of [-7.5,-3,3.2,7]) b.wall(x,4.4,.18,4.2,1.2);
  // Door openings and individual zones.
  b.door(-7.8,.48); b.door(4.35,.48); b.door(-10.2,2.27); b.door(-5.2,2.27); b.door(.35,2.27);
  b.box(9.5,.15,-3,4.65,.1,6.3,'tile',4); b.wall(9.55,-1.0,3.0,.16,1.7);
  b.box(9.55,1.02,-.9,1.55,1.72,.07,'dark'); b.box(9.55,1.02,-.85,.025,1.6,.015,'brass');
  // Reception counter, desk, keys, armchairs, old telephone, lamp.
  b.box(-5.2,.68,-3.45,5.7,1.18,1.18,'wood',2); b.box(-5.2,1.33,-3.45,5.9,.14,1.32,'trim',2);
  b.box(-8,.68,-4.45,1.12,1.18,2.1,'wood',2); b.crt(-6.9,-3.45,1.4); b.lamp(-3.4,-3.4,1.39);
  b.box(-4.9,1.48,-3.31,.43,.17,.32,'dark'); b.box(-4.9,1.63,-3.31,.55,.12,.13,'dark');
  b.box(-5.4,1.27,-6.18,3.7,1.8,.2,'wood',2);
  for(let row=0;row<3;row++) for(let col=0;col<9;col++) b.box(-7+col*.39,.8+row*.42,-6.04,.06,.2,.08,'brass');
  for(const x of [-10.1,-8.35]) { b.box(x,.5,-1.65,1.3,.56,.9,'blanket');b.box(x,.97,-2.07,1.3,.6,.17,'wood',2); }
  b.box(-10, .4,-4.8,.68,.75,.68,'wood',2);b.box(-10,1.1,-4.8,.82,.8,.65,[.22,.29,.12]);
  // Six monitors, worn chair, filing cabinets.
  b.desk(3.9,-4.6,4.3,1.0);
  for(let row=0;row<2;row++) for(let col=0;col<3;col++) b.crt(2.7+col*1.14,-4.85,1.1+row*.66,.92);
  b.box(3.8,.55,-3.14,.77,.13,.74,'dark');b.box(3.8,.98,-2.8,.77,.8,.14,'dark');b.box(3.8,.25,-3.14,.1,.6,.1,'dark');
  b.lamp(5.6,-4.5,1.1);b.box(6.3,.87,-5.45,.7,1.5,1.1,'tile',4);
  // Service rooms, fixtures, stairwell.
  b.box(-10.6,.85,5.8,2.2,1.55,.42,'wood',2);
  for(let i=0;i<4;i++) b.box(-11+i*.43,.3,4.6,.34,.4,.38,'tile',4);
  for(let i=0;i<4;i++) b.box(-6.45+(i%2)*.94,.47,4.2+Math.floor(i/2)*1.05,.8,.72,.8,'wood',2);
  b.box(.1,.17,4.4,5.9,.15,4.1,'tile',4); b.box(-.8,.55,5.6,.65,.86,.85,'linen');b.box(1.3,.6,5.8,1.3,.91,.58,'linen');
  stairs(b,9.5,4.2);
  // A route on the corridor floor anchors orientation during the flyover.
  for(let x=-10.5;x<10.5;x+=.64) b.box(x,.19,1.4,.24,.025,.035,'brass',6);
  return b;
}

function roomsFloor(level) {
  const b=new MeshBuilder();floorBase(b);
  b.wall(0,-6.5,24.3,.18,1.35);b.wall(0,6.5,24.3,.18,.9);
  b.wall(-12.1,0,.18,13,1.2);b.wall(12.1,0,.18,13,1.2);
  const rw=24/7;
  for(let i=0;i<7;i++) {
    const left=-12+i*rw, x=left+rw/2;
    if(i>0) b.wall(left,-3.75,.16,5.5,1.15);
    b.wall(x-.75,-1,1.65,.18,1.05);b.wall(x+1.1,-1,.78,.18,1.05);b.door(x+.4,-1.03);
    b.bed(x-.36,-4.3);b.box(x+1.02,.67,-2.2,.72,1.0,.75,'wood',2);
    b.box(x,1.4,-6.35,1.5,.62,.045,[.20,.30,.25],5);
  }
  for(let i=0;i<6;i++) {
    const left=-12+i*rw, x=left+rw/2, anomaly=level===1&&i===5;
    if(i>0)b.wall(left,3.75,.16,5.5,1.0);
    b.wall(x-.8,1,1.65,.18,1.05);b.wall(x+1.1,1,.72,.18,1.05);
    b.door(x+.32,1.03,0,anomaly);
    if(anomaly) {
      b.box(x,.15,3.75,rw-.2,.08,5.25,[.38,.075,.035],1);
      b.box(x,1.0,6.34,1.8,1.7,.08,'dark');
      for(let n=0;n<6;n++) b.box(x-1.2+n*.43,.22,4.8,.07,.14,1.5,'red',6);
    } else { b.bed(x-.32,3.9);b.box(x+1,.67,5.4,.7,1,.6,'wood',2); }
  }
  b.wall(8.57,3.75,.16,5.5,1.15);stairs(b,10.25,4.2);
  b.box(0,.15,0,24,.06,1.85,[.4,.20,.095],1);
  for(let x=-10.5;x<11;x+=.64)b.box(x,.2,0,.24,.025,.035,'brass',6);
  return b;
}

export function buildHotel() {
  const ground=lobbyFloor(), second=roomsFloor(1), third=roomsFloor(2);
  const marker=new MeshBuilder();
  marker.box(0,.1,0,.3,.12,.3,'lamp',6,Math.PI/4);
  for(const n of [-1,1]) {marker.box(n*.43,.025,0,.025,.03,.5,'lamp',6);marker.box(0,.025,n*.43,.5,.03,.025,'lamp',6);}
  return {floors:[ground.data(),second.data(),third.data()],marker:marker.data(),boxes:[ground.count,second.count,third.count]};
}

const shots = [
  { p:0, target:[0,7,0], yaw:.62, elevation:.92, span:38.5 },
  { p:.10, target:[0,5,0], yaw:.4, elevation:1.00, span:30 },
  { p:.225, target:[-4.7,.6,-2.0], yaw:.22, elevation:1.05, span:10.7 },
  { p:.425, target:[3.5,.7,-2.65], yaw:-.35, elevation:1.03, span:9.3 },
  { p:.545, target:[2.2,4,0], yaw:-.5, elevation:.95, span:18.5 },
  { p:.685, target:[1.4,6.3,0], yaw:-.12, elevation:1.03, span:13.2 },
  { p:.81, target:[5.1,6.5,1.1], yaw:.18, elevation:1.08, span:10 },
  { p:.955, target:[6.5,6.55,3.1], yaw:.36, elevation:1.13, span:7.4 },
  { p:1, target:[6.5,6.55,3.1], yaw:.42, elevation:1.11, span:7.4 }
];

export function cameraAt(p) {
  p=clamp(p);let i=0;
  while(i<shots.length-2&&p>shots[i+1].p)i++;
  const a=shots[i],b=shots[i+1],t=smooth((p-a.p)/(b.p-a.p));
  const target=V(a.target,b.target,t),yaw=mix(a.yaw,b.yaw,t),elevation=mix(a.elevation,b.elevation,t),distance=48;
  return {target,eye:[target[0]+Math.sin(yaw)*Math.cos(elevation)*distance,target[1]+Math.sin(elevation)*distance,target[2]+Math.cos(yaw)*Math.cos(elevation)*distance],span:mix(a.span,b.span,t)};
}

export function floorState(p) {
  const opening=1-smooth((p-.03)/.15),ascent=smooth((p-.465)/.18);
  return [
    {offset:[0,0,0],opacity:1-ascent*.8},
    {offset:[0,5.8+opening*3.3+(1-opening)*(1-ascent)*35,0],opacity:Math.max(opening,ascent)},
    {offset:[0,11.6+opening*6.6+(1-opening)*42,0],opacity:opening}
  ];
}

export function markerAt(p) {
  const points=[{p:0,v:[-11,.23,-2.0]},{p:.225,v:[-5,.23,-2.0]},{p:.31,v:[-4,.23,1.4]},{p:.425,v:[4,.23,-3]},{p:.51,v:[9.5,.23,1.4]},{p:.61,v:[9.5,6.02,0]},{p:.685,v:[.5,6.02,0]},{p:.84,v:[6.8,6.02,0]},{p:1,v:[6.8,6.02,3.1]}];
  let i=0;while(i<points.length-2&&p>points[i+1].p)i++;
  const a=points[i],b=points[i+1];return V(a.v,b.v,smooth((p-a.p)/(b.p-a.p)));
}

const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const normal=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function multiply(a,b) {
  const c=new Float32Array(16);
  for(let column=0;column<4;column++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[column*4+row]+=a[k*4+row]*b[column*4+k];
  return c;
}
export function cameraMatrix(camera,aspect) {
  const z=normal(subtract(camera.eye,camera.target)),x=normal(cross([0,1,0],z)),y=cross(z,x);
  const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,camera.eye),-dot(y,camera.eye),-dot(z,camera.eye),1]);
  // Portrait screens use the same world width, instead of cutting the floor in half.
  const halfHeight=camera.span/2*Math.max(1,1.25/aspect),halfWidth=halfHeight*aspect,near=.1,far=160;
  const projection=new Float32Array([1/halfWidth,0,0,0,0,1/halfHeight,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);
  return multiply(projection,view);
}
export function project(point,matrix) {
  const p=[...point,1],v=[0,0,0,0];
  for(let row=0;row<4;row++)for(let k=0;k<4;k++)v[row]+=matrix[k*4+row]*p[k];
  return [v[0]/v[3],v[1]/v[3],v[2]/v[3]];
}

export const LABELS = [
  {text:'RECEPCIÓN',point:[-5,1.7,-3.6],floor:0,from:0,to:.48,scene:'reception'},
  {text:'VIGILANCIA',point:[4,2.6,-4.7],floor:0,from:.13,to:.59,scene:'security'},
  {text:'ASCENSOR',point:[9.6,1.9,-2.6],floor:0,from:0,to:.55},
  {text:'201',point:[-10.3,1.3,-4.5],floor:1,from:.57,to:.80,scene:'guestroom'},
  {text:'207',point:[10.3,1.3,-4.5],floor:1,from:.56,to:.87},
  {text:'212',point:[3.4,1.2,4.2],floor:1,from:.57,to:1,scene:'guestroom'},
  {text:'247 / SIN REGISTRO',point:[6.85,.7,3.8],floor:1,from:.68,to:1,red:true,scene:'room247'}
];


export function orbitCamera({yaw=.62,elevation=1.0,zoom=1,floor=-1}={}) {
  elevation=clamp(elevation,.42,1.43);zoom=clamp(zoom,.5,2.2);
  const target=floor<0?[0,7,0]:[0,.7,0],distance=48;
  return {target,eye:[target[0]+Math.sin(yaw)*Math.cos(elevation)*distance,target[1]+Math.sin(elevation)*distance,target[2]+Math.cos(yaw)*Math.cos(elevation)*distance],span:(floor<0?38.5:23.5)*zoom};
}
