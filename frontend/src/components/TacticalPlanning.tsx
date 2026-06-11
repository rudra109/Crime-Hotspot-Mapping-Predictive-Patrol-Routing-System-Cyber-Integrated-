/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Navigation, Eye, Compass, RefreshCw, CheckCircle2, 
  MapPin, AlertTriangle, ShieldCheck, HelpCircle, Activity 
} from "lucide-react";
import { PatrolUnit } from "../types";

interface TacticalPlanningProps {
  units: PatrolUnit[];
  onOptimizeRoute: (unitId: string) => void;
}

interface Waypoint {
  name: string;
  x: number;
  y: number;
}

export default function TacticalPlanning({
  units,
  onOptimizeRoute
}: TacticalPlanningProps) {
  // Sector Custom Planner coordinates state
  const [plannerWaypoints, setPlannerWaypoints] = useState<Waypoint[]>([
    { name: "Post Alpha Gate", x: 25, y: 30 },
    { name: "Sector 7G Node A", x: 45, y: 32 },
    { name: "Perimeter Corner B", x: 55, y: 65 },
    { name: "Security Checkpoint C", x: 75, y: 55 }
  ]);
  
  const [newWpName, setNewWpName] = useState("");
  const [newWpx, setNewWpx] = useState(50);
  const [newWpy, setNewWpy] = useState(50);
  
  const [activeUnitTab, setActiveUnitTab] = useState<string>("UA-7");
  const [suggestedModeActive, setSuggestedModeActive] = useState(false);

  // Stats estimated from waypoints length
  const totalIntegrityScore = Math.min(85 + (plannerWaypoints.length * 3.5), 98);
  const estimatedLatency = plannerWaypoints.length < 3 ? "4.5m" : plannerWaypoints.length < 6 ? "3.2m" : "2.1m";

  const handleAddWaypoint = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newWpName.trim() || `Node_${plannerWaypoints.length + 1}`;
    setPlannerWaypoints([...plannerWaypoints, { name, x: Number(newWpx), y: Number(newWpy) }]);
    setNewWpName("");
  };

  const handleClearWaypoints = () => {
    setPlannerWaypoints([]);
  };

  const handlePresetSelect = (preset: "ALPHA_SWEEP" | "BRAVO_VECTORS" | "HQ_GUARD") => {
    if (preset === "ALPHA_SWEEP") {
      setPlannerWaypoints([
        { name: "Post Alpha Gate", x: 35, y: 20 },
        { name: "Fence Gate B", x: 45, y: 32 },
        { name: "Drone Bay 2", x: 50, y: 40 },
        { name: "Sentinel Watch", x: 30, y: 50 }
      ]);
    } else if (preset === "BRAVO_VECTORS") {
      setPlannerWaypoints([
        { name: "Checkpoint Red", x: 60, y: 25 },
        { name: "Radar Tower 4", x: 65, y: 45 },
        { name: "East perimeter", x: 80, y: 55 }
      ]);
    } else {
      setPlannerWaypoints([
        { name: "HQ Post", x: 10, y: 10 },
        { name: "Grid Junction Alpha", x: 25, y: 25 },
        { name: "Grid Junction Beta", x: 32, y: 45 }
      ]);
    }
  };

  // Get active unit coordinates
  const currentSelectedUnitObj = units.find(u => u.id === activeUnitTab) || units[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Title Header spans 12 Cols */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-violet-400 font-semibold mb-1">
            Dynamic Alignment Vectors v4.2
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
            PATROL ROUTE OPTIMIZATION PLANNING
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[9px] font-mono text-slate-500 font-semibold uppercase">Mitigation Status</span>
            <span className="text-xs font-bold font-mono text-emerald-400">8.4/10 SCORE</span>
          </div>
          <div className="h-8 w-1 bg-violet-500"></div>
          <div className="text-right">
            <span className="block text-[9px] font-mono text-slate-500 font-semibold uppercase font-bold">Roster Active</span>
            <span className="text-xs font-bold font-mono text-white">12/15 ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Grid Left: Route Architect & Coordinates design Table (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* SVG Route Planner Interactive Map */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dynamic Path Architect</h3>
              <span className="text-[11px] font-mono text-slate-400">BUILD SEQUENTIAL COORDINATES OVER MATRIX CORES</span>
            </div>
            
            {/* Quick Presets */}
            <div id="route-presets" className="flex items-center gap-1.5 text-[10px] font-mono">
              <button 
                onClick={() => handlePresetSelect("ALPHA_SWEEP")}
                className="px-2 py-0.5 border border-slate-850 hover:border-violet-500/30 bg-slate-950 text-slate-300 rounded cursor-pointer transition-colors"
              >
                SWEEP A
              </button>
              <button 
                onClick={() => handlePresetSelect("BRAVO_VECTORS")}
                className="px-2 py-0.5 border border-slate-850 hover:border-violet-500/30 bg-slate-950 text-slate-300 rounded cursor-pointer transition-colors"
              >
                VECTORS B
              </button>
              <button 
                onClick={handleClearWaypoints}
                className="px-2 py-0.5 border border-red-500/20 bg-red-950/10 text-red-400 rounded cursor-pointer transition-colors hover:bg-red-950/20"
              >
                CLEAR
              </button>
            </div>
          </div>

          {/* SVG Map Layout Grid representing coordinates (scaled to width, height ~320px) */}
          <div className="h-[280px] bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden flex items-center justify-center">
            
            {/* Grid mesh */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c111d_1px,transparent_1px),linear-gradient(to_bottom,#0c111d_1px,transparent_1px)] bg-[size:20px_20px] opacity-80"></div>
            
            {/* Sector Circles Background */}
            <div className="absolute w-[180px] h-[180px] border border-dashed border-violet-500/10 rounded-full animate-pulse"></div>

            {/* Render Path SVG linking all coordination points sequential */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {plannerWaypoints.length > 1 && (
                <polyline
                  points={plannerWaypoints.map(w => `${w.x},${w.y}`).join(" ")}
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="0.8"
                  strokeDasharray="2,2"
                />
              )}
              {plannerWaypoints.length > 2 && (
                <polygon
                  points={plannerWaypoints.map(w => `${w.x},${w.y}`).join(" ")}
                  fill="rgba(139,92,246,0.03)"
                />
              )}

              {/* Render dynamic line looping to starting waypoint if more than 3 */}
              {plannerWaypoints.length > 2 && (
                <line 
                  x1={plannerWaypoints[plannerWaypoints.length - 1].x} 
                  y1={plannerWaypoints[plannerWaypoints.length - 1].y}
                  x2={plannerWaypoints[0].x}
                  y2={plannerWaypoints[0].y}
                  stroke="#8b5cf6"
                  strokeWidth="0.5"
                  strokeDasharray="1,1"
                />
              )}
            </svg>

            {/* Interactive waypoint nodes plotted inside the frame */}
            {plannerWaypoints.map((wp, idx) => (
              <div 
                key={idx}
                className="absolute z-10 -ml-2 -mt-2 focus:outline-none"
                style={{ left: `${wp.x}%`, top: `${wp.y}%` }}
              >
                <div className="relative group">
                  <div className="w-4 h-4 bg-violet-500 hover:bg-violet-400 rounded-full flex items-center justify-center text-[10px] text-slate-950 font-extrabold font-mono border border-white cursor-pointer shadow-md">
                    {idx + 1}
                  </div>
                  {/* Tooltip detail */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 text-[9px] font-mono text-white px-2 py-0.5 rounded whitespace-nowrap shadow opacity-80 group-hover:opacity-100 transition-opacity">
                    {wp.name} ({wp.x}x , {wp.y}y)
                  </div>
                </div>
              </div>
            ))}

            {plannerWaypoints.length === 0 && (
              <div className="text-center font-mono text-xs text-slate-500 relative z-20">
                No active waypoints planned. Click "SWEEP A" or use generator to plot coordinates.
              </div>
            )}
          </div>

          {/* New waypoint manual plotter controls form */}
          <form onSubmit={handleAddWaypoint} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950 p-4 border border-slate-850 rounded-lg">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[9px] font-mono text-slate-500 font-semibold tracking-wider">WAYPOINT / NODE ID</label>
              <input 
                type="text" 
                placeholder="e.g. Checkpoint Sentinel East" 
                value={newWpName}
                onChange={(e) => setNewWpName(e.target.value)}
                className="bg-slate-900 text-white placeholder-slate-700 border border-slate-800 focus:border-violet-400 rounded-md px-2 py-1.5 text-xs outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 font-semibold tracking-wider">X COORD (0-100)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={newWpx}
                onChange={(e) => setNewWpx(Number(e.target.value))}
                className="bg-slate-900 text-white border border-slate-800 focus:border-violet-400 rounded-md px-2 py-1.5 text-xs outline-none font-mono text-center"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono text-slate-500 font-semibold tracking-wider">Y COORD (0-100)</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={newWpy}
                onChange={(e) => setNewWpy(Number(e.target.value))}
                className="bg-slate-900 text-white border border-slate-800 focus:border-violet-400 rounded-md px-2 py-1.5 text-xs outline-none font-mono text-center"
              />
            </div>
            <div className="col-span-1 md:col-span-4 mt-1 flex justify-end">
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold tracking-wider rounded-md text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                Inject Coordinate Node
              </button>
            </div>
          </form>

        </div>

        {/* Real-time estimated analytics calculation panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-xl block grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-300 font-bold">Estimated Coverage Integrity</h4>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-violet-400 font-mono">{totalIntegrityScore}%</span>
              <div className="flex-1 bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div className="bg-violet-400 h-full transition-all" style={{ width: `${totalIntegrityScore}%` }}></div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Based on sector overlap coefficient &amp; 3D path coordinates.</p>
          </div>
          
          <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-800 md:pl-4 pt-3.5 md:pt-0">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-300 font-bold">Sector Dispatch Latency</h4>
            <div className="flex justify-between items-center bg-slate-950 p-2 border border-slate-850 rounded">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">Target ETA Profile</span>
              </div>
              <span className="text-sm font-bold font-mono text-white text-emerald-400">{estimatedLatency}</span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono">Simulated under local atmospheric RF interference values.</p>
          </div>
        </div>

      </div>

      {/* Grid Right: Active deployments checklist matrix & Sector 9 module (5/12 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Active Deployments roster module */}
        <div id="deployment-roster" className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">ACTIVE VECTOR ROSTER</h3>
            <span className="text-[11px] font-mono text-slate-400">SELECT TO VIEW UNIT PATH ASSIGNMENT</span>
          </div>

          {/* Unit Tab list selections */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            {units.slice(0, 3).map((unit) => {
              const isActive = activeUnitTab === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => setActiveUnitTab(unit.id)}
                  className={`py-2 text-center rounded border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-violet-500 text-slate-950 font-bold border-violet-400' 
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {unit.name.split(" ")[1]}
                </button>
              );
            })}
          </div>

          {/* Details on current Unit Tab */}
          <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-lg space-y-3.5 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-500 block">Assigned Officer</span>
                <span className="text-xs font-bold text-slate-200 font-mono">{currentSelectedUnitObj.officerName}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase text-slate-500 block">Status</span>
                <span className="text-xs font-bold font-mono text-emerald-400">{currentSelectedUnitObj.status}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-500 block">CURRENT SECTOR</span>
                <span className="text-slate-200">{currentSelectedUnitObj.location}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">ROUTE RISK COVERAGE</span>
                <span className="text-violet-400 font-bold">{currentSelectedUnitObj.routeCoverage}%</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2.5 border-t border-slate-900 text-xs font-mono">
              <span className="text-[9px] text-slate-500 block uppercase">Sector Waypoints Sequence</span>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {currentSelectedUnitObj.waypoints.map((wp, idx) => {
                  const isCurrent = idx === currentSelectedUnitObj.currentWaypointIndex;
                  return (
                    <div key={idx} className={`p-1.5 rounded flex justify-between items-center ${isCurrent ? 'bg-violet-950/40 text-violet-300 border border-violet-500/10 font-bold' : 'text-slate-400'}`}>
                      <span className="text-[11px] truncate flex items-center gap-1.5">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-violet-400 animate-ping' : 'bg-slate-700'}`}></span>
                        {idx + 1}. {wp.name}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500">{wp.x}x , {wp.y}y</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Path Calibrate CTA */}
            <div className="pt-2">
              <button
                onClick={() => onOptimizeRoute(currentSelectedUnitObj.id)}
                className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-200 font-mono hover:text-white rounded flex items-center justify-center gap-2 text-xs uppercase cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                CALIBRATE &amp; RECAST WAYPOINTS
              </button>
            </div>
          </div>

        </div>

        {/* Suggested Sector 9 recommendation module */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-[9px] font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-950/10 px-1.5 rounded uppercase">
            AI Advisory
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Suggested Sector 9 alignment</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Aegis spatial pathfinder identifies that inserting an auxiliary checkpoint along the southern border reduces response latent spikes significantly.
          </p>

          {!suggestedModeActive ? (
            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 font-mono">SECTOR-9 SWEEP IMPROVEMENT</span>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Integrates 4 coordinates near Gate B automatically.</p>
              </div>
              <button
                onClick={() => {
                  setSuggestedModeActive(true);
                  // Load preset coords onto Planner Waypoints!
                  setPlannerWaypoints([
                    { name: "Post Alpha Gate", x: 35, y: 20 },
                    { name: "Fence Gate B", x: 45, y: 32 },
                    { name: "S9 Segment Junction", x: 38, y: 48 },
                    { name: "Eastern Lockhouse", x: 50, y: 65 },
                    { name: "Sentinel Watch", x: 30, y: 50 }
                  ]);
                }}
                className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold uppercase rounded text-[10px] cursor-pointer"
              >
                APPLY ROUTE
              </button>
            </div>
          ) : (
            <div className="bg-violet-950/10 border border-violet-500/20 p-4 rounded-lg">
              <span className="text-xs font-bold text-violet-400 font-mono block">PROTOCOL APPLIED SUCCESSFULLY</span>
              <p className="text-[10px] text-slate-300 font-mono mt-1">
                Sector-9 sweep integrated. Matrix recalculated. Real-time path overlap score is now elevated to <b>98% Coverage</b>.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
