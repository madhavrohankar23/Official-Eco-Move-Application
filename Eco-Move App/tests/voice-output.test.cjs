const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,deferred,tick}=require('./helpers/load-ts.cjs');
const {createVoiceOutput}=load('src/voiceOutput.ts',{'react':{},'expo-speech':{}});
function harness(extra={}){const utterances=[],states=[],errors=[];const output=createVoiceOutput({stop:async()=>{},speak:(text,options)=>utterances.push({text,options}),state:x=>states.push(x),error:x=>errors.push(x),...extra});return {output,utterances,states,errors}}
test('spoken replies select the actual text language and retain an accessible failure path',async()=>{
  const h=harness();await h.output.speak('**Board the metro** https://example.test','mr-IN');
  assert.equal(h.utterances[0].text,'Board the metro');assert.equal(h.utterances[0].options.language,'en-IN');
  await h.output.speak('सीताबर्डी येथून मेट्रो घ्या','mr-IN');assert.equal(h.utterances[1].options.language,'mr-IN');
  await h.output.speak('सीताबर्डी से मेट्रो लें','hi-IN');assert.equal(h.utterances[2].options.language,'hi-IN');
  h.utterances[2].options.onError();assert.equal(h.states.at(-1),false);assert.match(h.errors[0],/remains on screen/);
});
test('stopping while a speech engine stop is pending cannot start late audio',async()=>{
  const p=deferred(),h=harness({stop:()=>p.promise});const pending=h.output.speak('Old response','en-IN');h.output.stop();p.resolve();await pending;assert.equal(h.utterances.length,0);
});
test('late completion of an older utterance does not clear a newer speaking state',async()=>{
  const h=harness();await h.output.speak('First','en-IN');await h.output.speak('Second','en-IN');
  h.utterances[0].options.onDone();assert.equal(h.states.at(-1),true);
  h.utterances[1].options.onStopped();assert.equal(h.states.at(-1),false);
});
test('unavailable speech engines and empty replies do not leave a busy state or unhandled rejection',async()=>{
  const h=harness({speak:()=>{throw Error('No voice installed')}});await h.output.speak('Response','en-IN');assert.equal(h.states.at(-1),false);assert.equal(h.errors.length,1);
  await h.output.speak('','en-IN');await tick();assert.equal(h.states.at(-1),false);
  const failed=harness({stop:async()=>{throw Error('Unavailable')}});await failed.output.speak('Response','en-IN');assert.equal(failed.errors.length,1);failed.output.stop();await tick();
});
