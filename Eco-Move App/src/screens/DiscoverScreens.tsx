import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Switch, View } from 'react-native';
import { MotionPressable as Pressable } from '../components/MotionPressable';
import {
  ArrowRight,
  Bus,
  Car,
  Clock,
  Compass,
  Hospital,
  Shield,
  Layers,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
  TrainFront,
  Utensils,
} from 'lucide-react-native';
import { useApp } from '../AppContext';
import { useTheme } from '../theme';
import { Action, Badge, Copy, Field, Glass, Notice } from '../components/Glass';
import { LocationField } from './HomePlan';
import { distance, duration } from '../types';

export function NearbyScreen() {
  const app = useApp();
  const { c, dark } = useTheme();

  return (
    <>
      <LocationField label="Search around" value={app.anchor} target="anchor" />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Action
          label="Use my location"
          icon={LocateFixed}
          compact
          quiet
          loading={app.locating}
          style={{ flex: 1 }}
          onPress={() => app.locate('anchor')}
        />
        <Action
          label="Pick on map"
          icon={MapPin}
          compact
          quiet
          style={{ flex: 1 }}
          onPress={() => app.pickMap('anchor')}
        />
      </View>

      {/* Segmented radius selector */}
      <View style={{ gap: 6 }}>
        <Copy size={11} muted weight="600" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          Transit radius
        </Copy>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[500, 1000, 2500, 5000].map(r => (
            <Action
              label={distance(r)}
              key={r}
              selected={app.radius === r}
              onPress={() => app.setRadius(r)}
              compact
              quiet={app.radius !== r}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      </View>

      {/* Segmented category tabs */}
      <View style={{ gap: 8 }}>
        <Copy size={11} muted weight="600" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          Category
        </Copy>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action
              label="Transit"
              icon={TrainFront}
              compact
              quiet={app.nearbyTab !== 'stops'}
              selected={app.nearbyTab === 'stops'}
              onPress={() => {
                app.setNearbyTab('stops');
                app.setPoiCategory(null);
              }}
              style={{ flex: 1 }}
            />
            <Action
              label="Live buses"
              icon={Bus}
              compact
              quiet={app.nearbyTab !== 'buses'}
              selected={app.nearbyTab === 'buses'}
              onPress={() => {
                app.setNearbyTab('buses');
                app.setPoiCategory(null);
              }}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action
              label="Food"
              icon={Utensils}
              compact
              quiet={app.nearbyTab !== 'Restaurant'}
              selected={app.nearbyTab === 'Restaurant'}
              onPress={() => {
                app.setNearbyTab('Restaurant');
                app.setPoiCategory('Restaurant');
              }}
              style={{ flex: 1 }}
            />
            <Action
              label="Hospitals"
              icon={Hospital}
              compact
              quiet={app.nearbyTab !== 'Hospital'}
              selected={app.nearbyTab === 'Hospital'}
              onPress={() => {
                app.setNearbyTab('Hospital');
                app.setPoiCategory('Hospital');
              }}
              style={{ flex: 1 }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Action
              label="Police"
              icon={Shield}
              compact
              quiet={app.nearbyTab !== 'Police Station'}
              selected={app.nearbyTab === 'Police Station'}
              onPress={() => {
                app.setNearbyTab('Police Station');
                app.setPoiCategory('Police Station');
              }}
              style={{ flex: 1 }}
            />
            <View style={{ flex: 1 }} />
          </View>
        </View>
      </View>

      {!app.anchor ? (
        <Notice>Choose a location to discover transit nearby. Picking on the map keeps the map open.</Notice>
      ) : (
        <>
          <Copy size={12} muted weight="500">
            {app.poiCategory ? 'Nearest places to' : `${distance(app.radius)} around`} {app.anchor.name}
          </Copy>

          {/* Transit Stops */}
          {app.nearbyTab === 'stops' && (
            <View style={{ gap: 10 }}>
              {[...app.nearbyData.metroStations, ...app.nearbyData.busStops].map((s: any) => (
                <Glass level={1} blur={false} style={{ borderRadius: 22 }} key={s.id + s.mode}>
                  <View style={{ padding: 16, gap: 12 }}>
                    <Pressable
                      accessibilityLabel={`Show ${s.name} on map`}
                      accessibilityRole="button"
                      onPress={() => {
                        app.guard(() => app.rpc('center', s));
                        app.setCollapsed(true);
                      }}
                    >
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            backgroundColor: dark
                              ? 'rgba(74, 222, 128, 0.12)'
                              : 'rgba(24, 109, 78, 0.08)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {s.mode === 'metro' ? (
                            <TrainFront size={20} color={c.accent} strokeWidth={1.8} />
                          ) : (
                            <Bus size={20} color={c.accent} strokeWidth={1.8} />
                          )}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Copy weight="600" size={15}>
                            {s.name}
                          </Copy>
                          <Copy muted size={12}>
                            {s.lineName || 'Aapli Bus'} · {distance(s.distM)} · {s.walkMin} min walk
                          </Copy>
                        </View>
                      </View>
                    </Pressable>
                    <Action
                      label="Directions here"
                      icon={ArrowRight}
                      compact
                      quiet
                      onPress={() => app.directions(s)}
                    />
                  </View>
                </Glass>
              ))}

              {!app.nearbyData.busStops.length && !app.nearbyData.metroStations.length && (
                <Notice>No transit stops within this radius. Try a wider area.</Notice>
              )}
            </View>
          )}

          {/* Live Buses in vicinity */}
          {app.nearbyTab === 'buses' && (
            <View style={{ gap: 10 }}>
              <Copy muted size={12}>
                Chalo telemetry refreshes every 5 seconds.
              </Copy>
              {app.nearbyBuses.length ? (
                app.nearbyBuses.map(b => (
                  <Glass level={1} blur={false} key={b.id} style={{ borderRadius: 22 }}>
                    <View style={{ padding: 16, gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Copy weight="600" size={16}>
                          Bus {b.routeName}
                        </Copy>
                        <Badge label={b.nextStopEta > 0 ? (b.nextStopEta < 45 ? 'Arriving' : `${Math.ceil(b.nextStopEta / 60)} min`) : 'ETA unavailable'} />
                      </View>
                      <Copy muted size={13}>
                        {b.fromName} → {b.toName}
                      </Copy>
                      <Copy muted size={12}>
                        Next: {b.nextStopName} · {distance(b.distM)} away
                      </Copy>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Action
                          label="Show on map"
                          icon={MapPin}
                          quiet
                          compact
                          style={{ flex: 1 }}
                          onPress={() => {
                            app.setNearbyBus(b);
                            app.guard(() => app.rpc('center', b));
                            app.setCollapsed(true);
                          }}
                        />
                        <Action
                          label="Track route"
                          icon={Radio}
                          quiet
                          compact
                          style={{ flex: 1 }}
                          onPress={() => {
                            app.setBusQuery(b.routeName);
                            app.open('live');
                          }}
                        />
                      </View>
                    </View>
                  </Glass>
                ))
              ) : (
                <Notice>No live vehicles returned in this area. You can still explore the stop network and timetable.</Notice>
              )}
            </View>
          )}

          {/* POIs: Restaurants & Hospitals */}
          {app.poiCategory && (
            <View style={{ gap: 10 }}>
              <Action
                label="Search across Nagpur"
                icon={Compass}
                compact
                quiet
                onPress={() =>
                  app.guard(async () =>
                    app.setPois(await app.rpc('cityPois', { anchor: app.anchor, category: app.poiCategory }))
                  )
                }
              />
              {app.poiCategory === 'Police Station' && <Notice>Static station directory supplied with the updated project. Addresses and contact details may change.</Notice>}
              {app.pois.map(p => (
                <Glass level={1} blur={false} key={p.id} style={{ borderRadius: 22 }}>
                  <View style={{ padding: 16, gap: 8 }}>
                    <Copy weight="600" size={15}>
                      {p.name}
                    </Copy>
                    <Copy muted size={12}>
                      {p.subtitle} · {distance(p.distM)}
                    </Copy>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <Action
                        label="Show on map"
                        compact
                        quiet
                        icon={MapPin}
                        style={{ flex: 1 }}
                        onPress={() => {
                          app.guard(() => app.rpc('center', p));
                          app.setCollapsed(true);
                        }}
                      />
                      <Action
                        label="Directions"
                        icon={ArrowRight}
                        quiet
                        compact
                        style={{ flex: 1 }}
                        onPress={() => app.directions(p)}
                      />
                    </View>
                  </View>
                </Glass>
              ))}
              {!app.pois.length && <Notice>No places returned. Choose another location or category.</Notice>}
            </View>
          )}
        </>
      )}
    </>
  );
}

export function LayersScreen() {
  const app = useApp();
  return (
    <>
      <Copy muted size={14}>
        Configure map style and overlay detail.
      </Copy>
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <Action
          label="CARTO Voyager"
          selected={app.mapStyle === 'carto'}
          icon={Layers}
          onPress={() => app.setMapStyle('carto')}
          compact
          style={{ flex: 1 }}
        />
        <Action
          label="Google Roadmap"
          selected={app.mapStyle === 'roadmap'}
          icon={MapPin}
          onPress={() => app.setMapStyle('roadmap')}
          compact
          style={{ flex: 1 }}
        />
      </View>

      <Action label="Google Satellite" icon={Layers} selected={app.mapStyle === 'satellite'} loading={app.satelliteState.status === 'loading'} onPress={() => app.setMapStyle('satellite')} />
      <View style={{ minHeight: 20 }} accessibilityLiveRegion="polite">
        {app.satelliteState.status === 'loading' ? <Copy muted size={12}>Loading satellite imagery…</Copy> : app.satelliteState.status === 'error' ? <Notice error>{app.satelliteState.message}</Notice> : app.mapStyle === 'satellite' ? <Copy muted size={12}>Google Maps imagery · Routes and stops remain interactive.</Copy> : null}
      </View>
      <ToggleRow
        label="Bus stops & corridors"
        detail="Aapli Bus network"
        value={app.showBusStops}
        onChange={app.setShowBusStops}
      />
      <ToggleRow
        label="Metro stations & lines"
        detail="Orange and Aqua lines"
        value={app.showMetroStations}
        onChange={app.setShowMetroStations}
      />
      <ToggleRow
        label="Network overview"
        detail="Existing network layer"
        value={app.showNetwork}
        onChange={app.setShowNetwork}
      />

      <Action label="Return to the map" icon={MapPin} onPress={() => app.setCollapsed(true)} selected />
    </>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { c } = useTheme();
  return (
    <View
      style={{
        minHeight: 58,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderColor: c.line + '55',
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Copy weight="500" size={15}>
          {label}
        </Copy>
        {detail && (
          <Copy muted size={12}>
            {detail}
          </Copy>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.line, true: c.accent }}
        thumbColor={value ? '#ffffff' : '#f4f6f4'}
      />
    </View>
  );
}

export function LiveScreen() {
  const app = useApp();
  const { c, dark } = useTheme();
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    app.rpc<any[]>('liveSearch', { query: app.busQuery }).then(r => {
      if (active) setRoutes(r);
    }).catch(e => { if (active) app.setError(e.message); });
    return () => {
      active = false;
    };
  }, [app.busQuery]);

  return (
    <>
      <Field
        label="Bus number, stop or terminal"
        value={app.busQuery}
        onChangeText={app.setBusQuery}
        placeholder="Try 35, 1 or Sitabuldi"
      />
      {loading && <ActivityIndicator color={c.accent} />}

      {app.liveRoute && (
        <Glass level={2} blur={false} style={{ borderRadius: 24 }}>
          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Badge label="CHALO TELEMETRY" color={c.accent} />
                <Copy weight="600" size={22}>
                  Bus {app.liveRoute.display_bus_number}
                </Copy>
              </View>
              <Radio size={24} color={c.accent} strokeWidth={2} />
            </View>

            <Copy size={14} weight="500">
              {app.liveRoute.route_name}
            </Copy>

            <Copy size={12} muted>
              {app.telemetry?.vehicles?.length || 0} active vehicles
              {app.telemetry?.lastUpdated
                ? ` · Updated ${new Date(app.telemetry.lastUpdated).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </Copy>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <Action label="Refresh" icon={RefreshCw} quiet compact onPress={() => app.guard(app.refreshLive)} />
              <Action label="Show route" icon={MapPin} quiet compact onPress={() => app.setCollapsed(true)} />
              <Action
                label="Timetable"
                icon={Clock}
                quiet
                compact
                onPress={() => {
                  app.setTimetableQuery({
                    busNumber: app.liveRoute.bus_number,
                    routeName: app.liveRoute.route_name,
                  });
                  app.open('timetable');
                }}
              />
            </View>

            {!app.liveRoute.isLiveEnriched && (
              <Notice>Live route details have not been returned. Stop coordinates will appear when Chalo responds.</Notice>
            )}
            {app.telemetry?.error && <Notice error>{app.telemetry.error}</Notice>}

            {app.liveStop && (
              <Notice>
                {app.liveStop.name}
                {(app.telemetry?.stopsEta?.[app.liveStop.stop_id] || [])
                  .map((e: any) => ` · ${e.vNo}: ${Math.ceil(e.etaSeconds / 60)} min`)
                  .join('')}
              </Notice>
            )}

            <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              Route Stops
            </Copy>
            {app.liveRoute.stops?.map((stop: any, i: number) => (
              <Pressable
                key={stop.stop_id}
                accessibilityRole="button"
                accessibilityLabel={`Show stop ${stop.name}`}
                disabled={!stop.lat}
                onPress={() => {
                  app.setLiveStop(stop);
                  app.setCollapsed(true);
                }}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderColor: c.line + '55',
                }}
              >
                <Copy size={14}>{i + 1}. {stop.name}</Copy>
                {(app.telemetry?.stopsEta?.[stop.stop_id] || []).slice(0, 2).map((e: any) => (
                  <Copy key={e.vNo} size={11} muted>
                    {e.vNo} · {e.etaSeconds < 45 ? 'Arriving' : `${Math.ceil(e.etaSeconds / 60)} min`}
                    {e.isHalted ? ' · Halted' : ''}
                  </Copy>
                ))}
              </Pressable>
            ))}
          </View>
        </Glass>
      )}

      <Copy size={11} muted weight="600" style={{ letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
        Find a Route
      </Copy>
      {routes.map(r => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          accessibilityLabel={`Track bus ${r.display_bus_number}, ${r.route_name}`}
          onPress={async () => {
            setLoading(true);
            await app.track(r);
            setLoading(false);
          }}
        >
          {({ pressed }) => (
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderColor: c.line + '55',
                alignItems: 'center',
                opacity: pressed ? 0.7 : 1,
              }}
            >
              <Glass
                level={1}
                blur={false}
                style={{
                  width: 50,
                  height: 42,
                  borderRadius: 14,
                }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Copy weight="600" size={14}>
                    {r.display_bus_number}
                  </Copy>
                </View>
              </Glass>
              <View style={{ flex: 1, gap: 2 }}>
                <Copy size={14} weight="500">
                  {r.from_terminal} → {r.to_terminal}
                </Copy>
                <Copy size={11} muted>
                  {r.stopsCount} stops
                </Copy>
              </View>
              <ArrowRight size={16} color={c.muted} />
            </View>
          )}
        </Pressable>
      ))}
      {!routes.length && <Notice>No route matches that search.</Notice>}
    </>
  );
}

export function TimetableScreen() {
  const app = useApp();
  const [query, setQuery] = useState(app.timetableQuery.busNumber || '');
  const [result, setResult] = useState<any>(null);
  const [slot, setSlot] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    app
      .rpc('timetable', { ...app.timetableQuery, busNumber: query })
      .then(setResult)
      .catch(e => app.setError(e.message))
      .finally(() => setLoading(false));
  }, [query, app.timetableQuery.fromStop]);

  return (
    <>
      <Field label="Bus number" placeholder="Search a bus number" value={query} onChangeText={setQuery} />
      {loading && <ActivityIndicator />}

      {!result && !loading && (
        <Notice>Enter a bus number to see its original timetable and route variants.</Notice>
      )}

      {result?.matchedRoutes?.map((r: any, i: number) => (
        <Glass key={r.routeId + i} level={1} blur={false} style={{ borderRadius: 24 }}>
          <View style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Copy size={22} weight="600">
                Bus {r.displayBusNumber}
              </Copy>
              <Badge label={`${r.tripsPerDay} departures`} />
            </View>
            <Copy size={14} weight="500">{r.routeName}</Copy>
            <Copy muted size={12}>
              First: {r.firstBus} · Last: {r.lastBus} · {duration(r.durationMin)}
            </Copy>
            <Copy size={13}>
              {r.boardingStopName ? `Boarding at ${r.boardingStopName}` : 'Departures from starting terminal'}
            </Copy>
            {r.nextBus ? (
              <Notice>Next departure {r.nextBus.formattedTime} · in {r.nextBus.minutesUntil} min</Notice>
            ) : (
              <Notice>All listed departures have passed for today.</Notice>
            )}

            {/* Time of day tabs */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['all', 'morning', 'afternoon', 'evening', 'night'].map(s => (
                <Action
                  key={s}
                  label={s[0].toUpperCase() + s.slice(1)}
                  selected={slot === s}
                  quiet={slot !== s}
                  compact
                  onPress={() => setSlot(s)}
                />
              ))}
            </View>

            {/* Departure slots grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {(slot === 'all' ? r.departures : r.timeSlots[slot]).map((d: any, j: number) => (
                <Glass
                  key={j}
                  level={1}
                  blur={false}
                  state={d.isNext ? 'selected' : d.isPast ? 'disabled' : 'default'}
                  style={{ borderRadius: 12 }}
                >
                  <View style={{ paddingHorizontal: 11, paddingVertical: 8 }}>
                    <Copy size={13} weight={d.isNext ? '600' : '400'}>
                      {d.formattedTime}
                    </Copy>
                  </View>
                </Glass>
              ))}
            </View>

            <Copy size={11} muted weight="600" style={{ letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              Stop Sequence · Tap for Boarding Departures
            </Copy>
            {r.stops.map((s: string, j: number) => (
              <Action
                key={s + j}
                label={`${j + 1}. ${s}`}
                quiet
                compact
                onPress={() =>
                  app.setTimetableQuery({ ...app.timetableQuery, busNumber: query, fromStop: s })
                }
              />
            ))}
          </View>
        </Glass>
      ))}
    </>
  );
}

export function CabsScreen() {
  const app = useApp();
  const [loading, setLoading] = useState(false);
  const from = app.cabOrigin || app.origin;
  const to = app.cabDestination || app.destination;

  const find = async () => {
    if (!from || !to) return;
    setLoading(true);
    app.setCabOrigin(from);
    app.setCabDestination(to);
    await app.guard(async () =>
      app.setCabResults(await app.rpc('cabs', { origin: from, destination: to }))
    );
    setLoading(false);
  };

  return (
    <>
      <LocationField label="Cab pickup" value={from} target="cab_origin" />
      <LocationField label="Cab destination" value={to} target="cab_destination" />
      <Action
        label="Find cab options"
        icon={Car}
        loading={loading}
        disabled={!from || !to}
        selected
        onPress={find}
      />

      {app.cabResults && (
        <View style={{ gap: 12, marginTop: 4 }}>
          <Notice>
            {app.cabResults.source === 'live_uber_graphql'
              ? 'Prices returned by Uber.'
              : 'Estimated prices from the original fallback service.'}{' '}
            Confirm final fare and availability in Uber.
          </Notice>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Copy size={14} weight="500">
              {app.cabResults.distanceKm?.toFixed(1)} km · {duration(app.cabResults.durationMinutes)}
            </Copy>
            <Action
              label="View road route"
              icon={MapPin}
              quiet
              compact
              onPress={() => app.setCollapsed(true)}
            />
          </View>

          {app.cabResults.products.map((p: any, i: number) => (
            <Glass key={i} level={1} blur={false} style={{ borderRadius: 24 }}>
              <View style={{ padding: 18, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {p.productImageUrl && (
                    <Image
                      source={{ uri: p.productImageUrl }}
                      style={{ width: 68, height: 46 }}
                      resizeMode="contain"
                    />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Copy size={18} weight="600">
                      {p.displayName}
                    </Copy>
                    <Copy size={12} muted>
                      {p.etaInMin} min away · {p.capacity} seats
                    </Copy>
                  </View>
                  <Copy size={20} weight="600" accent>
                    {p.fare}
                  </Copy>
                </View>
                <Copy muted size={13}>
                  {p.description}
                </Copy>
                <Action
                  label={`Continue in Uber · ${p.displayName}`}
                  icon={ArrowRight}
                  quiet
                  compact
                  disabled={!p.isAvailable}
                  onPress={() =>
                    app.guard(async () => {
                      const url = await app.rpc<string>('cabLink', {
                        origin: from,
                        destination: to,
                        product: p,
                      });
                      await Linking.openURL(url);
                    })
                  }
                />
              </View>
            </Glass>
          ))}
        </View>
      )}
    </>
  );
}

