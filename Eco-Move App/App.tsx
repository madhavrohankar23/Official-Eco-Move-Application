import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {ActivityIndicator,Animated,Keyboard,StyleSheet,useWindowDimensions,View} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {BlurTargetView} from 'expo-blur';
import {LinearGradient} from 'expo-linear-gradient';
import {Camera,CameraOff,Compass,Layers,Leaf,LocateFixed,Mic,Minus,Plus,X} from 'lucide-react-native';
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
import {HomeScreen,PlanScreen} from './src/screens/HomePlan';
import {SearchScreen} from './src/screens/SearchScreen';
import {NearbyScreen,LayersScreen,LiveScreen,TimetableScreen,CabsScreen} from './src/screens/DiscoverScreens';
import {TripsScreen,BookingScreen,TicketScreen} from './src/screens/TicketScreens';
import {ProfileScreen,HistoryScreen,RewardsScreen,ImpactScreen,SettingsScreen} from './src/screens/AccountScreens';
import {ChatScreen,ExplainScreen} from './src/screens/AiScreens';
import {panelLayout} from './src/layout';
const titles={home:'Good to go.',plan:'Your way through Nagpur',nearby:'Around you',trips:'Your journeys',profile:'A little more you',search:'Find your place',layers:'Your map, your view',live:'The city in motion',timetable:'Know your bus',cabs:'The last mile',chat:'SafarBot',explain:'A clearer journey',rewards:'Green rewards',impact:'Your impact',saved:'Saved journeys',recents:'Recent journeys',booking:'Your travel pass',ticket:'Your digital pass',settings:'Profile & preferences'};
function PanelContent(){const {panel}=useApp();switch(panel){case'home':return <HomeScreen/>;case'plan':return <PlanScreen/>;case'nearby':return <NearbyScreen/>;case'trips':return <TripsScreen/>;case'profile':return <ProfileScreen/>;case'search':return <SearchScreen/>;case'layers':return <LayersScreen/>;case'live':return <LiveScreen/>;case'timetable':return <TimetableScreen/>;case'cabs':return <CabsScreen/>;case'chat':return <ChatScreen/>;case'explain':return <ExplainScreen/>;case'rewards':return <RewardsScreen/>;case'impact':return <ImpactScreen/>;case'saved':return <HistoryScreen saved/>;case'recents':return <HistoryScreen/>;case'booking':return <BookingScreen/>;case'ticket':return <TicketScreen/>;case'settings':return <SettingsScreen/>;default:return null}}
function AppSurface(){const app=useApp();const t=useTheme();const safe=useSafeAreaInsets();const {width,height}=useWindowDimensions();const fade=useRef(new Animated.Value(1)).current;const panel=app.panel;const authVisible=!app.auth.user||app.authMode==='update';const footerInset=app.mapStyle==='satellite'?54:0;const layout=panelLayout(width,height,safe.bottom,app.keyboard,app.expanded,app.collapsed,safe.top,footerInset);
  useEffect(()=>{if(app.ready)void app.rpc('appearance',{reduceMotion:t.reduceMotion,contrast:t.contrastLevel,colors:t.c,safeBottom:safe.bottom}).catch(()=>{})},[app.ready,t.reduceMotion,t.contrastLevel,t.dark,t.appearance,safe.bottom]);
  useLayoutEffect(()=>{fade.stopAnimation();fade.setValue(t.reduceMotion?1:.96);const motion=Animated.timing(fade,{toValue:1,duration:t.reduceMotion?0:180,useNativeDriver:true,isInteraction:false});motion.start();return()=>motion.stop()},[panel,t.reduceMotion]);
  useEffect(()=>{if(app.ready)app.rpc('viewport',{fit:app.collapsed&&['plan','live','cabs'].includes(panel||'')?panel:undefined,top:app.keyboard?20:safe.top+104,bottom:panel&&!layout.landscape?layout.height+layout.bottom+10:safe.bottom+105+footerInset,left:panel&&layout.landscape?(layout.width||0)+26:0}).catch(()=>{})},[app.ready,width,height,panel,app.collapsed,app.expanded,app.keyboard,safe.bottom,footerInset]);
  return <View style={{flex:1,backgroundColor:t.c.paper}}>
    <StatusBar style={t.dark?'light':'dark'}/>
    <BlurTargetView ref={t.blurRef} style={StyleSheet.absoluteFill}>
      <RuntimeMap ref={app.mapRef} onMessage={app.onMessage}/>
      {t.dark&&<View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#092c2314'}]}/>}
      <LinearGradient pointerEvents="none" colors={t.dark?['#10271fd5','#10271f00']:['#edf5eff0','#edf5ef00']} style={{position:'absolute',top:0,left:0,right:0,height:safe.top+140}}/>
      <LinearGradient pointerEvents="none" colors={t.dark?['#10271f00','#10271f65']:['#edf5ef00','#edf5ef55']} style={{position:'absolute',bottom:0,left:0,right:0,height:safe.bottom+110}}/>
    </BlurTargetView>
    {authVisible?<AuthScreen/>:<>
      {!app.keyboard&&<View pointerEvents="box-none" style={{position:'absolute',top:safe.top+12,left:20,right:20,gap:14}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Glass level={1} style={{borderRadius:22,flexShrink:1}}><View style={{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7}}>
            <Leaf size={19} color={t.c.accent} strokeWidth={1.6}/><Copy size={18} weight="600">eco-move</Copy><Copy size={9} muted weight="600" style={{letterSpacing:1.7,marginLeft:2}}>NAGPUR</Copy>
          </View></Glass><View style={{flex:1}}/>
          <Pressable accessibilityLabel="Open profile" accessibilityRole="button" onPress={()=>app.navigate('profile')} style={{borderRadius:22}}>
            {({pressed})=><Glass level={1} state={pressed?'pressed':'default'} style={{width:44,height:44,borderRadius:22}}><View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Copy weight="600" size={15}>{(app.auth.profile?.fullName||app.auth.user?.user_metadata?.full_name||'N')[0]}</Copy></View></Glass>}
          </Pressable>
        </View>
        {!app.picking&&<SearchGlass style={layout.landscape&&panel?{marginLeft:(layout.width||0)+10}:undefined} onPress={()=>app.search('place')} label={app.searchedPlace?.name||'Where would you like to go?'}/>}
      </View>}
      {!app.keyboard&&!app.picking&&(!panel||app.collapsed||!app.expanded)&&<View style={{position:'absolute',top:safe.top+134,right:17,gap:8}}><View style={{flexDirection:'row',gap:8}}><IconButton label="Map layers" icon={Layers} onPress={()=>app.open('layers')}/><IconButton label="Locate me on map" icon={LocateFixed} onPress={()=>app.locate(panel==='nearby'?'anchor':'origin')}/></View><View style={{flexDirection:'row',gap:8}}><IconButton label="Zoom out" icon={Minus} onPress={()=>app.guard(()=>app.rpc('zoom',{delta:-1}))}/><IconButton label="Zoom in" icon={Plus} onPress={()=>app.guard(()=>app.rpc('zoom',{delta:1}))}/></View><View style={{flexDirection:'row',justifyContent:'flex-end',gap:8}}><IconButton label={app.assistantActive?'Stop voice assistant':'Open voice assistant'} icon={Mic} onPress={app.toggleAssistant}/><IconButton label={app.gestureEnabled?'Turn off touchless map control':'Turn on touchless map control'} icon={app.gestureEnabled?Camera:CameraOff} onPress={()=>app.setGestureEnabled(!app.gestureEnabled)}/></View></View>}
      {app.picking&&<View style={{position:'absolute',top:safe.top+70,left:18,right:18}}><Glass level={4} style={{borderRadius:23}}><View style={{paddingHorizontal:17,paddingVertical:10,flexDirection:'row',gap:8,alignItems:'center'}}><MapPinIcon color={t.c.accent} size={20}/><Copy size={14} weight="500" style={{flex:1}}>Tap the map to choose {app.picking.includes('origin')?'your starting point':app.picking==='anchor'?'an area':'a location'}.</Copy><Pressable accessibilityLabel="Cancel map selection" accessibilityRole="button" onPress={()=>{app.setPicking(null);app.setCollapsed(false)}} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><X size={20} color={t.c.ink}/></Pressable></View></Glass></View>}
      {panel&&<Sheet footerInset={footerInset} contentKey={panel} title={titles[panel]} subtitle={app.picking?'Map selection is active':panel==='home'?'LESS RUSH. MORE POSSIBILITY.':undefined} collapsed={app.collapsed} expanded={app.expanded} keyboard={app.keyboard} onCollapse={()=>{Keyboard.dismiss();app.setCollapsed(true)}} onExpand={()=>{app.setCollapsed(false);app.setExpanded(!app.expanded)}} onClose={app.close} onBack={app.stack.length>1?app.back:undefined} command={['search','booking','ticket','chat'].includes(panel)}><Animated.View style={{opacity:fade,transform:[{translateY:fade.interpolate({inputRange:[.96,1],outputRange:[4,0],extrapolate:'clamp'})}],gap:15}}>{app.error?<Notice error>{app.error}</Notice>:null}{app.runtimeError?<Notice error>{app.runtimeError}</Notice>:null}<PanelContent/></Animated.View></Sheet>}
      {!panel&&app.searchedPlace&&<View style={{position:'absolute',bottom:safe.bottom+108+footerInset,left:20,right:20}}><Glass level={2}><View style={{padding:18,gap:12}}><Copy size={21} weight="500">{app.searchedPlace.name}</Copy><Action label="Directions here" icon={Compass} selected onPress={()=>app.directions(app.searchedPlace!)}/></View></Glass></View>}
      {!panel&&!app.searchedPlace&&<View style={{position:'absolute',bottom:safe.bottom+108+footerInset,left:20,right:20,alignItems:'center'}}><Action label="Explore Nagpur" icon={Compass} onPress={()=>app.navigate('home')} compact/></View>}
      <LiquidNav footerInset={footerInset} tab={app.tab} onSelect={app.navigate} hidden={!!app.keyboard||!!app.picking}/>
      {app.gestureRunning&&<View style={{position:'absolute',top:safe.top+(height<500?10:126),left:16,zIndex:20}}><TouchlessControl/></View>}
      {!app.ready&&<View style={[StyleSheet.absoluteFill,{backgroundColor:t.c.paper+'e8',alignItems:'center',justifyContent:'center',gap:15}]}>{app.runtimeError?<View style={{padding:24,gap:16,maxWidth:420}}><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></View>:<><ActivityIndicator color={t.c.accent}/><Copy>Preparing your city…</Copy></>}</View>}
    </>}
  </View>;
}
const MapPinIcon=LocateFixed;
export default function App(){return <SafeAreaProvider><ThemeProvider><AppProvider><AppSurface/></AppProvider></ThemeProvider></SafeAreaProvider>}
