import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Pause, Play, RotateCcw, MapPin, X, Volume2, VolumeX } from "lucide-react-native";
import { useApp } from "../../AppContext";
import { useTheme } from "../../theme";
import { Action, Copy, Glass, Notice } from "../../components/Glass";
import type { PreviewStatus, PreviewStep } from "./previewTypes";
import { useVoiceOutput } from "../../voiceOutput";

export function RoutePreviewScreen() {
  const { rpc, journey, back, appSuspended, collapsed, voiceLanguage, setNotice } = useApp();
  const {
    speaking,
    speak,
    stop: stopSpeaking,
  } = useVoiceOutput(!appSuspended && !collapsed, setNotice);
  const { reduceMotion } = useTheme();
  const [steps, setSteps] = useState<PreviewStep[]>([]);
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const active = useRef(true);
  const control = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      try {
        await rpc("preview", { action, ...extra });
        if (active.current) setStatus(await rpc<PreviewStatus>("previewStatus"));
      } catch (e) {
        if (active.current) setError(e instanceof Error ? e.message : "Preview unavailable.");
      }
    },
    [rpc],
  );
  useEffect(() => {
    let live = true;
    active.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const value = await rpc<PreviewStatus>("previewStatus");
        if (live) setStatus(value);
      } catch {
        /* A temporary bridge restart must not keep an animation running. */
      }
      if (live) timer = setTimeout(poll, 600);
    };
    void rpc<PreviewStep[]>("preview", { action: "start", journey: journey })
      .then((value) => {
        if (live) {
          setSteps(value);
          setLoading(false);
          void poll();
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      live = false;
      active.current = false;
      clearTimeout(timer);
      void rpc("preview", { action: "stop" }).catch(() => {});
    };
  }, [journey, rpc]);
  useEffect(() => {
    if (reduceMotion || appSuspended || collapsed) void control("pause");
  }, [reduceMotion, appSuspended, collapsed, control]);
  const total = steps.at(-1)?.cumDistanceEndM || 1;
  return (
    <>
      <Notice>
        Route preview uses the selected route geometry. It is not live GPS guidance; follow signs
        and actual pedestrian access.
      </Notice>
      {error ? <Notice error>{error}</Notice> : null}
      <Glass level={2} blur={false}>
        <View style={{ padding: 16, gap: 10 }}>
          <Copy weight="600">{status?.state.headline || "Explore your route"}</Copy>
          <Copy muted size={12}>
            {Math.round((status?.state.progress || 0) * 100)}% of preview
          </Copy>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Action
              label={status?.playing ? "Pause" : "Play preview"}
              icon={status?.playing ? Pause : Play}
              selected
              compact
              disabled={loading || reduceMotion || !!error}
              onPress={() => void control(status?.playing ? "pause" : "play")}
            />
            <Action
              label="Restart"
              icon={RotateCcw}
              quiet
              compact
              disabled={loading}
              onPress={() => void control("restart")}
            />
            <Action label="Exit preview" icon={X} quiet compact onPress={back} />
            {speaking ? (
              <Action
                label="Stop spoken instruction"
                icon={VolumeX}
                quiet
                compact
                onPress={stopSpeaking}
              />
            ) : null}
          </View>
          {reduceMotion ? (
            <Copy muted size={12}>
              Reduced motion is on. Select a step to inspect its location.
            </Copy>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              {([1, 2, 4] as const).map((speed) => (
                <Action
                  key={speed}
                  label={`${speed}×`}
                  compact
                  quiet
                  selected={status?.speed === speed}
                  onPress={() => void control("speed", { speed })}
                />
              ))}
            </View>
          )}
        </View>
      </Glass>
      {steps.map((step, index) => (
        <Glass key={step.id} level={1} blur={false}>
          <View style={{ padding: 14, gap: 7 }}>
            <Copy size={14} weight="600">
              {index + 1}. {step.instruction}
            </Copy>
            <Copy muted size={12}>
              {step.subInstruction}
            </Copy>
            <Action
              label="View this step"
              icon={MapPin}
              compact
              quiet
              onPress={() => void control("seek", { progress: step.cumDistanceEndM / total })}
            />
            <Action
              label="Read this step"
              icon={Volume2}
              compact
              quiet
              onPress={() => speak(`${step.instruction}. ${step.subInstruction}`, voiceLanguage)}
            />
          </View>
        </Glass>
      ))}
    </>
  );
}
