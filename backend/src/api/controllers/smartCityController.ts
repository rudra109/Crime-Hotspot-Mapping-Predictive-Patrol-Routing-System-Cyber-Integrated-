import { Request, Response } from 'express';
import { AlertsService } from '../../services/alerts-service';
import { auditService } from '../../services/audit-service';

export const sosAlert = async (req: Request, res: Response) => {
  try {
    const { poleId, sector, notes, latitude, longitude } = req.body;
    if (!poleId || !sector) {
      return res.status(400).json({ error: 'poleId and sector are required' });
    }

    const alert = await AlertsService.createAlert({
      message: `[Smart City Panic SOS] Pole #${poleId} activated in ${sector}. Lat/Lng: ${latitude || 0}, ${longitude || 0}. Details: ${notes || 'No description provided.'}`,
      sector,
      severity: 10,
      type: 'Critical',
      source: 'local'
    });

    await auditService.record({
      userId: 'SMART_CITY_POLE',
      action: 'SMART_CITY_SOS',
      resource: `alert/${alert.id}`,
      changes: { poleId, sector, location: { latitude, longitude } },
      status: 'success'
    });

    return res.status(201).json({ success: true, alertId: alert.id, message: 'SOS Panic Alert ingested successfully.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const trafficAlert = async (req: Request, res: Response) => {
  try {
    const { cameraId, sector, violationType, speedKmh, latitude, longitude } = req.body;
    if (!cameraId || !sector || !violationType) {
      return res.status(400).json({ error: 'cameraId, sector, and violationType are required' });
    }

    const alert = await AlertsService.createAlert({
      message: `[Smart City Camera #${cameraId}] Violation: ${violationType.toUpperCase()} ${speedKmh ? `(${speedKmh} km/h)` : ''} detected in ${sector}.`,
      sector,
      severity: 5,
      type: 'Warning',
      source: 'local'
    });

    return res.status(201).json({ success: true, alertId: alert.id, message: 'Traffic violation alert ingested successfully.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const streetlightAlert = async (req: Request, res: Response) => {
  try {
    const { sensorId, sector, status, latitude, longitude } = req.body;
    if (!sensorId || !sector || !status) {
      return res.status(400).json({ error: 'sensorId, sector, and status are required' });
    }

    const alert = await AlertsService.createAlert({
      message: `[Smart City IoT Light] Sensor #${sensorId} reports ${status.toUpperCase()} in ${sector}. Risk of dark zone crimes.`,
      sector,
      severity: 4,
      type: 'Warning',
      source: 'local'
    });

    return res.status(201).json({ success: true, alertId: alert.id, message: 'Streetlight sensor alert ingested successfully.' });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
