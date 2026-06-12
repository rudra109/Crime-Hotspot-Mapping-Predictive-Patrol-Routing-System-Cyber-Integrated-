import * as fs from 'fs';
import * as path from 'path';
import { getStoredCrimes, writeStoredCrimes } from './crime-service/ingestion';
import { auditService } from './audit-service';

const COMPLIANCE_STORE_FILE = path.join(__dirname, '../../data/compliance-store.json');

export interface LegalHold {
  incidentId: string;
  reason: string;
  markedBy: string;
  markedAt: string;
}

export interface ComplianceStore {
  legalHolds: LegalHold[];
  retentionDays: number;
}

let complianceData: ComplianceStore = {
  legalHolds: [
    {
      incidentId: "INC-9428",
      reason: "Undergoing active investigation by Vastrapur Division Inspector.",
      markedBy: "BADGE-1111",
      markedAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString()
    }
  ],
  retentionDays: 90
};

const loadCompliance = () => {
  try {
    const dir = path.dirname(COMPLIANCE_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(COMPLIANCE_STORE_FILE)) {
      complianceData = JSON.parse(fs.readFileSync(COMPLIANCE_STORE_FILE, 'utf-8'));
    } else {
      saveCompliance();
    }
  } catch (e) {
    console.error('Failed to load compliance configurations:', e);
  }
};

const saveCompliance = () => {
  try {
    fs.writeFileSync(COMPLIANCE_STORE_FILE, JSON.stringify(complianceData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save compliance configurations:', e);
  }
};

loadCompliance();

export class ComplianceService {
  public static getLegalHolds(): LegalHold[] {
    loadCompliance();
    return complianceData.legalHolds;
  }

  public static async addLegalHold(incidentId: string, reason: string, badge: string): Promise<LegalHold> {
    loadCompliance();
    const existing = complianceData.legalHolds.find(h => h.incidentId === incidentId);
    if (existing) {
      existing.reason = reason;
      existing.markedBy = badge;
      existing.markedAt = new Date().toISOString();
      saveCompliance();
      return existing;
    }

    const newHold: LegalHold = {
      incidentId,
      reason,
      markedBy: badge,
      markedAt: new Date().toISOString()
    };
    complianceData.legalHolds.push(newHold);
    saveCompliance();

    await auditService.record({
      userId: badge,
      action: 'ADD_LEGAL_HOLD',
      resource: `incident/${incidentId}`,
      changes: { reason },
      status: 'success'
    });

    return newHold;
  }

  public static async removeLegalHold(incidentId: string, badge: string): Promise<boolean> {
    loadCompliance();
    const idx = complianceData.legalHolds.findIndex(h => h.incidentId === incidentId);
    if (idx < 0) return false;

    complianceData.legalHolds.splice(idx, 1);
    saveCompliance();

    await auditService.record({
      userId: badge,
      action: 'REMOVE_LEGAL_HOLD',
      resource: `incident/${incidentId}`,
      status: 'success'
    });

    return true;
  }

  public static getRetentionDays(): number {
    loadCompliance();
    return complianceData.retentionDays;
  }

  public static setRetentionDays(days: number, badge: string): number {
    loadCompliance();
    complianceData.retentionDays = days;
    saveCompliance();
    
    auditService.record({
      userId: badge,
      action: 'UPDATE_RETENTION_POLICY',
      resource: 'compliance/retention',
      changes: { days },
      status: 'success'
    });
    
    return days;
  }

  public static async pruneExpiredData(badge: string): Promise<{ prunedCount: number; lockedCount: number }> {
    loadCompliance();
    const retentionMs = complianceData.retentionDays * 24 * 3600 * 1000;
    const now = Date.now();

    const crimes = await getStoredCrimes(10000);
    const holdIds = new Set(complianceData.legalHolds.map(h => h.incidentId));

    const activeCrimes: any[] = [];
    let prunedCount = 0;
    let lockedCount = 0;

    for (const crime of crimes) {
      const crimeAgeMs = now - new Date(crime.timestamp).getTime();
      
      // If older than retention limit
      if (crimeAgeMs > retentionMs) {
        if (holdIds.has(crime.id)) {
          lockedCount++;
          activeCrimes.push(crime); // Keep because of legal hold
        } else {
          prunedCount++; // Pruned
        }
      } else {
        activeCrimes.push(crime); // Keep because not yet expired
      }
    }

    if (prunedCount > 0) {
      writeStoredCrimes(activeCrimes);
      await auditService.record({
        userId: badge,
        action: 'DATA_RETENTION_PRUNE',
        resource: 'compliance/cleanup',
        changes: { prunedCount, lockedCount },
        status: 'success'
      });
    }

    return { prunedCount, lockedCount };
  }
}
