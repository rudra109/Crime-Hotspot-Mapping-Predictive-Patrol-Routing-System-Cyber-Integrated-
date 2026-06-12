import { RetryRecord, CanonicalCrimeRecord, ConnectorSource } from './canonical.schema';
import { failureQueue } from './failure-queue';
import { v4 as uuidv4 } from 'uuid';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 2000; // 2s base, doubles each time

/**
 * RetryQueue
 *
 * Holds crime records that failed transiently and are awaiting retry.
 * Uses exponential backoff: 2s → 4s → 8s before permanent failure.
 *
 * In production: replace with Bull queue or Kafka retry topics.
 */
export class RetryQueue {
  private records: RetryRecord[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Check retry queue every 5 seconds
    this.timer = setInterval(() => this.processRetries(), 5000);
  }

  enqueue(
    canonical: CanonicalCrimeRecord,
    source: ConnectorSource,
    error: string,
    attemptCount = 1
  ): RetryRecord | null {
    if (attemptCount > MAX_ATTEMPTS) {
      // Move to failure queue
      failureQueue.push(
        source,
        canonical.provenance?.raw_payload || {},
        `Exceeded max retry attempts (${MAX_ATTEMPTS}). Last error: ${error}`,
        [],
        attemptCount
      );
      return null;
    }

    const delayMs = BASE_DELAY_MS * Math.pow(2, attemptCount - 1);
    const record: RetryRecord = {
      id: uuidv4(),
      canonical,
      source,
      attempt_count: attemptCount,
      next_retry_at: new Date(Date.now() + delayMs),
      last_error: error
    };

    this.records.push(record);
    console.warn(
      `[RetryQueue] Enqueued source=${source} | source_id=${canonical.provenance?.source_id} | attempt=${attemptCount} | retry_in=${delayMs}ms | error=${error}`
    );
    return record;
  }

  /**
   * Called periodically. Returns records that are ready for retry.
   */
  getDueRecords(): RetryRecord[] {
    const now = Date.now();
    return this.records.filter(r => r.next_retry_at.getTime() <= now);
  }

  /**
   * Remove a record from the retry queue (after successful retry or escalation)
   */
  resolve(id: string): void {
    this.records = this.records.filter(r => r.id !== id);
  }

  /**
   * Process due retries — calls the injected retry handler
   */
  private async processRetries() {
    const due = this.getDueRecords();
    if (due.length === 0) return;

    if (this._retryHandler) {
      for (const record of due) {
        this.resolve(record.id);
        await this._retryHandler(record);
      }
    }
  }

  private _retryHandler?: (record: RetryRecord) => Promise<void>;

  /**
   * Register a handler that will be called when a record is due for retry
   */
  onRetry(handler: (record: RetryRecord) => Promise<void>) {
    this._retryHandler = handler;
  }

  list(source?: ConnectorSource): RetryRecord[] {
    return source ? this.records.filter(r => r.source === source) : [...this.records];
  }

  stats() {
    const grouped: Record<string, number> = {};
    for (const r of this.records) {
      grouped[r.source] = (grouped[r.source] || 0) + 1;
    }
    return {
      total: this.records.length,
      by_source: grouped
    };
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const retryQueue = new RetryQueue();
