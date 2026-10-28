const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const { load, deferred, tick } = require('./helpers/load-ts.cjs');

const from = { name: 'Sitabuldi (Interchange)', lat: 21.1414, lon: 79.0824 };
const to = { name: 'Nagpur Railway Station (Main Junction)', lat: 21.1528, lon: 79.0886 };
const airport = { name: 'Airport Metro Station', lat: 21.09, lon: 79.04 };

// 1. Search & Independence Tests
test('Search & Autocomplete: source and destination remain completely independent and editable', () => {
  const code = esbuild.transformSync(fs.readFileSync('src/AppContext.tsx', 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code;
  const states = [], refs = []; let si = 0, ri = 0;
  const react = {
    createContext: () => ({ Provider: 'context' }),
    createElement: (type, props) => ({ type, props }),
    useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => refs[ri++] ||= { current: initial },
    useCallback: fn => fn,
    useEffect() {},
  };
  const box = {
    module: { exports: {} },
    require: name => ({
      react,
      'react-native': { Keyboard: { dismiss() {} }, Platform: { OS: 'web' } },
      'expo-speech': { stop() {} },
      'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'granted' }), getCurrentPositionAsync: async () => ({ coords: { latitude: 21.14, longitude: 79.08 } }), Accuracy: { Balanced: 1 } },
      './useRuntime': { useRuntime: () => ({ rpc: async () => null, ready: true, auth: { user: { id: 'test' } } }) },
      './features/gestures/gestureBridge': { GestureZoomAccumulator: class {} },
    }[name] || {}),
  };
  vm.runInNewContext(code, box);
  const render = () => { si = 0; ri = 0; return box.module.exports.AppProvider({ children: null }).props.value; };

  // Set Origin
  render().setOrigin(from);
  let app = render();
  assert.equal(app.origin, from);
  assert.equal(app.destination, null);

  // Set Destination independently
  render().setDestination(to);
  app = render();
  assert.equal(app.origin, from);
  assert.equal(app.destination, to);

  // Clear Origin: Destination must remain untouched!
  render().setOrigin(null);
  app = render();
  assert.equal(app.origin, null);
  assert.equal(app.destination, to);

  // Replace Origin: Destination must remain untouched!
  render().setOrigin(airport);
  app = render();
  assert.equal(app.origin, airport);
  assert.equal(app.destination, to);

  // Clear Destination: Origin must remain untouched!
  render().setDestination(null);
  app = render();
  assert.equal(app.origin, airport);
  assert.equal(app.destination, null);
});

test('Search & Clear: clearing any field clears stale route preview and directions state', () => {
  const code = esbuild.transformSync(fs.readFileSync('src/AppContext.tsx', 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code;
  const states = [], refs = []; let si = 0, ri = 0;
  const react = {
    createContext: () => ({ Provider: 'context' }),
    createElement: (type, props) => ({ type, props }),
    useState: initial => { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef: initial => refs[ri++] ||= { current: initial },
    useCallback: fn => fn,
    useEffect() {},
  };
  const box = {
    module: { exports: {} },
    require: name => ({
      react,
      'react-native': { Keyboard: { dismiss() {} }, Platform: { OS: 'web' } },
      'expo-speech': { stop() {} },
      'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'granted' }), getCurrentPositionAsync: async () => ({ coords: { latitude: 21.14, longitude: 79.08 } }), Accuracy: { Balanced: 1 } },
      './useRuntime': { useRuntime: () => ({ rpc: async () => null, ready: true, auth: { user: { id: 'test' } } }) },
      './features/gestures/gestureBridge': { GestureZoomAccumulator: class {} },
    }[name] || {}),
  };
  vm.runInNewContext(code, box);
  const render = () => { si = 0; ri = 0; return box.module.exports.AppProvider({ children: null }).props.value; };

  // Setting endpoints and routes
  render().setOrigin(from);
  render().setDestination(to);
  render().setSearchedPlace(from);
  assert.equal(render().searchedPlace, from);

  // Triggering directions clears searchedPlace
  render().directions(to);
  assert.equal(render().searchedPlace, null);

  // Dismissing route results clears searchedPlace, routes, and routeResultsOpen
  render().setSearchedPlace(to);
  render().dismissRouteResults();
  assert.equal(render().searchedPlace, null);
  assert.equal(render().routeResultsOpen, false);
  assert.equal(render().journeys.length, 0);
});

// 2. Minimal Route-Discovery Workflow Tests
test('Route Discovery: panelLayout animates bottom navigation area into route results panel below search area', () => {
  const { panelLayout } = load('src/layout.ts');
  const w = 390, h = 844, safeTop = 44, safeBottom = 34;

  // Normal resting state (LiquidNav visible at bottom)
  const normal = panelLayout(w, h, safeBottom, 0, false, false, safeTop, 0, false);
  assert.equal(normal.bottom, safeBottom + 100); // 134 - floating above LiquidNav
  assert.ok(normal.height < 450); // resting compact height

  // Route results active (routeFocus: true, resting bottom-sheet mode)
  const results = panelLayout(w, h, safeBottom, 0, false, false, safeTop, 0, true);
  // Bottom smoothly settles right into the bottom navigation area (safeBottom + 16 = 50)
  assert.equal(results.bottom, safeBottom + 16);
  // Resting height leaves ample room for the map and route polyline in the upper half
  assert.ok(results.height >= 380 && results.height <= 450);
  assert.ok(results.bottom + results.height <= h - safeTop);

  // Expanded route results panel extends upward
  const expandedResults = panelLayout(w, h, safeBottom, 0, true, false, safeTop, 0, true);
  const expectedMax = Math.max(82, h - safeTop - expandedResults.bottom - 16);
  assert.equal(expandedResults.height, expectedMax);
  assert.ok(expandedResults.bottom + expandedResults.height <= h - safeTop);
});

// 3. n8n Voice Assistant Tests
test('Voice Assistant: natural phrase extracts source and destination accurately', () => {
  const { extractSpokenRoute } = load('src/voiceInput.ts');
  const phrase = 'From Sitabuldi to Nagpur Railway Station';
  const extracted = extractSpokenRoute(phrase);
  assert.ok(extracted);
  assert.equal(extracted.origin, 'Sitabuldi');
  assert.equal(extracted.destination, 'Nagpur Railway Station');
});

test('Voice Assistant: Marathi and Hindi natural phrases extract endpoints correctly', () => {
  const { extractSpokenRoute } = load('src/voiceInput.ts');
  const marathi = 'मला सीताबर्डीपासून नागपूर रेल्वे स्थानकपर्यंत जायचे आहे';
  const rMarathi = extractSpokenRoute(marathi);
  assert.ok(rMarathi);
  assert.equal(rMarathi.origin, 'Sitabuldi');
  assert.equal(rMarathi.destination, 'Nagpur Railway Station');

  const hindi = 'मुझे सीताबर्डी से नागपुर रेलवे स्टेशन जाना है';
  const rHindi = extractSpokenRoute(hindi);
  assert.ok(rHindi);
  assert.equal(rHindi.origin, 'Sitabuldi');
  assert.equal(rHindi.destination, 'Nagpur Railway Station');
});

test('Voice Assistant: resolves endpoints, populates fields, and prompts review without auto-starting routes', async () => {
  const { applyVoiceIntent } = load('src/applyVoiceIntent.ts', { './voiceInput': load('src/voiceInput.ts') });
  const calls = [];
  const app = {
    calls,
    origin: null,
    preference: 'balanced',
    departure: 'now',
    rpc: async (_, { query }) => {
      if (query === 'Sitabuldi') return [from];
      if (query === 'Nagpur Railway Station') return [to];
      return [];
    },
    setOrigin: p => calls.push(['setOrigin', p]),
    setDestination: p => calls.push(['setDestination', p]),
    setNotice: msg => calls.push(['setNotice', msg]),
    navigate: tab => calls.push(['navigate', tab]),
    open: p => calls.push(['open', p]),
    plan: (...args) => calls.push(['plan', ...args]),
  };

  await applyVoiceIntent({
    intent: 'PLAN_ROUTE',
    message: 'Planning your trip from Sitabuldi to Nagpur Railway Station',
    origin: 'Sitabuldi',
    destination: 'Nagpur Railway Station',
  }, app);

  // Validated locations populated into fields
  assert.equal(calls.find(c => c[0] === 'setOrigin')[1], from);
  assert.equal(calls.find(c => c[0] === 'setDestination')[1], to);
  assert.ok(calls.some(c => c[0] === 'navigate' && c[1] === 'plan'));

  // User review prompt must be shown; must NOT auto-plan
  assert.equal(calls.some(c => c[0] === 'plan'), false);
  const notice = calls.find(c => c[0] === 'setNotice')[1];
  assert.match(notice, /Review and confirm/);
});

test('Voice Assistant: asks for clarification on ambiguous source or destination rather than guessing', async () => {
  const { applyVoiceIntent } = load('src/applyVoiceIntent.ts', { './voiceInput': load('src/voiceInput.ts') });
  
  // Ambiguous destination
  const callsDest = [];
  const appDest = {
    calls: callsDest,
    origin: from,
    preference: 'balanced',
    departure: 'now',
    rpc: async method => method === 'searchOnline' ? [from, to] : [], // Ambiguous: multiple results returned
    setOrigin: p => callsDest.push(['setOrigin', p]),
    setDestination: p => callsDest.push(['setDestination', p]),
    setNotice: msg => callsDest.push(['setNotice', msg]),
    navigate: tab => callsDest.push(['navigate', tab]),
    open: p => callsDest.push(['open', p]),
    plan: (...args) => callsDest.push(['plan', ...args]),
  };

  await applyVoiceIntent({
    intent: 'PLAN_ROUTE',
    message: 'Trip',
    origin: 'Sitabuldi',
    destination: 'Ambiguous Destination',
  }, appDest);

  assert.equal(callsDest.some(c => c[0] === 'plan'), false);
  const noticeDest = callsDest.find(c => c[0] === 'setNotice')[1];
  assert.match(noticeDest, /could not identify destination/i);

  // Ambiguous origin with valid destination
  const callsOrigin = [];
  const appOrigin = {
    calls: callsOrigin,
    origin: from,
    preference: 'balanced',
    departure: 'now',
    rpc: async (method, { query } = {}) => {
      if (query === 'Nagpur Railway Station') return [to];
      if (method === 'searchOnline') return [from, to]; // Ambiguous for other query
      return [];
    },
    setOrigin: p => callsOrigin.push(['setOrigin', p]),
    setDestination: p => callsOrigin.push(['setDestination', p]),
    setNotice: msg => callsOrigin.push(['setNotice', msg]),
    navigate: tab => callsOrigin.push(['navigate', tab]),
    open: p => callsOrigin.push(['open', p]),
    plan: (...args) => callsOrigin.push(['plan', ...args]),
  };

  await applyVoiceIntent({
    intent: 'PLAN_ROUTE',
    message: 'Trip',
    origin: 'Ambiguous Origin',
    destination: 'Nagpur Railway Station',
  }, appOrigin);

  assert.equal(callsOrigin.some(c => c[0] === 'plan'), false);
  const noticeOrigin = callsOrigin.find(c => c[0] === 'setNotice')[1];
  assert.match(noticeOrigin, /could not identify Source/i);
});
