const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,deferred,tick}=require('./helpers/load-ts.cjs');
const {readCurrentSource,isSourceShortcut}=load('src/platform/sourceLocation.ts');
const good={permission:async()=>({granted:true}),position:async()=>({coords:{latitude:21.1458,longitude:79.0882}})};
test('source shortcut accepts only the supported exact app URL',()=>{
  assert.equal(isSourceShortcut('ecomove://location/source'),true);
  for(const url of ['https://location/source','ecomove://location/other','ecomove://location/source?lat=0','ecomove://location/source#x','not a url'])assert.equal(isSourceShortcut(url),false);
});
test('current Source retains GPS coordinates while optionally resolving a readable address',async()=>{
  const p=await readCurrentSource({...good,reverse:async()=>[{streetNumber:'10',street:'Main Road',district:'Sitabuldi',city:'Nagpur'}]});
  assert.equal(p.lat,21.1458);assert.equal(p.lon,79.0882);assert.equal(p.name,'10 Main Road, Sitabuldi, Nagpur');
  const fallback=await readCurrentSource({...good,reverse:async()=>{throw Error('Offline')}});assert.match(fallback.name,/21.1458, 79.0882/);
});
test('location denial, invalid GPS, unavailable GPS and late cancellation cannot set Source',async()=>{
  await assert.rejects(readCurrentSource({...good,permission:async()=>({granted:false,status:'denied'})}),/permission is off/);
  await assert.rejects(readCurrentSource({...good,position:async()=>({coords:{latitude:NaN,longitude:79}})}),/invalid location/);
  await assert.rejects(readCurrentSource({...good,position:async()=>{throw Error('GPS unavailable')}}),/GPS unavailable/);
  const p=deferred();let active=true;const work=readCurrentSource({...good,position:()=>p.promise},()=>active);await Promise.resolve();active=false;p.resolve({coords:{latitude:21,longitude:79}});await assert.rejects(work,/cancelled/);
});
test('GPS timeout is actionable and reverse-geocode timeout preserves usable coordinates',async()=>{
  const timers=[];const api=load('src/platform/sourceLocation.ts',{}, {setTimeout:(fn,ms)=>{timers.push({fn,ms});return fn},clearTimeout:()=>{}});
  const gps=api.readCurrentSource({...good,position:()=>new Promise(()=>{})});await tick();timers.find(t=>t.ms===20000).fn();await assert.rejects(gps,/GPS took too long/);
  const reverse=api.readCurrentSource({...good,reverse:()=>new Promise(()=>{})});await tick();timers.find(t=>t.ms===3500).fn();assert.match((await reverse).name,/Your location/);
});
