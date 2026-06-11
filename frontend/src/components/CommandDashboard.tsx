/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, Radio, Activity, Navigation,
  MapPin, CheckCircle, RefreshCw, Send,
} from "lucide-react";
import { Incident, Alert, PatrolUnit } from "../types";

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

export default function CommandDashboard({
  incidents,
  alerts,
  units,
  onDispatchUnit,
  onAckAlert,
  onSimulateAlarm,
}: CommandDashboardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [patrolCount] = useState(12);

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

        // Custom circle marker
        const circleMarker = L.circleMarker([lat, lng], {
          radius: incident.isHighPriority ? 12 : 8,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(mapRef.current);

        circleMarker.bindPopup(`
          <div style="font-family: monospace; font-size: 12px; min-width: 160px;">
            <div style="font-weight: bold; color: #1e293b; margin-bottom: 4px;">${incident.category}</div>
            <div style="color: #475569; margin-bottom: 2px;">📍 ${incident.location}</div>
            <div style="color: #475569; margin-bottom: 2px;">⚠️ Threat: ${incident.threatIndex}/100</div>
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

  const activeIncidentCount = incidents.filter((i) => i.status !== "Resolved").length;
  const avgResponseTime = "4.2m";
  const overallRiskLevel =
    activeIncidentCount > 3 ? "HIGH" : activeIncidentCount > 1 ? "MODERATE" : "NORMAL";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* Telemetry Banner */}
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
            overallRiskLevel === "HIGH"
              ? "bg-red-900/40 border-red-500/30 text-red-400"
              : "bg-amber-900/40 border-amber-500/30 text-amber-400"
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Risk Matrix</div>
            <div className={`text-2xl font-bold font-mono ${
              overallRiskLevel === "HIGH" ? "text-red-400" : overallRiskLevel === "MODERATE" ? "text-amber-400" : "text-green-400"
            }`}>
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

      {/* Left Column: Map + Incident Detail */}
      <div className="lg:col-span-7 flex flex-col gap-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          {/* Map Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">AHMEDABAD LIVE MAP</h3>
                <span className="text-[10px] font-mono text-slate-400">CLICK A MARKER TO SELECT INCIDENT</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Critical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Warning</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Info</span>
            </div>
          </div>

          {/* Leaflet Map Container */}
          <div ref={mapContainerRef} className="h-[420px] w-full bg-slate-800" style={{ zIndex: 0 }} />

          {/* Map Footer */}
          <div className="p-4 bg-slate-950/40 flex flex-wrap justify-between items-center gap-3">
            <div className="text-xs font-mono text-slate-400">
              {selectedIncident ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  <span>Selected: <strong className="text-white">{selectedIncident.id}</strong> · {selectedIncident.category} · {selectedIncident.location}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Click a marker on the map to select an incident.</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 text-xs">
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
                <span className="text-slate-200">{selectedIncident.location}</span>
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

      {/* Right Column: Alerts + AI Advisor */}
      <div className="lg:col-span-5 flex flex-col gap-6">

        {/* Live Alert Stream */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Live Alert Ticker
            </h4>
            <span className="text-[10px] font-mono text-slate-500">{alerts.length} ALERTS</span>
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
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
