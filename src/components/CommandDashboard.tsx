/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, Radio, ShieldCheck, Activity, Send, Navigation, 
  MapPin, Eye, Compass, RefreshCw, AlertTriangle, CheckCircle 
} from "lucide-react";
import { Incident, Alert, PatrolUnit } from "../types";

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
  onAddIncident,
  onAckAlert,
  onSimulateAlarm
}: CommandDashboardProps) {
  // Map representation states
  const [mapMode, setMapMode] = useState<"VECTOR" | "THERMAL" | "SAT">("VECTOR");
  const [selectedSector, setSelectedSector] = useState<string>("Sector 7G");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Tactical action states
  const [drillActive, setDrillActive] = useState(false);
  const [uavCount, setUavCount] = useState(4);
  const [globalThreatMultiplier, setGlobalThreatMultiplier] = useState(1.0);

  // AI Command Liaison states
  const [aiApiKeyConfigured, setAiApiKeyConfigured] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>(
    "Aegis intelligence core online. Provide tactical query or select preset above."
  );
  const [userQuery, setUserQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Quick AI queries represent tactical challenges
  const activePresets = [
    { label: "Analyze Threat Sector 7G", query: "Assess current sector risks and threat levels for Sector 7G." },
    { label: "Check signal degradation", query: "Perform signal diagnostics on Channel Sigma-9 core." },
    { label: "Request Deployment Strategy", query: "Draft deployment recommendation for patrolling units Alpha and Delta." }
  ];

  // Fetch AI status on mount
  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiApiKeyConfigured(data.isConfigured))
      .catch(() => setAiApiKeyConfigured(false));
  }, []);

  const handleQuerySubmit = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAiLoading(true);
    setAiResponse("Query sent. Analysing threat signatures...");
    
    try {
      const response = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryText,
          context: {
            activeSectors: ["7G", "3B", "9A"],
            incidentsCount: incidents.length,
            activeResponseUnits: units.filter(u => u.status !== "Off Duty").length,
            incidentSample: incidents.slice(0, 3)
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setAiResponse(data.response);
      } else {
        setAiResponse("Failed to query Aegis Intelligence Core.");
      }
    } catch (err: any) {
      setAiResponse(`Secure query connection timed out: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleQuickQuiz = (query: string) => {
    setUserQuery(query);
    handleQuerySubmit(query);
  };

  // Stats calculation
  const activeIncidentCount = incidents.filter(i => i.status !== "Resolved").length;
  const avgResponseTime = drillActive ? "1.8m" : "3.4m";
  const overallRiskLevel = activeIncidentCount > 3 ? "CRITICAL" : activeIncidentCount > 1 ? "MODERATE" : "STABLE";

  // Simulated radar scan effect
  const [radarDegrees, setRadarDegrees] = useState(0);
  useEffect(() => {
    const radarTimer = setInterval(() => {
      setRadarDegrees((prev) => (prev + 3) % 360);
    }, 50);
    return () => clearInterval(radarTimer);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Top Banner Telemetry (Row spans 12 cols) */}
      <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-32 bg-teal-500/5 blur-[80px] pointer-events-none rounded-full"></div>
        
        {/* Telemetry Item 1 */}
        <div className="flex items-center gap-3.5 border-r border-slate-800/60 pr-2">
          <div className="h-11 w-11 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Active Incidents</div>
            <div className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <span>{Math.round(activeIncidentCount * globalThreatMultiplier)}</span>
              {activeIncidentCount > 2 && (
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold animate-pulse">
                  HEAVY LOAD
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Item 2 */}
        <div className="flex items-center gap-3.5 md:border-r border-slate-800/60 pr-2">
          <div className="h-11 w-11 rounded-lg bg-teal-950/40 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Patrol Units</div>
            <div className="text-2xl font-bold font-mono text-white">82 <span className="text-xs text-slate-500 font-normal">Active</span></div>
          </div>
        </div>

        {/* Telemetry Item 3 */}
        <div className="flex items-center gap-3.5 border-r border-slate-800/60 pr-2">
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center border ${
            overallRiskLevel === "CRITICAL" 
              ? "bg-red-950/40 border-red-500/30 text-red-400" 
              : "bg-amber-950/40 border-amber-500/30 text-amber-400"
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Risk Matrix</div>
            <div className="text-2xl font-bold font-mono text-white flex items-center gap-2">
              <span className={overallRiskLevel === "CRITICAL" ? "text-red-400" : "text-amber-400"}>
                {overallRiskLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Item 4 */}
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-lg bg-sky-950/40 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] tracking-wider uppercase font-mono text-slate-400">Avg Response Time</div>
            <div className="text-2xl font-bold font-mono text-white">{avgResponseTime}</div>
          </div>
        </div>
      </div>

      {/* Grid Left Column: High-Tech Vector Tactical Map (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Core Tactical Map Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative flex flex-col">
          {/* Map Controls Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-400 animate-spin" style={{ animationDuration: "12s" }} />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">INTEGRATED WIREFRAME TARGETING VECTOR</h3>
                <span className="text-[10px] font-mono text-slate-400">CENTRAL COORDINATION GRAPH (100 x 100 LAYOUT)</span>
              </div>
            </div>

            {/* Map Mode Toggle buttons */}
            <div id="topology-selector" className="flex items-center gap-1 bg-slate-900 border border-slate-800/80 p-0.5 rounded-lg text-xs font-mono">
              <button 
                onClick={() => setMapMode("VECTOR")}
                className={`px-2.5 py-1 rounded-md transition-all ${mapMode === "VECTOR" ? "bg-teal-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"}`}
              >
                VECTOR
              </button>
              <button 
                onClick={() => setMapMode("THERMAL")}
                className={`px-2.5 py-1 rounded-md transition-all ${mapMode === "THERMAL" ? "bg-red-500 text-slate-950 font-bold" : "text-slate-400 hover:text-red-400"}`}
              >
                THERMAL
              </button>
              <button 
                onClick={() => setMapMode("SAT")}
                className={`px-2.5 py-1 rounded-md transition-all ${mapMode === "SAT" ? "bg-indigo-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"}`}
              >
                SAT
              </button>
            </div>
          </div>

          {/* Interactive Map Visual Stage */}
          <div className="h-[380px] bg-slate-950/90 relative overflow-hidden flex items-center justify-center border-b border-slate-800/80">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:40px_40px] opacity-70"></div>
            
            {/* Radar scan circular line */}
            <div 
              className="absolute w-[450px] h-[450px] border border-teal-500/10 rounded-full pointer-events-none flex items-center justify-center"
              style={{
                background: `conic-gradient(from ${radarDegrees}deg, rgba(20,184,166,0.1) 0deg, rgba(20,184,166,0) 90deg)`
              }}
            >
              <div className="w-[300px] h-[300px] border border-teal-500/10 rounded-full"></div>
              <div className="w-[150px] h-[150px] border border-teal-500/10 rounded-full"></div>
            </div>

            {/* Thermal Neon Heat Gradient Overlays */}
            {mapMode === "THERMAL" && (
              <div className="absolute inset-0 pointer-events-none transition-opacity duration-300">
                <div className="absolute top-[28%] left-[42%] w-32 h-32 bg-red-600/35 blur-3xl rounded-full"></div>
                <div className="absolute top-[70%] left-[20%] w-24 h-24 bg-amber-600/25 blur-2xl rounded-full"></div>
                <div className="absolute top-[50%] left-[80%] w-28 h-28 bg-red-600/20 blur-3xl rounded-full"></div>
              </div>
            )}

            {/* Sat overlay effects */}
            {mapMode === "SAT" && (
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]">
                <div className="absolute top-2 left-2 text-[9px] font-mono text-indigo-400">SAT FEED ZULU-9: ONLINE</div>
                <div className="absolute bottom-2 right-2 text-[9px] font-mono text-rose-500 animate-pulse">LOCKED AT CORNER GRID</div>
              </div>
            )}

            {/* Render 10 sectors labels onto map */}
            <div className="absolute inset-0 grid grid-cols-5 grid-rows-2 text-[10px] font-mono text-slate-700/60 pointer-events-none">
              <div className="border-r border-b border-slate-900/60 p-1">Sector 1A</div>
              <div className="border-r border-b border-slate-900/60 p-1">Sector 3B</div>
              <div className="border-r border-b border-slate-900/60 p-1">Sector 4C</div>
              <div className="border-r border-b border-slate-900/60 p-1">Sector 5D</div>
              <div className="border-b border-slate-900/60 p-1">Sector 6E</div>
              <div className="border-r border-slate-900/60 p-1">Sector 7G (Gate B)</div>
              <div className="border-r border-slate-900/60 p-1">Sector 8H</div>
              <div className="border-r border-slate-900/60 p-1">Sector 9A</div>
              <div className="border-r border-slate-900/60 p-1 border-dashed">Sector 10K</div>
              <div className="p-1">Sector 11X</div>
            </div>

            {/* Tactical Target Scope / Cursor indicator over Selected Sector */}
            <div className="absolute pointer-events-none transition-all duration-300" style={{
              left: selectedSector.includes("7G") ? "45%" : selectedSector.includes("3B") ? "22%" : selectedSector.includes("9A") ? "85%" : "55%",
              top: selectedSector.includes("7G") ? "32%" : selectedSector.includes("3B") ? "75%" : selectedSector.includes("9A") ? "55%" : "45%"
            }}>
              <div className="relative">
                <div className="w-12 h-12 -mt-6 -ml-6 border border-dashed border-teal-500/50 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-2 h-2 -mt-1 -ml-1 border-t-2 border-l-2 border-teal-400"></div>
                <div className="absolute top-0 right-0 w-2 h-2 -mt-1 -mr-1 border-t-2 border-r-2 border-teal-400"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 -mb-1 -ml-1 border-b-2 border-l-2 border-teal-400"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 -mb-1 -mr-1 border-b-2 border-r-2 border-teal-400"></div>
              </div>
            </div>

            {/* Render Live Incidents as pulsing rings & circles */}
            {incidents.filter(i => i.status !== "Resolved").map((incident) => {
              const [x, y] = incident.coordinates;
              const isSelected = selectedIncident?.id === incident.id;
              return (
                <div 
                  key={incident.id} 
                  id={`marker-${incident.id}`}
                  onClick={() => {
                    setSelectedIncident(incident);
                    setSelectedSector(incident.location.split(" ")[0]);
                  }}
                  className="absolute cursor-pointer group transition-transform hover:scale-125 z-20"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring */}
                    <span className={`absolute inline-flex h-8 w-8 rounded-full opacity-60 animate-ping ${incident.isHighPriority ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                    {/* Fixed circle */}
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${incident.isHighPriority ? 'bg-red-500' : 'bg-amber-500'} ${isSelected ? 'ring-2 ring-white scale-110' : ''}`}></span>
                    
                    {/* Tag label on hover */}
                    <div className="absolute bottom-5 bg-slate-950 border border-slate-800 text-[10px] font-mono text-white px-2 py-0.5 rounded whitespace-nowrap shadow-lg pointer-events-none scale-0 group-hover:scale-100 transition-all origin-bottom">
                      <span className="font-bold mr-1 text-red-400">{incident.category}</span> {incident.id}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Render Patrol Units */}
            {units.filter(u => u.status !== "Off Duty").map((unit) => {
              // Estimate unit placement based on first waypoint or fixed sector
              const firstWp = unit.waypoints[unit.currentWaypointIndex] || { x: 50, y: 50 };
              const isReplying = unit.status === "Alert" || unit.status === "Moving";
              return (
                <div 
                  key={unit.id}
                  id={`unit-marker-${unit.id}`}
                  className="absolute z-10 text-teal-400 pointer-events-none transition-all duration-1000"
                  style={{ left: `${firstWp.x}%`, top: `${firstWp.y}%` }}
                >
                  <div className="flex flex-col items-center">
                    <Navigation className={`w-4 h-4 fill-teal-950 ${isReplying ? 'text-amber-400 fill-amber-950 animate-bounce' : 'text-teal-400'} rotate-45`} />
                    <span className="bg-slate-950/70 border border-slate-900 text-[8px] font-mono font-bold px-1 text-white -mt-1 rounded scale-80">
                      {unit.id.split("-")[1]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Map Footer Action Ribbon */}
          <div className="p-4 bg-slate-950/40 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="text-xs font-mono text-slate-400">
              {selectedIncident ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                  <span>Targeting: <strong className="text-slate-100 font-bold">{selectedIncident.id} ({selectedIncident.category})</strong> in {selectedIncident.location}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>System standby. Click maps grid incident node. Current: <strong className="text-slate-200">{selectedSector}</strong></span>
                </div>
              )}
            </div>

            {/* Quick deployment actions */}
            <div className="flex justify-end gap-2 text-xs">
              {selectedIncident && selectedIncident.status === "Assessing" ? (
                <button 
                  onClick={() => {
                    const firstBusy = units.find(u => u.status === "Patrol") || units[0];
                    if (firstBusy) {
                      onDispatchUnit(firstBusy.id, selectedIncident.id);
                      setSelectedIncident(prev => prev ? { ...prev, status: "Dispatched" } : null);
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-mono font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  DISPATCH BACKUP UNIT
                </button>
              ) : null}

              <button 
                onClick={onSimulateAlarm}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono rounded flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Radio className="w-3.5 h-3.5 text-teal-400" />
                SIMULATE FIELD ALERT
              </button>
            </div>
          </div>
        </div>

        {/* Selected Incident Details Module */}
        {selectedIncident && (
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl block transition-all animate-fade-in relative">
            <button 
              onClick={() => setSelectedIncident(null)}
              className="absolute top-3 right-3 text-xs font-mono text-slate-400 hover:text-white px-2 py-0.5 border border-slate-800 bg-slate-950/60 rounded cursor-pointer"
            >
              CLEAR FOCUS [ESC]
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-0.5 text-[9px] uppercase font-mono tracking-widest rounded text-slate-950 font-bold ${selectedIncident.isHighPriority ? 'bg-red-500' : 'bg-amber-500'}`}>
                {selectedIncident.isHighPriority ? 'HIGH THREAT / RED' : 'MINOR DEVIATION'}
              </span>
              <span className="text-xs font-mono text-slate-400">{selectedIncident.id}</span>
              <span className="text-[10px] font-mono text-slate-500">·</span>
              <span className="text-xs font-mono text-slate-400">{selectedIncident.timestamp}</span>
            </div>

            <h4 className="text-base text-white font-bold flex items-center gap-2">
              {selectedIncident.category} Detected
            </h4>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">{selectedIncident.description}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-800/60 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">COORDINATES</span>
                <span className="text-slate-200">{selectedIncident.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">THREAT LEVEL</span>
                <span className="text-rose-400 font-bold">{selectedIncident.threatIndex}% INDEX</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CURRENT ASSIGNMENT</span>
                <span className="text-slate-200">{selectedIncident.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ATTACHMENTS</span>
                <span className="text-slate-200">{selectedIncident.attachmentsCount} RAW FEED LOGS</span>
              </div>
            </div>
          </div>
        )}

        {/* Global Command Toggles (Risk Grid & Tactical Drills) */}
        <div id="risk-grid" className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 block">
          <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            Global Tactical Grid Modifiers
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Control card 1 */}
            <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-lg">
              <h5 className="text-xs font-bold text-slate-200 mb-1">ELEVATED DRILL MODE</h5>
              <p className="text-[10px] text-slate-400 mb-2.5">Simulate severe hazard conditions instantly.</p>
              <button 
                onClick={() => setDrillActive(!drillActive)}
                className={`w-full py-1.5 text-center text-[10px] font-mono font-bold uppercase rounded cursor-pointer transition-all ${drillActive ? 'bg-red-500 text-slate-950' : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'}`}
              >
                {drillActive ? "DEACTIVATE THREAT HIGH" : "INITIALIZE HAZARD S.H.I.E.L.D"}
              </button>
            </div>

            {/* Control card 2 */}
            <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <h5 className="text-xs font-bold text-slate-200">TACTICAL UAV SQUAD</h5>
                <span className="text-xs font-mono text-teal-400 font-bold">{uavCount}/8</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2.5">Launch reconnaissance drones on designated vectors.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setUavCount(prev => Math.min(prev + 1, 8))}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[10px] font-mono rounded cursor-pointer transition-all"
                >
                  + LAUNCH
                </button>
                <button 
                  onClick={() => setUavCount(prev => Math.max(prev - 1, 0))}
                  className="flex-1 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[10px] font-mono rounded cursor-pointer transition-all"
                >
                  - RECALL
                </button>
              </div>
            </div>

            {/* Control card 3 */}
            <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-lg">
              <h5 className="text-xs font-bold text-slate-200 mb-1">RISK INDEX AMPLIFIER</h5>
              <p className="text-[10px] text-slate-400 mb-2.5">Simulate stress load for critical sector evaluation.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 font-bold">1.0x</span>
                <input 
                  type="range" 
                  min="1.0" 
                  max="2.5" 
                  step="0.5" 
                  value={globalThreatMultiplier}
                  onChange={(e) => setGlobalThreatMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <span id="risk-multiplier-val" className="text-xs font-mono text-teal-400 font-bold whitespace-nowrap">{globalThreatMultiplier.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Grid Right Column: Alarms Stream & AI Tactical Liaison Chat (5/12 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Live Intel Stream Feed */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Alert Ticker (Operations Feed)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">{alerts.length} ALERTS</span>
          </div>

          <div id="live-intel-stream" className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-xs font-mono text-slate-500">
                No outstanding alerts on active telemetry streams.
              </div>
            ) : (
              alerts.slice().reverse().map((alert) => {
                const isCritical = alert.type === "Critical";
                const isPending = alert.status === "Pending";
                return (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded border text-xs font-mono transition-all ${
                      isCritical 
                        ? 'bg-red-950/20 border-red-500/20 text-red-100 hover:border-red-500/40' 
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isCritical ? 'bg-red-500 text-slate-950' : 'bg-slate-900 text-teal-400'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-slate-500 text-[10px]">{alert.time}</span>
                    </div>
                    <p className="leading-relaxed mb-2 text-[11px]">{alert.message}</p>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">
                        Sector: <b className="text-slate-300">{alert.sector}</b>
                      </span>
                      {isPending ? (
                        <button 
                          onClick={() => onAckAlert(alert.id)}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] text-teal-400 font-bold rounded cursor-pointer transition-all"
                        >
                          ACKNOWLEDGE
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          DISPATCHED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Commands Liaison panel */}
        <div id="ai-commands-liaison" className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-24 bg-teal-500/5 blur-[50px] pointer-events-none rounded-full"></div>
          
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-bounce"></span>
              Aegis AI S.H.I.E.L.D Advisor
            </h4>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              aiApiKeyConfigured 
                ? 'bg-teal-950 text-teal-400 border border-teal-500/20' 
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}>
              {aiApiKeyConfigured ? "GEN-AI CO-PILOT" : "SANDBOX BRIEFING ENGINE"}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            The integrated tactical analysis model translates field sensors, alarms, and roster telemetry logs into actionable operational briefs.
          </p>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Quick Preset Directives</div>
            <div className="flex flex-col gap-2">
              {activePresets.map((preset, idx) => (
                <button
                  key={idx}
                  disabled={isAiLoading}
                  onClick={() => handleQuickQuiz(preset.query)}
                  className="text-left w-full p-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-[11px] text-slate-300 hover:text-white font-mono rounded cursor-pointer transition-all flex items-center justify-between"
                >
                  <span>{preset.label}</span>
                  <Navigation className="w-3 h-3 text-slate-500 rotate-90" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Briefing Output Console */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 min-h-[120px] max-h-[220px] overflow-y-auto font-mono text-[11px] leading-relaxed relative">
            {isAiLoading && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 rounded-lg">
                <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
                <span className="text-[10px] text-slate-400 tracking-wider">CRYPTOGRAPHIC LINK LAUNCHING...</span>
              </div>
            )}
            <b className="text-teal-400 block mb-1">📊 RESPONSE NODE:</b>
            <div className="text-slate-300 whitespace-pre-line leading-relaxed">
              {aiResponse}
            </div>
          </div>

          {/* Input Chat Field */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask Advisor... (e.g. 'Assess drone hangar coordinates')"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit(userQuery)}
              className="flex-1 bg-slate-950 text-white placeholder-slate-600 border border-slate-800 focus:border-teal-400 rounded-lg px-3 py-2 text-xs font-mono outline-none"
            />
            <button
              onClick={() => handleQuerySubmit(userQuery)}
              className="px-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-4 h-4 font-bold" />
            </button>
          </div>
          
        </div>

      </div>

    </div>
  );
}
