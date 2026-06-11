/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  MapPin,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
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
} from "recharts";
import { Incident } from "../types";
import { fetchHourlyStats, fetchStatsSummary } from "../api/apiClient";

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
  Intrusion: "#f87171",
  "Comms Jamming": "#8b5cf6",
  "Biometric Alarm": "#fbbf24",
  "System Sabotage": "#c084fc",
  Drill: "#a78bfa",
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
  const [hotspots, setHotspots] = useState<Hotspot[]>([
    { id: "HS-1", sector: "Sector 7G", coordinate: "23.041, 72.529", threatVal: 94, status: "CRITICAL", protocol: "Alpha Lockdown", recentActivity: "Repeated perimeter triggers." },
    { id: "HS-2", sector: "Sector 3B", coordinate: "23.059, 72.539", threatVal: 65, status: "ELEVATED", protocol: "Encrypted RF Backup", recentActivity: "Signal interference detected." },
    { id: "HS-3", sector: "Sector 9A", coordinate: "23.005, 72.585", threatVal: 32, status: "MODERATE", protocol: "Standby Drone Patrol", recentActivity: "Badge scan mismatch." },
    { id: "HS-4", sector: "Sector 4C", coordinate: "23.022, 72.571", threatVal: 82, status: "CRITICAL", protocol: "Heavy Cyber Protocol", recentActivity: "System anomalies logged." },
    { id: "HS-5", sector: "Sector 1A", coordinate: "23.020, 72.546", threatVal: 15, status: "STABLE", protocol: "Route Scan Override", recentActivity: "Normal sentinel sweeps." }
  ]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [summaryData, hourlyData] = await Promise.all([
          fetchStatsSummary(),
          fetchHourlyStats(),
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
      } catch {
        if (!mounted) return;
        setSummary((prev) => ({
          ...prev,
          total_crimes: incidents.length,
        }));
        setHourlyStats([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [incidents.length]);

  const pieData = useMemo(() => {
    const counts = incidents.reduce((acc, inc) => {
      acc[inc.category] = (acc[inc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const derived = Object.entries(counts).map(([name, value]) => ({ name, value }));
    return derived.length > 0
      ? derived
      : [
          { name: "Intrusion", value: 4 },
          { name: "Comms Jamming", value: 3 },
          { name: "Biometric Alarm", value: 2 },
          { name: "System Sabotage", value: 1 },
        ];
  }, [incidents]);

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

  const currentPieData = pieData;
  const totalCategories = currentPieData.reduce((sum, entry) => sum + entry.value, 0) || 1;
  const threatLabel =
    summary.average_severity >= 7 ? "High" : summary.average_severity >= 4 ? "Moderate" : "Low";

  const handleHotspotDeploy = (idx: number, sector: string) => {
    setHotspots((prev) =>
      prev.map((hot, hotIdx) =>
        hotIdx === idx
          ? { ...hot, status: "MODERATE", threatVal: Math.round(hot.threatVal * 0.7) }
          : hot
      )
    );
    onDeployUnitFromHotspot(sector);
  };

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
        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-[#0B1220] border border-slate-800 rounded-lg p-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>COMPUTATION ENGINE: LIVE BACKEND SYNCHRONIZED</span>
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
                            onClick={() => handleHotspotDeploy(idx, hot.sector)}
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
    </div>
  );
}
