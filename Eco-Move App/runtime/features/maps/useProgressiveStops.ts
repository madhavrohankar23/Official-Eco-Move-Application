import { useEffect, useMemo, useState } from "react";
import type { NearbyStop } from "@/lib/nearby";

/** Source's 25/28-stop batches adapted to preserve the existing marker presentation. */
export function useProgressiveStops(stops: NearbyStop[]) {
  const [count, setCount] = useState(25);
  const sorted = useMemo(() => [...stops].sort((a, b) => a.distM - b.distM), [stops]);
  useEffect(() => {
    let frame = 0;
    let current = Math.min(25, sorted.length);
    let last = performance.now();
    setCount(current);
    const step = (now: number) => {
      if (now - last >= 24) {
        last = now;
        current = Math.min(current + 28, sorted.length);
        setCount(current);
      }
      if (current < sorted.length) frame = requestAnimationFrame(step);
    };
    if (current < sorted.length) frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [sorted]);
  return sorted.slice(0, count);
}
