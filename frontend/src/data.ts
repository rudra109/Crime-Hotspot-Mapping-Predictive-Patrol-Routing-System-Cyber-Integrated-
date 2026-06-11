/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Incident, Alert, PatrolUnit } from "./types";

export const initialIncidents: Incident[] = [
  // ── CRITICAL ZONE: Vastrapur ──
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
    id: "INC-9431",
    category: "Robbery",
    location: "Vastrapur (23.0412, 72.5263)",
    coordinates: [23.0412, 72.5263],
    status: "Assessing",
    description: "Armed robbery at a jewellery store near Vastrapur Circle. Three suspects fled on motorcycles.",
    timestamp: "14:28 IST",
    reportedBy: "Shop Owner via PCR",
    isHighPriority: true,
    attachmentsCount: 3,
    threatIndex: 91
  },
  {
    id: "INC-9435",
    category: "Snatching",
    location: "Vastrapur (23.0388, 72.5295)",
    coordinates: [23.0388, 72.5295],
    status: "Dispatched",
    description: "Mobile phone snatching near Vastrapur Lake jogging track. Victim assaulted.",
    timestamp: "13:45 IST",
    reportedBy: "Victim – Direct Call",
    isHighPriority: true,
    attachmentsCount: 1,
    threatIndex: 87
  },
  {
    id: "INC-9440",
    category: "Vandalism",
    location: "Vastrapur (23.0375, 72.5310)",
    coordinates: [23.0375, 72.5310],
    status: "Dispatched",
    description: "Property vandalism reported – vehicles damaged in residential society parking.",
    timestamp: "12:30 IST",
    reportedBy: "Society Guard",
    isHighPriority: false,
    attachmentsCount: 1,
    threatIndex: 55
  },

  // ── HOTSPOT ZONE: Thaltej / SG Highway ──
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
    id: "INC-8820",
    category: "Robbery",
    location: "SG Highway (23.0620, 72.5370)",
    coordinates: [23.0620, 72.5370],
    status: "Assessing",
    description: "ATM robbery near SG Highway service road. Suspect armed with a knife.",
    timestamp: "14:05 IST",
    reportedBy: "Bank Security",
    isHighPriority: true,
    attachmentsCount: 2,
    threatIndex: 88
  },
  {
    id: "INC-8835",
    category: "Drug Trafficking",
    location: "Thaltej (23.0580, 72.5410)",
    coordinates: [23.0580, 72.5410],
    status: "Intervening",
    description: "Narcotics operation intercepted. Two suspects in custody, further search ongoing.",
    timestamp: "12:20 IST",
    reportedBy: "Narcotics Cell",
    isHighPriority: true,
    attachmentsCount: 4,
    threatIndex: 85
  },

  // ── HIGH CRIME: Naranpura ──
  {
    id: "INC-7701",
    category: "Domestic Violence",
    location: "Naranpura (23.0520, 72.5680)",
    coordinates: [23.0520, 72.5680],
    status: "Assessing",
    description: "Domestic violence report – neighbour alerted control room. Victim seeking shelter.",
    timestamp: "11:50 IST",
    reportedBy: "Control Room Beta",
    isHighPriority: true,
    attachmentsCount: 0,
    threatIndex: 78
  },
  {
    id: "INC-7715",
    category: "Theft",
    location: "Naranpura (23.0535, 72.5660)",
    coordinates: [23.0535, 72.5660],
    status: "Dispatched",
    description: "House break-in reported. Residents were out; valuables stolen.",
    timestamp: "10:30 IST",
    reportedBy: "Resident – PCR App",
    isHighPriority: false,
    attachmentsCount: 2,
    threatIndex: 62
  },
  {
    id: "INC-7720",
    category: "Assault",
    location: "Naranpura (23.0510, 72.5695)",
    coordinates: [23.0510, 72.5695],
    status: "Assessing",
    description: "Group brawl near local tea stall. Three persons injured, one critically.",
    timestamp: "14:40 IST",
    reportedBy: "Witness – PCR Van 7",
    isHighPriority: true,
    attachmentsCount: 1,
    threatIndex: 90
  },

  // ── CYBERCRIME HUB: Satellite ──
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
  },
  {
    id: "INC-9025",
    category: "Fraud",
    location: "Satellite (23.0055, 72.5830)",
    coordinates: [23.0055, 72.5830],
    status: "Dispatched",
    description: "UPI fraud case – victim tricked into sharing OTP, ₹2.4L debited.",
    timestamp: "13:10 IST",
    reportedBy: "Bank Fraud Division",
    isHighPriority: false,
    attachmentsCount: 1,
    threatIndex: 60
  },

  // ── TRAFFIC INCIDENTS: Memnagar / CG Road ──
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
    id: "INC-7450",
    category: "Accident",
    location: "CG Road (23.0200, 72.5590)",
    coordinates: [23.0200, 72.5590],
    status: "Dispatched",
    description: "Multi-vehicle pile-up at CG Road intersection. Ambulance en route.",
    timestamp: "13:22 IST",
    reportedBy: "Traffic Constable",
    isHighPriority: true,
    attachmentsCount: 0,
    threatIndex: 75
  },

  // ── OLD CITY ZONE: Maninagar ──
  {
    id: "INC-6601",
    category: "Rioting",
    location: "Maninagar (22.9975, 72.6020)",
    coordinates: [22.9975, 72.6020],
    status: "Assessing",
    description: "Minor communal disturbance near market area. Rapid Action Force alerted.",
    timestamp: "14:50 IST",
    reportedBy: "Beat Constable",
    isHighPriority: true,
    attachmentsCount: 0,
    threatIndex: 89
  },
  {
    id: "INC-6615",
    category: "Theft",
    location: "Maninagar (22.9960, 72.6035)",
    coordinates: [22.9960, 72.6035],
    status: "Dispatched",
    description: "Pickpocketing spree reported at crowded bus stand.",
    timestamp: "11:15 IST",
    reportedBy: "PCR Van 2",
    isHighPriority: false,
    attachmentsCount: 0,
    threatIndex: 50
  },

  // ── EAST AHMEDABAD: Bapunagar / Odhav ──
  {
    id: "INC-5501",
    category: "Gang Activity",
    location: "Bapunagar (23.0350, 72.6200)",
    coordinates: [23.0350, 72.6200],
    status: "Assessing",
    description: "Suspected gang territory dispute – firearms reported. Quick Response Team deployed.",
    timestamp: "15:00 IST",
    reportedBy: "Intelligence Unit",
    isHighPriority: true,
    attachmentsCount: 2,
    threatIndex: 96
  },
  {
    id: "INC-5510",
    category: "Arson",
    location: "Odhav (23.0290, 72.6400)",
    coordinates: [23.0290, 72.6400],
    status: "Dispatched",
    description: "Fire set to abandoned warehouse. Arson suspected; Fire Brigade on scene.",
    timestamp: "14:35 IST",
    reportedBy: "Fire Station HQ",
    isHighPriority: true,
    attachmentsCount: 1,
    threatIndex: 83
  },

  // ── NORTH AHMEDABAD: Chandkheda ──
  {
    id: "INC-4401",
    category: "Kidnapping",
    location: "Chandkheda (23.1050, 72.5850)",
    coordinates: [23.1050, 72.5850],
    status: "Assessing",
    description: "Child reported missing from school gate area. Amber Alert issued.",
    timestamp: "13:00 IST",
    reportedBy: "School Principal",
    isHighPriority: true,
    attachmentsCount: 3,
    threatIndex: 98
  },
  {
    id: "INC-4412",
    category: "Theft",
    location: "Chandkheda (23.1020, 72.5870)",
    coordinates: [23.1020, 72.5870],
    status: "Dispatched",
    description: "Motorcycle chain snatching near metro station.",
    timestamp: "11:45 IST",
    reportedBy: "Metro Security",
    isHighPriority: false,
    attachmentsCount: 0,
    threatIndex: 55
  },

  // ── SOUTH AHMEDABAD: Bopal / Ghuma ──
  {
    id: "INC-3301",
    category: "Drug Trafficking",
    location: "Bopal (23.0320, 72.4630)",
    coordinates: [23.0320, 72.4630],
    status: "Intervening",
    description: "Large drug cache discovered during routine vehicle check. Suspected international network.",
    timestamp: "12:00 IST",
    reportedBy: "Highway Patrol Unit",
    isHighPriority: true,
    attachmentsCount: 5,
    threatIndex: 92
  },
  {
    id: "INC-3315",
    category: "Accident",
    location: "Ghuma (23.0180, 72.4750)",
    coordinates: [23.0180, 72.4750],
    status: "Resolved",
    description: "Road accident on S.P. Ring Road. Victim shifted to hospital.",
    timestamp: "10:10 IST",
    reportedBy: "Traffic Control",
    isHighPriority: false,
    attachmentsCount: 0,
    threatIndex: 28
  },

  // ── CENTRAL: Paldi / Ellis Bridge ──
  {
    id: "INC-2201",
    category: "Fraud",
    location: "Ellis Bridge (23.0246, 72.5640)",
    coordinates: [23.0246, 72.5640],
    status: "Assessing",
    description: "Large-scale property document fraud at a lawyer's office near Ellis Bridge.",
    timestamp: "13:30 IST",
    reportedBy: "Economic Offences Wing",
    isHighPriority: true,
    attachmentsCount: 6,
    threatIndex: 79
  },
  {
    id: "INC-2215",
    category: "Assault",
    location: "Paldi (23.0195, 72.5725)",
    coordinates: [23.0195, 72.5725],
    status: "Dispatched",
    description: "Road rage incident escalated to physical assault. One hospitalised.",
    timestamp: "14:20 IST",
    reportedBy: "PCR Van 9",
    isHighPriority: false,
    attachmentsCount: 1,
    threatIndex: 68
  }
];

// ── Hotspot Zone Data ──
// Areas with highest crime concentration — used for heatmap overlay and compulsory patrol routing
export const crimeHotspots = [
  { name: "Vastrapur Hotspot", lat: 23.0398, lng: 72.5281, crimeCount: 4, severity: "CRITICAL", patrolRequired: true },
  { name: "SG Highway / Thaltej Hotspot", lat: 23.0600, lng: 72.5382, crimeCount: 3, severity: "HIGH", patrolRequired: true },
  { name: "Naranpura Hotspot", lat: 23.0522, lng: 72.5678, crimeCount: 3, severity: "HIGH", patrolRequired: true },
  { name: "Bapunagar Hotspot", lat: 23.0350, lng: 72.6200, crimeCount: 2, severity: "CRITICAL", patrolRequired: true },
  { name: "Maninagar Hotspot", lat: 22.9975, lng: 72.6020, crimeCount: 2, severity: "HIGH", patrolRequired: true },
  { name: "Chandkheda Hotspot", lat: 23.1035, lng: 72.5860, crimeCount: 2, severity: "MEDIUM", patrolRequired: true },
];

// ── Compulsory Patrol Routes ──
// Routes MUST pass through all hotspot zones
export const compulsoryPatrolRoutes = [
  {
    id: "ROUTE-ALPHA",
    name: "Alpha — West Zone Sweep",
    color: "#f59e0b",
    waypoints: [
      { name: "HQ", lat: 23.0225, lng: 72.5714 },
      { name: "Vastrapur Hotspot", lat: 23.0398, lng: 72.5281 },
      { name: "SG Highway Check", lat: 23.0620, lng: 72.5370 },
      { name: "Thaltej Patrol", lat: 23.0580, lng: 72.5410 },
      { name: "Bopal Corner", lat: 23.0320, lng: 72.4630 },
      { name: "HQ Return", lat: 23.0225, lng: 72.5714 },
    ]
  },
  {
    id: "ROUTE-BETA",
    name: "Beta — North-East Sweep",
    color: "#ef4444",
    waypoints: [
      { name: "HQ", lat: 23.0225, lng: 72.5714 },
      { name: "Naranpura Patrol", lat: 23.0522, lng: 72.5678 },
      { name: "Chandkheda Check", lat: 23.1035, lng: 72.5860 },
      { name: "Bapunagar Priority", lat: 23.0350, lng: 72.6200 },
      { name: "Odhav Sweep", lat: 23.0290, lng: 72.6400 },
      { name: "Maninagar Cover", lat: 22.9975, lng: 72.6020 },
      { name: "HQ Return", lat: 23.0225, lng: 72.5714 },
    ]
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
    type: "Critical",
    message: "Armed Robbery - Jewellery store, Vastrapur Circle",
    time: "14:28 IST",
    sector: "Vastrapur",
    status: "Pending",
    incidentId: "INC-9431"
  },
  {
    id: "ALT-3",
    type: "Critical",
    message: "AMBER ALERT - Child missing from Chandkheda school gate",
    time: "13:00 IST",
    sector: "Chandkheda",
    status: "Pending",
    incidentId: "INC-4401"
  },
  {
    id: "ALT-4",
    type: "Critical",
    message: "Gang Activity - Firearms reported in Bapunagar. QRT Deployed.",
    time: "15:00 IST",
    sector: "Bapunagar",
    status: "Pending",
    incidentId: "INC-5501"
  },
  {
    id: "ALT-5",
    type: "Warning",
    message: "Vehicle Theft - Suspect last seen moving towards SG Highway",
    time: "13:55 IST",
    sector: "Thaltej",
    status: "Dispatched",
    incidentId: "INC-8812"
  },
  {
    id: "ALT-6",
    type: "Warning",
    message: "Minor disturbance near Maninagar Market. RAF on standby.",
    time: "14:50 IST",
    sector: "Maninagar",
    status: "Pending",
    incidentId: "INC-6601"
  },
  {
    id: "ALT-7",
    type: "Info",
    message: "Traffic Clearance - Congestion resolved at Memnagar Crossroads",
    time: "12:40 IST",
    sector: "Memnagar",
    status: "Acknowledged",
    incidentId: "INC-7430"
  },
  {
    id: "ALT-8",
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
  },
  {
    id: "P005",
    name: "Patrol P005",
    status: "Patrol",
    location: "Naranpura",
    eta: "14:45 IST",
    routeCoverage: 72,
    waypoints: [
      { name: "Naranpura Chowk", x: 23.0522, y: 72.5678 },
      { name: "Vijay Char Rasta", x: 23.0560, y: 72.5600 }
    ],
    currentWaypointIndex: 0,
    officerName: "Officer P. Joshi"
  },
  {
    id: "P006",
    name: "QRT Alpha",
    status: "Alert",
    location: "Bapunagar",
    eta: "Immediate",
    routeCoverage: 100,
    waypoints: [
      { name: "Bapunagar", x: 23.0350, y: 72.6200 }
    ],
    currentWaypointIndex: 0,
    officerName: "Insp. D. Chauhan (QRT)"
  }
];

export const sampleIntelQAs = [
  {
    prompt: "Assess current sector risks",
    response: "CURRENT RISK ASSESSMENT: Vastrapur is elevated at **94% Threat Index** due to active assault & robbery. Unit P001 deployed. Bapunagar at **96%** — gang activity. QRT Alpha on scene. Chandkheda shows Amber Alert status (98%). All units must prioritise hotspot corridors. Recommend Route Alpha & Beta sweeps immediately."
  },
  {
    prompt: "Provide update on cyber operations",
    response: "CYBER CELL REPORT: Ongoing raid at Satellite call center. Operation is proceeding securely. Cyber Unit P003 is on-site. UPI Fraud case INC-9025 under investigation. Local police backup is on stand-by. No immediate civilian threat."
  },
  {
    prompt: "Draft deployment recommendation",
    response: "DISPATCH PROTOCOL:\n\n1. Maintain Unit P001 at Vastrapur — assault + robbery zone.\n2. Route P002 via SG Highway → Thaltej → return.\n3. Deploy P005 for Naranpura sweep via compulsory Route Beta.\n4. Alert Traffic Police to monitor CG Road & Memnagar intersections.\n5. Amber Alert: All units near Chandkheda to assist INC-4401."
  }
];
