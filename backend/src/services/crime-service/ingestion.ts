import { CrimeIncident, CrimeType } from '../../models/crime.model';
import { AppDataSource } from '../../config/database';

export interface RawCrimeRecord {
  externalId: string;
  type: string;
  location: { lat: number; lng: number };
  address?: string;
  timestamp?: string;
  description: string;
  severity?: number;
}

const inMemoryCrimeStore: CrimeIncident[] = [];

export class CrimeIngestionService {
  public async ingestBatch(records: RawCrimeRecord[]): Promise<{ ingested: number; errors: any[]; ingestedRecords: CrimeIncident[] }> {
    const results = {
      ingested: 0,
      errors: [] as any[],
      ingestedRecords: [] as CrimeIncident[]
    };

    const crimeRepository = AppDataSource.isInitialized
      ? AppDataSource.getRepository(CrimeIncident)
      : null;

    for (const record of records) {
      try {
        const normalized = this.normalize(record);
        if (crimeRepository) {
          const saved = await crimeRepository.save(normalized);
          results.ingestedRecords.push(saved);
        } else {
          const stored = {
            ...normalized,
            id: record.externalId || `local-${Date.now()}-${results.ingested + inMemoryCrimeStore.length + 1}`
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

  private normalize(record: RawCrimeRecord): CrimeIncident {
    const incident = new CrimeIncident();
    
    // Map type
    const mappedType = Object.values(CrimeType).includes(record.type as CrimeType) 
      ? (record.type as CrimeType) 
      : CrimeType.THEFT;
      
    incident.type = mappedType;
    incident.description = record.description;
    incident.location_address = record.address;
    
    if (record.severity !== undefined) {
      incident.severity = Math.max(1, Math.min(10, record.severity));
    } else {
      incident.severity = 5; // default
    }

    if (record.timestamp) {
      incident.timestamp = new Date(record.timestamp);
    } else {
      incident.timestamp = new Date();
    }

    // Convert to PostGIS Point format: { type: 'Point', coordinates: [lng, lat] }
    incident.location = {
      type: 'Point',
      coordinates: [record.location.lng, record.location.lat]
    };

    return incident;
  }
}

export const getStoredCrimes = (limit = 100): CrimeIncident[] => {
  return inMemoryCrimeStore.slice(0, limit);
};
