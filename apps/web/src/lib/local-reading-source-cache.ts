/** One mounted reading's last verified source. Both complete inputs and the
 * cached output are checked again; mutation or a failed rebuild cannot return
 * a previous reading. Producer versions belong in the caller's input key. */
export function createReadingSourceCache<T>() {
  let previous: { input: string; output: string; value: T } | null = null;
  const encode = (value: unknown) => JSON.stringify(value) ?? "undefined";
  return {
    read(input: unknown, build: () => T): T {
      try {
        const identity = encode(input);
        if (previous?.input === identity && previous.output === encode(previous.value)) return previous.value;
        previous = null;
        const value = build();
        previous = { input: identity, output: encode(value), value };
        return value;
      } catch (error) {
        previous = null;
        throw error;
      }
    }
  };
}
