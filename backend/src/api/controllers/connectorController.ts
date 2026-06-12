import { Request, Response } from 'express';
import { connectorManager } from '../../services/connectors/connector-manager';
import { auditService } from '../../services/audit-service';

// ─────────────────────────── FIR ───────────────────────────

export const ingestFIRConnector = async (req: Request, res: Response) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const result = await connectorManager.ingestFromFIR(records);
    await auditService.record({ action: 'connector.fir.ingest', resource: 'crime_incidents', changes: result });
    return res.status(200).json({ source: 'fir', ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────── Complaint ───────────────────────────

export const ingestComplaintConnector = async (req: Request, res: Response) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const result = await connectorManager.ingestFromComplaint(records);
    await auditService.record({ action: 'connector.complaint.ingest', resource: 'crime_incidents', changes: result });
    return res.status(200).json({ source: 'complaint', ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────── Patrol Log ───────────────────────────

export const ingestPatrolConnector = async (req: Request, res: Response) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const result = await connectorManager.ingestFromPatrol(records);
    await auditService.record({ action: 'connector.patrol.ingest', resource: 'crime_incidents', changes: result });
    return res.status(200).json({ source: 'patrol_log', ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────── Cyber Branch ───────────────────────────

export const ingestCyberConnector = async (req: Request, res: Response) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const result = await connectorManager.ingestFromCyber(records);
    await auditService.record({ action: 'connector.cyber.ingest', resource: 'crime_incidents', changes: result });
    return res.status(200).json({ source: 'cyber_branch', ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────── Status / Monitoring ───────────────────────────

export const getConnectorStatus = (_req: Request, res: Response) => {
  const status = connectorManager.getStatus();
  return res.status(200).json(status);
};

export const getFailureQueue = (req: Request, res: Response) => {
  const source = req.query.source as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const failures = connectorManager.getFailures(source, limit);
  return res.status(200).json({
    total: failures.length,
    source: source || 'all',
    failures
  });
};

export const clearFailureQueue = (req: Request, res: Response) => {
  const source = req.query.source as string | undefined;
  const cleared = connectorManager.clearFailures(source);
  return res.status(200).json({ cleared, source: source || 'all' });
};

export const getRetryQueue = (req: Request, res: Response) => {
  const source = req.query.source as string | undefined;
  const pending = connectorManager.getRetryQueue(source);
  return res.status(200).json({
    total: pending.length,
    source: source || 'all',
    pending
  });
};
