import React, {memo} from 'react';
import {Pane, Polyline, CircleMarker, Tooltip} from 'react-leaflet';
import data from '../../../protected/src/data/nagpur_safe_corridors.json';

/** Dataset overlays on the existing map, below the selected journey. No safety claims. */
export const SafetyCorridors = memo(function SafetyCorridors() {
  return <Pane name="safety-corridors" style={{zIndex:390}}>
    {data.lit_arterial_corridors.map(corridor => <React.Fragment key={corridor.id}>
      <Polyline positions={corridor.spine_waypoints as [number,number][]} pathOptions={{color:'#10b981',weight:14,opacity:.24,interactive:false}}/>
      <Polyline positions={corridor.spine_waypoints as [number,number][]} pathOptions={{color:'#059669',weight:4.5,opacity:.95}}>
        <Tooltip>{corridor.name} · supplied corridor dataset; current conditions unverified</Tooltip>
      </Polyline>
    </React.Fragment>)}
    {data.guardian_anchors.map(anchor => <CircleMarker key={anchor.id} center={[anchor.lat,anchor.lon]} radius={5}
      pathOptions={{color:'#ffffff',weight:1.5,fillColor:anchor.type.includes('police')?'#6366f1':'#059669',fillOpacity:.9}}>
      <Tooltip>{anchor.name} · listed support location; availability unverified</Tooltip>
    </CircleMarker>)}
  </Pane>;
});
