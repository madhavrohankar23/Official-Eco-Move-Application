// Native presentation types. The executable domain implementation is preserved in protected/.
export type Point={lat:number;lon:number;name:string};
export type Preference='balanced'|'fastest'|'cheapest'|'least_walk'|'fewest_transfers'|'low_co2';
export type Leg={mode:'walk'|'bus'|'metro'|'drive';line?:string;busNumber?:string;from:string;to:string;timeMin:number;distanceM:number;co2g:number;fareRs?:number;stops?:string[];path:Point[];departureTimeStr?:string;arrivalTimeStr?:string;waitMin?:number;nextDepartures?:string[];frequencyMin?:number;tripsPerDay?:number};
export type Journey={legs:Leg[];totalTimeMin:number;totalFareRs:number;totalDistanceM:number;transitDistanceM:number;walkDistanceM:number;transfers:number;co2g:number;departureTimeStr?:string;arrivalTimeStr?:string;isFallbackDrive?:boolean;score:number};
export type Tab='home'|'plan'|'nearby'|'trips'|'profile';
export type Panel='home'|'plan'|'nearby'|'trips'|'profile'|'search'|'layers'|'live'|'timetable'|'cabs'|'chat'|'explain'|'rewards'|'impact'|'saved'|'recents'|'booking'|'ticket'|'settings';
export type SearchTarget='origin'|'destination'|'anchor'|'place'|'cab_origin'|'cab_destination';
export type TransitLeg={id:string;mode:'bus'|'metro';lineOrRoute:string;from:string;to:string;fare:number};
export type Passengers={adult:number;student:number;senior:number};
export type Ticket={id:string;title:string;source:string;destination:string;lineOrRouteName:string;category:string;mode:string;legs:TransitLeg[];passengers:Passengers;totalPassengers:number;standardBaseFare:number;discountAmount:number;discountPercent:number;finalFare:number;co2SavedKg:number;greenPointsEarned:number;paymentMethod:string;transactionRef:string;qrPayload:string;status:string;currentLegStep:string;currentLegIndex:number;bookingTime:string;validUntil:string;interchangeValidUntil?:string;gateScans:any[]};
export type Bootstrap={stats:{busRoutes:number;metroLines:number;places:number;[k:string]:number};places:Point[];presets:{id:string;badge:string;from:Point;to:Point}[];rewards:any[];metroLines:{id:string;name:string;stations:string[]}[];busRoutes:{busNumber:string;from:string;to:string;stops:string[];stopsCount:number}[]};
export type Auth={user:any;profile:any;loading:boolean;isDemoUser:boolean};
export type Rpc=<T=any>(method:string,args?:any)=>Promise<T>;
export const PREFS:{id:Preference;label:string}[]=[{id:'balanced',label:'Best route'},{id:'fastest',label:'Fastest'},{id:'cheapest',label:'Lowest fare'},{id:'least_walk',label:'Less walking'},{id:'fewest_transfers',label:'Fewer changes'},{id:'low_co2',label:'Low carbon'}];
export const distance=(m:number)=>m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1)} km`;
export const duration=(m:number)=>m<60?`${Math.round(m)} min`:`${Math.floor(m/60)}h ${Math.round(m%60)}m`;
