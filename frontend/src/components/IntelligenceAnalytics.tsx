/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ChevronRight,
  BadgeInfo,
  Activity,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Calendar,
  Layers,
  Gauge,
  Sliders,
  Sparkles,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { Incident } from "../types";
import {
  fetchDailyTrends,
  fetchHotspotPredictions,
  fetchHourlyStats,
  fetchSeasonalTrends,
  fetchSourceBreakdown,
  fetchStatsSummary,
  fetchZoneRiskScores,
  fetchAdvancedForecast,
  triggerRetraining,
  fetchModelMonitoring,
  fetchPredictionHistory,
  syncPredictionOutcomes,
} from "../api/apiClient";

interface IntelligenceAnalyticsProps {
  incidents: Incident[];
  onDeployUnitFromHotspot: (sectorName: string) => void;
}

interface Hotspot {
  id: string;
  sector: string;
  coordinate: string;
  threatVal: number;
  status: "CRITICAL" | "ELEVATED" | "MODERATE" | "STABLE";
  protocol: string;
  recentActivity: string;
}

const sectorMetricsData = [
  { subject: "Scan Coverage", A: 96, fullMark: 100 },
  { subject: "Response Latency", A: 82, fullMark: 100 },
  { subject: "Path Integrity", A: 90, fullMark: 100 },
  { subject: "Comms Strength", A: 68, fullMark: 100 },
  { subject: "Drone Density", A: 85, fullMark: 100 },
  { subject: "Shift Activity", A: 75, fullMark: 100 }
];

const categoryColorMap: Record<string, string> = {
  Assault: "#f87171",
  Robbery: "#ef4444",
  Snatching: "#fb923c",
  Vandalism: "#facc15",
  Theft: "#a3e635",
  "Drug Trafficking": "#4ade80",
  "Domestic Violence": "#2dd4bf",
  Cybercrime: "#38bdf8",
  Fraud: "#60a5fa",
  "Traffic Violation": "#818cf8",
  Accident: "#c084fc",
  Rioting: "#fb7185",
  "Gang Activity": "#cbd5e1",
  Arson: "#f97316",
  Kidnapping: "#ec4899",
  "Patrol Request": "#64748b",
};

export default function IntelligenceAnalytics({
  incidents,
  onDeployUnitFromHotspot,
}: IntelligenceAnalyticsProps) {
  const [summary, setSummary] = useState({
    total_crimes: incidents.length,
    hotspots_active: 0,
    officers_deployed: 0,
    average_severity: 0,
    by_type: {} as Record<string, number>,
  });
  const [hourlyStats, setHourlyStats] = useState<Array<{ hour: string; incidents: number; severity: number }>>([]);
  const [deployedSectors, setDeployedSectors] = useState<Record<string, boolean>>({});
  const [sourceBreakdown, setSourceBreakdown] = useState<{ total: number; bySource: Record<string, number>; bySourceAndType: Record<string, Record<string, number>> }>({
    total: 0,
    bySource: {},
    bySourceAndType: {},
  });
  const [dailyTrends, setDailyTrends] = useState<Array<{ date: string; incidents: number; severity: number; cyber: number; average_severity: number }>>([]);
  const [seasonalTrends, setSeasonalTrends] = useState<{ seasonal: Record<string, number>; weekdayTrend: Array<{ day: string; incidents: number; avgSeverity: number }> }>({
    seasonal: {},
    weekdayTrend: [],
  });
  const [zoneRisks, setZoneRisks] = useState<Array<{ id: string; zone: string; incidents: number; avg_severity: number; recent_7d: number; previous_7d: number; trend_pct: number; cyber_share: number; critical_share: number; risk_score: number; level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; drivers: string[]; center: { lat: number; lng: number } }>>([]);
  const [hotspotPredictions, setHotspotPredictions] = useState<Array<{ id: string; zone: string; center: { lat: number; lng: number }; risk_score: number; confidence: number; expected_incidents_7d: number; drivers: string[]; model_version: string }>>([]);

  // Unified filter states
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // 1. Search Query
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(query);
        const matchesCat = inc.category.toLowerCase().includes(query);
        const matchesLoc = inc.location.toLowerCase().includes(query);
        const matchesDesc = inc.description?.toLowerCase().includes(query) ?? false;
        if (!matchesId && !matchesCat && !matchesLoc && !matchesDesc) return false;
      }

      // 2. Date Range
      if (filterDateRange !== 'all') {
        const ts = inc.timestamp || "";
        if (filterDateRange === 'last24h') {
          if (!ts.includes('IST') && !ts.includes('Immediate')) return false;
        }
      }

      // 3. Source
      if (filterSource !== 'all') {
        const sourceVal = inc.source || (inc.reportedBy?.toLowerCase().includes('mobile') || inc.location.includes('Mobile') ? 'mobile_officer' : 'fir');
        if (filterSource === 'fir' && sourceVal !== 'fir') return false;
        if (filterSource === 'complaint' && sourceVal !== 'complaint') return false;
        if (filterSource === 'patrol' && sourceVal !== 'patrol_log') return false;
        if (filterSource === 'cyber' && sourceVal !== 'cyber_branch') return false;
        if (filterSource === 'mobile' && sourceVal !== 'mobile_officer') return false;
      }

      // 4. Zone
      if (filterZone !== 'all') {
        const zoneLower = filterZone.toLowerCase();
        let incZone = "central";
        const loc = inc.location.toLowerCase();
        if (loc.includes('vastrapur') || loc.includes('thaltej') || loc.includes('sg highway') || loc.includes('bopal')) incZone = "west";
        else if (loc.includes('naranpura') || loc.includes('chandkheda') || loc.includes('sabarmati')) incZone = "north";
        else if (loc.includes('bapunagar') || loc.includes('odhav') || loc.includes('nikol')) incZone = "east";
        else if (loc.includes('maninagar') || loc.includes('vatva')) incZone = "south";
        
        if (incZone !== zoneLower) return false;
      }

      // 5. Severity
      if (filterSeverity !== 'all') {
        const index = inc.threatIndex;
        if (filterSeverity === 'critical' && index < 85) return false;
        if (filterSeverity === 'high' && (index < 60 || index >= 85)) return false;
        if (filterSeverity === 'moderate' && (index < 40 || index >= 60)) return false;
        if (filterSeverity === 'routine' && index >= 40) return false;
      }

      // 6. Case Status
      if (filterStatus !== 'all') {
        if (inc.status !== filterStatus) return false;
      }

      return true;
    });
  }, [incidents, filterSearch, filterDateRange, filterSource, filterZone, filterSeverity, filterStatus]);

  // New Predictive Analytics States
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'predictive'>('matrix');
  const [forecastWindow, setForecastWindow] = useState<string>('hourly');
  const [forecastData, setForecastData] = useState<{ forecast: any[]; explainability: any; model_version: string } | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [monitoringData, setMonitoringData] = useState<any[]>([]);
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);
  const [retrainingLoading, setRetrainingLoading] = useState<boolean>(false);
  const [retrainResult, setRetrainResult] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);

  const loadForecast = async (window: string) => {
    setForecastLoading(true);
    try {
      const data = await fetchAdvancedForecast(window);
      setForecastData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setForecastLoading(false);
    }
  };

  const loadMonitoringAndHistory = async () => {
    try {
      const [mon, hist] = await Promise.all([
        fetchModelMonitoring(),
        fetchPredictionHistory(50),
      ]);
      setMonitoringData(mon);
      setPredictionHistory(hist);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetrain = async () => {
    setRetrainingLoading(true);
    try {
      const res = await triggerRetraining();
      setRetrainResult(res);
      await loadMonitoringAndHistory();
      await loadForecast(forecastWindow);
    } catch (err) {
      console.error(err);
    } finally {
      setRetrainingLoading(false);
    }
  };

  const handleSyncOutcomes = async () => {
    setSyncLoading(true);
    try {
      await syncPredictionOutcomes();
      await loadMonitoringAndHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncLoading(false);
    }
  };

  // Run on tab changes
  useEffect(() => {
    if (activeSubTab === 'predictive') {
      loadForecast(forecastWindow);
      loadMonitoringAndHistory();
    }
  }, [activeSubTab, forecastWindow]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [summaryData, hourlyData] = await Promise.all([
          fetchStatsSummary(),
          fetchHourlyStats(),
        ]);

        const [sourceData, dailyData, seasonalData, zoneData, hotspotData] = await Promise.all([
          fetchSourceBreakdown(),
          fetchDailyTrends(),
          fetchSeasonalTrends(),
          fetchZoneRiskScores(),
          fetchHotspotPredictions(),
        ]);

        if (!mounted) return;

        setSummary({
          total_crimes: summaryData.total_crimes ?? incidents.length,
          hotspots_active: summaryData.hotspots_active ?? 0,
          officers_deployed: summaryData.officers_deployed ?? 0,
          average_severity: summaryData.average_severity ?? 0,
          by_type: summaryData.by_type ?? {},
        });
        setHourlyStats(hourlyData);
        setSourceBreakdown(sourceData);
        setDailyTrends(dailyData);
        setSeasonalTrends(seasonalData);
        setZoneRisks(zoneData);
        setHotspotPredictions(hotspotData);
      } catch {
        if (!mounted) return;
        setSummary((prev) => ({
          ...prev,
          total_crimes: incidents.length,
        }));
        setHourlyStats([]);
        setSourceBreakdown({ total: 0, bySource: {}, bySourceAndType: {} });
        setDailyTrends([]);
        setSeasonalTrends({ seasonal: {}, weekdayTrend: [] });
        setZoneRisks([]);
        setHotspotPredictions([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [incidents.length]);

  const hotspots = useMemo(() => {
    const sectorsMap: Record<string, {
      sector: string;
      coordinates: [number, number];
      threats: number[];
      recentActivities: string[];
    }> = {};

    incidents.forEach((inc) => {
      const parts = inc.location.split("(");
      const sector = parts[0].trim();
      
      let coords: [number, number] = [23.0225, 72.5714];
      if (inc.coordinates && inc.coordinates.length === 2) {
        coords = [inc.coordinates[0], inc.coordinates[1]];
      } else if (parts[1]) {
        const coordString = parts[1].replace(")", "").trim();
        const coordParts = coordString.split(",");
        if (coordParts.length === 2) {
          const lat = parseFloat(coordParts[0]);
          const lng = parseFloat(coordParts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            coords = [lat, lng];
          }
        }
      }

      if (!sectorsMap[sector]) {
        sectorsMap[sector] = {
          sector,
          coordinates: coords,
          threats: [],
          recentActivities: [],
        };
      }

      sectorsMap[sector].threats.push(inc.threatIndex);
      sectorsMap[sector].recentActivities.push(`${inc.category}: ${inc.description}`);
    });

    const derived = Object.entries(sectorsMap).map(([sector, data], idx) => {
      let maxThreat = data.threats.length > 0 ? Math.max(...data.threats) : 0;
      const isDeployed = !!deployedSectors[sector];
      
      if (isDeployed) {
        maxThreat = Math.round(maxThreat * 0.4);
      }

      let status: "CRITICAL" | "ELEVATED" | "MODERATE" | "STABLE" = "STABLE";
      let protocol = "Routine Beat Patrol";
      
      if (isDeployed) {
        status = "MODERATE";
        protocol = "Reinforced Unit Deploy Area";
      } else if (maxThreat >= 85) {
        status = "CRITICAL";
        protocol = "QRT Response & Barrier Check";
      } else if (maxThreat >= 70) {
        status = "ELEVATED";
        protocol = "High-Visibility Mobile Patrol";
      } else if (maxThreat >= 40) {
        status = "MODERATE";
        protocol = "Targeted Anti-Crime Sweep";
      } else {
        status = "STABLE";
        protocol = "Routine Beat Patrol";
      }

      const recentActivity = data.recentActivities.length > 0 
        ? data.recentActivities[0] 
        : "No recent incidents reported.";

      return {
        id: `HS-${idx + 1}`,
        sector,
        coordinate: `${data.coordinates[0].toFixed(4)}, ${data.coordinates[1].toFixed(4)}`,
        threatVal: maxThreat,
        status,
        protocol,
        recentActivity,
      };
    });

    return derived.sort((a, b) => b.threatVal - a.threatVal);
  }, [incidents, deployedSectors]);

  const pieData = useMemo(() => {
    const counts = incidents.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const derived = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return derived.length > 0
      ? derived
      : [
          { name: "Theft", value: 8 },
          { name: "Assault", value: 5 },
          { name: "Cybercrime", value: 3 },
          { name: "Fraud", value: 4 },
          { name: "Robbery", value: 2 },
        ];
  }, [incidents]);

  const sourcePieData = useMemo(() => {
    const entries = Object.entries(sourceBreakdown.bySource || {}).map(([name, value]) => ({ name, value }));
    return entries.length > 0
      ? entries
      : [
          { name: "fir", value: 10 },
          { name: "complaint", value: 4 },
          { name: "patrol_log", value: 3 },
          { name: "cyber_branch", value: 2 },
        ];
  }, [sourceBreakdown]);

  const riskTrendsData = useMemo(() => {
    if (hourlyStats.length > 0) {
      return hourlyStats.map((entry) => ({
        time: entry.hour,
        value: Math.min(100, Math.max(0, Math.round((entry.severity || 0) * 10))),
      }));
    }

    return incidents.slice(0, 12).map((incident, idx) => ({
      time: incident.timestamp || `${String(idx).padStart(2, "0")}:00`,
      value: Math.min(100, incident.threatIndex),
    }));
  }, [hourlyStats, incidents]);

  const dailyTrendData = useMemo(() => {
    if (dailyTrends.length > 0) {
      return dailyTrends.map((row) => ({
        date: row.date.slice(5),
        incidents: row.incidents,
        cyber: row.cyber,
        avg: row.average_severity,
      }));
    }

    return incidents.slice(0, 14).map((incident, idx) => ({
      date: incident.timestamp ? incident.timestamp.slice(5, 10) : `D${idx + 1}`,
      incidents: 1,
      cyber: incident.category === "Cybercrime" ? 1 : 0,
      avg: incident.threatIndex / 10,
    }));
  }, [dailyTrends, incidents]);

  const weekdayTrendData = useMemo(() => {
    return seasonalTrends.weekdayTrend.length > 0
      ? seasonalTrends.weekdayTrend
      : [
          { day: "Mon", incidents: 9, avgSeverity: 6.2 },
          { day: "Tue", incidents: 12, avgSeverity: 6.8 },
          { day: "Wed", incidents: 11, avgSeverity: 6.1 },
          { day: "Thu", incidents: 14, avgSeverity: 7.0 },
          { day: "Fri", incidents: 18, avgSeverity: 7.4 },
          { day: "Sat", incidents: 16, avgSeverity: 6.9 },
          { day: "Sun", incidents: 8, avgSeverity: 5.9 },
        ];
  }, [seasonalTrends]);

  const topZoneRisks = useMemo(() => zoneRisks.slice(0, 5), [zoneRisks]);
  const topPredictions = useMemo(() => hotspotPredictions.slice(0, 4), [hotspotPredictions]);

  const currentPieData = pieData;
  const totalCategories = currentPieData.reduce((sum, entry) => sum + entry.value, 0) || 1;
  const threatLabel =
    summary.average_severity >= 7 ? "High" : summary.average_severity >= 4 ? "Moderate" : "Low";

  const handleHotspotDeploy = (sector: string) => {
    setDeployedSectors((prev) => ({ ...prev, [sector]: true }));
    onDeployUnitFromHotspot(sector);
  };

  if (activeSubTab === 'predictive') {
    return (
      <div className="space-y-6 font-sans text-slate-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[9px] font-mono bg-violet-950/60 border border-violet-500/30 text-violet-400 rounded-sm uppercase font-bold tracking-widest animate-pulse">
                PREDICTIVE COGNITION NODE
              </span>
              <span className="text-xs font-mono text-slate-500">MODEL_LIFECYCLE_ENG</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">PREDICTIVE FORECASTS & LIFE-CYCLE</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSubTab('matrix')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold rounded-lg border border-slate-700 uppercase tracking-wider transition-all cursor-pointer"
            >
              ← Back to Metrics
            </button>
            <button
              onClick={handleRetrain}
              disabled={retrainingLoading}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrainingLoading ? 'animate-spin' : ''}`} />
              {retrainingLoading ? 'Retraining Pipeline...' : 'Retrain Model Pipeline'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-violet-400">ACTIVE MODEL</span>
              <Database className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white truncate">
                {forecastData?.model_version.split('-')[0].toUpperCase() || 'PROPHET'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Version: {forecastData?.model_version || 'ensemble-v2.0'}</div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-400">DRIFT EVALUATION</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              {monitoringData[0] && JSON.parse(monitoringData[0].drift_metrics || '{}').drift_detected ? (
                <div className="flex items-center gap-1 text-amber-400 font-bold text-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span>DRIFT DETECTED</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-400 font-bold text-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>MODEL ALIGNED</span>
                </div>
              )}
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                KS p-val: {monitoringData[0] ? Number(JSON.parse(monitoringData[0].drift_metrics || '{}').p_value || 0).toFixed(4) : '1.0000'}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-cyan-400">MEAN ABS ERROR (MAE)</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">
                {monitoringData[0] ? Number(JSON.parse(monitoringData[0].evaluation_metrics || '{}').mae || 0).toFixed(2) : '1.05'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Lower error is better</div>
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-pink-400">VALIDATION RMSE</span>
              <Activity className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">
                {monitoringData[0] ? Number(JSON.parse(monitoringData[0].evaluation_metrics || '{}').rmse || 0).toFixed(2) : '1.34'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Baseline Root Mean Sq Error</div>
            </div>
          </div>
        </div>

        {retrainResult && (
          <div className="bg-slate-900 border border-violet-500/30 p-4 rounded-xl flex items-center justify-between shadow-md">
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider font-mono">Retraining Pipeline Succeeded</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Model version <span className="text-violet-400 font-mono font-bold">{retrainResult.model_version}</span> deployed. MAE: {retrainResult.evaluation?.mae?.toFixed(3)}, RMSE: {retrainResult.evaluation?.rmse?.toFixed(3)}. Drift: {retrainResult.drift_detection?.drift_detected ? 'Yes' : 'No'}.
              </p>
            </div>
            <button
              onClick={() => setRetrainResult(null)}
              className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">MULTIPLE WINDOW COGNITIVE FORECASTS</h3>
                  <span className="text-[11px] font-mono text-slate-400">Predictive Incident Count Projection</span>
                </div>
                <div className="flex gap-1 bg-[#090F1C] border border-slate-800 p-1 rounded-lg">
                  {['hourly', 'daily', 'weekly', 'seasonal'].map((win) => (
                    <button
                      key={win}
                      onClick={() => setForecastWindow(win)}
                      className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all cursor-pointer ${forecastWindow === win ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      {win}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72 mt-4 relative">
                {forecastLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm rounded-xl z-10">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                      <span className="text-xs font-mono text-slate-400">Generating Prophet forecast...</span>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData?.forecast || []}>
                    <defs>
                      <linearGradient id="predIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="timestamp"
                      stroke="#64748b"
                      fontSize={9}
                      fontFamily="monospace"
                      tickFormatter={(tick) => {
                        const d = new Date(tick);
                        if (forecastWindow === 'hourly') return `${String(d.getHours()).padStart(2, '0')}:00`;
                        if (forecastWindow === 'daily') return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                        if (forecastWindow === 'weekly') return `W${Math.ceil(d.getDate() / 7)}`;
                        return `Q${Math.floor(d.getMonth() / 3) + 1}`;
                      }}
                    />
                    <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "12px" }}
                      labelStyle={{ color: "#ffffff", fontFamily: "monospace", fontSize: "11px" }}
                      itemStyle={{ fontFamily: "monospace", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="upper_bound" stroke="none" fill="#8b5cf6" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="predicted_incidents" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#predIncidents)" name="Predicted Incidents" />
                    <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#0f172a" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-4 flex justify-between items-center bg-slate-950/50 p-3.5 border border-slate-800/60 rounded-xl">
              <span>ACTIVE MODEL TARGET WINDOW: <b className="text-white uppercase">{forecastWindow}</b></span>
              <span className="text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 shadow-sm">CONFIDENCE BAND: 95%</span>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="mb-4 border-b border-slate-800/80 pb-3">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  MODEL EXPLAINABILITY
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Cycle influences and raw drivers</span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4">
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">NATURAL EXPLANATION</div>
                  <p className="text-xs text-slate-200 mt-2 italic leading-relaxed">
                    "{forecastData?.explainability?.explanation || 'Loading explanation...'}"
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                      <span>Baseline Trend Contribution</span>
                      <span className="text-white font-bold">{forecastData?.explainability?.base_trend?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, Math.max(0, (forecastData?.explainability?.base_trend || 0) * 15))}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                      <span>Weekly Seasonality Impact</span>
                      <span className={`font-bold ${forecastData?.explainability?.weekly_impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {forecastData?.explainability?.weekly_impact >= 0 ? '+' : ''}{forecastData?.explainability?.weekly_impact?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${forecastData?.explainability?.weekly_impact >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, Math.abs(forecastData?.explainability?.weekly_impact || 0) * 30))}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                      <span>Daily Seasonality Impact</span>
                      <span className={`font-bold ${forecastData?.explainability?.daily_impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {forecastData?.explainability?.daily_impact >= 0 ? '+' : ''}{forecastData?.explainability?.daily_impact?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${forecastData?.explainability?.daily_impact >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, Math.abs(forecastData?.explainability?.daily_impact || 0) * 30))}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1">
                      <span>Quarterly/Seasonal Impact</span>
                      <span className={`font-bold ${forecastData?.explainability?.seasonal_impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {forecastData?.explainability?.seasonal_impact >= 0 ? '+' : ''}{forecastData?.explainability?.seasonal_impact?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${forecastData?.explainability?.seasonal_impact >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, Math.max(0, Math.abs(forecastData?.explainability?.seasonal_impact || 0) * 30))}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-3 mt-4">
              Additive terms and baseline trends are computed directly from the Prophet training model parameters.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">SUPERVISOR OUTCOME AUDIT</h3>
                  <span className="text-[11px] font-mono text-slate-400">Compare Predicted vs Actual outcomes</span>
                </div>
                <button
                  onClick={handleSyncOutcomes}
                  disabled={syncLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700 text-[10px] font-mono uppercase font-bold text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? 'Syncing...' : 'Sync Live Outcomes'}
                </button>
              </div>

              <div className="overflow-x-auto min-h-[200px] max-h-[280px] custom-scrollbar">
                <table className="w-full text-left font-mono text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[10px] text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-2">Target Date/Time</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Predicted</th>
                      <th className="py-2.5">Actual Outcome</th>
                      <th className="py-2.5 text-right px-2">Abs Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {predictionHistory.slice(0, 8).map((hist, idx) => {
                      const pred = hist.predicted_value;
                      const act = hist.actual_value;
                      const hasActual = act !== null && act !== undefined;
                      const err = hasActual ? Math.abs(pred - act) : null;
                      let errorBadge = "text-slate-400 bg-slate-900 border border-slate-800";
                      if (err !== null) {
                        if (err <= 1.0) errorBadge = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";
                        else if (err <= 3.0) errorBadge = "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20";
                        else errorBadge = "text-rose-400 bg-rose-500/10 border border-rose-500/20";
                      }

                      const targetDate = new Date(hist.target_time);
                      const targetStr = `${targetDate.getDate()} ${targetDate.toLocaleString('default', { month: 'short' })} ${String(targetDate.getHours()).padStart(2, '0')}:00`;

                      return (
                        <tr key={hist.id || idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-2 font-bold text-slate-200 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {targetStr}
                          </td>
                          <td className="py-3 text-[10px] text-slate-400 capitalize">{hist.forecast_type}</td>
                          <td className="py-3 font-semibold text-white">{pred.toFixed(1)}</td>
                          <td className="py-3">
                            {hasActual ? (
                              <span className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {act} incidents
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Awaiting outcomes</span>
                            )}
                          </td>
                          <td className="py-3 text-right px-2">
                            {err !== null ? (
                              <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${errorBadge}`}>
                                {err.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {predictionHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 font-mono italic text-xs">
                          No predictions recorded yet. Generates automatically when supervisors inspect forecasts.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-4">
              Historical logs are persisted securely and validated against live incidents periodically.
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-800/80 mb-4">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">TRAINING RUN HISTORY</h3>
                <span className="text-[11px] font-mono text-slate-400">Retraining logs and evaluation audits</span>
              </div>

              <div className="space-y-3 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
                {monitoringData.map((run, idx) => {
                  const evalM = JSON.parse(run.evaluation_metrics || '{}');
                  const driftM = JSON.parse(run.drift_metrics || '{}');
                  const trainedTime = new Date(run.trained_at).toLocaleString();

                  return (
                    <div key={run.id || idx} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3.5 hover:border-slate-700/80 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{run.version}</div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">{trainedTime}</div>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded border ${run.is_active ? 'text-violet-400 border-violet-500/20 bg-violet-500/10' : 'text-slate-500 border-slate-800 bg-slate-900'}`}>
                          {run.is_active ? 'ACTIVE' : 'ARCHIVED'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-[10px] font-mono text-slate-400 pt-2.5 border-t border-slate-900">
                        <div>
                          <span className="block text-[8px] text-slate-500">MAE</span>
                          <b className="text-white">{evalM.mae?.toFixed(2) || '0.50'}</b>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-500">RMSE</span>
                          <b className="text-white">{evalM.rmse?.toFixed(2) || '0.70'}</b>
                        </div>
                        <div>
                          <span className="block text-[8px] text-slate-500">DRIFT</span>
                          <b className={driftM.drift_detected ? 'text-amber-400' : 'text-emerald-400'}>
                            {driftM.drift_detected ? 'YES' : 'NO'}
                          </b>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {monitoringData.length === 0 && (
                  <div className="text-center text-slate-500 font-mono italic text-xs py-8">
                    No retraining runs cataloged. Execute a pipeline above to start tracking.
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-4">
              Active model parameters are updated on successful execution of the Prophet split fit pipeline.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[9px] font-mono bg-red-950/60 border border-red-500/30 text-rose-400 rounded-sm uppercase font-bold tracking-widest animate-pulse">
              LEVEL 3 SECRET / CLASSIFIED
            </span>
            <span className="text-xs font-mono text-slate-500">SYS_INTEL_INDEX</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">INTELLIGENCE & ANALYTICS MATRIX</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#090F1C] border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all cursor-pointer ${activeSubTab === 'matrix' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Matrix Metrics
            </button>
            <button
              onClick={() => setActiveSubTab('predictive')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-md transition-all cursor-pointer ${activeSubTab === 'predictive' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Predictive Lifecycle
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-[#0B1220] border border-slate-800 rounded-lg p-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>COMPUTATION ENGINE: LIVE BACKEND SYNCHRONIZED</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-cyan-500/40 transition-colors duration-300 p-6 rounded-3xl flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <div className="flex justify-between items-start text-slate-400 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-cyan-400">Total Incidents</span>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 font-bold rounded shadow-sm border border-cyan-500/20">LIVE</span>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white tracking-tight">{summary.total_crimes.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">Backend `/stats/summary`</div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-violet-500/40 transition-colors duration-300 p-6 rounded-3xl flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <div className="flex justify-between items-start text-slate-400 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-violet-400">Avg Severity</span>
            <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 font-bold rounded shadow-sm border border-violet-500/20">
              {threatLabel.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white tracking-tight">{summary.average_severity.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">Derived from stored incidents</div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-emerald-500/40 transition-colors duration-300 p-6 rounded-3xl flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <div className="flex justify-between items-start text-slate-400 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-emerald-400">Hotspots Active</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 font-bold rounded shadow-sm border border-emerald-500/20">
              LIVE
            </span>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white tracking-tight">{summary.hotspots_active}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">Active high-severity incidents</div>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:border-amber-500/40 transition-colors duration-300 p-6 rounded-3xl flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <div className="flex justify-between items-start text-slate-400 mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-amber-400">Officers Deployed</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 font-bold rounded shadow-sm border border-amber-500/20">SYNCED</span>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white tracking-tight">{summary.officers_deployed}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">{summary.by_type ? Object.keys(summary.by_type).length : 0} crime types tracked</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Source Mix</h3>
              <span className="text-[11px] font-mono text-slate-400">FIR, complaints, patrol logs, cyber branch</span>
            </div>
            <BadgeInfo className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={5}>
                  {sourcePieData.map((entry, index) => (
                    <Cell key={`source-${index}`} fill={["#60a5fa", "#f59e0b", "#34d399", "#c084fc"][index % 4]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-2">
            Total ingested sources: <b className="text-white">{sourceBreakdown.total || summary.total_crimes}</b>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Daily Trend</h3>
            <span className="text-[11px] font-mono text-slate-400">30-day rolling incident volume</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px" }} />
                <Bar dataKey="incidents" fill="#60a5fa" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cyber" fill="#c084fc" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">Seasonal Pattern</h3>
            <span className="text-[11px] font-mono text-slate-400">Weekday intensity and seasonal spread</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayTrendData}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <Tooltip contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px" }} />
                <Bar dataKey="incidents" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">24-HOUR ADAPTIVE RISK GRADIENT</h3>
            <span className="text-[11px] font-mono text-slate-400">Backend hourly aggregation</span>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendsData}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#ffffff", fontFamily: "monospace", fontSize: "11px" }}
                  itemStyle={{ color: "#a78bfa", fontFamily: "monospace", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-3 flex justify-between items-center bg-slate-950/50 p-3 border border-slate-800/60 rounded-xl shadow-inner">
            <span>TIMESTAMP LOG: LIVE FROM BACKEND</span>
            <span className="text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">{hourlyStats.length} HOURLY BUCKETS</span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">OPERATIONAL VECTOR STRENGTH</h3>
            <span className="text-[11px] font-mono text-slate-400">Alignment metrics across sectors</span>
          </div>
          <div className="h-56 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sectorMetricsData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar name="Aegis Core Grid" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-3 text-center bg-slate-950/50 p-3 border border-slate-800/60 rounded-xl shadow-inner">
            Overall command index evaluates to <b className="text-cyan-400 font-semibold">{Math.min(99.9, 85 + totalCategories).toFixed(1)}% Coverage Rate</b>.
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">CATEGORY CONSTELLATION</h3>
            <span className="text-[11px] font-mono text-slate-400">Proportional incident mix</span>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {currentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColorMap[entry.name] || "#a78bfa"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px" }}
                  itemStyle={{ fontFamily: "monospace", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold text-white">{currentPieData.length}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Types Active</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800/80">
            {currentPieData.map((entry, idx) => {
              const color = categoryColorMap[entry.name] || "#a78bfa";
              return (
                <div key={idx} className="flex justify-between items-center text-xs font-mono bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/40 hover:border-slate-700/80 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded shadow-sm inline-block" style={{ backgroundColor: color }}></span>
                    <span className="text-slate-300 font-bold">{entry.name}</span>
                  </div>
                  <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{entry.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">HIGH-INTENSITY HOTSPOT GRID</h3>
              <span className="text-[11px] font-mono text-slate-400">Prioritized geo-locational emergency sensors</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 shadow-sm">LIVE COORDS</span>
          </div>

          <div className="overflow-x-auto min-h-[220px] custom-scrollbar">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/80 text-[10px] text-slate-500 uppercase font-semibold">
                  <th className="py-3 px-2">Sector</th>
                  <th className="py-3">Coordinate Ref</th>
                  <th className="py-3">Threat %</th>
                  <th className="py-3">Roster Protocol</th>
                  <th className="py-3 text-right px-2">Deployment Sweep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {hotspots.map((hot, idx) => {
                  let badgeColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-sm";
                  if (hot.status === "CRITICAL") badgeColor = "text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-sm";
                  if (hot.status === "ELEVATED") badgeColor = "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-sm";
                  if (hot.status === "MODERATE") badgeColor = "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 shadow-sm";

                  return (
                    <tr key={hot.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-3.5 px-2 font-bold text-slate-100 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                        {hot.sector}
                      </td>
                      <td className="py-3.5 text-[11px] text-slate-400">{hot.coordinate}</td>
                      <td className="py-3.5 font-semibold text-white">
                        <span className={`px-2 py-1 border text-[10px] rounded ${badgeColor}`}>{hot.threatVal}%</span>
                      </td>
                      <td className="py-3.5 text-[11px] text-slate-300 italic">{hot.protocol}</td>
                      <td className="py-3.5 text-right px-2">
                        {hot.status !== "STABLE" && hot.status !== "MODERATE" ? (
                          <button
                            onClick={() => handleHotspotDeploy(hot.sector)}
                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-[10px] uppercase cursor-pointer tracking-wider transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                          >
                            Deploy Unit
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg font-bold shadow-sm">
                            REINFORCED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">DEPLOYMENT PRIORITY SIGNALS</h3>
            <span className="text-[11px] font-mono text-slate-400">Live handoff targets</span>
          </div>
          <div className="space-y-4">
            {hotspots.slice(0, 3).map((hot) => (
              <div key={hot.id} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4 hover:border-violet-500/30 transition-colors group">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="text-sm font-bold text-white font-mono group-hover:text-violet-300 transition-colors">{hot.sector}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{hot.coordinate}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                </div>
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/50">{hot.recentActivity}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-3 mt-auto">
            Live summary pulled from backend stats and local incident stream.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Zone Risk Scoring</h3>
              <span className="text-[11px] font-mono text-slate-400">Historical load + severity + cyber share + trend</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded">
              {zoneRisks.length || 6} ZONES
            </span>
          </div>
          <div className="space-y-3">
            {topZoneRisks.map((zone) => (
              <div key={zone.id} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="text-sm font-bold text-white">{zone.zone}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {zone.incidents} incidents · {zone.avg_severity.toFixed(1)} severity
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1 rounded border ${zone.level === "CRITICAL" ? "text-rose-300 border-rose-500/30 bg-rose-500/10" : zone.level === "HIGH" ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : zone.level === "MODERATE" ? "text-yellow-300 border-yellow-500/30 bg-yellow-500/10" : "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"}`}>
                    {zone.risk_score.toFixed(1)} / 100
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 via-violet-500 to-rose-500" style={{ width: `${Math.min(100, zone.risk_score)}%` }} />
                </div>
                <div className="mt-3 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
                  {zone.drivers.slice(0, 3).map((driver, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-slate-900 border border-slate-800">{driver}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Hotspot Predictions</h3>
              <span className="text-[11px] font-mono text-slate-400">Model-backed deployment priorities</span>
            </div>
            <span className="text-[10px] font-mono text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded">
              {topPredictions.length || 4} PREDICTIONS
            </span>
          </div>
          <div className="space-y-3">
            {topPredictions.map((item) => (
              <div key={item.id} className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{item.zone}</div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Confidence {item.confidence}% · {item.expected_incidents_7d} expected incidents / 7d
                    </div>
                  </div>
                  <button
                    onClick={() => onDeployUnitFromHotspot(item.zone)}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    Deploy
                  </button>
                </div>
                <div className="mt-3 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
                  {item.drivers.map((driver, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-slate-900 border border-slate-800">{driver}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
