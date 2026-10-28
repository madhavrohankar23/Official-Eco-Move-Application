import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import type {Point} from '../types';
import {Action,Copy,Glass} from './Glass';

type Choice={label:string;value:Point|boolean|null};
/** Both search and SafarBot use the same explicit location/replacement review. */
export function useVoiceDecision(){
  const [decision,setDecision]=useState<{title:string;choices:Choice[]}|null>(null);
  const reply=useRef<((value:Choice['value'])=>void)|null>(null);
  const resolve=(value:Choice['value'])=>{const pending=reply.current;reply.current=null;setDecision(null);pending?.(value)};
  const ask=(title:string,choices:Choice[])=>new Promise<Choice['value']>(done=>{
    reply.current?.(null);reply.current=done;setDecision({title,choices});
  });
  useEffect(()=>()=>{reply.current?.(null);reply.current=null},[]);
  const actions={
    confirmVoicePlaceReplacement:async(before:Point,after:Point)=>await ask(`Replace ${before.name} with ${after.name}?`,[
      {label:'Use this location',value:true},{label:'Keep current location',value:false},
    ])===true,
    chooseVoicePlace:async(name:string,places:Point[])=>{
      const choice=await ask(`Which “${name}” did you mean?`,places.slice(0,8).map(p=>({label:`${p.name} · ${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`,value:p})));
      return choice&&typeof choice==='object'?choice:null;
    },
    confirmVoiceReplacement:async(from:Point|null,to:Point)=>await ask(`Replace your current trip with ${from?.name||'your Source'} → ${to.name}?`,[
      {label:'Use these locations',value:true},{label:'Keep current trip',value:false},
    ])===true,
  };
  return {pending:!!decision,actions,cancel:()=>resolve(null),render:(onCancel:()=>void)=>decision&&
    <Glass level={3} blur={false} style={{borderRadius:20}}><View style={{padding:16,gap:10}}>
      <Copy weight="600">{decision.title}</Copy>
      {decision.choices.map((choice,i)=><Action key={i} label={choice.label} quiet onPress={()=>resolve(choice.value)}/>)}
      <Action label="Cancel assistant request" quiet onPress={()=>{resolve(null);onCancel()}}/>
    </View></Glass>};
}
