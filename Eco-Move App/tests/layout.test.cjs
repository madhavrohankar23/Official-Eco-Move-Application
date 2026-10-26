const {test}=require('node:test');
const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const vm=require('node:vm');
const code=esbuild.buildSync({entryPoints:['src/layout.ts'],bundle:true,write:false,format:'cjs'}).outputFiles[0].text;
const box={module:{exports:{}},exports:{}};vm.runInNewContext(code,box);
const {navbarLayout,panelLayout,TABS}=box.module.exports;
test('five equal navigation targets fit every required width above the safe area',()=>{
  assert.equal(TABS.length,5);
  for(const width of [320,360,375,390,412,430])for(const inset of [0,24,34]){
    const l=navbarLayout(width,inset);
    assert.ok(l.itemWidth>=48&&l.touchHeight>=48);
    assert.ok(l.left>=16&&l.left+l.width<=width-16);
    assert.equal(l.bottom-inset,18);
    assert.ok(Math.abs(l.itemWidth*5+l.padding*2-l.width)<.01);
  }
});
test('panels leave usable map space and stay inside portrait and landscape viewports',()=>{
  for(const [w,h] of [[320,568],[360,800],[375,812],[390,844],[430,932],[844,390],[568,320]]){
    for(const expanded of [false,true])for(const collapsed of [false,true]){
      const l=panelLayout(w,h,24,0,expanded,collapsed,24);
      assert.ok(l.height+l.bottom<=h-24,`${w}x${h} panel clips`);
      assert.ok(l.left>=16);
      if(l.landscape)assert.ok(l.width<w/2);
      if(collapsed)assert.ok(l.height<=82);
    }
  }
});
test('Google attribution has a clear footer below navigation at all required sizes',()=>{
  for(const [w,h] of [[320,568],[360,800],[375,812],[390,844],[412,900],[430,932],[844,390],[568,320]]){
    const nav=navbarLayout(w,24,54);
    const sheet=panelLayout(w,h,24,0,true,false,24,54);
    assert.ok(nav.bottom>=58);
    assert.ok(sheet.bottom>=nav.bottom+nav.height+10);
    assert.ok(sheet.bottom+sheet.height<=h-24);
    const typing=panelLayout(w,h,24,260,true,false,24,54);
    assert.ok(typing.bottom>=24+18+44, 'keyboard sheet must leave satellite attribution clear');
  }
});
