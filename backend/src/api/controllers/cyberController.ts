import { Request, Response } from 'express';
import { CyberIntelService } from '../../services/cyber-intel-service';

export const getCyberOverview = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getCyberOverview();
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getCyberIncidents = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getCyberIncidents();
    return res.json({ incidents: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getCyberClusters = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getClusters();
    return res.json({ clusters: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getCyberAlerts = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getAlerts();
    return res.json({ alerts: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getCyberCorrelations = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getCorrelations();
    return res.json({ correlations: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getCyberZones = async (_req: Request, res: Response) => {
  try {
    const data = await CyberIntelService.getZones();
    return res.json({ zones: data });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
