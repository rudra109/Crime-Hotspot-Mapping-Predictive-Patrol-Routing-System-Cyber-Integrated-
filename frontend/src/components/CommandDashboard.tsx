/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, Radio, Activity, Navigation,
  MapPin, CheckCircle, RefreshCw, Send, Plus, X, AlertTriangle,
  Eye, Flame, Cpu, ChevronRight
} from "lucide-react";
import { Incident, Alert, PatrolUnit } from "../types";
import { crimeHotspots, compulsoryPatrolRoutes } from "../data";

// Leaflet is loaded via CDN script tag — access via window to avoid ES module strict-mode issues
const getL = () => (window as any).L;

interface CommandDashboardProps {
  incidents: Incident[];
  alerts: Alert[];
  units: PatrolUnit[];
  onDispatchUnit: (unitId: string, incidentId: string) => void;
  onAddIncident: (incident: Incident) => void;
  onAckAlert: (alertId: string) => void;
  onSimulateAlarm: () => void;
}

const CRIME_CATEGORIES = [
  "Assault", "Robbery", "Theft", "Snatching", "Vandalism",
  "Drug Trafficking", "Cybercrime", "Fraud", "Domestic Violence",
  "Traffic Violation", "Accident", "Kidnapping", "Arson",
  "Rioting", "Gang Activity", "Other"
];

export default function CommandDashboard({
  incidents,
  alerts,
  units,
  onDispatchUnit,
  onAddIncident,
  onAckAlert,
  onSimulateAlarm,
}: CommandDashboardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hotspotLayersRef = useRef<any[]>([]);
  const patrolLayersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [patrolCount] = useState(12);

  // Map layer toggles
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPatrolRoutes, setShowPatrolRoutes] = useState(true);

  // Add Incident Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    category: "Theft",
    location: "",
    lat: "",
    lng: "",
    description: "",
    reportedBy: "",
    priority: "false",
    threatIndex: "50",
  });
  const [addFormError, setAddFormError] = useState("");
  const [mapClickMode, setMapClickMode] = useState(false);

  const [aiResponse, setAiResponse] = useState<string>(
    "Ahmedabad Police operations assistant online. Enter a query or choose a quick directive below."
  );
  const [userQuery, setUserQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const activePresets = [
    { label: "Assess Vastrapur risk level", query: "Assess current sector risks and threat levels for Vastrapur." },
    { label: "Check SG Highway traffic", query: "Perform traffic diagnostics on SG Highway." },
    { label: "Request Deployment Strategy", query: "Draft deployment recommendation for active units in Memnagar." },
  ];

  // Initialize Leaflet map — poll until window.L CDN is available
  useEffect(() => {
    let attempts = 0;
    const tryInit = () => {
      const L = getL();
      if (!L) {
        if (attempts++ < 30) setTimeout(tryInit, 150);
        return;
      }
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [23.0225, 72.5714],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: 'map-tiles-dark-filter', // Assuming you might have a dark filter CSS class, otherwise standard tiles
        }
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);

      // Force size recalculation after DOM settles
      setTimeout(() => map.invalidateSize(), 200);
    };

    tryInit();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Map click mode for adding incident by clicking the map
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    const handleMapClick = (e: any) => {
      if (!mapClickMode) return;
      const { lat, lng } = e.latlng;
      setAddForm(prev => ({
        ...prev,
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      }));
      setMapClickMode(false);
      setShowAddModal(true);
    };

    mapRef.current.on("click", handleMapClick);
    return () => {
      if (mapRef.current) mapRef.current.off("click", handleMapClick);
    };
  }, [mapReady, mapClickMode]);

  // Toggle map cursor for click mode
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (container) {
      container.style.cursor = mapClickMode ? "crosshair" : "";
    }
  }, [mapClickMode]);

  // Draw / remove hotspot overlay circles
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    hotspotLayersRef.current.forEach(l => l.remove());
    hotspotLayersRef.current = [];

    if (!showHotspots) return;

    crimeHotspots.forEach(hs => {
      const isCritical = hs.severity === "CRITICAL";
      const radius = isCritical ? 600 : 450;
      const color = isCritical ? "#ef4444" : "#f59e0b";

      // Outer pulsing ring
      const outerCircle = L.circle([hs.lat, hs.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.08,
        color,
        weight: 2,
        opacity: 0.6,
        dashArray: "6 4",
      }).addTo(mapRef.current);

      // Inner filled hotspot
      const innerCircle = L.circle([hs.lat, hs.lng], {
        radius: radius * 0.45,
        fillColor: color,
        fillOpacity: 0.2,
        color,
        weight: 1.5,
        opacity: 0.8,
      }).addTo(mapRef.current);

      // Label
      const label = L.marker([hs.lat, hs.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            background:${isCritical ? "#7f1d1d" : "#78350f"};
            color:${color};
            border:1px solid ${color};
            border-radius:6px;
            padding:4px 8px;
            font-size:10px;
            font-family:ui-monospace, monospace;
            font-weight:700;
            white-space:nowrap;
            pointer-events:none;
            box-shadow:0 4px 12px rgba(0,0,0,.6);
            backdrop-filter: blur(4px);
          ">⚠ ${hs.name.toUpperCase()} (${hs.crimeCount})</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(mapRef.current);

      hotspotLayersRef.current.push(outerCircle, innerCircle, label);
    });
  }, [mapReady, showHotspots]);

  // Draw / remove compulsory patrol routes
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    patrolLayersRef.current.forEach(l => l.remove());
    patrolLayersRef.current = [];

    if (!showPatrolRoutes) return;

    compulsoryPatrolRoutes.forEach(route => {
      const latlngs = route.waypoints.map(wp => [wp.lat, wp.lng]);

      // Dashed route polyline
      const line = L.polyline(latlngs, {
        color: route.color,
        weight: 3,
        opacity: 0.8,
        dashArray: "10 8",
      }).addTo(mapRef.current);

      // Waypoint dots + markers
      route.waypoints.forEach((wp, idx) => {
        if (idx === 0 || idx === route.waypoints.length - 1) return; // skip HQ
        const dot = L.circleMarker([wp.lat, wp.lng], {
          radius: 5,
          fillColor: route.color,
          color: "#050B14",
          weight: 2,
          fillOpacity: 1,
        }).addTo(mapRef.current);
        dot.bindTooltip(`<span style="font-family:monospace;font-size:11px;font-weight:600;">${route.name}: ${wp.name}</span>`, { direction: "top", className: "custom-tooltip" });
        patrolLayersRef.current.push(dot);
      });

      patrolLayersRef.current.push(line);
    });
  }, [mapReady, showPatrolRoutes]);

  // Update markers whenever incidents change or map becomes ready
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents
      .filter((i) => i.status !== "Resolved")
      .forEach((incident) => {
        const [lat, lng] = incident.coordinates;

        // Choose color based on threat level
        const color =
          incident.threatIndex >= 80
            ? "#ef4444"
            : incident.threatIndex >= 50
              ? "#f59e0b"
              : "#00E5FF";

        // Larger pulsing marker for very high threat
        const radius = incident.threatIndex >= 90 ? 14 : incident.isHighPriority ? 11 : 8;

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          className: incident.threatIndex >= 90 ? 'pulse-marker' : ''
        }).addTo(mapRef.current);

        circleMarker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui; font-size: 13px; min-width: 200px; padding: 4px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size:14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${incident.category}</div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>📍</span> ${incident.location}</div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>⚠️</span> Threat: <b style="color:${color}">${incident.threatIndex}/100</b></div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>📋</span> ${incident.status}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 6px;">🕐 ${incident.timestamp}</div>
          </div>
        `);

        circleMarker.on("click", () => {
          setSelectedIncident(incident);
        });

        markersRef.current.push(circleMarker);
      });
  }, [incidents, mapReady]);

  const handleQuerySubmit = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAiLoading(true);
    setAiResponse("Query sent. Analysing databanks...");

    try {
      const response = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryText,
          context: { incidentsCount: incidents.length, incidentSample: incidents.slice(0, 3) },
        }),
      });
      const data = await response.json();
      setAiResponse(data.success ? data.response : "Failed to query AI Core.");
    } catch (err: any) {
      setAiResponse(`Connection timed out: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Handle Add Incident Form Submit ──
  const handleAddIncidentSubmit = () => {
    const lat = parseFloat(addForm.lat);
    const lng = parseFloat(addForm.lng);

    if (!addForm.location.trim()) { setAddFormError("Location name is required."); return; }
    if (isNaN(lat) || isNaN(lng)) { setAddFormError("Valid coordinates are required (Lat & Lng)."); return; }
    if (lat < 22.5 || lat > 23.5 || lng < 72.0 || lng > 73.5) {
      setAddFormError("Coordinates must be within Ahmedabad region (Lat 22.5–23.5, Lng 72.0–73.5)."); return;
    }
    if (!addForm.reportedBy.trim()) { setAddFormError("Reported By field is required."); return; }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} IST`;
    const threatVal = Math.min(100, Math.max(0, parseInt(addForm.threatIndex) || 50));

    const newIncident: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: addForm.category,
      location: `${addForm.location} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      coordinates: [lat, lng],
      status: "Assessing",
      description: addForm.description || `${addForm.category} incident reported manually.`,
      timestamp: timeStr,
      reportedBy: addForm.reportedBy,
      isHighPriority: addForm.priority === "true",
      attachmentsCount: 0,
      threatIndex: threatVal,
    };

    onAddIncident(newIncident);
    setShowAddModal(false);
    setAddFormError("");
    setAddForm({
      category: "Theft", location: "", lat: "", lng: "",
      description: "", reportedBy: "", priority: "false", threatIndex: "50",
    });
  };

  const activeIncidentCount = incidents.filter((i) => i.status !== "Resolved").length;
  const avgResponseTime = "4.2m";
  const overallRiskLevel =
    activeIncidentCount > 5 ? "CRITICAL" : activeIncidentCount > 3 ? "HIGH" : activeIncidentCount > 1 ? "MODERATE" : "NORMAL";

  const riskColor =
    overallRiskLevel === "CRITICAL" ? "text-[#FF4D4F]" :
      overallRiskLevel === "HIGH" ? "text-[#FFB020]" :
        overallRiskLevel === "MODERATE" ? "text-amber-400" : "text-[#00FFA3]";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8 animate-fade-in text-slate-200 font-sans selection:bg-cyan-500/30">

      {/* ── Add Incident Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050B14]/60 backdrop-blur-md animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-[#0B1220] border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg mx-4 overflow-hidden transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Register Incident</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">INCIDENT_ENTRY</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Category *</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                  >
                    {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Priority *</label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                  >
                    <option value="false">Routine Response</option>
                    <option value="true">High Priority / Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Location Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vastrapur Lake Road"
                  value={addForm.location}
                  onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Coordinates (Lat, Lng) *</label>
                  <button
                    onClick={() => { setShowAddModal(false); setMapClickMode(true); }}
                    className="text-xs text-[#00E5FF] hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium bg-[#00E5FF]/10 px-2.5 py-1 rounded-md border border-[#00E5FF]/20"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Pick on Map
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Lat (23.xxxx)"
                    value={addForm.lat}
                    onChange={e => setAddForm(p => ({ ...p, lat: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Lng (72.xxxx)"
                    value={addForm.lng}
                    onChange={e => setAddForm(p => ({ ...p, lng: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#050B14] p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Threat Index</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${parseInt(addForm.threatIndex) >= 80 ? 'bg-red-500/20 text-red-400' : parseInt(addForm.threatIndex) >= 50 ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {addForm.threatIndex} / 100
                  </span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={addForm.threatIndex}
                  onChange={e => setAddForm(p => ({ ...p, threatIndex: e.target.value }))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed intelligence here..."
                  value={addForm.description}
                  onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none resize-none transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Reported By *</label>
                <input
                  type="text"
                  placeholder="e.g. Officer Badge # / Name"
                  value={addForm.reportedBy}
                  onChange={e => setAddForm(p => ({ ...p, reportedBy: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                />
              </div>

              {addFormError && (
                <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" /> {addFormError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-800 bg-white/[0.02]">
              <button
                onClick={() => { setShowAddModal(false); setAddFormError(""); }}
                className="flex-1 py-2.5 bg-transparent hover:bg-slate-800 text-sm text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIncidentSubmit}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-cyan-400/30 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Submit Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map Click Mode Banner ── */}
      {mapClickMode && (
        <div className="lg:col-span-12 bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
          <div className="flex items-center gap-3 text-sm text-cyan-100 font-medium tracking-wide">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
            </span>
            <span>Target Acquisition Mode Active: Click anywhere on the tactical map to log coordinates.</span>
          </div>
          <button
            onClick={() => setMapClickMode(false)}
            className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:bg-slate-800 px-5 py-1.5 rounded-lg transition-colors font-medium"
          >
            Abort
          </button>
        </div>
      )}


      {/* ── Dynamic KPI Grid ── */}
      <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#00E5FF]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,229,255,0.15)] flex flex-col justify-between shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/10 blur-[50px] rounded-full group-hover:bg-[#00E5FF]/20 transition-all duration-700" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/20 text-[#00E5FF] group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#FF4D4F] bg-[#FF4D4F]/10 border border-[#FF4D4F]/20 px-3 py-1.5 rounded-full shadow-sm">
              ↑ 12% Spike
            </span>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">{activeIncidentCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Active Incidents</div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
              <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> High probability near SG Highway
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#00FFA3]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,255,163,0.15)] flex flex-col justify-between shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00FFA3]/10 blur-[50px] rounded-full group-hover:bg-[#00FFA3]/20 transition-all duration-700" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/20 text-[#00FFA3] group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Navigation className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-3 py-1.5 rounded-full shadow-sm">
              Optimal
            </span>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">{patrolCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Patrol Units</div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
              <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> All high-risk sectors covered
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00FFA3]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#FFB020]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(255,176,32,0.15)] flex flex-col justify-between shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFB020]/10 blur-[50px] rounded-full group-hover:bg-[#FFB020]/20 transition-all duration-700" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#FFB020]/10 flex items-center justify-center border border-[#FFB020]/20 text-[#FFB020] group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 mt-auto">
            <div className={`text-4xl font-extrabold mb-1 tracking-tight ${riskColor}`}>{overallRiskLevel}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Risk Matrix</div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
              <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> Escalation predicted in 2 hrs
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFB020]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-indigo-500/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] flex flex-col justify-between shadow-xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700 text-slate-300 group-hover:scale-110 transition-transform duration-300 shadow-inner">
              <Radio className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-3 py-1.5 rounded-full shadow-sm">
              ↓ 0.5m Fast
            </span>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">{avgResponseTime}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Response Time</div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
              <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> Routing efficiency at peak
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </div>

      {/* ── Command Map Section (70/30) ── */}
      <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* Map Container (70%) */}
        <div className="lg:col-span-7 bg-[#0B1220] border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative shadow-xl">
          <div className="absolute top-4 left-4 z-[400] bg-[#0B1220]/80 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 flex items-center gap-4 shadow-lg">
            <div className="flex items-center gap-2 pl-2">
              <span className="w-2 h-2 rounded-full bg-[#FF4D4F] shadow-[0_0_8px_#FF4D4F] animate-pulse" />
              <span className="text-[11px] font-bold text-white tracking-widest uppercase">Live Map</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-700" />
            <div className="flex gap-1 pr-1">
              <button onClick={() => setShowHotspots(!showHotspots)} className={`text-[10px] px-2.5 py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors ${showHotspots ? 'bg-[#FF4D4F]/20 text-[#FF4D4F]' : 'text-slate-400 hover:bg-slate-800'}`}>Hotspots</button>
              <button onClick={() => setShowPatrolRoutes(!showPatrolRoutes)} className={`text-[10px] px-2.5 py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors ${showPatrolRoutes ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'text-slate-400 hover:bg-slate-800'}`}>Routes</button>
            </div>
          </div>

          <div ref={mapContainerRef} className="h-[550px] w-full bg-[#050B14]" style={{ zIndex: 0 }} />

          {/* Map Controls Glass Bar */}
          <div className="absolute bottom-4 left-4 right-4 z-[400] bg-[#0B1220]/85 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 flex justify-between items-center shadow-xl">
            <div className="text-[11px] text-slate-300 font-mono tracking-wide flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00E5FF]" />
              {selectedIncident ? `Selected case: ${selectedIncident.id} // ${selectedIncident.category}` : "Awaiting case selection..."}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddModal(true)} className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_15px_rgba(0,229,255,0.2)] font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all border border-cyan-400/50">
                Log Incident
              </button>
              {selectedIncident && selectedIncident.status === "Assessing" && (
                <button onClick={() => {
                  const firstUnit = units.find((u: any) => u.status === "Patrol") || units[0];
                  if (firstUnit) {
                    onDispatchUnit(firstUnit.id, selectedIncident.id);
                    setSelectedIncident(prev => prev ? { ...prev, status: "Dispatched" } : null);
                  }
                }} className="px-5 py-2 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/40 text-[#00FFA3] font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,163,0.1)]">
                  Dispatch Unit
                </button>
              )}
              <button onClick={onSimulateAlarm} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all">
                Test Alert
              </button>
            </div>
          </div>
        </div>

        {/* Intelligence Sidebar (30%) */}
        <div className="lg:col-span-3 bg-[#0B1220] border border-slate-800 rounded-2xl flex flex-col shadow-xl h-[550px]">
          <div className="p-5 border-b border-slate-800/80 bg-[#0B1220]/30 rounded-t-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D4F] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF4D4F]"></span>
              </span>
              Incident Feed
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono text-center mt-12 flex flex-col items-center gap-2">
                <Activity className="w-6 h-6 opacity-20" />
                No active intercepts found.
              </div>
            ) : (
              alerts.slice().reverse().map((alert, i) => {
                const isCritical = alert.type === "Critical";
                return (
                  <div key={alert.id} className="relative pl-5 border-l-2 border-slate-800 hover:border-[#00E5FF]/40 transition-colors pb-5 last:pb-0 group">
                    <div className={`absolute -left-[5px] top-0.5 w-2 h-2 rounded-full transition-shadow duration-300 ${isCritical ? 'bg-[#FF4D4F] group-hover:shadow-[0_0_10px_#FF4D4F]' : 'bg-[#00E5FF] group-hover:shadow-[0_0_10px_#00E5FF]'}`} />
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isCritical ? 'bg-[#FF4D4F]/10 text-[#FF4D4F]' : 'bg-[#00E5FF]/10 text-[#00E5FF]'}`}>{alert.type}</span>
                      <span className="text-[10px] font-mono text-slate-500">{alert.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{alert.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono bg-[#0B1220] px-2 py-1 rounded">SEC: <span className="text-white">{alert.sector}</span></span>
                      {alert.status === "Pending" ? (
                        <button onClick={() => onAckAlert(alert.id)} className="text-[10px] font-bold uppercase tracking-wider text-[#00FFA3] hover:text-[#00FFA3]/70 hover:bg-[#00FFA3]/10 px-2 py-1 rounded transition-colors">Acknowledge</button>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Acked</span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* ── AI Copilot & Hotspots Grid ── */}
      <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* AI Copilot Interface */}
        <div className="lg:col-span-5 bg-[#0B1220]/60 backdrop-blur-xl border border-[#00E5FF]/20 shadow-[0_10px_30px_rgba(0,229,255,0.05)] rounded-3xl p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00E5FF]/10 blur-[70px] rounded-full pointer-events-none group-hover:bg-[#00E5FF]/20 transition-colors duration-700" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
            <Cpu className="w-5 h-5 text-[#00E5FF]" />
            Operations Briefing
          </h3>

          <div className="flex-1 bg-[#050B14]/50 border border-slate-800/80 rounded-2xl p-5 mb-5 min-h-[160px] max-h-[200px] overflow-y-auto text-[13px] leading-relaxed text-slate-300 custom-scrollbar relative shadow-inner">
            {isAiLoading && (
              <div className="absolute inset-0 bg-[#050B14]/80 flex items-center justify-center gap-3 backdrop-blur-[2px] z-10 rounded-2xl">
                <RefreshCw className="w-5 h-5 text-[#00E5FF] animate-spin" />
                <span className="text-[11px] text-[#00E5FF] font-bold tracking-widest uppercase">Processing Request</span>
              </div>
            )}
            <div className="whitespace-pre-line font-mono leading-relaxed">{aiResponse}</div>
          </div>

          <div className="grid grid-cols-1 gap-3 mb-5 relative z-10">
            {activePresets.map((preset, idx) => (
              <button
                key={idx}
                disabled={isAiLoading}
                onClick={() => { setUserQuery(preset.query); handleQuerySubmit(preset.query); }}
                className="w-full p-4 bg-slate-800/30 hover:bg-slate-800/80 border border-slate-800 hover:border-[#00E5FF]/30 text-[11px] text-slate-400 hover:text-cyan-300 uppercase font-bold tracking-wider rounded-xl transition-all flex items-center justify-between text-left group disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 shadow-sm"
              >
                <span>{preset.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#00E5FF] transition-colors" />
              </button>
            ))}
          </div>

          <div className="flex gap-3 relative z-10">
            <input
              type="text"
              placeholder="Query strategic databanks..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit(userQuery)}
              className="flex-1 bg-[#050B14]/50 text-white placeholder-slate-500 border border-slate-800 focus:border-[#00E5FF]/50 focus:ring-1 focus:ring-[#00E5FF]/50 rounded-xl px-5 py-3 text-xs outline-none font-mono transition-all shadow-inner"
            />
            <button
              onClick={() => handleQuerySubmit(userQuery)}
              className="px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] rounded-xl flex items-center justify-center transition-all disabled:opacity-50 group hover:-translate-y-0.5"
              disabled={isAiLoading || !userQuery.trim()}
            >
              <Send className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Hotspot Intelligence Grid */}
        <div className="lg:col-span-7 bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-[#FFB020]" />
            Risk Hotspots
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {crimeHotspots.slice(0, 4).map((hs, idx) => (
              <div key={idx} className="bg-[#050B14]/40 border border-slate-800/60 rounded-2xl p-5 flex flex-col justify-between group hover:border-[#FFB020]/30 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-[13px] font-bold text-white mb-1.5 group-hover:text-amber-100 transition-colors">{hs.name}</h4>
                    <span className={`text-[10px] px-2.5 py-1 rounded border uppercase font-bold tracking-wider ${hs.severity === 'CRITICAL' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F] border-[#FF4D4F]/20' : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20'}`}>{hs.severity}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#050B14] border border-slate-800 flex items-center justify-center text-sm font-bold text-white group-hover:border-[#FFB020]/40 group-hover:text-[#FFB020] transition-colors shadow-inner">
                    {hs.crimeCount}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono bg-[#0B1220]/80 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[#00E5FF] font-semibold mr-1">AI DEPLOY:</span> Recommended +2 units at 20:00.
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Additional Enterprise Modules ── */}
      <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Trends */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-colors duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <h3 className="font-bold mb-4 text-[11px] uppercase tracking-widest text-[#00E5FF] flex items-center gap-2">
            Incident Trend Analytics
          </h3>
          <div className="flex items-end gap-3 h-32 mb-6 mt-2">
            {[40, 70, 45, 90, 65, 85, 60].map((h, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-[#00E5FF]/10 to-[#00E5FF]/50 rounded-t-lg hover:from-[#00E5FF]/30 hover:to-[#00E5FF] transition-all cursor-pointer relative group/bar" style={{ height: `${h}%` }}>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  {h}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono flex justify-between border-t border-slate-800/80 pt-4">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Predictive Intelligence */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
            <Cpu className="w-48 h-48 text-[#00FFA3]" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold mb-5 text-[11px] uppercase tracking-widest text-[#00FFA3]">Risk Forecast</h3>
            <div className="text-5xl font-extrabold text-white mb-4 tracking-tighter">84% <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase ml-1 block mt-1">Confidence Score</span></div>
            <p className="text-[11px] leading-relaxed text-slate-400 font-mono bg-[#050B14]/50 p-4 rounded-xl border border-slate-800/80">High probability of traffic anomalies in SG Highway sector between 18:00 - 20:00.</p>
          </div>
          <button className="w-full mt-6 py-3 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/30 text-[#00FFA3] text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm relative z-10 group-hover:shadow-[0_0_20px_rgba(0,255,163,0.1)]">Execute Pre-Deployment</button>
        </div>

        {/* Patrol Optimization */}
        <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-colors duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:-translate-y-1">
          <h3 className="font-bold mb-6 text-[11px] uppercase tracking-widest text-[#FFB020]">Resource Planning</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Route Optimization</span><span className="text-[#FFB020]">92%</span></div>
              <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-orange-500 to-[#FFB020] w-[92%]" /></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Resource Allocation</span><span className="text-[#00FFA3]">Optimal</span></div>
              <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-emerald-500 to-[#00FFA3] w-full" /></div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Response ETA</span><span className="text-[#00E5FF]">Fast</span></div>
              <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-blue-500 to-[#00E5FF] w-[85%]" /></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
