import React, { useEffect, useRef, useState } from 'react';
import { isRunningInExpoGo } from 'expo';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, ArrowRight, Leaf, Mail, Phone, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../AppContext';
import { MotionPressable } from '../components/MotionPressable';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, IconButton, Notice } from '../components/Glass';
import { AuthEntrance, AuthLoading } from '../components/AuthMotion';

export function AuthScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const safe = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const demoPending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [message, setMessage] = useState('');
  const mode = app.authMode;

  async function enterDemo() {
    if (demoPending.current || busy || !app.ready) return;
    demoPending.current = true;
    setDemoBusy(true);
    try { await app.guard(() => app.rpc('demo')); }
    finally { demoPending.current = false; if (mounted.current) setDemoBusy(false); }
  }

  async function submit() {
    setBusy(true);
    app.setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        await app.rpc('login', {
          method,
          contact: method === 'email' ? email.trim() : phone.trim(),
          password,
        });
      } else if (mode === 'signup') {
        if (password.length < 8 || password !== confirm)
          throw Error('Use at least 8 characters and matching passwords.');
        await app.rpc('signup', {
          method,
          email: email.trim(),
          phone: phone.trim(),
          password,
          name: name.trim(),
        });
        app.setAuthMode('verify');
        setMessage('Check your inbox or phone for the verification code.');
      } else if (mode === 'verify') {
        await app.rpc('verify', {
          method,
          contact: method === 'email' ? email.trim() : phone.trim(),
          code,
        });
      } else if (mode === 'reset') {
        if (isRunningInExpoGo())
          throw Error('Open the installed Eco-Move app to reset your password. Expo Go cannot receive its password-reset link.');
        await app.rpc('reset', {
          email: email.trim(),
          redirectTo: 'ecomove://auth/callback',
        });
        setMessage('Password reset requested. Check your email for the link.');
      } else if (mode === 'update') {
        if (password.length < 8 || password !== confirm)
          throw Error('Use at least 8 characters and matching passwords.');
        await app.rpc('updatePassword', { password });
        app.setAuthMode('welcome');
        setMessage('Password updated successfully.');
      }
    } catch (e: any) {
      app.setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Present loading while the existing provider restores a session, avoiding a
  // misleading sign-in flash for returning users. Authentication stays unchanged.
  if (app.auth.loading && !app.runtimeError) return <AuthLoading label="Preparing your city…"/>;
  if (app.auth.loading) return <View style={[StyleSheet.absoluteFill,{alignItems:'center',justifyContent:'center',padding:24}]}>
    <Glass level={4} style={{width:'100%',maxWidth:320}}>
      <View style={{padding:24,gap:16,alignItems:'center'}}>
        {app.runtimeError ? <><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></> : <><ActivityIndicator color={c.accent}/><Copy weight="600">Preparing your city…</Copy></>}
      </View>
    </Glass>
  </View>;
  if (mode === 'welcome') return <AuthEntrance key="welcome">
    <View style={StyleSheet.absoluteFill} pointerEvents={demoBusy ? 'none' : 'auto'} accessibilityElementsHidden={demoBusy} importantForAccessibility={demoBusy ? 'no-hide-descendants' : 'auto'} aria-hidden={demoBusy}>
      <WelcomeScreen onDemo={enterDemo} busy={demoBusy}/>
    </View>
    {demoBusy && <AuthLoading label="Opening your demo…"/>}
  </AuthEntrance>;

  return (
    <AuthEntrance key={mode}>
      <LinearGradient
        colors={
          dark
            ? ['rgba(11, 25, 19, 0.4)', 'rgba(11, 25, 19, 0.92)', '#0b1913']
            : ['rgba(243, 248, 245, 0.3)', 'rgba(243, 248, 245, 0.9)', '#f3f8f5']
        }
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        pointerEvents={busy || demoBusy ? 'none' : 'auto'}
        accessibilityElementsHidden={busy || demoBusy}
        importantForAccessibility={busy || demoBusy ? 'no-hide-descendants' : 'auto'}
        aria-hidden={busy || demoBusy}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: safe.top + 24,
            paddingBottom: safe.bottom + 28,
            paddingHorizontal: 24,
            justifyContent: 'center',
          }}
        >
          <View style={{ maxWidth: 440, width: '100%', alignSelf: 'center', gap: 20 }}>
            {/* Eco-Move Brand Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Leaf color={c.accent} size={23} strokeWidth={1.8} />
              <Copy weight="700" size={20} style={{ letterSpacing: -0.5 }}>
                eco-move
              </Copy>
              <Copy muted size={10} style={{ letterSpacing: 2.2, marginLeft: 4, fontWeight: '700' }}>
                NAGPUR
              </Copy>
            </View>

              <Glass level={4} style={{ borderRadius: 32 }}>
                <View style={{ padding: 24, gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <IconButton
                      label="Back to welcome"
                      icon={ArrowLeft}
                      onPress={() => {
                        app.setAuthMode('welcome');
                        app.setError('');
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Copy size={24} weight="600">
                        {
                          {
                            login: 'Welcome back.',
                            signup: 'Your next journey.',
                            verify: 'Verify account.',
                            reset: 'A fresh start.',
                            update: 'New password.',
                          }[mode]
                        }
                      </Copy>
                      <Copy muted size={12}>
                        Eco-Move account access
                      </Copy>
                    </View>
                  </View>

                  {['login', 'signup'].includes(mode) && (
                    <View style={s.row}>
                      <Action
                        label="Email"
                        icon={Mail}
                        compact
                        selected={method === 'email'}
                        quiet={method !== 'email'}
                        onPress={() => setMethod('email')}
                        style={{ flex: 1 }}
                      />
                      <Action
                        label="Phone"
                        icon={Phone}
                        compact
                        selected={method === 'phone'}
                        quiet={method !== 'phone'}
                        onPress={() => setMethod('phone')}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}

                  {mode === 'signup' && (
                    <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />
                  )}

                  {((method === 'email' && ['login', 'signup'].includes(mode)) ||
                    mode === 'reset' ||
                    (mode === 'signup' && method === 'phone')) && (
                    <Field
                      label="Email address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      placeholder="you@example.com"
                    />
                  )}

                  {((method === 'phone' && mode === 'login') || mode === 'signup') && (
                    <Field
                      label="Mobile number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="+91 …"
                      autoComplete="tel"
                    />
                  )}

                  {['login', 'signup', 'update'].includes(mode) && (
                    <Field
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                  )}

                  {['signup', 'update'].includes(mode) && (
                    <Field
                      label="Confirm password"
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry
                    />
                  )}

                  {mode === 'verify' && (
                    <Field
                      label="Six-digit verification code"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  )}

                  {message ? <Notice>{message}</Notice> : null}
                  {app.error ? <Notice error>{app.error}</Notice> : null}

                  <Action
                    selected
                    icon={ShieldCheck}
                    loading={busy}
                    disabled={!app.ready}
                    label={
                      {
                        login: 'Sign in',
                        signup: 'Create account',
                        verify: 'Verify code',
                        reset: 'Send reset link',
                        update: 'Update password',
                      }[mode]
                    }
                    onPress={submit}
                  />

                  {mode === 'login' && (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      <Action label="Continue with Google" onPress={app.google} quiet />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Action
                          label="Forgot password?"
                          compact
                          quiet
                          style={{ flex: 1 }}
                          onPress={() => app.setAuthMode('reset')}
                        />
                        <Action
                          label="Use demo account"
                          testID="demo-login"
                          quiet
                          compact
                          style={{ flex: 1 }}
                          disabled={busy || demoBusy || !app.ready}
                          onPress={enterDemo}
                        />
                      </View>
                    </View>
                  )}

                  {mode === 'verify' && (
                    <Action
                      label="Resend verification code"
                      quiet
                      compact
                      onPress={() =>
                        app.guard(async () => {
                          await app.rpc('resend', {
                            method,
                            contact: method === 'email' ? email : phone,
                          });
                          setMessage('A new verification code has been sent.');
                        })
                      }
                    />
                  )}
                </View>
              </Glass>

            {app.runtimeError ? <><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></> : null}
            {!app.ready && <ActivityIndicator color={c.accent} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {(busy || demoBusy) && <AuthLoading label={demoBusy ? 'Opening your demo…' : mode === 'login' ? 'Signing you in…' : 'One moment…'}/>}
    </AuthEntrance>
  );
}

/** Landing presentation over the same interactive Nagpur map. */
function WelcomeScreen({ onDemo, busy }: { onDemo: () => void; busy: boolean }) {
  const app = useApp();
  const safe = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compact = height < 680;
  return <View style={StyleSheet.absoluteFill}>
    <LinearGradient pointerEvents="none" colors={['rgba(8,37,29,.94)', 'rgba(8,37,29,.64)', 'rgba(8,37,29,0)']}
      locations={[0, .55, 1]} style={{position:'absolute',top:0,left:0,right:0,height:Math.min(height*.57,430)}} />
    <ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'space-between',paddingTop:safe.top+24}}
      keyboardShouldPersistTaps="handled">
      <View style={{paddingHorizontal:26,gap:compact?16:25,maxWidth:540,width:'100%',alignSelf:'center',paddingBottom:compact?26:80}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <Leaf color="#9cd4b2" size={32} strokeWidth={1.6}/>
          <View><Copy style={{color:'#ffffff',letterSpacing:-.7}} size={25} weight="700">Eco-Move</Copy>
            <Copy size={10} weight="600" style={{color:'#dbeae1',letterSpacing:4}}>NAGPUR</Copy></View>
        </View>
        <View style={{gap:12}}>
          <Copy size={width<350?32:38} weight="700" style={{color:'#ffffff',lineHeight:width<350?36:42,letterSpacing:-1.2}}>
            Your city.{'\n'}A lighter <Copy size={width<350?32:38} weight="700" style={{color:'#ffad65'}}>footprint.</Copy>
          </Copy>
          <Copy size={14} style={{color:'#ecf3ee',lineHeight:21,maxWidth:345}}>
            Plan smarter journeys across Nagpur Metro, Aapli Bus and the walk in between.
          </Copy>
        </View>
      </View>
      <View style={{width:'100%',maxWidth:540,alignSelf:'center',backgroundColor:'#fafaf5',borderTopLeftRadius:32,borderTopRightRadius:32,paddingHorizontal:24,paddingBottom:safe.bottom+20,paddingTop:10,gap:compact?13:18,shadowColor:'#10271e',shadowOpacity:.12,shadowRadius:24,shadowOffset:{width:0,height:-6}}}>
        <View style={{width:34,height:4,borderRadius:2,backgroundColor:'#ccd0c9',alignSelf:'center',marginBottom:8}}/>
        <View style={{gap:6}}>
          <Copy size={width<350?22:25} weight="700" style={{color:'#111f24',letterSpacing:-.7}}>Move through Nagpur, naturally.</Copy>
          <Copy size={14} style={{color:'#53605b',lineHeight:20}}>Your routes, live buses and travel passes in one place.</Copy>
        </View>
        <View style={{gap:10}}>
          {([{label:'Sign in',mode:'login',Icon:UserRound},{label:'Create an account',mode:'signup',Icon:UserRoundPlus}] as const).map(({label,mode,Icon},index)=><MotionPressable key={mode} accessibilityRole="button" onPress={()=>app.setAuthMode(mode)} style={({pressed})=>({minHeight:54,borderRadius:17,borderWidth:1,borderColor:'#31594b',backgroundColor:index===0?(pressed?'#143d30':'#214e3e'):(pressed?'#e8eee6':'transparent'),flexDirection:'row',gap:16,alignItems:'center',paddingHorizontal:18})}>
            <Icon size={21} color={index===0?'#ffffff':'#214e3e'} strokeWidth={1.7}/>
            <Copy weight="600" size={16} style={{flex:1,color:index===0?'#ffffff':'#183d30'}}>{label}</Copy>
            <ArrowRight size={20} color={index===0?'#ffffff':'#214e3e'}/>
          </MotionPressable>)}
          <MotionPressable testID="demo-login" accessibilityRole="button" accessibilityState={{disabled:!app.ready || busy}} disabled={!app.ready || busy} onPress={onDemo} style={{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:16}}>
            <Copy size={15} weight="600" style={{color:'#285b46'}}>{app.ready?'Explore demo':'Preparing your city…'}</Copy>
          </MotionPressable>
        </View>
        {app.error?<Notice error>{app.error}</Notice>:null}
        {app.runtimeError?<><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></>:null}
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:14}}>
          <View style={{height:1,width:40,backgroundColor:'#d6dbd4'}}/><Copy size={11} style={{color:'#647069'}}>Built for Nagpur.</Copy><View style={{height:1,width:40,backgroundColor:'#d6dbd4'}}/>
        </View>
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});

