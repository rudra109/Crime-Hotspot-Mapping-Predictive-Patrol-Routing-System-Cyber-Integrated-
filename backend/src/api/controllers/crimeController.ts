import { Request, Response } from 'express';
import { CrimeIngestionService, RawCrimeRecord, getStoredCrimes } from '../../services/crime-service/ingestion';
import { AppDataSource } from '../../config/database';
import { CrimeIncident, CrimeSource } from '../../models/crime.model';
import { emitAlertCreated, emitCrimeCreated } from '../../services/realtime';
import { auditService } from '../../services/audit-service';
import { AlertsService } from '../../services/alerts-service';

const ingestionService = new CrimeIngestionService();

const normalizeSource = (value?: string): CrimeSource => {
  const src = (value || 'fir').toLowerCase();
  if (src === 'complaint' || src === 'complaints') return CrimeSource.COMPLAINT;
  if (src === 'patrol' || src === 'patrol_log' || src === 'patrol_logs') return CrimeSource.PATROL_LOG;
  if (src === 'cyber' || src === 'cyber_branch' || src === 'cybercrime') return CrimeSource.CYBER_BRANCH;
  return CrimeSource.FIR;
};

// General ingestion helper
const handleIngest = async (req: Request, res: Response, forcedSource?: string) => {
  try {
    const records: RawCrimeRecord[] = req.body.records;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const source = normalizeSource(forcedSource || req.body.source);
    const result = await ingestionService.ingestBatch(records, source);

    result.ingestedRecords.forEach(async (crime) => {
      emitCrimeCreated(crime);

      if ((crime.severity || 0) >= 8) {
        try {
          await AlertsService.createAlert({
            message: `[${crime.source.toUpperCase()}] ${crime.type.toUpperCase()} reported at ${crime.location_address || 'unknown location'}`,
            sector: crime.location_address ? crime.location_address.split('(')[0].trim() : 'UNKNOWN',
            incidentId: crime.id,
            severity: crime.severity,
            source: 'local'
          });
        } catch (err) {
          console.error("Failed to create alert for ingested crime:", err);
        }
      }
    });

    await auditService.record({
      action: forcedSource ? `crime.ingest.${source}` : 'crime.ingest',
      resource: 'crime_incidents',
      changes: {
        source,
        requested: records.length,
        ingested: result.ingested,
        errors: result.errors.length,
        reconciled: result.reconciled
      }
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const ingestCrimes = async (req: Request, res: Response) => {
  return handleIngest(req, res);
};

export const ingestFir = async (req: Request, res: Response) => {
  return handleIngest(req, res, 'fir');
};

export const ingestComplaint = async (req: Request, res: Response) => {
  return handleIngest(req, res, 'complaint');
};

export const ingestPatrol = async (req: Request, res: Response) => {
  return handleIngest(req, res, 'patrol_log');
};

export const ingestCyber = async (req: Request, res: Response) => {
  return handleIngest(req, res, 'cyber_branch');
};

export const getCrimes = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const source = req.query.source ? normalizeSource(String(req.query.source)) : undefined;

    let crimes: CrimeIncident[] = [];
    
    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(CrimeIncident);
      const queryBuilder = repo.createQueryBuilder('crime')
        .take(limit)
        .orderBy('crime.timestamp', 'DESC');

      if (source) {
        queryBuilder.where('crime.source = :source', { source });
      }

      crimes = await queryBuilder.getMany();
    } else {
      crimes = getStoredCrimes(limit);
      if (source) {
        crimes = crimes.filter(c => c.source === source);
      }
    }
    
    return res.status(200).json({ crimes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
