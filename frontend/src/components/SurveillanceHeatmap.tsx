/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Eye, CheckCircle, Video, Sliders } from "lucide-react";
import { Alert } from "../types";

// Leaflet is loaded via CDN script tag — access via window to avoid ES module strict-mode issues
const getL = () => (window as any).L;

interface SurveillanceHeatmapProps {
  alerts: Alert[];
  onAckAlert: (alertId: string) => void;
  onDispatchAlertUnit: (alertId: string, sector: string) => void;
}

interface SectorData {
  sector: string;
  threatLevel: number;
  status: "CRITICAL" | "ELEVATED" | "MODERATE" | "STABLE";
  sensorAnomaly: string;
  coordinates: [number, number]; // [lat, lng]
}

const INITIAL_SECTORS: SectorData[] = [
  { sector: "Vastrapur", threatLevel: 98, status: "CRITICAL", sensorAnomaly: "Multiple distress calls reported near the lake.", coordinates: [23.0398, 72.5281] },
  { sector: "Thaltej", threatLevel: 65, status: "ELEVATED", sensorAnomaly: "Vehicle theft reports increasing on SG Highway.", coordinates: [23.0596, 72.5394] },
  { sector: "Satellite", threatLevel: 32, status: "MODERATE", sensorAnomaly: "Cybercrime unit monitoring active calls.", coordinates: [23.0045, 72.5845] },
  { sector: "Memnagar", threatLevel: 82, status: "CRITICAL", sensorAnomaly: "Traffic gridlock and a hit-and-run at crossroads.", coordinates: [23.0123, 72.5612] },
  { sector: "CG Road", threatLevel: 12, status: "STABLE", sensorAnomaly: "All sensors recalibrated to baseline. No anomaly.", coordinates: [23.0198, 72.5456] },
];

const STATUS_FILL: Record<string, string> = {
  CRITICAL: "#ef4444",
  ELEVATED: "#f59e0b",
  MODERATE: "#8b5cf6",
  STABLE: "#10b981",
};

const STATUS_TEXT: Record<string, string> = {
  CRITICAL: "text-red-400",
  ELEVATED: "text-amber-400",
  MODERATE: "text-cyan-300",
  STABLE: "text-green-400",
};

const STATUS_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-900/40 text-red-400 border border-red-500/20",
  ELEVATED: "bg-amber-900/40 text-amber-400 border border-amber-500/20",
  MODERATE: "bg-blue-900/40 text-cyan-300 border border-blue-500/20",
  STABLE: "bg-green-900/40 text-green-400 border border-green-500/20",
};

// ─── CCTV FEED COMPONENT (Canvas-based Mock Feed) ───────────────────────────

const CCTVFeed = ({ cameraName, sector, status, threatLevel, isActiveAlert }: { 
  cameraName: string; 
  sector: string; 
  status: string; 
  threatLevel: number; 
  isActiveAlert: boolean; 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animId: number;
    let frame = 0;
    
    // Simulate motion box coordinate vectors
    let boxX = 30 + Math.random() * 50;
    let boxY = 40 + Math.random() * 40;
    let dx = 1.0 + Math.random() * 0.8;
    let dy = 0.6 + Math.random() * 0.5;
    
    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      
      // Clear with dark tech theme background
      ctx.fillStyle = '#060B13';
      ctx.fillRect(0, 0, w, h);
      
      // Draw camera green/cyan guide lines (grid)
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
      ctx.lineWidth = 1;
      // Vertical grid lines
      for (let x = 20; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // Horizontal grid lines
      for (let y = 20; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      
      // Draw scanline panning sweep
      const sweepY = (frame * 1.5) % h;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.07)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(w, sweepY);
      ctx.stroke();
      
      // Draw scanlines (alternating pixels)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }
      
      // Draw random glitch line occasionally
      if (Math.random() < 0.04) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.lineWidth = 1;
        const glitchY = Math.floor(Math.random() * h);
        ctx.beginPath();
        ctx.moveTo(0, glitchY);
        ctx.lineTo(w, glitchY);
        ctx.stroke();
      }

      // Draw crosshair at center
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 10, h / 2);
      ctx.lineTo(w / 2 + 10, h / 2);
      ctx.moveTo(w / 2, h / 2 - 10);
      ctx.lineTo(w / 2, h / 2 + 10);
      ctx.stroke();
      
      // Draw corner guides
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      const len = 12;
      const pad = 10;
      // Top Left
      ctx.beginPath(); ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad); ctx.stroke();
      // Top Right
      ctx.beginPath(); ctx.moveTo(w - pad, pad + len); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad - len, pad); ctx.stroke();
      // Bottom Left
      ctx.beginPath(); ctx.moveTo(pad, h - pad - len); ctx.lineTo(pad, h - pad); ctx.lineTo(pad + len, h - pad); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(w - pad, h - pad - len); ctx.lineTo(w - pad, h - pad); ctx.lineTo(w - pad - len, h - pad); ctx.stroke();
      
      // Simulated Motion Detection Box
      boxX += dx;
      boxY += dy;
      if (boxX < 20 || boxX > w - 80) dx = -dx;
      if (boxY < 20 || boxY > h - 50) dy = -dy;
      
      // Draw bounding box
      ctx.strokeStyle = isActiveAlert ? '#ef4444' : '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(boxX, boxY, 60, 35);
      
      // Bounding box label
      ctx.fillStyle = isActiveAlert ? '#ef4444' : '#00E5FF';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(isActiveAlert ? '🚨 ANOMALY_SURGE' : 'SYS_FLOW: PASS', boxX, boxY - 4);
      
      // Draw status banner warning if active alert
      if (isActiveAlert) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, 0, w, h);
        
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.fillRect(0, h - 24, w, 24);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🚨 CCTV ANALYTICS: CRITICAL SURGE DETECTED', w / 2, h - 8);
      } else {
        // Draw camera info banner at bottom
        ctx.fillStyle = 'rgba(11, 18, 32, 0.8)';
        ctx.fillRect(0, h - 20, w, 20);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SYS: COMPLIANT | FEED: ENCRYPTED | RISK: ${threatLevel}%`, 15, h - 7);
      }
      
      // Draw camera name & timestamp on top left/right
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(cameraName, 15, 25);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(new Date().toLocaleTimeString(), w - 15, 25);
      
      // Draw pulsing red "REC" dot
      if (Math.floor(frame / 15) % 2 === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(15, 35, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('REC', 22, 38);
      }
      
      animId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraName, sector, status, threatLevel, isActiveAlert]);
  
  return (
    <div className="relative border border-slate-800 rounded-xl overflow-hidden shadow-inner bg-[#060B13] p-1">
      <canvas 
        ref={canvasRef} 
        width={320} 
        height={190} 
        className="w-full h-auto block"
      />
    </div>
  );
};

export default function SurveillanceHeatmap({
  alerts,
  onAckAlert,
  onDispatchAlertUnit,
}: SurveillanceHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const circleLayersRef = useRef<any[]>([]);

  const [filterMode, setFilterMode] = useState<"ALL" | "CRITICAL" | "WARNING">("ALL");
  const [selectedSector, setSelectedSector] = useState<string>("Vastrapur");
  const [sectors, setSectors] = useState<SectorData[]>(INITIAL_SECTORS);
  const [heatmapTab, setHeatmapTab] = useState<"MAP" | "CCTV">("MAP");

  // Initialize Leaflet map — poll until window.L CDN is available
  useEffect(() => {
    if (heatmapTab !== "MAP") return;

    let attempts = 0;
    const tryInit = () => {
      const L = getL();
      if (!L) {
        if (attempts++ < 30) setTimeout(tryInit, 150);
        return;
      }
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        const map = L.map(mapContainerRef.current, {
          center: [23.0225, 72.5714],
          zoom: 12,
        });

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        mapRef.current = map;
        // Invalidate size after layout stabilization
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 300);
      } catch (e) {
        console.error("Failed to initialize map:", e);
      }
    };

    tryInit();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [heatmapTab]);

  // Update circles when sectors or selected sector changes
  useEffect(() => {
    if (heatmapTab !== "MAP") return;
    const L = getL();
    if (!mapRef.current || !L) return;

    // Remove old circles
    circleLayersRef.current.forEach((c) => c.remove());
    circleLayersRef.current = [];

    sectors.forEach((sec) => {
      const isSelected = sec.sector === selectedSector;
      const color = STATUS_FILL[sec.status];

      // Outer filled circle (threat zone)
      const zone = L.circle(sec.coordinates, {
        radius: 1400,
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.35 : 0.15,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 1 : 0.6,
      }).addTo(mapRef.current);

      // Center dot marker
      const dot = L.circleMarker(sec.coordinates, {
        radius: isSelected ? 10 : 7,
        fillColor: color,
        color: "#ffffff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(mapRef.current);

      dot.bindPopup(`
        <div style="font-family:monospace;font-size:12px;min-width:150px;">
          <strong style="color:#1e293b;">${sec.sector}</strong><br/>
          <span style="color:#475569;">Status: ${sec.status}</span><br/>
          <span style="color:#475569;">Threat: ${sec.threatLevel}%</span>
        </div>
      `);

      dot.on("click", () => setSelectedSector(sec.sector));
      zone.on("click", () => setSelectedSector(sec.sector));

      circleLayersRef.current.push(zone, dot);
    });
  }, [sectors, selectedSector, heatmapTab]);

  const handleMuteZone = (secName: string) => {
    setSectors((prev) =>
      prev.map((s) =>
        s.sector === secName
          ? { ...s, threatLevel: 10, status: "STABLE", sensorAnomaly: "Sensors recalibrated to baseline." }
          : s
      )
    );
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterMode === "CRITICAL") return alert.type === "Critical";
    if (filterMode === "WARNING") return alert.type === "Warning" || alert.type === "Critical";
    return true;
  });

  const selectedSecObj = sectors.find((s) => s.sector === selectedSector) || sectors[0];

  const getSectorAlertActive = (secName: string) => {
    return alerts.some(a => a.sector.toLowerCase() === secName.toLowerCase() && a.status === 'Pending');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans select-none">

      {/* Header */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-semibold mb-1">Surveillance Overview</div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">ZONE SURVEILLANCE & TELEMETRY Heatmap</h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-[#0B1220] border border-slate-800 rounded-lg py-1 px-3">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>{sectors.length}/5 sectors synced</span>
        </div>
      </div>

      {/* Left Column: Map or CCTV Feeds */}
      <div className="lg:col-span-7 flex flex-col gap-6">

        {/* Tab Controls */}
        <div className="flex bg-[#0B1220] p-1.5 rounded-2xl border border-slate-800 self-start gap-1">
          <button
            onClick={() => setViewStateTab("MAP")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
              heatmapTab === "MAP"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Operational Map View
          </button>
          
          <button
            onClick={() => setViewStateTab("CCTV")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
              heatmapTab === "CCTV"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Surveillance CCTV Grid
          </button>
        </div>

        {heatmapTab === "MAP" ? (
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ahmedabad Sectors</h3>
                <span className="text-[11px] font-mono text-slate-400">CLICK ZONE OR DOT TO SELECT</span>
              </div>
              {/* Legend */}
              <div className="flex gap-3 text-[10px] font-mono text-slate-400">
                {Object.entries(STATUS_FILL).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: v }}></span>
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {/* Leaflet Map */}
            <div 
              ref={mapContainerRef} 
              className="w-full rounded-lg overflow-hidden border border-slate-700" 
              style={{ 
                height: "400px",
                zIndex: 0,
                backgroundColor: "#1e293b",
                minHeight: "400px"
              }} 
            />

            {/* Sector mini-cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {sectors.map((sec) => (
                <div
                  key={sec.sector}
                  onClick={() => setSelectedSector(sec.sector)}
                  className={`bg-[#050B14] p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedSector === sec.sector
                      ? "border-blue-500 bg-blue-900/20 shadow"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400 truncate">{sec.sector}</div>
                  <div className={`text-sm font-mono font-bold mt-1 ${STATUS_TEXT[sec.status]}`}>{sec.threatLevel}%</div>
                  <div className="text-[8px] uppercase font-mono text-slate-500 mt-0.5">{sec.status}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* CCTV Live Feeds Screen */
          <div className="bg-[#0B1220] border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Surveillance Room — Municipal CCTV Stream</h3>
              <span className="text-[10px] font-mono text-slate-400">AUTOMATED MOTION DETECTION & GLITCH OVERLAYS</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CCTVFeed 
                cameraName="CAM-VASTRAPUR-LAKE-01" 
                sector="Vastrapur" 
                status="CRITICAL" 
                threatLevel={98}
                isActiveAlert={getSectorAlertActive("Vastrapur")} 
              />
              <CCTVFeed 
                cameraName="CAM-THALTEJ-CROSS-02" 
                sector="Thaltej" 
                status="ELEVATED" 
                threatLevel={65}
                isActiveAlert={getSectorAlertActive("Thaltej")} 
              />
              <CCTVFeed 
                cameraName="CAM-SATELLITE-CORP-03" 
                sector="Satellite" 
                status="MODERATE" 
                threatLevel={32}
                isActiveAlert={getSectorAlertActive("Satellite")} 
              />
              <CCTVFeed 
                cameraName="CAM-CGROAD-MALL-04" 
                sector="CG Road" 
                status="STABLE" 
                threatLevel={12}
                isActiveAlert={getSectorAlertActive("CG Road")} 
              />
            </div>
          </div>
        )}

        {/* Selected sector detail */}
        <div className="bg-[#0B1220] border border-slate-800 p-5 rounded-xl">
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">Currently Analysing</span>
              <h4 className="text-base text-white font-bold font-mono">{selectedSecObj.sector}</h4>
              <p className="text-xs text-slate-300 mt-1.5 font-mono">{selectedSecObj.sensorAnomaly}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 text-xs font-mono rounded font-bold uppercase ${STATUS_BADGE[selectedSecObj.status]}`}>
                {selectedSecObj.status} ({selectedSecObj.threatLevel}%)
              </span>
              {selectedSecObj.status !== "STABLE" && (
                <button
                  onClick={() => handleMuteZone(selectedSecObj.sector)}
                  className="px-3 py-1 bg-[#050B14] hover:bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 rounded cursor-pointer transition-colors"
                >
                  Mute Alert
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Alert Stream */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-[#0B1220] border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">ACTIVE ALERT STREAM</h3>
            <span className="text-[11px] font-mono text-slate-400">DISPATCH UNITS DIRECTLY</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            {(["ALL", "CRITICAL", "WARNING"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`py-1 rounded text-center border font-bold cursor-pointer transition-colors ${
                  filterMode === mode
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-[#050B14] text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">No active alarms match filter criteria.</div>
            ) : (
              filteredAlerts.slice().reverse().map((alert) => {
                const isCritical = alert.type === "Critical";
                const isPending = alert.status === "Pending";
                return (
                  <div
                    key={alert.id}
                    className={`bg-[#050B14] border p-3.5 rounded-lg flex flex-col gap-3 font-mono text-xs transition-all ${
                      isCritical ? "border-red-500/25 bg-red-900/10" : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isCritical ? "bg-red-500 text-white" : "bg-amber-500 text-white"}`}>
                        {alert.type}
                      </span>
                      <span className="text-slate-500 text-[10px]">{alert.time}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-[11px]">{alert.message}</p>
                    <div className="flex justify-between items-center text-[10px] border-t border-slate-900 pt-2.5">
                      <span className="text-slate-500">Sector: <b className="text-slate-300">{alert.sector}</b></span>
                      <div className="flex gap-1.5">
                        {isPending ? (
                          <>
                            <button onClick={() => onAckAlert(alert.id)} className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:text-white hover:bg-slate-700 text-[10px] font-bold cursor-pointer transition-colors">
                              Ack
                            </button>
                            <button onClick={() => onDispatchAlertUnit(alert.id, alert.sector)} className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/50 rounded text-[10px] font-bold cursor-pointer transition-colors">
                              Dispatch Unit
                            </button>
                          </>
                        ) : (
                          <span className="text-green-400 font-bold flex items-center gap-1 text-[10px]">
                             <CheckCircle className="w-3.5 h-3.5" />
                            {alert.status.toUpperCase()}
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

  function setViewStateTab(tab: "MAP" | "CCTV") {
    setHeatmapTab(tab);
  }
}
