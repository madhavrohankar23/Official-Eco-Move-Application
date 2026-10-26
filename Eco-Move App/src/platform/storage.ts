import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
const PREFIX='eco.runtime.';
let writes=Promise.resolve();
const secret=(key:string)=>key.startsWith('sb-');
export async function hydrateStorage(){
  const keys=(await AsyncStorage.getAllKeys()).filter(k=>k.startsWith(PREFIX));
  const entries=await AsyncStorage.multiGet(keys);
  const output:Record<string,string>={};
  for(const [k,v]of entries)if(v!==null)output[k.slice(PREFIX.length)]=v;
  if(Platform.OS!=='web'){
    const index=JSON.parse(await SecureStore.getItemAsync('eco.auth.index')||'[]');
    for(const k of index){const v=await SecureStore.getItemAsync(k);if(v!==null)output[k]=v;}
  }
  return output;
}
export function persistStorage(key:string,value:string|null){
  writes=writes.catch(()=>{}).then(async()=>{
    if(secret(key)&&Platform.OS!=='web'){
      const index:string[]=JSON.parse(await SecureStore.getItemAsync('eco.auth.index')||'[]');
      if(value===null){await SecureStore.deleteItemAsync(key);await SecureStore.setItemAsync('eco.auth.index',JSON.stringify(index.filter(k=>k!==key)));}
      else{await SecureStore.setItemAsync(key,value);if(!index.includes(key))await SecureStore.setItemAsync('eco.auth.index',JSON.stringify([...index,key]));}
    }else if(value===null)await AsyncStorage.removeItem(PREFIX+key);else await AsyncStorage.setItem(PREFIX+key,value);
  });return writes;
}
export const flushStorage=()=>writes;
