/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  BarChart3, ShieldAlert, Cpu, Heart, CheckCircle2, 
  MapPin, AlertTriangle, Play, HelpCircle, Shield, ChevronRight
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, PieChart, Pie, Cell 
} from "recharts";
import { Incident } from "../types";

interface IntelligenceAnalyticsProps {
  incidents: Incident[];
  onDeployUnitFromHotspot: (sectorName: string) => void;
}

// Recharts Dummy Structured Data for elegant visual styling
const riskTrendsData = [
  { time: "00:00", value: 45 },
  { time: "02:00", value: 38 },
  { time: "04:00", value: 72 },
  { time: "06:00", value: 55 },
  { time: "08:00", value: 89 },
  { time: "10:00", value: 65 },
  { time: "12:00", value: 42 },
  { time: "14:00", value: 80 },
  { time: "16:00", value: 94 },
  { time: "18:00", value: 62 },
  { time: "20:00", value: 50 },
  { time: "22:00", value: 78 }
];

const sectorMetricsData = [
  { subject: "Scan Coverage", A: 96, fullMark: 100 },
  { subject: "Response Latency", A: 82, fullMark: 100 },
  { subject: "Path Integrity", A: 90, fullMark: 100 },
  { subject: "Comms Strength", A: 68, fullMark: 100 },
  { subject: "Drone Density", A: 85, fullMark: 100 },
  { subject: "Shift Activity", A: 75, fullMark: 100 }
];

const categoryColorMap: Record<string, string> = {
  "Intrusion": "#f87171", // Light red
  "Comms Jamming": "#38bdf8", // Sky blue
  "Biometric Alarm": "#fbbf24", // Yellow amber
  "System Sabotage": "#c084fc", // Purple
  "Drill": "#14b8a6" // Teal
};

interface Hotspot {
  id: string;
  sector: string;
  coordinate: string;
  threatVal: number;
  status: "CRITICAL" | "ELEVATED" | "MODERATE" | "STABLE";
  protocol: string;
  recentActivity: string;
}

export default function IntelligenceAnalytics({
  incidents,
  onDeployUnitFromHotspot
}: IntelligenceAnalyticsProps) {
  
  // High Risk Hotspots mock data with responsive actions
  const [hotspots, setHotspots] = useState<Hotspot[]>([
    { id: "HS-1", sector: "Sector 7G", coordinate: "45.3E, 12.9N", threatVal: 94, status: "CRITICAL", protocol: "Alpha Lockdown", recentActivity: "Repeated Perimeter Fence B Alarm triggers" },
    { id: "HS-2", sector: "Sector 3B", coordinate: "22.1E, 78.4N", threatVal: 65, status: "ELEVATED", protocol: "Encrypted RF Backup", recentActivity: "Signal interference on Sigma-9 detected" },
    { id: "HS-3", sector: "Sector 9A", coordinate: "87.5E, 54.2N", threatVal: 32, status: "MODERATE", protocol: "Standby Drone Patrol", recentActivity: "Isolated Biometric badge scan mismatch" },
    { id: "HS-4", sector: "Sector 4C", coordinate: "60.2E, 25.1N", threatVal: 82, status: "CRITICAL", protocol: "Heavy Cyber Protocol", recentActivity: "Load testing generator failovers" },
    { id: "HS-5", sector: "Sector 1A", coordinate: "15.4E, 11.2N", threatVal: 15, status: "STABLE", protocol: "Route Scan Override", recentActivity: "Normal sentinel drone sweeps" }
  ]);

  const handleHotspotDeploy = (idx: number, sector: string) => {
    // Optimistically update threat level slightly and trigger deployment hook
    const updated = [...hotspots];
    updated[idx].status = "MODERATE";
    updated[idx].threatVal = Math.round(updated[idx].threatVal * 0.7);
    setHotspots(updated);
    
    // Dispatch dispatch callback upwards to central system state
    onDeployUnitFromHotspot(sector);
  };

  // Pie Chart Categorized Incident count data formatting
  const categoriesCount = incidents.reduce((acc, inc) => {
    acc[inc.category] = (acc[inc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoriesCount).map(([name, count]) => ({
    name,
    value: count
  }));

  // Simple default fallback pie data if incidents is empty
  const defaultPieData = [
    { name: "Intrusion", value: 4 },
    { name: "Comms Jamming", value: 3 },
    { name: "Biometric Alarm", value: 2 },
    { name: "System Sabotage", value: 1 }
  ];

  const currentPieData = pieData.length > 0 ? pieData : defaultPieData;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[9px] font-mono bg-red-950/60 border border-red-500/30 text-rose-400 rounded-sm uppercase font-bold tracking-widest animate-pulse">
              LEVEL 3 SECRET / CLASSIFIED
            </span>
            <span className="text-xs font-mono text-slate-500">SYS_INTEL_INDEX</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">INTELLIGENCE &amp; ANALYTICS MATRIX</h2>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded-lg p-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>COMPUTATION ENGINE: SHIELD-INTELLIGENCE v4.2</span>
        </div>
      </div>

      {/* Intelligence Cards (Top stats banner, 4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] tracking-wider uppercase font-mono">Total Shuttles logged</span>
            <span className="text-[10px] bg-slate-800 px-1 py-0.5 font-mono rounded">12H</span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold font-mono text-white">1,284</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">▲ +12% Sector Overlap</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] tracking-wider uppercase font-mono">Avg Alert Response</span>
            <span className="text-[10px] bg-slate-800 px-1 py-0.5 font-mono rounded font-semibold text-teal-400">OPTIMAL</span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold font-mono text-white">4.2m</div>
            <div className="text-[10px] text-teal-400 font-mono mt-0.5">▼ -18% response latency</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] tracking-wider uppercase font-mono">Tactical Efficiency</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1 py-0.5 font-mono rounded text-[8px] font-bold">94% TARGET</span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold font-mono text-white">94.1%</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">▲ +1.4% sensor capture</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] tracking-wider uppercase font-mono">Overall Threat Index</span>
            <span className="text-[10px] bg-slate-800 px-1 py-0.5 font-mono rounded">RISK</span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold font-mono text-slate-200">Moderate</div>
            <div className="text-[10px] text-amber-500 font-mono mt-0.5">⚠ Sector 7G remains alert</div>
          </div>
        </div>
      </div>

      {/* Bento Grid layout containing Charts & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Risk Trend Chart (Area Chart, spans 7 columns on large screen) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col gap-3 relative">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">24-HOUR ADAPTIVE RISK GRADIENT</h3>
            <span className="text-[11px] font-mono text-slate-400">ACTIVE SPATIOMODULATED SENSOR ALARMS OVER TIME</span>
          </div>

          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={riskTrendsData}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155" }}
                  labelStyle={{ color: "#ffffff", fontFamily: "monospace", fontSize: "11px" }}
                  itemStyle={{ color: "#14b8a6", fontFamily: "monospace", fontSize: "11px" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#14b8a6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#riskGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-1 flex justify-between items-center bg-slate-950 p-2 border border-slate-850 rounded">
            <span>TIMESTAMP LOG: GMT+0 2026</span>
            <span className="text-teal-400 font-bold">STRESS TESTING ACTIVE</span>
          </div>
        </div>

        {/* Sector Performance radar (Spans 5 Columns) */}
        <div id="radar-alignment" className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-5 rounded-xl flex flex-col justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">OPERATIONAL VECTOR STRENGTH</h3>
            <span className="text-[11px] font-mono text-slate-400">ALIGNMENT METRICS ACROSS SECTORS</span>
          </div>

          <div className="h-56 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={sectorMetricsData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} fontFamily="monospace" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar name="Aegis Core Grid" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] font-mono text-slate-400 mt-1 text-center bg-slate-950/60 p-2 border border-slate-800/60 rounded">
            Overall command index evaluates to <b className="text-sky-400 font-semibold">91.4% Coverage Rate</b>.
          </div>
        </div>

        {/* Breakdown of Crime / Alarm categories */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">CATEGORY CONSTELLATION</h3>
            <span className="text-[11px] font-mono text-slate-400">PROPORTIONAL SYSTEM INCIDENT MAPS</span>
          </div>

          {/* Simple Pie Chart styling */}
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
                >
                  {currentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColorMap[entry.name] || "#14b8a6"} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155" }}
                  itemStyle={{ fontFamily: "monospace", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-bold font-mono text-white">4</span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Types Active</span>
            </div>
          </div>

          {/* Color Index Legend progress bars */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
            {currentPieData.map((entry, idx) => {
              const count = entry.value;
              const color = categoryColorMap[entry.name] || "#14b8a6";
              return (
                <div key={idx} className="flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }}></span>
                    <span className="text-slate-300">{entry.name}</span>
                  </div>
                  <span className="text-slate-400 font-bold">{count} Logged</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* High risk hotspots list (Spans 8 Columns) */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">HIGH-INTENSITY HOTSPOT GRID</h3>
              <span className="text-[11px] font-mono text-slate-400">PRIORITIZED GEO-LOCATIONAL EMERGENCY SENSORS</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">LIVE COORDS</span>
          </div>

          {/* Hotspot Table */}
          <div className="overflow-x-auto min-h-[220px]">
            <table id="hotspots-table" className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-semibold">
                  <th className="py-2.5">Sector</th>
                  <th className="py-2.5">Coordinate Ref</th>
                  <th className="py-2.5">Threat %</th>
                  <th className="py-2.5">Roster Protocol</th>
                  <th className="py-2.5 text-right">Deployment Sweep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-805/40">
                {hotspots.map((hot, idx) => {
                  let badgeColor = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
                  if (hot.status === "CRITICAL") badgeColor = "text-red-400 border-red-500/20 bg-red-950/20";
                  if (hot.status === "ELEVATED") badgeColor = "text-amber-400 border-amber-500/20 bg-amber-950/20";
                  if (hot.status === "MODERATE") badgeColor = "text-yellow-400 border-yellow-500/20 bg-yellow-950/20";

                  return (
                    <tr key={hot.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 font-bold text-slate-100 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        {hot.sector}
                      </td>
                      <td className="py-3 text-[11px] text-slate-400">{hot.coordinate}</td>
                      <td className="py-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 border text-[10px] rounded ${badgeColor}`}>
                            {hot.threatVal}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-[11px] text-slate-300 italic">{hot.protocol}</td>
                      <td className="py-3 text-right">
                        {hot.status !== "STABLE" && hot.status !== "MODERATE" ? (
                          <button
                            onClick={() => handleHotspotDeploy(idx, hot.sector)}
                            className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded text-[10px] uppercase cursor-pointer tracking-wider transition-all"
                          >
                            Deploy Unit
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-950/10 px-2 py-0.5 rounded font-bold">
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

      </div>

    </div>
  );
}
