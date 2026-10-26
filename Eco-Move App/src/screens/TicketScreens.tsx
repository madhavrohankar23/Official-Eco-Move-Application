import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, View } from 'react-native';
import { MotionPressable as Pressable } from '../components/MotionPressable';
import {
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Bookmark,
  Bus,
  Check,
  Clock,
  CreditCard,
  Download,
  Leaf,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Share2,
  Ticket as TicketIcon,
  TrainFront,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { Choice } from '../components/Choice';
import type { Passengers, TransitLeg, Ticket } from '../types';
import { ToggleRow } from './DiscoverScreens';

export function TripsScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    app.loadAccount();
  }, []);

  const list = app.tickets.filter(
    t =>
      filter === 'all' ||
      (t.status === 'active' &&
        new Date(t.validUntil).getTime() > Date.now() &&
        t.currentLegStep !== 'completed')
  );

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action label="Book a pass" icon={Plus} selected style={{ flex: 1 }} onPress={() => app.book()} />
        <Action label="Refresh" icon={RefreshCw} compact quiet onPress={app.loadAccount} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action label="Saved routes" icon={Bookmark} compact quiet style={{ flex: 1 }} onPress={() => app.open('saved')} />
        <Action label="Recent trips" icon={Clock} compact quiet style={{ flex: 1 }} onPress={() => app.open('recents')} />
      </View>

      <View style={{ flexDirection: 'row', gap: 7, marginTop: 2 }}>
        <Action
          label="Active passes"
          selected={filter === 'active'}
          compact
          quiet={filter !== 'active'}
          onPress={() => setFilter('active')}
        />
        <Action
          label="All passes"
          selected={filter === 'all'}
          compact
          quiet={filter !== 'all'}
          onPress={() => setFilter('all')}
        />
      </View>

      {list.length ? (
        list.map(t => {
          const isExpired = new Date(t.validUntil).getTime() < Date.now();
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open pass ${t.id}`}
              key={t.id}
              onPress={() => app.showTicket(t)}
            >
              {({ pressed }) => (
                <Glass
                  level={2}
                  blur={false}
                  style={{
                    borderRadius: 24,
                  }}
                >
                  <View style={{ padding: 18, gap: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TicketIcon size={20} color={c.accent} strokeWidth={1.8} />
                        <Copy size={13} weight="600">
                          {t.title}
                        </Copy>
                      </View>
                      <Badge
                        label={isExpired ? 'EXPIRED' : t.status.toUpperCase()}
                        color={isExpired ? c.muted : c.accent}
                      />
                    </View>

                    <Copy size={20} weight="600">
                      {t.source} → {t.destination}
                    </Copy>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Copy size={12} muted>
                        {t.totalPassengers} passenger{t.totalPassengers === 1 ? '' : 's'} · {t.id}
                      </Copy>
                      <Copy size={18} weight="600" accent>
                        ₹{t.finalFare}
                      </Copy>
                    </View>
                  </View>
                </Glass>
              )}
            </Pressable>
          );
        })
      ) : (
        <View style={{ paddingVertical: 28, alignItems: 'center', gap: 10 }}>
          <Wallet size={36} color={c.muted} strokeWidth={1.4} />
          <Copy size={20} weight="500">
            A little room for your next trip.
          </Copy>
          <Copy muted size={13}>
            Your {filter === 'active' ? 'active ' : ''}passes will appear here.
          </Copy>
        </View>
      )}

      <Copy muted size={11} style={{ textAlign: 'center', marginTop: 4 }}>
        The source project uses demo payment and gate validation. Passes generated here are demonstration passes.
      </Copy>
    </>
  );
}

function initialLeg(mode: 'metro' | 'bus'): TransitLeg {
  return {
    id: `leg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mode,
    lineOrRoute: mode === 'metro' ? 'Aqua Line' : '',
    from: '',
    to: '',
    fare: 0,
  };
}

export function BookingScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [legs, setLegs] = useState<TransitLeg[]>(
    app.bookingLegs?.length ? app.bookingLegs : [initialLeg('metro')]
  );
  const [category, setCategory] = useState(
    app.bookingLegs && app.bookingLegs.length > 1
      ? 'exclusive_eco'
      : app.bookingLegs?.[0]?.mode === 'bus'
      ? 'standard_bus'
      : 'standard_metro'
  );
  const [passengers, setPassengers] = useState<Passengers>({ adult: 1, student: 0, senior: 0 });
  const [fare, setFare] = useState<any>(null);
  const [checkout, setCheckout] = useState(false);
  const [method, setMethod] = useState('upi');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(false);
  const [qr, setQr] = useState('');
  const [upi, setUpi] = useState('nagpur.commuter@okaxis');
  const [qrExpiry, setQrExpiry] = useState(0);

  useEffect(() => {
    let active = true;
    app.rpc('fare', { category, legs, passengers }).then(r => {
      if (active) setFare(r);
    }).catch(e => { if (active) { setFare(null); app.setError(e.message); } });
    return () => {
      active = false;
    };
  }, [legs, category, passengers]);

  const update = (i: number, u: Partial<TransitLeg>) =>
    setLegs(old => old.map((l, j) => (j === i ? { ...l, ...u } : l)));

  const move = (i: number, delta: number) =>
    setLegs(old => {
      const next = [...old];
      [next[i], next[i + delta]] = [next[i + delta], next[i]];
      return next;
    });

  const count = passengers.adult + passengers.student + passengers.senior;
  const valid =
    legs.length > 0 &&
    legs.every(l => l.from && l.to && (l.mode === 'metro' || l.lineOrRoute)) &&
    (category !== 'exclusive_eco' || legs.length >= 2) &&
    count > 0 &&
    fare?.finalTotalFare > 0;

  const metroStations = Array.from(new Set(app.data?.metroLines.flatMap(l => l.stations) || []));

  const buy = async () => {
    if (!valid || busy) return;
    setBusy(true);
    await app.guard(async () => {
      await new Promise(r => setTimeout(r, 1600));
      const issued = await app.rpc<Ticket>('issue', {
        selectedCategory: category,
        legs,
        passengers,
        paymentMethod: method,
        emailDelivery: email && !app.auth.isDemoUser,
      });
      app.setTicket(issued);
      await app.loadAccount();
      app.showTicket(issued);
    });
    setBusy(false);
  };

  useEffect(() => {
    if (!qrExpiry) return;
    const timer = setInterval(() => {
      if (Date.now() >= qrExpiry) {
        setQr('');
        setQrExpiry(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrExpiry]);

  if (checkout) {
    return (
      <>
        <Action label="Back to pass customization" icon={ArrowLeft} compact quiet onPress={() => setCheckout(false)} />

        <Glass level={2} blur={false} style={{ borderRadius: 24 }}>
          <View style={{ padding: 20, gap: 10, alignItems: 'center' }}>
            <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Demo Checkout Total
            </Copy>
            <Copy size={36} weight="600" accent>
              ₹{fare?.finalTotalFare}
            </Copy>
            <Copy muted size={13}>
              {legs[0]?.from} → {legs.at(-1)?.to}
            </Copy>
          </View>
        </Glass>

        <Notice>
          This is the existing demo checkout. Confirmation simulates payment; the app does not verify or charge real funds.
        </Notice>

        <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Payment Method
        </Copy>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'upi', name: 'UPI' },
            { id: 'mahacard', name: 'MahaCard' },
            { id: 'card', name: 'Card' },
            { id: 'netbanking', name: 'Net banking' },
          ].map(m => (
            <Action
              key={m.id}
              label={m.name}
              selected={method === m.id}
              icon={CreditCard}
              compact
              quiet={method !== m.id}
              onPress={() => setMethod(m.id)}
              style={{ flex: 1, minWidth: '46%' }}
            />
          ))}
        </View>

        {method === 'upi' && (
          <View style={{ gap: 10 }}>
            <Field label="UPI ID (demo)" value={upi} onChangeText={setUpi} autoCapitalize="none" />
            <Action
              label={qr ? 'Hide demo UPI QR' : 'Reveal demo UPI QR'}
              icon={QrCode}
              quiet
              compact
              onPress={() =>
                app.guard(async () => {
                  if (qr) {
                    setQr('');
                    return;
                  }
                  setQr(
                    await app.rpc<string>('paymentQr', {
                      fare: fare.finalTotalFare,
                      source: legs[0].from,
                      destination: legs.at(-1)!.to,
                    })
                  );
                  setQrExpiry(Date.now() + 240000);
                })
              }
            />
            {qr && (
              <Glass level={1} blur={false} style={{ borderRadius: 20 }}>
                <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
                  <Image source={{ uri: qr }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                  <Copy size={11} muted style={{ textAlign: 'center' }}>
                    Demo payment address: nagpur.transit@sbi. Do not send actual money. QR closes after 4 minutes.
                  </Copy>
                </View>
              </Glass>
            )}
          </View>
        )}

        {method === 'mahacard' && (
          <Notice>Source demo MahaCard balance: ₹240. Demo confirmation records MahaCard as payment method.</Notice>
        )}
        {(method === 'card' || method === 'netbanking') && (
          <Notice>{method === 'card' ? 'Card' : 'Net banking'} is simulated in this project. No credentials needed.</Notice>
        )}

        {!app.auth.isDemoUser && (
          <ToggleRow
            label="Email this pass"
            detail={app.auth.user?.email || app.auth.profile?.email || 'No email on account'}
            value={email}
            onChange={setEmail}
          />
        )}

        <Action
          label="Confirm demo payment"
          testID="confirm-demo-payment"
          selected
          loading={busy}
          disabled={!valid}
          icon={Check}
          onPress={buy}
        />
      </>
    );
  }

  return (
    <>
      <Copy muted size={14}>
        Configure passes and concessions for every stage of your trip.
      </Copy>

      {!app.lockedBooking && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {[
            { id: 'standard_metro', label: 'Metro', mode: 'metro' },
            { id: 'standard_bus', label: 'Bus', mode: 'bus' },
            { id: 'exclusive_eco', label: 'Eco-Pass · 12%', mode: 'combo' },
          ].map(x => (
            <Action
              key={x.id}
              label={x.label}
              selected={category === x.id}
              quiet={category !== x.id}
              compact
              onPress={() => {
                setCategory(x.id);
                setLegs(
                  x.mode === 'combo'
                    ? [initialLeg('metro'), initialLeg('bus')]
                    : [initialLeg(x.mode as 'metro' | 'bus')]
                );
              }}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      )}

      {app.lockedBooking && (
        <Notice>The selected itinerary is linked to this pass. Its transit stages and stops are preserved.</Notice>
      )}

      {/* Transit stages */}
      {legs.map((l, i) => {
        const route = app.data?.busRoutes.find(r => r.busNumber === l.lineOrRoute);
        const stops = l.mode === 'metro' ? metroStations : route?.stops || [];
        return (
          <Glass key={l.id} level={1} blur={false} style={{ borderRadius: 24 }}>
            <View style={{ padding: 18, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {l.mode === 'metro' ? (
                  <TrainFront size={20} color={c.accent} strokeWidth={1.8} />
                ) : (
                  <Bus size={20} color={c.accent} strokeWidth={1.8} />
                )}
                <Copy size={15} weight="600" style={{ flex: 1 }}>
                  Stage {i + 1} · {l.mode === 'metro' ? 'Metro' : 'Bus'}
                </Copy>
                {!app.lockedBooking && legs.length > 1 && (
                  <Action
                    label="Remove"
                    icon={Trash2}
                    compact
                    quiet
                    danger
                    onPress={() => setLegs(old => old.filter((_, j) => i !== j))}
                  />
                )}
              </View>

              {l.mode === 'bus' && (
                <Choice
                  label="Bus route"
                  value={l.lineOrRoute}
                  disabled={app.lockedBooking}
                  options={(app.data?.busRoutes || []).map(r => ({
                    value: r.busNumber,
                    label: `Bus ${r.busNumber}`,
                    detail: `${r.from} → ${r.to}`,
                  }))}
                  onChange={v => update(i, { lineOrRoute: v, from: '', to: '' })}
                />
              )}

              {l.mode === 'metro' && (
                <Choice
                  label="Metro line"
                  value={l.lineOrRoute}
                  disabled={app.lockedBooking}
                  options={(app.data?.metroLines || []).map(r => ({
                    value: r.name,
                    label: r.name,
                  }))}
                  onChange={v => update(i, { lineOrRoute: v })}
                />
              )}

              <Choice
                label="Boarding stop"
                value={l.from}
                disabled={app.lockedBooking}
                options={stops.map(s => ({ value: s, label: s }))}
                onChange={v => update(i, { from: v })}
              />

              <Choice
                label="Alighting stop"
                value={l.to}
                disabled={app.lockedBooking}
                options={stops.map(s => ({ value: s, label: s }))}
                onChange={v => update(i, { to: v })}
              />

              {!app.lockedBooking && legs.length > 1 && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Action
                    label="Move up"
                    icon={ArrowUp}
                    compact
                    quiet
                    disabled={i === 0}
                    onPress={() => move(i, -1)}
                    style={{ flex: 1 }}
                  />
                  <Action
                    label="Move down"
                    icon={ArrowDown}
                    compact
                    quiet
                    disabled={i === legs.length - 1}
                    onPress={() => move(i, 1)}
                    style={{ flex: 1 }}
                  />
                </View>
              )}

              <Copy size={12} muted>
                Adult fare ₹{fare?.legFares[i] || 0}
              </Copy>
            </View>
          </Glass>
        );
      })}

      {!app.lockedBooking && legs.length < 4 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Action
            label="Add metro stage"
            icon={Plus}
            compact
            quiet
            style={{ flex: 1 }}
            onPress={() => {
              setLegs([...legs, initialLeg('metro')]);
              setCategory('exclusive_eco');
            }}
          />
          <Action
            label="Add bus stage"
            icon={Plus}
            compact
            quiet
            style={{ flex: 1 }}
            onPress={() => {
              setLegs([...legs, initialLeg('bus')]);
              setCategory('exclusive_eco');
            }}
          />
        </View>
      )}

      {/* Passengers & concessions */}
      <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
        Traveller Concessions
      </Copy>
      {(['adult', 'student', 'senior'] as const).map(p => (
        <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Copy size={15} weight="500">
              {p[0].toUpperCase() + p.slice(1)}
            </Copy>
            <Copy muted size={11}>
              {p === 'student' ? '25% concession' : p === 'senior' ? '50% concession' : 'Standard fare'}
            </Copy>
          </View>
          <Pressable
            accessibilityLabel={`Fewer ${p}s`}
            accessibilityRole="button"
            disabled={!passengers[p]}
            onPress={() => setPassengers({ ...passengers, [p]: Math.max(0, passengers[p] - 1) })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: passengers[p] ? 1 : 0.3 }}
          >
            <Minus size={18} color={c.accent} />
          </Pressable>
          <Copy weight="600" size={16} style={{ minWidth: 20, textAlign: 'center' }}>
            {passengers[p]}
          </Copy>
          <Pressable
            accessibilityLabel={`Add ${p}`}
            accessibilityRole="button"
            onPress={() => setPassengers({ ...passengers, [p]: passengers[p] + 1 })}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus color={c.accent} size={18} />
          </Pressable>
        </View>
      ))}

      {/* Fare calculation summary card */}
      <Glass level={2} blur={false} style={{ borderRadius: 24 }}>
        <View style={{ padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Copy muted size={13}>
              Standard fare ₹{fare?.standardTotal || 0}
            </Copy>
            <Copy muted size={13}>
              Savings ₹{fare?.totalDiscountAmount || 0}
            </Copy>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Copy weight="600" size={16}>
              Total Fare
            </Copy>
            <Copy size={30} weight="600" accent>
              ₹{fare?.finalTotalFare || 0}
            </Copy>
          </View>
          <Copy muted size={11}>
            {fare?.co2SavedKg || 0} kg CO₂ saved · {fare?.greenPointsEarned || 0} green points
          </Copy>
        </View>
      </Glass>

      <Action
        label="Continue to demo checkout"
        selected
        disabled={!valid}
        icon={CreditCard}
        onPress={() => setCheckout(true)}
      />
    </>
  );
}

export function TicketScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const t = app.ticket;
  const [qr, setQr] = useState('');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const cardRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    setQr('');
    if (t) app.rpc<string>('ticketQr', { ticket: t })
      .then(value => { if (active) setQr(value); })
      .catch(e => { if (active) app.setError(e.message); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!t) return <Notice>Choose a pass from your wallet.</Notice>;

  const complete = t.status === 'used' || t.currentLegStep === 'completed';
  const expired = new Date(t.validUntil).getTime() <= now;

  const remaining = (until: string) => {
    const n = Math.max(0, new Date(until).getTime() - now);
    return `${Math.floor(n / 3600000).toString().padStart(2, '0')}:${Math.floor((n % 3600000) / 60000)
      .toString()
      .padStart(2, '0')}:${Math.floor((n % 60000) / 1000).toString().padStart(2, '0')}`;
  };

  const scan = async () => {
    setBusy(true);
    await app.guard(async () => {
      const r = await app.rpc('scan', { id: t.id });
      if (r.updatedTicket) app.setTicket(r.updatedTicket);
      setFeedback(r.message + ' ' + r.nextMediumText);
      await app.loadAccount();
    });
    setBusy(false);
  };

  const pdf = () =>
    app.guard(async () => {
      const html = await app.rpc<string>('ticketHtml', { ticket: t });
      const result = await Print.printToFileAsync({ html });
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync()))
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Eco-Move ${t.id}`,
        });
    });

  const png = () =>
    app.guard(async () => {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Eco-Move ${t.id}`,
        });
      else throw Error('Sharing is unavailable on this device.');
    });

  return (
    <>
      {/* Boarding pass presentation card */}
      <View
        ref={cardRef}
        collapsable={false}
        style={{
          backgroundColor: dark ? '#0f241a' : '#ffffff',
          borderRadius: 28,
          padding: 22,
          gap: 14,
          borderWidth: 1,
          borderColor: dark ? 'rgba(74, 222, 128, 0.25)' : 'rgba(24, 109, 78, 0.2)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Leaf color={c.accent} size={22} strokeWidth={1.8} />
          <Copy size={15} weight="700" style={{ flex: 1 }}>
            eco-move
          </Copy>
          <Badge label="DEMO PASS" color={c.accent} />
        </View>

        <Copy size={24} weight="600" style={{ lineHeight: 28 }}>
          {t.source}{'\n'}↓ {t.destination}
        </Copy>
        <Copy muted size={12}>
          {t.lineOrRouteName}
        </Copy>

        <View style={{ height: 1, backgroundColor: c.line + '55', marginVertical: 2 }} />

        {qr ? (
          <Image
            source={{ uri: qr }}
            style={{
              width: '100%',
              maxWidth: 200,
              aspectRatio: 1,
              alignSelf: 'center',
              opacity: complete || expired ? 0.25 : 1,
            }}
            resizeMode="contain"
          />
        ) : (
          <ActivityIndicator color={c.accent} />
        )}

        <Copy size={14} weight="700" style={{ textAlign: 'center', letterSpacing: 0.5 }}>
          {complete ? 'JOURNEY COMPLETE' : expired ? 'PASS EXPIRED' : remaining(t.validUntil)}
        </Copy>

        <Copy size={12} muted style={{ textAlign: 'center' }}>
          Pass {t.id} · {t.totalPassengers} traveller{t.totalPassengers === 1 ? '' : 's'}
        </Copy>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Copy size={13} muted>
            Paid by {t.paymentMethod}
          </Copy>
          <Copy size={20} weight="700" accent>
            ₹{t.finalFare}
          </Copy>
        </View>

        <Copy muted size={10} style={{ textAlign: 'center' }}>
          Valid until {new Date(t.validUntil).toLocaleString()} · {t.transactionRef}
        </Copy>
      </View>

      {t.interchangeValidUntil && !complete && (
        <Notice>Transfer window · {remaining(t.interchangeValidUntil)}</Notice>
      )}

      {t.legs.map((l, i) => (
        <Copy key={l.id} size={13} weight={i === t.currentLegIndex ? '600' : '400'}>
          {i + 1}. {l.mode === 'metro' ? 'Metro' : 'Bus'} {l.lineOrRoute} · {l.from} → {l.to}
        </Copy>
      ))}

      {feedback ? <Notice>{feedback}</Notice> : null}

      <Action
        label="Simulate gate / bus validation"
        icon={QrCode}
        selected
        disabled={complete || expired}
        loading={busy}
        onPress={scan}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action label="Export PDF" icon={Download} compact quiet style={{ flex: 1 }} onPress={pdf} />
        <Action label="Share PNG" icon={Share2} compact quiet style={{ flex: 1 }} onPress={png} />
      </View>

      {t.gateScans?.map((s, i) => (
        <Copy size={11} muted key={i}>
          {new Date(s.timestamp).toLocaleTimeString()} · {s.gateName} · {s.action}
        </Copy>
      ))}
    </>
  );
}

