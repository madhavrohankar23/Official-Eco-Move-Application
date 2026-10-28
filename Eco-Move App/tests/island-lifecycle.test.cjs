const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
function load(file, globals = {}) {
  const box = { module: { exports: {} }, exports: {}, setTimeout, clearTimeout, URLSearchParams, AbortController, ...globals };
  vm.runInNewContext(esbuild.buildSync({entryPoints:[file],bundle:true,write:false,format:'cjs',packages:'external'}).outputFiles[0].text,box);
  return box.module.exports;
}
const {preferenceWriter} = load('src/preferenceWriter.ts');
test('system accessibility overrides material without reviving the removed contrast preference or leaking listeners',async()=>{
  const states=[],refs=[],effects=[],listeners={},reads=[],writes=[];let s=0,r=0,first=true;
  const createElement=(type,props,...children)=>({type,props:{...props,children}});
  const react={createContext:()=>({Provider:'theme'}),createElement,
    useState:initial=>{const i=s++;if(first)states[i]=initial;return [states[i],value=>{states[i]=value}]},
    useRef:initial=>{const i=r++;if(first)refs[i]={current:initial};return refs[i]},
    useEffect:fn=>{if(first)effects.push(fn)},
  };
  const listen=(name,fn)=>{listeners[name]=fn;return {remove:()=>delete listeners[name]}};
  const modules={react,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'react-native':{Platform:{OS:'ios'},View:'view',AppState:{addEventListener:listen},AccessibilityInfo:{isReduceMotionEnabled:async()=>true,isReduceTransparencyEnabled:async()=>false,addEventListener:listen}},
    '@react-native-async-storage/async-storage':{getItem:async key=>{reads.push(key);return key.includes('glass_appearance')?'matte':'100'},setItem:async(key,value)=>writes.push({key,value})}};
  const {ThemeProvider}=load('src/theme.tsx',{require:name=>{assert.ok(modules[name],name);return modules[name]}});
  const render=()=>{s=0;r=0;const result=ThemeProvider({children:'app'});first=false;return result.props.value};
  render();const cleanup=effects.map(fn=>fn());
  for(let i=0;i<8;i++)await Promise.resolve();
  let t=render();assert.equal(t.appearance,'matte');assert.equal(t.reduceMotion,true);assert.equal(t.contrastLevel,0);
  assert.ok(reads.every(key=>!key.includes('contrast')));
  listeners.reduceTransparencyChanged(true);assert.equal(render().contrastLevel,100);
  listeners.reduceTransparencyChanged(false);assert.equal(render().contrastLevel,0);
  t.setAppearance('liquid');listeners.change('background');for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(writes.at(-1).value,'liquid');assert.equal(writes.length,1);
  // The existing appearance control now persists independently of material and profile.
  assert.equal(render().dark,false);
  render().setDark(true);listeners.change('background');for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(render().dark,true);
  assert.deepEqual(writes.at(-1),{key:'@eco.theme.night_mode',value:'true'});
  cleanup.forEach(fn=>fn?.());assert.equal(Object.keys(listeners).length,0);
});
test('increasing contrast never dims dark text or lightens light-mode text',()=>{
  const {getThemedColors}=load('src/theme.tsx',{require:()=>({createContext:()=>({})})});
  const luminance=color=>color.slice(1).match(/../g).map(v=>parseInt(v,16)).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
  for(const dark of [true,false])for(const token of ['ink','muted']){
    let previous=luminance(getThemedColors(dark,0)[token]);
    for(let n=1;n<=100;n++){
      const current=luminance(getThemedColors(dark,n)[token]);
      assert.ok(dark?current>=previous:current<=previous,`${token} became weaker at ${n}%`);previous=current;
    }
  }
});
test('appearance persistence coalesces rapid choices, serializes writes and recovers after storage failure', async () => {
  const writes = [], releases = [];
  const writer = preferenceWriter(value => new Promise((resolve,reject) => { writes.push(value); releases.push({resolve,reject}); }),1000);
  for(const value of ['matte','solid','liquid'])writer.set(value);
  const first = writer.flush(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(writes,['liquid']);
  writer.set('solid'); const last = writer.flush();
  assert.deepEqual(writes,['liquid']);
  releases.shift().reject(Error('temporarily unavailable')); await first.catch(()=>{});
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(writes,['liquid','solid']); releases.shift().resolve(); await last;
  await writer.flush(); assert.equal(writes.length,2);
});

function harness(fetcher) {
  const elements=[];
  const element = () => {const e={style:{},children:[],textContent:'',appendChild(c){this.children.push(c)},remove(){this.removed=true}};elements.push(e);return e;};
  class Layer {
    constructor(url,options={}){this.url=url;this.options=options;this.events={};}
    once(name,fn){this.events[name]=fn;return this}
    on(name,fn){this.events[name]=fn;return this}
    off(){this.events={};return this}
    addTo(map){this.map=map;map.layers.add(this);map.zoomSubscribers.add(this);this.once('remove',()=>map.zoomSubscribers.delete(this));return this}
    remove(){this.events.remove?.();this.map?.layers.delete(this);this.map=null;return this}
  }
  class Control { addTo(map){this.el=this.onAdd();map.controls.add(this);this.map=map;return this}remove(){this.map?.controls.delete(this)} }
  const map={layers:new Set(),zoomSubscribers:new Set(),controls:new Set(),events:{},createPane:element,on(n,f){this.events[n]=f},off(n){delete this.events[n]},getBounds(){return {getNorth:()=>21.2,getSouth:()=>21.1,getEast:()=>79.2,getWest:()=>79.1}},getZoom:()=>13,eachLayer(fn){this.layers.forEach(fn)},hasLayer(l){return this.layers.has(l)},removeLayer(l){l.remove()}};
  const tiles=[];const L={TileLayer:Layer,Control,tileLayer:(u,o)=>{const l=new Layer(u,o);tiles.push(l);return l},DomUtil:{create:(_,__,parent)=>{const e=element();parent?.appendChild(e);return e}},DomEvent:{disableClickPropagation(){},disableScrollPropagation(){}}};
  const {satelliteController}=load('runtime/satellite.ts',{require:()=>L,document:{createElement:element},fetch:fetcher});
  const base=new Layer('original').addTo(map),states=[];
  const controller=satelliteController(map,'test-authorized-config',s=>states.push(s));
  return {map,base,states,tiles,controller,elements};
}
const session={session:'test-session',expiry:String(Math.floor(Date.now()/1000)+3600),tileWidth:256,tileHeight:256};
test('overlapping satellite metadata selects full-resolution coverage instead of upscaling world overview tiles',()=>{
  const {satelliteNativeZoom}=load('runtime/satellite.ts',{require:()=>({})});
  const bounds={getNorth:()=>21.2,getSouth:()=>21.1,getEast:()=>79.2,getWest:()=>79.1};
  const world={north:90,south:-90,east:180,west:-180};
  assert.equal(satelliteNativeZoom([{...world,maxZoom:19},{...world,maxZoom:9},{...world,maxZoom:14}],bounds),19);
  assert.equal(satelliteNativeZoom([{...world,maxZoom:19},{north:22,south:20,east:80,west:78,maxZoom:20}],bounds),20);
});
const ok = data => ({ok:true,json:async()=>data});
test('satellite preserves overlays, carries attribution, restores the original base and cleans listeners', async () => {
  const requests=[];
  const h=harness(async(url,options)=>{requests.push({url,options});return ok(url.includes('createSession')?session:{copyright:'Test imagery attribution',maxZoomRects:[{maxZoom:19}]})});
  const marker={id:'unchanged-route-marker'};h.map.layers.add(marker);
  await h.controller.select(true);
  assert.equal(h.states[0].status,'loading');assert.equal(h.tiles.length,1);
  assert.equal(new URL(requests[0].url).hostname,'tile.googleapis.com');
  assert.equal(JSON.parse(requests[0].options.body).mapType,'satellite');
  assert.ok(h.elements.some(e=>e.textContent.includes('Test imagery attribution')));
  h.tiles[0].events.load(); assert.equal(h.states.at(-1).status,'ready');
  assert.ok(h.map.hasLayer(marker));assert.ok(!h.map.hasLayer(h.base));
  await h.controller.select(false);assert.ok(h.map.hasLayer(h.base));assert.ok(h.map.hasLayer(marker));assert.equal(h.map.controls.size,0);
  assert.ok(!h.map.zoomSubscribers.has(h.tiles[0]),'Removed satellite layer must not receive future map zoom events');
  h.controller.destroy();assert.equal(Object.keys(h.map.events).length,0);
});
test('switching away during satellite authorization aborts work and prevents late tiles or attribution', async () => {
  let resolve,signal;
  const h=harness((url,options)=>{signal=options.signal;return new Promise(r=>{resolve=r})});
  const pending=h.controller.select(true);await h.controller.select(false);
  assert.ok(signal.aborted);resolve(ok(session));await pending;
  assert.equal(h.tiles.length,0);assert.equal(h.map.controls.size,0);assert.ok(h.map.hasLayer(h.base));assert.equal(h.states.at(-1).status,'idle');h.controller.destroy();
});
test('satellite authorization failure and imagery failure restore a usable base map', async () => {
  const denied=harness(async()=>({ok:false,status:403}));await denied.controller.select(true);
  assert.equal(denied.states.at(-1).status,'error');assert.ok(denied.map.hasLayer(denied.base));denied.controller.destroy();
  const h=harness(async url=>ok(url.includes('createSession')?session:{copyright:'Test attribution'}));await h.controller.select(true);
  h.tiles[0].events.load();h.tiles[0].events.tileerror();
  assert.equal(h.states.at(-1).status,'error');assert.ok(h.map.hasLayer(h.base));assert.equal(h.map.controls.size,0);h.controller.destroy();
});
test('valid empty copyright at overview zoom keeps Google attribution and satellite active',async()=>{
  const h=harness(async url=>ok(url.includes('createSession')?session:{copyright:'',maxZoomRects:[]}));
  await h.controller.select(true);h.tiles[0].events.load();
  assert.equal(h.states.at(-1).status,'ready');assert.ok(h.elements.some(e=>e.textContent==='Google Maps'));
  assert.equal(h.map.controls.size,1);h.controller.destroy();
});
