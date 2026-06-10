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

export type ViewState = "SPLASH" | "OPERATIONS" | "INTELLIGENCE" | "TACTICAL_PLAN" | "SURVEILLANCE" | "MOBILE_OFFICER" | "DRONE_CONTROL" | "SECURE_COMMS" | "AUDIT_LOGS";

export type MobileTab = "MAP" | "ALERTS" | "REPORT" | "STATUS";
