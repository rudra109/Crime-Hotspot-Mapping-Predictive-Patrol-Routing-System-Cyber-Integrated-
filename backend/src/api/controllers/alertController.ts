import { Request, Response } from 'express';
import { AlertsService } from '../../services/alerts-service';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    let alerts = await AlertsService.getAllAlerts();
    
    // Filters
    const { status, routeCategory, escalationLevel } = req.query;
    if (status) {
      alerts = alerts.filter(a => a.status === String(status));
    }
    if (routeCategory) {
      alerts = alerts.filter(a => a.routeCategory === String(routeCategory));
    }
    if (escalationLevel) {
      alerts = alerts.filter(a => a.escalationLevel === parseInt(String(escalationLevel), 10));
    }

    return res.json({ alerts });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  try {
    const { message, sector, incidentId, severity, source, type } = req.body;
    if (!message || !sector) {
      return res.status(400).json({ error: 'message and sector are required' });
    }
    const alert = await AlertsService.createAlert({
      message,
      sector,
      incidentId,
      severity,
      source,
      type
    });
    return res.status(201).json({ success: true, alert });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { operatorId, operatorName, notes } = req.body;
    if (!operatorId || !operatorName) {
      return res.status(400).json({ error: 'operatorId and operatorName are required' });
    }
    const alert = await AlertsService.acknowledgeAlert(id, operatorId, operatorName, notes || '');
    return res.json({ success: true, alert });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const escalateAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level, reason } = req.body;
    if (!level || !reason) {
      return res.status(400).json({ error: 'level and reason are required' });
    }
    const alert = await AlertsService.escalateAlert(id, parseInt(String(level), 10), reason);
    return res.json({ success: true, alert });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getAlertHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await AlertsService.getAlertHistory(id);
    return res.json({ history });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const ingest112Call = async (req: Request, res: Response) => {
  try {
    const { call_id, caller_phone, district, incident_details, latitude, longitude, emergency_type, timestamp } = req.body;
    if (!call_id || !caller_phone || !district || !incident_details || !emergency_type) {
      return res.status(400).json({ error: 'Missing required 112 ERSS payload parameters' });
    }
    const result = await AlertsService.ingest112EmergencyCall({
      call_id,
      caller_phone,
      district,
      incident_details,
      latitude: parseFloat(String(latitude || 0)),
      longitude: parseFloat(String(longitude || 0)),
      emergency_type,
      timestamp: timestamp || new Date().toISOString()
    });
    return res.status(200).json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const get112Logs = async (req: Request, res: Response) => {
  try {
    const logs = await AlertsService.get112Logs();
    return res.json({ logs });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
