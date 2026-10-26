const { test } = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const vm = require('node:vm');
const code = esbuild.buildSync({ entryPoints: ['src/materialMotion.ts'], bundle: true, write: false, format: 'cjs' }).outputFiles[0].text;
const box = { module: { exports: {} }, exports: {} };
vm.runInNewContext(code, box);
const { capsuleTrack } = box.module.exports;

test('search light stays on the capsule border with a continuous loop at every mobile width', () => {
  for (const viewport of [320, 360, 375, 390, 412, 430, 844]) {
    const width = viewport - 40, height = 52, inset = 1.25, radius = height / 2 - inset;
    const track = capsuleTrack(width, height, inset);
    assert.ok(Math.hypot(track.x[0] - track.x.at(-1), track.y[0] - track.y.at(-1)) < 1e-8, 'loop must not jump');
    let lastStep;
    for (let i = 0; i < track.x.length; i++) {
      const x = track.x[i], y = track.y[i];
      assert.ok(x >= inset - 1e-8 && x <= width - inset + 1e-8);
      assert.ok(y >= inset - 1e-8 && y <= height - inset + 1e-8);
      const onBorder = x < height / 2
        ? Math.abs(Math.hypot(x - height / 2, y - height / 2) - radius)
        : x > width - height / 2
          ? Math.abs(Math.hypot(x - width + height / 2, y - height / 2) - radius)
          : Math.min(Math.abs(y - inset), Math.abs(y - height + inset));
      assert.ok(onBorder < 1e-7, 'light must follow the edge rather than cross search content');
      if (i) {
        const step = Math.hypot(x - track.x[i - 1], y - track.y[i - 1]);
        if (lastStep) assert.ok(Math.abs(step / lastStep - 1) < 0.02, 'speed must remain smooth through corners');
        lastStep = step;
      }
    }
    assert.ok(Math.abs(parseFloat(track.angle.at(-1)) - 2 * Math.PI) < 1e-8, 'tangent must close without a flip');
  }
});
