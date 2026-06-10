/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Eye, AlertTriangle, CheckCircle2, ShieldAlert, Navigation, 
  MapPin, RefreshCw, Send, CheckCircle, Activity 
} from "lucide-react";
import { Alert, Incident } from "../types";

interface SurveillanceHeatmapProps {
  alerts: Alert[];
  onAckAlert: (alertId: string) => void;
  onDispatchAlertUnit: (alertId: string, sector: string) => void;
}

interface SectorCard {
  sector: string;
  threatLevel: number;
  status: "CRITICAL" | "ELEVATED" | "MODERATE" | "STABLE";
  coordinates: string;
  sensorAnomaly: string;
}

export default function SurveillanceHeatmap({
  alerts,
  onAckAlert,
  onDispatchAlertUnit
}: SurveillanceHeatmapProps) {
  const [filterMode, setFilterMode] = useState<"ALL" | "CRITICAL" | "WARNING">("ALL");
  const [selectedScannerSector, setSelectedScannerSector] = useState<string>("Sector 7G");
  
  // Custom styled thermo-heat cards as per the prompt HTML layout
  const [sectors, setSectors] = useState<SectorCard[]>([
    { sector: "Sector 7G", threatLevel: 98, status: "CRITICAL", coordinates: "45.3E, 12.9N", sensorAnomaly: "Infrared fence breach near Drone Hangar" },
    { sector: "Sector 3B", threatLevel: 65, status: "ELEVATED", coordinates: "22.1E, 78.4N", sensorAnomaly: "S-band RF noise spikes on Sigma-9" },
    { sector: "Sector 9A", threatLevel: 32, status: "MODERATE", coordinates: "87.5E, 54.2N", sensorAnomaly: "Badge lock mismatch on Echo gate" },
    { sector: "Sector 4C", threatLevel: 82, status: "CRITICAL", coordinates: "60.2E, 25.1N", sensorAnomaly: "Load test power failover drill active" },
    { sector: "Sector 1A", threatLevel: 12, status: "STABLE", coordinates: "15.4E, 11.2N", sensorAnomaly: "No anomalous sensor telemetry" }
  ]);

  const handleMuteZone = (secName: string) => {
    setSectors(prev => prev.map(s => {
      if (s.sector === secName) {
        return { ...s, threatLevel: 10, status: "STABLE", sensorAnomaly: "Sensors recalibrated to baseline" };
      }
      return s;
    }));
  };

  // Filter alerts matching our tabs
  const filteredAlerts = alerts.filter(alert => {
    if (filterMode === "CRITICAL") return alert.type === "Critical";
    if (filterMode === "WARNING") return alert.type === "Warning" || alert.type === "Critical";
    return true; // "ALL"
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Title Header spans 12 cols */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-pink-500 font-semibold mb-1 animate-pulse">
            Heatmap Surveillance Core
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
            INTEGRATED THERMAL HEATMAP &amp; SURVEILLANCE
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg py-1 px-3">
          <Eye className="w-3.5 h-3.5 text-pink-500" />
          <span>Active thermal scanners: 5/5 sectors synced</span>
        </div>
      </div>

      {/* Grid Left Column: Thermal Heat Grid Canvas Simulation (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Thermal Grid Canvas simulation */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Spatial Thermal Mesh Array</h3>
            <span className="text-[11px] font-mono text-slate-400">THERMOCAMERA INFRARED MATRIX OVERLAYS</span>
          </div>

          {/* Interactive Thermal Map Box */}
          <div className="h-[300px] bg-slate-950/90 border border-slate-850 rounded-lg relative overflow-hidden flex items-center justify-center">
            {/* Fine radar grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_2px,transparent_2px),linear-gradient(to_bottom,#111827_2px,transparent_2px)] bg-[size:30px_30px] opacity-80"></div>
            
            {/* Sector Highlight wireframes */}
            <div className="absolute inset-4 grid grid-cols-3 grid-rows-2 gap-4 pointer-events-none">
              <div id="thermal-grid-7G" className={`border-2 rounded transition-all duration-300 ${selectedScannerSector === 'Sector 7G' ? 'border-red-500/80 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-800/40 bg-slate-950/20'}`}></div>
              <div id="thermal-grid-3B" className={`border-2 rounded transition-all duration-300 ${selectedScannerSector === 'Sector 3B' ? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-slate-800/40 bg-slate-950/20'}`}></div>
              <div id="thermal-grid-9A" className={`border-2 rounded transition-all duration-300 ${selectedScannerSector === 'Sector 9A' ? 'border-indigo-500/85 bg-indigo-950/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-800/40 bg-slate-950/20'}`}></div>
              <div id="thermal-grid-4C" className={`border-2 rounded transition-all duration-300 ${selectedScannerSector === 'Sector 4C' ? 'border-red-500/80 bg-red-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'border-slate-800/40 bg-slate-950/20'}`}></div>
              <div className="border border-dashed border-slate-800/20 bg-slate-950/10 rounded"></div>
              <div className="border border-dashed border-slate-800/20 bg-slate-950/10 rounded"></div>
            </div>

            {/* Glowing Heat Centers */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Sector 7G core */}
              <div className="absolute top-[20%] left-[20%] w-28 h-28 bg-red-500/30 rounded-full blur-[35px] animate-pulse"></div>
              {/* Sector 4C core */}
              <div className="absolute bottom-[20%] left-[20%] w-20 h-20 bg-rose-500/25 rounded-full blur-[30px]"></div>
              {/* Sector 3B core */}
              <div className="absolute top-[25%] left-[50%] w-24 h-24 bg-amber-500/20 rounded-full blur-[25px]"></div>
              {/* Sector 9A core */}
              <div className="absolute top-[20%] left-[80%] w-16 h-16 bg-blue-500/15 rounded-full blur-[25px]"></div>
            </div>

            {/* Simulated Live Scanline Overlay */}
            <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(rgba(18,24,38,0)_94%,rgba(239,68,68,0.12)_97%,rgba(239,68,68,0.2)_100%)] h-full animate-pulse flex select-none pointer-events-none" style={{ animationDuration: "3s" }}></div>

            {/* Scanner labels */}
            <div className="absolute top-2 left-3 font-mono text-[9px] text-red-400 font-bold bg-slate-950/80 px-2 py-0.5 border border-red-500/20 rounded">
              THERMAL STREAM: ZULU-CORE-ACTIVE
            </div>

            <div className="absolute bottom-2 right-3 font-mono text-[9px] text-slate-500">
              FRAME REFRESH RATE: 60Hz · CALIBRATED SECURE
            </div>
          </div>

          {/* Quick Scanner select cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {sectors.map((sec) => {
              const isActive = selectedScannerSector === sec.sector;
              let thermalTagColor = "text-emerald-400";
              if (sec.status === "CRITICAL") thermalTagColor = "text-red-400 font-bold";
              if (sec.status === "ELEVATED") thermalTagColor = "text-amber-400";
              
              return (
                <div 
                  key={sec.sector}
                  onClick={() => setSelectedScannerSector(sec.sector)}
                  className={`bg-slate-950 p-3 border rounded-lg cursor-pointer transition-all ${isActive ? 'border-pink-500 bg-pink-950/5 shadow' : 'border-slate-805 hover:border-slate-700'}`}
                >
                  <div className="text-[10px] font-mono text-slate-400 truncate">{sec.sector}</div>
                  <div className={`text-sm font-mono font-bold mt-1 ${thermalTagColor}`}>{sec.threatLevel}%</div>
                  <div className="text-[8px] uppercase font-mono text-slate-500 mt-0.5">{sec.status}</div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Highlighted sector specifics */}
        {(() => {
          const selectedSecObj = sectors.find(s => s.sector === selectedScannerSector) || sectors[0];
          let threatBadge = "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20";
          if (selectedSecObj.status === "CRITICAL") threatBadge = "bg-red-950/40 text-red-400 border border-red-500/20";
          if (selectedSecObj.status === "ELEVATED") threatBadge = "bg-amber-950/40 text-amber-400 border border-amber-500/20";
          return (
            <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl block relative">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Currently Analysing Stream</span>
                  <h4 className="text-base text-white font-bold font-mono">{selectedSecObj.sector} (GPS: {selectedSecObj.coordinates})</h4>
                  <p className="text-xs text-slate-300 mt-1.5 font-mono">{selectedSecObj.sensorAnomaly}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-1 text-xs font-mono rounded font-bold uppercase ${threatBadge}`}>
                    {selectedSecObj.status} ({selectedSecObj.threatLevel}%)
                  </span>
                  {selectedSecObj.status !== "STABLE" && (
                    <button
                      onClick={() => handleMuteZone(selectedSecObj.sector)}
                      className="px-3 py-1 bg-slate-950 hover:bg-slate-905 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 rounded cursor-pointer"
                    >
                      Mute Sensors
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Grid Right Column: Alerts Stream list with Dispatch/Ack CTA (5/12 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Active Alert Feed Sidebar */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
          
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">ACTIVE ALERT STREAM</h3>
            <span className="text-[11px] font-mono text-slate-400">DISPATCH UNITS DIRECTLY TO ANOMALIES</span>
          </div>

          {/* Filter TABS: All, Critical, Warning */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            {(["ALL", "CRITICAL", "WARNING"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`py-1 rounded text-center border font-bold cursor-pointer transition-colors ${filterMode === mode ? 'bg-pink-500 text-slate-950 border-pink-400' : 'bg-slate-950 text-slate-400 border-slate-805 hover:text-white'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Scrollable list content */}
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                No active alarms match filter criteria.
              </div>
            ) : (
              filteredAlerts.slice().reverse().map((alert) => {
                const isCritical = alert.type === "Critical";
                const isPending = alert.status === "Pending";
                return (
                  <div 
                    key={alert.id}
                    className={`bg-slate-950 border p-3.5 rounded-lg flex flex-col gap-3 font-mono text-xs transition-all ${
                      isCritical ? 'border-red-500/25 bg-red-950/5' : 'border-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical ? 'bg-red-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {alert.type}
                      </span>
                      <span className="text-slate-500 text-[10px]">{alert.time}</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed text-[11px]">{alert.message}</p>

                    <div className="flex justify-between items-center text-[10px] border-t border-slate-900 pt-2.5">
                      <span className="text-slate-500">
                        Sector: <b className="text-slate-300 font-bold">{alert.sector}</b>
                      </span>
                      
                      <div className="flex gap-1.5">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => onAckAlert(alert.id)}
                              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded hover:text-white hover:bg-slate-805 text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Ack
                            </button>
                            <button
                              onClick={() => {
                                onDispatchAlertUnit(alert.id, alert.sector);
                              }}
                              className="px-2.5 py-1 bg-pink-500 hover:bg-pink-400 text-slate-950 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              Dispatch Unit
                            </button>
                          </>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[10px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            RESOLVED &amp; SENT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
