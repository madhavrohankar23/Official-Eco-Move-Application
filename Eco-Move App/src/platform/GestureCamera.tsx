import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,View} from 'react-native';
import {WebView} from 'react-native-webview';
import type {WebViewProps} from 'react-native-webview';
import {Asset} from 'expo-asset';
import {File} from 'expo-file-system';
import {parseCameraEvent,type CameraProps} from '../features/gestures/gestureBridge';
const ORIGIN='https://localhost/';
// WebView 14's generic class signature conflicts with React 19.3 JSX typing.
const CameraWebView=WebView as unknown as React.ComponentType<WebViewProps&React.RefAttributes<WebView>>;
export default function GestureCamera({onEvent}:CameraProps){
  const callback=useRef(onEvent);callback.current=onEvent;
  const mounted=useRef(true);
  const web=useRef<WebView>(null);
  const [html,setHtml]=useState<string>();
  useEffect(()=>{
    mounted.current=true;
    let active=true;
    Asset.fromModule(require('../../assets/gesture.html')).downloadAsync().then(async asset=>{
      const text=await new File(asset.localUri||asset.uri).text();
      if(active)setHtml(text);
    }).catch(error=>{if(active)callback.current({type:'status',status:'error',message:'Camera assets could not load. '+error.message,pinchState:'none'})});
    return()=>{active=false;mounted.current=false;web.current?.injectJavaScript('window.EcoGestureStop?.();true;')};
  },[]);
  if(!html)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator color="#b6f1d0"/></View>;
  return <CameraWebView ref={web} source={{html,baseUrl:ORIGIN}} style={{flex:1,backgroundColor:'#102a23'}}
    originWhitelist={['https://localhost']} javaScriptEnabled scrollEnabled={false} bounces={false}
    allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
    setSupportMultipleWindows={false} onShouldStartLoadWithRequest={r=>r.url===ORIGIN||r.url==='about:blank'}
    onMessage={e=>{if(!mounted.current)return;try{const event=parseCameraEvent(JSON.parse(e.nativeEvent.data));if(event)callback.current(event)}catch{}}}
    onError={e=>callback.current({type:'status',status:'error',message:e.nativeEvent.description,pinchState:'none'})}
    onContentProcessDidTerminate={()=>callback.current({type:'status',status:'interrupted',message:'Camera process paused. Tap Retry.',pinchState:'none'})}/>;
}
