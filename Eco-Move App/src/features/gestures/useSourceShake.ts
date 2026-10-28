import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestShakePermission } from '../../platform/shake';
import { preferenceWriter } from '../../preferenceWriter';

const KEY = 'eco_move_shake_source';

/** A source shake temporarily takes priority without overwriting the voice preference. */
export function shakeDestination(source: boolean, voice: boolean) {
  return source ? 'source' : voice ? 'voice' : null;
}

export function useSourceShakePreference(onError: (message: string) => void, onReady: () => void) {
  const [enabled, setEnabled] = useState(false);
  const revision = useRef(0);
  const mounted = useRef(true);
  const writer = useRef(preferenceWriter(value => AsyncStorage.setItem(KEY, value)));
  useEffect(() => {
    mounted.current = true;
    const version = ++revision.current;
    const pendingWriter = writer.current;
    void AsyncStorage.getItem(KEY).then(value => {
      if (mounted.current && version === revision.current) setEnabled(value === 'true');
    }).catch(() => {});
    return () => { mounted.current = false; void pendingWriter.flush().catch(() => {}); };
  }, []);

  const setSourceShakeEnabled = async (value: boolean) => {
    const version = ++revision.current;
    if (value) {
      try {
        const permission = await requestShakePermission();
        if (!mounted.current || version !== revision.current) return;
        if (!permission.granted) {
          onError('Motion permission is off. Use “Use current location as Source” instead.');
          return;
        }
      } catch {
        if (mounted.current && version === revision.current)
          onError('Motion sensing is unavailable. Use “Use current location as Source” instead.');
        return;
      }
    }
    if (!mounted.current || version !== revision.current) return;
    setEnabled(value);
    writer.current.set(String(value));
    if (value) onReady();
  };
  return { sourceShakeEnabled: enabled, setSourceShakeEnabled };
}
