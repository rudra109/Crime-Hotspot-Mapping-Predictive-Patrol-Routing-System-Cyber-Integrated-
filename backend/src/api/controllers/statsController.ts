import { Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { CrimeIncident } from '../../models/crime.model';
import { getStoredCrimes } from '../../services/crime-service/ingestion';

const loadCrimes = async () => {
  if (AppDataSource.isInitialized) {
    return AppDataSource.getRepository(CrimeIncident).find({
      order: { timestamp: 'DESC' }
    });
  }

  return getStoredCrimes(1000);
};

export const getSummaryStats = async (req: Request, res: Response) => {
  try {
    const crimes = await loadCrimes();
    const activeCrimes = crimes.filter((crime) => crime.severity >= 8);
    const averageSeverity = crimes.length
      ? Number((crimes.reduce((sum, crime) => sum + (crime.severity || 0), 0) / crimes.length).toFixed(1))
      : 0;

    const byType = crimes.reduce<Record<string, number>>((acc, crime) => {
      const key = crime.type || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const summary = {
      total_crimes: crimes.length,
      hotspots_active: activeCrimes.length,
      officers_deployed: Math.max(4, Math.ceil(crimes.length / 3)),
      average_severity: averageSeverity,
      by_type: byType
    };

    return res.status(200).json(summary);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getHourlyStats = async (req: Request, res: Response) => {
  try {
    const crimes = await loadCrimes();
    const buckets = new Map<string, { hour: string; incidents: number; severity: number; severityTotal: number }>();

    crimes.forEach((crime) => {
      const timestamp = new Date(crime.timestamp);
      const hour = `${String(timestamp.getHours()).padStart(2, '0')}:00`;
      const existing = buckets.get(hour) || { hour, incidents: 0, severity: 0, severityTotal: 0 };
      existing.incidents += 1;
      existing.severityTotal += crime.severity || 0;
      existing.severity = Number((existing.severityTotal / existing.incidents).toFixed(1));
      buckets.set(hour, existing);
    });

    const hourlyData = Array.from(buckets.values()).sort((a, b) => a.hour.localeCompare(b.hour));
    return res.status(200).json({ data: hourlyData });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
