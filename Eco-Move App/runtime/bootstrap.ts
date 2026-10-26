declare global { interface Window { ReactNativeWebView?: {postMessage:(s:string)=>void}; EcoReceive:(m:any)=>void; EcoSend:(m:any)=>void; EcoMap:any; EcoSatellite?:ReturnType<typeof import('./satellite').satelliteController>; } }
const isNative = () => typeof window !== 'undefined' && !!window.ReactNativeWebView;
window.EcoSend = m => isNative() ? window.ReactNativeWebView!.postMessage(JSON.stringify(m)) : window.parent.postMessage({eco:true,...m},location.origin);
let started=false;
window.EcoReceive = async m => {
  if(m.type!=='init'||started)return;
  started=true;
  if(isNative()){
    const cache:Record<string,string>={...m.storage};
    const storage={getItem:(k:string)=>cache[k]??null,setItem:(k:string,v:any)=>{cache[k]=String(v);window.EcoSend({type:'storage',key:k,value:String(v)})},removeItem:(k:string)=>{delete cache[k];window.EcoSend({type:'storage',key:k,value:null})},clear:()=>{for(const k of Object.keys(cache))storage.removeItem(k)},key:(i:number)=>Object.keys(cache)[i]??null,get length(){return Object.keys(cache).length}};
    Object.defineProperty(window,'localStorage',{value:storage});
    let counter=0;const pending=new Map<string,{resolve:(r:Response)=>void,reject:(e:Error)=>void,cleanup:()=>void}>();
    const originalFetch=window.fetch.bind(window);
    window.fetch = async (url:any,options:any={})=>{
      const address=typeof url==='string'?url:url.url;
      if(!/^https?:|^\/api\//.test(address))return originalFetch(url,options);
      const id=`http-${++counter}`;
      return new Promise((resolve,reject)=>{
        const cleanup=()=>options.signal?.removeEventListener('abort',cancel);
        const cancel=()=>{pending.delete(id);cleanup();window.EcoSend({type:'httpAbort',id});reject(new DOMException('Aborted','AbortError'))};
        pending.set(id,{resolve,reject,cleanup});
        if(options.signal?.aborted){cancel();return;}
        options.signal?.addEventListener('abort',cancel,{once:true});
        window.EcoSend({type:'http',id,url:address,options:{method:options.method||'GET',headers:Object.fromEntries(new Headers(options.headers).entries()),body:options.body}});
      });
    };
    window.addEventListener('eco-http',((e:CustomEvent)=>{
      const {id,error,body,status,headers}=e.detail;const p=pending.get(id);if(!p)return;pending.delete(id);p.cleanup();
      if(error)p.reject(new Error(error));else p.resolve(new Response([204,205,304].includes(status)?null:body,{status,headers}));
    }) as EventListener);
  }
  const app=await import('./index');app.mount();
};
window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===location.origin&&e.data?.eco)window.EcoReceive(e.data)});
window.addEventListener('error',e=>window.EcoSend({type:'runtimeError',message:e.message}));
window.addEventListener('unhandledrejection',e=>window.EcoSend({type:'runtimeError',message:String(e.reason?.message||e.reason)}));
const bootInterval=setInterval(()=>{if(started){clearInterval(bootInterval);return;}window.EcoSend({type:'boot'});},500);
window.EcoSend({type:'boot'});
export {};
