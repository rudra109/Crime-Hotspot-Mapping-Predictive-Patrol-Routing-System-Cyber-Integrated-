/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Incident, Alert, PatrolUnit } from "./types";

export const initialIncidents: Incident[] = [
  {
    id: "INC-9428",
    category: "Intrusion",
    location: "Sector 7G (45.3E, 12.9N)",
    coordinates: [45.3, 32.9],
    status: "Assessing",
    description: "Unauthorized movement detected along perimeter fence B near the drone hangar.",
    timestamp: "04:12 UTC",
    reportedBy: "AI Sentinel Drone #4",
    isHighPriority: true,
    attachmentsCount: 2,
    threatIndex: 94
  },
  {
    id: "INC-8812",
    category: "Comms Jamming",
    location: "Sector 3B (22.1E, 78.4N)",
    coordinates: [22.1, 78.4],
    status: "Dispatched",
    description: "Localized signal degradation on tactical channel Sigma-9; possible minor jammer deployment.",
    timestamp: "03:55 UTC",
    reportedBy: "Automated Comms Watchdog",
    isHighPriority: false,
    attachmentsCount: 1,
    threatIndex: 65
  },
  {
    id: "INC-7430",
    category: "Biometric Alarm",
    location: "Sector 9A (87.5E, 54.2N)",
    coordinates: [87.5, 54.2],
    status: "Resolved",
    description: "Secondary badge scan mismatch on Entry Waypoint Echo; triggered default isolation sweep.",
    timestamp: "02:40 UTC",
    reportedBy: "Security Hub 12",
    isHighPriority: false,
    attachmentsCount: 0,
    threatIndex: 32
  },
  {
    id: "INC-9011",
    category: "System Sabotage",
    location: "Drill Zone 4 (60.2E, 25.1N)",
    coordinates: [60.2, 25.1],
    status: "Intervening",
    description: "Simulated load testing of generator redundancy units. Cyber unit executing failover routing.",
    timestamp: "04:02 UTC",
    reportedBy: "Officer J. Vance",
    isHighPriority: true,
    attachmentsCount: 3,
    threatIndex: 82
  }
];

export const initialAlerts: Alert[] = [
  {
    id: "ALT-1",
    type: "Critical",
    message: "Unauthorized Perimeter Breach - Sector 7G Drone Hangar East Gate",
    time: "04:12 UTC",
    sector: "Sector 7G",
    status: "Pending",
    incidentId: "INC-9428"
  },
  {
    id: "ALT-2",
    type: "Warning",
    message: "Comms Relay Interference - Channel Sigma-9 experiencing 45% packet loss",
    time: "03:55 UTC",
    sector: "Sector 3B",
    status: "Dispatched",
    incidentId: "INC-8812"
  },
  {
    id: "ALT-3",
    type: "Info",
    message: "Biometric Mismatch isolated - Sector 9A locked down for 120s security buffer",
    time: "02:40 UTC",
    sector: "Sector 9A",
    status: "Acknowledged",
    incidentId: "INC-7430"
  },
  {
    id: "ALT-4",
    type: "Critical",
    message: "Power Grid Surge Delta - Command Center emergency line active",
    time: "04:15 UTC",
    sector: "HQ Main",
    status: "Pending"
  }
];

export const initialUnits: PatrolUnit[] = [
  {
    id: "UA-7",
    name: "Unit Alpha-7",
    status: "Patrol",
    location: "Sector 7G",
    eta: "04:12 UTC",
    routeCoverage: 87,
    waypoints: [
      { name: "Alpha Post", x: 35, y: 20 },
      { name: "Fence Gate B", x: 45, y: 32 },
      { name: "Drone Bay 2", x: 50, y: 40 },
      { name: "Sentinel Watch", x: 30, y: 50 }
    ],
    currentWaypointIndex: 1,
    officerName: "Officer J. Vance"
  },
  {
    id: "UB-2",
    name: "Unit Bravo-2",
    status: "Moving",
    location: "Sector 4C",
    eta: "04:19 UTC",
    routeCoverage: 42,
    waypoints: [
      { name: "Checkpoint Red", x: 60, y: 25 },
      { name: "Radar Tower 4", x: 65, y: 45 },
      { name: "East perimeter", x: 80, y: 55 }
    ],
    currentWaypointIndex: 0,
    officerName: "Officer K. Sarah"
  },
  {
    id: "UD-4",
    name: "Unit Delta-4",
    status: "Alert",
    location: "Sector 3B",
    eta: "Immediate",
    routeCoverage: 95,
    waypoints: [
      { name: "Sector 3 Command", x: 20, y: 75 },
      { name: "Comms Hub West", x: 25, y: 80 }
    ],
    currentWaypointIndex: 1,
    officerName: "Lieutenant M. Cole"
  },
  {
    id: "US-6",
    name: "Unit Sierra-6",
    status: "On Duty",
    location: "HQ-Command",
    routeCoverage: 100,
    waypoints: [
      { name: "HQ Post", x: 10, y: 10 }
    ],
    currentWaypointIndex: 0,
    officerName: "Sergeant T. Jenkins"
  }
];

export const sampleIntelQAs = [
  {
    prompt: "Assess current sector risks",
    response: "CURRENT RISK ASSESSMENT: Sector 7G is elevated at **94% Threat Index** due to active fence breach. Unit Alpha-7 is deployed executing perimeter sweep. Sector 3B is at **65% Risk** with active comms interference. All other sectors operating under normal thermal margins (32-40% Risk). Recommendation: Deploy tactical support drone to Gate B."
  },
  {
    prompt: "Perform signal diagnostics",
    response: "RF SPECTROMETRY REPORT: Local Jamming pattern identified on 433MHz spectrum in Sector 3B. Waveform signature matches Tactical Noise Generator TNG-12. Command Unit Delta-4 dispatched. Current mitigation status: Comms channel failover to encrypted laser fallback link active."
  },
  {
    prompt: "Draft deployment recommendation",
    response: "AI OPTIMIZATION DEPLOYMENT PROTOCOL:\n\n1. Maintain Unit Alpha-7 at Sector 7G Perimeter Gate to prevent egress.\n2. Re-route Unit Sierra-6 from HQ stand-by to reinforce Sector 3B (ETA: 4m).\n3. Re-assign surveillance feed Grid-14 to high thermal focus."
  }
];
