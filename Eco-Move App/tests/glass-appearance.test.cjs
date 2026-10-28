const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');
const box = { module: { exports: {} }, exports: {} };
vm.runInNewContext(esbuild.buildSync({entryPoints:['src/glassTokens.ts'],bundle:true,write:false,format:'cjs'}).outputFiles[0].text, box);
const { glassMaterial, glassChoices, readGlassAppearance } = box.module.exports;
const palette = { module: {exports:{}}, exports:{}, require:()=>({createContext:()=>({})}) };
vm.runInNewContext(esbuild.buildSync({entryPoints:['src/theme.tsx'],bundle:true,write:false,format:'cjs',packages:'external'}).outputFiles[0].text,palette);
const {getThemedColors}=palette.module.exports;

function rgba(value) { return value.match(/[\d.]+/g).map(Number); }
function hex(value) { return value.match(/\w\w/g).map(c => parseInt(c, 16)); }
function over(base, paint, alpha = paint[3] ?? 1) { return base.map((v, i) => v * (1 - alpha) + paint[i] * alpha); }
function lum(rgb) { return rgb.map(v => {const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); }
function contrast(a,b) {const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}

test('default and persisted appearance values resolve without changing other settings', () => {
  for (const v of [undefined, null, '', 'unknown', 'light', '{}']) assert.equal(readGlassAppearance(v), 'liquid');
  for (const v of ['liquid','matte','solid']) assert.equal(readGlassAppearance(v),v);
  const materials = glassChoices.map(c=>glassMaterial(c.id,true,0,3));
  assert.ok(materials[0].opacity < materials[1].opacity && materials[1].opacity < materials[2].opacity);
  assert.ok(materials[1].blur > materials[0].blur && materials[2].blur === 0,'Matte diffuses the background; Solid does not sample it');
  assert.ok(materials[1].opacity >= .97 && materials[1].saturation < 1,'Matte is opaque frost with restrained color');
  assert.ok(materials[0].reflection > 0 && materials[1].reflection === 0 && materials[2].reflection === 0);
});

test('Light mode is matte white across saved materials, with grey boundaries and no reflective blur',()=>{
  for(const appearance of ['liquid','matte','solid'])for(const level of [1,2,3,4]){
    const m=glassMaterial(appearance,false,0,level);
    assert.equal(m.opacity,1);assert.equal(m.blur,0);assert.equal(m.reflection,0);assert.equal(m.flowing,false);
    assert.equal(m.edge,'#d3d9d5');assert.ok(m.shadowOpacity>=.10 && m.shadowOpacity<=.22);
  }
});

test('material text retains WCAG normal-text contrast over bright, dark and colorful backgrounds', () => {
  let minimum = Infinity;
  for (const theme of glassChoices) for (const dark of [false,true]) for (const fallback of [false,true]) {
    for (const level of [1,2,3,4]) for (const behind of [[255,255,255],[0,0,0],[244,210,113],[61,146,95],[55,122,180]]) {
      const material=glassMaterial(theme.id,dark,0,level,false,!fallback);
      let surface=over(behind,rgba(material.tint));
      // Worst-case top highlight and a hovered, selected nested card.
      surface=over(surface,dark?[234,255,247]:[255,255,255],material.highlight);
      surface=over(surface,[230,255,240],material.reflection * .35);
      for (const selected of [false,true]) {
        let card=over(surface,rgba(glassMaterial(theme.id,dark,0,3,true).tint));
        if(selected)card=over(card,rgba(material.selection));
        card=over(card,dark?[255,255,255]:[255,255,255],dark?.035:.125);
        for(const ink of ['ink','muted','accent'].map(key=>getThemedColors(dark,0)[key].slice(1))) {
          const ratio=contrast(hex(ink),card);minimum=Math.min(minimum,ratio);
          assert.ok(ratio>=4.5,`${theme.id}, dark=${dark}, fallback=${fallback}, level=${level}, ink=${ink}, selected=${selected}: ${ratio.toFixed(2)}:1`);
        }
      }
    }
  }
  console.log(`Minimum computed text contrast: ${minimum.toFixed(2)}:1`);
});

test('existing enhanced contrast strengthens every preset and removes backdrop/moving reflections', () => {
  for (const theme of glassChoices) for(const dark of [false,true]) for (const level of [1,2,3,4]) {
    const normal=glassMaterial(theme.id,dark,0,level);
    const enhanced=glassMaterial(theme.id,dark,100,level);
    assert.equal(enhanced.opacity,1);assert.equal(enhanced.blur,0);assert.equal(enhanced.reflection,0);assert.equal(enhanced.flowing,false);
    assert.ok(enhanced.opacity>=normal.opacity);
    assert.equal(glassMaterial(theme.id,dark,0,level,true).blur,0,'nested cards must not sample the map again');
  }
});
