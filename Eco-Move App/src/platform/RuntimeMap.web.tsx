import React,{forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import type {MapHandle,MapProps} from './RuntimeMap';
export default React.memo(forwardRef<MapHandle,MapProps>(function RuntimeMap({onMessage},ref){
  const frame=useRef<HTMLIFrameElement>(null);const cb=useRef(onMessage);cb.current=onMessage;
  useImperativeHandle(ref,()=>({send:m=>frame.current?.contentWindow?.postMessage({eco:true,...m},location.origin),reload:()=>frame.current?.contentWindow?.location.reload()}),[]);
  useEffect(()=>{const receive=(e:MessageEvent)=>{if(e.source===frame.current?.contentWindow&&e.origin===location.origin&&e.data?.eco)cb.current(e.data)};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[]);
  return <iframe title="Nagpur interactive transit map" ref={frame} src="/runtime/index.html" style={{width:'100%',height:'100%',border:0,background:'#edf3ef'}}/>;
}));
