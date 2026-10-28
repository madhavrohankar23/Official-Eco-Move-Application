// Match the source application's per-feature overlay visibility without clearing
// the saved native screen state when a sheet is dismissed or another one opens.
export function mapPresentation(scene:string,props:Record<string,any>){
  const plan=scene==='plan',nearby=scene==='nearby',live=scene==='live',cabs=scene==='cabs';
  return {...props,isSafeMode:plan&&props.isSafeMode,
    journey:plan?props.journey:null,origin:plan?props.origin:null,destination:plan?props.destination:null,
    nearbyAnchor:nearby?props.nearbyAnchor:null,nearbyMarkers:nearby?props.nearbyMarkers:[],
    nearbyLiveBuses:nearby?props.nearbyLiveBuses:[],selectedNearbyBus:nearby?props.selectedNearbyBus:null,
    poiMarkers:nearby?props.poiMarkers:[],activePoiCategory:nearby?props.activePoiCategory:null,
    liveRoute:live?props.liveRoute:null,liveTelemetry:live?props.liveTelemetry:null,selectedLiveStop:live?props.selectedLiveStop:null,
    nearbyCabs:cabs?props.nearbyCabs:[],cabPolyline:cabs?props.cabPolyline:[],
    cabOrigin:cabs?props.cabOrigin:null,cabDestination:cabs?props.cabDestination:null,
    cabOriginName:cabs?props.cabOriginName:undefined,cabDestinationName:cabs?props.cabDestinationName:undefined,
  };
}
