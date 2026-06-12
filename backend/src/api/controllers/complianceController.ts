import { Request, Response } from 'express';
import { ComplianceService } from '../../services/compliance-service';

export const getLegalHolds = async (req: Request, res: Response) => {
  try {
    const holds = ComplianceService.getLegalHolds();
    return res.json({ holds });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const addLegalHold = async (req: Request, res: Response) => {
  try {
    const { incidentId, reason } = req.body;
    const badge = req.user?.badgeNumber || 'SYSTEM';
    
    if (!incidentId || !reason) {
      return res.status(400).json({ error: 'incidentId and reason are required' });
    }

    const hold = await ComplianceService.addLegalHold(incidentId, reason, badge);
    return res.json({ success: true, hold });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const removeLegalHold = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // incident ID
    const badge = req.user?.badgeNumber || 'SYSTEM';

    const success = await ComplianceService.removeLegalHold(id, badge);
    if (!success) {
      return res.status(404).json({ error: 'Legal hold not found' });
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getRetention = async (req: Request, res: Response) => {
  try {
    const days = ComplianceService.getRetentionDays();
    return res.json({ retentionDays: days });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const setRetention = async (req: Request, res: Response) => {
  try {
    const { days } = req.body;
    const badge = req.user?.badgeNumber || 'SYSTEM';

    if (days === undefined || isNaN(parseInt(String(days), 10))) {
      return res.status(400).json({ error: 'days must be a valid number' });
    }

    const updated = ComplianceService.setRetentionDays(parseInt(String(days), 10), badge);
    return res.json({ success: true, retentionDays: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const runPruning = async (req: Request, res: Response) => {
  try {
    const badge = req.user?.badgeNumber || 'SYSTEM';
    const result = await ComplianceService.pruneExpiredData(badge);
    return res.json({ success: true, ...result });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
