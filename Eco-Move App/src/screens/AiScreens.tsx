import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  Copy as CopyIcon,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  isSpeechRecognitionSupported,
} from '../platform/speechRecognition';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { chatMemory, chatGeneration, clearChatMemory } from '../chatMemory';
import { VoiceSession, type VoicePhase } from '../voiceSession';
import { applyVoiceIntent } from '../applyVoiceIntent';
import {useVoiceDecision} from '../components/useVoiceDecision';
import type { VoiceIntent } from '../voiceTypes';
import { speechOptions, speechError, extractSpokenRoute } from '../voiceInput';
import { VoiceLanguagePicker } from '../components/VoiceLanguagePicker';
import { buildSpeechContext, chooseSpeechTranscript } from '../speechAccuracy';
import { useVoiceOutput } from '../voiceOutput';

const clean = (s: string) => s.replace(/[*#_`>~]/g, '');

export function ChatScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [messages, setMessages] = useState([...chatMemory]);
  const [query, setQuery] = useState('');
  const commandInput=useRef<{focus:()=>void}|null>(null);
  const lastSubmitted=useRef('');
  const tripAtRequest=useRef({origin:app.origin,destination:app.destination});
  const review=useVoiceDecision();
  const [busy, setBusy] = useState(false);
  const { speaking, speak, stop: stopSpeaking } = useVoiceOutput(!app.collapsed && !app.appSuspended, app.setNotice);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const current = useRef(app); current.current = app;
  const recognitionContext = useMemo(() => buildSpeechContext(app.data, [app.origin, app.destination], app.voiceLanguage), [app.data, app.origin, app.destination, app.voiceLanguage]);
  const contextRef = useRef(recognitionContext); contextRef.current = recognitionContext;
  const mounted = useRef(true);
  const voiceGeneration = useRef(chatGeneration);
  const [session] = useState(() => new VoiceSession({
    supported: isSpeechRecognitionSupported,
    permission: () => ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    start: () => ExpoSpeechRecognitionModule.start(speechOptions(current.current.voiceLanguage, contextRef.current.hints)),
    abort: () => ExpoSpeechRecognitionModule.abort(),
    cancel: id => { void current.current.rpc('voiceCancel', { id }).catch(() => {}); },
    state: phase => { if (mounted.current) setVoicePhase(phase); },
    transcript: text => { if (mounted.current) setQuery(text); },
    request: (id, text) => {
      lastSubmitted.current=text;
      voiceGeneration.current = chatGeneration;
      tripAtRequest.current={origin:current.current.origin,destination:current.current.destination};
      chatMemory.push({ role: 'user', text });
      setMessages([...chatMemory]);setQuery('');
      return current.current.rpc<VoiceIntent>('voice', { id, query: text, location: current.current.origin?.name || 'Your location' });
    },
    reply: async (result, isCurrent) => {
      const valid = () => mounted.current && isCurrent() && voiceGeneration.current === chatGeneration;
      if (!valid()) return;
      chatMemory.push({ role: 'assistant', text: result.message });
      setMessages([...chatMemory]);
      if (result.intent === 'GENERAL_ANSWER' && current.current.assistantActive) speak(result.message, current.current.voiceLanguage);
      const tripUnchanged=()=>valid()&&current.current.origin===tripAtRequest.current.origin&&current.current.destination===tripAtRequest.current.destination;
      if(!tripUnchanged()){current.current.setNotice('Your trip changed while the assistant was processing. Your latest locations were kept.');return;}
      await applyVoiceIntent(result,{...current.current,...review.actions},tripUnchanged);
    },
    error: message => { if (mounted.current){setQuery(value=>value||lastSubmitted.current);current.current.setError(message);} },
    finish: () => { if (mounted.current) current.current.setAssistantActive(false); },
  }));
  useSpeechRecognitionEvent('result', e => {
    if (!e.results?.[0]) return;
    const result = e.isFinal ? chooseSpeechTranscript(e.results, contextRef.current) : {text:e.results[0].transcript,review:false};
    session.result(result.text, e.isFinal === true, result.review);
  });
  useSpeechRecognitionEvent('end', () => session.end());
  useSpeechRecognitionEvent('error', e => session.error(speechError(e.error, e.message)));
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; session.stop(); stopSpeaking(); };
  }, [session, stopSpeaking]);
  useEffect(() => {
    if (app.assistantActive && !busy) {
      if(!isSpeechRecognitionSupported){app.setAssistantActive(false);commandInput.current?.focus();return;}
      stopSpeaking(); void session.start();
    }
    else session.stop();
  }, [app.assistantActive, busy, session, stopSpeaking]);
  useEffect(() => {
    if (app.collapsed || app.appSuspended || !app.auth.user) {
      review.cancel();session.stop();
      stopSpeaking();
    }
  }, [app.collapsed, app.appSuspended, app.auth.user?.id, session, stopSpeaking]);

  const send = async (text = query) => {
    if (!text.trim() || busy || app.assistantActive || voicePhase !== 'idle') return;
    app.setError('');
    app.setNotice('');
    if (extractSpokenRoute(text) || /\b(?:take me|directions|navigate|go to|reach|track bus)\b/i.test(text)) {
      // Typed route fallback uses the same verified intent, station resolution
      // and cancellation lifecycle as speech; general questions keep chat.
      session.submit(text);
      return;
    }
    const generation = chatGeneration;
    setQuery('');
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setBusy(true);

    await app.guard(async () => {
      const answer = await app.rpc<string>('chat', {
        query: text,
        context: app.journey
          ? {
              journey: app.journey,
              originName: app.origin?.name,
              destinationName: app.destination?.name,
              routeIndex: app.selected,
            }
          : null,
      });

      if (!mounted.current || generation !== chatGeneration) return;
      const all = [...next, { role: 'assistant' as const, text: answer }];
      setMessages(all);
      chatMemory.splice(0, chatMemory.length, ...all);
    });
    if (mounted.current) setBusy(false);
  };

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Glass level={2} blur={false} style={{ width: 50, height: 50, borderRadius: 20 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={24} color={c.accent} strokeWidth={1.9} />
          </View>
        </Glass>
        <View style={{ flex: 1, gap: 1 }}>
          <Copy size={21} weight="600">
            A little local knowledge.
          </Copy>
          <Copy muted size={12}>
            SafarBot · Nagpur transit assistant
          </Copy>
        </View>
      </View>

      {!messages.length && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Copy muted size={13}>
            Ask about your route, bus schedules, fares or metro connections.
          </Copy>
          {[
            'How to reach Airport from Nagpur Railway Station?',
            'What is the schedule of bus 35?',
            'How do I book metro tickets?',
            'How to apply for MahaCard?',
          ].map(q => (
            <Action key={q} label={q} quiet compact disabled={busy || app.assistantActive || voicePhase !== 'idle'} onPress={() => send(q)} />
          ))}
        </View>
      )}

      {/* Messages stream */}
      <View style={{ gap: 10 }}>
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <Glass
              key={i}
              level={isUser ? 2 : 1}
              blur={false}
              style={{
                borderRadius: 22,
                marginLeft: isUser ? 28 : 0,
                marginRight: isUser ? 0 : 16,
              }}
            >
              <View style={{ padding: 16, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge
                    label={isUser ? 'YOU' : 'SAFARBOT'}
                    color={isUser ? c.muted : c.accent}
                  />
                </View>
                <Copy size={15} selectable style={{ lineHeight: 21 }}>
                  {clean(m.text)}
                </Copy>
                {!isUser && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Action
                      label="Copy"
                      icon={CopyIcon}
                      quiet
                      compact
                      onPress={() => Clipboard.setStringAsync(m.text)}
                    />
                    <Action
                      label={speaking ? 'Stop' : 'Listen'}
                      icon={speaking ? VolumeX : Volume2}
                      quiet
                      compact
                      onPress={() => {
                        if (speaking) {
                          stopSpeaking();
                        } else {
                          speak(m.text, app.voiceLanguage);
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            </Glass>
          );
        })}
      </View>

      {(busy || voicePhase === 'thinking') && !review.pending && (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 }}>
          <ActivityIndicator color={c.accent} size="small" />
          <Copy muted size={13}>
            SafarBot is checking your request…
          </Copy>
        </View>
      )}

      {voicePhase === 'permission' && <Notice>Allow microphone and speech access to start voice input.</Notice>}
      {voicePhase === 'listening' && <Notice>Listening… Speak your transit question. Tap Stop assistant to cancel.</Notice>}
      {voicePhase === 'review' && <Notice>Please check the station names in the transcript below, then tap Use transcript. You can edit them first.</Notice>}

      {review.render(()=>{session.stop();app.setAssistantActive(false)})}
      {!isSpeechRecognitionSupported && <Notice>Keyboard input mode. Type your command below, or use your phone keyboard’s dictation button if available. Expo Go does not transcribe microphone audio in this app.</Notice>}
      <VoiceLanguagePicker disabled={busy || voicePhase !== 'idle'} />

      <Field
        inputRef={commandInput}
        label={isSpeechRecognitionSupported ? "Your question" : "Type a voice command"}
        placeholder="Ask SafarBot…"
        multiline
        editable={!busy && voicePhase !== 'thinking'}
        value={query}
        onChangeText={setQuery}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action
          label={voicePhase === 'review' ? 'Use transcript' : 'Send'}
          icon={Send}
          selected
          loading={busy || voicePhase === 'thinking'}
          disabled={!query.trim() || busy || voicePhase === 'thinking' || app.assistantActive && voicePhase !== 'review'}
          style={{ flex: 1 }}
          onPress={() => voicePhase === 'review' ? session.confirm(query) : send()}
        />
        <Action
          label={app.assistantActive ? 'Stop assistant' : isSpeechRecognitionSupported ? 'Voice' : 'Keyboard'}
          icon={isSpeechRecognitionSupported ? Mic : Type}
          quiet
          compact
          disabled={busy || voicePhase === 'thinking'}
          onPress={()=>isSpeechRecognitionSupported?app.toggleAssistant():commandInput.current?.focus()}
        />
      </View>

      {voicePhase === 'thinking' && !review.pending && <Action label="Cancel assistant request" quiet onPress={()=>{session.stop();app.setAssistantActive(false)}}/>}
      {messages.length > 0 && (
        <Action
          label="Start a new conversation"
          icon={RefreshCw}
          quiet
          compact
          onPress={() => {
            review.cancel();session.stop();app.setAssistantActive(false);
            stopSpeaking();
            setMessages([]);
            clearChatMemory();
          }}
        />
      )}
    </>
  );
}

export function ExplainScreen() {
  const app = useApp();
  const { c } = useTheme();
  const [language, setLanguage] = useState('en');
  const [mode, setMode] = useState('explain');
  const explanationRun = useRef(0);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState(15);
  const [speaking, setSpeaking] = useState(false);

  const args = {
    journey: app.journey,
    journeys: app.journeys,
    origin: app.origin?.name || 'Origin',
    destination: app.destination?.name || 'Destination',
    index: app.selected,
    language,
  };

  const fetchExplanation = async (refresh = false) => {
    if (!app.journey) return;
    const run=++explanationRun.current;setBusy(true);setContent('');
    await app.guard(async () => {
      if (refresh) await app.rpc(mode === 'compare' ? 'clearComparison' : 'clearExplanation', args);
      const text=await app.rpc<string>(mode,args);if(run===explanationRun.current)setContent(text);
    });
    if(run===explanationRun.current)setBusy(false);
  };

  useEffect(() => {
    fetchExplanation();
    return () => {
      explanationRun.current++;Speech.stop();
    };
  }, [language, mode, app.selected, app.journey]);

  if (!app.journey) return <Notice>Plan a journey to get a route explanation.</Notice>;

  return (
    <>
      {app.journey.isSafeMode && <Notice>Safety Mode: fares and timing are model estimates. Current lighting and personal safety are not guaranteed.</Notice>}
      {/* Language switcher */}
      <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
        {[
          { id: 'en', label: 'English' },
          { id: 'hi', label: 'हिन्दी' },
          { id: 'mr', label: 'मराठी' },
        ].map(l => (
          <Action
            key={l.id}
            label={l.label}
            selected={language === l.id}
            quiet={language !== l.id}
            compact
            onPress={() => setLanguage(l.id)}
            style={{ flex: 1 }}
          />
        ))}
      </View>

      {/* Mode switcher */}
      <View style={{ flexDirection: 'row', gap: 7 }}>
        <Action
          label="This route"
          selected={mode === 'explain'}
          quiet={mode !== 'explain'}
          compact
          style={{ flex: 1 }}
          onPress={() => setMode('explain')}
        />
        <Action
          label="Compare routes"
          selected={mode === 'compare'}
          disabled={app.journeys.length < 2}
          quiet={mode !== 'compare'}
          compact
          style={{ flex: 1 }}
          onPress={() => setMode('compare')}
        />
      </View>

      {mode === 'compare' && (
        <View style={{ gap: 6 }}>
          {app.journeys.map((j, i) => (
            <Action
              label={`Option ${i + 1} · ${Math.round(j.totalTimeMin)} min · ₹${j.totalFareRs} · ${j.transfers} transfer${j.transfers === 1 ? '' : 's'}`}
              key={i}
              selected={i === app.selected}
              quiet={i !== app.selected}
              compact
              onPress={() => app.selectJourney(i)}
            />
          ))}
        </View>
      )}

      {/* Explanation content box */}
      <Glass level={1} blur={false} style={{ borderRadius: 22 }}>
        <View style={{ padding: 18, gap: 10 }}>
          {busy ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
              <ActivityIndicator color={c.accent} />
              <Copy muted size={13}>
                Preparing your route guide…
              </Copy>
            </View>
          ) : (
            <Copy size={size} selectable style={{ lineHeight: Math.round(size * 1.5) }}>
              {clean(content)}
            </Copy>
          )}
        </View>
      </Glass>

      <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
        <Action
          label={speaking ? 'Stop' : 'Listen'}
          icon={speaking ? VolumeX : Volume2}
          quiet
          compact
          disabled={!content || busy}
          onPress={() => {
            if (speaking) {
              Speech.stop();
              setSpeaking(false);
            } else {
              setSpeaking(true);
              Speech.speak(clean(content), {
                language: language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN',
                rate: 0.92,
                onDone: () => setSpeaking(false),
                onError: () => setSpeaking(false),
              });
            }
          }}
        />
        <Action
          label="Text size"
          icon={Type}
          quiet
          compact
          onPress={() => setSize(size === 15 ? 18 : size === 18 ? 22 : 15)}
        />
        <Action
          label="Copy"
          icon={CopyIcon}
          quiet
          compact
          onPress={() => Clipboard.setStringAsync(content)}
        />
        <Action
          label="Refresh"
          icon={RefreshCw}
          quiet
          compact
          disabled={busy}
          onPress={() => fetchExplanation(true)}
        />
      </View>

      <Action label="Keep route visible on map" quiet compact onPress={() => app.setCollapsed(true)} />
    </>
  );
}

