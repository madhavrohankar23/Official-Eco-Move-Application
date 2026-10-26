const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-ts.cjs');
const {buildSpeechContext,chooseSpeechTranscript}=load('src/speechAccuracy.ts',{'./voiceInput':load('src/voiceInput.ts')});
const data={places:[{name:'Sitabuldi (Interchange)'}],metroLines:[{stations:['Airport Metro Station','Congress Nagar','Ajni Square']}],busRoutes:[{from:'Dharampeth',to:'Airport',stops:['Dharampeth','Congress Nagar','Airport']}]};
const context=buildSpeechContext(data);
test('hints include existing stations and current endpoints, deduplicate and respect the OS vocabulary bound',()=>{
  const result=buildSpeechContext({...data,busRoutes:[...data.busRoutes,...Array.from({length:200},(_,i)=>({from:'Stop '+i,to:'Terminal '+i,stops:[]}))]},[{name:'Selected station'}]);
  assert.equal(result.hints[0].name,'Selected station');assert.equal(result.hints.length,100);
  for(const name of ['airport','congressnagar','ajni','dharampeth','terminal199'])assert.ok(result.known.has(name),name);
  assert.equal(new Set(result.hints.map(p=>p.name.toLowerCase())).size,result.hints.length);
});
test('a credible alternative fixes a misheard station only when a known endpoint anchors the same trip',()=>{
  const result=chooseSpeechTranscript([{transcript:'From Set a birdie to Airport',confidence:.8},{transcript:'From Sitabuldi to Airport',confidence:.74}],context);
  assert.equal(result.text,'From Sitabuldi to Airport');assert.equal(result.review,false);
  const unrelated=chooseSpeechTranscript([{transcript:'From Unknown to Somewhere',confidence:.8},{transcript:'From Sitabuldi to Airport',confidence:.74}],context);
  assert.equal(unrelated.text,'From Unknown to Somewhere');
});
test('ambiguous alternatives and low-confidence final speech require editable transcript review',()=>{
  const ambiguous=chooseSpeechTranscript([{transcript:'From Unknown to Airport',confidence:.8},{transcript:'From Sitabuldi to Airport',confidence:.75},{transcript:'From Dharampeth to Airport',confidence:.73}],context);
  assert.equal(ambiguous.review,true);assert.equal(ambiguous.text,'From Unknown to Airport');
  assert.equal(chooseSpeechTranscript([{transcript:'From Sitabuldi to Airport',confidence:.3}],context).review,true);
  assert.equal(chooseSpeechTranscript([{transcript:'Dharampeth',confidence:.3}],context).review,true);
});
test('known top result remains authoritative; missing confidence and weak alternatives are not fabricated evidence',()=>{
  const top='From Sitabuldi to Airport';
  assert.equal(chooseSpeechTranscript([{transcript:top,confidence:.8},{transcript:'From Congress Nagar to Airport',confidence:.79}],context).text,top);
  for(const confidence of [0,-1,undefined])assert.equal(chooseSpeechTranscript([{transcript:top,confidence}],context).review,false);
  assert.equal(chooseSpeechTranscript([{transcript:'From Unknown to Airport',confidence:.9},{transcript:top,confidence:.5}],context).text,'From Unknown to Airport');
  assert.equal(chooseSpeechTranscript([],context).text,'');
});
