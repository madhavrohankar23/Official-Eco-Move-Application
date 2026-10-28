import React, { useCallback, useRef, useState } from "react";
import type { Journey } from "@/lib/routing";
import { generateTurnByTurnSteps } from "@/lib/turnByTurn";
import type { FlyThroughState } from "../../../src/features/routing/previewTypes";
import RoutePreviewController from "./RoutePreviewController";

/** Preview reuses the existing map; it never watches GPS or recalculates a route. */
export function useRoutePreview() {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [restart, setRestart] = useState(0);
  const [seek, setSeek] = useState<number | null>(null);
  const state = useRef<Partial<FlyThroughState>>({});
  const view = useRef<{ center: import("leaflet").LatLng; zoom: number } | null>(null);
  const update = useCallback((value: Partial<FlyThroughState>) => {
    state.current = { ...state.current, ...value };
  }, []);
  const finish = useCallback(() => setPlaying(false), []);
  const control = (args: {
    action: string;
    journey?: Journey;
    speed?: number;
    progress?: number;
  }) => {
    switch (args.action) {
      case "start":
        if (!args.journey?.legs.some((leg) => leg.path.length > 1))
          throw Error("This route has no preview geometry.");
        if (!view.current && window.EcoMap)
          view.current = { center: window.EcoMap.getCenter(), zoom: window.EcoMap.getZoom() };
        state.current = {};
        setJourney(args.journey);
        setPlaying(false);
        setSeek(null);
        setRestart((n) => n + 1);
        return generateTurnByTurnSteps(args.journey);
      case "play":
        setPlaying(true);
        break;
      case "pause":
        setPlaying(false);
        break;
      case "speed":
        if (args.speed === 1 || args.speed === 2 || args.speed === 4) setSpeed(args.speed);
        break;
      case "restart":
        setPlaying(false);
        setSeek(null);
        setRestart((n) => n + 1);
        break;
      case "seek":
        if (Number.isFinite(args.progress)) {
          setPlaying(false);
          setSeek(Math.min(1, Math.max(0, args.progress!)));
        }
        break;
      case "stop":
        setPlaying(false);
        setJourney(null);
        state.current = {};
        if (view.current)
          window.EcoMap?.setView(view.current.center, view.current.zoom, { animate: false });
        view.current = null;
        break;
    }
    return true;
  };
  return {
    control,
    status: () => ({ active: !!journey, playing, speed, state: state.current }),
    node: journey ? (
      <RoutePreviewController
        journey={journey}
        isPlaying={playing}
        speed={speed}
        restartCounter={restart}
        seekProgress={seek}
        onUpdateState={update}
        onFinished={finish}
      />
    ) : null,
  };
}
