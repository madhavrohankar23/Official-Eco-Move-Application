import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";
import type { VoiceLanguage } from "./voiceInput";

type OutputOptions = {
  language: string;
  rate: number;
  onDone: () => void;
  onStopped: () => void;
  onError: () => void;
};
type OutputAdapter = {
  stop: () => Promise<void>;
  speak: (text: string, options: OutputOptions) => void;
  state: (speaking: boolean) => void;
  error: (message: string) => void;
};

/** One utterance owner: stale stop/completion callbacks cannot revive or stop a newer reply. */
export function createVoiceOutput(adapter: OutputAdapter) {
  let epoch = 0;
  const stop = () => {
    epoch++;
    adapter.state(false);
    void adapter.stop().catch(() => {});
  };
  const speak = async (message: string, preferred: VoiceLanguage) => {
    const text = message
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[*#_`>~]/g, "")
      .trim()
      .slice(0, 3900);
    if (!text) {
      stop();
      return;
    }
    const run = ++epoch;
    const current = () => run === epoch;
    const finish = () => {
      if (current()) adapter.state(false);
    };
    const fail = () => {
      if (current()) {
        adapter.state(false);
        adapter.error("Spoken audio is unavailable. The full response remains on screen.");
      }
    };
    try {
      await adapter.stop();
      if (!current()) return;
      // Responses and source navigation instructions may be English even when
      // the input language is Marathi/Hindi. Do not read English with that voice.
      const language = /[\u0900-\u097f]/u.test(text)
        ? preferred === "en-IN"
          ? "hi-IN"
          : preferred
        : "en-IN";
      adapter.state(true);
      adapter.speak(text, {
        language,
        rate: 0.93,
        onDone: finish,
        onStopped: finish,
        onError: fail,
      });
    } catch {
      fail();
    }
  };
  return { speak, stop };
}

export function useVoiceOutput(enabled: boolean, onError: (message: string) => void) {
  const [speaking, setSpeaking] = useState(false);
  const current = useRef({ enabled, onError, mounted: true });
  current.current.enabled = enabled;
  current.current.onError = onError;
  const [output] = useState(() =>
    createVoiceOutput({
      stop: () => Speech.stop(),
      speak: (text, options) => Speech.speak(text, options),
      state: (value) => {
        if (current.current.mounted) setSpeaking(value);
      },
      error: (message) => {
        if (current.current.mounted) current.current.onError(message);
      },
    }),
  );
  useEffect(() => {
    const lifetime = current.current;
    lifetime.mounted = true;
    return () => {
      lifetime.mounted = false;
      output.stop();
    };
  }, [output]);
  useEffect(() => {
    if (!enabled) output.stop();
  }, [enabled, output]);
  const speak = useCallback(
    (text: string, language: VoiceLanguage) => {
      if (current.current.enabled) void output.speak(text, language);
    },
    [output],
  );
  return { speaking, speak, stop: output.stop };
}
