import { CanonicalCrimeRecord, ConnectorSource } from './canonical.schema';
import { validator } from './validation';
import { failureQueue } from './failure-queue';
import { retryQueue } from './retry-queue';
import { CrimeIngestionService } from '../crime-service/ingestion';
import { CrimeSource } from '../../models/crime.model';

const ingestionService = new CrimeIngestionService();

/**
 * Raw Patrol Log System payload shape.
 *
 * In production this would come from:
 * - Mobile Data Terminals (MDTs) in patrol vehicles
 * - Officer body cam / GPS tracking systems
 * - Patrol Management Information System (PMIS)
 */
export interface RawPatrolLogPayload {
  log_id: string;               // e.g. "PATROL-LOG-2024-055432"
  unit_id: string;              // Patrol unit identifier e.g. "UNIT-007"
  officer_badge: string;        // Officer badge/ID number
  officer_name?: string;
  beat_id: string;              // Beat/zone assignment e.g. "BEAT-04A"
  shift: 'morning' | 'afternoon' | 'night';
  event_type: string;           // Type of patrol observation
  incident_observed: boolean;   // Whether an actual incident was observed
  observation_date: string;     // ISO date
  observation_time: string;     // HH:MM
  location_lat: number;
  location_lng: number;
  location_address?: string;
  location_district?: string;
  severity_assessment?: number; // Officer's assessment 1-10
  description: string;
  suspects_observed?: number;
  action_taken?: string;        // e.g. "Arrested", "Warned", "Reported"
}

const PATROL_EVENT_MAP: Record<string, CanonicalCrimeRecord['crime_type']> = {
  'theft in progress': 'theft',
  'vehicle theft': 'theft',
  'suspicious activity': 'other',
  'fight': 'assault',
  'assault': 'assault',
  'domestic dispute': 'assault',
  'accident': 'traffic',
  'traffic violation': 'traffic',
  'drunk driving': 'traffic',
  'break-in': 'burglary',
  'burglary': 'burglary',
  'harassment': 'harassment',
  'eve teasing': 'harassment',
  'kidnapping': 'kidnapping',
  'murder': 'murder',
  'drug activity': 'other',
  'vandalism': 'other',
};

function mapPatrolEventType(raw: string): CanonicalCrimeRecord['crime_type'] {
  const lower = (raw || '').toLowerCase().trim();
  return PATROL_EVENT_MAP[lower] || 'other';
}

function inferPatrolSeverity(payload: RawPatrolLogPayload): number {
  if (payload.severity_assessment) {
    return Math.max(1, Math.min(10, payload.severity_assessment));
  }
  // Non-incident observations get lower severity
  if (!payload.incident_observed) return 2;
  const type = mapPatrolEventType(payload.event_type);
  if (type === 'murder' || type === 'kidnapping') return 10;
  if (type === 'assault' || type === 'burglary') return 7;
  if (type === 'theft') return 5;
  if (type === 'traffic') return 3;
  if (type === 'harassment') return 5;
  return 4;
}

/**
 * Patrol Log Connector
 *
 * Transforms raw patrol observations into canonical crime records.
 * Only incident_observed = true logs are treated as crime records.
 */
export class PatrolConnector {
  readonly source: ConnectorSource = 'patrol_log';
  readonly sourceName = 'Patrol_MIS_v2';

  transform(payload: RawPatrolLogPayload): CanonicalCrimeRecord {
    const now = new Date();
    const observationDateTime = new Date(`${payload.observation_date}T${payload.observation_time || '00:00'}:00`);
    return {
      is_duplicate: false,
      crime_type: mapPatrolEventType(payload.event_type),
      severity: inferPatrolSeverity(payload),
      description: payload.description || `Patrol Log #${payload.log_id} — ${payload.event_type} observed by Unit ${payload.unit_id}`,
      location: {
        lat: payload.location_lat,
        lng: payload.location_lng
      },
      location_address: payload.location_address,
      location_district: payload.location_district,
      occurred_at: observationDateTime,
      reported_at: observationDateTime,
      provenance: {
        source: 'patrol_log',
        source_system: this.sourceName,
        source_id: payload.log_id,
        source_case_id: payload.log_id,
        source_officer_id: payload.officer_badge,
        source_timestamp: observationDateTime,
        ingestion_timestamp: now,
        raw_payload: payload as unknown as Record<string, any>
      },
      investigation_status: payload.action_taken ? `Action: ${payload.action_taken}` : 'Observation Logged',
      extensions: {
        unit_id: payload.unit_id,
        beat_id: payload.beat_id,
        shift: payload.shift,
        incident_observed: payload.incident_observed,
        suspects_observed: payload.suspects_observed,
        action_taken: payload.action_taken,
        officer_name: payload.officer_name,
      }
    };
  }

  async ingest(payload: RawPatrolLogPayload): Promise<{ success: boolean; error?: string; record?: CanonicalCrimeRecord; skipped?: boolean }> {
    // Only ingest actual incidents — not routine observations
    if (!payload.incident_observed) {
      return { success: true, skipped: true };
    }

    try {
      const canonical = this.transform(payload);
      const validation = validator.validate(canonical);

      if (!validation.valid) {
        failureQueue.push(this.source, payload as unknown as Record<string, any>, 'Validation failed', validation.errors);
        return { success: false, error: `Validation failed: ${validation.errors.join('; ')}` };
      }

      await ingestionService.ingestBatch(
        [{
          externalId: payload.log_id,
          type: canonical.crime_type,
          location: canonical.location,
          address: canonical.location_address,
          timestamp: canonical.occurred_at.toISOString(),
          description: canonical.description,
          severity: canonical.severity,
          source: 'patrol',
          source_id: payload.log_id,
          metadata: canonical.extensions
        }],
        CrimeSource.PATROL_LOG
      );

      return { success: true, record: canonical };
    } catch (err: any) {
      retryQueue.enqueue(this.transform(payload), this.source, err.message);
      return { success: false, error: err.message };
    }
  }

  async ingestBatch(payloads: RawPatrolLogPayload[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    validation_errors: { log_id: string; errors: string[] }[];
  }> {
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const validation_errors: { log_id: string; errors: string[] }[] = [];

    for (const payload of payloads) {
      const result = await this.ingest(payload);
      if (result.skipped) {
        skipped++;
      } else if (result.success) {
        succeeded++;
      } else {
        failed++;
        validation_errors.push({ log_id: payload.log_id, errors: [result.error || 'Unknown'] });
      }
    }

    return { total: payloads.length, succeeded, failed, skipped, validation_errors };
  }
}

export const patrolConnector = new PatrolConnector();
