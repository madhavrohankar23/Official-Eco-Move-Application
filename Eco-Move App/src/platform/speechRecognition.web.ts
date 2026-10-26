// Preserve the browser Web Speech implementation; native uses the optional adapter.
export { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
export const isSpeechRecognitionSupported = typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
