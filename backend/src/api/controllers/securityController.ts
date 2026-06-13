import { Request, Response } from 'express';
import { auditService } from '../../services/audit-service';
import { ComplianceService } from '../../services/compliance-service';
import * as fs from 'fs';
import * as path from 'path';

const USERS_STORE_FILE = path.join(__dirname, '../../../data/users-store.json');

export const getSecurityStatus = async (req: Request, res: Response) => {
  try {
    // Aggregate security posture data
    const holds = ComplianceService.getLegalHolds();
    const retentionDays = ComplianceService.getRetentionDays();
    const recentLogs = auditService.list(50);
    
    // Count registered users
    let userCount = 0;
    let roleBreakdown: Record<string, number> = {};
    try {
      if (fs.existsSync(USERS_STORE_FILE)) {
        const users = JSON.parse(fs.readFileSync(USERS_STORE_FILE, 'utf-8'));
        userCount = users.length;
        users.forEach((u: any) => {
          roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1;
        });
      }
    } catch { /* ignore */ }

    // Calculate security metrics
    const failedLogins = recentLogs.filter((l: any) =>
      l.action?.includes('LOGIN_FAIL') || l.action?.includes('MFA_FAIL')
    ).length;

    const rbacViolations = recentLogs.filter((l: any) =>
      l.action?.includes('RBAC_VIOLATION')
    ).length;

    const totalAuditEntries = recentLogs.length;

    return res.json({
      securityPosture: {
        overallStatus: rbacViolations > 3 ? 'WARNING' : 'SECURE',
        encryptionMethod: 'AES-256-GCM',
        authMethod: 'PBKDF2 + HMAC-SHA256 JWT + TOTP MFA',
        corsRestricted: true,
        retentionDays,
        activeHolds: holds.length,
        registeredUsers: userCount,
        roleBreakdown,
        recentFailedLogins: failedLogins,
        rbacViolations,
        totalAuditEntries,
        lastChecked: new Date().toISOString()
      }
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getSecurityMetrics = async (req: Request, res: Response) => {
  try {
    const recentLogs = auditService.list(200);
    
    // Group events by action type
    const actionCounts: Record<string, number> = {};
    recentLogs.forEach((log: any) => {
      const action = log.action || 'UNKNOWN';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    // Group events by time (hourly buckets)
    const hourlyBuckets: Record<string, number> = {};
    recentLogs.forEach((log: any) => {
      const date = new Date(log.timestamp || Date.now());
      const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
      hourlyBuckets[hourKey] = (hourlyBuckets[hourKey] || 0) + 1;
    });

    // Threat score calculation
    const failedEvents = recentLogs.filter((l: any) => l.status === 'denied' || l.status === 'failed').length;
    const threatScore = Math.min(100, Math.round((failedEvents / Math.max(1, recentLogs.length)) * 100));

    return res.json({
      actionBreakdown: actionCounts,
      hourlyActivity: hourlyBuckets,
      threatScore,
      totalEvents: recentLogs.length,
      failedEvents,
      successfulEvents: recentLogs.length - failedEvents
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
