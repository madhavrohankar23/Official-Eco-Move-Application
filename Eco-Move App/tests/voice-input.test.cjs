const {test}=require('node:test'),assert=require('node:assert/strict');
const {load}=require('./helpers/load-ts.cjs');
const {extractSpokenRoute,normalizeSpokenPlace,selectVoicePlace,speechOptions,isVoiceLanguage,speechError}=load('src/voiceInput.ts');
test('English, Hindi, Marathi and code-switched route grammar retains the two spoken endpoints',()=>{
  const cases=[
    ['Plan a route from Sitabuldi to Airport','Sitabuldi','Airport'],
    ['How to reach Airport from Nagpur Railway Station?','Nagpur Railway Station','Airport'],
    ['मुझे सीताबर्डी से एयरपोर्ट जाना है','Sitabuldi','Airport'],
    ['मला सीताबर्डीपासून विमानतळापर्यंत जायचे आहे','Sitabuldi','Airport'],
    ['Sitabuldi se Airport जाना है','Sitabuldi','Airport'],
    ['मला Dharampeth पासून Nagpur Railway Station पर्यंत जायचे आहे','Dharampeth','Nagpur Railway Station'],
    ['mujhe Sitabuldi se Airport jana hai','Sitabuldi','Airport'],
    ['mala Dharampeth pasun Airport paryant jayche aahe','Dharampeth','Airport'],
    ['नागपूर रेल्वे स्टेशनहून सीताबर्डीला जायचे आहे','Nagpur Railway Station','Sitabuldi'],
    ['सीताबर्डी ते विमानतळ','Sitabuldi','Airport'],
    ['From my location to Airport','Your location','Airport'],
    ['From Congress Nagar to Airport at 08:30 by metro','Congress Nagar','Airport'],
    ['मुझे कांग्रेस नगर से छत्रपति चौक जाना है','Congress Nagar','Chhatrapati Square'],
    ['मला लोकमान्य नगरपासून प्रजापती नगरपर्यंत जायचे आहे','Lokmanya Nagar','Prajapati Nagar'],
  ];
  for(const [query,origin,destination] of cases){const result=extractSpokenRoute(query);assert.equal(result?.origin,origin,query);assert.equal(result?.destination,destination,query)}
  for(const query of ['What is the schedule of bus 35?','Airport','Track bus from Sitabuldi to Airport','How do I book metro tickets?'])assert.equal(extractSpokenRoute(query),null,query);
});
test('recognizer uses selected Indian locale, bounded original place hints and final utterances',()=>{
  for(const lang of ['en-IN','hi-IN','mr-IN']){
    assert.equal(isVoiceLanguage(lang),true);const options=speechOptions(lang,[{name:'Sitabuldi'},{name:'Sitabuldi'},{name:'Airport'}]);
    assert.equal(options.lang,lang);assert.equal(options.contextualStrings.length,2);assert.equal(options.continuous,false);assert.equal(options.interimResults,true);
  }
  assert.equal(isVoiceLanguage('anything'),false);assert.equal(speechOptions('en-IN',Array.from({length:200},(_,i)=>({name:String(i)}))).contextualStrings.length,100);
});
test('unrecognized names are preserved for existing geocoding, and device speech failures explain recovery',()=>{
  assert.equal(normalizeSpokenPlace('अनोळखी ठिकाण'),'अनोळखी ठिकाण');
  assert.match(speechError('language-not-supported'),/language pack/);assert.match(speechError('not-allowed'),/permission/);assert.match(speechError('no-speech'),/No speech/);assert.match(speechError('network'),/connection/);
});
test('place resolution prefers exact/base names instead of a short unrelated keyword match',()=>{
  const fort={name:'Sitabuldi Fort'},interchange={name:'Sitabuldi (Interchange)'};
  assert.equal(selectVoicePlace('Sitabuldi',[fort,interchange,{name:'Sitabuldi Bus Terminal'}]),interchange);
  assert.equal(selectVoicePlace('Sitabuldi Fort',[interchange,fort]),fort);
  assert.equal(selectVoicePlace('Station',[{name:'East Station'},{name:'West Station'}]),null);
  assert.equal(selectVoicePlace('Station',[{name:'Station'},{name:'Station'}]),null);
});
