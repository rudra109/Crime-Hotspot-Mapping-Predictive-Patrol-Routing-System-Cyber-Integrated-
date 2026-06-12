import { CanonicalCrimeRecord, ConnectorSource } from './canonical.schema';
import { validator } from './validation';
import { failureQueue } from './failure-queue';
import { retryQueue } from './retry-queue';
import { CrimeIngestionService } from '../crime-service/ingestion';
import { CrimeSource } from '../../models/crime.model';

const ingestionService = new CrimeIngestionService();

/**
 * Raw FIR database payload shape.
 *
 * In production this would come from:
 * - CCTNS (Crime and Criminal Tracking Network)
 * - ICJS (Integrated Criminal Justice System)
 * - State FIR management systems
 */
export interface RawFIRPayload {
  fir_number: string;            // Unique FIR number e.g. "FIR-2024-001234"
  police_station: string;        // Station where FIR was filed
  section_ipc?: string;          // IPC Section e.g. "302", "420"
  section_crpc?: string;         // CrPC section if applicable
  accused_count?: number;        // Number of accused
  victim_name?: string;          // Victim's name (will be anonymized)
  officer_id?: string;           // Badge number of filing officer
  officer_name?: string;
  incident_type: string;         // Raw type from FIR system
  incident_date: string;         // ISO date of incident
  filing_date: string;           // ISO date FIR was filed
  location_lat: number;
  location_lng: number;
  location_address?: string;
  location_district?: string;
  location_zone?: string;
  severity_level?: number;        // 1-10 if FIR system provides it
  description?: string;
  status?: string;               // e.g. "Under Investigation"
  linked_fir_numbers?: string[];  // Other FIR numbers in same case
}

const FIR_TYPE_MAP: Record<string, CanonicalCrimeRecord['crime_type']> = {
  'theft': 'theft',
  'motor vehicle theft': 'theft',
  'snatching': 'theft',
  'robbery': 'theft',
  'assault': 'assault',
  'grievous hurt': 'assault',
  'hurt': 'assault',
  'cybercrime': 'cybercrime',
  'cyber fraud': 'fraud',
  'online fraud': 'fraud',
  'cheating': 'fraud',
  'fraud': 'fraud',
  'traffic': 'traffic',
  'rash driving': 'traffic',
  'accident': 'traffic',
  'burglary': 'burglary',
  'house breaking': 'burglary',
  'murder': 'murder',
  'culpable homicide': 'murder',
  'kidnapping': 'kidnapping',
  'abduction': 'kidnapping',
  'harassment': 'harassment',
  'eve teasing': 'harassment',
  'sexual harassment': 'harassment',
};

function mapFIRType(raw: string): CanonicalCrimeRecord['crime_type'] {
  const lower = (raw || '').toLowerCase().trim();
  return FIR_TYPE_MAP[lower] || 'other';
}

function inferFIRSeverity(payload: RawFIRPayload): number {
  if (payload.severity_level) {
    return Math.max(1, Math.min(10, payload.severity_level));
  }
  const type = mapFIRType(payload.incident_type);
  if (type === 'murder' || type === 'kidnapping') return 10;
  if (type === 'assault' || type === 'burglary') return 8;
  if (type === 'fraud' || type === 'cybercrime') return 7;
  if (type === 'harassment') return 6;
  if (type === 'theft') return 5;
  if (type === 'traffic') return 3;
  return 5;
}

/**
 * FIR Connector
 *
 * Transforms raw FIR payloads into the canonical schema.
 * Performs field mapping, type normalization, and provenance tagging.
 */
export class FIRConnector {
  readonly source: ConnectorSource = 'fir';
  readonly sourceName = 'CCTNS_FIR_DB';

  transform(payload: RawFIRPayload): CanonicalCrimeRecord {
    const now = new Date();
    return {
      is_duplicate: false,
      crime_type: mapFIRType(payload.incident_type),
      severity: inferFIRSeverity(payload),
      description: payload.description || `FIR #${payload.fir_number} — ${payload.incident_type} at ${payload.police_station}`,
      location: {
        lat: payload.location_lat,
        lng: payload.location_lng
      },
      location_address: payload.location_address,
      location_district: payload.location_district,
      location_zone: payload.location_zone,
      occurred_at: new Date(payload.incident_date),
      reported_at: new Date(payload.filing_date),
      provenance: {
        source: 'fir',
        source_system: this.sourceName,
        source_id: payload.fir_number,
        source_case_id: payload.fir_number,
        source_officer_id: payload.officer_id,
        source_timestamp: new Date(payload.incident_date),
        ingestion_timestamp: now,
        raw_payload: payload as unknown as Record<string, any>
      },
      linked_case_ids: payload.linked_fir_numbers,
      investigation_status: payload.status || 'Under Investigation',
      extensions: {
        police_station: payload.police_station,
        section_ipc: payload.section_ipc,
        section_crpc: payload.section_crpc,
        accused_count: payload.accused_count,
        officer_name: payload.officer_name,
      }
    };
  }

  async ingest(payload: RawFIRPayload): Promise<{ success: boolean; error?: string; record?: CanonicalCrimeRecord }> {
    try {
      const canonical = this.transform(payload);
      const validation = validator.validate(canonical);

      if (!validation.valid) {
        failureQueue.push(
          this.source,
          payload as unknown as Record<string, any>,
          'Validation failed',
          validation.errors
        );
        return { success: false, error: `Validation failed: ${validation.errors.join('; ')}` };
      }

      if (validation.warnings.length > 0) {
        console.warn(`[FIRConnector] Warnings for ${payload.fir_number}: ${validation.warnings.join('; ')}`);
      }

      await ingestionService.ingestBatch(
        [{
          externalId: payload.fir_number,
          type: canonical.crime_type,
          location: canonical.location,
          address: canonical.location_address,
          timestamp: canonical.occurred_at.toISOString(),
          description: canonical.description,
          severity: canonical.severity,
          source: 'fir',
          source_id: payload.fir_number,
          metadata: canonical.extensions
        }],
        CrimeSource.FIR
      );

      return { success: true, record: canonical };
    } catch (err: any) {
      retryQueue.enqueue(this.transform(payload), this.source, err.message);
      return { success: false, error: err.message };
    }
  }

  async ingestBatch(payloads: RawFIRPayload[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    validation_errors: { fir_number: string; errors: string[] }[];
  }> {
    let succeeded = 0;
    let failed = 0;
    const validation_errors: { fir_number: string; errors: string[] }[] = [];

    for (const payload of payloads) {
      const result = await this.ingest(payload);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        validation_errors.push({ fir_number: payload.fir_number, errors: [result.error || 'Unknown error'] });
      }
    }

    return { total: payloads.length, succeeded, failed, validation_errors };
  }
}

export const firConnector = new FIRConnector();
