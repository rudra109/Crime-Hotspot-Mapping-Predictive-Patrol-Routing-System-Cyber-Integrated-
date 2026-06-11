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

// WebSocket integration
export class WebSocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(SOCKET_URL);
  }

  public onNewCrime(callback: (crime: any) => void) {
    this.socket.on('crime:new', callback);
  }

  public onNewAlert(callback: (alert: Alert) => void) {
    this.socket.on('alert:new', callback);
  }

  public disconnect() {
    this.socket.disconnect();
  }
}

export const wsService = new WebSocketService();
