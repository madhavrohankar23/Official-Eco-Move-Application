import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {DeviceMotion} from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import {ShakeRecognizer} from './shakeRecognizer';
export type MotionStatus='off'|'checking'|'ready'|'permission'|'unavailable';
export interface ShakeDetectorOptions {onShake:()=>void|Promise<void>;threshold?:number;cooldownMs?:number;enabled?:boolean;permissionRevision?:number}
// Call from a press handler: Safari requires permission inside a user gesture.
export const requestShakePermission=()=>DeviceMotion.requestPermissionsAsync();
export function useShakeDetector({onShake,threshold=2.4,cooldownMs=3000,enabled=true,permissionRevision=0}:ShakeDetectorOptions){
  const callback=useRef(onShake);callback.current=onShake;
  const [status,setStatus]=useState<MotionStatus>('off');
  useEffect(()=>{
    if(!enabled){setStatus('off');return}
    let disposed=false,epoch=0,starting=false,subscription:{remove:()=>void}|null=null;
    const recognizer=new ShakeRecognizer(threshold,cooldownMs);
    const stop=()=>{epoch++;starting=false;subscription?.remove();subscription=null;recognizer.reset()};
    const start=async()=>{
      if(disposed||starting||subscription||AppState.currentState!=='active')return;
      starting=true;const run=++epoch;setStatus('checking');
      const stale=()=>disposed||run!==epoch||AppState.currentState!=='active';
      try{
        const permission=await DeviceMotion.getPermissionsAsync();if(stale())return;
        if(!permission.granted){setStatus('permission');return}
        const available=await DeviceMotion.isAvailableAsync();if(stale())return;
        if(!available){setStatus('unavailable');return}
        DeviceMotion.setUpdateInterval(50);
        subscription=DeviceMotion.addListener(sample=>{
          const a=sample.accelerationIncludingGravity;if(!a)return;
          if(recognizer.push({x:a.x/9.80665,y:a.y/9.80665,z:a.z/9.80665},Date.now())){
            void Haptics.selectionAsync().catch(()=>{});
            void Promise.resolve().then(()=>callback.current()).catch(()=>{});
          }
        });setStatus('ready');
      }catch{if(!stale())setStatus('unavailable')}
      finally{if(run===epoch)starting=false}
    };
    void start();
    const appState=AppState.addEventListener('change',state=>{if(state==='active')void start();else stop()});
    return()=>{disposed=true;stop();appState.remove()};
  },[enabled,threshold,cooldownMs,permissionRevision]);
  return status;
}
