import * as fs from 'fs';
import * as path from 'path';
import { CrimeIncident, CrimeSource, CrimeType } from '../../models/crime.model';
import { AppDataSource } from '../../config/database';
import { CryptoHelper } from '../../config/crypto-helper';

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

const CRIME_STORE_FILE = path.join(__dirname, '../../../data/crimes-store.json');
let inMemoryCrimeStore: CrimeIncident[] = [];
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

const defaultCrimes: Partial<CrimeIncident>[] = [
  {
    id: 'INC-9428',
    type: CrimeType.ASSAULT,
    location_address: 'Vastrapur Lake, Ahmedabad',
    description: 'Minor altercation reported at the street food court area.',
    source: CrimeSource.FIR,
    source_id: 'FIR-2026-9428',
    severity: 6,
    timestamp: new Date(Date.now() - 2 * 3600000),
    location: { type: 'Point', coordinates: [72.5281, 23.0398] }
  },
  {
    id: 'INC-9431',
    type: CrimeType.THEFT,
    location_address: 'Vastrapur Circle, Ahmedabad',
    description: 'Stolen laptop from parked vehicle near commercial complex.',
    source: CrimeSource.FIR,
    source_id: 'FIR-2026-9431',
    severity: 5,
    timestamp: new Date(Date.now() - 4 * 3600000),
    location: { type: 'Point', coordinates: [72.5312, 23.0410] }
  },
  {
    id: 'INC-8812',
    type: CrimeType.TRAFFIC,
    location_address: 'SG Highway, Ahmedabad',
    description: 'Reckless driving and road block near Thaltej junction.',
    source: CrimeSource.PATROL_LOG,
    source_id: 'PAT-2026-8812',
    severity: 4,
    timestamp: new Date(Date.now() - 6 * 3600000),
    location: { type: 'Point', coordinates: [72.5394, 23.0596] }
  },
  {
    id: 'INC-5501',
    type: CrimeType.CYBERCRIME,
    location_address: 'Satellite Area, Ahmedabad',
    description: 'Ransomware threat payload received by local SME.',
    source: CrimeSource.CYBER_BRANCH,
    source_id: 'CYB-2026-5501',
    severity: 8,
    timestamp: new Date(Date.now() - 24 * 3600000),
    location: { type: 'Point', coordinates: [72.5845, 23.0045] }
  }
];

const loadCrimes = () => {
  try {
    const dir = path.dirname(CRIME_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(CRIME_STORE_FILE)) {
      inMemoryCrimeStore = JSON.parse(fs.readFileSync(CRIME_STORE_FILE, 'utf-8'));
    } else {
      // Seed defaults
      inMemoryCrimeStore = defaultCrimes.map(c => {
        const item = new CrimeIncident();
        Object.assign(item, c);
        // Encrypt description for security at rest
        item.description = CryptoHelper.encrypt(item.description || '');
        return item;
      });
      saveCrimes();
    }
  } catch (e) {
    console.error('Failed to load local crime store:', e);
  }
};

const saveCrimes = () => {
  try {
    fs.writeFileSync(CRIME_STORE_FILE, JSON.stringify(inMemoryCrimeStore, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save local crime store:', e);
  }
};

// Initial load
loadCrimes();

export class CrimeIngestionService {
  public async ingestBatch(
    records: RawCrimeRecord[],
    sourceHint?: CrimeSource | string
  ): Promise<{ ingested: number; errors: any[]; ingestedRecords: CrimeIncident[]; reconciled: number }> {
    loadCrimes();
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

        // Encrypt description at rest before saving
        normalized.description = CryptoHelper.encrypt(normalized.description || '');

        if (crimeRepository) {
          const saved = await crimeRepository.save(normalized);
          // Return decrypted copy in results
          const copy = { ...saved, description: CryptoHelper.decrypt(saved.description || '') } as CrimeIncident;
          results.ingestedRecords.push(copy);
        } else {
          const stored = {
            ...normalized,
            id: normalized.id || record.externalId || `local-${Date.now()}-${results.ingested + inMemoryCrimeStore.length + 1}`
          };
          inMemoryCrimeStore.unshift(stored);
          saveCrimes();
          // Return decrypted copy
          const copy = { ...stored, description: CryptoHelper.decrypt(stored.description || '') } as CrimeIncident;
          results.ingestedRecords.push(copy);
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
  loadCrimes();
  // Return copies with decrypted descriptions
  return inMemoryCrimeStore.slice(0, limit).map(c => {
    const copy = new CrimeIncident();
    Object.assign(copy, c);
    copy.description = CryptoHelper.decrypt(c.description || '');
    return copy;
  });
};

export const writeStoredCrimes = (crimes: CrimeIncident[]) => {
  // Encrypt descriptions before writing to storage
  inMemoryCrimeStore = crimes.map(c => {
    const copy = new CrimeIncident();
    Object.assign(copy, c);
    copy.description = CryptoHelper.encrypt(c.description || '');
    return copy;
  });
  saveCrimes();
};
