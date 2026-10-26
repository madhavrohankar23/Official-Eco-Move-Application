// Live text-contract probe with public Nagpur landmarks; no audio, GPS or account data.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const app=path.resolve(__dirname,'..');
async function main(){
  require('./build-service-config.cjs')();
  const output=path.join(app,'artifacts/test-bundles/multilingual-live.cjs');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  esbuild.buildSync({stdin:{contents:"export {voiceCommand} from './runtime/voice'; export {searchVoicePlaces} from './runtime/voicePlaces'; export {applyVoiceIntent} from './src/applyVoiceIntent';",resolveDir:app,loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:output,alias:{'@':path.join(app,'protected/src')},define:{'import.meta.env':'{}'},logLevel:'silent'});
  const {voiceCommand,searchVoicePlaces,applyVoiceIntent}=require(output),results=[];
  const cases=[
    ['English','Plan a route from Sitabuldi to Airport'],
    ['Hindi','मुझे सीताबर्डी से एयरपोर्ट जाना है'],
    ['Marathi','मला सीताबर्डीपासून विमानतळापर्यंत जायचे आहे'],
    ['Mixed Hindi','Sitabuldi se Airport जाना है'],
    ['Mixed Marathi','मला Dharampeth पासून Nagpur Railway Station पर्यंत जायचे आहे'],
  ];
  for(const [language,query] of cases){
    const started=Date.now();
    try{
      const result=await voiceCommand({id:`language-${Date.now()}-${results.length}`,query,location:'Your location'});
      let from,to,planned=false;
      await applyVoiceIntent(result,{origin:null,preference:'balanced',departure:'now',rpc:async(method,{query})=>method==='voicePlaces'?searchVoicePlaces(query):[],setOrigin:p=>from=p,setDestination:p=>to=p,navigate(){},setNotice(){},plan:async(o,d)=>{planned=from===o&&to===d}});
      const expected=language==='Mixed Marathi'?['Dharampeth','Nagpur Railway Station (Main Junction)']:['Sitabuldi (Interchange)','Airport Metro Station'];
      results.push({language,query,intent:result.intent,origin:result.origin,destination:result.destination,sourceResolved:from?.name||null,destinationResolved:to?.name||null,existingPlanInvoked:planned,passed:result.intent==='PLAN_ROUTE'&&planned&&from?.name===expected[0]&&to?.name===expected[1],durationMs:Date.now()-started});
    }catch(error){results.push({language,query,passed:false,message:String(error.message).replace(/https?:\/\/\S+/g,'[endpoint]'),durationMs:Date.now()-started})}
  }
  const report={testedAt:new Date().toISOString(),kind:'live transcript contract; not microphone recognition',results};
  fs.writeFileSync(path.join(app,'artifacts/multilingual-live-validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
}
main().catch(()=>{console.error('Multilingual workflow validation could not complete.');process.exitCode=1});
