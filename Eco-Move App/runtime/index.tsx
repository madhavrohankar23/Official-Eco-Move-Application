import React, {useEffect,useState,useRef,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import L from 'leaflet';
import MapView from '@/components/MapView';
import {AuthProvider,useAuth} from '@/context/AuthContext';
import {supabase} from '@/supabaseClient';
import * as routing from '@/lib/routing';
import * as places from '@/lib/placesSearch';
import * as nearby from '@/lib/nearby';
import * as poi from '@/lib/nagpurPlaces';
import * as live from '@/lib/liveBus';
import * as timetable from '@/lib/busTimetableService';
import * as ai from '@/lib/n8nAiService';
import * as uber from '@/lib/uberApi';
import * as ticketing from '@/lib/ticketing';
import * as tickets from '@/services/ticketService';
import * as saved from '@/services/savedJourneysService';
import * as recent from '@/services/recentJourneysService';
import * as rewards from '@/services/ecoRewardsService';
import {sendTicketConfirmationEmail,generateTicketEmailHtml} from '@/services/emailService';
import QRCode from 'qrcode';
import {POPULAR_SAVED_PLACES,POPULAR_ROUTE_PRESETS,REWARD_MILESTONES,getUberDeepLink,ticketQrPayload,paymentQrPayload} from './source-constants';
import {issueFromSource} from './source-issue';
import {satelliteController} from './satellite';
import {N8N_CONFIG} from '../src/generated/serviceConfig';
import {voiceCommand,cancelVoice} from './voice';
import {searchVoicePlaces} from './voicePlaces';
const PreservedMap = React.memo(MapView);

let viewport={top:100,bottom:120,left:0};
let reduceMapMotion=false;
L.Map.addInitHook(function(this:L.Map){
  window.EcoMap=this;
  // Camera padding is presentation only. All geographic data and plotting stay in MapView.
  const fit=this.fitBounds.bind(this),fly=this.flyTo.bind(this);
  this.fitBounds=(bounds:any,options:any={})=>fit(bounds,{...options,...(reduceMapMotion?{animate:false}:{}),paddingTopLeft:[viewport.left+24,viewport.top],paddingBottomRight:[24,Math.min(viewport.bottom,this.getSize().y*.7)]});
  this.flyTo=(center:any,zoom?:number,options?:any)=>{const z=zoom??this.getZoom();const p=this.project(L.latLng(center),z);const adjusted=this.unproject(L.point(p.x-viewport.left/2,p.y+(viewport.bottom-viewport.top)/2),z);return reduceMapMotion?this.setView(adjusted,z,{animate:false}):fly(adjusted,z,options)};
  this.whenReady(()=>{window.EcoSatellite=satelliteController(this,import.meta.env.VITE_GOOGLE_MAPS_API_KEY||'',value=>window.EcoSend({type:'mapEvent',name:'satelliteState',value}));});
  const outside=(e:L.LeafletMouseEvent)=>{
    const target=e.originalEvent?.target as Element|null;
    if(target?.closest?.('.leaflet-interactive,.leaflet-marker-icon,.leaflet-popup,.leaflet-control'))return;
    window.EcoSend({type:'mapEvent',name:'backgroundTap',value:null});
  };
  this.on('click',outside);
  this.on('unload',()=>{this.off('click',outside);window.EcoSatellite?.destroy();});
});
const send=window.EcoSend;
const initialMap={journey:null,origin:null,destination:null,showNetwork:false,showBusStops:false,showMetroStations:false,mapStyle:'carto',nearbyMarkers:[],poiMarkers:[]};
function Engine(){
  const auth=useAuth();
  const [props,setProps]=useState<any>(initialMap);
  const currentProps=useRef(props);currentProps.current=props;
  useEffect(()=>{send({type:'auth',user:auth.user,profile:auth.profile,loading:auth.loading,isDemoUser:auth.isDemoUser})},[auth.user,auth.profile,auth.loading]);
  useEffect(()=>{
    const userId=()=>{if(!auth.user)throw new Error('Please sign in to continue.');return auth.user.id;};
    const actions:Record<string,(a:any)=>any>={
      bootstrap:()=>({stats:routing.networkStats,places:POPULAR_SAVED_PLACES,presets:POPULAR_ROUTE_PRESETS,rewards:REWARD_MILESTONES,metroLines:ticketing.NAGPUR_METRO_LINES,busRoutes:ticketing.getAvailableBusRoutes()}),
      demo:()=>auth.loginAsDemoUser(),
      login:a=>a.method==='phone'?auth.signInWithPhone(a.contact,a.password):auth.signInWithEmail(a.contact,a.password),
      signup:a=>a.method==='phone'?auth.signUpWithPhone(a.phone,a.password,a.name,a.email):auth.signUpWithEmail(a.email,a.password,a.name,a.phone),
      verify:a=>a.method==='phone'?auth.verifyOtp(a.contact,a.code):auth.verifyEmailOtp(a.contact,a.code),
      resend:a=>a.method==='phone'?supabase.auth.resend({type:'signup',phone:a.contact}):auth.resendSignupOtp(a.contact),
      reset:a=>supabase.auth.resetPasswordForEmail(a.email,{redirectTo:a.redirectTo}),
      updatePassword:a=>auth.updatePassword(a.password),
      oauth:()=>supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:'ecomove://auth/callback',skipBrowserRedirect:true}}),
      callback:async a=>{
        const url=new URL(a.url);const p=new URLSearchParams(url.hash.slice(1)||url.search.slice(1));
        if(p.get('error_description'))throw Error(p.get('error_description')!);
        if(p.get('access_token'))return supabase.auth.setSession({access_token:p.get('access_token')!,refresh_token:p.get('refresh_token')!});
        if(p.get('code'))return supabase.auth.exchangeCodeForSession(p.get('code')!);
        throw Error('The sign-in link has no session. Please request a fresh link.');
      },
      logout:()=>auth.signOut(),
      profile:a=>auth.updateUserProfile(a),
      searchLocal:a=>places.searchLocalPlaces(a.query,20),
      voicePlaces:a=>searchVoicePlaces(a.query),
      searchOnline:a=>places.searchOnlinePlaces(a.query),
      plan:async a=>{userId();return routing.planJourney(a.origin,a.destination,a.preference,a.departureMin)},
      enrich:async a=>{userId();try{return await Promise.race([routing.enrichWalkLegs(a.journey,a.origin,a.destination,a.preference),new Promise<any>(r=>setTimeout(()=>r(a.journey),3500))])}catch{return a.journey}},
      fallback:a=>routing.planFallbackDrivingJourney(a.origin,a.destination,a.departureTime||'now'),
      recordRecent:a=>recent.recordUserRecentJourney(userId(),a.origin,a.destination),
      saved:()=>saved.fetchUserSavedJourneys(userId()),
      save:a=>saved.addUserSavedJourney(userId(),a),
      deleteSaved:a=>saved.deleteUserSavedJourney(userId(),a.id),
      recents:()=>recent.fetchUserRecentJourneys(userId()),
      clearRecents:()=>recent.clearUserRecentJourneys(userId()),
      nearby:a=>nearby.findNearby(a.anchor,a.radius),
      pois:a=>poi.fetchLiveNearbyPOIs(a.anchor.lat,a.anchor.lon,a.category,30),
      cityPois:a=>poi.fetchNagpurWidePOIs(a.anchor.lat,a.anchor.lon,a.category),
      localPois:a=>poi.findNearestPOIs(a.anchor.lat,a.anchor.lon,a.category,30),
      liveSearch:a=>live.searchLiveBusRoutes(a.query,a.limit||30),
      liveDetails:a=>live.fetchLiveRouteDetails(a.id),
      liveTelemetry:a=>live.fetchLiveRouteInfo(a.ids,a.stopIds),
      nearbyBuses:a=>live.fetchNearbyLiveBuses(a.anchor.lat,a.anchor.lon,a.radius),
      timetable:a=>timetable.getBusTimetable(a.busNumber,a.routeName,a.fromStop,a.toStop),
      cabs:a=>uber.findUberCabOptions(a.origin.lat,a.origin.lon,a.destination.lat,a.destination.lon),
      cabLink:a=>getUberDeepLink(a.origin,a.destination,a.product),
      chat:a=>ai.askAiTransitChatbot(a.query,a.context,N8N_CONFIG.production),
      intent:a=>ai.executeAiSearchQuery(a.query,a.location,N8N_CONFIG.production),
      voice:a=>{userId();return voiceCommand(a)},
      voiceCancel:a=>cancelVoice(a.id),
      explain:a=>ai.explainRouteWithN8n(a.journey,a.origin,a.destination,N8N_CONFIG.production,a.index,a.language),
      compare:a=>ai.compareRoutesWithN8n(a.journeys,a.origin,a.destination,N8N_CONFIG.production,a.language),
      clearExplanation:a=>{ai.clearCachedRouteExplanation(a.journey,a.origin,a.destination,a.index,a.language);return true},
      clearComparison:a=>{ai.clearCachedRouteComparison(a.journeys,a.origin,a.destination,a.language);return true},
      tickets:()=>tickets.fetchUserTickets(userId()),
      deleteTicket:a=>tickets.deleteUserTicket(userId(),a.id),
      transitLegs:a=>ticketing.convertJourneyLegsToTransitLegs(a.legs),
      fare:a=>ticketing.calculateMultiLegFareSummary(a),
      issue:async a=>{userId();return issueFromSource({...a,txnRef:ticketing.generateTransactionRef(),fareSummary:ticketing.calculateMultiLegFareSummary({category:a.selectedCategory,legs:a.legs,passengers:a.passengers})},auth)},
      scan:async a=>{userId();const t=(await tickets.fetchUserTickets(userId())).find(t=>t.id===a.id);if(!t)throw Error('Ticket not found');if(t.status!=='active'||t.currentLegStep==='completed')throw Error('This pass is no longer active.');ticketing.saveIssuedTicket(t);const r=ticketing.simulateGateScan(a.id);if(r.updatedTicket)await tickets.saveUserTicket(userId(),r.updatedTicket);return r},
      qr:a=>QRCode.toDataURL(a.payload,{width:560,margin:2,errorCorrectionLevel:'M'}),
      ticketQr:a=>QRCode.toDataURL(JSON.stringify(ticketQrPayload(a.ticket,a.ticket.status==='used'||a.ticket.currentLegStep==='completed'),null,2),{width:560,margin:2,errorCorrectionLevel:'M'}),
      paymentQr:a=>QRCode.toDataURL(paymentQrPayload(a.fare,a.source,a.destination),{width:440,margin:1,errorCorrectionLevel:'M'}),
      ticketHtml:async a=>generateTicketEmailHtml({recipientEmail:auth.user?.email||'',userName:auth.profile?.fullName||'Commuter',ticket:a.ticket,qrCodeDataUrl:await QRCode.toDataURL(a.ticket.qrPayload,{width:280,margin:1})}),
      email:a=>sendTicketConfirmationEmail({recipientEmail:a.recipient,userName:auth.profile?.fullName,ticket:a.ticket}),
      rewards:()=>rewards.fetchUserEcoStats(userId()),
      claim:a=>rewards.claimUserRewardMilestone(userId(),a.id),
      map:a=>{setProps((p:any)=>{let changed=false;const next={...p};for(const key of Object.keys(a)){const same=JSON.stringify(p[key])===JSON.stringify(a[key]);next[key]=same?p[key]:a[key];changed=changed||!same;}return changed?next:p});return true},
      appearance:a=>{reduceMapMotion=!!a.reduceMotion;const root=document.documentElement;for(const [key,value]of Object.entries(a.colors||{}))root.style.setProperty('--eco-'+key,String(value));root.style.setProperty('--eco-safe-bottom',`${Math.max(0,Number(a.safeBottom)||0)}px`);root.dataset.contrast=a.contrast>=50?'enhanced':'standard';return true},
      zoom:a=>{window.EcoMap?.setZoom(window.EcoMap.getZoom()+a.delta);return true},
      center:a=>{window.EcoMap?.flyTo([a.lat,a.lon],a.zoom||15,{duration:.6});return true},
      resize:()=>{setTimeout(()=>window.EcoMap?.invalidateSize({pan:false}),100);return true},
      viewport:a=>{viewport=a;window.EcoMap?.invalidateSize({pan:false});if(a.fit){const p=currentProps.current;const points=a.fit==='live'?p.liveRoute?.polyline:a.fit==='cabs'?p.cabPolyline:p.journey?.legs.flatMap((l:any)=>l.path.map((v:any)=>[v.lat,v.lon]));if(points?.length>1)window.EcoMap?.fitBounds(points,{animate:false});}return true},
    };
    window.EcoReceive=async m=>{
      if(m.type==='httpResult'){window.dispatchEvent(new CustomEvent('eco-http',{detail:m}));return;}
      if(m.type!=='rpc')return;
      try{const fn=actions[m.method];if(!fn)throw Error('Unknown app action');const result=await fn(m.args||{});if(result?.error&&['login','signup','verify','resend','reset','updatePassword','oauth','callback','profile'].includes(m.method))throw Error(result.error.message||String(result.error));send({type:'result',id:m.id,value:result??null})}
      catch(e:any){send({type:'result',id:m.id,error:e?.message||String(e)})}
    };
  },[auth]);
  useEffect(()=>{send({type:'ready'});return()=>{}},[]);
  useEffect(()=>{void window.EcoSatellite?.select(props.mapStyle==='satellite',props.mapStyle!=='roadmap')},[props.mapStyle]);
  const events=useMemo(()=>{const event=(name:string)=>(value:any)=>send({type:'mapEvent',name,value});return {onMapClick:event('pick'),onSelectNearbyBus:event('nearbyBus'),onSelectLiveStop:event('liveStop'),onSelectBusTimetable:event('timetable'),onDirectionsToSearchedLocation:event('directions'),onDirectionsToPoi:event('directions')}},[]);
  return <PreservedMap {...props} mapStyle={props.mapStyle==='satellite'?'carto':props.mapStyle} {...events}/>;
}
export function mount(){createRoot(document.getElementById('root')!).render(<AuthProvider><Engine/></AuthProvider>)}
