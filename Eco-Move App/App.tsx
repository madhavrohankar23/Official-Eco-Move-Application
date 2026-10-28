import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ActivityIndicator,Animated,Keyboard,StyleSheet,useWindowDimensions,View} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {BlurTargetView} from 'expo-blur';
import {LinearGradient} from 'expo-linear-gradient';
import {Camera,CameraOff,Compass,Layers,LocateFixed,Mic,SlidersHorizontal,X} from 'lucide-react-native';
import {AppProvider,useApp} from './src/AppContext';
import {ThemeProvider,useTheme} from './src/theme';
import RuntimeMap from './src/platform/RuntimeMap';
import {Action,Copy,Glass,IconButton,Notice} from './src/components/Glass';
import {LiquidNav} from './src/components/LiquidNav';
import {Sheet} from './src/components/Sheet';
import {SearchGlass} from './src/components/SearchGlass';
import {TouchlessControl} from './src/components/TouchlessControl';
import {MotionPressable as Pressable} from './src/components/MotionPressable';
import {AuthScreen} from './src/screens/AuthScreen';
import {AuthEntrance} from './src/components/AuthMotion';
import {HomeScreen,PlanScreen} from './src/screens/HomePlan';
import {SearchScreen} from './src/screens/SearchScreen';
import {NearbyScreen,LayersScreen,LiveScreen,TimetableScreen,CabsScreen} from './src/screens/DiscoverScreens';
import {TripsScreen,BookingScreen,TicketScreen} from './src/screens/TicketScreens';
import {ProfileScreen,HistoryScreen,RewardsScreen,ImpactScreen,SettingsScreen} from './src/screens/AccountScreens';
import {ChatScreen,ExplainScreen} from './src/screens/AiScreens';
import {RoutePreviewScreen} from './src/features/routing/RoutePreviewScreen';
import {CommuterProfileScreen} from './src/features/profile/CommuterProfileScreen';
import {panelLayout} from './src/layout';
const titles={preview:'Explore your route',commuter:'Your daily commute',home:'Good to go.',plan:'Your way through Nagpur',nearby:'Around you',trips:'Your journeys',profile:'A little more you',search:'Find your place',layers:'Your map, your view',live:'The city in motion',timetable:'Know your bus',cabs:'The last mile',chat:'SafarBot',explain:'A clearer journey',rewards:'Green rewards',impact:'Your impact',saved:'Saved journeys',recents:'Recent journeys',booking:'Your travel pass',ticket:'Your digital pass',settings:'Profile & preferences'};
function PanelContent(){const {panel,searchTarget}=useApp();switch(panel){case'preview':return <RoutePreviewScreen/>;case'commuter':return <CommuterProfileScreen/>;case'home':return <HomeScreen/>;case'plan':return <PlanScreen/>;case'nearby':return <NearbyScreen/>;case'trips':return <TripsScreen/>;case'profile':return <ProfileScreen/>;case'search':return <SearchScreen key={searchTarget}/>;case'layers':return <LayersScreen/>;case'live':return <LiveScreen/>;case'timetable':return <TimetableScreen/>;case'cabs':return <CabsScreen/>;case'chat':return <ChatScreen/>;case'explain':return <ExplainScreen/>;case'rewards':return <RewardsScreen/>;case'impact':return <ImpactScreen/>;case'saved':return <HistoryScreen saved/>;case'recents':return <HistoryScreen/>;case'booking':return <BookingScreen/>;case'ticket':return <TicketScreen/>;case'settings':return <SettingsScreen/>;default:return null}}
function AppSurface(){const app=useApp();const t=useTheme();const safe=useSafeAreaInsets();const {width,height}=useWindowDimensions();const fade=useRef(new Animated.Value(1)).current;const panel=app.panel;const routeFocus=panel==='plan'&&app.routeResultsOpen;const [toolsOpen,setToolsOpen]=useState(false);const authVisible=!app.auth.user||app.authMode==='update';const footerInset=app.mapStyle==='satellite'?54:0;const layout=panelLayout(width,height,safe.bottom,app.keyboard,app.expanded,app.collapsed,safe.top,footerInset,routeFocus);
  useEffect(()=>{setToolsOpen(false)},[panel,app.keyboard,app.picking]);
  useEffect(()=>{if(app.ready)void app.rpc('appearance',{night:t.dark,reduceMotion:t.reduceMotion,contrast:t.contrastLevel,colors:t.c,safeBottom:safe.bottom}).catch(()=>{})},[app.ready,t.reduceMotion,t.contrastLevel,t.dark,t.appearance,safe.bottom]);
  useLayoutEffect(()=>{fade.stopAnimation();fade.setValue(t.reduceMotion?1:.96);const motion=Animated.timing(fade,{toValue:1,duration:t.reduceMotion?0:180,useNativeDriver:true,isInteraction:false});motion.start();return()=>motion.stop()},[panel,t.reduceMotion]);
  useEffect(()=>{if(app.ready)app.rpc('viewport',{fit:(app.collapsed||routeFocus)&&['plan','live','cabs'].includes(panel||'')?panel:undefined,top:app.keyboard?20:safe.top+76,bottom:panel&&!layout.landscape?layout.height+layout.bottom+10:safe.bottom+105+footerInset,left:panel&&layout.landscape?(layout.width||0)+26:0}).catch(()=>{})},[app.ready,width,height,panel,app.collapsed,app.expanded,app.keyboard,safe.bottom,footerInset,routeFocus]);
  return <View style={{flex:1,backgroundColor:t.c.paper}}>
    <StatusBar style={t.dark?'light':'dark'}/>
    <BlurTargetView ref={t.blurRef} style={StyleSheet.absoluteFill}>
      <RuntimeMap ref={app.mapRef} onMessage={app.onMessage}/>
      {t.dark&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#092c2314'}]}/>}
      <LinearGradient pointerEvents="none" colors={t.dark?['#06121966','#06121900']:['#f9fcfa45','#f9fcfa00']} style={{position:'absolute',top:0,left:0,right:0,height:safe.top+82}}/>
      <LinearGradient pointerEvents="none" colors={t.dark?['#06121900','#06121935']:['#f9fcfa00','#f9fcfa25']} style={{position:'absolute',bottom:0,left:0,right:0,height:safe.bottom+110}}/>
    </BlurTargetView>
    {authVisible?<AuthScreen/>:<AuthEntrance>
      {!app.keyboard&&!routeFocus&&<View pointerEvents="box-none" style={{position:'absolute',top:safe.top+12,left:20,right:20,gap:14}}>
        {!app.picking&&<SearchGlass style={layout.landscape&&panel?{marginLeft:(layout.width||0)+10}:undefined} onPress={()=>app.search('place')} label={app.searchedPlace?.name||'Where would you like to go?'}/>}
      </View>}
      {!app.keyboard&&!routeFocus&&!app.picking&&(!panel||app.collapsed||!app.expanded)&&<View style={{position:'absolute',top:safe.top+76,right:17,gap:10,alignItems:'flex-end'}}>
        <IconButton label={toolsOpen?'Close map tools':'Open map tools'} icon={toolsOpen?X:SlidersHorizontal} onPress={()=>setToolsOpen(value=>!value)}/>
        {toolsOpen&&<View style={{width:98,height:98}}><AuthEntrance>
          <View style={{gap:10}}>
            <View style={{flexDirection:'row',gap:10}}><IconButton label="Map layers" icon={Layers} onPress={()=>app.open('layers')}/><IconButton label="Locate me on map" icon={LocateFixed} onPress={()=>app.locate(panel==='nearby'?'anchor':'origin')}/></View>
            <View style={{flexDirection:'row',gap:10}}><IconButton label={app.assistantActive?'Stop voice assistant':'Open voice assistant'} icon={Mic} onPress={app.toggleAssistant}/><IconButton label={app.gestureEnabled?'Turn off touchless map control':'Turn on touchless map control'} icon={app.gestureEnabled?Camera:CameraOff} onPress={()=>app.setGestureEnabled(!app.gestureEnabled)}/></View>
          </View>
        </AuthEntrance></View>}
      </View>}
      {app.picking&&<View style={{position:'absolute',top:safe.top+12,left:18,right:18}}><Glass level={4} style={{borderRadius:23}}><View style={{paddingHorizontal:17,paddingVertical:10,flexDirection:'row',gap:8,alignItems:'center'}}><MapPinIcon color={t.c.accent} size={20}/><Copy size={14} weight="500" style={{flex:1}}>Tap the map to choose {app.picking.includes('origin')?'your starting point':app.picking==='anchor'?'an area':'a location'}.</Copy><Pressable accessibilityLabel="Cancel map selection" accessibilityRole="button" onPress={()=>{app.setPicking(null);app.setCollapsed(false)}} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><X size={20} color={t.c.ink}/></Pressable></View></Glass></View>}
      {panel&&<Sheet footerInset={footerInset} routeFocus={routeFocus} contentKey={panel+(routeFocus?':results':'')} title={routeFocus?'Available routes':titles[panel]} subtitle={routeFocus?(app.origin&&app.destination?`${app.origin.name} → ${app.destination.name}`:undefined):app.picking?'Map selection is active':panel==='home'?(app.collapsed?'Tap a tab to explore':'LESS RUSH. MORE POSSIBILITY.'):undefined} collapsed={app.collapsed} expanded={app.expanded} keyboard={app.keyboard} onCollapse={()=>{Keyboard.dismiss();app.setCollapsed(true)}} onExpand={()=>{app.setCollapsed(false);app.setExpanded(!app.expanded)}} onClose={routeFocus?app.dismissRouteResults:panel==='search'?app.back:app.close} onBack={app.stack.length>1?app.back:undefined} command={['search','booking','ticket','chat'].includes(panel)}><Animated.View style={{opacity:fade,transform:[{translateY:fade.interpolate({inputRange:[.96,1],outputRange:[4,0],extrapolate:'clamp'})}],gap:15}}>{app.error?<Notice error>{app.error}</Notice>:null}{app.runtimeError?<Notice error>{app.runtimeError}</Notice>:null}<PanelContent/></Animated.View></Sheet>}
      {!panel&&app.searchedPlace&&<View style={{position:'absolute',bottom:safe.bottom+108+footerInset,left:20,right:20}}><Glass level={2}><View style={{padding:18,gap:12}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Copy size={21} weight="500" style={{flex:1}} numberOfLines={1}>{app.searchedPlace.name}</Copy><Pressable accessibilityLabel="Clear selected place" accessibilityRole="button" onPress={()=>app.setSearchedPlace(null)} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><X size={18} color={t.c.ink}/></Pressable></View><Action label="Directions here" icon={Compass} selected onPress={()=>app.directions(app.searchedPlace!)}/></View></Glass></View>}
      {!panel&&!app.searchedPlace&&<View style={{position:'absolute',bottom:safe.bottom+108+footerInset,left:20,right:20,alignItems:'center'}}><Action label="Explore Nagpur" icon={Compass} onPress={()=>app.navigate('home')} compact/></View>}
      <LiquidNav footerInset={footerInset} tab={app.tab} onSelect={next=>{setToolsOpen(false);if(app.tab===next&&app.panel===next){Keyboard.dismiss();app.setCollapsed(!app.collapsed);app.setExpanded(false)}else app.navigate(next)}} hidden={!!app.keyboard||!!app.picking||routeFocus}/>
      {app.gestureRunning&&<View style={{position:'absolute',top:safe.top+(height<500?10:76),left:16,zIndex:20}}><TouchlessControl/></View>}
      {!app.ready&&<View style={[StyleSheet.absoluteFill,{backgroundColor:t.c.paper+'e8',alignItems:'center',justifyContent:'center',gap:15}]}>{app.runtimeError?<View style={{padding:24,gap:16,maxWidth:420}}><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></View>:<><ActivityIndicator color={t.c.accent}/><Copy>Preparing your city…</Copy></>}</View>}
    </AuthEntrance>}
  </View>;
}
const MapPinIcon=LocateFixed;
export default function App(){return <SafeAreaProvider><ThemeProvider><AppProvider><AppSurface/></AppProvider></ThemeProvider></SafeAreaProvider>}
