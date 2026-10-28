/** A small worker pool prevents wide-area discovery from saturating mobile radios. */
export async function boundedMap<T, R>(
  values: readonly T[],
  limit: number,
  task: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(values.length, Math.max(1, limit)) }, async () => {
      while (next < values.length) {
        const index = next++;
        results[index] = await task(values[index]!);
      }
    }),
  );
  return results;
}
