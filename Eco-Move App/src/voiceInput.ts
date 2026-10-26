import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

export const VOICE_LANGUAGES = [
  { id: 'en-IN', label: 'English' },
  { id: 'hi-IN', label: 'हिन्दी' },
  { id: 'mr-IN', label: 'मराठी' },
] as const;
export type VoiceLanguage = typeof VOICE_LANGUAGES[number]['id'];
export const isVoiceLanguage = (value: unknown): value is VoiceLanguage =>
  VOICE_LANGUAGES.some(language => language.id === value);

// Speech spelling equivalents for existing station labels, not geographic data.
// Keep coordinates, service information and routing exclusively in protected/.
export const STATION_SPEECH_SPELLINGS: readonly (readonly [string, ...string[]])[] = [
  ['Automotive Square','ऑटोमोटिव स्क्वेअर','ऑटोमोटिव्ह स्क्वेअर','ऑटोमोटिव चौक'],
  ['Nari Road','नारी रोड'], ['Indora Square','इंदोरा चौक','इंदोरा स्क्वेअर'],
  ['Kadvi Chowk','कडवी चौक','कडबी चौक'], ['GaddiGodam Square','गड्डीगोदाम चौक','गड्डी गोदाम चौक'],
  ['Kasturchand Park','कस्तूरचंद पार्क','कस्तुरचंद पार्क'],
  ['Zero Mile Freedom Park','झिरो माईल फ्रीडम पार्क','जीरो माइल फ्रीडम पार्क','झिरो माईल','जीरो माइल'],
  ['Sitabuldi Interchange','सीताबर्डी इंटरचेंज','सीताबुलडी इंटरचेंज'],
  ['Congress Nagar','काँग्रेस नगर','कांग्रेस नगर'], ['Rahate Colony','रहाटे कॉलनी','राहाटे कॉलनी','रहाटे कॉलोनी'],
  ['Ajni Square','अजनी चौक','अजनी स्क्वेअर'], ['Chhatrapati Square','छत्रपती चौक','छत्रपति चौक','छत्रपती स्क्वेअर'],
  ['Jaiprakash Nagar','जयप्रकाश नगर'], ['Ujjwal Nagar','उज्ज्वल नगर','उज्वल नगर'],
  ['Airport South','एयरपोर्ट साउथ','एअरपोर्ट साउथ','दक्षिण विमानतळ'],
  ['New Airport','न्यू एयरपोर्ट','न्यू एअरपोर्ट','नवीन विमानतळ'],
  ['Airport','विमानतळ','एयरपोर्ट','एअरपोर्ट'], ['Khapri','खापरी'],
  ['Prajapati Nagar','प्रजापती नगर','प्रजापति नगर'], ['Vaishno Devi Chowk','वैष्णो देवी चौक','वैष्णोदेवी चौक'],
  ['Ambedkar Chowk','आंबेडकर चौक','अंबेडकर चौक'], ['Telephone Exchange','टेलिफोन एक्सचेंज','टेलीफोन एक्सचेंज'],
  ['Chittar Oli Chowk','चितार ओली चौक','चित्तर ओली चौक'], ['Agrasen Chowk','अग्रसेन चौक'],
  ['Dosar Vaisya Chowk','दोसर वैश्य चौक'], ['Nagpur Railway Station','नागपूर रेल्वे स्टेशन','नागपुर रेलवे स्टेशन','नागपूर रेल्वे स्थानक'],
  ['Cotton Market','कॉटन मार्केट'], ['Jhansi Rani Chowk','झाशी राणी चौक','झांसी रानी चौक'],
  ['Institute of Engineers','इन्स्टिट्यूट ऑफ इंजिनिअर्स','इंस्टिट्यूट ऑफ इंजीनियर्स'],
  ['Shankar Nagar Square','शंकर नगर चौक','शंकर नगर स्क्वेअर'], ['LAD Square','एल ए डी चौक','एलएडी चौक','एलएडी स्क्वेअर'],
  ['Dharampeth College','धरमपेठ कॉलेज','धर्मपेठ कॉलेज'], ['Subhash Nagar','सुभाष नगर'],
  ['Rachna Ring Road','रचना रिंग रोड'], ['Vasudev Nagar','वासुदेव नगर'], ['Bansi Nagar','बंसी नगर','बन्सी नगर'],
  ['Lokmanya Nagar','लोकमान्य नगर'],
];
const spellingPairs=STATION_SPEECH_SPELLINGS.flatMap(([name,...spellings])=>spellings.map(spelling=>[spelling,name] as const)).sort((a,b)=>b[0].length-a[0].length);
const spellingNames=new Map(spellingPairs);
const spellingPattern=new RegExp(spellingPairs.map(([spelling])=>spelling.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');

export function speechOptions(language: VoiceLanguage, places: readonly { name: string }[] = []): ExpoSpeechRecognitionOptions {
  return {
    lang: language, interimResults: true, continuous: false, maxAlternatives: 3,
    iosTaskHint: 'search', addsPunctuation: false,
    // Recognition hints come from the existing places, never from a new network dataset.
    contextualStrings: [...new Set(places.map(place => place.name))].slice(0, 100),
  };
}

// Spoken spelling/translation aliases only. Coordinates and place selection remain
// owned by the existing local/online place services.
export function normalizeSpokenPlace(value: string): string {
  return value.normalize('NFC').replace(/[।?!.,]+$/u, '').trim()
    .replace(/(चौक|नगर|स्टेशन|स्क्वेअर|पार्क|रोड|विमानतळ)ा$/u,'$1')
    .replace(spellingPattern,spelling=>spellingNames.get(spelling)!)
    .replace(/\bsitaburdi\b|\bsitabardi\b|\bsitaburdee\b/gi, 'Sitabuldi')
    .replace(/(?:मेरी|मेरे|माझ्या|माझे)\s*(?:सध्याच्या\s*)?(?:लोकेशन|स्थान|ठिकाण)(?:ाहून|ा)?|current location|my location/giu, 'Your location')
    .replace(/सीताब(?:र्डी|र्डि|र्डी|र्ड|र्दी|ल्डी|लदी)|सीताबुलडी|सिताबर्डी|सिताबुलडी/gu, 'Sitabuldi')
    .replace(/विमानतळा?|हवाई\s*अड्डा|एअरपोर्ट|एयरपोर्ट/gu, 'Airport')
    .replace(/धर्मपेठ|धरमपेठ|धारमपेठ/gu, 'Dharampeth')
    .replace(/नागपूर|नागपुर/gu, 'Nagpur')
    .replace(/रेल्वे\s*(?:स्थानक|स्टेशन)|रेलवे\s*स्टेशन/gu, 'Railway Station')
    .replace(/मेट्रो\s*स्टेशन|मेट्रो\s*स्थानक/gu, 'Metro Station')
    .replace(/बस\s*(?:स्टॉप|थांबा)/gu, 'Bus Stop')
    .replace(/\s+/g, ' ').trim();
}

/** Equate spoken station labels with abbreviations already used in the network. */
export function voiceStationKey(value:string):string {
  return normalizeSpokenPlace(value).toLowerCase().replace(/\([^)]*\)/g,' ')
    .replace(/\b(?:metro station|metro|interchange)\b/g,' ').replace(/\bstation\b/g,' ')
    .replace(/\bngr\b/g,'nagar').replace(/\bclg\b/g,'college')
    .replace(/\b(?:sq|square|chowk|chouk)\b/g,' ')
    .replace(/\binstitution of eng\b|\binstitute of engineers\b/g,'engineers')
    .replace(/\bexchang\b/g,'exchange').replace(/\bvaisya\b/g,'vaishya')
    .replace(/\bchittar\b/g,'chitar').replace(/\brachana\b/g,'rachna')
    .replace(/[^\p{L}\p{N}]/gu,'');
}

/** Prefer an exact spoken name, then a station's base name; never an arbitrary keyword hit. */
export function selectVoicePlace<T extends {name:string}>(query:string, places:readonly T[]):T|null {
  const key=(name:string)=>normalizeSpokenPlace(name).toLowerCase().replace(/\s+/g,' ').trim();
  const wanted=key(query);
  const ranked=places.map(place=>{
    const full=key(place.name),base=full.replace(/\s*\([^)]*\)/g,'').trim();
    const station=base.replace(/\s+(?:metro station|bus stop|bus terminal)$/i,'');
    return {place,score:full===wanted?100:base===wanted?90:station===wanted?80:0};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
  if(ranked.length===1||ranked.length>1&&ranked[0].score>ranked[1].score)return ranked[0].place;
  return places.length===1?places[0]:null;
}

function cleanEndpoint(value: string): string {
  return normalizeSpokenPlace(value
    .replace(/\s+(?:at\s+\d{1,2}(?::\d{2})?(?:\s*[ap]m)?|today|tomorrow|tonight|by\s+(?:bus|metro)|using\s+(?:bus|metro)|fastest|cheapest|with\s+(?:less|least|fewest))\b.*$/i, '')
    .replace(/\s+(?:सुबह|शाम|रात|सकाळी|उद्या|आज|स्वस्त).*$/u, '')
    .replace(/^(?:(?:please|plan|a|route|journey|directions|show|me|take|go|travel|how|do|i|can|want|to|reach|get)\s+)+/i, '')
    .replace(/^(?:(?:मुझे|मला|कृपया|मी|मैं|हमें|आपण|mujhe|mala|please)\s+)+/iu, '')
    .replace(/\s*(?:(?:तक|पर्यंत|पर्यन्त|ला)(?:\s|$).*|(?:जाना|जाने|जायचे|जायचं|जायचेय|जायचय|जायचंय|पोहोचायचे|पोहचायचे|जाऊ|कसे|कैसे|जायला|jana|jaana|jayche|jaycha|jaayche|paryant|tak)\b.*)$/iu, '')
    .replace(/\s*(?:जाना|जाने|जायचे|जायचं|जायचेय|जायचय|जायचंय|पोहोचायचे|पोहचायचे|जाऊ|कसे|कैसे|जायला).*$/u, '')
    .replace(/\s+(?:please|by\s+(?:bus|metro)|using\s+(?:bus|metro))[.!?\s]*$/i, ''));
}

/** Extract only explicit two-endpoint route grammar; do not guess places from a general question. */
export function extractSpokenRoute(query: string): { origin: string; destination: string } | null {
  const text = query.normalize('NFC').trim().replace(/[।?!]+$/u, '');
  if (/\b(?:track|timetable|schedule)\b/i.test(text)) return null;
  let match = text.match(/\bfrom\s+(.+?)\s+to\s+(.+)$/i);
  if (!match) {
    const reverse = text.match(/\b(?:to|reach)\s+(.+?)\s+from\s+(.+)$/i);
    if (reverse) match = [reverse[0], reverse[2], reverse[1]] as RegExpMatchArray;
  }
  if (!match) match = text.match(/^(.+?)(?:\s+(?:se|pasun|hoon)\s+|\s*(?:पासून|हून|से)\s*)(.+)$/iu);
  if (!match) match = text.match(/^(.+?)\s+(?:ते|to)\s+(.+)$/iu);
  if (!match) return null;
  const origin = cleanEndpoint(match[1]);
  const destination = cleanEndpoint(match[2]);
  if (!origin || !destination || origin.length > 200 || destination.length > 200) return null;
  return { origin, destination };
}

export function speechError(code: string | undefined, message?: string): string {
  if (code === 'language-not-supported' || code === 'language-unavailable')
    return 'This speech service does not have the selected language. Enable its language pack in device settings, choose another language, or type the command.';
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return 'Microphone or speech permission is off. Allow access in device settings, or type the command.';
  if (code === 'no-speech') return 'No speech was heard. Tap Voice, speak clearly, and check the selected language.';
  if (code === 'network') return 'Speech recognition could not connect. Check your connection and try again, or type the command.';
  return message || 'Speech recognition stopped. Please retry or type the command.';
}
