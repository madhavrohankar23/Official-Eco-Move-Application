// Explicit audit command; no network requests, no invented production data.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {load,evaluate}=require('../tests/routing-harness.cjs');
fs.mkdirSync('artifacts/test-bundles',{recursive:true});
global.fetch=async()=>{throw Error('Deterministic router-unavailable test fixture')};
async function main(){
  const ref=load(process.argv[2]||'artifacts/reference-20261029/Eco-Move/src','reference'),target=load('protected/src','target');
  const place=name=>{const p=ref.routing.metroStations.find(p=>p.name.includes(name));assert.ok(p,name);return {name:p.name,lat:p.lat,lon:p.lon}};
  const cases=[];
  for(const preference of Object.keys(ref.routing.PREFERENCE_WEIGHTS))cases.push({name:'metro-'+preference,origin:place('Sitabuldi'),destination:place('Airport Metro'),preference,departure:510});
  cases.push({name:'metro-transfer',origin:place('Khapri'),destination:place('Lokmanya'),preference:'balanced',departure:540});
  const buses=[...ref.routing.network.lines.values()].filter(l=>l.mode==='bus'&&l.departures?.length&&l.placeIds.length>10&&l.stopOffsets?.length);
  for(const i of [0,20,80]){const bus=buses[i];assert.ok(bus);const origin=bus.points[2],destination=bus.points.at(-3);cases.push({name:'bus-'+bus.busNumber+'-'+i,origin,destination,preference:'cheapest',departure:bus.departures.find(t=>t>=480)+bus.stopOffsets[2]-2});}
  for(const [name,origin,destination,departure] of [
    ['safe-metro',place('Sitabuldi'),place('Airport Metro'),510],
    ['safe-transfer',place('Khapri'),place('Lokmanya'),540],
    ['safe-night',place('Sitabuldi'),place('Airport Metro'),1410],
    ['safe-short-walk',place('Sitabuldi'),{...place('Sitabuldi'),lat:place('Sitabuldi').lat+.0005},1410],
  ])cases.push({name,origin,destination,departure,preference:'balanced',safe:true});
  cases.push({name:'outside-network',origin:{lat:20.81,lon:78.76,name:'Network boundary west'},destination:{lat:21.41,lon:79.39,name:'Network boundary east'},departure:1410,preference:'balanced'});
  const results=[];let differences=0;
  for(const c of cases){
    const a=await evaluate(ref,c),b=await evaluate(target,c);
    assert.deepEqual(b.raw,a.raw,c.name+' raw metrics');assert.deepEqual(b.enriched,a.enriched,c.name+' enriched metrics');
    const timestampsMatch=JSON.stringify(a.timestamps)===JSON.stringify(b.timestamps);
    if(!c.safe)assert.ok(timestampsMatch,c.name+' standard timestamps');
    if(!timestampsMatch)differences++;
    results.push({...c,expected:a,timestampsMatch,targetTimestamps:b.timestamps});
    console.log('PASS',c.name,'routes',a.raw.length,'minutes',a.enriched.map(j=>j.totalTimeMin).join(','),'timestamps',timestampsMatch?'match':'documented safety correction');
  }
  const fareData=JSON.parse(fs.readFileSync('protected/src/data/bus_fares.json'));let reverse;
  for(const [bus,pairs] of Object.entries(fareData)){for(const pair of Object.keys(pairs)){const [a,b]=pair.split(':');if(!pairs[b+':'+a]&&a&&b){reverse={bus,from:b,to:a};break;}}if(reverse)break;}
  assert.ok(reverse);const reverseFare=ref.fares.getBusFare(reverse.bus,reverse.from,reverse.to,1000);assert.equal(reverseFare.source,'exact_reverse');assert.deepEqual(target.fares.getBusFare(reverse.bus,reverse.from,reverse.to,1000),reverseFare);
  const all=results.flatMap(r=>r.expected.raw);
  const coverage={bus:all.some(j=>j.legs.some(l=>l.mode==='bus')),metro:all.some(j=>j.legs.some(l=>l.mode==='metro')),multimodal:all.some(j=>j.legs.some(l=>l.mode==='metro')&&j.legs.some(l=>l.mode==='bus')),transfer:all.some(j=>j.transfers>0),nightDrive:results.find(c=>c.name==='safe-night').expected.raw.some(j=>j.legs.some(l=>l.mode==='drive'))};
  assert.ok(coverage.bus&&coverage.metro&&coverage.transfer&&coverage.nightDrive);
  fs.mkdirSync('tests/fixtures',{recursive:true});
  fs.writeFileSync('tests/fixtures/reference-routing.json',JSON.stringify({referenceSha256:'ed45b056e2d16261fcd8866f403e8241407c9c74161f6688c9eecb1646123445',router:'unavailable (deterministic)',coverage,reverseFare:{...reverse,expected:reverseFare},results},null,2));
  console.log('VERDICT: PASS',results.length,'comparable cases; timestamp corrections',differences,coverage);
}
main().catch(e=>{console.error('VERDICT: FAIL',e);process.exitCode=1});
