const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const esbuild=require('esbuild');
const fs=require('node:fs');

function load(file, modules) {
  const code=esbuild.transformSync(fs.readFileSync(file,'utf8'),{loader:'ts',format:'cjs'}).code;
  const box={module:{exports:{}},exports:{},setTimeout,clearTimeout,console,require:name=>{
    assert.ok(name in modules,`Unexpected import: ${name}`);return modules[name];
  }};
  vm.runInNewContext(code,box);return box.module.exports;
}

test('Expo Go without speech module can mount listeners and denies voice without import failure',async()=>{
  const effects=[];
  const api=load('src/platform/speechRecognition.ts',{
    react:{useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)},
    expo:{requireOptionalNativeModule:()=>null},
  });
  assert.equal(api.isSpeechRecognitionSupported,false);
  api.useSpeechRecognitionEvent('result',()=>assert.fail('Unexpected event'));
  assert.equal(effects[0](),undefined);
  assert.equal((await api.ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted,false);
  assert.throws(()=>api.ExpoSpeechRecognitionModule.start({}),/app build/);
  api.ExpoSpeechRecognitionModule.abort();
});

test('custom-build speech forwards native events and cleans up subscriptions',()=>{
  let emit,removed=false;const effects=[];
  const native={addListener:(name,cb)=>{assert.equal(name,'result');emit=cb;return {remove:()=>removed=true}}};
  const api=load('src/platform/speechRecognition.ts',{
    react:{useRef:value=>({current:value}),useEffect:fn=>effects.push(fn)},
    expo:{requireOptionalNativeModule:()=>native},
  });
  let transcript;
  api.useSpeechRecognitionEvent('result',event=>transcript=event.text);
  const cleanup=effects[0]();emit({text:'Sitabuldi'});
  assert.equal(transcript,'Sitabuldi');cleanup();assert.equal(removed,true);
  assert.equal(api.ExpoSpeechRecognitionModule,native);
});

test('runtime surfaces hydration failure, retries, and cancels requests on restart',async()=>{
  const effects=[],states=[],sent=[];let failStorage=true,reloads=0;
  const {useRuntime}=load('src/useRuntime.ts',{
    react:{useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn),useState:value=>{
      const state={value};states.push(state);return [value,v=>state.value=v];
    }},
    'react-native':{Platform:{OS:'ios'}},
    './platform/storage':{hydrateStorage:async()=>{if(failStorage)throw Error('Storage unavailable');return {session:'existing'}},persistStorage:async()=>{}},
    './platform/http':{nativeHttp:async()=>({}),abortHttp:()=>{}},
  });
  const runtime=useRuntime(()=>{});const cleanup=effects[0]();
  runtime.mapRef.current={send:message=>sent.push(message),reload:()=>reloads++};
  await assert.rejects(runtime.rpc('searchLocal'),/still starting/);
  await runtime.onMessage({type:'boot'});
  assert.equal(states.at(-1).value,'Storage unavailable');assert.equal(sent.length,0);
  runtime.retryRuntime();assert.equal(reloads,1);
  failStorage=false;await runtime.onMessage({type:'boot'});
  assert.equal(sent[0].storage.session,'existing');
  await runtime.onMessage({type:'ready'});
  const bootstrap=sent.at(-1);await runtime.onMessage({type:'result',id:bootstrap.id,value:{stats:{}}});
  const result=runtime.rpc('searchLocal',{query:'Airport'});
  await runtime.onMessage({type:'result',id:sent.at(-1).id,value:['Airport']});
  assert.equal((await result)[0],'Airport');
  const cancelled=assert.rejects(runtime.rpc('plan'),/restarted/);
  await runtime.onMessage({type:'boot'});await cancelled;
  await runtime.onMessage({type:'ready'});
  const unmounted=assert.rejects(runtime.rpc('map'),/session closed/);
  cleanup();await unmounted;
});
