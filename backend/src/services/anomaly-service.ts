import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../config/database';
import { CrimeIncident } from '../models/crime.model';
import { AlertsService } from './alerts-service';
import { getStoredCrimes } from './crime-service/ingestion';

const ANOMALIES_FILE = path.join(__dirname, '../../data/anomalies-store.json');

export interface AIAnomaly {
  id: string;
  timestamp: string;
  sector: string;
  metricType: 'volume_spike' | 'category_surge' | 'severity_deviation';
  currentValue: number;
  thresholdValue: number;
  deviation: number;
  category?: string;
  message: string;
  status: 'active' | 'investigated' | 'resolved';
}

const ensureStore = () => {
  const dir = path.dirname(ANOMALIES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(ANOMALIES_FILE)) {
    fs.writeFileSync(ANOMALIES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
};

const loadCrimes = async (): Promise<CrimeIncident[]> => {
  if (AppDataSource.isInitialized) {
    return AppDataSource.getRepository(CrimeIncident).find({
      order: { timestamp: 'DESC' }
    });
  }
  return getStoredCrimes(1000);
};

export class AnomalyService {
  private static anomaliesList: AIAnomaly[] = [];

  public static async getAnomalies(): Promise<AIAnomaly[]> {
    ensureStore();
    try {
      const data = fs.readFileSync(ANOMALIES_FILE, 'utf-8');
      this.anomaliesList = JSON.parse(data);
    } catch (e) {
      console.error("Failed to read anomalies store:", e);
    }
    return this.anomaliesList;
  }

  private static saveAnomalies() {
    ensureStore();
    try {
      fs.writeFileSync(ANOMALIES_FILE, JSON.stringify(this.anomaliesList, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to save anomalies store:", e);
    }
  }

  public static async checkAnomalies(): Promise<AIAnomaly[]> {
    await this.getAnomalies();
    const crimes = await loadCrimes();
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Group crimes by sector in the last 7 days
    const recentCrimes = crimes.filter(c => (now - new Date(c.timestamp).getTime()) <= sevenDaysMs);
    
    // Group sectors
    const sectorCounts: Record<string, number> = {};
    const sectorCategoryCounts: Record<string, Record<string, number>> = {};

    recentCrimes.forEach(c => {
      // Find sector based on address
      const addr = (c.location_address || '').toLowerCase();
      let sector = 'Central';
      if (addr.includes('vastrapur') || addr.includes('memnagar') || addr.includes('satellite')) {
        sector = 'Vastrapur';
      } else if (addr.includes('thaltej') || addr.includes('ghatlodia') || addr.includes('sg highway')) {
        sector = 'Thaltej';
      } else if (addr.includes('chandkheda') || addr.includes('nikol')) {
        sector = 'Chandkheda';
      } else if (addr.includes('maninagar')) {
        sector = 'Maninagar';
      } else if (addr.includes('bapunagar')) {
        sector = 'Bapunagar';
      } else if (addr.includes('naranpura') || addr.includes('cg road')) {
        sector = 'CG Road';
      }

      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      sectorCategoryCounts[sector] = sectorCategoryCounts[sector] || {};
      const cat = c.type || 'unknown';
      sectorCategoryCounts[sector][cat] = (sectorCategoryCounts[sector][cat] || 0) + 1;
    });

    // Compute average crime counts per sector for standard deviation checks
    const counts = Object.values(sectorCounts);
    const numSectors = Math.max(counts.length, 1);
    const meanCount = counts.reduce((a, b) => a + b, 0) / numSectors;
    const variance = counts.reduce((a, b) => a + Math.pow(b - meanCount, 2), 0) / numSectors;
    const stdDev = Math.max(Math.sqrt(variance), 1);

    const newAnomalies: AIAnomaly[] = [];

    // 1. Sector-level Volume Spikes
    for (const [sector, count] of Object.entries(sectorCounts)) {
      const zScore = (count - meanCount) / stdDev;
      const threshold = 1.5; // Z-score threshold
      if (zScore > threshold && count > 3) {
        // Check if we already registered an active anomaly for this sector recently
        const alreadyExists = this.anomaliesList.some(a => 
          a.sector === sector && 
          a.metricType === 'volume_spike' && 
          a.status === 'active' &&
          (now - new Date(a.timestamp).getTime()) < 24 * 60 * 60 * 1000
        );

        if (!alreadyExists) {
          const anomaly: AIAnomaly = {
            id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            sector,
            metricType: 'volume_spike',
            currentValue: count,
            thresholdValue: Number((meanCount + threshold * stdDev).toFixed(2)),
            deviation: Number(zScore.toFixed(2)),
            message: `Crime volume in ${sector} exceeds standard deviation threshold (Z-Score: ${zScore.toFixed(2)}, Count: ${count} incidents in 7d).`,
            status: 'active'
          };
          newAnomalies.push(anomaly);
          this.anomaliesList.unshift(anomaly);

          // Raise alert automatically
          await AlertsService.createAlert({
            message: `[AI ANOMALY DETECTED] Statistical volume surge in ${sector} sector: ${count} incidents reported. Auto-escalating patrol priority vectors.`,
            sector,
            severity: 8,
            type: 'Critical'
          });
        }
      }
    }

    // 2. Category-level Surges (e.g. rapid fire thefts or cybercrimes)
    for (const [sector, catCounts] of Object.entries(sectorCategoryCounts)) {
      for (const [category, count] of Object.entries(catCounts)) {
        if (count >= 3) { // Category spike criteria (e.g. 3 of same category in 7d)
          const alreadyExists = this.anomaliesList.some(a => 
            a.sector === sector && 
            a.category === category && 
            a.metricType === 'category_surge' && 
            a.status === 'active' &&
            (now - new Date(a.timestamp).getTime()) < 24 * 60 * 60 * 1000
          );

          if (!alreadyExists) {
            const anomaly: AIAnomaly = {
              id: `ANOM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              timestamp: new Date().toISOString(),
              sector,
              metricType: 'category_surge',
              currentValue: count,
              thresholdValue: 2,
              deviation: count - 2,
              category,
              message: `Surge in crime category "${category.toUpperCase()}" detected in ${sector} (${count} incidents in 7d).`,
              status: 'active'
            };
            newAnomalies.push(anomaly);
            this.anomaliesList.unshift(anomaly);

            // Raise alert automatically
            await AlertsService.createAlert({
              message: `[AI CATEGORY SURGE] Spike in ${category.toUpperCase()} cases in ${sector} sector: ${count} incidents. Pre-routing units.`,
              sector,
              severity: 6,
              type: 'Warning'
            });
          }
        }
      }
    }

    this.saveAnomalies();
    return newAnomalies;
  }

  public static async runPredictiveSpikeTrigger(): Promise<boolean> {
    const crimes = await loadCrimes();
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    // A simple early warning predictor:
    // If crime volume in the last 72 hours has doubled compared to the previous 72 hours,
    // and is climbing, trigger a predictive early-warning alert before a major spike occurs.
    const sectorsToCheck = ['Vastrapur', 'Thaltej', 'Chandkheda', 'Maninagar', 'CG Road'];
    let warningFired = false;

    for (const sector of sectorsToCheck) {
      const sectorCrimes = crimes.filter(c => {
        const addr = (c.location_address || '').toLowerCase();
        return addr.includes(sector.toLowerCase());
      });

      const currentWindow = sectorCrimes.filter(c => (now - new Date(c.timestamp).getTime()) <= threeDaysMs).length;
      const previousWindow = sectorCrimes.filter(c => {
        const age = now - new Date(c.timestamp).getTime();
        return age > threeDaysMs && age <= 2 * threeDaysMs;
      }).length;

      // Spike prediction rule
      if (currentWindow >= 3 && currentWindow > previousWindow * 1.8) {
        // Raise predictive alert
        await AlertsService.createAlert({
          message: `[AI PREDICTIVE WARNING] Early detection model forecasts a severe crime surge in ${sector} sector within next 24 hours. Pre-position PCR assets to deter hotspots.`,
          sector,
          severity: 7,
          type: 'Warning'
        });
        warningFired = true;
      }
    }

    return warningFired;
  }
}
