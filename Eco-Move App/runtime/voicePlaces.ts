import { metroStations } from '@/lib/routing';
import { searchLocalPlaces } from '@/lib/placesSearch';
import { normalizeSpokenPlace, selectVoicePlace, voiceStationKey } from '../src/voiceInput';

/** Input spelling adapter only: all returned coordinates come from the original network. */
export function searchVoicePlaces(query:string) {
  const text=normalizeSpokenPlace(query);
  const local=searchLocalPlaces(text,20);
  const key=voiceStationKey(text);
  if(!key)return [];
  const selected=selectVoicePlace(text,local);
  // A sole keyword hit can still be a different landmark (for example the
  // railway crossing at Prajapati Nagar). Require the station identity to agree.
  if(selected&&voiceStationKey(selected.name)===key)return local;
  const stations=metroStations.filter(station=>voiceStationKey(station.name)===key);
  return stations.length?stations:local;
}
