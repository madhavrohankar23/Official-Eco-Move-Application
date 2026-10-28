const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild'),crypto=require('node:crypto');
function load(root,name){
  const dir=fs.mkdtempSync(path.resolve('artifacts/test-bundles')+path.sep+'safety-');
  const outfile=path.join(dir,name+'.cjs');
  esbuild.buildSync({stdin:{contents:"export * as routing from './lib/routing'; export * as safety from './lib/safeRoutingService'; export * as fares from './lib/fares'; export * as ors from './lib/ors';",resolveDir:path.resolve(root)},outfile,bundle:true,platform:'node',format:'cjs',alias:{'@':path.resolve(root)},define:{'import.meta.env':'{}'},logLevel:'silent'});
  return require(outfile);
}
function project(j){
  return {totalDistanceM:j.totalDistanceM,totalTimeMin:j.totalTimeMin,totalFareRs:j.totalFareRs,walkDistanceM:j.walkDistanceM,transitDistanceM:j.transitDistanceM,transfers:j.transfers,co2g:j.co2g,
    legs:j.legs.map(l=>({mode:l.mode,line:l.line,busNumber:l.busNumber,from:l.from,to:l.to,distanceM:l.distanceM,timeMin:l.timeMin,waitMin:l.waitMin,fareRs:l.fareRs,co2g:l.co2g,stops:l.stops,
      pathHash:crypto.createHash('sha256').update(JSON.stringify(l.path)).digest('hex')}))};
}
const clean=x=>JSON.parse(JSON.stringify(x));
async function evaluate(engine,c){
  const r=c.safe?await engine.safety.planSafeJourney(c.origin,c.destination,c.departure):await engine.routing.planJourney(c.origin,c.destination,c.preference,c.departure);
  const raw=clean(r.journeys.map(project));
  const detailed=await Promise.all(r.journeys.map(j=>c.safe?engine.safety.enrichSafeWalkLegs(j,c.origin,c.destination):engine.routing.enrichWalkLegs(j,c.origin,c.destination,c.preference)));
  const timestamps=clean(detailed.map(j=>({departure:j.departureTimeStr,arrival:j.arrivalTimeStr,
    legs:j.legs.map(l=>({departure:l.departureTimeStr,arrival:l.arrivalTimeStr,scheduled:l.scheduledDepartureMin}))})));
  return {raw,enriched:clean(detailed.map(project)),timestamps};
}
module.exports={load,project,evaluate,clean};
