import assert from 'node:assert/strict';
import test from 'node:test';
import {buildHotel,cameraAt,cameraMatrix,floorState,markerAt,orbitCamera,project,STOPS} from '../dist/hotel-model.mjs';

const model=buildHotel();

test('all floors contain complete, finite triangles with valid lighting normals',()=>{
  assert.equal(model.floors.length,3);
  for(const floor of model.floors) {
    assert.equal(floor.length%360,0);
    assert.ok(floor.length>3600);
    assert.ok(floor.every(Number.isFinite));
    for(let i=0;i<floor.length;i+=10)assert.ok(Math.abs(Math.hypot(floor[i+3],floor[i+4],floor[i+5])-1)<1e-5);
  }
});

test('camera and floor visibility stay valid across the full scroll range',()=>{
  let previous;
  for(let i=0;i<=1000;i++) {
    const p=i/1000,shot=cameraAt(p),floors=floorState(p);
    assert.ok(shot.span>0&&shot.eye.every(Number.isFinite));
    assert.ok(floors.every(f=>f.opacity>=0&&f.opacity<=1));
    if(previous)assert.ok(Math.hypot(...shot.eye.map((v,k)=>v-previous[k]))<.5,'Camera jumps between keyframes');
    previous=shot.eye;
    for(const aspect of [1,1.5,1.85,2.4]) {
      const center=project(shot.target,cameraMatrix(shot,aspect));
      assert.ok(Math.abs(center[0])<1e-5&&Math.abs(center[1])<1e-5);
      assert.ok(center[2]>=-1&&center[2]<=1);
    }
  }
});

test('every destination remains in frame on narrow and wide canvases',()=>{
  for(const p of STOPS.slice(1))for(const aspect of [1,1.5,2.4]) {
    const point=project(markerAt(p),cameraMatrix(cameraAt(p),aspect));
    assert.ok(Math.abs(point[0])<.95&&Math.abs(point[1])<.95,`Destination ${p} is clipped`);
  }
});

test('all three floors fit in the opening aerial view',()=>{
  const floors=floorState(0);
  for(const aspect of [1,1.5,1.85,2.4]) {
    const matrix=cameraMatrix(cameraAt(0),aspect);
    for(let f=0;f<model.floors.length;f++) {
      const vertices=model.floors[f];
      for(let i=0;i<vertices.length;i+=10) {
        const point=project([vertices[i],vertices[i+1]+floors[f].offset[1],vertices[i+2]],matrix);
        assert.ok(Math.abs(point[0])<.99&&Math.abs(point[1])<.99,`Floor ${f} is clipped at aspect ${aspect}`);
      }
    }
  }
});

test('all triangles face outward so back-face culling cannot open holes in the hotel',()=>{
  for(const mesh of [...model.floors,model.marker])for(let i=0;i<mesh.length;i+=30) {
    const a=[mesh[i+10]-mesh[i],mesh[i+11]-mesh[i+1],mesh[i+12]-mesh[i+2]];
    const b=[mesh[i+20]-mesh[i],mesh[i+21]-mesh[i+1],mesh[i+22]-mesh[i+2]];
    const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const facing=cross[0]*mesh[i+3]+cross[1]*mesh[i+4]+cross[2]*mesh[i+5];
    assert.ok(facing>0,`Triangle ${i/30} is degenerate or faces inward`);
  }
});

test('resetting the free map frames every floor on portrait and landscape screens',()=>{
  for(const floor of [-1,0,1,2])for(const aspect of [.5,1,1.5,2.4]) {
    const matrix=cameraMatrix(orbitCamera({floor}),aspect);
    for(let f=0;f<model.floors.length;f++) {
      if(floor>=0&&floor!==f)continue;
      const mesh=model.floors[f],offset=floor<0?[0,9.1,18.2][f]:0;
      for(let i=0;i<mesh.length;i+=10) {
        const point=project([mesh[i],mesh[i+1]+offset,mesh[i+2]],matrix);
        assert.ok(point.every(Number.isFinite));
        assert.ok(Math.abs(point[0])<.99&&Math.abs(point[1])<.99,`Floor ${f} is clipped in free view at aspect ${aspect}`);
      }
    }
  }
});

test('free-camera extremes never produce a singular projection',()=>{
  for(const floor of [-1,0,1,2])for(const yaw of [-Math.PI,0,Math.PI,10*Math.PI])for(const elevation of [-10,.42,1,1.43,10])for(const zoom of [-10,.5,1,2.2,10]) {
    const camera=orbitCamera({floor,yaw,elevation,zoom}),matrix=cameraMatrix(camera,.5);
    assert.ok(camera.span>0&&matrix.every(Number.isFinite));
    const center=project(camera.target,matrix);
    assert.ok(Math.abs(center[0])<1e-5&&Math.abs(center[1])<1e-5&&Math.abs(center[2])<1);
  }
});
