/** Coalesces gesture updates and serializes storage writes so the last value wins. */
export function preferenceWriter(write: (value: string) => Promise<void>, delay = 180) {
  let pending: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let chain = Promise.resolve();
  const flush = () => {
    clearTimeout(timer); timer = undefined;
    if (pending !== undefined) {
      const value = pending; pending = undefined;
      chain = chain.catch(() => {}).then(() => write(value));
      chain.catch(() => {});
    }
    return chain;
  };
  return { set(value: string) { pending = value; clearTimeout(timer); timer = setTimeout(flush, delay); }, flush };
}
