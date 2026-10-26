import type {Preference} from './types';
export type VoiceIntent={intent:'PLAN_ROUTE'|'FIND_NEARBY'|'TRACK_BUS'|'VIEW_TIMETABLE'|'GENERAL_ANSWER';message:string;origin?:string|null;destination?:string|null;preference?:Preference|null;departureTime?:string|null;nearbyLocation?:string|null;nearbyRadiusM?:number|null;busNumber?:string|null;stopName?:string|null};
