/** Constant-speed, closed capsule perimeter. No per-frame geometry or JS timer. */
export function capsuleTrack(width: number, height: number, inset = 1.25) {
  const r = Math.max(1, height / 2 - inset);
  const left = height / 2;
  const right = Math.max(left, width - height / 2);
  const straight = right - left;
  const arc = Math.PI * r;
  const length = 2 * (straight + arc);
  const input: number[] = [], x: number[] = [], y: number[] = [], angle: string[] = [];
  for (let i = 0; i <= 128; i++) {
    const d = length * i / 128;
    let px: number, py: number, a: number;
    if (d <= straight) {
      px = left + d; py = inset; a = 0;
    } else if (d <= straight + arc) {
      const t = (d - straight) / r - Math.PI / 2;
      px = right + r * Math.cos(t); py = height / 2 + r * Math.sin(t);
      a = t + Math.PI / 2;
    } else if (d <= 2 * straight + arc) {
      px = right - (d - straight - arc); py = height - inset; a = Math.PI;
    } else {
      const t = (d - 2 * straight - arc) / r + Math.PI / 2;
      px = left + r * Math.cos(t); py = height / 2 + r * Math.sin(t);
      a = t + Math.PI / 2;
    }
    input.push(i / 128); x.push(px); y.push(py); angle.push(`${a}rad`);
  }
  return { input, x, y, angle };
}
