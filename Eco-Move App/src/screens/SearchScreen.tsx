import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View, Keyboard } from 'react-native';
import { MotionPressable as Pressable } from '../components/MotionPressable';
import {
  LocateFixed,
  MapPin,
  Mic,
  Search,
  TrainFront,
  Bus,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  isSpeechRecognitionSupported,
} from '../platform/speechRecognition';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { LoadingRows } from '../components/Loading';
import {useVoiceDecision} from '../components/useVoiceDecision';
import { VoiceSession, type VoicePhase } from '../voiceSession';
import { applyVoiceIntent } from '../applyVoiceIntent';
import { extractSpokenRoute, normalizeSpokenPlace, selectVoicePlace, speechOptions, speechError } from '../voiceInput';
import { VoiceLanguagePicker } from '../components/VoiceLanguagePicker';
import type { Point } from '../types';
import type { VoiceIntent } from '../voiceTypes';
import { buildSpeechContext, chooseSpeechTranscript } from '../speechAccuracy';

export function SearchScreen() {
  const app = useApp();
  const { c, dark, reduceMotion } = useTheme();
  const currentTargetName = useMemo(() => {
    if (app.searchTarget === 'origin') return app.origin?.name || '';
    if (app.searchTarget === 'destination') return app.destination?.name || '';
    if (app.searchTarget === 'cab_origin') return app.cabOrigin?.name || '';
    if (app.searchTarget === 'cab_destination') return app.cabDestination?.name || '';
    if (app.searchTarget === 'anchor') return app.anchor?.name || '';
    if (app.searchTarget === 'place') return app.searchedPlace?.name || '';
    return '';
  }, [app.searchTarget, app.origin, app.destination, app.cabOrigin, app.cabDestination, app.anchor, app.searchedPlace]);
  const [query, setQuery] = useState(currentTargetName);
  const [local, setLocal] = useState<any[]>([]);
  const [online, setOnline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const commandLoading = voicePhase === 'thinking';
  const listening = voicePhase === 'listening' || voicePhase === 'permission';
  const current = useRef(app); current.current = app;
  const recognitionContext = useMemo(() => buildSpeechContext(app.data, [app.origin, app.destination], app.voiceLanguage), [app.data, app.origin, app.destination, app.voiceLanguage]);
  const contextRef = useRef(recognitionContext); contextRef.current = recognitionContext;
  const mounted = useRef(true);
  const review=useVoiceDecision();
  const tripAtRequest=useRef({origin:app.origin,destination:app.destination});
  const spokenPlace = useRef<{ query: string; places: Point[] } | null>(null);
  const [session] = useState(() => new VoiceSession({
    supported: isSpeechRecognitionSupported,
    permission: () => ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    start: () => ExpoSpeechRecognitionModule.start(speechOptions(current.current.voiceLanguage, contextRef.current.hints)),
    abort: () => ExpoSpeechRecognitionModule.abort(),
    cancel: id => { void current.current.rpc('voiceCancel', { id }).catch(() => {}); },
    state: phase => { if (mounted.current) setVoicePhase(phase); },
    transcript: text => { if (mounted.current) setQuery(text); },
    request: async (id, text, isCurrent) => {
      tripAtRequest.current={origin:current.current.origin,destination:current.current.destination};
      spokenPlace.current = null;
      if (!extractSpokenRoute(text)) {
        const query = normalizeSpokenPlace(text);
        const places = await current.current.rpc<Point[]>('voicePlaces', { query });
        if (!isCurrent()) throw Error('Voice request cancelled.');
        if (places.length) {
          spokenPlace.current = { query, places };
          return { intent: 'GENERAL_ANSWER', message: 'Select a matching place below.' };
        }
      }
      return current.current.rpc<VoiceIntent>('voice', { id, query: text, location: current.current.origin?.name || 'Your location' });
    },
    reply: async (intent, isCurrent) => {
      const valid = () => mounted.current && isCurrent();
      if (!valid()) return;
      const place = spokenPlace.current;
      if (place) {
        setQuery(place.query);
        const selected = selectVoicePlace(place.query, place.places) || await review.actions.chooseVoicePlace(place.query,place.places);
        if(!valid()||!selected)return;
        const getPoint=()=>current.current.searchTarget==='origin'?current.current.origin:current.current.searchTarget==='destination'?current.current.destination:null;
        const before=getPoint();
        if(before&&(before.lat!==selected.lat||before.lon!==selected.lon)){
          const accepted=await review.actions.confirmVoicePlaceReplacement(before,selected);
          if(!valid()||!accepted||getPoint()!==before)return;
        }
        if(tripAtRequest.current.origin!==current.current.origin||tripAtRequest.current.destination!==current.current.destination){current.current.setNotice('Your latest locations were kept. Please repeat your voice search.');return;}
        current.current.choosePlace(selected);
        return;
      }
      current.current.setNotice(intent.message);
      const tripUnchanged=()=>valid()&&tripAtRequest.current.origin===current.current.origin&&tripAtRequest.current.destination===current.current.destination;
      if(!tripUnchanged()){current.current.setNotice('Your latest locations were kept because the trip changed during voice processing.');return;}
      await applyVoiceIntent(intent,{...current.current,...review.actions},tripUnchanged);
    },
    error: message => { if (mounted.current) current.current.setError(message); },
    finish: () => {},
  }));
  const input = useRef<any>(null);
  useEffect(() => {
    if (app.collapsed) return;
    const timer = setTimeout(() => input.current?.focus(), reduceMotion ? 0 : 310);
    return () => clearTimeout(timer);
  }, [app.collapsed, reduceMotion]);
  const generation = useRef(0);

  useSpeechRecognitionEvent('result', e => {
    if (!e.results?.[0]) return;
    const result = e.isFinal ? chooseSpeechTranscript(e.results, contextRef.current) : {text:e.results[0].transcript,review:false};
    session.result(result.text, e.isFinal === true, result.review);
  });
  useSpeechRecognitionEvent('end', () => session.end());
  useSpeechRecognitionEvent('error', e => session.error(speechError(e.error, e.message)));

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; session.stop(); }; }, [session]);
  useEffect(() => { if (app.collapsed || app.appSuspended || !app.auth.user){review.cancel();session.stop();} }, [app.collapsed, app.appSuspended, app.auth.user?.id, session]);

  useEffect(() => {
    const id = ++generation.current;
    setLocal([]);
    setOnline([]);
    app.rpc<any[]>('searchLocal', { query }).then(r => {
      if (id === generation.current) setLocal(r);
    }).catch(e => {
      if (id === generation.current) { setLocal([]); app.setError(e.message); }
    });
    if (query.trim().length < 2) {
      setLoading(false);
      return () => { generation.current++; };
    }
    setLoading(true);
    const timer = setTimeout(
      () =>
        app
          .rpc<any[]>('searchOnline', { query })
          .then(r => {
            if (id === generation.current) setOnline(r);
          })
          .catch(() => {})
          .finally(() => {
            if (id === generation.current) setLoading(false);
          }),
      350
    );
    return () => { clearTimeout(timer); generation.current++; };
  }, [query]);

  const seen = new Set();
  const results = [...local, ...online].filter(p => {
    const key = `${p.name.toLowerCase()}_${p.lat.toFixed(3)}_${p.lon.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const voice = () => {
    if (voicePhase !== 'idle') { session.stop(); return; }
    if(!isSpeechRecognitionSupported){input.current?.focus();app.setNotice('Keyboard input mode: type a place or command, or use your phone keyboard’s dictation if available.');return;}
    Keyboard.dismiss(); app.setError(''); app.setNotice('');
    void session.start();
  };
  const command = () => {
    if (voicePhase === 'review') { session.confirm(query); return; }
    if (!query.trim() || voicePhase !== 'idle') return;
    Keyboard.dismiss(); app.setError(''); app.setNotice('');
    session.submit(query);
  };

  const handleClear = () => {
    session.stop();
    setQuery('');
    if (app.searchTarget === 'origin') app.setOrigin(null);
    else if (app.searchTarget === 'destination') app.setDestination(null);
    else if (app.searchTarget === 'cab_origin') app.setCabOrigin(null);
    else if (app.searchTarget === 'cab_destination') app.setCabDestination(null);
    else if (app.searchTarget === 'anchor') app.setAnchor(null);
    else if (app.searchTarget === 'place') app.setSearchedPlace(null);
    app.dismissRouteResults();
    app.setSearchedPlace(null);
    input.current?.focus();
  };

  return (
    <>
      <Field
        label={
          {
            origin: 'Starting point',
            destination: 'Destination',
            anchor: 'Search around',
            place: 'Search Nagpur',
            cab_origin: 'Cab pickup',
            cab_destination: 'Cab destination',
          }[app.searchTarget]
        }
        value={query}
        onClear={handleClear}
        onChangeText={text => { session.stop(); setQuery(text); }}
        placeholder="Place, station or coordinates"
        inputRef={input}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action
          label="Current location"
          icon={LocateFixed}
          loading={app.locating}
          compact
          quiet
          style={{ flex: 1 }}
          onPress={() => app.locate(app.searchTarget)}
        />
        <Action
          label="Choose on map"
          icon={MapPin}
          compact
          quiet
          style={{ flex: 1 }}
          onPress={() => app.pickMap(app.searchTarget)}
        />
      </View>

      {review.render(()=>session.stop())}
      <Action label={voiceOptions?'Hide voice options':'Voice options'} icon={Mic} quiet compact onPress={()=>{if(voiceOptions){review.cancel();session.stop();}setVoiceOptions(value=>!value)}}/>
      {(voiceOptions || voicePhase !== 'idle') && <>
      {!isSpeechRecognitionSupported && <Notice>Type your command above. Microphone transcription needs an installed Eco-Move build; keyboard dictation is controlled by your phone.</Notice>}
      <VoiceLanguagePicker disabled={voicePhase !== 'idle'} />
      {listening && <Notice>{voicePhase === 'permission' ? 'Allow microphone and speech access to start.' : 'Listening… Say your Source and Destination.'}</Notice>}
      {voicePhase === 'review' && <Notice>Please check the station names in the transcript above, then tap Use transcript. You can edit them first.</Notice>}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action
          label={voicePhase !== 'idle' ? 'Stop voice' : isSpeechRecognitionSupported ? 'Voice search' : 'Keyboard input'}
          icon={Mic}
          compact
          quiet
          style={{ flex: 1 }}
          onPress={voice}
        />
        <Action
          label={voicePhase === 'review' ? 'Use transcript' : 'Ask directions'}
          icon={Sparkles}
          compact
          quiet
          style={{ flex: 1 }}
          disabled={!query.trim() || !['idle', 'review'].includes(voicePhase)}
          loading={commandLoading}
          onPress={command}
        />
      </View>

      </>}

      <View style={{ minHeight: 28 }} accessibilityLiveRegion="polite">
      {(loading || commandLoading) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <ActivityIndicator size="small" color={c.accent} />
          <Copy muted size={12}>
            Searching Nagpur transport network…
          </Copy>
        </View>
      )}
      </View>

      {app.notice ? <Notice>{app.notice}</Notice> : null}

      {!query ? (
        <View style={{ gap: 4 }}>
          <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
            Places You Know
          </Copy>
          {app.data?.places.map(p => (
            <PlaceRow key={p.name} item={p} onPress={() => app.choosePlace(p)} />
          ))}
        </View>
      ) : results.length ? (
        <View style={{ gap: 4 }}>
          {results.map((p, i) => (
            <PlaceRow key={p.id + '-' + i} item={p} onPress={() => app.choosePlace(p)} />
          ))}
        </View>
      ) : voicePhase === 'review' ? null : !loading && voicePhase === 'idle' ? (
        <Notice>No matching places. Try another spelling or choose a point on the map.</Notice>
      ) : <LoadingRows />}
    </>
  );
}

export function PlaceRow({ item, onPress }: { item: any; onPress: () => void }) {
  const { c, dark } = useTheme();
  const Icon = item.kind === 'metro' ? TrainFront : item.kind === 'bus' ? Bus : MapPin;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${item.name}`}
      onPress={onPress}
      style={{ minHeight: 60 }}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 13,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.line + '55',
            opacity: pressed ? 0.7 : 1,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              backgroundColor: dark ? 'rgba(74, 222, 128, 0.12)' : 'rgba(24, 109, 78, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color={c.accent} size={19} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Copy weight="600" size={15}>
              {item.name}
            </Copy>
            <Copy size={12} muted numberOfLines={1}>
              {item.subtitle || item.category || `${item.lat.toFixed(4)}, ${item.lon.toFixed(4)}`}
            </Copy>
          </View>
          <ArrowUpRight color={c.muted} size={16} />
        </View>
      )}
    </Pressable>
  );
}

