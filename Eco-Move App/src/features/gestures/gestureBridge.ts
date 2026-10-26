import type {PinchState,TrackingStatus} from './gestureTypes';
export type CameraEvent = {type:'status';status:TrackingStatus;message:string;pinchState:PinchState}|{type:'zoom';delta:number};
export type CameraProps = {onEvent:(event:CameraEvent)=>void};
export const gestureMessages:Record<TrackingStatus,string> = {
  idle:'Camera off', unsupported:'Camera control needs HTTPS or a supported app WebView.',
  requesting_permission:'Allow the front camera to begin.', permission_denied:'Camera access is blocked. Allow it in device or browser settings, then Retry.',
  model_loading:'Loading hand tracking…', no_hand:'Show thumb and index finger to the camera.',
  hand_detected:'Hand detected', calibrating:'Hold fingers slightly apart and steady…',
  tracking_active:'Spread to zoom in. Pinch to zoom out.', interrupted:'Camera paused. Tap Retry to resume.',
  error:'Camera tracking could not start. Tap Retry.'
};
export function parseCameraEvent(value:unknown):CameraEvent|null {
  if(!value||typeof value!=='object')return null;
  const e=value as any;
  if(e.type==='zoom'&&Number.isFinite(e.delta)&&Math.abs(e.delta)<=.6&&e.delta!==0)return {type:'zoom',delta:e.delta};
  if(e.type==='status'&&Object.hasOwn(gestureMessages,e.status)&&typeof e.message==='string'&&['none','neutral','pinching','spreading'].includes(e.pinchState))return {type:'status',status:e.status,message:e.message.slice(0,300),pinchState:e.pinchState};
  return null;
}
// Leaflet's zoomSnap=1 discards small deltas. Accumulate only intentional,
// same-direction movement, then emit a normal map zoom step.
export class GestureZoomAccumulator {
  private pending=0;
  push(delta:number){
    if(!Number.isFinite(delta)||Math.abs(delta)>.6)return 0;
    if(Math.sign(delta)!==Math.sign(this.pending))this.pending=0;
    this.pending+=delta;
    if(Math.abs(this.pending)<.3)return 0;
    const step=Math.sign(this.pending);this.pending=0;return step;
  }
  reset(){this.pending=0}
}
