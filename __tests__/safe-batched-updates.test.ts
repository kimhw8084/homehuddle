import { runBatchedUpdates } from '../utils/safeBatchedUpdates';

describe('runBatchedUpdates', () => {
  it('runs the callback once through a callable batch primitive', () => {
    const callback = jest.fn();
    const batchPrimitive = jest.fn((run: () => void) => run());

    runBatchedUpdates(batchPrimitive, callback);

    expect(batchPrimitive).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, false, 'not a function'])(
    'runs the callback once directly when the batch primitive is %p',
    batchPrimitive => {
      const callback = jest.fn();

      runBatchedUpdates(batchPrimitive, callback);

      expect(callback).toHaveBeenCalledTimes(1);
    },
  );

  it('propagates callback exceptions through the direct fallback', () => {
    const error = new Error('callback failed');
    const callback = jest.fn(() => { throw error; });

    expect(() => runBatchedUpdates(undefined, callback)).toThrow(error);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('propagates callback exceptions through a callable batch primitive', () => {
    const error = new Error('callback failed');
    const callback = jest.fn(() => { throw error; });

    expect(() => runBatchedUpdates((run: () => void) => run(), callback)).toThrow(error);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
