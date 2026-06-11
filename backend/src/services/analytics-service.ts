import { AppDataSource } from '../config/database';
import { CrimeIncident, CrimeSource } from '../models/crime.model';
import { getStoredCrimes } from './crime-service/ingestion';

export interface CrimeZoneRisk {
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
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
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

const AHMEDABAD_ZONES = [
  { id: 'central', zone: 'Central', center: { lat: 23.0225, lng: 72.5714 }, keywords: ['lal darwaja', 'paldi', 'ashram road', 'central', 'race course'] },
  { id: 'north', zone: 'North', center: { lat: 23.0596, lng: 72.5394 }, keywords: ['thaltej', 'ghatlodia', 'sg highway', 'north'] },
  { id: 'south', zone: 'South', center: { lat: 23.0398, lng: 72.5281 }, keywords: ['vastrapur', 'memnagar', 'satellite', 'south'] },
  { id: 'east', zone: 'East', center: { lat: 23.1456, lng: 72.6123 }, keywords: ['chandkheda', 'nikol', 'ahmedabad east', 'east'] },
  { id: 'west', zone: 'West', center: { lat: 22.9975, lng: 72.6020 }, keywords: ['vejalpur', 'vasna', 'ranip', 'west'] },
  { id: 'northwest', zone: 'North-West Corridor', center: { lat: 23.0600, lng: 72.5382 }, keywords: ['sg highway', 'thaltej', 'satellite', 'vastrapur'] }
] as const;

const SEASON_BY_MONTH: Record<number, string> = {
  12: 'Winter',
  1: 'Winter',
  2: 'Winter',
  3: 'Pre-Monsoon',
  4: 'Pre-Monsoon',
  5: 'Summer',
  6: 'Monsoon',
  7: 'Monsoon',
  8: 'Monsoon',
  9: 'Monsoon',
  10: 'Post-Monsoon',
  11: 'Post-Monsoon'
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const toDate = (value: Date | string | undefined) => new Date(value || new Date());

const loadCrimes = async (): Promise<CrimeIncident[]> => {
  if (AppDataSource.isInitialized) {
    return AppDataSource.getRepository(CrimeIncident).find({
      order: { timestamp: 'DESC' }
    });
  }

  return getStoredCrimes(5000);
};

const matchZone = (crime: CrimeIncident) => {
  const address = (crime.location_address || '').toLowerCase();
  return AHMEDABAD_ZONES.find((zone) => zone.keywords.some((kw) => address.includes(kw))) || AHMEDABAD_ZONES[0];
};

const groupBy = <T,>(items: T[], selector: (item: T) => string) =>
  items.reduce<Record<string, T[]>>((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

export const AnalyticsService = {
  async getSourceBreakdown() {
    const crimes = await loadCrimes();
    const bySource = crimes.reduce<Record<string, number>>((acc, crime) => {
      const key = crime.source || CrimeSource.FIR;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const bySourceAndType = crimes.reduce<Record<string, Record<string, number>>>((acc, crime) => {
      const sourceKey = crime.source || CrimeSource.FIR;
      acc[sourceKey] = acc[sourceKey] || {};
      const typeKey = crime.type || 'unknown';
      acc[sourceKey][typeKey] = (acc[sourceKey][typeKey] || 0) + 1;
      return acc;
    }, {});

    return { total: crimes.length, bySource, bySourceAndType };
  },

  async getDailyTrends(days = 30) {
    const crimes = await loadCrimes();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const buckets = new Map<string, { date: string; incidents: number; severity: number; cyber: number }>();

    crimes
      .filter((crime) => toDate(crime.timestamp).getTime() >= cutoff)
      .forEach((crime) => {
        const date = toDate(crime.timestamp).toISOString().slice(0, 10);
        const existing = buckets.get(date) || { date, incidents: 0, severity: 0, cyber: 0 };
        existing.incidents += 1;
        existing.severity += crime.severity || 0;
        if (crime.source === CrimeSource.CYBER_BRANCH || (crime.type || '').toLowerCase() === 'cybercrime') {
          existing.cyber += 1;
        }
        buckets.set(date, existing);
      });

    return Array.from(buckets.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        average_severity: row.incidents ? Number((row.severity / row.incidents).toFixed(1)) : 0
      }));
  },

  async getSeasonalTrends() {
    const crimes = await loadCrimes();
    const seasonal = {
      Winter: 0,
      Summer: 0,
      Monsoon: 0,
      'Pre-Monsoon': 0,
      'Post-Monsoon': 0
    };
    const byWeekday = Array.from({ length: 7 }, (_, index) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      incidents: 0,
      avgSeverity: 0,
      severityTotal: 0
    }));

    crimes.forEach((crime) => {
      const date = toDate(crime.timestamp);
      const season = SEASON_BY_MONTH[date.getMonth() + 1] || 'Post-Monsoon';
      seasonal[season as keyof typeof seasonal] += 1;

      const weekday = byWeekday[date.getDay()];
      weekday.incidents += 1;
      weekday.severityTotal += crime.severity || 0;
    });

    const weekdayTrend = byWeekday.map((entry) => ({
      day: entry.day,
      incidents: entry.incidents,
      avgSeverity: entry.incidents ? Number((entry.severityTotal / entry.incidents).toFixed(1)) : 0
    }));

    return {
      seasonal,
      weekdayTrend
    };
  },

  async getZoneRiskScores() {
    const crimes = await loadCrimes();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    return AHMEDABAD_ZONES.map((zone) => {
      const zoneCrimes = crimes.filter((crime) => matchZone(crime).id === zone.id);
      const last7 = zoneCrimes.filter((crime) => now - toDate(crime.timestamp).getTime() <= sevenDays);
      const prev7 = zoneCrimes.filter((crime) => {
        const age = now - toDate(crime.timestamp).getTime();
        return age > sevenDays && age <= fourteenDays;
      });
      const avgSeverity = zoneCrimes.length
        ? zoneCrimes.reduce((sum, crime) => sum + (crime.severity || 0), 0) / zoneCrimes.length
        : 0;
      const cyber = zoneCrimes.filter((crime) => crime.source === CrimeSource.CYBER_BRANCH || (crime.type || '').toLowerCase() === 'cybercrime').length;
      const critical = zoneCrimes.filter((crime) => (crime.severity || 0) >= 8).length;
      const trendPct = prev7.length === 0 ? (last7.length > 0 ? 100 : 0) : Number((((last7.length - prev7.length) / prev7.length) * 100).toFixed(1));
      const volumeScore = clamp((zoneCrimes.length / Math.max(crimes.length || 1, 1)) * 100 * 3);
      const severityScore = clamp((avgSeverity / 10) * 100);
      const trendScore = clamp(50 + trendPct);
      const cyberScore = clamp((cyber / Math.max(zoneCrimes.length || 1, 1)) * 100);
      const criticalScore = clamp((critical / Math.max(zoneCrimes.length || 1, 1)) * 100);

      const riskScore = clamp(
        volumeScore * 0.28 +
        severityScore * 0.24 +
        trendScore * 0.24 +
        cyberScore * 0.12 +
        criticalScore * 0.12
      );

      const level = riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 35 ? 'MODERATE' : 'LOW';
      const drivers = [
        `${zoneCrimes.length} incidents total`,
        `${last7.length} incidents in 7d`,
        `${avgSeverity.toFixed(1)} avg severity`
      ];

      if (trendPct > 0) drivers.push(`Trend up ${trendPct}%`);
      if (cyber > 0) drivers.push(`${cyber} cyber-linked`);
      if (critical > 0) drivers.push(`${critical} critical`);

      return {
        id: zone.id,
        zone: zone.zone,
        incidents: zoneCrimes.length,
        avg_severity: Number(avgSeverity.toFixed(1)),
        recent_7d: last7.length,
        previous_7d: prev7.length,
        trend_pct: trendPct,
        cyber_share: zoneCrimes.length ? Number(((cyber / zoneCrimes.length) * 100).toFixed(1)) : 0,
        critical_share: zoneCrimes.length ? Number(((critical / zoneCrimes.length) * 100).toFixed(1)) : 0,
        risk_score: Number(riskScore.toFixed(1)),
        level,
        drivers,
        center: zone.center
      } as CrimeZoneRisk;
    }).sort((a, b) => b.risk_score - a.risk_score);
  },

  async getHotspotPredictions() {
    const crimes = await loadCrimes();
    const zones = await AnalyticsService.getZoneRiskScores();
    const grouped = groupBy(crimes, (crime) => matchZone(crime).id);

    return zones.slice(0, 5).map((zone, index) => {
      const zoneCrimes = grouped[zone.id] || [];
      const recentBias = zoneCrimes.filter((crime) => nowWithinHours(crime.timestamp, 72)).length;
      const expectedIncidents7d = Number((zone.incidents * 0.6 + recentBias * 0.8 + zone.risk_score / 10).toFixed(1));

      return {
        id: `HP-${index + 1}`,
        zone: zone.zone,
        center: zone.center,
        risk_score: zone.risk_score,
        confidence: Number(clamp(55 + zone.risk_score * 0.4, 0, 99).toFixed(1)),
        expected_incidents_7d: expectedIncidents7d,
        drivers: zone.drivers.slice(0, 3),
        model_version: 'ensemble-risk-v1'
      } as HotspotPrediction;
    });
  }
};

const nowWithinHours = (timestamp: Date | string, hours: number) => {
  const age = Date.now() - toDate(timestamp).getTime();
  return age <= hours * 60 * 60 * 1000;
};
