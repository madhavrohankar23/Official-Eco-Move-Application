import React, { useState } from 'react';
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
import { ArrowLeft, ArrowUpRight, Leaf, Mail, Phone, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, IconButton, Notice } from '../components/Glass';

export function AuthScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const safe = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const mode = app.authMode;

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

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={
          dark
            ? ['rgba(11, 25, 19, 0.4)', 'rgba(11, 25, 19, 0.92)', '#0b1913']
            : ['rgba(243, 248, 245, 0.3)', 'rgba(243, 248, 245, 0.9)', '#f3f8f5']
        }
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
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
            justifyContent: mode === 'welcome' ? 'flex-end' : 'center',
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

            {mode === 'welcome' ? (
              <>
                <View style={{ gap: 10, paddingTop: height > 700 ? 55 : 15 }}>
                  <Copy size={40} weight="600" style={{ lineHeight: 44, letterSpacing: -1.4 }}>
                    Your city.{'\n'}A lighter footprint.
                  </Copy>
                  <Copy muted size={15} style={{ maxWidth: 320, lineHeight: 22 }}>
                    One thoughtful journey across Aapli Bus, Nagpur Metro, and the walk in between.
                  </Copy>
                </View>

                <Glass level={2} style={{ borderRadius: 30, marginTop: 10 }}>
                  <View style={{ padding: 22, gap: 15 }}>
                    <Copy weight="600" size={18}>
                      Move through Nagpur, naturally.
                    </Copy>
                    <Copy muted size={13}>
                      Your routes, real-time bus telemetry, and digital travel passes, together in one place.
                    </Copy>
                    <Action
                      label="Sign in"
                      icon={ArrowUpRight}
                      selected
                      onPress={() => app.setAuthMode('login')}
                    />
                    <Action
                      label="Create an account"
                      onPress={() => app.setAuthMode('signup')}
                      quiet
                    />
                    <Action
                      label={app.ready ? 'Explore with demo account' : 'Preparing your city…'}
                      testID="demo-login"
                      icon={Leaf}
                      disabled={!app.ready}
                      onPress={() => app.guard(() => app.rpc('demo'))}
                      compact
                      quiet
                    />
                  </View>
                </Glass>
                <Copy size={11} muted style={{ textAlign: 'center' }}>
                  Built for Nagpur. Made for the sustainable journey.
                </Copy>
              </>
            ) : (
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
                          onPress={() => app.guard(() => app.rpc('demo'))}
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
            )}

            {mode === 'welcome' && app.error ? <Notice error>{app.error}</Notice> : null}
            {app.runtimeError ? <><Notice error>{app.runtimeError}</Notice><Action label="Retry map startup" onPress={app.retryRuntime}/></> : null}
            {!app.ready && <ActivityIndicator color={c.accent} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});

