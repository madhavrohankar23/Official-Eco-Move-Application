import {TouchlessGestureController} from '../src/features/gestures/useHandGesture';
import {gestureMessages} from '../src/features/gestures/gestureBridge';
import type {CameraEvent} from '../src/features/gestures/gestureBridge';
let stopped=false;
let lastStatus='';
const send=(event:CameraEvent)=>{
  if(stopped)return;
  const native=(window as any).ReactNativeWebView;
  if(native)native.postMessage(JSON.stringify(event));
  else window.parent.postMessage({ecoGesture:true,...event},location.origin);
};
const status=()=>{
  const s=controller.state;
  const message=s.errorMessage||gestureMessages[s.status];
  const signature=[s.status,s.pinchState,message].join('|');
  if(signature===lastStatus)return;
  lastStatus=signature;
  send({type:'status',status:s.status,pinchState:s.pinchState,message});
};
const controller=new TouchlessGestureController({onStatusChange:()=>status(),onZoomDelta:delta=>send({type:'zoom',delta}),onFrame:frame=>{
  // Report qualitative changes only; never push video or per-frame metrics to React Native.
  const s=controller.state;
  if(frame.pinchState!==s.pinchState)send({type:'status',status:s.status,pinchState:frame.pinchState,message:gestureMessages[s.status]});
},onError:()=>status()});
const stop=()=>{stopped=true;controller.dispose()};
(window as any).EcoGestureStop=stop;
window.addEventListener('pagehide',stop,{once:true});
window.addEventListener('beforeunload',stop,{once:true});
void controller.start();
