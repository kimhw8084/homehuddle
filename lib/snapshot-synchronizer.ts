/** Serialize and coalesce refreshes so an older response cannot overwrite newer data. */
export function createSnapshotSynchronizer<T>(options: {
  load: () => Promise<T>;
  refresh: (snapshot: T, table: string) => Promise<T>;
  apply: (snapshot: T) => void;
  onError: (error: unknown, hasSnapshot: boolean) => void;
}) {
  let snapshot: T | undefined;
  let running = false;
  let disposed = false;
  const pending = new Set<string>();

  const drain = async () => {
    if (running || disposed) return;
    running = true;
    while (pending.size && !disposed) {
      const tables = [...pending];
      pending.clear();
      try {
        let next = snapshot;
        if (next === undefined || tables.includes('*')) next = await options.load();
        else for (const table of tables) next = await options.refresh(next, table);
        if (disposed) break;
        options.apply(next);
        snapshot = next;
      } catch (error) {
        if (!disposed) options.onError(error, snapshot !== undefined);
      }
    }
    running = false;
  };

  return {
    request(table = '*') {
      if (disposed) return;
      pending.add(table);
      void drain();
    },
    dispose() { disposed = true; pending.clear(); },
  };
}
