const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {load,evaluate}=require('./routing-harness.cjs');
const fixture=require('./fixtures/reference-routing.json');
fs.mkdirSync('artifacts/test-bundles',{recursive:true});

test('ZIP reference: 15 comparable journeys retain routes, leg geometry, time, waits, fares and CO2',async()=>{
  const originalFetch=global.fetch;global.fetch=async()=>{throw Error('Router unavailable fixture')};
  try{
    const engine=load('protected/src','regression');
    for(const c of fixture.results){
      const actual=await evaluate(engine,c);
      assert.deepEqual(actual.raw,c.expected.raw,c.name+' raw');
      assert.deepEqual(actual.enriched,c.expected.enriched,c.name+' enriched');
      assert.deepEqual(actual.timestamps,c.safe?c.targetTimestamps:c.expected.timestamps,c.name+' timestamps');
      for(const j of actual.enriched){
        assert.ok(Math.abs(j.legs.reduce((s,l)=>s+l.timeMin,0)-j.totalTimeMin)<(c.safe?.501:.0001),c.name+' time sum');
        assert.ok(Math.abs(j.legs.reduce((s,l)=>s+l.distanceM,0)-j.totalDistanceM)<.001,c.name+' distance sum');
        assert.equal(j.legs.reduce((s,l)=>s+(l.fareRs||0),0),j.totalFareRs,c.name+' fare sum');
      }
    }
    const reverse=fixture.reverseFare;
    assert.deepEqual(engine.fares.getBusFare(reverse.bus,reverse.from,reverse.to,1000),reverse.expected);
    assert.equal(engine.fares.getBusFare('nonexistent','missing-a','missing-b',7000).source,'distance_slab_fallback');
    const c=fixture.results[0];
    const fallback=await engine.routing.planFallbackDrivingJourney(c.origin,c.destination,'23:30');
    assert.equal(fallback.departureTimeMin,1410);
    const safe=await engine.safety.planSafeJourney(c.origin,c.destination,1410);
    assert.equal(safe.journeys[0].guardianAnchorsCount,0);
    assert.ok(!/\d+%|verified safe/i.test(safe.journeys[0].safetySummary));
    assert.equal(safe.journeys[0].isFallbackDrive,true);
  }finally{global.fetch=originalFetch;}
});

test('reference colors, casing and interchange dashes differ in Safety Mode',()=>{
  const outfile=path.resolve('artifacts/test-bundles/route-style.cjs');
  esbuild.buildSync({entryPoints:['runtime/features/maps/routeStyle.ts'],outfile,bundle:true,platform:'node',logLevel:'silent'});
  const {routeStyle}=require(outfile);
  const legs=[{mode:'metro',line:'Orange Line'},{mode:'walk',isTransfer:true,distanceM:50},{mode:'bus'}];const j={legs};
  assert.equal(routeStyle(legs[0],0,j,false).color,'#ff6a00');
  assert.equal(routeStyle(legs[0],0,j,true).color,'#d97706');
  assert.equal(routeStyle(legs[1],1,j,true).color,'#6366f1');
  assert.equal(routeStyle(legs[1],1,j,true).dashArray,'4 6');
  assert.equal(routeStyle(legs[2],2,j,true).casingWeight,9.5);
});

test('explanation cache distinguishes fares, boarding times and safety context',()=>{
  const outfile=path.resolve('artifacts/test-bundles/explanation-evidence.cjs');
  esbuild.buildSync({entryPoints:['protected/src/lib/n8nAiService.ts'],outfile,bundle:true,platform:'node',define:{'import.meta.env':'{}'},alias:{'@':path.resolve('protected/src')},logLevel:'silent'});
  const ai=require(outfile);const j={totalTimeMin:20,totalDistanceM:5000,totalFareRs:20,legs:[{mode:'metro',from:'Sitabuldi',to:'Airport',path:[],fareRs:20,departureTimeStr:'08:30'}]};
  const key=x=>ai.getRouteExplainCacheKey(x,'Sitabuldi','Airport');
  assert.notEqual(key(j),key({...j,totalFareRs:25}));
  assert.notEqual(key(j),key({...j,isSafeMode:true}));
  assert.notEqual(key(j),key({...j,legs:[{...j.legs[0],departureTimeStr:'08:45'}]}));
  assert.notEqual(ai.getRouteCompareCacheKey([j],'a','b'),ai.getRouteCompareCacheKey([{...j,totalFareRs:30}],'a','b'));
});
