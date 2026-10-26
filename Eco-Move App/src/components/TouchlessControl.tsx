import React from 'react';
import {View,useWindowDimensions} from 'react-native';
import {RefreshCw,X} from 'lucide-react-native';
import {useApp} from '../AppContext';
import GestureCamera from '../platform/GestureCamera';
import {Copy,Glass,IconButton} from './Glass';
export function TouchlessControl(){
  const app=useApp();const state=app.gestureStatus;
  const {width,height}=useWindowDimensions();const compact=height<500;
  if(!app.gestureRunning)return null;
  const failed=['error','permission_denied','unsupported','interrupted'].includes(state.status);
  return <Glass level={3} style={{width:compact?280:Math.min(200,width-144),borderRadius:24}}>
    <View style={{padding:10,gap:8}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
        <Copy weight="600" size={13} style={{flex:1}}>Touchless zoom</Copy>
        {failed&&<IconButton label="Retry touchless camera" icon={RefreshCw} onPress={app.retryGesture}/>}
        <IconButton label="Stop touchless camera" icon={X} onPress={()=>app.setGestureEnabled(false)}/>
      </View>
      <View style={{flexDirection:compact?'row':'column',gap:8}}>
        <View style={{height:compact?80:height<650?72:96,width:compact?80:undefined,borderRadius:14,overflow:'hidden'}}>
          <GestureCamera key={app.gestureAttempt} onEvent={app.onGestureEvent}/>
        </View>
        <Copy size={12} style={compact?{flex:1}:undefined} accessibilityLiveRegion="polite">{state.message}</Copy>
      </View>
    </View>
  </Glass>;
}
