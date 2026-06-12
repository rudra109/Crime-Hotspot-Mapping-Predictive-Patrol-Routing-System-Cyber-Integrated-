import { FailureRecord, ConnectorSource } from './canonical.schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * FailureQueue
 *
 * Stores crime records that have permanently failed ingestion
 * (exceeded max retries or have unrecoverable validation errors).
 *
 * In production: back this with a database table or dead-letter queue (Kafka DLQ).
 * Here: in-memory with a capped size + structured logging.
 */
export class FailureQueue {
  private records: FailureRecord[] = [];
  private readonly MAX_SIZE = 1000;

  push(
    source: ConnectorSource,
    rawPayload: Record<string, any>,
    reason: string,
    validationErrors?: string[],
    attemptCount = 1
  ): FailureRecord {
    const record: FailureRecord = {
      id: uuidv4(),
      source,
      source_id: rawPayload?.source_id || rawPayload?.fir_number || rawPayload?.complaint_id || rawPayload?.log_id || rawPayload?.cyber_case_id,
      raw_payload: rawPayload,
      failure_reason: reason,
      validation_errors: validationErrors,
      attempt_count: attemptCount,
      first_attempt_at: new Date(),
      last_attempt_at: new Date()
    };

    // Cap the queue to avoid unbounded memory usage
    if (this.records.length >= this.MAX_SIZE) {
      this.records.pop(); // remove oldest
    }

    this.records.unshift(record);

    console.error(`[FailureQueue] PERMANENT FAILURE | source=${source} | id=${record.source_id || 'unknown'} | reason=${reason}`);
    if (validationErrors && validationErrors.length > 0) {
      console.error(`[FailureQueue]   Validation errors: ${validationErrors.join('; ')}`);
    }

    return record;
  }

  list(source?: ConnectorSource, limit = 100): FailureRecord[] {
    const filtered = source
      ? this.records.filter(r => r.source === source)
      : this.records;
    return filtered.slice(0, limit);
  }

  getById(id: string): FailureRecord | undefined {
    return this.records.find(r => r.id === id);
  }

  remove(id: string): boolean {
    const before = this.records.length;
    this.records = this.records.filter(r => r.id !== id);
    return this.records.length < before;
  }

  clear(source?: ConnectorSource): number {
    const before = this.records.length;
    if (source) {
      this.records = this.records.filter(r => r.source !== source);
    } else {
      this.records = [];
    }
    return before - this.records.length;
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
}

export const failureQueue = new FailureQueue();
