import React,{forwardRef,useImperativeHandle,useRef,useEffect,useState} from 'react';
import {View,Text,StyleSheet,Linking} from 'react-native';
import {WebView} from 'react-native-webview';
import {Asset} from 'expo-asset';
export type MapHandle={send:(message:any)=>void;reload:()=>void};
export type MapProps={onMessage:(m:any)=>void};
const RuntimeMap=forwardRef<MapHandle,MapProps>(({onMessage},ref)=>{
  const web=useRef<any>(null);const [uri,setUri]=useState<string>();const [error,setError]=useState<string>();
  const [attempt,setAttempt]=useState(0);const callback=useRef(onMessage);callback.current=onMessage;
  useImperativeHandle(ref,()=>({send:m=>{web.current?.injectJavaScript(`window.EcoReceive&&window.EcoReceive(${JSON.stringify(m).replace(/</g,'\\u003c')});true;`)},reload:()=>{setError(undefined);setUri(undefined);setAttempt(n=>n+1)}}),[]);
  useEffect(()=>{let active=true;Asset.fromModule(require('../../assets/runtime.html')).downloadAsync().then(a=>{if(active)setUri(a.localUri||a.uri)}).catch(e=>{if(active){setError(e.message);callback.current({type:'runtimeError',message:'Map assets could not load. '+e.message})}});return()=>{active=false}},[attempt]);
  if(error)return <View style={s.error}><Text>Map could not start: {error}</Text></View>;
  if(!uri)return <View style={s.fill}/>;
  const WebViewComp = WebView as any;
  return <WebViewComp ref={web} source={{uri}} style={s.fill} originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs androidLayerType="hardware" mixedContentMode="compatibility" scrollEnabled={false} overScrollMode="never" setSupportMultipleWindows={false} onMessage={(e: any)=>{try{onMessage(JSON.parse(e.nativeEvent.data))}catch{}}} onError={(e: any)=>onMessage({type:'runtimeError',message:e.nativeEvent.description})} onContentProcessDidTerminate={()=>web.current?.reload()} onShouldStartLoadWithRequest={(r: any)=>{if(r.url===uri||r.url.startsWith('file:')||r.url==='about:blank')return true;if(/^https:\/\//i.test(r.url))Linking.openURL(r.url).catch(()=>{});return false}}/>;
});
const s=StyleSheet.create({fill:{flex:1,backgroundColor:'#edf3ef'},error:{flex:1,alignItems:'center',justifyContent:'center'}});
export default React.memo(RuntimeMap);
