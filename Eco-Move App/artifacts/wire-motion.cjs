const fs=require('fs');
function edit(file, changes){let s=fs.readFileSync(file,'utf8');for(const [from,to] of changes){if(!s.includes(from))throw Error(file+': missing '+from);s=s.replace(from,to);}fs.writeFileSync(file,s);}
edit('src/AppContext.tsx',[
 ["useState<'carto'|'roadmap'>", "useState<'carto'|'roadmap'|'satellite'>"],
 ["  const choosePlaceRef=", "  const [satelliteState,setSatelliteState]=useState<{status:'idle'|'loading'|'ready'|'error';message?:string}>({status:'idle'});\n  const outsideRef=useRef(()=>{});\n  outsideRef.current=()=>{if(!picking&&panel&&!collapsed){Keyboard.dismiss();setCollapsed(true)}};\n  const choosePlaceRef="],
 ["    if(name==='pick')", "    if(name==='backgroundTap')outsideRef.current();\n    else if(name==='satelliteState'){setSatelliteState(value);if(value.status==='error')setMapStyle(style=>style==='satellite'?'carto':style)}\n    else if(name==='pick')"],
 ["cabResults,setCabResults,mapStyle,setMapStyle,showBusStops", "cabResults,setCabResults,mapStyle,setMapStyle,satelliteState,showBusStops"]
]);
edit('App.tsx',[
 ["const layout=panelLayout(width,height,safe.bottom,app.keyboard,app.expanded,app.collapsed,safe.top);", "const footerInset=app.mapStyle==='satellite'?34:0;const layout=panelLayout(width,height,safe.bottom,app.keyboard,app.expanded,app.collapsed,safe.top,footerInset);"],
 ["  useLayoutEffect(()=>{fade.stopAnimation()", "  useEffect(()=>{if(app.ready)void app.rpc('appearance',{reduceMotion:t.reduceMotion,contrast:t.contrastLevel,colors:t.c}).catch(()=>{})},[app.ready,t.reduceMotion,t.contrastLevel,t.dark,t.appearance]);\n  useLayoutEffect(()=>{fade.stopAnimation()"],
 ["safe.bottom+105,left:", "safe.bottom+105+footerInset,left:"],
 ["app.keyboard,safe.bottom]);", "app.keyboard,safe.bottom,footerInset]);"],
 ["<Sheet contentKey={panel}", "<Sheet footerInset={footerInset} contentKey={panel}"],
 ["<LiquidNav tab={app.tab}", "<LiquidNav footerInset={footerInset} tab={app.tab}"],
 ["bottom:safe.bottom+108,left:20,right:20}}", "bottom:safe.bottom+108+footerInset,left:20,right:20}}"],
 ["bottom:safe.bottom+108,left:20,right:20,alignItems", "bottom:safe.bottom+108+footerInset,left:20,right:20,alignItems"]
]);
edit('src/screens/DiscoverScreens.tsx',[
 ['      <ToggleRow\n', `      <Action label="Google Satellite" icon={Layers} selected={app.mapStyle === 'satellite'} loading={app.satelliteState.status === 'loading'} onPress={() => app.setMapStyle('satellite')} />
      <View style={{ minHeight: 20 }} accessibilityLiveRegion="polite">
        {app.satelliteState.status === 'loading' ? <Copy muted size={12}>Loading satellite imagery…</Copy> : app.satelliteState.status === 'error' ? <Notice error>{app.satelliteState.message}</Notice> : app.mapStyle === 'satellite' ? <Copy muted size={12}>Google Maps imagery · Routes and stops remain interactive.</Copy> : null}
      </View>
      <ToggleRow\n`]
]);
