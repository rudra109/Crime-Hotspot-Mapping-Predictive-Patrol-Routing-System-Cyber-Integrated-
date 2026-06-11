import { CrimeIncident, CrimeSource, CrimeType } from '../../models/crime.model';
import { AppDataSource } from '../../config/database';

export interface RawCrimeRecord {
  externalId?: string;
  type?: string;
  location: { lat: number; lng: number };
  address?: string;
  timestamp?: string;
  description?: string;
  severity?: number;
  source?: string;
  source_id?: string;
  metadata?: Record<string, any>;
}

const inMemoryCrimeStore: CrimeIncident[] = [];
const RECONCILIATION_WINDOW_MINUTES = 15;

const SOURCE_LOOKUP: Record<string, CrimeSource> = {
  fir: CrimeSource.FIR,
  fir_db: CrimeSource.FIR,
  fir_database: CrimeSource.FIR,
  complaint: CrimeSource.COMPLAINT,
  complaints: CrimeSource.COMPLAINT,
  complaint_system: CrimeSource.COMPLAINT,
  patrol: CrimeSource.PATROL_LOG,
  patrol_log: CrimeSource.PATROL_LOG,
  patrol_logs: CrimeSource.PATROL_LOG,
  cyber: CrimeSource.CYBER_BRANCH,
  cyber_branch: CrimeSource.CYBER_BRANCH,
  cybercrime: CrimeSource.CYBER_BRANCH,
  cybercrime_branch: CrimeSource.CYBER_BRANCH
};

export class CrimeIngestionService {
  public async ingestBatch(
    records: RawCrimeRecord[],
    sourceHint?: CrimeSource | string
  ): Promise<{ ingested: number; errors: any[]; ingestedRecords: CrimeIncident[]; reconciled: number }> {
    const results = {
      ingested: 0,
      errors: [] as any[],
      ingestedRecords: [] as CrimeIncident[],
      reconciled: 0
    };

    const crimeRepository = AppDataSource.isInitialized
      ? AppDataSource.getRepository(CrimeIncident)
      : null;

    for (const record of records) {
      try {
        const normalized = this.normalize(record, sourceHint);
        const duplicate = await this.findDuplicate(normalized, crimeRepository);
        if (duplicate) {
          normalized.reconciliation_status = 'duplicate';
          normalized.reconciled_id = duplicate.id;
          results.reconciled += 1;
        } else {
          normalized.reconciliation_status = 'primary';
        }

        if (crimeRepository) {
          const saved = await crimeRepository.save(normalized);
          results.ingestedRecords.push(saved);
        } else {
          const stored = {
            ...normalized,
            id: normalized.id || record.externalId || `local-${Date.now()}-${results.ingested + inMemoryCrimeStore.length + 1}`
          };
          inMemoryCrimeStore.unshift(stored);
          results.ingestedRecords.push(stored);
        }
        results.ingested++;
      } catch (err: any) {
        results.errors.push({ record, error: err.message });
      }
    }

    return results;
  }

  private normalize(record: RawCrimeRecord, sourceHint?: CrimeSource | string): CrimeIncident {
    const incident = new CrimeIncident();

    const mappedType = Object.values(CrimeType).includes((record.type || '') as CrimeType)
      ? (record.type as CrimeType)
      : this.inferType(record);

    incident.type = mappedType;
    incident.description = record.description || '';
    incident.location_address = record.address || record.metadata?.address || undefined;
    incident.source = this.normalizeSource(record.source || sourceHint);
    incident.source_id = record.source_id || record.externalId || record.metadata?.source_id;
    incident.severity = this.normalizeSeverity(record, incident.source);
    incident.timestamp = record.timestamp ? new Date(record.timestamp) : new Date();
    incident.location = {
      type: 'Point',
      coordinates: [record.location.lng, record.location.lat]
    };

    return incident;
  }

  private inferType(record: RawCrimeRecord): CrimeType {
    const text = `${record.type || ''} ${record.description || ''} ${record.address || ''}`.toLowerCase();
    if (text.includes('cyber')) return CrimeType.CYBERCRIME;
    if (text.includes('fraud') || text.includes('cheat')) return CrimeType.FRAUD;
    if (text.includes('traffic') || text.includes('accident') || text.includes('vehicle')) return CrimeType.TRAFFIC;
    if (text.includes('assault') || text.includes('attack') || text.includes('violence')) return CrimeType.ASSAULT;
    if (text.includes('burglary') || text.includes('break-in') || text.includes('house')) return CrimeType.BURGLARY;
    return CrimeType.THEFT;
  }

  private normalizeSource(source?: CrimeSource | string): CrimeSource {
    if (!source) return CrimeSource.FIR;
    if (Object.values(CrimeSource).includes(source as CrimeSource)) {
      return source as CrimeSource;
    }

    const key = String(source).trim().toLowerCase().replace(/\s+/g, '_');
    return SOURCE_LOOKUP[key] || CrimeSource.FIR;
  }

  private normalizeSeverity(record: RawCrimeRecord, source: CrimeSource): number {
    if (record.severity !== undefined) {
      return Math.max(1, Math.min(10, record.severity));
    }

    const text = `${record.type || ''} ${record.description || ''}`.toLowerCase();
    if (source === CrimeSource.CYBER_BRANCH || text.includes('cyber') || text.includes('fraud')) return 7;
    if (source === CrimeSource.PATROL_LOG || text.includes('traffic')) return 4;
    if (text.includes('assault') || text.includes('robbery') || text.includes('burglary')) return 8;
    return 5;
  }

  private async findDuplicate(
    incident: CrimeIncident,
    crimeRepository: any
  ): Promise<CrimeIncident | null> {
    const sourceId = incident.source_id;
    const incidentTime = new Date(incident.timestamp).getTime();
    const lat = incident.location?.coordinates?.[1];
    const lng = incident.location?.coordinates?.[0];
    const timeThresholdMs = RECONCILIATION_WINDOW_MINUTES * 60 * 1000;
    const distanceThreshold = 0.0013;

    const isSimilar = (crime: CrimeIncident) => {
      if (!crime || crime.id === incident.id) return false;
      if (sourceId && crime.source_id && sourceId === crime.source_id) return true;

      if (!crime.location || !crime.location.coordinates) return false;
      const [existingLng, existingLat] = crime.location.coordinates;
      const timeDelta = Math.abs(new Date(crime.timestamp).getTime() - incidentTime);
      if (timeDelta > timeThresholdMs) return false;

      const sameType = crime.type === incident.type;
      const sameAddress = (crime.location_address || '').trim().toLowerCase() === (incident.location_address || '').trim().toLowerCase();
      const distance = Math.sqrt(Math.pow(existingLat - lat, 2) + Math.pow(existingLng - lng, 2));
      return sameType && (sameAddress || distance <= distanceThreshold);
    };

    if (crimeRepository) {
      if (sourceId) {
        const bySource = await crimeRepository.findOne({ where: { source_id: sourceId }, order: { timestamp: 'ASC' } });
        if (bySource) return bySource;
      }

      const recent = await crimeRepository.find({
        order: { timestamp: 'DESC' },
        take: 250
      });
      return recent.find(isSimilar) || null;
    }

    return inMemoryCrimeStore.find(isSimilar) || null;
  }
}

export const getStoredCrimes = (limit = 100): CrimeIncident[] => {
  return inMemoryCrimeStore.slice(0, limit);
};
