import { Request, Response } from 'express';
import { CrimeIngestionService, RawCrimeRecord, getStoredCrimes } from '../../services/crime-service/ingestion';
import { AppDataSource } from '../../config/database';
import { CrimeIncident } from '../../models/crime.model';
import { emitAlertCreated, emitCrimeCreated } from '../../services/realtime';
import { auditService } from '../../services/audit-service';

const ingestionService = new CrimeIngestionService();

export const ingestCrimes = async (req: Request, res: Response) => {
  try {
    const records: RawCrimeRecord[] = req.body.records;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const result = await ingestionService.ingestBatch(records);

    result.ingestedRecords.forEach((crime) => {
      emitCrimeCreated(crime);

      if ((crime.severity || 0) >= 8) {
        emitAlertCreated({
          id: `ALT-${crime.id}`,
          type: 'Critical',
          message: `${crime.type.toUpperCase()} incident reported at ${crime.location_address || 'unknown location'}`,
          time: new Date().toISOString(),
          sector: crime.location_address || 'UNKNOWN',
          status: 'Pending',
          incidentId: crime.id
        });
      }
    });

    await auditService.record({
      action: 'crime.ingest',
      resource: 'crime_incidents',
      changes: {
        requested: records.length,
        ingested: result.ingested,
        errors: result.errors.length
      }
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getCrimes = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const crimes = AppDataSource.isInitialized
      ? await AppDataSource.getRepository(CrimeIncident).find({
          take: limit,
          order: { timestamp: 'DESC' }
        })
      : getStoredCrimes(limit);
    return res.status(200).json({ crimes });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
