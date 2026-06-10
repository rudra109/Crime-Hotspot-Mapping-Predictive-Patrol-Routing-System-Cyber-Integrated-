/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Incident, Alert, PatrolUnit } from "./types";

export const initialIncidents: Incident[] = [
  {
    id: "INC-9428",
    category: "Assault",
    location: "Vastrapur (23.0398, 72.5281)",
    coordinates: [23.0398, 72.5281],
    status: "Assessing",
    description: "Physical altercation reported near Vastrapur Lake. Requesting immediate unit.",
    timestamp: "14:12 IST",
    reportedBy: "Control Room Alpha",
    isHighPriority: true,
    attachmentsCount: 2,
    threatIndex: 94
  },
  {
    id: "INC-8812",
    category: "Theft",
    location: "Thaltej (23.0596, 72.5394)",
    coordinates: [23.0596, 72.5394],
    status: "Dispatched",
    description: "Vehicle theft reported in commercial parking area near SG Highway.",
    timestamp: "13:55 IST",
    reportedBy: "PCR Van 4",
    isHighPriority: false,
    attachmentsCount: 1,
    threatIndex: 65
  },
  {
    id: "INC-7430",
    category: "Traffic Violation",
    location: "Memnagar (23.0123, 72.5612)",
    coordinates: [23.0123, 72.5612],
    status: "Resolved",
    description: "Hit and run case, vehicle identified via CCTV cameras.",
    timestamp: "12:40 IST",
    reportedBy: "Traffic Sub-Inspector",
    isHighPriority: false,
    attachmentsCount: 0,
    threatIndex: 32
  },
  {
    id: "INC-9011",
    category: "Cybercrime",
    location: "Satellite (23.0045, 72.5845)",
    coordinates: [23.0045, 72.5845],
    status: "Intervening",
    description: "Financial fraud call center operation identified. Cyber cell conducting raid.",
    timestamp: "14:02 IST",
    reportedBy: "Cyber Cell HQ",
    isHighPriority: true,
    attachmentsCount: 3,
    threatIndex: 82
  }
];

export const initialAlerts: Alert[] = [
  {
    id: "ALT-1",
    type: "Critical",
    message: "Violent Incident - Assault reported near Vastrapur Lake",
    time: "14:12 IST",
    sector: "Vastrapur",
    status: "Pending",
    incidentId: "INC-9428"
  },
  {
    id: "ALT-2",
    type: "Warning",
    message: "Vehicle Theft - Suspect last seen moving towards SG Highway",
    time: "13:55 IST",
    sector: "Thaltej",
    status: "Dispatched",
    incidentId: "INC-8812"
  },
  {
    id: "ALT-3",
    type: "Info",
    message: "Traffic Clearance - Congestion resolved at Memnagar Crossroads",
    time: "12:40 IST",
    sector: "Memnagar",
    status: "Acknowledged",
    incidentId: "INC-7430"
  },
  {
    id: "ALT-4",
    type: "Critical",
    message: "Cyber Raid - Backup requested for ongoing operation at Satellite",
    time: "14:15 IST",
    sector: "Satellite",
    status: "Pending"
  }
];

export const initialUnits: PatrolUnit[] = [
  {
    id: "P001",
    name: "Patrol P001",
    status: "Patrol",
    location: "Vastrapur",
    eta: "14:12 IST",
    routeCoverage: 87,
    waypoints: [
      { name: "Vastrapur Lake", x: 23.0398, y: 72.5281 },
      { name: "IIM Road", x: 23.0320, y: 72.5300 }
    ],
    currentWaypointIndex: 1,
    officerName: "Officer R. Sharma"
  },
  {
    id: "P002",
    name: "Patrol P002",
    status: "Moving",
    location: "Thaltej",
    eta: "14:19 IST",
    routeCoverage: 42,
    waypoints: [
      { name: "SG Highway", x: 23.0596, y: 72.5394 },
      { name: "Science City Road", x: 23.0700, y: 72.5100 }
    ],
    currentWaypointIndex: 0,
    officerName: "Officer K. Patel"
  },
  {
    id: "P003",
    name: "Patrol P003",
    status: "Alert",
    location: "Satellite",
    eta: "Immediate",
    routeCoverage: 95,
    waypoints: [
      { name: "Satellite Station", x: 23.0045, y: 72.5845 }
    ],
    currentWaypointIndex: 0,
    officerName: "Inspector M. Desai"
  },
  {
    id: "P004",
    name: "Patrol P004",
    status: "On Duty",
    location: "Commissioner Office",
    routeCoverage: 100,
    waypoints: [
      { name: "HQ", x: 23.0225, y: 72.5714 }
    ],
    currentWaypointIndex: 0,
    officerName: "Sergeant T. Mehta"
  }
];

export const sampleIntelQAs = [
  {
    prompt: "Assess current sector risks",
    response: "CURRENT RISK ASSESSMENT: Vastrapur is elevated at **94% Threat Index** due to an active assault case. Unit P001 is deployed. Thaltej is at **65% Risk** with recent vehicle thefts. All other sectors operating under normal margins. Recommendation: Deploy additional patrol to Vastrapur."
  },
  {
    prompt: "Provide update on cyber operations",
    response: "CYBER CELL REPORT: Ongoing raid at Satellite call center. Operation is proceeding securely. Cyber Unit P003 is on-site. Local police backup is on stand-by. No immediate civilian threat."
  },
  {
    prompt: "Draft deployment recommendation",
    response: "DISPATCH PROTOCOL:\n\n1. Maintain Unit P001 at Vastrapur Lake to secure the perimeter.\n2. Re-route Unit P004 from HQ stand-by to reinforce Thaltej checkpoints (ETA: 8m).\n3. Alert Traffic Police to monitor SG Highway intersections."
  }
];
