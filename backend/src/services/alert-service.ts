import { broadcastEvent } from '../realtime/socket';

export function evaluateIncidentForAlert(incident: any) {
  const severity = incident.severity ?? incident.threatIndex ?? 0;
  if (severity >= 80) {
    const alert = {
      id: incident.id || `alert-${Date.now()}`,
      message: incident.message || 'High severity incident',
      severity,
      timestamp: new Date().toISOString(),
      location: incident.location || incident.coordinates
    };
    broadcastEvent('alert:new', alert);
    return alert;
  }
  return null;
}
