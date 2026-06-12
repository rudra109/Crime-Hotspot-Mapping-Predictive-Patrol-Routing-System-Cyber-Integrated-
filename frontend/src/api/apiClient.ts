import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { Alert, AuditLogEntry, DailyTrendPoint, HotspotPrediction, Incident, SeasonalTrends, SourceBreakdown, ZoneRisk } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8001/api/v1';
const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || 'http://localhost:8001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically inject JWT token into requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aegis_jwt_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const fetchCrimes = async (): Promise<Incident[]> => {
  try {
    const res = await apiClient.get('/crimes');
    // Map backend CrimeIncident to frontend Incident format
    return res.data.crimes.map((c: any) => ({
      id: c.id,
      category: c.type,
      location: c.location_address || `Lat: ${c.location?.coordinates?.[1]}, Lng: ${c.location?.coordinates?.[0]}`,
      coordinates: c.location?.coordinates ? [c.location.coordinates[0], c.location.coordinates[1]] : [0, 0],
      status: 'Assessing',
      description: c.description || '',
      timestamp: c.timestamp,
      reportedBy: 'System API',
      isHighPriority: c.severity >= 8,
      attachmentsCount: 0,
      threatIndex: c.severity * 10,
      source: c.source,
      sourceId: c.source_id,
      reconciliationStatus: c.reconciliation_status
    }));
  } catch (error) {
    console.warn('Falling back to empty crime list:', error);
    return [];
  }
};

export const ingestSimulatedCrime = async (record: any) => {
  const payload = {
    records: [record]
  };
  return apiClient.post('/crimes/ingest', payload);
};

export const optimizeRoute = async (startLocation: any, hotspots: any[]) => {
  const res = await apiClient.post('/routing/optimize', {
    startLocation,
    hotspots
  });
  return res.data;
};

export const fetchStatsSummary = async () => {
  const res = await apiClient.get('/stats/summary');
  return res.data;
};

export const fetchHourlyStats = async () => {
  const res = await apiClient.get('/stats/hourly');
  return res.data.data || [];
};

export const fetchAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const res = await apiClient.get('/audit');
  return res.data.logs || [];
};

export const fetchSourceBreakdown = async (): Promise<SourceBreakdown> => {
  const res = await apiClient.get('/analytics/sources');
  return res.data;
};

export const fetchDailyTrends = async (days = 30): Promise<DailyTrendPoint[]> => {
  const res = await apiClient.get('/analytics/daily-trends', { params: { days } });
  return res.data.data || [];
};

export const fetchSeasonalTrends = async (): Promise<SeasonalTrends> => {
  const res = await apiClient.get('/analytics/seasonal-trends');
  return res.data;
};

export const fetchZoneRiskScores = async (): Promise<ZoneRisk[]> => {
  const res = await apiClient.get('/analytics/zones/risk');
  return res.data.data || [];
};

export const fetchHotspotPredictions = async (): Promise<HotspotPrediction[]> => {
  const res = await apiClient.get('/analytics/hotspots');
  return res.data.data || [];
};

export const fetchAdvancedForecast = async (window = 'hourly'): Promise<any> => {
  const res = await apiClient.get('/analytics/predict/forecast', { params: { window } });
  return res.data;
};

export const triggerRetraining = async (): Promise<any> => {
  const res = await apiClient.post('/analytics/predict/retrain');
  return res.data;
};

export const fetchModelMonitoring = async (): Promise<any[]> => {
  const res = await apiClient.get('/analytics/predict/monitoring');
  return res.data.data || [];
};

export const fetchPredictionHistory = async (limit = 100): Promise<any[]> => {
  const res = await apiClient.get('/analytics/predict/history', { params: { limit } });
  return res.data.data || [];
};

export const syncPredictionOutcomes = async (): Promise<any> => {
  const res = await apiClient.post('/analytics/predict/sync');
  return res.data;
};

// WebSocket integration
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(SOCKET_URL, { path: '/ws', transports: ['websocket'] });
  }

  public onNewCrime(callback: (crime: any) => void) {
    this.socket.on('crime:new', callback);
  }

  public onNewAlert(callback: (alert: Alert) => void) {
    this.socket.on('alert:new', callback);
  }

  public onAlertUpdate(callback: (alert: any) => void) {
    this.socket.on('alert:update', callback);
  }

  public disconnect() {
    this.socket.disconnect();
  }
}

export const wsService = new WebSocketService();

// ─── Patrol & GPS Tracking ───────────────────────────────────────────────────

export const fetchVehiclePositions = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/patrol/vehicles');
    return res.data.vehicles || [];
  } catch { return []; }
};

export const pushVehiclePosition = async (vehicleId: string, pos: any): Promise<any> => {
  const res = await apiClient.post(`/patrol/vehicles/${vehicleId}/position`, pos);
  return res.data;
};

export const fetchPatrolConstraints = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/patrol/constraints');
    return res.data.constraints || [];
  } catch { return []; }
};

export const upsertConstraint = async (constraint: any): Promise<any> => {
  const res = await apiClient.post('/patrol/constraints', constraint);
  return res.data.constraint;
};

export const toggleConstraint = async (id: string, active: boolean): Promise<any> => {
  const res = await apiClient.patch(`/patrol/constraints/${id}/toggle`, { active });
  return res.data.constraint;
};

export const assignPatrolRoute = async (payload: {
  vehicleId: string;
  waypoints: any[];
  distanceKm: number;
  estimatedMins: number;
  priority?: string;
}): Promise<any> => {
  const res = await apiClient.post('/patrol/routes/assign', payload);
  return res.data.route;
};

export const fetchAllPatrolRoutes = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/patrol/routes');
    return res.data.routes || [];
  } catch { return []; }
};

export const fetchVehicleRoute = async (vehicleId: string): Promise<any | null> => {
  try {
    const res = await apiClient.get(`/patrol/vehicles/${vehicleId}/route`);
    return res.data.route || null;
  } catch { return null; }
};

export const acknowledgePatrolRoute = async (routeId: string, payload: {
  vehicleId: string;
  accepted: boolean;
  note?: string;
  rejectionReason?: string;
}): Promise<any> => {
  const res = await apiClient.post(`/patrol/routes/${routeId}/acknowledge`, payload);
  return res.data.acknowledgment;
};

export const progressPatrolRoute = async (vehicleId: string): Promise<any> => {
  const res = await apiClient.post(`/patrol/vehicles/${vehicleId}/progress`);
  return res.data.route;
};

export const fetchAcknowledgments = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/patrol/acknowledgments');
    return res.data.acknowledgments || [];
  } catch { return []; }
};

// ─── Cybercrime Intelligence ──────────────────────────────────────────────────

export const fetchCyberOverview = async (): Promise<any> => {
  try {
    const res = await apiClient.get('/cyber/overview');
    return res.data;
  } catch { return null; }
};

export const fetchCyberIncidents = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/cyber/incidents');
    return res.data.incidents || [];
  } catch { return []; }
};

export const fetchCyberClusters = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/cyber/clusters');
    return res.data.clusters || [];
  } catch { return []; }
};

export const fetchCyberAlerts = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/cyber/alerts');
    return res.data.alerts || [];
  } catch { return []; }
};

export const fetchCyberCorrelations = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/cyber/correlations');
    return res.data.correlations || [];
  } catch { return []; }
};

export const fetchCyberZones = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/cyber/zones');
    return res.data.zones || [];
  } catch { return []; }
};

// ─── Alerts & Real-Time Monitoring ───────────────────────────────────────────

export const fetchAlerts = async (filters: Record<string, any> = {}): Promise<any[]> => {
  try {
    const res = await apiClient.get('/alerts', { params: filters });
    return res.data.alerts || [];
  } catch { return []; }
};

export const acknowledgeAlert = async (id: string, payload: {
  operatorId: string;
  operatorName: string;
  notes?: string;
}): Promise<any> => {
  const res = await apiClient.post(`/alerts/${id}/acknowledge`, payload);
  return res.data;
};

export const escalateAlert = async (id: string, payload: {
  level: number;
  reason: string;
}): Promise<any> => {
  const res = await apiClient.post(`/alerts/${id}/escalate`, payload);
  return res.data;
};

export const fetchAlertHistory = async (id: string): Promise<any[]> => {
  try {
    const res = await apiClient.get(`/alerts/${id}/history`);
    return res.data.history || [];
  } catch { return []; }
};

export const simulate112Call = async (payload: {
  call_id: string;
  caller_phone: string;
  district: string;
  incident_details: string;
  latitude: number;
  longitude: number;
  emergency_type: string;
}): Promise<any> => {
  const res = await apiClient.post('/alerts/connectors/112', payload);
  return res.data;
};

export const fetch112Logs = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/alerts/connectors/112/logs');
    return res.data.logs || [];
  } catch { return []; }
};

// ─── Decision Support System ─────────────────────────────────────────────────

export const fetchDecisionProfiles = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/decision/profiles');
    return res.data.profiles || [];
  } catch { return []; }
};

export const runDecisionSimulation = async (
  scenarioId: string,
  crowdMultiplier: number,
  securityMultiplier: number
): Promise<any> => {
  const res = await apiClient.post('/decision/simulate', {
    scenarioId,
    crowdMultiplier,
    securityMultiplier
  });
  return res.data;
};

export const calculateResourcePlanning = async (
  unitsCount: number,
  timeTarget: number,
  coverageTarget: number
): Promise<any> => {
  const res = await apiClient.post('/decision/plan', {
    unitsCount,
    timeTarget,
    coverageTarget
  });
  return res.data;
};

export const fetchEfficiencyMetrics = async (): Promise<any> => {
  try {
    const res = await apiClient.get('/decision/metrics');
    return res.data || null;
  } catch { return null; }
};

export const applyTacticalRecommendation = async (payload: {
  scenarioId: string;
  recommendedConstraints: any[];
  recommendedDispatches: any[];
}): Promise<any> => {
  const res = await apiClient.post('/decision/apply', payload);
  return res.data;
};

// ─── Authentication & MFA ─────────────────────────────────────────────────────

export const registerUser = async (payload: any): Promise<any> => {
  const res = await apiClient.post('/auth/register', payload);
  return res.data;
};

export const loginUser = async (payload: any): Promise<any> => {
  const res = await apiClient.post('/auth/login', payload);
  return res.data;
};

export const verifyMfaUser = async (payload: any): Promise<any> => {
  const res = await apiClient.post('/auth/mfa/verify', payload);
  return res.data;
};

export const generateMfaCodeApi = async (secret: string): Promise<string> => {
  const res = await apiClient.post('/auth/mfa/generate', { secret });
  return res.data.code;
};

// ─── Data Compliance & Holds ─────────────────────────────────────────────────

export const fetchLegalHolds = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/compliance/holds');
    return res.data.holds || [];
  } catch { return []; }
};

export const addLegalHold = async (payload: { incidentId: string; reason: string }): Promise<any> => {
  const res = await apiClient.post('/compliance/holds', payload);
  return res.data;
};

export const removeLegalHold = async (incidentId: string): Promise<any> => {
  const res = await apiClient.delete(`/compliance/holds/${incidentId}`);
  return res.data;
};

export const fetchRetentionPolicy = async (): Promise<number> => {
  try {
    const res = await apiClient.get('/compliance/retention');
    return res.data.retentionDays || 90;
  } catch { return 90; }
};

export const updateRetentionPolicy = async (days: number): Promise<any> => {
  const res = await apiClient.post('/compliance/retention', { days });
  return res.data;
};

export const pruneComplianceData = async (): Promise<any> => {
  const res = await apiClient.post('/compliance/prune');
  return res.data;
};

// ─── AI Anomalies ───────────────────────────────────────────────────────────

export const fetchAnomalies = async (): Promise<any[]> => {
  try {
    const res = await apiClient.get('/analytics/anomalies');
    return res.data.anomalies || [];
  } catch {
    return [];
  }
};

export const triggerAnomalyCheck = async (): Promise<any> => {
  const res = await apiClient.post('/analytics/anomalies/check');
  return res.data;
};

// ─── Smart City Webhooks ─────────────────────────────────────────────────────

export const simulateSmartCitySos = async (payload: {
  poleId: string;
  sector: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}): Promise<any> => {
  const res = await apiClient.post('/smartcity/sos', payload);
  return res.data;
};

export const simulateSmartCityTraffic = async (payload: {
  cameraId: string;
  sector: string;
  violationType: string;
  speedKmh?: number;
  latitude?: number;
  longitude?: number;
}): Promise<any> => {
  const res = await apiClient.post('/smartcity/traffic', payload);
  return res.data;
};

export const simulateSmartCityStreetlight = async (payload: {
  sensorId: string;
  sector: string;
  status: string;
  latitude?: number;
  longitude?: number;
}): Promise<any> => {
  const res = await apiClient.post('/smartcity/streetlight', payload);
  return res.data;
};


