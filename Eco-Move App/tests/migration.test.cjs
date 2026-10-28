const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {load,tick}=require('./helpers/load-ts.cjs');

test('live sampling limits concurrency, deduplicates latest telemetry and filters radius',async()=>{
  const {boundedMap}=load('runtime/services/boundedRequests.ts');
  let running=0,max=0,calls=0;
  const api=load('protected/src/lib/liveBus.ts',{
    '../../../runtime/services/boundedRequests':{boundedMap},
    '@/data/chalo_routes_index.json':require('../protected/src/data/chalo_routes_index.json'),
  },{AbortSignal,fetch:async()=>{
    const n=++calls;max=Math.max(max,++running);await tick();running--;
    return {ok:true,json:async()=>({buses:[
      {session:{_vehicleId:'A',_toName:'Airport'},parameters:{lat:21.1458,lon:79.0882,time:n,nextStopName:'null'}},
      {session:{_streamId:'B'},parameters:{lat:21.146,lon:79.0883}},
      {session:{_vehicleId:'outside'},parameters:{lat:22,lon:80,time:4}},
      {session:{_vehicleId:'invalid'},parameters:{lat:Infinity,lon:79}},
    ]})};
  }});
  const result=await api.fetchNearbyLiveBuses(21.1458,79.0882,5000);
  assert.equal(calls,9);assert.ok(max<=3);assert.equal(result.length,2);
  assert.equal(result.find(b=>b.id==='A').time,9);
  assert.equal(result.find(b=>b.id==='B').time,0,'Missing time must not become Date.now');
  assert.equal(result.find(b=>b.id==='A').nextStopName,'Towards Airport');
});

test('live sampling tolerates failed provider tiles without fabricating buses',async()=>{
  const {boundedMap}=load('runtime/services/boundedRequests.ts');
  const api=load('protected/src/lib/liveBus.ts',{
    '../../../runtime/services/boundedRequests':{boundedMap},'@/data/chalo_routes_index.json':{},
  },{AbortSignal,fetch:async()=>{throw Error('offline')}});
  assert.equal((await api.fetchNearbyLiveBuses(21.1458,79.0882,2500)).length,0);
});

test('commuter account storage stays isolated and does not overwrite route preferences',async()=>{
  const store=new Map();let updates=0;
  const api=load('protected/src/services/commuterProfileService.ts',{'../supabaseClient':{supabase:{
    auth:{getUser:async()=>({data:{user:{id:'different-account'}}}),updateUser:async()=>{updates++;return {error:null}}},
    from:()=>{throw Error('Unexpected cloud mutation')},
  }}},{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}});
  const p=await api.saveCommuterProfile('demo-user-nagpur-001',{occupation:'Student',frequentHubs:['sitabuldi']});
  assert.equal(p.syncStatus,'local');assert.equal(api.getCommuterProfile('other'),null);
  assert.equal(api.getCommuterProfile('demo-user-nagpur-001').occupation,'Student');
  await api.saveCommuterProfile('old-session',{occupation:'Teacher'});
  assert.equal(updates,0);
  const source=fs.readFileSync('protected/src/services/commuterProfileService.ts','utf8');
  assert.ok(!source.includes('.from("profiles")'));
});

test('profile cache updates demo edits and explicit invalidation resets it',async()=>{
  const api=load('protected/src/services/profileService.ts',{'../supabaseClient':{supabase:{}}});
  await api.upsertUserProfile({id:'demo-user-nagpur-001',fullName:'Edited Name'});
  assert.equal((await api.getUserProfile('demo-user-nagpur-001')).fullName,'Edited Name');
  api.invalidateProfileCache();
  assert.equal((await api.getUserProfile('demo-user-nagpur-001')).fullName,'Demo Commuter (Nagpur)');
});

test('preview steps handle empty and short paths without negative distance or invented roads',()=>{
  const api=load('protected/src/lib/turnByTurn.ts',{'./nagpurPlaces':{NAGPUR_POIS:[]}});
  assert.equal(api.generateTurnByTurnSteps({legs:[]}).length,0);
  const journey={totalDistanceM:100,totalTimeMin:2,co2g:0,legs:[{mode:'walk',from:'Origin',to:'Destination',timeMin:2,path:[{lat:21.1458,lon:79.0882},{lat:21.1459,lon:79.0882}]}]};
  const steps=api.generateTurnByTurnSteps(journey);
  assert.equal(steps.at(-1).type,'arrive');
  for(const step of steps){assert.ok(step.cumDistanceStartM>=0);assert.ok(step.cumDistanceEndM>=step.cumDistanceStartM);assert.ok(!JSON.stringify(step).includes('Wardha Road'));}
});

test('routing proxy accepts only bounded Nagpur coordinate pairs',()=>{
  const {validCoordinates}=require('../scripts/routing-proxy.cjs');
  assert.equal(validCoordinates([[79.08,21.14],[79.1,21.16]]),true);
  for(const value of [null,[],[[79,21]],[[79,21],[200,21]],[[79,21],[79,'21']],[[79,21],[Infinity,21]]])assert.equal(validCoordinates(value),false);
});

test('routing proxy supports server environment without a local env file and reports missing configuration',async()=>{
  const vm=require('node:vm');
  const source=fs.readFileSync('scripts/routing-proxy.cjs','utf8');
  for(const configured of [true,false]){
    let requests=0;
    const box={module:{exports:{}},__dirname:'server',process:{env:configured?{ORS_API_KEY:'server-only-test'}:{}},AbortSignal,
      require:name=>name==='node:fs'?{existsSync:()=>false,readFileSync:()=>{throw Error('No env file expected')}}:require(name),
      fetch:async(_url,options)=>{requests++;assert.equal(options.headers.Authorization,'server-only-test');return {ok:true,json:async()=>({features:[]})}}};
    vm.runInNewContext(source,box);
    const req={url:'/api/routing/walk',method:'POST',socket:{remoteAddress:'test'},async *[Symbol.asyncIterator](){yield JSON.stringify({coordinates:[[79.08,21.14],[79.1,21.16]]})}};
    const res={statusCode:0,setHeader(){},end(body){this.body=JSON.parse(body)}};
    assert.equal(await box.module.exports.routingProxy(req,res),true);
    assert.equal(res.statusCode,configured?200:503);
    assert.equal(requests,configured?1:0);
    assert.ok(!JSON.stringify(res.body).includes('server-only-test'));
  }
});

test('build dictionary preserves every original bus fare entry exactly',()=>{
  const {encode,decode}=require('../scripts/compact-fare-data.cjs');
  const original=JSON.parse(fs.readFileSync('protected/src/data/bus_fares.json','utf8'));
  const packed=encode(original);
  assert.deepEqual(decode(packed),original);
  assert.ok(JSON.stringify(packed).length<JSON.stringify(original).length*.5);
});

test('UI preserves three themes, removes zoom buttons and never auto-restores camera activation',()=>{
  const app=fs.readFileSync('App.tsx','utf8'),context=fs.readFileSync('src/AppContext.tsx','utf8');
  assert.ok(!app.includes('label="Zoom in"'));assert.ok(!app.includes('label="Zoom out"'));
  assert.ok(app.includes('Turn on touchless map control'));assert.ok(!context.includes("getItem('eco_move_touchless_gesture')"));
  assert.ok(fs.readFileSync('src/features/routing/RoutePreviewScreen.tsx','utf8').includes('Reduced motion'));
});

test('Nearby POI markers close with their map scene and reopen without losing selections',()=>{
  const {mapPresentation}=load('src/mapPresentation.ts');
  const props={poiMarkers:[{id:'station'}],activePoiCategory:'Police Station'};
  assert.equal(mapPresentation('home',props).poiMarkers.length,0);
  assert.equal(mapPresentation('plan',props).activePoiCategory,null);
  assert.equal(mapPresentation('nearby',props).poiMarkers,props.poiMarkers);
  assert.equal(props.poiMarkers.length,1);
});
