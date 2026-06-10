/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Incident {
  id: string;
  category: "Intrusion" | "System Sabotage" | "Critical Asset Leak" | "Comms Jamming" | "Biometric Alarm" | "Drill";
  location: string; // e.g. "Sector 7G (45.3E, 12.9N)"
  coordinates: [number, number]; // [x, y] of layout grid (0-100)
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
  routeCoverage: number; // % info
  waypoints: Array<{ name: string; x: number; y: number }>;
  currentWaypointIndex: number;
  officerName: string;
}

export type ViewState = "SPLASH" | "OPERATIONS" | "INTELLIGENCE" | "TACTICAL_PLAN" | "SURVEILLANCE" | "MOBILE_OFFICER" | "DRONE_CONTROL" | "SECURE_COMMS";

export type MobileTab = "MAP" | "ALERTS" | "REPORT" | "STATUS";
