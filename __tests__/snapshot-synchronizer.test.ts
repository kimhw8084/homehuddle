import { createSnapshotSynchronizer } from '../lib/snapshot-synchronizer';

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

describe('snapshot synchronization', () => {
  it('retains events during initial load and serializes subsequent changes', async () => {
    const initial = deferred<number>();
    const update = deferred<number>();
    const apply = jest.fn();
    const refresh = jest.fn().mockReturnValueOnce(update.promise).mockResolvedValueOnce(3);
    const sync = createSnapshotSynchronizer({ load: () => initial.promise, refresh, apply, onError: jest.fn() });
    sync.request();
    sync.request('chores');
    initial.resolve(1);
    await flush();
    expect(refresh).toHaveBeenCalledWith(1, 'chores');
    sync.request('members');
    sync.request('members');
    expect(refresh).toHaveBeenCalledTimes(1);
    update.resolve(2);
    await flush();
    expect(refresh).toHaveBeenLastCalledWith(2, 'members');
    expect(apply.mock.calls.map(call => call[0])).toEqual([1, 2, 3]);
  });

  it('never applies a response after account cleanup', async () => {
    const initial = deferred<number>();
    const apply = jest.fn();
    const sync = createSnapshotSynchronizer({ load: () => initial.promise, refresh: jest.fn(), apply, onError: jest.fn() });
    sync.request();
    sync.dispose();
    initial.resolve(1);
    await flush();
    expect(apply).not.toHaveBeenCalled();
  });

  it('preserves the last snapshot on refresh failure and can recover', async () => {
    const apply = jest.fn();
    const error = jest.fn();
    const refresh = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(2);
    const sync = createSnapshotSynchronizer({ load: async () => 1, refresh, apply, onError: error });
    sync.request(); await flush();
    sync.request('chores'); await flush();
    expect(error).toHaveBeenCalledWith(expect.any(Error), true);
    expect(apply).toHaveBeenCalledTimes(1);
    sync.request('chores'); await flush();
    expect(refresh).toHaveBeenLastCalledWith(1, 'chores');
    expect(apply).toHaveBeenLastCalledWith(2);
  });
});
