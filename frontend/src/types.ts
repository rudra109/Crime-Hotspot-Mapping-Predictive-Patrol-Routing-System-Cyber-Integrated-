/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Incident {
  id: string;
  category: string;
  location: string;
  coordinates: [number, number]; // [lat, lng]
  status: "Assessing" | "Dispatched" | "Intervening" | "Resolved";
  description: string;
  timestamp: string;
  reportedBy: string;
  isHighPriority: boolean;
  attachmentsCount: number;
  threatIndex: number; // 0-100
  source?: string;
  sourceId?: string;
  reconciliationStatus?: string;
}

export interface Alert {
  id: string;
  type: "Critical" | "Warning" | "Info";
  message: string;
  time: string;
  sector: string;
  status: "Pending" | "Acknowledged" | "Dispatched";
  incidentId?: string;
}

export interface PatrolUnit {
  id: string;
  name: string;
  status: "On Duty" | "Moving" | "Patrol" | "Alert" | "Off Duty";
  location: string;
  eta?: string;
  routeCoverage: number;
  waypoints: Array<{ name: string; x: number; y: number }>;
  currentWaypointIndex: number;
  officerName: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  status: string;
  timestamp: string;
  user_id?: string;
  ip_address?: string;
  changes?: Record<string, any>;
}

export interface SourceBreakdown {
  total: number;
  bySource: Record<string, number>;
  bySourceAndType: Record<string, Record<string, number>>;
}

export interface DailyTrendPoint {
  date: string;
  incidents: number;
  severity: number;
  cyber: number;
  average_severity: number;
}

export interface SeasonalTrends {
  seasonal: Record<string, number>;
  weekdayTrend: Array<{ day: string; incidents: number; avgSeverity: number }>;
}

export interface ZoneRisk {
  id: string;
  zone: string;
  incidents: number;
  avg_severity: number;
  recent_7d: number;
  previous_7d: number;
  trend_pct: number;
  cyber_share: number;
  critical_share: number;
  risk_score: number;
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  drivers: string[];
  center: { lat: number; lng: number };
}

export interface HotspotPrediction {
  id: string;
  zone: string;
  center: { lat: number; lng: number };
  risk_score: number;
  confidence: number;
  expected_incidents_7d: number;
  drivers: string[];
  model_version: string;
}

export type ViewState = "LANDING" | "SPLASH" | "OPERATIONS" | "INTELLIGENCE" | "TACTICAL_PLAN" | "SURVEILLANCE" | "MOBILE_OFFICER" | "DRONE_CONTROL" | "SECURE_COMMS" | "AUDIT_LOGS";

export type MobileTab = "MAP" | "ALERTS" | "REPORT" | "STATUS";
