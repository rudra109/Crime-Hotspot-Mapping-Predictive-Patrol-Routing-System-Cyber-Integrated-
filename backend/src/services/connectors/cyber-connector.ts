import { CanonicalCrimeRecord, ConnectorSource } from './canonical.schema';
import { validator } from './validation';
import { failureQueue } from './failure-queue';
import { retryQueue } from './retry-queue';
import { CrimeIngestionService } from '../crime-service/ingestion';
import { CrimeSource } from '../../models/crime.model';

const ingestionService = new CrimeIngestionService();

/**
 * Raw Cyber Crime Branch payload shape.
 *
 * In production this would come from:
 * - Indian Cyber Crime Coordination Centre (I4C)
 * - CERT-In (Computer Emergency Response Team)
 * - National Cybercrime Reporting Portal (cybercrime.gov.in)
 * - State Cyber Cell databases
 */
export interface RawCyberCrimePayload {
  cyber_case_id: string;         // e.g. "CYBER-2024-CC-008765"
  complaint_url_id?: string;     // cybercrime.gov.in submission ID
  attack_type: string;           // Type of cyber attack/crime
  sub_type?: string;             // More specific sub-type
  platform?: string;             // Platform where crime occurred (WhatsApp, UPI, etc.)
  financial_loss_inr?: number;   // Financial loss in INR
  ip_address?: string;           // IP of attacker (anonymized)
  domain?: string;               // Domain involved
  victim_bank?: string;          // Bank of victim (if financial crime)
  account_compromised?: boolean;
  incident_date: string;
  report_date: string;
  location_lat: number;
  location_lng: number;
  location_address?: string;     // Victim's location
  location_district?: string;
  severity_cert?: number;        // CERT-In severity classification 1-10
  description: string;
  case_status: string;           // 'FIR Filed' | 'Under Investigation' | 'Closed'
  evidence_collected?: string[];
  linked_cyber_case_ids?: string[];
}

const CYBER_TYPE_MAP: Record<string, CanonicalCrimeRecord['crime_type']> = {
  'phishing': 'cybercrime',
  'email phishing': 'cybercrime',
  'smishing': 'cybercrime',
  'vishing': 'cybercrime',
  'ransomware': 'cybercrime',
  'malware': 'cybercrime',
  'ddos': 'cybercrime',
  'data breach': 'cybercrime',
  'hacking': 'cybercrime',
  'account takeover': 'cybercrime',
  'online fraud': 'fraud',
  'upi fraud': 'fraud',
  'credit card fraud': 'fraud',
  'job fraud': 'fraud',
  'investment fraud': 'fraud',
  'lottery fraud': 'fraud',
  'sextortion': 'harassment',
  'cyberstalking': 'harassment',
  'online harassment': 'harassment',
  'revenge porn': 'harassment',
  'morphed images': 'harassment',
  'identity theft': 'fraud',
  'impersonation': 'fraud',
  'dark web activity': 'other',
  'cryptocurrency fraud': 'fraud',
};

function mapCyberAttackType(raw: string): CanonicalCrimeRecord['crime_type'] {
  const lower = (raw || '').toLowerCase().trim();
  return CYBER_TYPE_MAP[lower] || 'cybercrime';
}

function inferCyberSeverity(payload: RawCyberCrimePayload): number {
  if (payload.severity_cert) {
    return Math.max(1, Math.min(10, payload.severity_cert));
  }
  // Higher financial loss → higher severity
  const loss = payload.financial_loss_inr || 0;
  if (loss > 1000000) return 10; // > 10 lakh
  if (loss > 100000) return 8;  // > 1 lakh
  if (loss > 10000) return 7;   // > 10k
  const type = mapCyberAttackType(payload.attack_type);
  if (type === 'cybercrime') return 7;
  if (type === 'fraud') return 6;
  if (type === 'harassment') return 6;
  return 5;
}

/**
 * Cyber Crime Branch Connector
 *
 * Transforms raw cyber crime payloads into canonical schema.
 * Includes financial loss tracking, attack vectors, and CERT-In classification.
 */
export class CyberConnector {
  readonly source: ConnectorSource = 'cyber_branch';
  readonly sourceName = 'Cyber_Cell_DB_v4';

  transform(payload: RawCyberCrimePayload): CanonicalCrimeRecord {
    const now = new Date();
    return {
      is_duplicate: false,
      crime_type: mapCyberAttackType(payload.attack_type),
      severity: inferCyberSeverity(payload),
      description: payload.description || `Cyber Case #${payload.cyber_case_id} — ${payload.attack_type}${payload.financial_loss_inr ? ` | Loss: ₹${payload.financial_loss_inr.toLocaleString()}` : ''}`,
      location: {
        lat: payload.location_lat,
        lng: payload.location_lng
      },
      location_address: payload.location_address,
      location_district: payload.location_district,
      occurred_at: new Date(payload.incident_date),
      reported_at: new Date(payload.report_date),
      provenance: {
        source: 'cyber_branch',
        source_system: this.sourceName,
        source_id: payload.cyber_case_id,
        source_case_id: payload.cyber_case_id,
        source_timestamp: new Date(payload.incident_date),
        ingestion_timestamp: now,
        raw_payload: payload as unknown as Record<string, any>
      },
      linked_case_ids: payload.linked_cyber_case_ids,
      investigation_status: payload.case_status,
      extensions: {
        attack_type: payload.attack_type,
        sub_type: payload.sub_type,
        platform: payload.platform,
        financial_loss_inr: payload.financial_loss_inr,
        account_compromised: payload.account_compromised,
        evidence_count: payload.evidence_collected?.length || 0,
        complaint_url_id: payload.complaint_url_id,
        // Note: ip_address and domain are intentionally masked for privacy
        has_ip_evidence: !!payload.ip_address,
        has_domain_evidence: !!payload.domain,
      }
    };
  }

  async ingest(payload: RawCyberCrimePayload): Promise<{ success: boolean; error?: string; record?: CanonicalCrimeRecord }> {
    try {
      const canonical = this.transform(payload);
      const validation = validator.validate(canonical);

      if (!validation.valid) {
        failureQueue.push(this.source, payload as unknown as Record<string, any>, 'Validation failed', validation.errors);
        return { success: false, error: `Validation failed: ${validation.errors.join('; ')}` };
      }

      await ingestionService.ingestBatch(
        [{
          externalId: payload.cyber_case_id,
          type: canonical.crime_type,
          location: canonical.location,
          address: canonical.location_address,
          timestamp: canonical.occurred_at.toISOString(),
          description: canonical.description,
          severity: canonical.severity,
          source: 'cyber_branch',
          source_id: payload.cyber_case_id,
          metadata: canonical.extensions
        }],
        CrimeSource.CYBER_BRANCH
      );

      return { success: true, record: canonical };
    } catch (err: any) {
      retryQueue.enqueue(this.transform(payload), this.source, err.message);
      return { success: false, error: err.message };
    }
  }

  async ingestBatch(payloads: RawCyberCrimePayload[]): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    validation_errors: { cyber_case_id: string; errors: string[] }[];
  }> {
    let succeeded = 0;
    let failed = 0;
    const validation_errors: { cyber_case_id: string; errors: string[] }[] = [];

    for (const payload of payloads) {
      const result = await this.ingest(payload);
      if (result.success) {
        succeeded++;
      } else {
        failed++;
        validation_errors.push({ cyber_case_id: payload.cyber_case_id, errors: [result.error || 'Unknown'] });
      }
    }

    return { total: payloads.length, succeeded, failed, validation_errors };
  }
}

export const cyberConnector = new CyberConnector();
