import React, { useEffect, useRef, useState } from 'react';
import { Alert, PanResponder, Platform, View } from 'react-native';
import { MotionPressable as Pressable } from '../components/MotionPressable';
import {
  ArrowRight,
  Bookmark,
  Check,
  Copy as CopyIcon,
  Gift,
  History,
  Leaf,
  LogOut,
  MapPin,
  Settings,
  ShieldCheck,
  Ticket,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { isRunningInExpoGo } from 'expo';
import { SOURCE_SHORTCUT_URL } from '../platform/sourceLocation';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { Choice } from '../components/Choice';
import { ToggleRow } from './DiscoverScreens';
import { duration } from '../types';
import { getBackend, setBackend } from '../platform/http';
import { GlassAppearanceSelector } from '../components/GlassAppearance';

export function ProfileScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const name =
    app.auth.profile?.fullName || app.auth.user?.user_metadata?.full_name || 'Nagpur Commuter';

  return (
    <>
      {/* User identity card */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Glass level={2} blur={false} style={{ width: 62, height: 62, borderRadius: 24 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <UserRound color={c.accent} size={28} strokeWidth={1.8} />
          </View>
        </Glass>
        <View style={{ flex: 1, gap: 2 }}>
          <Copy size={22} weight="600">
            {name}
          </Copy>
          <Copy muted size={12}>
            {app.auth.isDemoUser
              ? 'Existing demo account'
              : app.auth.user?.email || app.auth.user?.phone}
          </Copy>
        </View>
      </View>

      {/* Eco impact summary card */}
      <Glass level={2} blur={false} style={{ borderRadius: 26 }}>
        <View style={{ padding: 20, gap: 8 }}>
          <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Small Journeys. Lasting Change.
          </Copy>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Copy size={38} weight="600" accent>
              {Number(app.eco.totalCo2SavedKg || 0).toFixed(2)}
            </Copy>
            <Copy size={18} weight="500" muted>
              kg CO₂ saved
            </Copy>
          </View>
          <Copy muted size={13}>
            Across {app.eco.greenTripsCount || 0} sustainable transit trips
          </Copy>
          <Action
            label="Your green rewards"
            icon={Leaf}
            quiet
            compact
            style={{ marginTop: 4 }}
            onPress={() => app.open('rewards')}
          />
        </View>
      </Glass>

      {/* Account destinations list */}
      <View style={{ gap: 8 }}>
        {[
          { label: 'Your travel passes', icon: Ticket, panel: 'trips' },
          { label: 'Saved journeys', icon: Bookmark, panel: 'saved' },
          { label: 'Recent journeys', icon: History, panel: 'recents' },
          { label: 'Carbon & network', icon: Leaf, panel: 'impact' },
          { label: 'Profile & preferences', icon: Settings, panel: 'settings' },
        ].map(x => (
          <Action key={x.label} label={x.label} icon={x.icon} quiet onPress={() => app.open(x.panel as any)} />
        ))}
      </View>

      <Action label="Sign out" icon={LogOut} quiet danger onPress={app.logout} />
    </>
  );
}

export function HistoryScreen({ saved = false }: { saved?: boolean }) {
  const app = useApp();
  const { c } = useTheme();
  const list = saved ? app.saved : app.recents;

  useEffect(() => {
    app.loadAccount();
  }, []);

  return (
    <>
      {!list.length && (
        <Notice>
          {saved
            ? 'Save an itinerary from your route results to find it here.'
            : 'Your planned journeys will appear here.'}
        </Notice>
      )}

      {list.map(r => (
        <Glass level={1} blur={false} key={r.id} style={{ borderRadius: 22 }}>
          <View style={{ padding: 18, gap: 12 }}>
            <Copy size={18} weight="600">
              {r.origin.name} → {r.destination.name}
            </Copy>
            <Copy muted size={12}>
              {saved
                ? `${duration(r.totalTimeMin)} · ₹${r.totalFareRs || 0}`
                : new Date(r.createdAt).toLocaleDateString()}
            </Copy>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Action
                label="Plan again"
                icon={ArrowRight}
                selected
                compact
                style={{ flex: 1 }}
                onPress={() => {
                  app.navigate('plan');
                  app.plan(r.origin, r.destination, r.preference || app.preference);
                }}
              />
              {saved && (
                <Action
                  label="Remove"
                  icon={Trash2}
                  quiet
                  compact
                  danger
                  onPress={() =>
                    app.guard(async () => {
                      await app.rpc('deleteSaved', { id: r.id });
                      await app.loadAccount();
                    })
                  }
                />
              )}
            </View>
          </View>
        </Glass>
      ))}

      {!saved && list.length > 0 && (
        <Action
          label="Clear recent journeys"
          icon={Trash2}
          quiet
          danger
          onPress={() =>
            app.guard(async () => {
              await app.rpc('clearRecents');
              await app.loadAccount();
            })
          }
        />
      )}
    </>
  );
}

export function RewardsScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [revealing, setRevealing] = useState<any>(null);
  const [revealed, setRevealed] = useState(false);
  const strokes = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: () => {
        strokes.current++;
        if (strokes.current > 20) setRevealed(true);
      },
    })
  ).current;

  useEffect(() => {
    app.loadAccount();
  }, []);

  return (
    <>
      <View style={{ gap: 4 }}>
        <Copy size={26} weight="600">
          Good moves add up.
        </Copy>
        <Copy muted size={13}>
          {Number(app.eco.totalCo2SavedKg || 0).toFixed(2)} kg CO₂ saved · {app.eco.greenTripsCount || 0} trips
        </Copy>
      </View>

      {revealing && (
        <Glass level={4} state={revealed ? 'success' : 'default'} style={{ borderRadius: 26 }}>
          <View style={{ padding: 20, gap: 12 }}>
            <Copy size={18} weight="600">
              {revealing.rewardTitle}
            </Copy>
            {revealed ? (
              <View style={{ gap: 8 }}>
                <Glass level={1} blur={false} style={{ borderRadius: 16 }}>
                  <View style={{ padding: 14, alignItems: 'center' }}>
                    <Copy size={26} weight="700" selectable accent style={{ letterSpacing: 1.5 }}>
                      {revealing.couponCode}
                    </Copy>
                  </View>
                </Glass>
                <Copy size={12} muted>
                  {revealing.terms}
                </Copy>
                <Copy size={12} muted>
                  Valid until {revealing.validUntil}
                </Copy>
                <Action
                  label="Copy coupon code"
                  icon={CopyIcon}
                  selected
                  onPress={() => Clipboard.setStringAsync(revealing.couponCode)}
                />
              </View>
            ) : (
              <Pressable
                {...pan.panHandlers}
                accessibilityLabel="Reveal reward code"
                accessibilityRole="button"
                onPress={() => setRevealed(true)}
                style={{
                  height: 120,
                  borderRadius: 20,
                  backgroundColor: dark ? 'rgba(74, 222, 128, 0.12)' : 'rgba(24, 109, 78, 0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Gift size={28} color={c.accent} strokeWidth={1.8} />
                <Copy weight="600">Swipe or tap to reveal</Copy>
              </Pressable>
            )}
            <Action label="Close reward" compact quiet onPress={() => setRevealing(null)} />
          </View>
        </Glass>
      )}

      {/* Rewards list */}
      <View style={{ gap: 10 }}>
        {app.data?.rewards.map(r => {
          const claimed = app.eco.claimedRewardIds?.includes(r.id);
          const unlocked = app.eco.totalCo2SavedKg >= r.targetCo2Kg;
          const progressPercent = Math.min(100, (app.eco.totalCo2SavedKg / r.targetCo2Kg) * 100);

          return (
            <Glass key={r.id} level={unlocked ? 2 : 1} blur={false} style={{ borderRadius: 24 }}>
              <View style={{ padding: 18, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge label={r.tierName.toUpperCase()} color={unlocked ? c.accent : c.muted} />
                  <Copy size={12} muted weight="600">
                    {r.targetCo2Kg} kg
                  </Copy>
                </View>

                <Copy size={19} weight="600">
                  {r.rewardTitle}
                </Copy>
                <Copy size={13} muted>
                  {r.brandName}
                </Copy>

                {/* Progress bar */}
                <View
                  style={{
                    height: 5,
                    backgroundColor: c.line + '50',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      width: `${progressPercent}%`,
                      backgroundColor: c.accent,
                      borderRadius: 3,
                    }}
                  />
                </View>

                <Action
                  label={
                    claimed
                      ? 'View your reward'
                      : unlocked
                      ? 'Reveal your reward'
                      : `${Math.max(0, r.targetCo2Kg - app.eco.totalCo2SavedKg).toFixed(1)} kg to unlock`
                  }
                  icon={claimed ? Check : Gift}
                  disabled={!unlocked && !claimed}
                  selected={unlocked}
                  compact
                  quiet={!unlocked}
                  onPress={() =>
                    app.guard(async () => {
                      if (!claimed) {
                        await app.rpc('claim', { id: r.id });
                        await app.loadAccount();
                      }
                      setRevealing(r);
                      setRevealed(claimed);
                      strokes.current = 0;
                    })
                  }
                />
              </View>
            </Glass>
          );
        })}
      </View>
    </>
  );
}

export function ImpactScreen() {
  const app = useApp();
  const { c } = useTheme();
  const j = app.journey;

  return (
    <>
      <Copy size={28} weight="600">
        A lighter footprint.
      </Copy>

      <Glass level={2} blur={false} style={{ borderRadius: 26 }}>
        <View style={{ padding: 22, gap: 10 }}>
          <Leaf size={30} color={c.accent} strokeWidth={1.8} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Copy size={40} weight="600" accent>
              {Number(app.eco.totalCo2SavedKg || 0).toFixed(2)}
            </Copy>
            <Copy size={20} weight="500" muted>
              kg CO₂
            </Copy>
          </View>
          <Copy muted size={13}>
            CO₂ saved by your booked transit journeys
          </Copy>
        </View>
      </Glass>

      {j && (
        <Notice>
          Current route: {(j.co2g / 1000).toFixed(2)} kg CO₂ ·{' '}
          {Math.max(0, (j.totalDistanceM / 1000) * 0.192 - j.co2g / 1000).toFixed(2)} kg less than
          the car baseline.
        </Notice>
      )}

      <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
        Nagpur Transport Network
      </Copy>
      {[
        { label: 'Bus routes', value: app.data?.stats.busRoutes },
        { label: 'Metro lines', value: app.data?.stats.metroLines },
        { label: 'Connected places', value: app.data?.stats.places },
      ].map(s => (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.line + '55',
          }}
          key={s.label}
        >
          <Copy size={15} weight="500">
            {s.label}
          </Copy>
          <Copy weight="600" size={22}>
            {s.value}
          </Copy>
        </View>
      ))}

      <Action
        label="Explore the network"
        icon={MapPin}
        selected
        onPress={() => {
          app.setShowNetwork(true);
          app.setShowMetroStations(true);
          app.open('layers');
        }}
      />
    </>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const theme = useTheme();
  const [name, setName] = useState(
    app.auth.profile?.fullName || app.auth.user?.user_metadata?.full_name || ''
  );
  const [phone, setPhone] = useState(app.auth.profile?.phone || app.auth.user?.phone || '');
  const [preferred, setPreferred] = useState(app.auth.profile?.preferredMode || 'fastest');
  const [backend, setBackendValue] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getBackend().then(setBackendValue).catch(e => app.setError(e.message));
  }, []);

  return (
    <>
      <Field label="Full name" value={name} onChangeText={setName} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Choice
        label="Preferred travel mode"
        value={preferred}
        options={[
          { value: 'fastest', label: 'Fastest' },
          { value: 'least_walking', label: 'Least walking' },
          { value: 'least_transfers', label: 'Fewest transfers' },
        ]}
        onChange={setPreferred}
      />

      <Action
        label="Save profile"
        selected
        icon={Check}
        onPress={() =>
          app.guard(async () => {
            const result = await app.rpc('profile', {
              fullName: name,
              phone,
              preferredMode: preferred,
            });
            if (!result) throw Error('The profile could not be saved.');
            setSaved(true);
          })
        }
      />
      {saved && <Notice>Profile saved.</Notice>}

      <GlassAppearanceSelector />
      <ToggleRow
        label="Dark appearance"
        detail="A deeper, tinted liquid glass material"
        value={theme.dark}
        onChange={theme.setDark}
      />
      <ToggleRow
        label="Shake for voice assistant"
        detail="A deliberate, strong shake opens Voice. Shake again to stop. Gentle movements and single knocks are ignored."
        value={app.shakeEnabled}
        onChange={app.setShakeEnabled}
      />
      {app.shakeEnabled && app.motionStatus === 'permission' && (
        <Action label="Allow motion access" quiet onPress={() => app.setShakeEnabled(true)} />
      )}
      {app.shakeEnabled && app.motionStatus === 'unavailable' && (
        <Notice>Motion sensing is unavailable on this device or browser. Use the Voice button beside the map or inside SafarBot.</Notice>
      )}
      <Glass level={1} blur={false} style={{ borderRadius: 22 }}>
        <View style={{ padding: 16, gap: 10 }}>
          <Copy weight="600">Double Back Tap · Current Source</Copy>
          <Copy muted size={13}>
            {Platform.OS === 'ios' && !isRunningInExpoGo()
              ? 'On supported iPhones, create an Open URL shortcut with the link below. In iPhone Settings → Accessibility → Touch → Back Tap → Double Tap, select that shortcut. It opens Eco-Move and sets your current GPS location as Source.'
              : 'Back Tap is configured through iPhone accessibility shortcuts in the installed Eco-Move app. It is not available directly in web browsers or Expo Go. Devices without a compatible system shortcut can use the button below.'}
          </Copy>
          {Platform.OS === 'ios' && !isRunningInExpoGo() && (
            <Action label="Copy Back Tap shortcut URL" icon={CopyIcon} quiet compact onPress={async () => { await Clipboard.setStringAsync(SOURCE_SHORTCUT_URL); app.setNotice('Shortcut URL copied. Paste it into an Open URL action in Shortcuts.'); }} />
          )}
          <Action label="Use current location as Source" icon={MapPin} quiet loading={app.locating} onPress={app.useCurrentSource} />
        </View>
      </Glass>
      <ToggleRow
        label="Touchless map zoom"
        detail="Use the front camera: hold fingers steady, then pinch or spread to zoom. Video stays on this device."
        value={app.gestureEnabled}
        onChange={app.setGestureEnabled}
      />

      <Action label="Change password" icon={ShieldCheck} quiet onPress={() => app.setAuthMode('update')} />

      <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
        Ticket Email Connection
      </Copy>
      <Field
        label="Existing web backend URL"
        value={backend}
        onChangeText={setBackendValue}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Copy size={12} muted>
        This connects ticket email to the existing server. Use your deployed web server URL on a physical phone;
        Android emulators can reach the included local server at 10.0.2.2:8099.
      </Copy>
      <Action
        label="Save email server address"
        compact
        quiet
        onPress={() =>
          app.guard(async () => {
            const u = new URL(backend);
            if (!['http:', 'https:'].includes(u.protocol))
              throw Error('Enter an HTTP or HTTPS server URL.');
            await setBackend(backend);
            setSaved(true);
          })
        }
      />

      <Copy muted size={11} style={{ textAlign: 'center', marginTop: 6 }}>
        Eco-Move Nagpur · Native app 1.0.0
        {theme.reduceMotion ? ' · Reduced motion is enabled' : ''}
      </Copy>
    </>
  );
}

