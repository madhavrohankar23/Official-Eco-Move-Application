import React,{useEffect,useRef} from 'react';
import {parseCameraEvent,type CameraProps} from '../features/gestures/gestureBridge';
export default function GestureCamera({onEvent}:CameraProps){
  const frame=useRef<HTMLIFrameElement>(null),callback=useRef(onEvent);callback.current=onEvent;
  useEffect(()=>{
    const receive=(e:MessageEvent)=>{
      if(e.source!==frame.current?.contentWindow||e.origin!==location.origin||!e.data?.ecoGesture)return;
      const event=parseCameraEvent(e.data);if(event)callback.current(event);
    };
    window.addEventListener('message',receive);
    return()=>{window.removeEventListener('message',receive);(frame.current?.contentWindow as any)?.EcoGestureStop?.()};
  },[]);
  return <iframe ref={frame} title="Touchless camera preview" src="/gesture/index.html" allow="camera" style={{width:'100%',height:'100%',border:0,background:'#102a23'}}/>;
}
