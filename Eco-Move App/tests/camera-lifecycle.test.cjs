const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const esbuild=require('esbuild');
function load(file,extra={}){
  const box={module:{exports:{}},exports:{},require,console,setTimeout,clearTimeout,...extra};
  vm.runInNewContext(esbuild.buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',packages:'external'}).outputFiles[0].text,box);
  return box.module.exports;
}
const {GestureZoomAccumulator,parseCameraEvent}=load('src/features/gestures/gestureBridge.ts');
function harness(getMedia){
  const raf=new Map(),listeners=new Map(),statuses=[],zooms=[];let id=0,now=0,stops=0,plays=0,removed=0;
  const track={stop(){stops++},onended:null};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
  const video={currentTime:0,readyState:2,videoWidth:640,setAttribute(){},play:async()=>{plays++},pause(){},remove(){removed++}};
  const document={visibilityState:'visible',body:{appendChild(){}},createElement:()=>video,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
  const globals={window:{isSecureContext:true,location:{hostname:'localhost'},matchMedia:()=>({matches:false})},navigator:{mediaDevices:{getUserMedia:getMedia|| (async()=>stream)},userAgent:'Test',maxTouchPoints:0},document,
    requestAnimationFrame:f=>{raf.set(++id,f);return id},cancelAnimationFrame:i=>raf.delete(i)};
  const {TouchlessGestureController}=load('src/features/gestures/useHandGesture.ts',globals);
  const ctrl=new TouchlessGestureController({onStatusChange:s=>statuses.push(s),onZoomDelta:d=>zooms.push(d)});
  let detection=null;
  ctrl.detector.initialize=async()=>{};ctrl.detector.isReady=()=>true;ctrl.detector.detect=()=>detection;ctrl.detector.dispose=()=>{};
  function frame(distance){detection=distance===null?null:{thumbTip:{x:.2,y:.5},indexTip:{x:.2+distance,y:.5},confidence:.99};now+=70;video.currentTime+=.07;const callbacks=[...raf.values()];raf.clear();callbacks.forEach(f=>f(now))}
  return {ctrl,stream,video,document,listeners,raf,statuses,zooms,frame,get stops(){return stops},get plays(){return plays},get removed(){return removed}};
}
test('stop while permission is pending stops the late stream without opening video or model',async()=>{
  let resolve;const h=harness(()=>new Promise(r=>resolve=r));
  const pending=h.ctrl.start();h.ctrl.stop();resolve(h.stream);await pending;
  assert.equal(h.stops,1);assert.equal(h.plays,0);assert.equal(h.ctrl.state.status,'idle');assert.equal(h.raf.size,0);assert.equal(h.listeners.size,0);
});
test('disposing during model startup cannot restart tracking or retain camera tracks',async()=>{
  const h=harness();let resolve,entered;
  const started=new Promise(r=>entered=r);h.ctrl.detector.initialize=()=>{entered();return new Promise(r=>resolve=r)};
  const pending=h.ctrl.start();await started;h.ctrl.dispose();resolve();await pending;
  assert.equal(h.stops,1);assert.equal(h.removed,1);assert.equal(h.raf.size,0);assert.equal(h.ctrl.state.isActive,false);
});
test('permission denial retains its actionable status, and retry can start cleanly',async()=>{
  let first=true;const h=harness(async()=>{if(first){first=false;throw Object.assign(Error('blocked'),{name:'NotAllowedError'})}return h.stream});
  await h.ctrl.start();assert.equal(h.ctrl.state.status,'permission_denied');assert.match(h.ctrl.state.errorMessage,/permission denied/i);
  await h.ctrl.start();assert.equal(h.ctrl.state.status,'no_hand');h.ctrl.stop();assert.equal(h.listeners.size,0);assert.equal(h.stops,1);
});
test('real controller calibration, spread, neutral, pinch, loss and reacquisition are stable',async()=>{
  const h=harness();await h.ctrl.start();for(let n=0;n<12;n++)h.frame(.12);
  assert.equal(h.ctrl.state.status,'tracking_active');
  for(let n=0;n<20;n++)h.frame(.12+n*.012);
  assert.ok(h.zooms.some(d=>d>0));
  for(let n=0;n<35;n++)h.frame(.348);const settled=h.zooms.length;
  for(let n=0;n<20;n++)h.frame(.348);assert.equal(h.zooms.length,settled,'stationary hand cannot cause runaway zoom');
  for(let n=0;n<30;n++)h.frame(.12);
  for(let n=0;n<20;n++)h.frame(.03);assert.ok(h.zooms.some(d=>d<0));
  for(let n=0;n<4;n++)h.frame(null);assert.equal(h.ctrl.state.status,'no_hand');assert.equal(h.ctrl.state.baselineDistance,null);
  const count=h.zooms.length;for(let n=0;n<12;n++)h.frame(.25);assert.equal(h.zooms.length,count,'new hand must calibrate before zoom');
  h.ctrl.stop();assert.equal(h.raf.size,0);
});
test('backgrounding releases the camera and duplicate starts do not add frame loops',async()=>{
  const h=harness();await Promise.all([h.ctrl.start(),h.ctrl.start()]);assert.equal(h.plays,1);assert.equal(h.raf.size,1);
  h.document.visibilityState='hidden';h.listeners.get('visibilitychange')();
  assert.equal(h.stops,1);assert.equal(h.raf.size,0);assert.equal(h.ctrl.state.status,'interrupted');assert.equal(h.listeners.size,0);
});
test('validated sub-step gestures produce integer zoom commands and reject malformed bridge input',()=>{
  const zoom=new GestureZoomAccumulator();let mapZoom=13;
  for(const d of [.12,.12,.12])mapZoom=Math.round(mapZoom+zoom.push(d));
  assert.equal(mapZoom,14);
  for(const d of [-.16,-.16])mapZoom=Math.round(mapZoom+zoom.push(d));assert.equal(mapZoom,13);
  zoom.push(.2);zoom.reset();assert.equal(zoom.push(.12),0);
  for(const delta of [NaN,Infinity,4,'1'])assert.equal(parseCameraEvent({type:'zoom',delta}),null);
  assert.equal(parseCameraEvent({type:'status',status:'__proto__',message:'bad',pinchState:'none'}),null);
  assert.equal(parseCameraEvent({type:'zoom',delta:.2}).delta,.2);
});
test('real detector falls back from GPU to CPU and closes a model resolved after disposal',async()=>{
  const calls=[];let closeCount=0;
  const vision={FilesetResolver:{forVisionTasks:async path=>({path})},HandLandmarker:{createFromOptions:async(files,opts)=>{calls.push(opts.baseOptions.delegate);if(opts.baseOptions.delegate==='GPU')throw Error('GPU unavailable');return {close(){closeCount++}}}}};
  const result=await esbuild.build({entryPoints:['src/features/gestures/handDetection.ts'],bundle:true,write:false,format:'cjs',plugins:[{name:'vision-test-double',setup(b){b.onResolve({filter:/^@mediapipe\/tasks-vision$/},()=>({path:'vision',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const FilesetResolver=globalThis.vision.FilesetResolver;export const HandLandmarker=globalThis.vision.HandLandmarker;'}))}}]});
  const box={module:{exports:{}},exports:{},window:{ReactNativeWebView:{}},vision};vm.runInNewContext(result.outputFiles[0].text,box);
  const detector=new box.module.exports.HandDetector();await detector.initialize();assert.deepEqual(calls,['GPU','CPU']);assert.equal(detector.isReady(),true);detector.dispose();assert.equal(closeCount,1);
  let resolve,entered;const started=new Promise(r=>entered=r);vision.HandLandmarker.createFromOptions=()=>{entered();return new Promise(r=>resolve=r)};
  const cancelled=new box.module.exports.HandDetector();const pending=cancelled.initialize();await started;cancelled.dispose();resolve({close(){closeCount++}});await pending;assert.equal(closeCount,2);assert.equal(cancelled.isReady(),false);
});
