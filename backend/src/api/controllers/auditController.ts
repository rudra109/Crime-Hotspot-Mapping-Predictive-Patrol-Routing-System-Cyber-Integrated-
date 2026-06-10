import { Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { AuditLog } from '../../models/audit.model';
import { auditService } from '../../services/audit-service';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = AppDataSource.isInitialized
      ? await AppDataSource.getRepository(AuditLog).find({
          take: limit,
          order: { timestamp: 'DESC' }
        })
      : auditService.list(limit);

    return res.status(200).json({ logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
