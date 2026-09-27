export function runBatchedUpdates(
  batchPrimitive: unknown,
  callback: () => void,
): void {
  if (typeof batchPrimitive === 'function') {
    batchPrimitive(callback);
    return;
  }

  callback();
}
