const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const esbuild = require('esbuild');

function load(file, modules) {
  const code = esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: 'tsx', format: 'cjs', jsx: 'transform' }).code;
  const box = { module: { exports: {} }, require: name => modules[name] || {} };
  vm.runInNewContext(code, box);
  return box.module.exports;
}
const createElement = (type, props, ...children) => ({ type, props: { ...props, children } });

test('demo loading prevents duplicate requests and releases the UI after failure for retry', async () => {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0, calls = 0, rejectRequest;
  const app = { ready: true, auth: { loading: false }, authMode: 'welcome',
    rpc: () => { calls++; return new Promise((_, reject) => { rejectRequest = reject; }); },
    guard: async fn => { try { await fn(); } catch (error) { app.error = error.message; } },
  };
  const react = { createElement,
    useState: initial => { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; }]; },
    useRef: initial => refs[refIndex++] ||= { current: initial }, useEffect: () => {},
  };
  const { AuthScreen } = load('src/screens/AuthScreen.tsx', {
    react, 'react-native': { View: 'View', StyleSheet: { absoluteFill: {}, create: x => x } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '../AppContext': { useApp: () => app }, '../theme': { useTheme: () => ({ c: {}, dark: false }) },
    '../components/AuthMotion': { AuthEntrance: 'Entrance', AuthLoading: 'Loading' },
  });
  const render = () => { stateIndex = 0; refIndex = 0; return AuthScreen(); };
  const welcome = tree => tree.props.children[0].props.children[0];
  const first = welcome(render()).props.onDemo();
  const pending = render();
  assert.equal(welcome(pending).props.busy, true);
  assert.equal(pending.props.children[0].props.pointerEvents, 'none');
  await welcome(pending).props.onDemo(); assert.equal(calls, 1);
  rejectRequest(Error('Network unavailable')); await first;
  assert.equal(app.error, 'Network unavailable');
  assert.equal(welcome(render()).props.busy, false);
  const retry = welcome(render()).props.onDemo(); assert.equal(calls, 2);
  rejectRequest(Error('Still offline')); await retry;
});

test('auth motion respects reduced motion and stops native animations on cleanup', () => {
  for (const reduced of [true, false]) {
    const effects = [], animations = [];
    class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return 0; } }
    const animation = () => { const item = { started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } }; animations.push(item); return item; };
    const { AuthEntrance, AuthLoading } = load('src/components/AuthMotion.tsx', {
      react: { createElement, useRef: value => ({ current: value }), useEffect: fn => effects.push(fn) },
      'react-native': { Animated: { Value, View: 'Animated', timing: animation, loop: a => a }, Easing: { out: x => x, cubic: 0, inOut: x => x, sin: 0 }, StyleSheet: { absoluteFill: {} }, View: 'View' },
      '../theme': { useTheme: () => ({ reduceMotion: reduced, active: true, c: {}, dark: false }) },
    });
    AuthEntrance({ children: 'content' }); AuthLoading({ label: 'Opening demo' });
    const cleanups = effects.map(fn => fn());
    assert.equal(animations.length, reduced ? 0 : 2);
    assert.ok(animations.every(item => item.started));
    cleanups.forEach(fn => fn?.());
    assert.ok(animations.every(item => item.stopped));
  }
});
