const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');
const from = { name: 'Source fixture', lat: 21.14, lon: 79.08 };
const to = { name: 'Destination fixture', lat: 21.09, lon: 79.05 };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

test('Safety Mode recalculates both ways and ignores a superseded mode response',async()=>{
  const h=harness();void h.render().plan(from,to,'cheapest','08:30');
  h.render().toggleSafeMode();assert.equal(h.render().safeMode,true);
  let calls=h.calls.filter(c=>c.method==='plan');assert.equal(calls[1].args.safeMode,true);assert.equal(calls[1].args.departureMin,510);
  h.render().toggleSafeMode();assert.equal(h.render().safeMode,false);
  calls=h.calls.filter(c=>c.method==='plan');assert.equal(calls[2].args.safeMode,false);assert.equal(calls[2].args.preference,'cheapest');
  h.requests[1].resolve({journeys:[{legs:[],isSafeMode:true}]});await flush();assert.equal(h.render().journeys.length,0);
  h.requests[2].resolve({journeys:[{legs:[],isSafeMode:false}]});await flush();assert.equal(h.render().journeys[0].isSafeMode,false);
  h.requests[0].resolve({journeys:[{legs:[],old:true}]});await flush();assert.equal(h.render().journeys[0].old,undefined);
});

test('unavailable safety routing does not silently display standard routes',async()=>{
  const h=harness();h.render().setOrigin(from);h.render().setDestination(to);h.render().toggleSafeMode();
  h.requests[0].resolve({journeys:[],error:'Safety dataset unavailable'});await flush();
  assert.equal(h.render().safeMode,true);assert.match(h.render().notice,/unavailable/);assert.equal(h.render().planning,false);
  assert.ok(!h.calls.some(c=>c.method==='fallback'));
});

function harness() {
  const states = [], refs = [], calls = [], requests = []; let si = 0, ri = 0;
  const react = { createContext: () => ({ Provider: 'context' }), createElement: (type, props) => ({ type, props }),
    useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => refs[ri++] ||= { current: initial }, useCallback: fn => fn, useEffect() {},
  };
  const gps = deferred();
  const rpc = async (method, args) => {
    calls.push({ method, args });
    if (method === 'plan') { const request = deferred(); requests.push(request); return request.promise; }
    if (method === 'enrich') return args.journey;
    if (method === 'recents') return [];
    return null;
  };
  const modules = { react,
    'react-native': { Keyboard: { dismiss() {} }, Platform: { OS: 'web' } },
    'expo-speech': { stop() {} },
    'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'granted' }), getCurrentPositionAsync: () => gps.promise, Accuracy: { Balanced: 1 } },
    './useRuntime': { useRuntime: () => ({ rpc, ready: true, auth: { user: { id: 'test' } } }) },
    './features/gestures/gestureBridge': { GestureZoomAccumulator: class {} },
  };
  const code = esbuild.transformSync(fs.readFileSync('src/AppContext.tsx', 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code;
  const box = { module: { exports: {} }, require: name => modules[name] || {} };
  vm.runInNewContext(code, box);
  const render = () => { si = 0; ri = 0; return box.module.exports.AppProvider({ children: null }).props.value; };
  return { render, calls, requests, gps };
}

test('source and destination retain distinct selections and only a completed pair starts results', async () => {
  const h = harness(); h.render().navigate('plan'); h.render().search('origin'); h.render().choosePlace(from);
  let app = h.render(); assert.equal(app.origin, from); assert.equal(app.destination, null); assert.equal(app.panel, 'plan'); assert.equal(h.requests.length, 0);
  app.search('destination'); h.render().choosePlace(to); app = h.render();
  assert.equal(app.origin, from); assert.equal(app.destination, to); assert.equal(app.panel, 'plan'); assert.equal(app.routeResultsOpen, true); assert.equal(app.planning, true);
  const payload = h.calls.find(call => call.method === 'plan').args;
  assert.equal(payload.origin, from); assert.equal(payload.destination, to);
  h.requests[0].resolve({ journeys: [{ legs: [], totalFareRs: 20 }] }); await flush();
  assert.equal(h.render().journeys.length, 1); assert.equal(h.render().planning, false);
});

test('editing an endpoint discards previous routes and ignores late planner results and errors', async () => {
  for (const fails of [false, true]) {
    const h = harness(); const request = h.render().plan(from, to);
    h.render().setDestination({ ...to, name: 'Changed', lon: 79.06 });
    if (fails) h.requests[0].reject(Error('Old request failed')); else h.requests[0].resolve({ journeys: [{ legs: [] }] });
    await request;
    const app = h.render(); assert.equal(app.routeResultsOpen, false); assert.equal(app.planning, false); assert.equal(app.journeys.length, 0); assert.equal(app.error, '');
  }
});

test('closing results restores editing and a late response cannot reopen them', async () => {
  const h = harness(); const request = h.render().plan(from, to); h.render().dismissRouteResults();
  h.requests[0].resolve({ journeys: [{ legs: [] }] }); await request;
  const app = h.render(); assert.equal(app.origin, from); assert.equal(app.destination, to); assert.equal(app.routeResultsOpen, false); assert.equal(app.collapsed, false); assert.equal(app.journeys.length, 0);
});

test('GPS selection leaves search and does not overwrite a newer manual choice', async () => {
  for (const changed of [false, true]) {
    const h = harness(); h.render().navigate('plan'); h.render().search('origin');
    const request = h.render().locate('origin'); await flush();
    if (changed) h.render().choosePlace(from);
    h.gps.resolve({ coords: { latitude: 21.12, longitude: 79.07 } }); await request;
    const app = h.render(); assert.equal(app.panel, 'plan'); assert.equal(app.locating, false);
    assert.equal(app.origin.name, changed ? from.name : 'Your location');
  }
});

test('identical endpoints show a correction instead of submitting a zero-length trip', async () => {
  const h = harness(); await h.render().plan(from, from);
  assert.equal(h.requests.length, 0); assert.match(h.render().error, /different places/);
});

test('clearing origin independently clears source, route preview, and stale directions state while destination remains intact', async () => {
  const h = harness();
  h.render().setOrigin(from);
  h.render().setDestination(to);
  h.render().setSearchedPlace(from);
  assert.equal(h.render().origin, from);
  assert.equal(h.render().destination, to);
  assert.equal(h.render().searchedPlace, from);

  h.render().setOrigin(null);
  const app = h.render();
  assert.equal(app.origin, null);
  assert.equal(app.destination, to);
  assert.equal(app.routeResultsOpen, false);
  assert.equal(app.journeys.length, 0);
  assert.equal(app.searchedPlace, null);
});

test('clearing destination independently clears destination, route preview, and stale directions state while origin remains intact', async () => {
  const h = harness();
  h.render().setOrigin(from);
  h.render().setDestination(to);
  h.render().setSearchedPlace(to);

  h.render().setDestination(null);
  const app = h.render();
  assert.equal(app.origin, from);
  assert.equal(app.destination, null);
  assert.equal(app.routeResultsOpen, false);
  assert.equal(app.journeys.length, 0);
  assert.equal(app.searchedPlace, null);
});

test('directions sets destination and clears searchedPlace so it cannot persist or repeatedly trigger directions', async () => {
  const h = harness();
  h.render().setOrigin(from);
  h.render().setSearchedPlace(to);
  assert.equal(h.render().searchedPlace, to);

  h.render().directions(to);
  const app = h.render();
  assert.equal(app.destination, to);
  assert.equal(app.searchedPlace, null);
  assert.equal(app.panel, 'plan');
});

test('replacing source independently preserves destination and triggers new plan with updated origin', async () => {
  const h = harness();
  h.render().navigate('plan');
  h.render().search('origin');
  h.render().choosePlace(from);
  h.render().search('destination');
  h.render().choosePlace(to);
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ journeys: [{ legs: [] }] });
  await flush();

  const newFrom = { name: 'New Source', lat: 21.15, lon: 79.09 };
  h.render().search('origin');
  h.render().choosePlace(newFrom);
  const app = h.render();
  assert.equal(app.origin, newFrom);
  assert.equal(app.destination, to);
  assert.equal(h.requests.length, 2);
  const payload = h.calls.filter(call => call.method === 'plan')[1].args;
  assert.equal(payload.origin, newFrom);
  assert.equal(payload.destination, to);
});
