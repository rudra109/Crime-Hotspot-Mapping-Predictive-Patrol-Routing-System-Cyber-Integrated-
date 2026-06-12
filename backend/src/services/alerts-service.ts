import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../config/database';
import { AlertRecord } from '../models/alert.model';
import { emitAlertCreated, emitAlertUpdated } from './realtime';

const STORE_FILE = path.join(__dirname, '../../data/alerts-store.json');
const LOG_112_FILE = path.join(__dirname, '../../data/112-erss-logs.json');

// Interface for 112 Emergency Call
export interface ERSS112Call {
  call_id: string;
  caller_phone: string;
  district: string;
  incident_details: string;
  latitude: number;
  longitude: number;
  emergency_type: string;
  timestamp: string;
}

export interface AlertHistoryEvent {
  event: string;
  timestamp: string;
  details: string;
}

// Initial/default alerts to seed if empty
const defaultAlerts: Partial<AlertRecord>[] = [
  {
    id: "ALT-001",
    type: "Critical",
    message: "Violent Incident - Assault reported near Vastrapur Lake",
    sector: "Vastrapur",
    status: "Pending",
    incidentId: "INC-9428",
    escalationLevel: 1,
    routeCategory: "quick_response",
    source: "local",
    history: JSON.stringify([{ event: "Alert Triggered", timestamp: new Date().toISOString(), details: "Emergency call received by dispatcher." }])
  },
  {
    id: "ALT-002",
    type: "Critical",
    message: "Armed Robbery - Jewellery store, Vastrapur Circle",
    sector: "Vastrapur",
    status: "Pending",
    incidentId: "INC-9431",
    escalationLevel: 1,
    routeCategory: "quick_response",
    source: "local",
    history: JSON.stringify([{ event: "Alert Triggered", timestamp: new Date().toISOString(), details: "Emergency panic alarm activated by store owner." }])
  },
  {
    id: "ALT-003",
    type: "Critical",
    message: "AMBER ALERT - Child missing from Chandkheda school gate",
    sector: "Chandkheda",
    status: "Pending",
    incidentId: "INC-4401",
    escalationLevel: 1,
    routeCategory: "quick_response",
    source: "local",
    history: JSON.stringify([{ event: "Alert Triggered", timestamp: new Date().toISOString(), details: "Amber alert issued under Child Safety protocol." }])
  },
  {
    id: "ALT-004",
    type: "Critical",
    message: "Gang Activity - Firearms reported in Bapunagar. QRT Deployed.",
    sector: "Bapunagar",
    status: "Pending",
    incidentId: "INC-5501",
    escalationLevel: 1,
    routeCategory: "quick_response",
    source: "local",
    history: JSON.stringify([{ event: "Alert Triggered", timestamp: new Date().toISOString(), details: "Firearms discharge reported. Quick Response Team notified." }])
  },
  {
    id: "ALT-005",
    type: "Warning",
    message: "Vehicle Theft - Suspect last seen moving towards SG Highway",
    sector: "Thaltej",
    status: "Dispatched",
    incidentId: "INC-8812",
    escalationLevel: 1,
    routeCategory: "general_dispatch",
    source: "local",
    history: JSON.stringify([
      { event: "Alert Triggered", timestamp: new Date(Date.now() - 30 * 60000).toISOString(), details: "Vehicle tracking camera match detected." },
      { event: "Unit Dispatched", timestamp: new Date(Date.now() - 25 * 60000).toISOString(), details: "PCR Van assigned to intercept." }
    ])
  },
  {
    id: "ALT-006",
    type: "Warning",
    message: "Minor disturbance near Maninagar Market. RAF on standby.",
    sector: "Maninagar",
    status: "Pending",
    escalationLevel: 1,
    routeCategory: "general_dispatch",
    source: "local",
    history: JSON.stringify([{ event: "Alert Triggered", timestamp: new Date().toISOString(), details: "Crowd gathering reported by beat officer." }])
  },
  {
    id: "ALT-007",
    type: "Info",
    message: "Traffic Clearance - Congestion resolved at Memnagar Crossroads",
    sector: "Memnagar",
    status: "Acknowledged",
    incidentId: "INC-7430",
    escalationLevel: 1,
    routeCategory: "traffic_control",
    source: "local",
    operatorId: "BADGE-1234",
    operatorName: "Inspector Dave",
    operatorNotes: "Cleared by traffic patrol unit. Flow normal.",
    acknowledgedAt: new Date(),
    history: JSON.stringify([
      { event: "Alert Triggered", timestamp: new Date(Date.now() - 60 * 60000).toISOString(), details: "Traffic queue length exceeded 500m." },
      { event: "Alert Acknowledged", timestamp: new Date(Date.now() - 40 * 60000).toISOString(), details: "Acknowledged by Operator Dave: 'Cleared by traffic patrol unit. Flow normal.'" }
    ])
  }
];

let inMemoryAlertStore: AlertRecord[] = [];
let inMemory112Logs: any[] = [];

// Initialize files
const ensureDirectoriesAndFiles = () => {
  const dataDir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(LOG_112_FILE)) {
    fs.writeFileSync(LOG_112_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
};

export class AlertsService {
  private static isSeeded = false;

  public static async initializeStore() {
    ensureDirectoriesAndFiles();

    // Load from JSON file if database is not active
    try {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      inMemoryAlertStore = JSON.parse(data);

      const logsData = fs.readFileSync(LOG_112_FILE, 'utf-8');
      inMemory112Logs = JSON.parse(logsData);
    } catch (e) {
      console.error("Failed to load alerts/logs from disk:", e);
    }

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(AlertRecord);
      const count = await repo.count();
      if (count === 0 && !this.isSeeded) {
        console.log("Seeding database with default alerts...");
        for (const item of defaultAlerts) {
          const record = repo.create(item);
          record.timestamp = new Date();
          await repo.save(record);
        }
        this.isSeeded = true;
      }
    } else {
      if (inMemoryAlertStore.length === 0 && !this.isSeeded) {
        console.log("Seeding in-memory store with default alerts...");
        inMemoryAlertStore = defaultAlerts.map(item => {
          const record = new AlertRecord();
          Object.assign(record, item);
          record.timestamp = new Date();
          return record;
        });
        this.saveInMemoryStore();
        this.isSeeded = true;
      }
    }
  }

  private static saveInMemoryStore() {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(inMemoryAlertStore, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to save alerts to file:", e);
    }
  }

  private static save112Logs() {
    try {
      fs.writeFileSync(LOG_112_FILE, JSON.stringify(inMemory112Logs, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to save 112 logs to file:", e);
    }
  }

  public static async getAllAlerts(): Promise<AlertRecord[]> {
    await this.initializeStore();
    if (AppDataSource.isInitialized) {
      return AppDataSource.getRepository(AlertRecord).find({ order: { timestamp: 'DESC' } });
    }
    return [...inMemoryAlertStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static async createAlert(data: {
    message: string;
    sector: string;
    incidentId?: string;
    severity?: number;
    source?: 'local' | 'erss_112';
    type?: 'Critical' | 'Warning' | 'Info';
  }): Promise<AlertRecord> {
    await this.initializeStore();

    const record = new AlertRecord();
    record.id = `ALT-${Date.now()}`;
    record.message = data.message;
    record.sector = data.sector;
    record.incidentId = data.incidentId || null;
    record.timestamp = new Date();
    record.status = 'Pending';
    record.escalationLevel = 1;
    record.source = data.source || 'local';

    // Route category mapping
    const msgLower = data.message.toLowerCase();
    if (msgLower.includes('cyber') || msgLower.includes('fraud') || msgLower.includes('upi') || msgLower.includes('scam')) {
      record.routeCategory = 'cyber_cell';
    } else if (msgLower.includes('traffic') || msgLower.includes('accident') || msgLower.includes('road block') || msgLower.includes('congestion')) {
      record.routeCategory = 'traffic_control';
    } else if (msgLower.includes('assault') || msgLower.includes('riot') || msgLower.includes('arson') || msgLower.includes('gang') || msgLower.includes('murder') || msgLower.includes('robbery') || msgLower.includes('fight')) {
      record.routeCategory = 'quick_response';
    } else {
      record.routeCategory = 'general_dispatch';
    }

    // Severity mapping
    const sev = data.severity !== undefined ? data.severity : 5;
    if (data.type) {
      record.type = data.type;
    } else {
      record.type = sev >= 8 ? 'Critical' : sev >= 5 ? 'Warning' : 'Info';
    }

    // Initialize history
    const historyEvents: AlertHistoryEvent[] = [
      {
        event: "Alert Triggered",
        timestamp: record.timestamp.toISOString(),
        details: `Alert created via ${record.source.toUpperCase()}. Operational route assigned: ${record.routeCategory.toUpperCase()}.`
      }
    ];

    // Repeated-Spike Detection
    const spikeTriggered = await this.checkRepeatedSpike(record.sector, record.routeCategory, historyEvents);
    if (spikeTriggered) {
      record.status = 'Escalated';
      record.escalationLevel = 3;
      record.escalatedAt = new Date();
      historyEvents.push({
        event: "Auto-Escalation: Repeated Spike",
        timestamp: new Date().toISOString(),
        details: `Spike threshold exceeded for sector ${record.sector} on type ${record.routeCategory.toUpperCase()}. Escalate directly to QRT / Level 3.`
      });
    }

    record.history = JSON.stringify(historyEvents);

    if (AppDataSource.isInitialized) {
      const repo = AppDataSource.getRepository(AlertRecord);
      const saved = await repo.save(record);
      emitAlertCreated(saved);
      return saved;
    } else {
      inMemoryAlertStore.unshift(record);
      this.saveInMemoryStore();
      emitAlertCreated(record);
      return record;
    }
  }

  private static async checkRepeatedSpike(
    sector: string,
    routeCategory: string,
    historyEvents: AlertHistoryEvent[]
  ): Promise<boolean> {
    const timeWindow = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    let recentAlerts: AlertRecord[] = [];
    if (AppDataSource.isInitialized) {
      recentAlerts = await AppDataSource.getRepository(AlertRecord).find();
    } else {
      recentAlerts = inMemoryAlertStore;
    }

    // Filter alerts of the same category, same sector, in last 30 minutes
    const matches = recentAlerts.filter(a => 
      a.sector.toLowerCase() === sector.toLowerCase() &&
      a.routeCategory === routeCategory &&
      (now - new Date(a.timestamp).getTime()) <= timeWindow
    );

    // If count >= 2 (so this third alert will make it >= 3)
    if (matches.length >= 2) {
      console.warn(`🚨 REPEATED SPIKE DETECTED in sector ${sector} for category ${routeCategory}! Auto-escalating active alerts.`);
      // Auto-escalate matching pending/warning alerts in this window
      for (const alert of matches) {
        if (alert.status === 'Pending' || alert.status === 'Escalated' && alert.escalationLevel < 3) {
          alert.status = 'Escalated';
          alert.escalationLevel = 3;
          alert.escalatedAt = new Date();
          const hist: AlertHistoryEvent[] = JSON.parse(alert.history || '[]');
          hist.push({
            event: "Auto-Escalation: Repeated Spike Cascade",
            timestamp: new Date().toISOString(),
            details: `Escalated due to repeated spike detection in sector ${sector}.`
          });
          alert.history = JSON.stringify(hist);

          if (AppDataSource.isInitialized) {
            await AppDataSource.getRepository(AlertRecord).save(alert);
          }
        }
      }
      if (!AppDataSource.isInitialized) {
        this.saveInMemoryStore();
      }
      return true;
    }

    return false;
  }

  public static async acknowledgeAlert(
    id: string,
    operatorId: string,
    operatorName: string,
    notes: string
  ): Promise<AlertRecord> {
    await this.initializeStore();

    let alert: AlertRecord | null = null;
    if (AppDataSource.isInitialized) {
      alert = await AppDataSource.getRepository(AlertRecord).findOne({ where: { id } });
    } else {
      alert = inMemoryAlertStore.find(a => a.id === id) || null;
    }

    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }

    alert.status = 'Acknowledged';
    alert.operatorId = operatorId;
    alert.operatorName = operatorName;
    alert.operatorNotes = notes;
    alert.acknowledgedAt = new Date();

    const historyEvents: AlertHistoryEvent[] = JSON.parse(alert.history || '[]');
    historyEvents.push({
      event: "Alert Acknowledged",
      timestamp: alert.acknowledgedAt.toISOString(),
      details: `Acknowledged by Operator ${operatorName} (${operatorId}). Notes: "${notes}"`
    });
    alert.history = JSON.stringify(historyEvents);

    if (AppDataSource.isInitialized) {
      const saved = await AppDataSource.getRepository(AlertRecord).save(alert);
      emitAlertUpdated(saved);
      return saved;
    } else {
      this.saveInMemoryStore();
      emitAlertUpdated(alert);
      return alert;
    }
  }

  public static async escalateAlert(
    id: string,
    level: number,
    reason: string
  ): Promise<AlertRecord> {
    await this.initializeStore();

    let alert: AlertRecord | null = null;
    if (AppDataSource.isInitialized) {
      alert = await AppDataSource.getRepository(AlertRecord).findOne({ where: { id } });
    } else {
      alert = inMemoryAlertStore.find(a => a.id === id) || null;
    }

    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }

    alert.status = 'Escalated';
    alert.escalationLevel = level;
    alert.escalatedAt = new Date();

    const historyEvents: AlertHistoryEvent[] = JSON.parse(alert.history || '[]');
    historyEvents.push({
      event: `Escalated to Level ${level}`,
      timestamp: alert.escalatedAt.toISOString(),
      details: `Escalated by supervisor. Reason: "${reason}"`
    });
    alert.history = JSON.stringify(historyEvents);

    if (AppDataSource.isInitialized) {
      const saved = await AppDataSource.getRepository(AlertRecord).save(alert);
      emitAlertUpdated(saved);
      return saved;
    } else {
      this.saveInMemoryStore();
      emitAlertUpdated(alert);
      return alert;
    }
  }

  public static async getAlertHistory(id: string): Promise<AlertHistoryEvent[]> {
    await this.initializeStore();

    let alert: AlertRecord | null = null;
    if (AppDataSource.isInitialized) {
      alert = await AppDataSource.getRepository(AlertRecord).findOne({ where: { id } });
    } else {
      alert = inMemoryAlertStore.find(a => a.id === id) || null;
    }

    if (!alert) {
      throw new Error(`Alert with ID ${id} not found`);
    }

    return JSON.parse(alert.history || '[]');
  }

  public static async ingest112EmergencyCall(call: ERSS112Call): Promise<{ status: string; alertId: string }> {
    await this.initializeStore();

    // Log raw payload
    inMemory112Logs.unshift({
      timestamp: new Date().toISOString(),
      payload: call
    });
    this.save112Logs();

    // Route emergency types
    const sev = call.emergency_type.toLowerCase().includes('weapon') || call.emergency_type.toLowerCase().includes('murder') || call.emergency_type.toLowerCase().includes('kidnap') ? 10 : 8;

    const alert = await this.createAlert({
      message: `[112 ERSS Emergency] Call ID: ${call.call_id} | Caller: ${call.caller_phone} | Incident: ${call.incident_details}`,
      sector: call.district,
      severity: sev,
      source: 'erss_112',
      type: 'Critical'
    });

    return {
      status: "Ingested",
      alertId: alert.id
    };
  }

  public static async get112Logs(): Promise<any[]> {
    await this.initializeStore();
    return inMemory112Logs;
  }
}
