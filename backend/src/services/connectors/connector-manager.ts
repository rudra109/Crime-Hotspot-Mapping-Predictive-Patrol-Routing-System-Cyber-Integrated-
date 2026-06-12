import { firConnector, RawFIRPayload } from './fir-connector';
import { complaintConnector, RawComplaintPayload } from './complaint-connector';
import { patrolConnector, RawPatrolLogPayload } from './patrol-connector';
import { cyberConnector, RawCyberCrimePayload } from './cyber-connector';
import { failureQueue } from './failure-queue';
import { retryQueue } from './retry-queue';

export interface ConnectorStatus {
  connector: string;
  source: string;
  source_system: string;
  status: 'healthy';
  retry_queue_depth: number;
  failure_queue_depth: number;
}

export interface AllConnectorStatus {
  timestamp: string;
  connectors: ConnectorStatus[];
  totals: {
    retry_queue: number;
    failure_queue: number;
  };
}

/**
 * ConnectorManager
 *
 * Central orchestrator for all four crime data connectors.
 * Provides unified ingest methods and live status monitoring.
 */
export class ConnectorManager {
  // --- FIR Connector ---
  async ingestFromFIR(records: RawFIRPayload[]) {
    return firConnector.ingestBatch(records);
  }

  async ingestSingleFIR(record: RawFIRPayload) {
    return firConnector.ingest(record);
  }

  // --- Complaint Connector ---
  async ingestFromComplaint(records: RawComplaintPayload[]) {
    return complaintConnector.ingestBatch(records);
  }

  async ingestSingleComplaint(record: RawComplaintPayload) {
    return complaintConnector.ingest(record);
  }

  // --- Patrol Log Connector ---
  async ingestFromPatrol(records: RawPatrolLogPayload[]) {
    return patrolConnector.ingestBatch(records);
  }

  async ingestSinglePatrol(record: RawPatrolLogPayload) {
    return patrolConnector.ingest(record);
  }

  // --- Cyber Branch Connector ---
  async ingestFromCyber(records: RawCyberCrimePayload[]) {
    return cyberConnector.ingestBatch(records);
  }

  async ingestSingleCyber(record: RawCyberCrimePayload) {
    return cyberConnector.ingest(record);
  }

  // --- Status / Health ---
  getStatus(): AllConnectorStatus {
    const retryStats = retryQueue.stats();
    const failureStats = failureQueue.stats();

    const connectors: ConnectorStatus[] = [
      {
        connector: 'FIRConnector',
        source: 'fir',
        source_system: firConnector.sourceName,
        status: 'healthy',
        retry_queue_depth: retryStats.by_source['fir'] || 0,
        failure_queue_depth: failureStats.by_source['fir'] || 0
      },
      {
        connector: 'ComplaintConnector',
        source: 'complaint',
        source_system: complaintConnector.sourceName,
        status: 'healthy',
        retry_queue_depth: retryStats.by_source['complaint'] || 0,
        failure_queue_depth: failureStats.by_source['complaint'] || 0
      },
      {
        connector: 'PatrolConnector',
        source: 'patrol_log',
        source_system: patrolConnector.sourceName,
        status: 'healthy',
        retry_queue_depth: retryStats.by_source['patrol_log'] || 0,
        failure_queue_depth: failureStats.by_source['patrol_log'] || 0
      },
      {
        connector: 'CyberConnector',
        source: 'cyber_branch',
        source_system: cyberConnector.sourceName,
        status: 'healthy',
        retry_queue_depth: retryStats.by_source['cyber_branch'] || 0,
        failure_queue_depth: failureStats.by_source['cyber_branch'] || 0
      }
    ];

    return {
      timestamp: new Date().toISOString(),
      connectors,
      totals: {
        retry_queue: retryStats.total,
        failure_queue: failureStats.total
      }
    };
  }

  getFailures(source?: string, limit = 50) {
    return failureQueue.list(source as any, limit);
  }

  clearFailures(source?: string) {
    return failureQueue.clear(source as any);
  }

  getRetryQueue(source?: string) {
    return retryQueue.list(source as any);
  }
}

export const connectorManager = new ConnectorManager();
