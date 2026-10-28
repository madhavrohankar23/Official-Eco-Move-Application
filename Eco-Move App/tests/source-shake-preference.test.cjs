const {test}=require('node:test');
const assert=require('node:assert/strict');
const {load,tick,deferred}=require('./helpers/load-ts.cjs');
const {preferenceWriter}=load('src/preferenceWriter.ts');

function harness(permission=async()=>({granted:true}),saved=Promise.resolve(null)) {
  const effects=[],refs=[],errors=[],writes=[];let value,first=true,index=0,ready=0;
  const api=load('src/features/gestures/useSourceShake.ts',{
    react:{useState:initial=>{if(first)value=initial;return [value,next=>{value=next}]},useRef:initial=>{const i=index++;if(first)refs[i]={current:initial};return refs[i]},useEffect:fn=>{if(first)effects.push(fn)}},
    '@react-native-async-storage/async-storage':{getItem:()=>saved,setItem:async(key,v)=>writes.push([key,v])},
    '../../platform/shake':{requestShakePermission:permission},'../../preferenceWriter':{preferenceWriter},
  });
  const render=()=>{index=0;const result=api.useSourceShakePreference(m=>errors.push(m),()=>ready++);first=false;return result};
  render();const cleanup=effects.map(fn=>fn());
  return {render,errors,writes,cleanup:()=>cleanup.forEach(fn=>fn()),get ready(){return ready},destination:api.shakeDestination};
}

test('Source shake is opt-in, persists separately, and cannot also dispatch Voice',async()=>{
  const h=harness();await tick();assert.equal(h.render().sourceShakeEnabled,false);
  await h.render().setSourceShakeEnabled(true);assert.equal(h.render().sourceShakeEnabled,true);assert.equal(h.ready,1);
  assert.equal(h.destination(true,true),'source');assert.equal(h.destination(false,true),'voice');assert.equal(h.destination(false,false),null);
  h.cleanup();await tick();assert.deepEqual(h.writes,[['eco_move_shake_source','true']]);
});
test('denied and unavailable motion retain the manual fallback without enabling Source shake',async()=>{
  for(const permission of [async()=>({granted:false}),async()=>{throw Error('unsupported')}]){
    const h=harness(permission);await tick();await h.render().setSourceShakeEnabled(true);
    assert.equal(h.render().sourceShakeEnabled,false);assert.match(h.errors[0],/Use.*current location as Source/);assert.equal(h.ready,0);h.cleanup();
  }
});
test('late permission and hydration cannot re-enable an explicitly disabled or unmounted gesture',async()=>{
  const p=deferred(),storage=deferred(),h=harness(()=>p.promise,storage.promise);
  const enabling=h.render().setSourceShakeEnabled(true);await h.render().setSourceShakeEnabled(false);
  storage.resolve('true');p.resolve({granted:true});await enabling;await tick();
  assert.equal(h.render().sourceShakeEnabled,false);assert.equal(h.ready,0);h.cleanup();
  const p2=deferred(),h2=harness(()=>p2.promise);await tick();const pending=h2.render().setSourceShakeEnabled(true);h2.cleanup();p2.resolve({granted:true});await pending;assert.equal(h2.ready,0);
});
