type MetricName = 'household_bootstrap' | 'rpc_failure' | 'realtime_status' | 'mutation_latency';

/** Emits operational timings only. Never include household IDs, emails, or content. */
export function recordRuntimeMetric(name: MetricName, fields: Record<string, number | string | boolean> = {}) {
  if (__DEV__) console.info('[HomeHuddle metric]', name, fields);
}

export async function measureMutation<T>(operation: string, action: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await action();
  } finally {
    recordRuntimeMetric('mutation_latency', { operation, duration_ms: Date.now() - startedAt });
  }
}
