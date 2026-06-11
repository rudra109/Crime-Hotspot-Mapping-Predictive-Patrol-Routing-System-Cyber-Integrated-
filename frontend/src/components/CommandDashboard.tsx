/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, Radio, Activity, Navigation,
  MapPin, CheckCircle, RefreshCw, Send, Plus, X, AlertTriangle,
  Eye, Flame
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
    "Ahmedabad Police AI Advisor online. Enter a query or tap a Quick Directive below."
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
            border:1.5px solid ${color};
            border-radius:4px;
            padding:2px 7px;
            font-size:9px;
            font-family:monospace;
            font-weight:bold;
            white-space:nowrap;
            pointer-events:none;
            box-shadow:0 2px 6px rgba(0,0,0,.5);
          ">⚠ ${hs.name.toUpperCase()} (${hs.crimeCount} CRIMES)</div>`,
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
        opacity: 0.75,
        dashArray: "10 6",
      }).addTo(mapRef.current);

      // Waypoint dots + markers
      route.waypoints.forEach((wp, idx) => {
        if (idx === 0 || idx === route.waypoints.length - 1) return; // skip HQ
        const dot = L.circleMarker([wp.lat, wp.lng], {
          radius: 5,
          fillColor: route.color,
          color: "#fff",
          weight: 1.5,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);
        dot.bindTooltip(`<span style="font-family:monospace;font-size:10px;">${route.name}: ${wp.name}</span>`, { direction: "top" });
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
            : "#8b5cf6";

        // Larger pulsing marker for very high threat
        const radius = incident.threatIndex >= 90 ? 14 : incident.isHighPriority ? 11 : 8;

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);

        circleMarker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; min-width: 180px;">
            <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px; font-size:13px;">${incident.category}</div>
            <div style="color: #475569; margin-bottom: 2px;">📍 ${incident.location}</div>
            <div style="color: #475569; margin-bottom: 2px;">⚠️ Threat: <b style="color:${color}">${incident.threatIndex}/100</b></div>
            <div style="color: #475569; margin-bottom: 2px;">📋 ${incident.status}</div>
            <div style="color: #475569;">🕐 ${incident.timestamp}</div>
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
    setAiResponse("Query sent. Analysing data...");

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
    const timeStr = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")} IST`;
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
    overallRiskLevel === "CRITICAL" ? "text-red-400" :
    overallRiskLevel === "HIGH" ? "text-orange-400" :
    overallRiskLevel === "MODERATE" ? "text-amber-400" : "text-green-400";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* ── Add Incident Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-900/40 border border-red-500/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">ADD CRIME INCIDENT</h3>
                  <p className="text-[10px] font-mono text-slate-500">Manual incident entry — Command Console</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Category + Priority Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Crime Category *</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none cursor-pointer"
                  >
                    {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Priority Level *</label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none cursor-pointer"
                  >
                    <option value="false">🟡 Routine</option>
                    <option value="true">🔴 High Priority</option>
                  </select>
                </div>
              </div>

              {/* Location Name */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Location / Area Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vastrapur Lake Road"
                  value={addForm.location}
                  onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white placeholder-slate-600 text-xs font-mono rounded-lg px-3 py-2 outline-none"
                />
              </div>

              {/* Coordinates Row */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400">Coordinates (Lat, Lng) *</label>
                  <button
                    onClick={() => { setShowAddModal(false); setMapClickMode(true); }}
                    className="text-[10px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3 h-3" /> Click on Map
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Latitude (23.xxxx)"
                    value={addForm.lat}
                    onChange={e => setAddForm(p => ({ ...p, lat: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white placeholder-slate-600 text-xs font-mono rounded-lg px-3 py-2 outline-none"
                    step="0.0001"
                  />
                  <input
                    type="number"
                    placeholder="Longitude (72.xxxx)"
                    value={addForm.lng}
                    onChange={e => setAddForm(p => ({ ...p, lng: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white placeholder-slate-600 text-xs font-mono rounded-lg px-3 py-2 outline-none"
                    step="0.0001"
                  />
                </div>
                <p className="text-[9px] font-mono text-slate-600 mt-1">Ahmedabad region: Lat 22.9–23.2, Lng 72.4–72.7</p>
              </div>

              {/* Threat Index */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                  Threat Index: <span className={`font-bold ${
                    parseInt(addForm.threatIndex) >= 80 ? "text-red-400" :
                    parseInt(addForm.threatIndex) >= 50 ? "text-amber-400" : "text-blue-400"
                  }`}>{addForm.threatIndex}/100</span>
                </label>
                <input
                  type="range" min="0" max="100" step="1"
                  value={addForm.threatIndex}
                  onChange={e => setAddForm(p => ({ ...p, threatIndex: e.target.value }))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-0.5">
                  <span>0 – Low</span><span>50 – Medium</span><span>100 – Critical</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the incident..."
                  value={addForm.description}
                  onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white placeholder-slate-600 text-xs font-mono rounded-lg px-3 py-2 outline-none resize-none"
                />
              </div>

              {/* Reported By */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Reported By *</label>
                <input
                  type="text"
                  placeholder="e.g. PCR Van 3 / Constable Name"
                  value={addForm.reportedBy}
                  onChange={e => setAddForm(p => ({ ...p, reportedBy: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-400 text-white placeholder-slate-600 text-xs font-mono rounded-lg px-3 py-2 outline-none"
                />
              </div>

              {/* Error */}
              {addFormError && (
                <div className="text-xs font-mono text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {addFormError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 border-t border-slate-800 bg-slate-950/40">
              <button
                onClick={() => { setShowAddModal(false); setAddFormError(""); }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-slate-300 rounded-lg cursor-pointer transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleAddIncidentSubmit}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> LOG INCIDENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map Click Mode Banner ── */}
      {mapClickMode && (
        <div className="lg:col-span-12 bg-blue-900/40 border border-blue-500/50 rounded-xl p-3 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
            <MapPin className="w-4 h-4" />
            <span>📍 Click anywhere on the map to pin the crime location. Press ESC or Cancel to abort.</span>
          </div>
          <button
            onClick={() => setMapClickMode(false)}
            className="text-xs font-mono text-blue-400 hover:text-white border border-blue-500/30 px-3 py-1 rounded-lg cursor-pointer transition-colors"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ── Telemetry Banner ── */}
      <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900 p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3.5 border-r border-slate-800 pr-2">
          <div className="h-11 w-11 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Active Incidents</div>
            <div className="text-2xl font-bold font-mono text-white">{activeIncidentCount}</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 md:border-r border-slate-800 pr-2">
          <div className="h-11 w-11 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Patrol Units</div>
            <div className="text-2xl font-bold font-mono text-white">
              {patrolCount} <span className="text-xs text-slate-500 font-normal">Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-r border-slate-800 pr-2">
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center border ${
            overallRiskLevel === "CRITICAL" || overallRiskLevel === "HIGH"
              ? "bg-red-900/40 border-red-500/30 text-red-400"
              : "bg-amber-900/40 border-amber-500/30 text-amber-400"
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Risk Matrix</div>
            <div className={`text-2xl font-bold font-mono ${riskColor}`}>
              {overallRiskLevel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Avg Response Time</div>
            <div className="text-2xl font-bold font-mono text-white">{avgResponseTime}</div>
          </div>
        </div>
      </div>

      {/* ── Left Column: Map + Incident Detail ── */}
      <div className="lg:col-span-7 flex flex-col gap-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Map Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">AHMEDABAD LIVE MAP</h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {incidents.filter(i => i.status !== "Resolved").length} ACTIVE · {crimeHotspots.length} HOTSPOTS IDENTIFIED
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Critical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Warning</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block"></span> Info</span>
              </div>
              {/* Layer toggles */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowHotspots(h => !h)}
                  className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer border transition-all ${
                    showHotspots
                      ? "bg-red-900/30 border-red-500/40 text-red-400"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  <Flame className="w-3 h-3" /> HOTSPOTS
                </button>
                <button
                  onClick={() => setShowPatrolRoutes(r => !r)}
                  className={`px-2 py-1 text-[9px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer border transition-all ${
                    showPatrolRoutes
                      ? "bg-amber-900/30 border-amber-500/40 text-amber-400"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  <Navigation className="w-3 h-3" /> PATROL ROUTES
                </button>
              </div>
            </div>
          </div>

          {/* Leaflet Map Container */}
          <div ref={mapContainerRef} className="h-[440px] w-full bg-slate-800" style={{ zIndex: 0 }} />

          {/* Map Footer */}
          <div className="p-4 bg-slate-950/40 flex flex-wrap justify-between items-center gap-3">
            <div className="text-xs font-mono text-slate-400">
              {selectedIncident ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  <span>Selected: <strong className="text-white">{selectedIncident.id}</strong> · {selectedIncident.category} · {selectedIncident.location.split(" (")[0]}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Click a marker to select · Red zones = crime hotspots (compulsory patrol)</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 text-xs">
              {/* Add Crime Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-mono font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                ADD CRIME
              </button>

              {selectedIncident && selectedIncident.status === "Assessing" && (
                <button
                  onClick={() => {
                    const firstUnit = units.find((u) => u.status === "Patrol") || units[0];
                    if (firstUnit) {
                      onDispatchUnit(firstUnit.id, selectedIncident.id);
                      setSelectedIncident((prev) => prev ? { ...prev, status: "Dispatched" } : null);
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  DISPATCH UNIT
                </button>
              )}
              <button
                onClick={onSimulateAlarm}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono rounded flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                SIMULATE ALERT
              </button>
            </div>
          </div>
        </div>

        {/* Hotspot Summary Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Flame className="w-4 h-4 text-red-400" />
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400">Crime Hotspot Summary</h4>
            <span className="ml-auto text-[10px] font-mono text-red-400 bg-red-900/20 border border-red-500/20 rounded px-2 py-0.5">COMPULSORY PATROL</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {crimeHotspots.map((hs, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-center gap-3 ${
                  hs.severity === "CRITICAL"
                    ? "bg-red-900/10 border-red-500/20"
                    : "bg-amber-900/10 border-amber-500/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono ${
                  hs.severity === "CRITICAL" ? "bg-red-900/40 text-red-400" : "bg-amber-900/40 text-amber-400"
                }`}>
                  {hs.crimeCount}
                </div>
                <div>
                  <div className="text-[10px] font-mono text-white font-semibold leading-tight">{hs.name}</div>
                  <div className={`text-[9px] font-mono font-bold mt-0.5 ${hs.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"}`}>
                    ⚠ {hs.severity} · PATROL MANDATORY
                  </div>
                </div>
                <Navigation className={`w-3.5 h-3.5 ml-auto shrink-0 ${hs.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"}`} />
              </div>
            ))}
          </div>

          {/* Route Legend */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-3">
            {compulsoryPatrolRoutes.map(r => (
              <div key={r.id} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <div className="w-6 h-1 rounded" style={{ background: r.color, opacity: 0.8 }}></div>
                <span>{r.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Incident Details */}
        {selectedIncident && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl relative">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-3 right-3 text-xs font-mono text-slate-400 hover:text-white px-2 py-0.5 border border-slate-800 bg-slate-950 rounded cursor-pointer"
            >
              CLEAR
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-widest rounded text-slate-950 font-bold ${selectedIncident.isHighPriority ? "bg-red-500" : "bg-amber-500"}`}>
                {selectedIncident.isHighPriority ? "HIGH PRIORITY" : "ROUTINE"}
              </span>
              <span className="text-xs font-mono text-slate-400">{selectedIncident.id}</span>
              <span className="text-xs font-mono text-slate-400">{selectedIncident.timestamp}</span>
            </div>
            <h4 className="text-base text-white font-bold">{selectedIncident.category} Report</h4>
            <p className="text-sm text-slate-300 mt-1">{selectedIncident.description}</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">LOCATION</span>
                <span className="text-slate-200">{selectedIncident.location.split(" (")[0]}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">THREAT LEVEL</span>
                <span className="text-rose-400 font-bold">{selectedIncident.threatIndex} / 100</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STATUS</span>
                <span className="text-slate-200">{selectedIncident.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">REPORTED BY</span>
                <span className="text-slate-200">{selectedIncident.reportedBy}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Alerts + AI Advisor ── */}
      <div className="lg:col-span-5 flex flex-col gap-6">

        {/* Quick Action: Add Crime + Incidents Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Total Incidents Tracked</div>
            <div className="text-xl font-bold font-mono text-white">{incidents.length} <span className="text-xs text-slate-500 font-normal">incidents</span></div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setMapClickMode(true); }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              PIN ON MAP
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white font-mono text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              ADD CRIME
            </button>
          </div>
        </div>

        {/* Live Alert Stream */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Live Alert Ticker
            </h4>
            <span className="text-[10px] font-mono text-slate-500">{alerts.length} ALERTS</span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-slate-500">No active alerts.</div>
            ) : (
              alerts.slice().reverse().map((alert) => {
                const isCritical = alert.type === "Critical";
                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded border text-xs font-mono transition-all ${
                      isCritical
                        ? "bg-red-900/20 border-red-500/30 text-red-100"
                        : "bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isCritical ? "bg-red-500 text-white" : "bg-blue-600 text-white"
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-slate-400 text-[10px]">{alert.time}</span>
                    </div>
                    <p className="leading-relaxed mb-2 text-[11px]">{alert.message}</p>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Sector: <b className="text-slate-200">{alert.sector}</b></span>
                      {alert.status === "Pending" ? (
                        <button
                          onClick={() => onAckAlert(alert.id)}
                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-[10px] text-white font-bold rounded cursor-pointer transition-all"
                        >
                          ACKNOWLEDGE
                        </button>
                      ) : (
                        <span className="text-green-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {alert.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Advisor */}
        <div id="ai-commands-liaison" className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
              Police Operations Advisor
            </h4>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Quick Directives</div>
            <div className="flex flex-col gap-2">
              {activePresets.map((preset, idx) => (
                <button
                  key={idx}
                  disabled={isAiLoading}
                  onClick={() => { setUserQuery(preset.query); handleQuerySubmit(preset.query); }}
                  className="text-left w-full p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 hover:text-white font-mono rounded cursor-pointer transition-all flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  <Navigation className="w-3 h-3 text-slate-500 rotate-90" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 min-h-[120px] max-h-[220px] overflow-y-auto font-mono text-[11px] leading-relaxed relative">
            {isAiLoading && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-[10px] text-slate-400 tracking-wider">ANALYSING...</span>
              </div>
            )}
            <b className="text-blue-400 block mb-1">📊 ADVISOR:</b>
            <div className="text-slate-300 whitespace-pre-line">{aiResponse}</div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask Advisor..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit(userQuery)}
              className="flex-1 bg-slate-950 text-white placeholder-slate-500 border border-slate-800 focus:border-blue-400 rounded-lg px-3 py-2 text-xs font-mono outline-none"
            />
            <button
              onClick={() => handleQuerySubmit(userQuery)}
              className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
