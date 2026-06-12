import { CanonicalCrimeRecord, ConnectorSource } from './canonical.schema';
import { validator } from './validation';
import { failureQueue } from './failure-queue';
import { retryQueue } from './retry-queue';
import { CrimeIngestionService } from '../crime-service/ingestion';
import { CrimeSource } from '../../models/crime.model';

const ingestionService = new CrimeIngestionService();

/**
 * Raw Complaint System payload shape.
 *
 * In production this would come from:
 * - State Police Complaint portals
 * - National Helpline (112/100) complaint database
 * - Court-filed complaint systems
 */
export interface RawComplaintPayload {
  complaint_id: string;          // e.g. "COMP-2024-009876"
  complainant_name?: string;     // Will be anonymized in canonical
  complainant_phone?: string;
  category: string;              // Complaint category
  sub_category?: string;
  description: string;
  incident_date: string;
  complaint_date: string;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  location_district?: string;
  severity_reported?: number;   // As reported by complainant
  status: string;               // 'Pending' | 'Assigned' | 'Resolved' | 'Closed'
  assigned_officer?: string;
  resolution_notes?: string;
  related_complaint_ids?: string[];
}

const COMPLAINT_CATEGORY_MAP: Record<string, CanonicalCrimeRecord['crime_type']> = {
  'theft': 'theft',
  'snatching': 'theft',
  'robbery': 'theft',
  'vehicle theft': 'theft',
  'mobile theft': 'theft',
  'assault': 'assault',
  'physical assault': 'assault',
  'domestic violence': 'assault',
  'battery': 'assault',
  'cybercrime': 'cybercrime',
  'online scam': 'fraud',
  'phishing': 'cybercrime',
  'hacking': 'cybercrime',
  'fraud': 'fraud',
  'financial fraud': 'fraud',
  'cheating': 'fraud',
  'impersonation': 'fraud',
  'traffic': 'traffic',
  'accident': 'traffic',
  'drunk driving': 'traffic',
  'burglary': 'burglary',
  'break-in': 'burglary',
  'trespass': 'burglary',
  'murder': 'murder',
  'kidnapping': 'kidnapping',
  'harassment': 'harassment',
  'stalking': 'harassment',
  'sexual harassment': 'harassment',
};

function mapComplaintCategory(raw: string): CanonicalCrimeRecord['crime_type'] {
  const lower = (raw || '').toLowerCase().trim();
  return COMPLAINT_CATEGORY_MAP[lower] || 'other';
}

function inferComplaintSeverity(payload: RawComplaintPayload): number {
  if (payload.severity_reported !== undefined && payload.severity_reported !== null) {
    // Return as-is to let the validator catch out-of-range values
    return payload.severity_reported;
  }
  const type = mapComplaintCategory(payload.category);
  if (type === 'murder' || type === 'kidnapping') return 9;
  if (type === 'assault' || type === 'burglary') return 7;
  if (type === 'fraud' || type === 'cybercrime') return 6;
  if (type === 'harassment') return 5;
  if (type === 'theft') return 4;
  if (type === 'traffic') return 3;
  return 4;
}

/**
 * Complaint Connector
 *
 * Transforms raw complaint system payloads into the canonical schema.
 */
export class ComplaintConnector {
  readonly source: ConnectorSource = 'complaint';
  readonly sourceName = 'State_Complaint_Portal_v3';

  transform(payload: RawComplaintPayload): CanonicalCrimeRecord {
    const now = new Date();
    return {
      is_duplicate: false,
      crime_type: mapComplaintCategory(payload.category),
      severity: inferComplaintSeverity(payload),
      description: payload.description || `Complaint #${payload.complaint_id} — ${payload.category}`,
      location: {
        lat: payload.location_lat,
        lng: payload.location_lng
      },
      location_address: payload.location_address,
      location_district: payload.location_district,
      occurred_at: new Date(payload.incident_date),
      reported_at: new Date(payload.complaint_date),
      provenance: {
        source: 'complaint',
        source_system: this.sourceName,
        source_id: payload.complaint_id,
        source_case_id: payload.complaint_id,
        source_officer_id: payload.assigned_officer,
        source_timestamp: new Date(payload.incident_date),
        ingestion_timestamp: now,
        raw_payload: payload as unknown as Record<string, any>
      },
      linked_case_ids: payload.related_complaint_ids,
      investigation_status: payload.status,
      extensions: {
        category: payload.category,
        sub_category: payload.sub_category,
        resolution_notes: payload.resolution_notes,
      }
    };
  }

  async ingest(payload: RawComplaintPayload): Promise<{ success: boolean; error?: string; record?: CanonicalCrimeRecord }> {
    try {
      const canonical = this.transform(payload);
      const validation = validator.validate(canonical);

      if (!validation.valid) {
        failureQueue.push(this.source, payload as unknown as Record<string, any>, 'Validation failed', validation.errors);
        return { success: false, error: `Validation failed: ${validation.errors.join('; ')}` };
      }

      await ingestionService.ingestBatch(
        [{
          externalId: payload.complaint_id,
          type: canonical.crime_type,
          location: canonical.location,
          address: canonical.location_address,
          timestamp: canonical.occurred_at.toISOString(),
          description: canonical.description,
          severity: canonical.severity,
          source: 'complaint',
          source_id: payload.complaint_id,
          metadata: canonical.extensions
        }],
        CrimeSource.COMPLAINT
      );

      return { success: true, record: canonical };
    } catch (err: any) {
      retryQueue.enqueue(this.transform(payload), this.source, err.message);
      return { success: false, error: err.message };
    }
  }

  async ingestBatch(payloads: RawComplaintPayload[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    validation_errors: { complaint_id: string; errors: string[] }[];
  }> {
    let succeeded = 0;
    let failed = 0;
    const validation_errors: { complaint_id: string; errors: string[] }[] = [];

    for (const payload of payloads) {
      const result = await this.ingest(payload);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        validation_errors.push({ complaint_id: payload.complaint_id, errors: [result.error || 'Unknown'] });
      }
    }

    return { total: payloads.length, succeeded, failed, validation_errors };
  }
}

export const complaintConnector = new ComplaintConnector();
