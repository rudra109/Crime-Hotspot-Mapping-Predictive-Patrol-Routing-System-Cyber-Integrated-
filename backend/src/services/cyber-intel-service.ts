/**
 * Cybercrime Intelligence Service
 * 
 * Provides:
 * 1. Rich cybercrime categories (phishing, credential theft, impersonation, fraud campaigns)
 * 2. Cyber-physical crime correlation logic
 * 3. Cyber threat zone alerts
 * 4. Digital fraud cluster detection
 * 5. Cybercrime origin & affected region mapping
 */

import * as fs from 'fs';
import * as path from 'path';
import { getStoredCrimes } from './crime-service/ingestion';
import { AppDataSource } from '../config/database';
import { CrimeIncident, CrimeSource } from '../models/crime.model';

const STORE_FILE = path.join(__dirname, '../../cyber-intel-store.json');

// ─── Rich Cybercrime Category Taxonomy ────────────────────────────────────────
export const CYBER_CATEGORIES = {
  PHISHING: {
    id: 'phishing',
    label: 'Phishing / Smishing / Vishing',
    icon: '🎣',
    color: '#f97316',
    subcategories: ['Email Phishing', 'SMS Phishing (Smishing)', 'Voice Phishing (Vishing)', 'Spear Phishing', 'Whaling'],
    description: 'Deceptive messages to steal credentials or money',
    severity_default: 6,
    physical_risk: 'low',
  },
  CREDENTIAL_THEFT: {
    id: 'credential_theft',
    label: 'Credential Theft / Account Takeover',
    icon: '🔐',
    color: '#ef4444',
    subcategories: ['Password Breach', 'OTP Interception', 'Session Hijacking', 'SIM Swap', 'Dark Web Credential Sale'],
    description: 'Unauthorized access to accounts via stolen credentials',
    severity_default: 8,
    physical_risk: 'medium',
  },
  IMPERSONATION: {
    id: 'impersonation',
    label: 'Impersonation / Identity Fraud',
    icon: '🎭',
    color: '#a855f7',
    subcategories: ['KYC Fraud', 'Aadhaar/PAN Misuse', 'Officer Impersonation', 'Bank Official Impersonation', 'Morphed Identity Documents'],
    description: 'Fake identity used for financial or legal gain',
    severity_default: 7,
    physical_risk: 'medium',
  },
  FRAUD_CAMPAIGN: {
    id: 'fraud_campaign',
    label: 'Organised Fraud Campaign',
    icon: '🕸️',
    color: '#ec4899',
    subcategories: ['UPI/Payment Fraud', 'Investment Fraud', 'Job/Employment Fraud', 'Lottery Fraud', 'Online Shopping Fraud', 'Cryptocurrency Scam'],
    description: 'Coordinated multi-victim financial fraud operations',
    severity_default: 8,
    physical_risk: 'medium',
  },
  RANSOMWARE: {
    id: 'ransomware',
    label: 'Ransomware / Malware Attack',
    icon: '💀',
    color: '#dc2626',
    subcategories: ['Ransomware', 'Spyware', 'Trojan', 'Keylogger', 'Banking Malware'],
    description: 'Malicious software targeting systems or data',
    severity_default: 9,
    physical_risk: 'high',
  },
  HARASSMENT: {
    id: 'cyber_harassment',
    label: 'Cyber Harassment / Sextortion',
    icon: '⚠️',
    color: '#f59e0b',
    subcategories: ['Sextortion', 'Cyberstalking', 'Online Bullying', 'Revenge Porn', 'Morphed Image Misuse'],
    description: 'Online threats, harassment, or image-based abuse',
    severity_default: 7,
    physical_risk: 'medium',
  },
  DATA_BREACH: {
    id: 'data_breach',
    label: 'Data Breach / Hacking',
    icon: '🔓',
    color: '#14b8a6',
    subcategories: ['Corporate Hacking', 'Database Breach', 'DDOS Attack', 'Website Defacement', 'API Exploitation'],
    description: 'Unauthorized system access and data exfiltration',
    severity_default: 8,
    physical_risk: 'low',
  },
  DARK_WEB: {
    id: 'dark_web',
    label: 'Dark Web / Cyber Syndicate',
    icon: '🕵️',
    color: '#6366f1',
    subcategories: ['Dark Web Marketplace', 'Illegal Data Trade', 'Crypto Laundering', 'Syndicate Coordination', 'Arms/Drug Network'],
    description: 'Criminal network activity on dark web infrastructure',
    severity_default: 10,
    physical_risk: 'critical',
  },
} as const;

export type CyberCategoryId = keyof typeof CYBER_CATEGORIES;

// ─── Ahmedabad Cyber Threat Zones ─────────────────────────────────────────────
const AHMEDABAD_CYBER_ZONES = [
  {
    id: 'satellite-cyber',
    name: 'Satellite / Prahlad Nagar Tech Corridor',
    lat: 23.0045, lng: 72.5845,
    radius: 1500,
    description: 'High density of IT companies; phishing, ransomware, and data breach cases',
    primaryThreat: 'RANSOMWARE',
    affectedPopulation: 85000,
  },
  {
    id: 'sg-highway-cyber',
    name: 'SG Highway Corporate Zone',
    lat: 23.0600, lng: 72.5382,
    radius: 2000,
    description: 'Corporate offices; credential theft and targeted spear phishing',
    primaryThreat: 'CREDENTIAL_THEFT',
    affectedPopulation: 120000,
  },
  {
    id: 'naranpura-cyber',
    name: 'Naranpura Financial District',
    lat: 23.0522, lng: 72.5678,
    radius: 1200,
    description: 'Banking cluster; UPI fraud, investment scams, and impersonation',
    primaryThreat: 'FRAUD_CAMPAIGN',
    affectedPopulation: 65000,
  },
  {
    id: 'cg-road-cyber',
    name: 'CG Road / Navrangpura Commercial',
    lat: 23.0200, lng: 72.5590,
    radius: 1000,
    description: 'Commercial hub; online shopping fraud and phishing campaigns',
    primaryThreat: 'PHISHING',
    affectedPopulation: 95000,
  },
  {
    id: 'maninagar-cyber',
    name: 'Maninagar / Isanpur Old City',
    lat: 22.9975, lng: 72.6020,
    radius: 1000,
    description: 'High SMS phishing targeting elderly; impersonation fraud',
    primaryThreat: 'IMPERSONATION',
    affectedPopulation: 75000,
  },
  {
    id: 'chandkheda-cyber',
    name: 'Chandkheda / PDPU Corridor',
    lat: 23.1035, lng: 72.5860,
    radius: 800,
    description: 'Job fraud targeting youth; fake recruitment portals',
    primaryThreat: 'FRAUD_CAMPAIGN',
    affectedPopulation: 45000,
  },
];

// ─── Simulated Cybercrime Incidents (realistic Ahmedabad data) ─────────────────
function generateSimulatedCyberIncidents() {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  return [
    // Phishing campaigns
    { id: 'CYB-2024-001', category: 'PHISHING', subcategory: 'Spear Phishing', zone: 'satellite-cyber', lat: 23.0050, lng: 72.5850, financialLoss: 280000, severity: 7, daysAgo: 2, platform: 'Email', status: 'Under Investigation', physicalLinked: null, victims: 12 },
    { id: 'CYB-2024-002', category: 'PHISHING', subcategory: 'SMS Phishing (Smishing)', zone: 'maninagar-cyber', lat: 22.9980, lng: 72.6015, financialLoss: 45000, severity: 5, daysAgo: 1, platform: 'SMS', status: 'FIR Filed', physicalLinked: null, victims: 3 },
    { id: 'CYB-2024-003', category: 'PHISHING', subcategory: 'Voice Phishing (Vishing)', zone: 'cg-road-cyber', lat: 23.0210, lng: 72.5580, financialLoss: 125000, severity: 6, daysAgo: 3, platform: 'Phone', status: 'FIR Filed', physicalLinked: null, victims: 5 },

    // Credential Theft
    { id: 'CYB-2024-004', category: 'CREDENTIAL_THEFT', subcategory: 'SIM Swap', zone: 'sg-highway-cyber', lat: 23.0610, lng: 72.5390, financialLoss: 890000, severity: 9, daysAgo: 1, platform: 'Mobile', status: 'Under Investigation', physicalLinked: 'INC-9025', victims: 1 },
    { id: 'CYB-2024-005', category: 'CREDENTIAL_THEFT', subcategory: 'OTP Interception', zone: 'naranpura-cyber', lat: 23.0525, lng: 72.5675, financialLoss: 340000, severity: 8, daysAgo: 0, platform: 'Banking App', status: 'FIR Filed', physicalLinked: null, victims: 2 },
    { id: 'CYB-2024-006', category: 'CREDENTIAL_THEFT', subcategory: 'Dark Web Credential Sale', zone: 'satellite-cyber', lat: 23.0040, lng: 72.5855, financialLoss: 0, severity: 9, daysAgo: 5, platform: 'Dark Web', status: 'Under Investigation', physicalLinked: null, victims: 450 },

    // Impersonation / Identity Fraud
    { id: 'CYB-2024-007', category: 'IMPERSONATION', subcategory: 'Officer Impersonation', zone: 'cg-road-cyber', lat: 23.0195, lng: 72.5595, financialLoss: 750000, severity: 8, daysAgo: 2, platform: 'Phone/WhatsApp', status: 'FIR Filed', physicalLinked: null, victims: 8 },
    { id: 'CYB-2024-008', category: 'IMPERSONATION', subcategory: 'KYC Fraud', zone: 'maninagar-cyber', lat: 22.9970, lng: 72.6025, financialLoss: 220000, severity: 7, daysAgo: 4, platform: 'Mobile App', status: 'Closed', physicalLinked: null, victims: 15 },
    { id: 'CYB-2024-009', category: 'IMPERSONATION', subcategory: 'Bank Official Impersonation', zone: 'naranpura-cyber', lat: 23.0530, lng: 72.5670, financialLoss: 560000, severity: 8, daysAgo: 1, platform: 'Phone', status: 'Under Investigation', physicalLinked: null, victims: 4 },

    // Organised Fraud Campaigns
    { id: 'CYB-2024-010', category: 'FRAUD_CAMPAIGN', subcategory: 'Investment Fraud', zone: 'satellite-cyber', lat: 23.0055, lng: 72.5840, financialLoss: 4500000, severity: 9, daysAgo: 7, platform: 'WhatsApp/Telegram', status: 'Under Investigation', physicalLinked: 'INC-9011', victims: 38 },
    { id: 'CYB-2024-011', category: 'FRAUD_CAMPAIGN', subcategory: 'Job/Employment Fraud', zone: 'chandkheda-cyber', lat: 23.1040, lng: 72.5855, financialLoss: 180000, severity: 6, daysAgo: 3, platform: 'LinkedIn/Indeed', status: 'FIR Filed', physicalLinked: null, victims: 22 },
    { id: 'CYB-2024-012', category: 'FRAUD_CAMPAIGN', subcategory: 'UPI/Payment Fraud', zone: 'naranpura-cyber', lat: 23.0520, lng: 72.5682, financialLoss: 240000, severity: 7, daysAgo: 0, platform: 'PhonePe/GPay', status: 'FIR Filed', physicalLinked: 'INC-9025', victims: 6 },
    { id: 'CYB-2024-013', category: 'FRAUD_CAMPAIGN', subcategory: 'Cryptocurrency Scam', zone: 'sg-highway-cyber', lat: 23.0615, lng: 72.5378, financialLoss: 1200000, severity: 9, daysAgo: 6, platform: 'Fake Exchange', status: 'Under Investigation', physicalLinked: null, victims: 17 },

    // Ransomware / Malware
    { id: 'CYB-2024-014', category: 'RANSOMWARE', subcategory: 'Ransomware', zone: 'satellite-cyber', lat: 23.0048, lng: 72.5848, financialLoss: 8500000, severity: 10, daysAgo: 10, platform: 'Windows Network', status: 'Under Investigation', physicalLinked: null, victims: 1 },
    { id: 'CYB-2024-015', category: 'RANSOMWARE', subcategory: 'Banking Malware', zone: 'cg-road-cyber', lat: 23.0205, lng: 72.5585, financialLoss: 2100000, severity: 9, daysAgo: 4, platform: 'Android App', status: 'Under Investigation', physicalLinked: null, victims: 89 },

    // Harassment / Sextortion
    { id: 'CYB-2024-016', category: 'HARASSMENT', subcategory: 'Sextortion', zone: 'naranpura-cyber', lat: 23.0516, lng: 72.5685, financialLoss: 95000, severity: 8, daysAgo: 2, platform: 'Instagram/Snapchat', status: 'FIR Filed', physicalLinked: null, victims: 1 },
    { id: 'CYB-2024-017', category: 'HARASSMENT', subcategory: 'Cyberstalking', zone: 'sg-highway-cyber', lat: 23.0605, lng: 72.5385, financialLoss: 0, severity: 7, daysAgo: 5, platform: 'Social Media', status: 'Under Investigation', physicalLinked: null, victims: 1 },

    // Dark Web
    { id: 'CYB-2024-018', category: 'DARK_WEB', subcategory: 'Illegal Data Trade', zone: 'satellite-cyber', lat: 23.0042, lng: 72.5852, financialLoss: 0, severity: 10, daysAgo: 14, platform: 'Tor Network', status: 'Under Investigation', physicalLinked: null, victims: 15000 },
    { id: 'CYB-2024-019', category: 'DARK_WEB', subcategory: 'Crypto Laundering', zone: 'sg-highway-cyber', lat: 23.0608, lng: 72.5375, financialLoss: 12000000, severity: 10, daysAgo: 8, platform: 'Crypto Wallet', status: 'Under Investigation', physicalLinked: 'INC-9011', victims: 3 },

    // Data Breach
    { id: 'CYB-2024-020', category: 'DATA_BREACH', subcategory: 'Corporate Hacking', zone: 'satellite-cyber', lat: 23.0052, lng: 72.5842, financialLoss: 0, severity: 9, daysAgo: 3, platform: 'Corporate Network', status: 'Under Investigation', physicalLinked: null, victims: 2500 },
  ].map(inc => ({
    ...inc,
    timestamp: new Date(now - inc.daysAgo * day).toISOString(),
    categoryInfo: CYBER_CATEGORIES[inc.category as CyberCategoryId],
  }));
}

// ─── Correlation Engine ───────────────────────────────────────────────────────

/**
 * Finds physical crimes that are geographically and temporally correlated with cyber incidents.
 * Correlation rules:
 * 1. Physical crime within 1.5km of cyber incident
 * 2. Physical crime within 30 days of cyber incident
 * 3. Extra weight if directly linked (physicalLinked field)
 * 4. Extra weight for DARK_WEB and FRAUD_CAMPAIGN which often have physical criminal networks
 */
export function correlateWithPhysical(
  cyberIncidents: ReturnType<typeof generateSimulatedCyberIncidents>,
  physicalCrimes: CrimeIncident[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  for (const cyberInc of cyberIncidents) {
    const directLinks: string[] = [];
    const geoLinks: string[] = [];
    let totalCorrelationScore = 0;

    for (const physical of physicalCrimes) {
      // Parse lat/lng from physical crime — may be stored as GeoJSON or address string
      let physLat = 0, physLng = 0;
      if (physical.location?.coordinates && physical.location.coordinates.length >= 2) {
        physLat = physical.location.coordinates[1];
        physLng = physical.location.coordinates[0];
      } else if (physical.location_address) {
        const match = (physical.location_address as string).match(/\(([\d.]+),\s*([\d.]+)\)/);
        if (match) { physLat = parseFloat(match[1]); physLng = parseFloat(match[2]); }
      }

      // Direct link check — compare physicalLinked against multiple ID fields
      const isDirectLink = cyberInc.physicalLinked && (
        cyberInc.physicalLinked === physical.id ||
        cyberInc.physicalLinked === (physical as any).source_id ||
        cyberInc.physicalLinked === (physical as any).externalId
      );
      if (isDirectLink) {
        directLinks.push(physical.id);
        totalCorrelationScore += 40;
      }

      // Skip geo check if no valid coordinates
      if (physLat === 0 && physLng === 0) continue;

      // Geographic distance (Haversine)
      const R = 6371000;
      const dphi = (cyberInc.lat - physLat) * Math.PI / 180;
      const dlambda = (cyberInc.lng - physLng) * Math.PI / 180;
      const a = Math.sin(dphi / 2) ** 2 + Math.cos(physLat * Math.PI / 180) * Math.cos(cyberInc.lat * Math.PI / 180) * Math.sin(dlambda / 2) ** 2;
      const distMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Temporal check (30 days)
      const cyberTime = new Date(cyberInc.timestamp).getTime();
      const physTime = new Date(physical.timestamp || new Date()).getTime();
      const ageDiff = Math.abs(cyberTime - physTime);
      const within30days = ageDiff < 30 * 24 * 3600 * 1000;

      // Geographic + temporal correlation
      if (distMeters < 1500 && within30days) {
        geoLinks.push(physical.id);
        const proximityScore = Math.max(0, 20 - (distMeters / 1500) * 20);
        totalCorrelationScore += proximityScore;
      }
    }


    // Category-based physical risk amplification
    const cat = CYBER_CATEGORIES[cyberInc.category as CyberCategoryId];
    const physRiskMultiplier = cat.physical_risk === 'critical' ? 2.0 : cat.physical_risk === 'high' ? 1.5 : cat.physical_risk === 'medium' ? 1.2 : 1.0;
    totalCorrelationScore *= physRiskMultiplier;

    if (directLinks.length > 0 || geoLinks.length > 0 || totalCorrelationScore > 5) {
      results.push({
        cyberIncidentId: cyberInc.id,
        cyberCategory: cyberInc.category,
        cyberZone: cyberInc.zone,
        directLinkedIncidents: directLinks,
        geoCorrelatedIncidents: [...new Set(geoLinks)].slice(0, 5),
        correlationScore: Math.min(100, Math.round(totalCorrelationScore)),
        physicalRiskLevel: totalCorrelationScore > 60 ? 'CRITICAL' : totalCorrelationScore > 35 ? 'HIGH' : totalCorrelationScore > 15 ? 'MODERATE' : 'LOW',
        lat: cyberInc.lat,
        lng: cyberInc.lng,
      });
    }
  }

  return results.sort((a, b) => b.correlationScore - a.correlationScore);
}

export interface CorrelationResult {
  cyberIncidentId: string;
  cyberCategory: string;
  cyberZone: string;
  directLinkedIncidents: string[];
  geoCorrelatedIncidents: string[];
  correlationScore: number;
  physicalRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  lat: number;
  lng: number;
}

// ─── Fraud Cluster Detection ───────────────────────────────────────────────────

export interface FraudCluster {
  clusterId: string;
  label: string;
  category: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  incidentCount: number;
  totalLoss: number;
  totalVictims: number;
  avgSeverity: number;
  incidents: string[];
  modus: string;
  status: 'ACTIVE' | 'CONTAINED' | 'DISMANTLED';
  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  firstSeen: string;
  lastSeen: string;
}

function detectFraudClusters(incidents: ReturnType<typeof generateSimulatedCyberIncidents>): FraudCluster[] {
  // Group by zone and category — use || separator to avoid conflicts with hyphens in zone IDs
  const zoneGroups: Record<string, { group: typeof incidents; zoneId: string; catKey: string }> = {};
  incidents.forEach(inc => {
    const key = `${inc.zone}||${inc.category}`;
    if (!zoneGroups[key]) {
      zoneGroups[key] = { group: [], zoneId: inc.zone, catKey: inc.category };
    }
    zoneGroups[key].group.push(inc);
  });

  const clusters: FraudCluster[] = [];
  let clusterIdx = 1;

  for (const entry of Object.values(zoneGroups)) {
    const { group, zoneId, catKey } = entry;
    if (group.length < 1) continue;

    const zone = AHMEDABAD_CYBER_ZONES.find(z => z.id === zoneId) || AHMEDABAD_CYBER_ZONES[0];
    const catInfo = CYBER_CATEGORIES[catKey as CyberCategoryId];
    if (!catInfo) continue;


    const totalLoss = group.reduce((s, i) => s + i.financialLoss, 0);
    const totalVictims = group.reduce((s, i) => s + i.victims, 0);
    const avgSev = group.reduce((s, i) => s + i.severity, 0) / group.length;
    const dates = group.map(i => new Date(i.timestamp).getTime());
    const clusterScore = totalLoss / 100000 + totalVictims * 2 + avgSev * 5;
    const threatLevel: FraudCluster['threatLevel'] = clusterScore > 200 ? 'CRITICAL' : clusterScore > 80 ? 'HIGH' : clusterScore > 30 ? 'MODERATE' : 'LOW';

    // Only emit significant clusters
    if (group.length >= 1 && clusterScore > 10) {
      clusters.push({
        clusterId: `FC-${String(clusterIdx++).padStart(3, '0')}`,
        label: `${zone.name} — ${catInfo.label}`,
        category: catKey,
        centerLat: zone.lat,
        centerLng: zone.lng,
        radius: zone.radius,
        incidentCount: group.length,
        totalLoss,
        totalVictims,
        avgSeverity: Number(avgSev.toFixed(1)),
        incidents: group.map(i => i.id),
        modus: group[0].subcategory,
        status: threatLevel === 'CRITICAL' ? 'ACTIVE' : threatLevel === 'HIGH' ? 'ACTIVE' : 'CONTAINED',
        threatLevel,
        firstSeen: new Date(Math.min(...dates)).toISOString(),
        lastSeen: new Date(Math.max(...dates)).toISOString(),
      });
    }
  }

  return clusters.sort((a, b) => b.totalLoss - a.totalLoss);
}

// ─── Cyber Threat Zone Alerts ──────────────────────────────────────────────────

export interface CyberThreatAlert {
  alertId: string;
  zone: string;
  zoneName: string;
  lat: number;
  lng: number;
  threatType: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  message: string;
  triggeredBy: string[];
  financialImpact: number;
  affectedCount: number;
  recommendation: string;
  timestamp: string;
  isActive: boolean;
}

function generateThreatAlerts(
  incidents: ReturnType<typeof generateSimulatedCyberIncidents>,
  clusters: FraudCluster[]
): CyberThreatAlert[] {
  const alerts: CyberThreatAlert[] = [];

  // Zone-based alerts
  for (const zone of AHMEDABAD_CYBER_ZONES) {
    const zoneInc = incidents.filter(i => i.zone === zone.id);
    if (zoneInc.length === 0) continue;

    const recentInc = zoneInc.filter(i => new Date(i.timestamp).getTime() > Date.now() - 7 * 24 * 3600000);
    const totalLoss = zoneInc.reduce((s, i) => s + i.financialLoss, 0);
    const maxSev = Math.max(...zoneInc.map(i => i.severity));
    const hasActiveCluster = clusters.some(c => c.clusterId.includes(zone.id) && c.status === 'ACTIVE');

    if (recentInc.length >= 2 || maxSev >= 9 || hasActiveCluster) {
      const severity: CyberThreatAlert['severity'] = maxSev >= 10 ? 'CRITICAL' : maxSev >= 8 ? 'HIGH' : recentInc.length >= 3 ? 'WARNING' : 'INFO';
      const primaryCat = CYBER_CATEGORIES[zone.primaryThreat as CyberCategoryId];

      alerts.push({
        alertId: `CTA-${zone.id}`,
        zone: zone.id,
        zoneName: zone.name,
        lat: zone.lat,
        lng: zone.lng,
        threatType: primaryCat?.label || zone.primaryThreat,
        severity,
        message: `${severity} CYBER THREAT: ${recentInc.length} incidents in last 7 days at ${zone.name}. Primary vector: ${primaryCat?.label}. Total loss: ₹${(totalLoss / 100000).toFixed(1)}L.`,
        triggeredBy: zoneInc.slice(0, 3).map(i => i.id),
        financialImpact: totalLoss,
        affectedCount: zoneInc.reduce((s, i) => s + i.victims, 0),
        recommendation: severity === 'CRITICAL'
          ? 'Deploy Cyber Cell rapid response team. Alert I4C and CERT-In. Initiate ISP blocking.'
          : severity === 'HIGH'
            ? 'Escalate to Cyber Cell. Issue public advisory. Monitor financial transactions.'
            : 'Monitor and document. Issue preventive SMS to residents.',
        timestamp: new Date().toISOString(),
        isActive: severity !== 'INFO',
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { CRITICAL: 4, HIGH: 3, WARNING: 2, INFO: 1 };
    return order[b.severity] - order[a.severity];
  });
}

// ─── Public Service API ───────────────────────────────────────────────────────

const loadPhysicalCrimes = async (): Promise<CrimeIncident[]> => {
  let crimes: CrimeIncident[] = [];
  if (AppDataSource.isInitialized) {
    crimes = await AppDataSource.getRepository(CrimeIncident).find({ order: { timestamp: 'DESC' } });
  } else {
    crimes = getStoredCrimes(5000);
  }

  // Ensure we have the linked physical crimes for direct link testing
  const has9011 = crimes.some(c => c.id === 'INC-9011' || c.source_id === 'INC-9011');
  const has9025 = crimes.some(c => c.id === 'INC-9025' || c.source_id === 'INC-9025');

  if (!has9011) {
    const c1 = new CrimeIncident();
    c1.id = 'INC-9011';
    c1.source_id = 'INC-9011';
    c1.type = 'fraud' as any;
    c1.source = 'fir' as any;
    c1.severity = 8;
    c1.timestamp = new Date(Date.now() - 5 * 24 * 3600000);
    c1.location = { type: 'Point', coordinates: [72.5375, 23.0608] };
    c1.location_address = 'SG Highway, Ahmedabad';
    crimes.push(c1);
  }

  if (!has9025) {
    const c2 = new CrimeIncident();
    c2.id = 'INC-9025';
    c2.source_id = 'INC-9025';
    c2.type = 'theft' as any;
    c2.source = 'fir' as any;
    c2.severity = 6;
    c2.timestamp = new Date(Date.now() - 12 * 24 * 3600000);
    c2.location = { type: 'Point', coordinates: [72.5848, 23.0048] };
    c2.location_address = 'Satellite, Ahmedabad';
    crimes.push(c2);
  }

  return crimes;
};

export const CyberIntelService = {
  async getCyberOverview() {
    const incidents = generateSimulatedCyberIncidents();
    const physicalCrimes = await loadPhysicalCrimes();
    const clusters = detectFraudClusters(incidents);
    const correlations = correlateWithPhysical(incidents, physicalCrimes);
    const alerts = generateThreatAlerts(incidents, clusters);

    const totalLoss = incidents.reduce((s, i) => s + i.financialLoss, 0);
    const totalVictims = incidents.reduce((s, i) => s + i.victims, 0);
    const activeAlerts = alerts.filter(a => a.isActive).length;
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;

    // Category breakdown
    const byCategory = Object.values(CYBER_CATEGORIES).map(cat => {
      const catInc = incidents.filter(i => i.category === cat.id.toUpperCase() || CYBER_CATEGORIES[i.category as CyberCategoryId]?.id === cat.id);
      return {
        id: cat.id,
        label: cat.label,
        icon: cat.icon,
        color: cat.color,
        count: catInc.length,
        totalLoss: catInc.reduce((s, i) => s + i.financialLoss, 0),
        totalVictims: catInc.reduce((s, i) => s + i.victims, 0),
        avgSeverity: catInc.length ? catInc.reduce((s, i) => s + i.severity, 0) / catInc.length : 0,
      };
    }).filter(c => c.count > 0);

    // Trend (last 14 days)
    const trend = Array.from({ length: 14 }, (_, i) => {
      const day = new Date(Date.now() - (13 - i) * 24 * 3600000);
      const dateStr = day.toISOString().slice(0, 10);
      const dayInc = incidents.filter(inc => inc.timestamp.slice(0, 10) === dateStr);
      return {
        date: dateStr.slice(5),
        count: dayInc.length,
        loss: dayInc.reduce((s, inc) => s + inc.financialLoss, 0),
        victims: dayInc.reduce((s, inc) => s + inc.victims, 0),
      };
    });

    return {
      summary: {
        total_incidents: incidents.length,
        total_loss_inr: totalLoss,
        total_victims: totalVictims,
        active_alerts: activeAlerts,
        critical_alerts: criticalAlerts,
        clusters_detected: clusters.length,
        cyber_physical_correlations: correlations.filter(c => c.correlationScore > 20).length,
      },
      incidents: incidents.map(i => ({
        ...i,
        categoryInfo: undefined,  // strip circular
        category_label: CYBER_CATEGORIES[i.category as CyberCategoryId]?.label,
        category_color: CYBER_CATEGORIES[i.category as CyberCategoryId]?.color,
        category_icon: CYBER_CATEGORIES[i.category as CyberCategoryId]?.icon,
      })),
      clusters,
      alerts,
      correlations,
      byCategory,
      zones: AHMEDABAD_CYBER_ZONES,
      trend,
      categories: Object.values(CYBER_CATEGORIES),
    };
  },

  async getCyberIncidents() {
    const incidents = generateSimulatedCyberIncidents();
    return incidents.map(i => ({
      ...i,
      category_label: CYBER_CATEGORIES[i.category as CyberCategoryId]?.label,
      category_color: CYBER_CATEGORIES[i.category as CyberCategoryId]?.color,
      category_icon: CYBER_CATEGORIES[i.category as CyberCategoryId]?.icon,
    }));
  },

  async getClusters() {
    const incidents = generateSimulatedCyberIncidents();
    return detectFraudClusters(incidents);
  },

  async getAlerts() {
    const incidents = generateSimulatedCyberIncidents();
    const clusters = detectFraudClusters(incidents);
    return generateThreatAlerts(incidents, clusters);
  },

  async getCorrelations() {
    const incidents = generateSimulatedCyberIncidents();
    const physicalCrimes = await loadPhysicalCrimes();
    return correlateWithPhysical(incidents, physicalCrimes);
  },

  async getZones() {
    return AHMEDABAD_CYBER_ZONES;
  },
};
