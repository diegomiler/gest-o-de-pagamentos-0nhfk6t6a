/**
 * Utilitários para não estourar o rate limit (HTTP 429) do PocketBase:
 * - runInBatches: executa operações com no máximo `limit` em paralelo;
 * - withRateLimitRetry: repete uma operação com backoff quando recebe 429.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const isRateLimitError = (err: unknown): boolean =>
  (err as { status?: number } | null)?.status === 429

export async function withRateLimitRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRateLimitError(err) || i >= attempts - 1) throw err
      await sleep(500 * 2 ** i)
    }
  }
}

export async function runInBatches<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
): Promise<void> {
  let index = 0
  let failed = false
  const worker = async () => {
    while (index < items.length && !failed) {
      const item = items[index++]
      try {
        await fn(item)
      } catch (err) {
        failed = true
        throw err
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
}
