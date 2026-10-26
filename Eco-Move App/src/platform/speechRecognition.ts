import { useEffect, useRef } from 'react';
import { requireOptionalNativeModule } from 'expo';

// The package's native entry point throws on import in Expo Go.
const nativeModule = requireOptionalNativeModule('ExpoSpeechRecognition');
export const isSpeechRecognitionSupported = !!nativeModule;
export const ExpoSpeechRecognitionModule = nativeModule || {
  requestPermissionsAsync: async () => ({ granted: false }),
  start: (_options: unknown) => { throw Error('Voice input requires the Eco-Move app build. You can type your destination in Expo Go.'); },
  stop: () => {},
  abort: () => {},
};

export function useSpeechRecognitionEvent(eventName: string, listener: (event: any) => void) {
  const current = useRef(listener);
  current.current = listener;
  useEffect(() => {
    if (!nativeModule) return;
    const subscription = nativeModule.addListener(eventName, (event: any) => current.current(event));
    return () => subscription.remove();
  }, [eventName]);
}
