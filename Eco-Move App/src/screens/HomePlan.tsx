import React, { useEffect, useState } from 'react';
import { Platform, Switch, View, useWindowDimensions } from 'react-native';
import { MotionPressable as Pressable } from '../components/MotionPressable';
import {
  ArrowDownUp,
  ArrowRight,
  Bookmark,
  Bus,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Footprints,
  Layers,
  Leaf,
  LocateFixed,
  MapPin,
  Radio,
  Route,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  TrainFront,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { duration, distance, PREFS, type Journey, type Point, type SearchTarget } from '../types';
import { LoadingRows } from '../components/Loading';

export function HomeScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const { height } = useWindowDimensions();
  const compactHome = height < 650 && !app.expanded;
  const [showAllPresets, setShowAllPresets] = useState(false);
  const presets = app.data?.presets || [];
  const visiblePresets = showAllPresets ? presets : presets.slice(0, 2);

  return (
    <>
      {/* Primary search trigger */}
      <Pressable
        accessibilityLabel="Where are you heading? Plan your route"
        accessibilityRole="button"
        onPress={() => app.navigate('plan')}
      >
        {({ pressed }) => (
          <Glass
            level={1}
            blur={false}
            state={pressed ? 'pressed' : 'default'}
            style={{
              borderRadius: 20,
              ...(!dark ? { boxShadow: '0px 4px 14px rgba(15, 23, 42, 0.06)', shadowOpacity: 0 } : {}),
            }}
          >
            <View
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: dark ? 'rgba(74, 222, 128, 0.12)' : 'rgba(18, 72, 49, 0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Route size={20} color={c.accent} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Copy size={16} weight="600">
                  Where are you heading?
                </Copy>
                <Copy size={12} muted>
                  Plan transit, metro, and bus routes
                </Copy>
              </View>
              <ArrowRight size={18} color={c.muted} strokeWidth={2} />
            </View>
          </Glass>
        )}
      </Pressable>

      {/* Quick Transit Hub */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action label="Live buses" icon={Radio} quiet compact style={{ flex: 1 }} onPress={() => app.open('live')} />
        <Action label="SafarBot" icon={Sparkles} quiet compact style={{ flex: 1 }} onPress={() => app.open('chat')} />
        <Action label="Cabs" icon={Car} quiet compact style={{ flex: 1 }} onPress={() => app.open('cabs')} />
      </View>

      {/* Familiar journeys with progressive disclosure */}
      <View style={{ gap: 8, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Familiar Journeys
          </Copy>
          {presets.length > 2 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showAllPresets ? 'Show fewer routes' : `Show all ${presets.length} routes`}
              onPress={() => setShowAllPresets(!showAllPresets)}
              style={{ paddingVertical: 4, paddingHorizontal: 6 }}
            >
              <Copy size={12} weight="600" accent>
                {showAllPresets ? 'Show fewer' : `All (${presets.length})`}
              </Copy>
            </Pressable>
          )}
        </View>

        {visiblePresets.map(p => (
          <Pressable
            key={p.id}
            accessibilityLabel={`${p.from.name} to ${p.to.name}`}
            accessibilityRole="button"
            onPress={() => app.startPreset(p)}
          >
            {({ pressed }) => (
              <Glass
                level={1}
                blur={false}
                state={pressed ? 'pressed' : 'default'}
                style={{
                  borderRadius: 20,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      backgroundColor: dark ? 'rgba(74, 222, 128, 0.12)' : 'rgba(24, 109, 78, 0.08)',
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {p.badge.includes('Metro') ? (
                      <TrainFront size={20} color={c.accent} strokeWidth={1.8} />
                    ) : (
                      <Bus size={20} color={c.accent} strokeWidth={1.8} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Copy size={15} weight="600">
                      {p.from.name} → {p.to.name}
                    </Copy>
                    <Copy size={12} muted>
                      {p.badge}
                    </Copy>
                  </View>
                  <ArrowRight size={17} color={c.muted} />
                </View>
              </Glass>
            )}
          </Pressable>
        ))}
      </View>

      {/* Secondary quick actions */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Action label="Bus timetable" icon={Clock} quiet compact style={{ flex: 1 }} onPress={() => app.open('timetable')} />
        <Action label="Map layers" icon={Layers} quiet compact style={{ flex: 1 }} onPress={() => app.open('layers')} />
      </View>
    </>
  );
}

export function LocationField({
  label,
  value,
  target,
}: {
  label: string;
  value: Point | null;
  target: SearchTarget;
}) {
  const app = useApp();
  const { c } = useTheme();

  const handleClear = () => {
    if (target === 'origin') app.setOrigin(null);
    else if (target === 'destination') app.setDestination(null);
    else if (target === 'cab_origin') app.setCabOrigin(null);
    else if (target === 'cab_destination') app.setCabDestination(null);
    else if (target === 'anchor') app.setAnchor(null);
    else if (target === 'place') app.setSearchedPlace(null);
    app.dismissRouteResults();
    app.setSearchedPlace(null);
  };

  return (
    <View style={{ gap: 5 }}>
      <Copy size={11} muted weight="600" style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Copy>
      <Glass level={1} blur={false} style={{ borderRadius: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Search ${label}`}
            onPress={() => app.search(target)}
            style={{
              minHeight: 52,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
            }}
          >
            <MapPin size={18} color={c.accent} strokeWidth={1.8} />
            <Copy size={15} weight={value ? '500' : '400'} muted={!value} numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1 }}>
              {value?.name || `Choose ${label.toLowerCase()}`}
            </Copy>
          </Pressable>
          {Boolean(value) && (
            <Pressable
              accessibilityLabel={`Clear ${label.toLowerCase()}`}
              accessibilityRole="button"
              testID={`clear-${target}`}
              onPress={handleClear}
              style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={17} color={c.muted} strokeWidth={2} />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel={`Choose ${label.toLowerCase()} on map`}
            accessibilityRole="button"
            onPress={() => app.pickMap(target)}
            style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}
          >
            <LocateFixed size={19} color={c.accent} strokeWidth={1.8} />
          </Pressable>
        </View>
      </Glass>
    </View>
  );
}

export function PlanScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [timeOpen, setTimeOpen] = useState(false);
  const [prefsExpanded, setPrefsExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => { setDetailsOpen(false); }, [app.routeResultsOpen]);

  const uniqueJourneys = React.useMemo(() => {
    const seen = new Set<string>();
    return app.journeys.filter(j => {
      const sig = `${j.totalTimeMin}-${j.totalFareRs}-${j.legs.map(l => `${l.mode}:${l.line||l.busNumber||''}:${l.from}->${l.to}`).join('|')}`;
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });
  }, [app.journeys]);

  const currentPref = PREFS.find(p => p.id === app.preference);

  return (
    <>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12,minHeight:48}}>
        <View style={{flex:1,gap:3}}><Copy weight="600">Safety Mode</Copy><Copy size={12} muted>{app.safeMode ? "On · corridor-aware routes" : "Off · standard routes"}</Copy></View>
        <Switch accessibilityLabel="Safety Mode" value={app.safeMode} onValueChange={app.toggleSafeMode} trackColor={{false:c.line,true:c.accent}}/>
      </View>
      {app.safeMode && <Notice>Uses the supplied corridor and nearby-support dataset. Lighting, access and safety are not live-verified. Times and safety-mode fares are estimates.</Notice>}
      {!app.routeResultsOpen && <>
      <LocationField label="Starting point" value={app.origin} target="origin" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <LocationField label="Destination" value={app.destination} target="destination" />
        </View>
        <View style={{ paddingTop: 18 }}>
          <Action
            label="Swap"
            icon={ArrowDownUp}
            quiet
            compact
            onPress={() => {
              const prevOrigin = app.origin;
              app.setOrigin(app.destination);
              app.setDestination(prevOrigin);
            }}
          />
        </View>
      </View>

      {/* Progressive disclosure: preference summary & departure toggle */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Action
          label={app.safeMode ? 'Safety priority' : `${currentPref?.label || 'Route options'} ▾`}
          disabled={app.safeMode}
          icon={SlidersHorizontal}
          selected={prefsExpanded}
          compact
          quiet={!prefsExpanded}
          style={{ flex: 1 }}
          onPress={() => setPrefsExpanded(!prefsExpanded)}
        />
        <Action
          label={app.departure === 'now' ? 'Leave now' : `Depart ${app.departure}`}
          icon={Clock}
          compact
          quiet
          style={{ flex: 1 }}
          onPress={() => setTimeOpen(!timeOpen)}
        />
        <Action
          label="GPS"
          accessibilityLabel="Use current location as Source"
          icon={LocateFixed}
          compact
          quiet
          loading={app.locating}
          onPress={app.useCurrentSource}
        />
      </View>

      {/* Expandable preference options */}
      {prefsExpanded && !app.safeMode && (
        <Glass level={1} blur={false} style={{ borderRadius: 20 }}>
          <View style={{ padding: 14, gap: 10 }}>
            <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Routing Preference
            </Copy>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {PREFS.map(p => (
                <Action
                  key={p.id}
                  label={p.label}
                  selected={p.id === app.preference}
                  compact
                  quiet={p.id !== app.preference}
                  onPress={() => {
                    app.setPreference(p.id);
                  }}
                />
              ))}
            </View>
          </View>
        </Glass>
      )}

      {/* Departure time picker */}
      {timeOpen &&
        (Platform.OS === 'web' ? (
          <Field
            label="Departure time (24-hour HH:mm)"
            placeholder="08:30"
            value={app.departure === 'now' ? '' : app.departure}
            onChangeText={app.setDeparture}
          />
        ) : (
          <DateTimePicker
            mode="time"
            value={new Date(`2026-10-08T${app.departure === 'now' ? '08:30' : app.departure}:00`)}
            onChange={(_, date) => {
              setTimeOpen(false);
              if (date) {
                app.setDeparture(
                  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                );
              }
            }}
          />
        ))}

      {app.departure !== 'now' && (
        <Action label="Reset to leave now" compact quiet onPress={() => app.setDeparture('now')} />
      )}

      {/* Primary Find Routes CTA */}
      <Action
        label={app.planning ? 'Finding your way…' : 'Find routes'}
        testID="find-routes"
        icon={Route}
        selected
        loading={app.planning}
        disabled={
          !app.origin ||
          !app.destination ||
          (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(app.departure) && app.departure !== 'now')
        }
        onPress={() => app.plan()}
      />
      </>}

      {app.routeResultsOpen && <>
        <View style={{gap:5}}>
          <Copy size={14} weight="600">{app.origin?.name} → {app.destination?.name}</Copy>
          <Copy size={12} muted>{app.planning ? 'Finding available connections…' : `${uniqueJourneys.length} available route${uniqueJourneys.length===1?'':'s'}`}</Copy>
        </View>
        <Action label="Edit trip" icon={SlidersHorizontal} quiet compact onPress={app.dismissRouteResults}/>
        {app.planning && <LoadingRows/>}
        {!app.planning && !uniqueJourneys.length && <Action label="Retry routes" icon={Route} onPress={()=>app.plan()}/>}
        {uniqueJourneys.length > 1 && !app.planning && (
          <View style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={`Fastest: ${duration(Math.min(...uniqueJourneys.map(j => j.totalTimeMin)))}`} color={c.accent} />
              <Badge label={`From ₹${Math.min(...uniqueJourneys.map(j => j.totalFareRs))}`} color="#10b981" />
              {uniqueJourneys.some(j => j.co2g != null && j.co2g > 0) && (
                <Badge label={`Lowest CO₂: ${Math.round(Math.min(...uniqueJourneys.filter(j => j.co2g != null && j.co2g > 0).map(j => j.co2g!)))}g`} color="#059669" />
              )}
            </View>
            <Action label="Compare route options" icon={Sparkles} quiet compact onPress={() => app.open('explain')} />
          </View>
        )}
      </>}

      {app.notice ? <Notice>{app.notice}</Notice> : null}
      <View style={{ minHeight: 18 }} accessibilityLiveRegion="polite">{app.enriching && <Copy size={12} muted>Refining pedestrian paths…</Copy>}</View>

      {/* Journey candidate cards */}
      {uniqueJourneys.map((journey, i) => (
        <JourneyCard
          key={`route-${i}-${journey.totalTimeMin}-${journey.totalFareRs}`}
          journey={journey}
          selected={i === app.selected}
          index={i}
          onPress={() => app.selectJourney(i)}
        />
      ))}

      {/* Selected journey details */}
      {app.journey && <Action label={detailsOpen?'Hide journey details':'Journey details'} icon={detailsOpen?ChevronUp:ChevronDown} quiet compact onPress={()=>setDetailsOpen(value=>!value)}/>}
      {app.journey && detailsOpen && (
        <View style={{ gap: 14, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action label="Save" icon={Bookmark} compact quiet onPress={app.saveJourney} style={{ flex: 1 }} />
            <Action label="Explain" icon={Sparkles} compact quiet onPress={() => app.open('explain')} style={{ flex: 1 }} />
            <Action label="View map" icon={MapPin} compact quiet onPress={() => app.setCollapsed(true)} style={{ flex: 1 }} />
          </View>

          <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Your Journey, Step by Step
          </Copy>

          {app.journey.isSafeMode && <Notice>{app.journey.safetySummary}{app.journey.safeCorridorsUsed?.length ? ` Corridors: ${app.journey.safeCorridorsUsed.join(", ")}.` : " No mapped corridor intersection confirmed."}{app.journey.guardianAnchorsNearby?.length ? ` Nearby support listed in dataset: ${app.journey.guardianAnchorsNearby.join(", ")}.` : ""}</Notice>}
          <Action label="Preview this route" icon={Route} quiet onPress={() => app.open('preview')} />
          {app.journey.legs.map((l, i) => (
            <LegRow leg={l} key={i} />
          ))}

          <Action
            label={app.journey.isFallbackDrive ? 'Explore cab options' : 'Choose a travel pass'}
            icon={app.journey.isFallbackDrive ? Car : Ticket}
            selected
            onPress={() => (app.journey?.isFallbackDrive ? app.open('cabs') : app.book(true))}
          />
        </View>
      )}
    </>
  );
}

function JourneyCard({
  journey: j,
  selected,
  index,
  onPress,
}: {
  journey: Journey;
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const { c, dark } = useTheme();

  return (
    <Pressable
      accessibilityLabel={`Route option ${index + 1}, ${duration(j.totalTimeMin)}, ${j.totalFareRs} rupees`}
      accessibilityState={{ selected }}
      accessibilityRole="button"
      onPress={onPress}
    >
      {({ pressed }) => (
        <Glass
          level={selected ? 3 : 1}
          blur={false}
          state={pressed ? 'pressed' : selected ? 'selected' : 'default'}
          style={{
            borderRadius: 24,
            ...(!dark ? {boxShadow: "0px 4px 14px rgba(15, 23, 42, 0.06)",shadowOpacity:0} : {}),
          }}
        >
          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Badge
                  label={
                    j.isSafeMode
                      ? (j.isFallbackDrive ? 'SAFETY · DRIVING ESTIMATE' : 'SAFETY MODE')
                      : j.isFallbackDrive
                      ? 'DRIVING ALTERNATIVE'
                      : index === 0
                      ? 'RECOMMENDED'
                      : `OPTION ${index + 1}`
                  }
                  color={j.isFallbackDrive ? '#f59e0b' : index === 0 ? c.accent : undefined}
                />
                <Copy size={26} weight="600">
                  {duration(j.totalTimeMin)}
                </Copy>
              </View>
              <Copy size={22} weight="600" accent>
                ₹{j.totalFareRs}
              </Copy>
            </View>

            {j.isSafeMode && <Copy size={12} muted>Estimated {j.isFallbackDrive ? "vehicle cost" : "fare"} · reference safety-routing model</Copy>}
            {j.legs.some(l=>l.mode==="walk"&&l.path.length<=2) && <Copy size={12} muted>Includes direct-distance walking estimates; pedestrian access is unverified.</Copy>}
            {/* Mode badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
              {j.legs
                .filter(l => l.mode !== 'walk')
                .map((l, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      gap: 5,
                      alignItems: 'center',
                      borderRadius: 12,
                      backgroundColor: dark ? 'rgba(74, 222, 128, 0.12)' : 'rgba(24, 109, 78, 0.08)',
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                    }}
                  >
                    {l.mode === 'metro' ? (
                      <TrainFront size={14} color={c.accent} />
                    ) : l.mode === 'bus' ? (
                      <Bus size={14} color={c.accent} />
                    ) : (
                      <Car size={14} color={c.accent} />
                    )}
                    <Copy size={11} weight="600">
                      {l.busNumber || l.line || 'Drive'}
                    </Copy>
                  </View>
                ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Copy muted size={12}>
                {j.departureTimeStr} → {j.arrivalTimeStr} · {distance(j.totalDistanceM)} total · {distance(j.walkDistanceM)} walk · {j.transfers} transfer{j.transfers === 1 ? '' : 's'}
              </Copy>
              {j.co2g != null && j.co2g > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Leaf size={12} color="#16a34a" />
                  <Copy size={12} style={{ color: dark ? '#4ade80' : '#15803d', fontWeight: '500' }}>
                    {j.co2g >= 1000 ? `${(j.co2g / 1000).toFixed(1)} kg CO₂` : `${Math.round(j.co2g)} g CO₂`}
                  </Copy>
                </View>
              )}
            </View>
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

function LegRow({ leg: l }: { leg: any }) {
  const app = useApp();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = l.mode === 'walk' ? Footprints : l.mode === 'bus' ? Bus : l.mode === 'metro' ? TrainFront : Car;

  return (
    <View style={{ gap: 8, borderLeftWidth: 2, borderColor: c.line, paddingLeft: 16, paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon
          size={19}
          color={l.mode === 'metro' ? (l.line?.includes('Blue') ? '#0088b2' : '#ad6125') : c.accent}
          strokeWidth={1.9}
        />
        <Copy weight="600" style={{ flex: 1 }}>
          {l.mode === 'walk' ? 'Walk' : l.busNumber ? `Bus ${l.busNumber}` : l.line || 'Drive'}
        </Copy>
        <Copy size={13} muted weight="500">
          {duration(l.timeMin)}
        </Copy>
      </View>
      <Copy size={14} weight="500">
        {l.from} → {l.to}
      </Copy>
      <Copy size={12} muted>
        {distance(l.distanceM)}
        {l.fareRs ? ` · ₹${l.fareRs}` : ''}
        {l.departureTimeStr ? ` · ${l.departureTimeStr}` : ''}
        {l.waitMin ? ` · Wait ${Math.round(l.waitMin)} min` : ''}
      </Copy>
      {l.stops?.length > 0 && (
        <Action
          label={`${open ? 'Hide' : 'Show'} ${l.stops.length} stops`}
          compact
          quiet
          onPress={() => setOpen(!open)}
        />
      )}
      {open &&
        l.stops.map((s: string, i: number) => (
          <Copy key={i} size={13} muted style={{ paddingLeft: 6 }}>
            {i + 1}. {s}
          </Copy>
        ))}
      {l.mode === 'bus' && (
        <Action
          label="Bus timetable"
          icon={Clock}
          compact
          quiet
          onPress={() => {
            app.setTimetableQuery({
              busNumber: l.busNumber,
              routeName: l.line,
              fromStop: l.from,
              toStop: l.to,
            });
            app.open('timetable');
          }}
        />
      )}
    </View>
  );
}

