const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,tick}=require('./helpers/load-ts.cjs');
function service(fetch,extra={}){
  const {createVoiceService}=load('src/platform/voiceTransport.ts',{'../voiceInput':load('src/voiceInput.ts')}, {fetch,...extra});
  return createVoiceService({endpoint:'https://workflow.example.test/voice',parseLocalHeuristicQuery:()=>({intent:'PLAN_ROUTE',origin:'Sitabuldi',destination:'Airport',message:'Route'}),extractDatasetInfoForQuery:()=>({source:'existing transport data'}),extractCleanAiText:data=>data.replyMessage||data.explanation||''});
}
const input={id:'voice-test-1',query:'Plan from Sitabuldi to Airport',location:'Sitabuldi'};
const ok=value=>({ok:true,json:async()=>value});
test('workflow uses verified POST format, provided endpoint, existing data and normalizes structured result',async()=>{
  let sent;const s=service(async(url,options)=>{sent={url,options};return ok({status:'success',intent:'PLAN_ROUTE',replyMessage:'Planning your journey',destination:'Airport',preference:'fastest',departureTime:'14:30',nearbyRadiusM:100000})});
  const r=await s.voiceCommand(input);const body=JSON.parse(sent.options.body);
  assert.equal(sent.url,'https://workflow.example.test/voice');assert.equal(sent.options.method,'POST');assert.equal(body.action,'PARSE_NATURAL_LANGUAGE_COMMAND');assert.equal(body.query,input.query);assert.equal(body.userLocation,'Sitabuldi');assert.equal(body.fallbackIntent,'PLAN_ROUTE');assert.equal(body.verifiedDatasetInfo.source,'existing transport data');
  assert.equal(r.origin,'Sitabuldi');assert.equal(r.destination,'Airport');assert.equal(r.preference,'fastest');assert.equal(r.nearbyRadiusM,10000);
});
test('workflow reports HTTP, invalid JSON, unsupported action, empty answer and invalid input errors',async()=>{
  await assert.rejects(service(async()=>({ok:false,status:503})).voiceCommand(input),/HTTP 503/);
  await assert.rejects(service(async()=>({ok:true,json:async()=>{throw new SyntaxError('invalid')}})).voiceCommand(input),/invalid JSON/);
  await assert.rejects(service(async()=>ok({intent:'DELETE_DATA',replyMessage:'No'})).voiceCommand(input),/unsupported action/);
  await assert.rejects(service(async()=>ok({intent:'GENERAL_ANSWER'})).voiceCommand(input),/no readable answer/);
  await assert.rejects(service(async()=>ok({status:'error'})).voiceCommand(input),/could not complete/);
  await assert.rejects(service(async()=>ok({})).voiceCommand({...input,query:''}),/transit question/);
});
test('workflow cancellation aborts fetch; timeout is distinct and cleans timers',async()=>{
  let timer,cleared=0;const s=service((url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted')))),{setTimeout:fn=>{timer=fn;return fn},clearTimeout:()=>cleared++});
  const a=s.voiceCommand(input);s.cancelVoice(input.id);await assert.rejects(a,/cancelled/);assert.equal(cleared,1);
  const b=s.voiceCommand(input);timer();await assert.rejects(b,/took too long/);assert.equal(cleared,2);
});
test('repeated request ID cancels older request without clearing the newer controller',async()=>{
  const signals=[];const s=service((url,opts)=>{signals.push(opts.signal);return new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))))});
  const a=s.voiceCommand(input);const rejected=assert.rejects(a,/cancelled/);const b=s.voiceCommand(input);await rejected;assert.equal(signals[0].aborted,true);assert.equal(signals[1].aborted,false);s.cancelVoice(input.id);await assert.rejects(b,/cancelled/);
});
test('cancelled response cannot succeed even when a transport ignores AbortSignal',async()=>{
  let resolve;const s=service(()=>new Promise(r=>resolve=r));const p=s.voiceCommand(input);s.cancelVoice(input.id);resolve(ok({intent:'GENERAL_ANSWER',replyMessage:'late'}));await assert.rejects(p,/cancelled/);
});
test('explicit multilingual endpoints override the workflow current-location placeholder',async()=>{
  const s=service(async()=>ok({intent:'PLAN_ROUTE',replyMessage:'Planning',origin:'Your location',destination:'Nagpur Airport'}));
  for(const query of ['Plan a route from Sitabuldi to Airport','मुझे सीताबर्डी से एयरपोर्ट जाना है','मला सीताबर्डीपासून विमानतळापर्यंत जायचे आहे','Sitabuldi se Airport जाना है']){
    const result=await s.voiceCommand({...input,query,location:'Dharampeth'});
    assert.equal(result.origin,'Sitabuldi',query);assert.equal(result.destination,'Airport',query);
  }
});
