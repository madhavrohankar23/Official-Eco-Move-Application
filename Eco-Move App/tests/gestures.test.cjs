const test = require('node:test');
const assert = require('node:assert/strict');

// Exercise the actual shipped TypeScript, never a copy of its implementation.
const vm=require('node:vm');const esbuild=require('esbuild');
const box={module:{exports:{}},exports:{}};
vm.runInNewContext(esbuild.buildSync({entryPoints:['src/features/gestures/gestureUtils.ts'],bundle:true,write:false,format:'cjs'}).outputFiles[0].text,box);
const {calculateEuclideanDistance,calculateEuclideanDistance3D,applyExponentialSmoothing,clamp,calculateMeanAndVariance,classifyPinchState,computeZoomDelta,GestureMotionTracker:TestGestureMotionTracker}=box.module.exports;
const DEFAULT_CONFIG={maxZoomDelta:.6,minZoomDelta:.04};

test('calculates 2D and 3D Euclidean distances between thumb and index tips accurately', () => {
  const thumb = { x: 0.4, y: 0.5 };
  const index = { x: 0.7, y: 0.9 };
  const dist2d = calculateEuclideanDistance(thumb, index);
  assert.equal(Math.round(dist2d * 1000) / 1000, 0.5);

  const thumb3d = { x: 0.0, y: 0.0, z: 0.0 };
  const index3d = { x: 0.0, y: 0.3, z: 0.4 };
  const dist3d = calculateEuclideanDistance3D(thumb3d, index3d);
  assert.equal(Math.round(dist3d * 1000) / 1000, 0.5);
});

test('exponential moving average dampens high-frequency landmark jitter', () => {
  const previous = 0.10;
  const noisyCurrent = 0.20;
  const alpha = 0.35;
  const smoothed = applyExponentialSmoothing(noisyCurrent, previous, alpha);

  // 0.35 * 0.20 + 0.65 * 0.10 = 0.07 + 0.065 = 0.135
  assert.equal(Math.round(smoothed * 1000) / 1000, 0.135);
  assert.ok(smoothed < noisyCurrent && smoothed > previous, 'Smoothed value stays within expected bounds');
});

test('classifies pinch state with deadband hysteresis', () => {
  const baseline = 0.12;

  // Exact baseline or within neutral threshold (0.025)
  assert.equal(classifyPinchState(0.12, baseline), 'neutral');
  assert.equal(classifyPinchState(0.13, baseline), 'neutral');
  assert.equal(classifyPinchState(0.11, baseline), 'neutral');

  // Clear spread (zoom in)
  assert.equal(classifyPinchState(0.18, baseline), 'spreading');

  // Clear pinch (zoom out)
  assert.equal(classifyPinchState(0.06, baseline), 'pinching');

  // Uncalibrated / null baseline
  assert.equal(classifyPinchState(0.15, null), 'none');
});

test('computes bounded, smooth zoom deltas without drift when fingers stay in deadband', () => {
  const baseline = 0.10;

  // Finger tremor within deadband (0.025) produces strictly 0 zoom
  assert.equal(computeZoomDelta(0.11, baseline), 0);
  assert.equal(computeZoomDelta(0.09, baseline), 0);

  // Decisive spread produces positive zoom delta bounded by maxZoomDelta
  const spreadDelta = computeZoomDelta(0.25, baseline);
  assert.ok(spreadDelta > 0, 'Spreading produces positive zoom delta');
  assert.ok(spreadDelta <= DEFAULT_CONFIG.maxZoomDelta, 'Delta is bounded by maxZoomDelta');
  assert.ok(spreadDelta >= DEFAULT_CONFIG.minZoomDelta, 'Delta respects minZoomDelta');

  // Decisive pinch produces negative zoom delta bounded by -maxZoomDelta
  const pinchDelta = computeZoomDelta(0.03, baseline);
  assert.ok(pinchDelta < 0, 'Pinching produces negative zoom delta');
  assert.ok(pinchDelta >= -DEFAULT_CONFIG.maxZoomDelta, 'Negative delta is bounded');
  assert.ok(pinchDelta <= -DEFAULT_CONFIG.minZoomDelta, 'Negative delta respects minZoomDelta');
});

test('GestureMotionTracker suppresses continuous zooming from a stationary pinched hand', () => {
  const tracker = new TestGestureMotionTracker(8, 0.003);
  let time = 1000;

  // 1. Initial decisive pinch movement
  tracker.push(0.05);
  tracker.push(0.05);
  tracker.push(0.05);
  const firstTrigger = tracker.shouldTriggerZoom(0.05, 'pinching', time, 180);
  assert.equal(firstTrigger, true, 'First intentional pinch triggers zoom');

  // 2. Cooldown period: immediate subsequent frame is rejected
  time += 50;
  const cooldownReject = tracker.shouldTriggerZoom(0.05, 'pinching', time, 180);
  assert.equal(cooldownReject, false, 'Rejected during cooldown window');

  // 3. User holds the pinch completely still after cooldown expires
  time += 200;
  tracker.push(0.0501);
  tracker.push(0.0502);
  tracker.push(0.0500);
  const stationaryReject = tracker.shouldTriggerZoom(0.0501, 'pinching', time, 180);
  assert.equal(stationaryReject, false, 'Stationary hand does NOT continuously zoom');

  // 4. User pinches even further with genuine movement
  time += 200;
  tracker.push(0.035);
  tracker.push(0.032);
  tracker.push(0.030);
  const intentionalMoveTrigger = tracker.shouldTriggerZoom(0.030, 'pinching', time, 180);
  assert.equal(intentionalMoveTrigger, true, 'Further intentional motion triggers zoom');
});

test('computes mean and variance for baseline stability verification', () => {
  const stableSamples = [0.12, 0.121, 0.119, 0.12, 0.122, 0.118];
  const { mean, variance } = calculateMeanAndVariance(stableSamples);
  assert.ok(Math.abs(mean - 0.12) < 0.005, 'Mean is close to 0.12');
  assert.ok(variance < 0.001, 'Variance is small for steady hand');

  const erraticSamples = [0.05, 0.25, 0.10, 0.35];
  const erratic = calculateMeanAndVariance(erraticSamples);
  assert.ok(erratic.variance > 0.01, 'Erratic movement produces high variance');
});

test('returning from a spread toward neutral does not keep zooming in',()=>{
  const tracker=new TestGestureMotionTracker();
  [.15,.20,.25].forEach(d=>tracker.push(d));
  assert.equal(tracker.shouldTriggerZoom(.25,'spreading',1000,320),true);
  [.25,.24,.23,.22,.21,.20,.19,.18].forEach(d=>tracker.push(d));
  assert.equal(tracker.shouldTriggerZoom(.18,'spreading',1500,320),false);
});
