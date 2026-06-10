import { AppDataSource } from '../config/database';
import { AuditLog } from '../models/audit.model';

export interface AuditEntryInput {
  userId?: string;
  action: string;
  resource: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  status?: string;
}

const inMemoryAuditLogs: AuditLog[] = [];

export class AuditService {
  async record(entry: AuditEntryInput) {
    const payload = {
      user_id: entry.userId,
      action: entry.action,
      resource: entry.resource,
      changes: entry.changes,
      ip_address: entry.ipAddress,
      status: entry.status || 'success'
    };

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(AuditLog);
      const saved = repo.create(payload);
      return repo.save(saved);
    }

    const log = {
      id: `audit-${Date.now()}-${inMemoryAuditLogs.length + 1}`,
      timestamp: new Date(),
      ...payload
    } as AuditLog;
    inMemoryAuditLogs.unshift(log);
    return log;
  }

  list(limit = 100) {
    return inMemoryAuditLogs.slice(0, limit);
  }
}

export const auditService = new AuditService();
