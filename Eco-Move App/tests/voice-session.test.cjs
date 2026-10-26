const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,tick,deferred}=require('./helpers/load-ts.cjs');
const {VoiceSession}=load('src/voiceSession.ts');
function harness(overrides={}){
  const states=[],errors=[],requests=[],replies=[],cancels=[];let starts=0,aborts=0,finishes=0;
  const adapter={supported:true,permission:async()=>({granted:true}),start:()=>starts++,abort:()=>aborts++,request:async(id,text)=>{requests.push({id,text});return {intent:'GENERAL_ANSWER',message:'Use the metro.'}},cancel:id=>cancels.push(id),state:p=>states.push(p),transcript:()=>{},reply:async r=>replies.push(r),error:e=>errors.push(e),finish:()=>finishes++,...overrides};
  const session=new VoiceSession(adapter);
  return {session,states,errors,requests,replies,cancels,get starts(){return starts},get aborts(){return aborts},get finishes(){return finishes}};
}
test('voice submits only the final transcript once, returns the real answer and finishes',async()=>{
  const h=harness();await h.session.start();await h.session.start();assert.equal(h.starts,1);
  h.session.result('Metro',false);assert.equal(h.requests.length,0);
  h.session.result('How do I use metro?',true);h.session.result('How do I use metro?',true);h.session.end();await tick();
  assert.equal(h.requests.length,1);assert.equal(h.replies[0].message,'Use the metro.');assert.equal(h.finishes,1);assert.equal(h.states.at(-1),'idle');
});
test('switching off while microphone permission is pending cannot start a late microphone',async()=>{
  const p=deferred(),h=harness({permission:()=>p.promise});const starting=h.session.start();h.session.stop();p.resolve({granted:true});await starting;assert.equal(h.starts,0);assert.equal(h.states.at(-1),'idle');
});
test('switching off cancels pending workflow and ignores its late result',async()=>{
  const p=deferred(),h=harness({request:()=>p.promise});await h.session.start();h.session.result('Plan route',true);h.session.stop();p.resolve({intent:'PLAN_ROUTE',message:'Go',destination:'Airport'});await tick();assert.equal(h.cancels.length,1);assert.equal(h.replies.length,0);assert.equal(h.errors.length,0);
});
test('unsupported speech, permission denial and request failures expose actionable fallback',async()=>{
  const missing=harness({supported:false});await missing.session.start();assert.match(missing.errors[0],/type your question/);assert.equal(missing.starts,0);
  const denied=harness({permission:async()=>({granted:false})});await denied.session.start();assert.match(denied.errors[0],/permission is off/);
  const network=harness({request:async()=>{throw Error('Voice service took too long.')}});await network.session.start();network.session.result('Bus 35',true);await tick();assert.match(network.errors[0],/took too long/);assert.equal(network.states.at(-1),'idle');
});
test('a stopped session can restart and old recognition errors do not affect idle or thinking phases',async()=>{
  const p=deferred(),h=harness({request:()=>p.promise});await h.session.start();h.session.stop();h.session.error('aborted');assert.equal(h.errors.length,0);
  await h.session.start();h.session.result('Bus',true);h.session.error('recognition ended');h.session.end();p.resolve({intent:'GENERAL_ANSWER',message:'OK'});await tick();assert.equal(h.starts,2);assert.equal(h.replies.length,1);assert.equal(h.errors.length,0);
});
test('silence watchdog and end without a transcript release the microphone',async()=>{
  const timers=new Map();const {VoiceSession:Session}=load('src/voiceSession.ts',{}, {setTimeout:(fn,ms)=>{timers.set(ms,fn);return fn},clearTimeout:fn=>{for(const [ms,v] of timers)if(fn===v)timers.delete(ms)}});
  let error,aborts=0;const s=new Session({supported:true,permission:async()=>({granted:true}),start(){},abort:()=>aborts++,request:async()=>{},cancel(){},state(){},transcript(){},reply:async()=>{},error:e=>error=e,finish(){}});
  await s.start();timers.get(30000)();assert.match(error,/No speech/);assert.equal(aborts,1);assert.equal(timers.size,0);
  await s.start();s.end();timers.get(250)();assert.equal(aborts,2);assert.equal(timers.size,0);
});
test('typed route commands use the same guarded reply path without requesting microphone permission',async()=>{
  const h=harness({permission:async()=>{throw Error('must not request microphone')}});h.session.submit('सीताबर्डी से एयरपोर्ट जाना है');h.session.submit('duplicate');await tick();
  assert.equal(h.requests.length,1);assert.equal(h.starts,0);assert.equal(h.replies.length,1);assert.equal(h.errors.length,0);
});
test('synchronous transport errors and cancelled local lookup do not leak a running session',async()=>{
  const h=harness({request:()=>{throw Error('RPC unavailable')}});h.session.submit('Route');await tick();assert.equal(h.states.at(-1),'idle');assert.match(h.errors[0],/RPC unavailable/);
  const p=deferred();let sent=false;const c=harness({request:async(id,text,isCurrent)=>{await p.promise;if(!isCurrent())throw Error('cancelled');sent=true;return {intent:'GENERAL_ANSWER',message:'OK'}}});c.session.submit('Airport');c.session.stop();p.resolve();await tick();assert.equal(sent,false);assert.equal(c.errors.length,0);
});
test('uncertain recognition releases the microphone and waits for explicit corrected-transcript confirmation',async()=>{
  const h=harness();await h.session.start();h.session.result('From Unknown to Airport',true,true);
  assert.equal(h.states.at(-1),'review');assert.equal(h.requests.length,0);assert.equal(h.aborts,1);
  h.session.error('aborted');h.session.end();assert.equal(h.errors.length,0);
  h.session.confirm('From Sitabuldi to Airport');h.session.confirm('duplicate');await tick();
  assert.equal(h.requests.length,1);assert.equal(h.requests[0].text,'From Sitabuldi to Airport');assert.equal(h.replies.length,1);
});
test('stopping transcript review prevents a late confirmation from submitting a trip',async()=>{
  const h=harness();await h.session.start();h.session.result('uncertain',true,true);h.session.stop();h.session.confirm('From Sitabuldi to Airport');await tick();assert.equal(h.requests.length,0);
});
