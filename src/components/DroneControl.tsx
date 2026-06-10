/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Cpu, Radio, Battery, ShieldAlert, Navigation, 
  MapPin, RefreshCw, Send, CheckCircle, Activity, 
  Video, Eye, Compass, Cloud, Gauge, ArrowUpRight 
} from "lucide-react";

interface Drone {
  id: string;
  name: string;
  status: "ACTIVE" | "CHARGING" | "STANDBY" | "RETURNING";
  battery: number;
  altitude: number; // in meters
  speed: number;    // in km/h
  sector: string;
  cameraFeed: "OPTICAL" | "THERMAL" | "INFRARED" | "NIGHT_VISION";
  targetLock: string | null;
}

export default function DroneControl() {
  const [drones, setDrones] = useState<Drone[]>([
    { id: "UAV-1", name: "Sentinel Prime-01", status: "ACTIVE", battery: 84, altitude: 250, speed: 65, sector: "Sector 7G", cameraFeed: "THERMAL", targetLock: "Gate B Breach" },
    { id: "UAV-2", name: "HawkEye-02", status: "ACTIVE", battery: 67, altitude: 180, speed: 45, sector: "Sector 3B", cameraFeed: "OPTICAL", targetLock: null },
    { id: "UAV-3", name: "Shadow-03", status: "STANDBY", battery: 98, altitude: 0, speed: 0, sector: "Hangar Alpha", cameraFeed: "NIGHT_VISION", targetLock: null },
    { id: "UAV-4", name: "ApexSeeker-04", status: "CHARGING", battery: 32, altitude: 0, speed: 0, sector: "Hangar Bravo", cameraFeed: "INFRARED", targetLock: null },
    { id: "UAV-5", name: "Falcon-05", status: "ACTIVE", battery: 55, altitude: 310, speed: 80, sector: "Sector 9A", cameraFeed: "THERMAL", targetLock: "High Radiation" }
  ]);

  const [activeDroneId, setActiveDroneId] = useState<string>("UAV-1");
  const [scanSpeed, setScanSpeed] = useState<number>(3); // seconds per sweep
  const [alertThreshold, setAlertThreshold] = useState<number>(75);
  const [thermalScanPos, setThermalScanPos] = useState<number>(0);
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([
    "[04:12 ZULU] Drone UAV-1 locking target at Sector 7G Fence breach.",
    "[04:15 ZULU] Drone UAV-2 reporting minor signal packet decay in 3B.",
    "[04:18 ZULU] Static calibration on Falcon-05 spectral stabilizer completed."
  ]);
  const [newLogMsg, setNewLogMsg] = useState("");

  // Sweep scan simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setThermalScanPos((prev) => (prev + 4) % 100);
    }, 40);

    return () => clearInterval(timer);
  }, []);

  // Modify active drone altitude or speed parameters
  const handleScaleAttribute = (id: string, attribute: "altitude" | "speed", amount: number) => {
    setDrones((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const min = attribute === "altitude" ? 50 : 20;
          const max = attribute === "altitude" ? 500 : 120;
          const currentVal = d[attribute];
          const nextVal = Math.min(Math.max(currentVal + amount, min), max);
          return { ...d, [attribute]: nextVal };
        }
        return d;
      })
    );
  };

  const handleToggleCamera = (id: string, nextFeed: "OPTICAL" | "THERMAL" | "INFRARED" | "NIGHT_VISION") => {
    setDrones((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return { ...d, cameraFeed: nextFeed };
        }
        return d;
      })
    );
  };

  const handleLaunchDrone = (id: string) => {
    setDrones((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          return {
            ...d,
            status: "ACTIVE",
            battery: 100,
            altitude: 150,
            speed: 50,
            sector: "Sector 4C"
          };
        }
        return d;
      })
    );
    setDiagnosticLog((prev) => [
      `[Immediate UTC] Launched ${drones.find((d) => d.id === id)?.name || "drone"} on high priority patrol.`,
      ...prev
    ]);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLogMsg.trim()) {
      setDiagnosticLog((prev) => [`[${new Date().toISOString().substring(11, 16)} UTC] ${newLogMsg.trim()}`, ...prev]);
      setNewLogMsg("");
    }
  };

  const activeDrone = drones.find((d) => d.id === activeDroneId) || drones[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Page Title Block */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-semibold mb-1 animate-pulse">
            Autonomous UAV Infrastructure
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">
            DRONE FLEET MONITOR &amp; TACTICAL COMMAND
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg py-1 px-3">
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span>Weather Status: <strong>STABLE CAPTURE (CLEAR)</strong></span>
        </div>
      </div>

      {/* Grid Left: Drone Live Video Lens + Console controls (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Visual Drone Camera Viewfinder */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-4 h-4 text-cyan-400 animate-pulse" />
                Live Feed Tracker: {activeDrone.name}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">TELEMETRY DECRYPT CHANNEL: {activeDrone.cameraFeed} MODE</span>
            </div>

            {/* Camera feed filters selectors */}
            <div className="flex gap-1 text-[10px] font-mono bg-slate-950 p-0.5 rounded border border-slate-800">
              {(["OPTICAL", "THERMAL", "INFRARED", "NIGHT_VISION"] as const).map((feed) => (
                <button
                  key={feed}
                  onClick={() => handleToggleCamera(activeDrone.id, feed)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    activeDrone.cameraFeed === feed 
                      ? "bg-cyan-500 text-slate-950 font-bold" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {feed.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Screen Viewfinder */}
          <div className="h-[320px] bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden flex items-center justify-center">
            
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c111d_1px,transparent_1px),linear-gradient(to_bottom,#0c111d_1px,transparent_1px)] bg-[size:25px_25px] opacity-80"></div>
            
            {/* Animated crosshair tracking */}
            <div className="absolute w-44 h-44 border border-dashed border-cyan-500/20 rounded-full animate-spin pointer-events-none" style={{ animationDuration: "20s" }}></div>
            <div className="absolute w-28 h-28 border border-dashed border-cyan-500/30 rounded-full pointer-events-none"></div>

            {/* Focus lines */}
            <div className="absolute inset-x-8 inset-y-12 border-l border-r border-t border-b border-cyan-500/10 pointer-events-none"></div>

            {/* Display specific mode color overlay */}
            {activeDrone.cameraFeed === "THERMAL" && (
              <div className="absolute inset-0 bg-red-600/10 pointer-events-none">
                <div className="absolute top-[35%] left-[45%] w-24 h-24 bg-orange-500/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute top-[40%] left-[48%] w-12 h-12 bg-yellow-400/40 rounded-full blur-xl animate-pulse"></div>
              </div>
            )}
            {activeDrone.cameraFeed === "NIGHT_VISION" && (
              <div className="absolute inset-0 bg-emerald-600/10 pointer-events-none">
                <div className="absolute top-1/2 left-1/3 w-36 h-2 bg-emerald-500/10 rounded-full blur-md"></div>
              </div>
            )}
            {activeDrone.cameraFeed === "INFRARED" && (
              <div className="absolute inset-0 bg-purple-600/10 pointer-events-none">
                <div className="absolute top-1/4 left-[60%] w-20 h-20 bg-indigo-500/35 rounded-full blur-2xl"></div>
              </div>
            )}

            {/* Sequential Scan bar */}
            <div 
              className="absolute inset-x-0 h-0.5 bg-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all pointer-events-none"
              style={{ top: `${thermalScanPos}%` }}
            ></div>

            {/* Target indicator box */}
            {activeDrone.targetLock && (
              <div className="absolute top-[40%] left-[45%] w-16 h-16 border-2 border-dashed border-red-500 animate-pulse pointer-events-none">
                <div className="absolute -top-5 left-0 text-[8px] font-mono font-bold bg-red-500 text-white px-1 uppercase tracking-wider rounded">
                  LOCKED: {activeDrone.targetLock}
                </div>
              </div>
            )}

            {/* Top telemetry variables overlay */}
            <div className="absolute top-3 left-4 right-4 font-mono text-[9px] text-slate-400 flex justify-between uppercase pointer-events-none select-none">
              <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                LENS LATENCY: <span className="text-cyan-400">14ms</span>
              </div>
              <div className="bg-slate-955/80 px-2 py-1 rounded border border-slate-800">
                GPS COORDS: <span className="text-cyan-400">45.3E, 12.9N</span>
              </div>
              <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                ALT: <span className="text-cyan-400">{activeDrone.altitude}m</span>
              </div>
            </div>

            {/* Bottom telemetry overlay */}
            <div className="absolute bottom-3 left-4 right-4 font-mono text-[9px] text-slate-400 flex justify-between pointer-events-none select-none">
              <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-850">
                BATTERY: <span className={activeDrone.battery < 40 ? "text-red-400 font-bold" : "text-emerald-400"}>{activeDrone.battery}%</span>
              </div>
              <div className="bg-slate-955/80 px-2 py-1 rounded border border-slate-850">
                UAV SYS REF: <span className="text-white font-bold">{activeDrone.id}</span>
              </div>
              <div className="bg-slate-950/80 px-2 py-1 rounded border border-slate-850">
                SPEED: <span className="text-cyan-400 font-bold">{activeDrone.speed} km/h</span>
              </div>
            </div>
          </div>

          {/* Core manual parameters slider tuning */}
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-4">
            <h4 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-bold">Tune Flight Vectors (Realtime Alignment)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Target Drone Altitude</span>
                  <span className="text-cyan-400 font-bold">{activeDrone.altitude} meters</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={activeDrone.altitude === 0}
                    onClick={() => handleScaleAttribute(activeDrone.id, "altitude", -25)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:text-white"
                  >
                    -25m
                  </button>
                  <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(activeDrone.altitude / 500) * 100}%` }}></div>
                  </div>
                  <button 
                    disabled={activeDrone.altitude === 0}
                    onClick={() => handleScaleAttribute(activeDrone.id, "altitude", 25)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:text-white"
                  >
                    +25m
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Velocity Cruising Coefficient</span>
                  <span className="text-cyan-400 font-bold">{activeDrone.speed} km/h</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    disabled={activeDrone.speed === 0}
                    onClick={() => handleScaleAttribute(activeDrone.id, "speed", -10)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:text-white"
                  >
                    -10
                  </button>
                  <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden">
                    <div className="h-full bg-cyan-400 transition-all" style={{ width: `${(activeDrone.speed / 120) * 100}%` }}></div>
                  </div>
                  <button 
                    disabled={activeDrone.speed === 0}
                    onClick={() => handleScaleAttribute(activeDrone.id, "speed", 10)}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] font-mono rounded text-slate-300 hover:text-white"
                  >
                    +10
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Global sweep diagnostics metrics controller */}
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-xl block grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-300 font-bold">Scanning Duration Controller</h4>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-cyan-400 font-mono">{scanSpeed}s/sweep</span>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={scanSpeed}
                onChange={(e) => setScanSpeed(Number(e.target.value))}
                className="flex-1 accent-cyan-400 opacity-80 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-505 font-mono">Governs frequency of sweeping thermal laser emitters.</p>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 pt-4 md:pt-0">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-300 font-bold">Thermal Alarm Trigger Margin</h4>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-extrabold text-rose-450 text-rose-400 font-mono">{alertThreshold}%</span>
              <input 
                type="range" 
                min="50" 
                max="95" 
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="flex-1 accent-rose-500 opacity-80 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Sensors trigger warning when matching threat index exceeds limit.</p>
          </div>
        </div>

      </div>

      {/* Grid Right: Drone Fleet list with deployment actions (5/12 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Fleet Roster list module */}
        <div id="drone-fleet-list" className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-3">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">SECURE UAV FLEET UNIT ROSTER</h3>
            <span className="text-[11px] font-mono text-slate-400">MONITOR ENERGY CELLS &amp; GEO LOC CONSTRAINTS</span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {drones.map((drone) => {
              const isActiveObj = activeDroneId === drone.id;
              
              let batteryColor = "text-emerald-400";
              if (drone.battery < 40) batteryColor = "text-red-400 font-bold";
              else if (drone.battery < 70) batteryColor = "text-amber-400";

              let statusColor = "bg-slate-950 text-slate-400 border-slate-800";
              if (drone.status === "ACTIVE") statusColor = "bg-cyan-950/40 text-cyan-300 border-cyan-500/20";
              if (drone.status === "CHARGING") statusColor = "bg-emerald-950/30 text-emerald-400 border-emerald-500/10 animate-pulse";
              if (drone.status === "STANDBY") statusColor = "bg-slate-950 text-amber-500 border-slate-800";

              return (
                <div 
                  key={drone.id}
                  onClick={() => setActiveDroneId(drone.id)}
                  className={`p-3 rounded-lg border font-mono text-xs cursor-pointer transition-all ${
                    isActiveObj 
                      ? "border-cyan-500 bg-cyan-950/10" 
                      : "border-slate-850 bg-slate-950/40 hover:border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-white flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-cyan-400" />
                      {drone.name}
                    </span>
                    <span className={`px-2 py-0.5 border text-[9px] font-bold rounded uppercase ${statusColor}`}>
                      {drone.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900/60">
                    <div>
                      <span>BATTERY</span>
                      <span className={`block font-bold ${batteryColor}`}>{drone.battery}%</span>
                    </div>
                    <div>
                      <span>POSITION</span>
                      <span className="block text-slate-200">{drone.sector}</span>
                    </div>
                    <div className="text-right">
                      <span>ALTITUDE</span>
                      <span className="block text-slate-200">{drone.altitude > 0 ? `${drone.altitude}m` : "LOCKED"}</span>
                    </div>
                  </div>

                  {/* Launch CTA for Standby / Charging drones */}
                  {(drone.status === "STANDBY" || drone.status === "CHARGING") && (
                    <div className="mt-2.5 pt-2 border-t border-slate-900/40 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchDrone(drone.id);
                        }}
                        className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[9px] uppercase tracking-wider transition-colors"
                      >
                        Launch Vector Sweep
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Diagnostics Log console */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-3">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-xs uppercase font-mono text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Spectral Telemetry Logs
            </h4>
          </div>

          {/* Interactive Console logs */}
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg max-h-[160px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-400 space-y-1.5">
            {diagnosticLog.map((log, idx) => (
              <div key={idx} className="hover:text-cyan-300 transition-colors">
                {log}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddLog} className="flex gap-1.5">
            <input 
              type="text" 
              placeholder="Inject tactical log command..." 
              value={newLogMsg}
              onChange={(e) => setNewLogMsg(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-xs font-mono text-white outline-none"
            />
            <button 
              type="submit"
              className="px-3 bg-slate-800 text-slate-300 rounded-lg text-xs font-mono hover:bg-slate-700 cursor-pointer"
            >
              Push
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
