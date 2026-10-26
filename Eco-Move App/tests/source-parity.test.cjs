const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const esbuild=require('esbuild');
const {execFileSync}=require('node:child_process');
const output=path.resolve('artifacts/test-bundles');fs.mkdirSync(output,{recursive:true});
function load(root,name){
  const outfile=path.join(output,name+'.cjs');
  esbuild.buildSync({stdin:{contents:"export * as routing from './lib/routing'; export * as nearby from './lib/nearby'; export * as ticketing from './lib/ticketing'; export * as timetable from './lib/busTimetableService';",resolveDir:path.resolve(root),sourcefile:'parity.ts'},outfile,bundle:true,platform:'node',format:'cjs',alias:{'@':path.resolve(root)},define:{'import.meta.env':'{}'},logLevel:'silent'});
  return require(outfile);
}
test('original files and protected copies retain audited checksums, including the explicit user environment refresh',()=>execFileSync(process.execPath,['scripts/verify-source.cjs'],{stdio:'pipe'}));
test('original and embedded network, routes, nearby results and fare calculations agree',async()=>{
  const original=load('../src','original'),mobile=load('protected/src','mobile');
  assert.deepEqual(mobile.routing.networkStats,original.routing.networkStats);
  assert.equal(mobile.routing.networkStats.busRoutes,837);
  assert.equal(mobile.routing.networkStats.metroLines,2);
  const o=original.routing.metroStations.find(p=>p.name.includes('Sitabuldi'));
  const d=original.routing.metroStations.find(p=>p.name==='Airport Metro Station');
  assert.ok(o&&d);
  for(const preference of Object.keys(original.routing.PREFERENCE_WEIGHTS)){
    // Inputs use the source's real place coordinates and a fixed service-hour departure.
    const a=await original.routing.planJourney(o,d,preference,510);
    const b=await mobile.routing.planJourney(o,d,preference,510);
    assert.deepEqual(b,a,preference+' changed');
    assert.ok(b.journeys.length>0,preference+' did not produce a real transit route');
  }
  for(const radius of [500,1000,2500,5000])assert.deepEqual(mobile.nearby.findNearby(o,radius),original.nearby.findNearby(o,radius));
  const legs=[{mode:'metro',lineOrRoute:'orange',from:o.name,to:d.name}];
  for(const category of ['standard_metro','exclusive_eco'])for(const passengers of [{adult:1,student:0,senior:0},{adult:1,student:1,senior:1}]){
    const input={category,legs,passengers};
    assert.deepEqual(mobile.ticketing.calculateMultiLegFareSummary(input),original.ticketing.calculateMultiLegFareSummary(input));
  }
  assert.deepEqual(mobile.ticketing.getAvailableBusRoutes(),original.ticketing.getAvailableBusRoutes());
  console.log('Verified network:',mobile.routing.networkStats);
});
test('runtime contains no server-only environment values',()=>{
  const html=fs.readFileSync('assets/runtime.html','utf8');
  const serverNames=['SMTP_PASS','SMTP_USER','SMTP_HOST','SMTP_FROM','RESEND_API_KEY'];
  for(const line of fs.readFileSync('.env','utf8').split(/\r?\n/)){
    const i=line.indexOf('=');if(i<0)continue;
    const key=line.slice(0,i).trim(),value=line.slice(i+1).trim().replace(/^['"]|['"]$/g,'');
    if(serverNames.includes(key)&&value.length>8)assert.ok(!html.includes(value),`Server value ${key} was bundled`);
  }
});
