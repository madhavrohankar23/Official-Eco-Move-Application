const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,tick,deferred}=require('./helpers/load-ts.cjs');
const {ShakeRecognizer}=load('src/platform/shakeRecognizer.ts');
const sample=(x)=>({x,y:0,z:1});
test('shake requires three strong alternating impulses, ignores single knocks, ordinary movement and invalid data',()=>{
  const r=new ShakeRecognizer();
  for(const [n,x] of [0,.4,1,1.5,NaN,Infinity].entries())assert.equal(r.push(sample(x),n*120),false);
  assert.equal(r.push(sample(3),1000),false);
  assert.equal(r.push(sample(3),1120),false);
  assert.equal(r.push(sample(-3),1240),false);
  assert.equal(r.push(sample(3),1360),true);
});
test('shake debounces adjacent samples, expires partial gestures and enforces cooldown across reset',()=>{
  const r=new ShakeRecognizer();r.push(sample(3),0);
  assert.equal(r.push(sample(-3),20),false);assert.equal(r.push(sample(3),40),false);
  assert.equal(r.push(sample(-3),950),false);assert.equal(r.push(sample(3),1070),false);
  assert.equal(r.push(sample(-3),1190),true);r.reset();
  for(let t=1300;t<4000;t+=120)assert.equal(r.push(sample(t%240?3:-3),t),false);
  r.push(sample(3),4200);r.push(sample(-3),4320);assert.equal(r.push(sample(3),4440),true);
});
function harness({permission=Promise.resolve({granted:true}),available=true,enabled=true}={}){
  const effects=[],states=[];let listener,changes,removed=0,appRemoved=0,count=0,time=1000;
  const appState={currentState:'active',addEventListener:(_,cb)=>{changes=cb;return {remove(){appRemoved++}}}};
  const sensor={getPermissionsAsync:()=>permission,requestPermissionsAsync:()=>permission,isAvailableAsync:async()=>available,setUpdateInterval:()=>{},addListener:cb=>{listener=cb;return {remove(){removed++;listener=null}}}};
  const hook=load('src/platform/shake.ts',{react:{useRef:x=>({current:x}),useState:()=>['off',x=>states.push(x)],useEffect:fn=>effects.push(fn)},'react-native':{AppState:appState,Platform:{OS:'android'}},'expo-sensors':{DeviceMotion:sensor},'expo-haptics':{selectionAsync:async()=>{}},'./shakeRecognizer':{ShakeRecognizer}},{Date:{now:()=>time}});
  hook.useShakeDetector({onShake:()=>count++,enabled});const cleanup=effects[0]();
  return {states,cleanup,emit:x=>{time+=120;listener?.({accelerationIncludingGravity:{x:x*9.80665,y:0,z:9.80665}})},change:state=>{appState.currentState=state;changes?.(state)},get listener(){return listener},get count(){return count},get removed(){return removed},get appRemoved(){return appRemoved}};
}
test('DeviceMotion uses actual acceleration units and cleans sensor and AppState listeners',async()=>{
  const h=harness();await tick();assert.ok(h.listener);
  h.emit(0);h.emit(3);h.emit(-3);h.emit(3);await tick();assert.equal(h.count,1);
  h.change('background');assert.equal(h.removed,1);assert.equal(h.listener,null);
  h.change('active');await tick();assert.ok(h.listener);h.cleanup();assert.equal(h.removed,2);assert.equal(h.appRemoved,1);
});
test('motion permissions are never prompted by the effect and denial/unavailable have fallbacks',async()=>{
  const denied=harness({permission:Promise.resolve({granted:false})});await tick();assert.equal(denied.listener,undefined);assert.equal(denied.states.at(-1),'permission');denied.cleanup();
  const missing=harness({available:false});await tick();assert.equal(missing.states.at(-1),'unavailable');missing.cleanup();
  const disabled=harness({enabled:false});assert.deepEqual(disabled.states,['off']);
});
test('late motion permission cannot subscribe after cleanup or create duplicate listeners on resume',async()=>{
  const p=deferred(),h=harness({permission:p.promise});h.change('active');h.cleanup();p.resolve({granted:true});await tick();assert.ok(!h.listener);assert.equal(h.removed,0);
});

test('Safari explicit session grant survives Expo undetermined queries but still checks sensor availability',async()=>{
  const effects=[],states=[];let requests=0,queries=0,availability=0,subscribed=0;
  const hook=load('src/platform/shake.ts',{
    react:{useRef:x=>({current:x}),useState:()=>['off',x=>states.push(x)],useEffect:fn=>effects.push(fn)},
    'react-native':{Platform:{OS:'web'},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
    'expo-sensors':{DeviceMotion:{requestPermissionsAsync:async()=>{requests++;return {granted:true}},getPermissionsAsync:async()=>{queries++;return {granted:false}},isAvailableAsync:async()=>{availability++;return true},setUpdateInterval(){},addListener(){subscribed++;return {remove(){}}}}},
    'expo-haptics':{selectionAsync:async()=>{}},'./shakeRecognizer':{ShakeRecognizer},
  });
  await hook.requestShakePermission();hook.useShakeDetector({onShake(){}});const cleanup=effects[0]();await tick();
  assert.equal(requests,1);assert.equal(queries,0);assert.equal(availability,1);assert.equal(subscribed,1);assert.equal(states.at(-1),'ready');cleanup();
});
