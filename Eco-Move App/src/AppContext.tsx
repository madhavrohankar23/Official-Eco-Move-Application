import React,{createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import {AppState,BackHandler,Keyboard,Linking,Platform} from 'react-native';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {isRunningInExpoGo} from 'expo';
import {useRuntime} from './useRuntime';
import type {Journey,Panel,Point,Preference,SearchTarget,Tab,Ticket,TransitLeg} from './types';
import {clearChatMemory} from './chatMemory';
import {flushStorage} from './platform/storage';
import {mapPresentation} from './mapPresentation';
import {useShakeDetector,requestShakePermission} from './platform/shake';
import {readCurrentSource,isSourceShortcut} from './platform/sourceLocation';
import {GestureZoomAccumulator,type CameraEvent} from './features/gestures/gestureBridge';
import type {TrackingStatus,PinchState} from './features/gestures/gestureTypes';
import {isVoiceLanguage,type VoiceLanguage} from './voiceInput';
function useController(){
  const [tab,setTab]=useState<Tab>('home');const [stack,setStack]=useState<Panel[]>(['home']);const panel=stack.at(-1);
  const previousMapScene=useRef<Panel>('home');const mapScene=stack.slice().reverse().find(p=>['home','plan','nearby','live','cabs'].includes(p))||previousMapScene.current;previousMapScene.current=mapScene;
  const [collapsed,setCollapsed]=useState(false);const [expanded,setExpanded]=useState(false);const [keyboard,setKeyboard]=useState(0);
  const [origin,setOrigin]=useState<Point|null>(null),[destination,setDestination]=useState<Point|null>(null),[anchor,setAnchor]=useState<Point|null>(null);
  const [cabOrigin,setCabOrigin]=useState<Point|null>(null),[cabDestination,setCabDestination]=useState<Point|null>(null);
  const [preference,setPreference]=useState<Preference>('balanced'),[departure,setDeparture]=useState('now');
  const [journeys,setJourneys]=useState<Journey[]>([]),[selected,setSelected]=useState(0),[planning,setPlanning]=useState(false),[enriching,setEnriching]=useState(false);
  const journey=journeys[selected]||null;
  const [searchTarget,setSearchTarget]=useState<SearchTarget>('place'),[picking,setPicking]=useState<SearchTarget|null>(null);
  const [searchedPlace,setSearchedPlace]=useState<Point|null>(null);const [radius,setRadius]=useState(2500);const [nearbyTab,setNearbyTab]=useState('stops');
  const [nearbyData,setNearbyData]=useState<any>({busStops:[],metroStations:[]});const [nearbyBuses,setNearbyBuses]=useState<any[]>([]);const [poiCategory,setPoiCategory]=useState<'Restaurant'|'Hospital'|null>(null);const [pois,setPois]=useState<any[]>([]);
  const [liveRoute,setLiveRoute]=useState<any>(null),[telemetry,setTelemetry]=useState<any>(null),[liveStop,setLiveStop]=useState<any>(null),[nearbyBus,setNearbyBus]=useState<any>(null);
  const [busQuery,setBusQuery]=useState(''),[timetableQuery,setTimetableQuery]=useState<any>({});
  const [cabResults,setCabResults]=useState<any>(null);
  const [mapStyle,setMapStyle]=useState<'carto'|'roadmap'|'satellite'>('carto'),[showBusStops,setShowBusStops]=useState(false),[showMetroStations,setShowMetroStations]=useState(false),[showNetwork,setShowNetwork]=useState(false);
  const [tickets,setTickets]=useState<Ticket[]>([]),[ticket,setTicket]=useState<Ticket|null>(null),[saved,setSaved]=useState<any[]>([]),[recents,setRecents]=useState<any[]>([]),[eco,setEco]=useState<any>({totalCo2SavedKg:0,greenTripsCount:0,claimedRewardIds:[]});
  const [bookingLegs,setBookingLegs]=useState<TransitLeg[]|null>(null);const [lockedBooking,setLockedBooking]=useState(false);
  const [notice,setNotice]=useState(''),[error,setError]=useState(''),[locating,setLocating]=useState(false);
  const [shakeEnabled,setShakeEnabledState]=useState(true);
  const shakePreferenceVersion=useRef(0);
  const [assistantActive,setAssistantActive]=useState(false);
  const [voiceLanguage,setVoiceLanguageState]=useState<VoiceLanguage>('en-IN');
  const voicePreferenceVersion=useRef(0);
  useEffect(()=>{let active=true;const version=voicePreferenceVersion.current;AsyncStorage.getItem('eco_move_voice_language').then(value=>{if(active&&version===voicePreferenceVersion.current&&isVoiceLanguage(value))setVoiceLanguageState(value)}).catch(()=>{});return()=>{active=false}},[]);
  const setVoiceLanguage=(value:VoiceLanguage)=>{if(!isVoiceLanguage(value))return;voicePreferenceVersion.current++;setVoiceLanguageState(value);void AsyncStorage.setItem('eco_move_voice_language',value).catch(()=>{})};
  const [motionRevision,setMotionRevision]=useState(0);
  const sourceRequest=useRef(0),sourceBusy=useRef(false),sourcePoint=useRef<Point|null>(null);
  const sourceOrigin=useRef(origin);sourceOrigin.current=origin;
  const [pendingSourceShortcut,setPendingSourceShortcut]=useState(false);
  const [gestureEnabled,setGestureEnabledState]=useState(false);
  const gesturePreferenceTouched=useRef(false);
  const [gestureStatus,setGestureStatus]=useState<{active:boolean;status:TrackingStatus;message:string;pinchState:PinchState}>({active:false,status:'idle',message:'',pinchState:'none'});
  const gestureZoom=useRef(new GestureZoomAccumulator());
  const [gestureAttempt,setGestureAttempt]=useState(0);
  const retryGesture=()=>{gestureZoom.current.reset();setGestureAttempt(n=>n+1)};
  const [authMode,setAuthMode]=useState<'welcome'|'login'|'signup'|'verify'|'reset'|'update'>('welcome');
  const [appActive,setAppActive]=useState(true);
  const [appSuspended,setAppSuspended]=useState(false);
  const planSequence=useRef(0);const sessionId=useRef<string|undefined>(undefined);
  const [satelliteState,setSatelliteState]=useState<{status:'idle'|'loading'|'ready'|'error';message?:string}>({status:'idle'});
  const outsideRef=useRef(()=>{});
  outsideRef.current=()=>{if(!picking&&panel&&!collapsed){Keyboard.dismiss();setCollapsed(true)}};
  const choosePlaceRef=useRef<(p:Point)=>void>(()=>{});
  const onMapEvent=useCallback((name:string,value:any)=>{
    if(name==='backgroundTap')outsideRef.current();
    else if(name==='satelliteState'){setSatelliteState(value);if(value.status==='error')setMapStyle(style=>style==='satellite'?'carto':style)}
    else if(name==='pick')choosePlaceRef.current({...value,name:`Map pin (${value.lat.toFixed(4)}, ${value.lon.toFixed(4)})`});
    else if(name==='liveStop')setLiveStop(value);
    else if(name==='nearbyBus')setNearbyBus(value);
    else if(name==='timetable'){setTimetableQuery(value);setStack(s=>[...s,'timetable']);setCollapsed(false)}
    else if(name==='directions'){setDestination(value);setTab('plan');setStack(['plan']);setCollapsed(false)}
  },[]);
  const runtime=useRuntime(onMapEvent);const {rpc,ready,auth}=runtime;
  const guard=useCallback(async<T,>(operation:()=>Promise<T>):Promise<T|undefined>=>{setError('');try{return await operation()}catch(e:any){setError(e?.message||'Something went wrong. Please try again.');return undefined}},[]);
  const open=(name:Panel)=>{if(['home','plan','nearby','trips','profile'].includes(name))setTab(name as Tab);Keyboard.dismiss();setPicking(null);setError('');setStack(s=>s.at(-1)===name?s:[...s,name]);setCollapsed(false);setExpanded(['search','booking','ticket','chat','explain','settings'].includes(name));};
  const navigate=(name:Tab)=>{Keyboard.dismiss();Speech.stop();setError('');setPicking(null);setTab(name);setStack([name]);setCollapsed(false);setExpanded(false)};
  const back=()=>{Keyboard.dismiss();Speech.stop();setPicking(null);setError('');setCollapsed(false);setExpanded(false);setStack(s=>s.length>1?s.slice(0,-1):['home']);const previous=stack.slice(0,-1).reverse().find(p=>['home','plan','nearby','trips','profile'].includes(p));setTab((previous||'home') as Tab)};
  const close=()=>{Keyboard.dismiss();Speech.stop();setPicking(null);setError('');setStack([]);setTab('home');setCollapsed(false);setExpanded(false)};
  const search=(target:SearchTarget)=>{setSearchTarget(target);open('search')};
  const assign=(p:Point,target:SearchTarget)=>{if(target==='origin')setOrigin(p);else if(target==='destination')setDestination(p);else if(target==='anchor')setAnchor(p);else if(target==='cab_origin')setCabOrigin(p);else if(target==='cab_destination')setCabDestination(p);else setSearchedPlace(p)};
  const choosePlace=(p:Point)=>{assign(p,searchTarget);Keyboard.dismiss();setPicking(null);setCollapsed(false);setExpanded(false);setStack(s=>s.filter(x=>x!=='search'));guard(()=>rpc('center',p));};
  choosePlaceRef.current=(p:Point)=>{if(picking){assign(p,picking);setPicking(null);setCollapsed(false);guard(()=>rpc('center',p));}};
  const pickMap=(target:SearchTarget)=>{Keyboard.dismiss();setPicking(target);setSearchTarget(target);setStack(s=>s.filter(x=>x!=='search'));setCollapsed(true);setExpanded(false)};
  const locate=async(target:SearchTarget)=>{setLocating(true);await guard(async()=>{const permission=await Location.requestForegroundPermissionsAsync();if(permission.status!=='granted')throw Error('Location permission is off. Search for a place or choose a point on the map.');const current=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});const p={lat:current.coords.latitude,lon:current.coords.longitude,name:'Your location'};if(p.lat<20.8||p.lat>21.42||p.lon<78.75||p.lon>79.4)throw Error('Your location is outside the Nagpur network. Choose a Nagpur origin on the map.');assign(p,target);await rpc('center',p);setPicking(null)});setLocating(false)};
  useEffect(()=>{let active=true;const version=shakePreferenceVersion.current;AsyncStorage.getItem('eco_move_shake_voice').then(v=>{if(active&&version===shakePreferenceVersion.current&&v!==null)setShakeEnabledState(v==='true')}).catch(()=>{});return()=>{active=false;shakePreferenceVersion.current++}},[]);
  const setShakeEnabled=async(val:boolean)=>{
    const version=++shakePreferenceVersion.current;
    if(val){try{const permission=await requestShakePermission();if(version!==shakePreferenceVersion.current)return;if(!permission.granted){setError('Motion permission is off. Use the Voice button instead.');return}setMotionRevision(n=>n+1)}catch{if(version===shakePreferenceVersion.current)setError('Motion sensing is unavailable. Use the Voice button instead.');return}}
    setShakeEnabledState(val);void AsyncStorage.setItem('eco_move_shake_voice',String(val)).catch(()=>{});
  };
  const toggleAssistant=()=>{
    if(assistantActive){setAssistantActive(false);Speech.stop();return}
    open('chat');setAssistantActive(true);
  };
  const motionStatus=useShakeDetector({onShake:toggleAssistant,enabled:appActive&&shakeEnabled&&!!auth.user,permissionRevision:motionRevision});
  // iOS permission dialogs temporarily mark the app inactive; only background cancels a request.
  useEffect(()=>{if(appSuspended||!auth.user||panel!=='chat'||collapsed)setAssistantActive(false)},[appSuspended,auth.user?.id,panel,collapsed]);
  const useCurrentSource=useCallback(async()=>{
    if(sourceBusy.current)return;
    sourceBusy.current=true;const run=++sourceRequest.current;setLocating(true);setError('');
    const initialOrigin=sourceOrigin.current;
    const current=()=>run===sourceRequest.current&&initialOrigin===sourceOrigin.current;
    try{
      const point=await readCurrentSource({permission:()=>Location.requestForegroundPermissionsAsync(),position:()=>Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),...(Platform.OS==='web'?{}:{reverse:(lat:number,lon:number)=>Location.reverseGeocodeAsync({latitude:lat,longitude:lon})})},current);
      if(!current())return;
      sourcePoint.current=point;setOrigin(point);setPicking(null);navigate('plan');
      setNotice(point.lat<20.8||point.lat>21.42||point.lon<78.75||point.lon>79.4?'Source set. Scheduled transit coverage is limited to Nagpur.':'Current location set as Source.');
      await rpc('center',point);
    }catch(e:unknown){if(current())setError(e instanceof Error?e.message:'Location could not be read. Please retry.')}
    finally{if(run===sourceRequest.current){sourceBusy.current=false;setLocating(false)}}
  },[rpc]);
  useEffect(()=>{if(appSuspended||!auth.user){sourceRequest.current++;sourceBusy.current=false;setLocating(false)}},[appSuspended,auth.user?.id]);
  useEffect(()=>()=>{sourceRequest.current++;sourceBusy.current=false},[]);
  useEffect(()=>{if(pendingSourceShortcut&&ready&&auth.user&&appActive){setPendingSourceShortcut(false);void useCurrentSource()}},[pendingSourceShortcut,ready,auth.user?.id,appActive,useCurrentSource]);
  useEffect(()=>{let active=true;AsyncStorage.getItem('eco_move_touchless_gesture').then(v=>{if(active&&!gesturePreferenceTouched.current&&v!==null)setGestureEnabledState(v==='true')}).catch(()=>{});return()=>{active=false}},[]);
  const setGestureEnabled=(val:boolean)=>{gesturePreferenceTouched.current=true;setGestureEnabledState(val);if(val){Keyboard.dismiss();setCollapsed(true)}AsyncStorage.setItem('eco_move_touchless_gesture',String(val)).catch(()=>{})};
  const gestureRunning=gestureEnabled&&appActive&&ready&&!!auth.user&&!keyboard&&!picking&&(!panel||collapsed);
  const gestureRunningRef=useRef(gestureRunning);gestureRunningRef.current=gestureRunning;
  const onGestureEvent=useCallback((event:CameraEvent)=>{
    if(!gestureRunningRef.current)return;
    if(event.type==='zoom'){
      const delta=gestureZoom.current.push(event.delta);
      if(delta)void rpc('zoom',{delta}).catch(e=>setGestureStatus(s=>({...s,status:'error',message:e.message})));
    }else{
      if(event.status!=='tracking_active'||event.pinchState==='neutral')gestureZoom.current.reset();
      setGestureStatus(s=>s.status===event.status&&s.message===event.message&&s.pinchState===event.pinchState?s:{active:true,status:event.status,message:event.message,pinchState:event.pinchState});
    }
  },[rpc]);
  useEffect(()=>{
    gestureZoom.current.reset();
    setGestureStatus({active:gestureRunning,status:gestureRunning?'requesting_permission':'idle',message:gestureRunning?'Starting front camera…':'',pinchState:'none'});
  },[gestureRunning,gestureAttempt]);
  const loadAccount=useCallback(async()=>{if(!auth.user)return;await guard(async()=>{const [t,s,r,e]=await Promise.all([rpc<Ticket[]>('tickets'),rpc<any[]>('saved'),rpc<any[]>('recents'),rpc('rewards')]);setTickets(t);setSaved(s);setRecents(r);setEco(e)})},[auth.user?.id,rpc]);
  useEffect(()=>{if(auth.user?.id!==sessionId.current){sessionId.current=auth.user?.id;clearChatMemory();planSequence.current++;setPlanning(false);setEnriching(false);setTickets([]);setSaved([]);setRecents([]);setTicket(null);setJourneys([]);setEco({totalCo2SavedKg:0,greenTripsCount:0,claimedRewardIds:[]});if(auth.user)loadAccount();else {setAuthMode('welcome');setLiveRoute(null);setOrigin(null);setDestination(null);setAnchor(null);setCabResults(null);setStack(['home']);setTab('home')}}},[auth.user?.id]);
  useEffect(()=>{const a=Keyboard.addListener('keyboardDidShow',e=>setKeyboard(e.endCoordinates.height));const b=Keyboard.addListener('keyboardDidHide',()=>setKeyboard(0));const c=AppState.addEventListener('change',s=>{setAppActive(s==='active');setAppSuspended(s==='background');if(s!=='active')flushStorage().catch(e=>setError('Session could not be saved. '+e.message))});return()=>{a.remove();b.remove();c.remove()}},[]);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(keyboard){Keyboard.dismiss();return true}if(!auth.user&&authMode!=='welcome'){setAuthMode('welcome');return true}if(picking){setPicking(null);setCollapsed(false);return true}if(stack.length>1){back();return true}if(panel&&panel!=='home'){navigate('home');return true}if(panel){close();return true}return false});return()=>sub.remove()},[stack,keyboard,picking,auth.user,authMode]);
  const handleAuthUrl=useCallback(async(url:string)=>{if(isSourceShortcut(url)){setPendingSourceShortcut(true);return}if(!url.startsWith('ecomove://auth/'))return;await guard(()=>rpc('callback',{url}));if(url.includes('type=recovery'))setAuthMode('update')},[rpc]);
  useEffect(()=>{if(!ready)return;Linking.getInitialURL().then(u=>{if(u)return handleAuthUrl(u)}).catch(e=>setError(e.message));const sub=Linking.addEventListener('url',e=>handleAuthUrl(e.url));return()=>sub.remove()},[ready]);
  const google=()=>guard(async()=>{if(isRunningInExpoGo())throw Error('Google sign-in needs the installed Eco-Move app to receive its return link. You can use email/password sign-in in Expo Go.');const result=await rpc('oauth');const session=await WebBrowser.openAuthSessionAsync(result.data.url,'ecomove://auth/callback');if(session.type==='success')await handleAuthUrl(session.url)});
  const plan=async(o=origin,d=destination,pref=preference,time=departure)=>{if(!o||!d){setError('Choose your starting point and destination.');return;}Keyboard.dismiss();setOrigin(o);setDestination(d);setPreference(pref);setDeparture(time);const sequence=++planSequence.current;setPlanning(true);setError('');setNotice('');setSelected(0);
    await guard(async()=>{const parts=time.split(':');const departureMin=time==='now'?undefined:Number(parts[0])*60+Number(parts[1]);const result=await rpc('plan',{origin:o,destination:d,preference:pref,departureMin});if(sequence!==planSequence.current)return;setJourneys(result.journeys);setPlanning(false);
      if(!result.journeys.length){setNotice(result.error||'No scheduled transit connection.');setPlanning(true);const fallback=await rpc<Journey>('fallback',{origin:o,destination:d,departureTime:time});if(sequence!==planSequence.current)return;setJourneys([fallback]);return;}
      setEnriching(true);setCollapsed(false);
      try{const enriched=await Promise.all(result.journeys.map((j:Journey)=>rpc<Journey>('enrich',{journey:j,origin:o,destination:d,preference:pref})));if(sequence===planSequence.current)setJourneys(enriched);}catch{}
      if(sequence!==planSequence.current)return;await rpc('recordRecent',{origin:o,destination:d});setRecents(await rpc<any[]>('recents'));
    });if(sequence===planSequence.current){setPlanning(false);setEnriching(false);setCollapsed(false)}
  };
  const startPreset=(preset:any)=>{navigate('plan');void plan(preset.from,preset.to)};
  const selectJourney=(index:number)=>{setSelected(index);setCollapsed(false)};
  const directions=(point:Point)=>{setDestination(point);navigate('plan');if(origin)void plan(origin,point)};
  const saveJourney=()=>guard(async()=>{if(!origin||!destination||!journey)return;await rpc('save',{origin,destination,preference,totalTimeMin:journey.totalTimeMin,totalFareRs:journey.totalFareRs,totalDistanceM:journey.totalDistanceM,transitDistanceM:journey.transitDistanceM,walkDistanceM:journey.walkDistanceM,transfers:journey.transfers,co2g:journey.co2g,legs:journey.legs.map(({mode,line,busNumber,timeMin,from,to})=>({mode,line,busNumber,timeMin,from,to}))});await loadAccount();setNotice('Journey saved to your trips.')});
  useEffect(()=>{if(!ready||!auth.user)return;void rpc('map',mapPresentation(mapScene,{journey,origin,destination,isCurrentLocation:origin?.name==='Your location'||!!(origin&&sourcePoint.current&&origin.lat===sourcePoint.current.lat&&origin.lon===sourcePoint.current.lon),mapStyle,showNetwork,showBusStops,showMetroStations,picking:picking==='anchor'||picking==='place'?null:picking,nearbyMode:picking==='anchor'||panel==='nearby',nearbyAnchor:anchor,nearbyRadiusM:radius,nearbyMarkers:[...nearbyData.busStops,...nearbyData.metroStations],nearbyTab:nearbyTab==='buses'?'buses':'stops',nearbyLiveBuses:nearbyBuses,selectedNearbyBus:nearbyBus,liveRoute,liveTelemetry:telemetry,selectedLiveStop:liveStop,searchedLocation:searchedPlace,poiMarkers:pois,activePoiCategory:poiCategory,nearbyCabs:cabResults?.nearbyVehicles||[],cabPolyline:cabResults?.polyline||[],cabOrigin,cabDestination,cabOriginName:cabOrigin?.name,cabDestinationName:cabDestination?.name})).catch(e=>setError(e.message))},[ready,auth.user?.id,panel,mapScene,journey,origin,destination,mapStyle,showNetwork,showBusStops,showMetroStations,picking,anchor,radius,nearbyData,nearbyTab,nearbyBuses,nearbyBus,liveRoute,telemetry,liveStop,searchedPlace,pois,poiCategory,cabResults,cabOrigin,cabDestination]);
  useEffect(()=>{if(!anchor||!ready)return;let active=true;rpc('nearby',{anchor,radius}).then(result=>{if(active)setNearbyData(result)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[anchor,radius,ready]);
  useEffect(()=>{if(!anchor||!poiCategory||!ready){setPois([]);return;}let current=true;guard(async()=>{const result=await rpc<any[]>('pois',{anchor,category:poiCategory});if(current)setPois(result)});return()=>{current=false}},[anchor,poiCategory,ready]);
  const activeLive=useRef(liveRoute);activeLive.current=liveRoute;
  const refreshLive=useCallback(async()=>{if(!liveRoute)return;const result=await rpc('liveTelemetry',{ids:liveRoute.variant_route_ids?.length?liveRoute.variant_route_ids:[liveRoute.route_id],stopIds:liveRoute.stops.map((s:any)=>s.stop_id)});if(activeLive.current===liveRoute)setTelemetry(result)},[liveRoute,rpc]);
  useEffect(()=>{if(!liveRoute||!appActive)return;let live=true;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{if(live)await refreshLive()}catch{}finally{if(live)timer=setTimeout(poll,5000)}};poll();return()=>{live=false;clearTimeout(timer)}},[liveRoute,appActive]);
  useEffect(()=>{if(!anchor||nearbyTab!=='buses'||panel!=='nearby'||!appActive)return;let active=true;let timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const result=await rpc<any[]>('nearbyBuses',{anchor,radius});if(active)setNearbyBuses(result)}catch(e:any){if(active)setError(e.message)}finally{if(active)timer=setTimeout(poll,5000)}};poll().catch(()=>{});return()=>{active=false;clearTimeout(timer)}},[anchor,radius,nearbyTab,panel,appActive]);
  const track=async(route:any)=>{setLiveStop(null);setTelemetry(null);setLiveRoute(route);open('live');await guard(async()=>{const details=await rpc('liveDetails',{id:route.route_id});if(details&&activeLive.current?.route_id===route.route_id)setLiveRoute({...route,...details,isLiveEnriched:true})})};
  const book=(fromJourney=false)=>guard(async()=>{if(fromJourney&&journey){const legs=await rpc<TransitLeg[]>('transitLegs',{legs:journey.legs});setBookingLegs(legs);setLockedBooking(true)}else{setBookingLegs(null);setLockedBooking(false)}open('booking')});
  const showTicket=(t:Ticket)=>{setTicket(t);open('ticket')};
  const logout=()=>guard(async()=>{await rpc('logout');await flushStorage();navigate('home')});
  return {...runtime,voiceLanguage,setVoiceLanguage,appSuspended,tab,panel,stack,collapsed,setCollapsed,expanded,setExpanded,keyboard,origin,setOrigin,destination,setDestination,anchor,setAnchor,cabOrigin,setCabOrigin,cabDestination,setCabDestination,preference,setPreference,departure,setDeparture,journeys,setJourneys,selected,selectJourney,journey,planning,enriching,searchTarget,picking,setPicking,searchedPlace,setSearchedPlace,radius,setRadius,nearbyTab,setNearbyTab,nearbyData,nearbyBuses,nearbyBus,setNearbyBus,poiCategory,setPoiCategory,pois,setPois,liveRoute,setLiveRoute,telemetry,liveStop,setLiveStop,busQuery,setBusQuery,timetableQuery,setTimetableQuery,cabResults,setCabResults,mapStyle,setMapStyle,satelliteState,showBusStops,setShowBusStops,showMetroStations,setShowMetroStations,showNetwork,setShowNetwork,tickets,ticket,setTicket,saved,recents,eco,bookingLegs,lockedBooking,notice,setNotice,error,setError,locating,shakeEnabled,setShakeEnabled,motionStatus,assistantActive,setAssistantActive,toggleAssistant,useCurrentSource,gestureEnabled,setGestureEnabled,gestureStatus,gestureRunning,gestureAttempt,retryGesture,onGestureEvent,authMode,setAuthMode,open,navigate,back,close,search,choosePlace,pickMap,locate,plan,startPreset,directions,saveJourney,loadAccount,track,refreshLive,book,showTicket,logout,google,guard};
}
const Context=createContext<ReturnType<typeof useController>>(null!);
export function AppProvider({children}:{children:React.ReactNode}){const value=useController();return <Context.Provider value={value}>{children}</Context.Provider>}
export const useApp=()=>useContext(Context);
