const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,deferred}=require('./helpers/load-ts.cjs');
const {applyVoiceIntent}=load('src/applyVoiceIntent.ts',{'./voiceInput':load('src/voiceInput.ts')});
const origin={name:'Sitabuldi',lat:21.14,lon:79.08},destination={name:'Airport',lat:21.09,lon:79.04};

test('an existing manual destination is kept unless replacement is explicitly confirmed',async()=>{
  for(const approve of [false,true]){
    const a=app();a.destination={name:'Old trip',lat:21.2,lon:79.2};let prompted=false;
    a.confirmVoiceReplacement=async(from,to)=>{prompted=true;assert.equal(from,origin);assert.equal(to,destination);return approve};
    await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',origin:'Your location',destination:'Airport'},a);
    assert.equal(prompted,true);assert.equal(a.calls.some(c=>c[0]==='setDestination'),approve);
  }
});

test('ambiguity uses the chosen dataset candidate and cancellation preserves manual endpoints',async()=>{
  const other={...destination,name:'Airport South',lon:79.05};
  for(const choose of [true,false]){
    const a=app();a.rpc=async()=>[destination,other];a.chooseVoicePlace=async()=>choose?other:null;
    await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'air'},a);
    assert.equal(a.calls.some(c=>c[0]==='setDestination'),choose);
    if(choose)assert.equal(a.calls.find(c=>c[0]==='setDestination')[1],other);
  }
});

test('a cancelled replacement prompt cannot apply its late approval',async()=>{
  const a=app(),pending=deferred();a.destination={...destination,lon:79.2};let active=true;
  a.confirmVoiceReplacement=()=>pending.promise;
  const work=applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'Airport'},a,()=>active);
  await Promise.resolve();await Promise.resolve();active=false;pending.resolve(true);await work;
  assert.equal(a.calls.some(c=>c[0]==='setDestination'||c[0]==='plan'),false);
});
function app(){const calls=[];return {calls,origin,preference:'balanced',departure:'now',rpc:async(_,{query})=>query==='Airport'?[destination]:[],...Object.fromEntries(['setOrigin','setDestination','setAnchor','setRadius','setBusQuery','setTimetableQuery','setNotice','navigate','open','plan'].map(k=>[k,(...args)=>{calls.push([k,...args]);return Promise.resolve()}]))}}
test('voice route uses existing source and plan function without manufacturing places or changing algorithms',async()=>{
  const a=app();await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',origin:'Your location',destination:'Airport'},a);assert.equal(a.calls.find(c=>c[0]==='plan')[1],origin);assert.equal(a.calls.find(c=>c[0]==='plan')[2],destination);
  const b=app();await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'Unknown'},b);assert.equal(b.calls.some(c=>c[0]==='plan'),false);assert.ok(b.calls.some(c=>c[0]==='navigate'&&c[1]==='plan'));
});
test('voice nearby, live tracking and timetable open their real existing destinations',async()=>{
  const a=app();await applyVoiceIntent({intent:'FIND_NEARBY',message:'Nearby',nearbyRadiusM:1000},a);assert.ok(a.calls.some(c=>c[0]==='setAnchor'&&c[1]===origin));assert.ok(a.calls.some(c=>c[0]==='navigate'&&c[1]==='nearby'));
  await applyVoiceIntent({intent:'TRACK_BUS',message:'Track',busNumber:'35'},a);assert.ok(a.calls.some(c=>c[0]==='setBusQuery'&&c[1]==='35'));assert.ok(a.calls.some(c=>c[0]==='open'&&c[1]==='live'));
  await applyVoiceIntent({intent:'VIEW_TIMETABLE',message:'Times',busNumber:'35'},a);assert.ok(a.calls.some(c=>c[0]==='open'&&c[1]==='timetable'));
});
test('cancelled location resolution cannot navigate or alter a route',async()=>{
  const a=app(),p=deferred();let active=true;a.rpc=()=>p.promise;const work=applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'Airport'},a,()=>active);active=false;p.resolve([destination]);await work;assert.equal(a.calls.length,0);
});
test('an unrecognized explicit source never reuses a previous source or changes either endpoint',async()=>{
  const a=app();await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',origin:'Unknown source',destination:'Airport'},a);
  assert.equal(a.calls.some(c=>['plan','setOrigin','setDestination'].includes(c[0])),false);
  assert.match(a.calls.find(c=>c[0]==='setNotice')[1],/could not identify Source/);
});
test('ambiguous online destination requires selection; late online results cannot change the route',async()=>{
  const a=app();a.rpc=async(method)=>method==='searchOnline'?[origin,destination]:[];
  await applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'Unnamed'},a);
  assert.equal(a.calls.some(c=>c[0]==='plan'),false);
  const p=deferred();let active=true;const b=app();b.rpc=async(method)=>method==='searchOnline'?p.promise:[];
  const task=applyVoiceIntent({intent:'PLAN_ROUTE',message:'Go',destination:'Unnamed'},b,()=>active);
  await Promise.resolve();active=false;p.resolve([destination]);await task;assert.equal(b.calls.length,0);
});

test('spoken natural pair populates both endpoints and lets user review and confirm before finding routes', async () => {
  const station = { name: 'Nagpur Railway Station', lat: 21.15, lon: 79.08 };
  const a = app();
  a.rpc = async (_, { query }) => {
    if (query === 'Sitabuldi') return [origin];
    if (query === 'Nagpur Railway Station') return [station];
    return [];
  };
  await applyVoiceIntent({
    intent: 'PLAN_ROUTE',
    message: 'Route from Sitabuldi to Nagpur Railway Station',
    origin: 'Sitabuldi',
    destination: 'Nagpur Railway Station',
  }, a);

  assert.equal(a.calls.find(c => c[0] === 'setOrigin')[1], origin);
  assert.equal(a.calls.find(c => c[0] === 'setDestination')[1], station);
  assert.ok(a.calls.some(c => c[0] === 'navigate' && c[1] === 'plan'));
  assert.equal(a.calls.some(c => c[0] === 'plan'), false);
  const notice = a.calls.find(c => c[0] === 'setNotice')[1];
  assert.match(notice, /Review and confirm/);
});

test('ambiguous destination asks for clarification rather than guessing', async () => {
  const a = app();
  a.rpc = async (method) => method === 'searchOnline' ? [origin, destination] : [];
  await applyVoiceIntent({ intent: 'PLAN_ROUTE', message: 'Go', origin: 'Sitabuldi', destination: 'Ambiguous Place' }, a);
  assert.equal(a.calls.some(c => c[0] === 'plan'), false);
  const notice = a.calls.find(c => c[0] === 'setNotice')[1];
  assert.match(notice, /could not identify destination/i);
});
