/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CyberIntelligence Dashboard — Phase 5
 * Features:
 *  1. Rich cybercrime category breakdown (phishing, credential theft, impersonation, fraud campaigns, ransomware, dark web)
 *  2. Cyber-physical crime correlation map and table
 *  3. Cyber threat zone alerts with severity grading
 *  4. Digital fraud cluster detection with geo-mapping
 *  5. Origin/affected region drill-down
 *  6. 14-day incident trend chart
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Shield, AlertTriangle, Activity, RefreshCw, Globe, TrendingUp,
  Database, Zap, Link, MapPin, Search, Eye, ChevronRight, Wifi,
  Lock, CreditCard, Users, Server, Skull, Target, BarChart2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  fetchCyberOverview,
  fetchCyberAlerts,
  fetchCyberClusters,
  fetchCyberCorrelations,
} from "../api/apiClient";

const getL = () => (window as any).L;

type CyberTab = "OVERVIEW" | "INCIDENTS" | "CLUSTERS" | "CORRELATIONS" | "ALERTS" | "MAP";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  WARNING: "#f59e0b",
  INFO: "#3b82f6",
};
const THREAT_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MODERATE: "#f59e0b",
  LOW: "#22c55e",
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#ef4444",
  CONTAINED: "#f59e0b",
  DISMANTLED: "#22c55e",
};
const CATEGORY_ICONS: Record<string, any> = {
  phishing: Globe,
  credential_theft: Lock,
  impersonation: Users,
  fraud_campaign: CreditCard,
  ransomware: Skull,
  cyber_harassment: AlertTriangle,
  data_breach: Database,
  dark_web: Eye,
};

function formatCrore(inr: number): string {
  if (inr >= 10000000) return `₹${(inr / 10000000).toFixed(2)}Cr`;
  if (inr >= 100000) return `₹${(inr / 100000).toFixed(1)}L`;
  if (inr >= 1000) return `₹${(inr / 1000).toFixed(0)}K`;
  return `₹${inr}`;
}

export default function CyberIntelligence() {
  const [overview, setOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CyberTab>("OVERVIEW");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Leaflet map refs
  const mapRef = React.useRef<any>(null);
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const layersRef = React.useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, al, cl, co] = await Promise.all([
        fetchCyberOverview(),
        fetchCyberAlerts(),
        fetchCyberClusters(),
        fetchCyberCorrelations(),
      ]);
      setOverview(ov);
      setAlerts(al);
      setClusters(cl);
      setCorrelations(co);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Leaflet map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "MAP") return;
    let tries = 0;
    const init = () => {
      const L = getL();
      if (!L) { if (tries++ < 40) setTimeout(init, 150); return; }
      if (!mapContainerRef.current || mapRef.current) return;
      const map = L.map(mapContainerRef.current, { center: [23.0225, 72.5714], zoom: 11 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap', maxZoom: 19
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 300);
    };
    init();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; setMapReady(false); } };
  }, [activeTab]);

  // ── Draw cyber zones and clusters on map ─────────────────────────────────
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady || !overview) return;

    layersRef.current.forEach(l => { try { l.remove(); } catch {} });
    layersRef.current = [];

    // Draw zones
    (overview.zones || []).forEach((zone: any) => {
      const incInZone = (overview.incidents || []).filter((i: any) => i.zone === zone.id);
      const totalLoss = incInZone.reduce((s: number, i: any) => s + (i.financialLoss || 0), 0);
      const alert = alerts.find(a => a.zone === zone.id);
      const color = alert ? SEVERITY_COLORS[alert.severity] || '#6b7280' : '#6366f1';

      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        fillColor: color,
        fillOpacity: 0.12,
        color,
        weight: 2,
        opacity: 0.7,
        dashArray: alert?.severity === 'CRITICAL' ? undefined : '8 4',
      }).addTo(mapRef.current).bindPopup(`
        <div style="font-family:monospace;font-size:11px;min-width:220px">
          <div style="font-weight:bold;color:${color};margin-bottom:6px">${zone.name}</div>
          <div>Incidents: <b>${incInZone.length}</b></div>
          <div>Total Loss: <b>${formatCrore(totalLoss)}</b></div>
          <div>Threat: <b>${zone.primaryThreat}</b></div>
          ${alert ? `<div style="margin-top:6px;padding:4px 6px;background:#1a1a2e;border-radius:4px;color:${color};font-size:10px">${alert.severity}: ${alert.message.slice(0, 80)}...</div>` : ''}
        </div>
      `);
      layersRef.current.push(circle);

      // Zone label
      const label = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#0f172a;color:${color};border:1px solid ${color};border-radius:4px;padding:2px 6px;font-size:8px;font-family:monospace;font-weight:bold;white-space:nowrap;pointer-events:none">${alert?.severity || '●'} ${zone.name.split('/')[0].trim().toUpperCase()}</div>`,
          iconAnchor: [0, 0],
        }), interactive: false
      }).addTo(mapRef.current);
      layersRef.current.push(label);
    });

    // Draw incident markers
    (overview.incidents || []).forEach((inc: any) => {
      const color = inc.category_color || '#6366f1';
      const m = L.circleMarker([inc.lat, inc.lng], {
        radius: 6 + (inc.severity || 5),
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85,
      }).addTo(mapRef.current).bindTooltip(`
        <div style="font-family:monospace;font-size:10px">
          <b>${inc.category_icon || '🔐'} ${inc.id}</b><br>
          ${inc.category_label}<br>
          ${inc.subcategory}<br>
          Loss: ${formatCrore(inc.financialLoss || 0)}<br>
          Victims: ${inc.victims}
        </div>
      `);
      layersRef.current.push(m);
    });

  }, [mapReady, overview, alerts]);

  // ── Filtered incidents ────────────────────────────────────────────────────
  const filteredIncidents = (overview?.incidents || []).filter((inc: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return inc.id.toLowerCase().includes(q) ||
      (inc.category_label || '').toLowerCase().includes(q) ||
      (inc.subcategory || '').toLowerCase().includes(q) ||
      (inc.platform || '').toLowerCase().includes(q);
  });

  const TABS: { key: CyberTab; label: string; icon: any; badge?: number }[] = [
    { key: "OVERVIEW", label: "Overview", icon: Activity },
    { key: "INCIDENTS", label: "Incidents", icon: AlertTriangle, badge: overview?.incidents?.length },
    { key: "CLUSTERS", label: "Clusters", icon: Target, badge: clusters.length },
    { key: "CORRELATIONS", label: "Correlations", icon: Link, badge: correlations.filter((c: any) => c.correlationScore > 30).length },
    { key: "ALERTS", label: "Alerts", icon: Zap, badge: alerts.filter(a => a.isActive).length },
    { key: "MAP", label: "Threat Map", icon: MapPin },
  ];

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
          <span className="text-sm font-mono text-slate-400">Loading Cyber Intelligence…</span>
        </div>
      </div>
    );
  }

  const sum = overview?.summary || {};

  return (
    <div className="space-y-6 font-sans text-slate-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[9px] font-mono bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 rounded-sm uppercase font-bold tracking-widest animate-pulse">
              CYBER INTELLIGENCE NODE
            </span>
            <span className="text-xs font-mono text-slate-500">I4C · CERT-IN · STATE_CYBER_CELL_v4</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">CYBERCRIME INTELLIGENCE LAYER</h2>
          <p className="text-xs font-mono text-slate-500 mt-1">Phishing · Credential Theft · Impersonation · Fraud Campaigns · Correlations · Clusters</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 text-cyan-400 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          REFRESH INTEL
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Incidents", value: sum.total_incidents || 0, color: "text-white", icon: AlertTriangle, bg: "border-slate-700" },
          { label: "Financial Loss", value: formatCrore(sum.total_loss_inr || 0), color: "text-red-400", icon: CreditCard, bg: "border-red-500/20" },
          { label: "Total Victims", value: (sum.total_victims || 0).toLocaleString(), color: "text-orange-400", icon: Users, bg: "border-orange-500/20" },
          { label: "Active Alerts", value: sum.active_alerts || 0, color: "text-amber-400", icon: Zap, bg: "border-amber-500/20" },
          { label: "Fraud Clusters", value: sum.clusters_detected || 0, color: "text-purple-400", icon: Target, bg: "border-purple-500/20" },
          { label: "Cyber-Physical", value: sum.cyber_physical_correlations || 0, color: "text-cyan-400", icon: Link, bg: "border-cyan-500/20" },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className={`bg-slate-900/40 backdrop-blur-xl border ${card.bg} p-4 rounded-2xl flex flex-col gap-2`}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] tracking-widest uppercase font-bold text-slate-500">{card.label}</span>
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <div className={`text-xl font-extrabold ${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[#090F1C] border border-slate-800 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === tab.key ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-[8px] font-bold rounded-full ${activeTab === tab.key ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-slate-400'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Category Breakdown */}
          <div className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" /> Cybercrime Category Breakdown
            </h3>
            <div className="space-y-3">
              {(overview?.byCategory || []).sort((a: any, b: any) => b.count - a.count).map((cat: any) => {
                const Icon = CATEGORY_ICONS[cat.id] || Shield;
                const maxCount = Math.max(...(overview?.byCategory || []).map((c: any) => c.count), 1);
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}44` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono text-slate-300 truncate">{cat.label}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[9px] font-mono text-slate-500">{formatCrore(cat.totalLoss)}</span>
                          <span className="text-[10px] font-bold text-white">{cat.count}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(cat.count / maxCount) * 100}%`, background: cat.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl flex flex-col">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Loss Distribution</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={(overview?.byCategory || []).filter((c: any) => c.totalLoss > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="totalLoss"
                    nameKey="label"
                    stroke="none"
                  >
                    {(overview?.byCategory || []).map((cat: any, i: number) => (
                      <Cell key={i} fill={cat.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "12px", fontSize: "10px", fontFamily: "monospace" }}
                    formatter={(v: any) => [formatCrore(v), "Loss"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-[10px] font-mono text-slate-500">
              Total: <span className="text-red-400 font-bold">{formatCrore(sum.total_loss_inr || 0)}</span>
            </div>
          </div>

          {/* 14-Day Trend */}
          <div className="lg:col-span-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> 14-Day Incident Trend
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={overview?.trend || []}>
                <defs>
                  <linearGradient id="cyberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={9} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={9} fontFamily="monospace" />
                <Tooltip contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px", fontFamily: "monospace", fontSize: "10px" }} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#cyberGrad)" name="Incidents" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Active Threat Alerts strip */}
          <div className="lg:col-span-12 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" /> Active Cyber Threat Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.filter(a => a.isActive).slice(0, 6).map((alert: any) => {
                const color = SEVERITY_COLORS[alert.severity] || '#6b7280';
                return (
                  <div key={alert.alertId} className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: `${color}30`, background: `${color}08` }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>
                          {alert.severity}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 truncate">{alert.zoneName.split('/')[0].trim()}</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-300 leading-tight line-clamp-2">{alert.message}</p>
                      <div className="text-[9px] font-mono text-slate-500 mt-1">
                        💸 {formatCrore(alert.financialImpact)} · 👥 {alert.affectedCount} victims
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── INCIDENTS TAB ── */}
      {activeTab === "INCIDENTS" && (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">All Cyber Incidents — Ahmedabad</h3>
            <div className="flex items-center gap-2 bg-[#050B14] border border-slate-700 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ID, category, platform..."
                className="bg-transparent text-xs font-mono text-white outline-none w-48 placeholder-slate-600"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase">
                  <th className="py-3 px-2">Case ID</th>
                  <th className="py-3">Category</th>
                  <th className="py-3">Subcategory</th>
                  <th className="py-3">Platform</th>
                  <th className="py-3 text-right">Loss</th>
                  <th className="py-3 text-right">Victims</th>
                  <th className="py-3 text-center">Severity</th>
                  <th className="py-3">Status</th>
                  <th className="py-3 text-center">Phys Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredIncidents.map((inc: any) => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`hover:bg-slate-800/30 cursor-pointer transition-colors ${selectedIncident?.id === inc.id ? 'bg-slate-800/40' : ''}`}
                  >
                    <td className="py-3 px-2 font-bold text-white">{inc.id}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm">{inc.category_icon}</span>
                        <span style={{ color: inc.category_color }} className="font-bold text-[10px]">{inc.category}</span>
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 text-[10px]">{inc.subcategory}</td>
                    <td className="py-3 text-slate-400 text-[10px]">{inc.platform}</td>
                    <td className="py-3 text-right text-red-400 font-bold">{formatCrore(inc.financialLoss || 0)}</td>
                    <td className="py-3 text-right text-orange-400">{inc.victims?.toLocaleString()}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${inc.severity >= 9 ? 'bg-red-900/30 text-red-400' : inc.severity >= 7 ? 'bg-orange-900/30 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                        {inc.severity}/10
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[9px] font-mono ${inc.status === 'FIR Filed' ? 'text-green-400' : inc.status === 'Under Investigation' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {inc.physicalLinked ? (
                        <span className="text-[9px] font-mono text-cyan-400 flex items-center justify-center gap-1">
                          <Link className="w-3 h-3" /> {inc.physicalLinked}
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Selected incident detail */}
          {selectedIncident && (
            <div className="mt-4 p-4 bg-[#050B14] border border-cyan-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">{selectedIncident.category_icon}</span>
                  {selectedIncident.id} — {selectedIncident.category_label}
                </h4>
                <button onClick={() => setSelectedIncident(null)} className="text-slate-500 hover:text-white cursor-pointer">✕</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                {[
                  { label: "Subcategory", value: selectedIncident.subcategory },
                  { label: "Platform", value: selectedIncident.platform },
                  { label: "Financial Loss", value: formatCrore(selectedIncident.financialLoss || 0) },
                  { label: "Victims Affected", value: selectedIncident.victims?.toLocaleString() },
                  { label: "Severity", value: `${selectedIncident.severity}/10` },
                  { label: "Case Status", value: selectedIncident.status },
                  { label: "Location", value: `${selectedIncident.lat?.toFixed(4)}, ${selectedIncident.lng?.toFixed(4)}` },
                  { label: "Linked Physical", value: selectedIncident.physicalLinked || "None" },
                  { label: "Timestamp", value: new Date(selectedIncident.timestamp).toLocaleString() },
                  { label: "Zone", value: selectedIncident.zone },
                ].map((field, i) => (
                  <div key={i}>
                    <div className="text-[9px] text-slate-500 uppercase">{field.label}</div>
                    <div className="text-white font-bold mt-0.5">{field.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CLUSTERS TAB ── */}
      {activeTab === "CLUSTERS" && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> Digital Fraud Cluster Detection
              <span className="ml-auto text-[10px] font-mono text-slate-500">{clusters.length} clusters identified</span>
            </h3>
            <p className="text-[10px] font-mono text-slate-500 mb-4">
              Spatial and categorical clustering of cybercrime incidents revealing organised fraud operations
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clusters.map((cluster: any) => {
                const color = THREAT_COLORS[cluster.threatLevel] || '#6b7280';
                const statusColor = STATUS_COLORS[cluster.status] || '#6b7280';
                return (
                  <div
                    key={cluster.clusterId}
                    onClick={() => setSelectedCluster(selectedCluster?.clusterId === cluster.clusterId ? null : cluster)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCluster?.clusterId === cluster.clusterId ? 'border-purple-500/40 bg-purple-900/10' : 'border-slate-700 bg-[#050B14] hover:border-slate-600'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-white flex items-center gap-2">
                          <span className="px-1.5 py-0.5 text-[8px] rounded font-bold" style={{ background: `${color}22`, color }}>{cluster.threatLevel}</span>
                          {cluster.clusterId}
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5 leading-tight">{cluster.label}</div>
                      </div>
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: `${statusColor}22`, color: statusColor }}>
                        {cluster.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[9px] font-mono">
                      <div className="bg-slate-900 rounded-lg p-2">
                        <div className="text-slate-500">Incidents</div>
                        <div className="text-white font-bold">{cluster.incidentCount}</div>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-2">
                        <div className="text-slate-500">Total Loss</div>
                        <div className="text-red-400 font-bold">{formatCrore(cluster.totalLoss)}</div>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-2">
                        <div className="text-slate-500">Victims</div>
                        <div className="text-orange-400 font-bold">{cluster.totalVictims?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-slate-500">
                      <span>Modus: <span className="text-slate-300">{cluster.modus}</span></span>
                      <span>Avg Sev: <span className="text-white">{cluster.avgSeverity}</span></span>
                    </div>
                    {selectedCluster?.clusterId === cluster.clusterId && (
                      <div className="mt-3 pt-3 border-t border-slate-700 text-[9px] font-mono space-y-1">
                        <div><span className="text-slate-500">First Seen:</span> {new Date(cluster.firstSeen).toLocaleDateString()}</div>
                        <div><span className="text-slate-500">Last Active:</span> {new Date(cluster.lastSeen).toLocaleDateString()}</div>
                        <div><span className="text-slate-500">Location:</span> {cluster.centerLat?.toFixed(4)}, {cluster.centerLng?.toFixed(4)}</div>
                        <div><span className="text-slate-500">Cases:</span> {cluster.incidents?.join(', ')}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Loss by cluster chart */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-3xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">Cluster Financial Impact</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clusters.slice(0, 8).map(c => ({ name: c.clusterId, loss: c.totalLoss / 100000, victims: c.totalVictims }))}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontFamily="monospace" />
                <YAxis stroke="#64748b" fontSize={9} fontFamily="monospace" tickFormatter={v => `₹${v}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0b1329", borderColor: "#334155", borderRadius: "8px", fontFamily: "monospace", fontSize: "10px" }}
                  formatter={(v: any, name: string) => [name === 'loss' ? `₹${v.toFixed(1)}L` : v, name === 'loss' ? 'Loss (Lakhs)' : 'Victims']}
                />
                <Bar dataKey="loss" fill="#a855f7" radius={[4, 4, 0, 0]} name="loss" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── CORRELATIONS TAB ── */}
      {activeTab === "CORRELATIONS" && (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-2 flex items-center gap-2">
            <Link className="w-4 h-4 text-cyan-400" /> Cyber ↔ Physical Crime Correlations
          </h3>
          <p className="text-[10px] font-mono text-slate-500 mb-5">
            Geographic &amp; temporal analysis linking digital crimes to physical incidents within 1.5km radius and 30-day window
          </p>

          <div className="space-y-3">
            {correlations.filter((c: any) => c.correlationScore > 10).map((cor: any, i: number) => {
              const color = THREAT_COLORS[cor.physicalRiskLevel] || '#6b7280';
              const allLinks = [...(cor.directLinkedIncidents || []), ...(cor.geoCorrelatedIncidents || [])];
              return (
                <div key={i} className="flex items-start gap-4 p-4 bg-[#050B14] border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
                  {/* Score Gauge */}
                  <div className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center" style={{ background: `${color}15`, border: `2px solid ${color}44` }}>
                    <span className="text-lg font-extrabold" style={{ color }}>{cor.correlationScore}</span>
                    <span className="text-[7px] font-mono text-slate-500 uppercase">score</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono font-bold text-white">{cor.cyberIncidentId}</span>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                      <span className="text-[10px] font-mono" style={{ color }}>{cor.physicalRiskLevel} PHYSICAL RISK</span>
                      <span className="text-[9px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{cor.cyberCategory}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mb-2">
                      Zone: <span className="text-slate-300">{cor.cyberZone}</span> · Coords: {cor.lat?.toFixed(4)}, {cor.lng?.toFixed(4)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cor.directLinkedIncidents?.length > 0 && (
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-900/20 border border-cyan-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                          <Link className="w-2.5 h-2.5" /> Direct: {cor.directLinkedIncidents.join(', ')}
                        </span>
                      )}
                      {cor.geoCorrelatedIncidents?.map((inc: string) => (
                        <span key={inc} className="text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {inc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {correlations.filter((c: any) => c.correlationScore > 10).length === 0 && (
              <div className="text-center py-12 text-slate-500 font-mono text-sm">No significant correlations found with current data</div>
            )}
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {activeTab === "ALERTS" && (
        <div className="space-y-4">
          {alerts.map((alert: any) => {
            const color = SEVERITY_COLORS[alert.severity] || '#6b7280';
            return (
              <div key={alert.alertId} className="bg-slate-900/40 border rounded-2xl p-5 transition-all" style={{ borderColor: `${color}30` }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, border: `2px solid ${color}40` }}>
                      <AlertTriangle className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono" style={{ color }}>{alert.severity}</span>
                        <span className="text-[10px] font-mono text-slate-400">{alert.alertId}</span>
                        {alert.isActive && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">{alert.zoneName}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 shrink-0">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-300 mb-3 leading-relaxed">{alert.message}</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#050B14] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-slate-500">Threat Type</div>
                    <div className="text-xs font-bold text-white mt-0.5">{alert.threatType}</div>
                  </div>
                  <div className="bg-[#050B14] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-slate-500">Financial Impact</div>
                    <div className="text-xs font-bold text-red-400 mt-0.5">{formatCrore(alert.financialImpact)}</div>
                  </div>
                  <div className="bg-[#050B14] rounded-lg p-3">
                    <div className="text-[9px] font-mono text-slate-500">Affected</div>
                    <div className="text-xs font-bold text-orange-400 mt-0.5">{alert.affectedCount?.toLocaleString()} victims</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                  <div>
                    <div className="text-[9px] font-mono font-bold uppercase mb-1" style={{ color }}>Recommended Action</div>
                    <div className="text-[10px] font-mono text-slate-300">{alert.recommendation}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === "MAP" && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" /> Cybercrime Threat Zone Map — Ahmedabad
              </h3>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                Active cyber zones · Incident markers · Fraud clusters
              </p>
            </div>
            <div className="flex gap-2 text-[9px] font-mono">
              {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                <div key={sev} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-slate-500">{sev}</span>
                </div>
              ))}
            </div>
          </div>
          <div ref={mapContainerRef} style={{ height: "520px" }} className="w-full bg-slate-800" />
          {!mapReady && (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          )}
          <div className="p-3 border-t border-slate-800 grid grid-cols-3 md:grid-cols-6 gap-2">
            {(overview?.zones || []).map((zone: any) => {
              const alert = alerts.find(a => a.zone === zone.id);
              const color = alert ? SEVERITY_COLORS[alert.severity] || '#6366f1' : '#6366f1';
              return (
                <div key={zone.id} className="text-[9px] font-mono text-slate-500 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {zone.name.split('/')[0].trim().split(' ').slice(0, 2).join(' ')}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
