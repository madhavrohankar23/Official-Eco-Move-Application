// Explicit integration probe: public Nagpur landmarks only; never logs endpoint values.
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const app=path.resolve(__dirname,'..');
async function main(){
  require('./build-service-config.cjs')();
  const output=path.join(app,'artifacts/test-bundles/voice-live.cjs');fs.mkdirSync(path.dirname(output),{recursive:true});
  esbuild.buildSync({entryPoints:[path.join(app,'runtime/voice.ts')],bundle:true,platform:'node',format:'cjs',outfile:output,alias:{'@':path.join(app,'protected/src')},define:{'import.meta.env':'{}'},logLevel:'silent'});
  const {voiceCommand}=require(output),results=[];
  for(const [index,query] of ['Plan a route from Sitabuldi to Airport','How do I travel by metro in Nagpur?'].entries()){
    const started=Date.now();
    try{
      const result=await voiceCommand({id:`integration-${Date.now()}-${index}`,query,location:'Sitabuldi'});
      if(!result.message||result.intent!==(index===0?'PLAN_ROUTE':'GENERAL_ANSWER'))throw Error('Unexpected response contract.');
      results.push({passed:true,query,intent:result.intent,origin:result.origin,destination:result.destination,responseCharacters:result.message.length,durationMs:Date.now()-started});
    }catch(error){results.push({passed:false,query,message:String(error.message).replace(/https?:\/\/\S+/g,'[endpoint]'),durationMs:Date.now()-started})}
  }
  fs.writeFileSync(path.join(app,'artifacts/voice-live-validation.json'),JSON.stringify({testedAt:new Date().toISOString(),results},null,2));
  console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.passed))process.exitCode=1;
}
main().catch(()=>{console.error('Voice workflow validation could not complete.');process.exitCode=1});
