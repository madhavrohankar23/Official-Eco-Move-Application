const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const outfile=path.resolve('artifacts/test-bundles/voice-stations.cjs');fs.mkdirSync(path.dirname(outfile),{recursive:true});
esbuild.buildSync({stdin:{contents:"export {searchVoicePlaces} from './runtime/voicePlaces'; export {STATION_SPEECH_SPELLINGS,normalizeSpokenPlace,selectVoicePlace,voiceStationKey} from './src/voiceInput'; export {buildSpeechContext} from './src/speechAccuracy'; export {metroStations} from './protected/src/lib/routing'; export {NAGPUR_METRO_LINES,getAvailableBusRoutes} from './protected/src/lib/ticketing';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile,alias:{'@':path.resolve('protected/src')},define:{'import.meta.env':'{}'},logLevel:'silent'});
const x=require(outfile);
test('all 37 original station labels and their Hindi/Marathi spelling variants resolve using existing locations',()=>{
  const rows=[];
  for(const [canonical,...spellings] of x.STATION_SPEECH_SPELLINGS){
    const original=x.selectVoicePlace(canonical,x.searchVoicePlaces(canonical));assert.ok(original,canonical);
    assert.equal(x.voiceStationKey(original.name),x.voiceStationKey(canonical),canonical+' resolved to a different landmark');
    for(const spoken of spellings){const query=x.normalizeSpokenPlace(spoken),result=x.selectVoicePlace(query,x.searchVoicePlaces(query));assert.ok(result,spoken);assert.equal(result.lat,original.lat);assert.equal(result.lon,original.lon);}
    rows.push({canonical,resolved:original.name,spellings:spellings.length});
  }
  assert.equal(rows.length,37);
  fs.writeFileSync('artifacts/speech-station-validation.json',JSON.stringify({testedAt:new Date().toISOString(),kind:'spelling/resolution checks, not microphone accuracy',rows},null,2));
});
test('speech vocabulary covers every metro station in all three languages without exceeding 100 hints',()=>{
  const data={places:[],metroLines:x.NAGPUR_METRO_LINES,busRoutes:x.getAvailableBusRoutes()};
  const coverage=[];
  for(const language of ['en-IN','hi-IN','mr-IN']){
    const context=x.buildSpeechContext(data,[],language);assert.ok(context.hints.length<=100);
    for(const station of data.metroLines.flatMap(line=>line.stations)){assert.ok(context.known.has(x.voiceStationKey(station)),station);assert.ok(context.hints.some(p=>p.name===station),station);}
    coverage.push({language,hints:context.hints.length,knownStationNames:context.known.size,metroStations:new Set(data.metroLines.flatMap(line=>line.stations)).size});
  }
  fs.writeFileSync('artifacts/speech-station-context.json',JSON.stringify({testedAt:new Date().toISOString(),coverage},null,2));
});
