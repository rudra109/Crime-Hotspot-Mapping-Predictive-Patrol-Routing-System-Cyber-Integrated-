/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Radio, ShieldCheck, Activity, Map, 
  BarChart3, Cpu, Users, Layers, ExternalLink, LogOut, Navigation,
  Compass, Lock
} from "lucide-react";
import { ViewState, Incident, Alert, PatrolUnit } from "./types";
import { initialIncidents, initialAlerts, initialUnits } from "./data";

import { fetchCrimes, ingestSimulatedCrime, wsService, optimizeRoute } from "./api/apiClient";

// Sub component Imports
import SplashView from "./components/SplashView";
import CommandDashboard from "./components/CommandDashboard";
import IntelligenceAnalytics from "./components/IntelligenceAnalytics";
import TacticalPlanning from "./components/TacticalPlanning";
import SurveillanceHeatmap from "./components/SurveillanceHeatmap";
import MobileOfficerSimulator from "./components/MobileOfficerSimulator";
import DroneControl from "./components/DroneControl";
import SecureComms from "./components/SecureComms";
import AuditLogView from "./components/AuditLogView";

export default function App() {
  const [viewState, setViewState] = useState<ViewState>("SPLASH");
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [units, setUnits] = useState<PatrolUnit[]>(initialUnits);

  // Fetch initial data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const liveCrimes = await fetchCrimes();
        if (liveCrimes && liveCrimes.length > 0) {
          setIncidents(liveCrimes);
        }
      } catch (err) {
        console.error("Failed to fetch crimes from API:", err);
      }
    };
    loadData();

    // Socket.IO Integration for Real-Time Updates
    wsService.onNewCrime((crimeData) => {
      // Refresh list
      loadData();
    });

    return () => wsService.disconnect();
  }, []);

  // Command handlers
  const handleDispatchUnit = (unitId: string, incidentId: string) => {
    const targetIncident = incidents.find(i => i.id === incidentId);
    if (!targetIncident) return;

    setUnits(prev => prev.map(unit => {
      if (unit.id === unitId) {
        return {
          ...unit,
          status: "Moving",
          location: targetIncident.location.split(" ")[0],
          eta: "04:25 UTC",
          routeCoverage: 91
        };
      }
      return unit;
    }));

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, status: "Dispatched" };
      }
      return inc;
    }));

    // Record an audit log
    const updatedAlert: Alert = {
      id: `ALT-DISP-${Date.now()}`,
      type: "Info",
      time: "Immediate UTC",
      message: `DISPATCH RESOLVED: Roster assigned ${units.find(u => u.id === unitId)?.name || 'Support'} to ${targetIncident.category} emergency.`,
      sector: targetIncident.location.split(" ")[0],
      status: "Acknowledged"
    };
    setAlerts(prev => [...prev, updatedAlert]);
  };

  const handleAddIncident = (newInc: Incident) => {
    setIncidents(prev => [newInc, ...prev]);
  };

  const handleAddAlert = (newAlert: Alert) => {
    setAlerts(prev => [...prev, newAlert]);
  };

  const handleAckAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        return { ...alert, status: "Acknowledged" };
      }
      return alert;
    }));
  };

  const handleDispatchAlertUnit = (alertId: string, sector: string) => {
    // Ack alert and dispatch oldest standby unit to sector
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        return { ...alert, status: "Dispatched" };
      }
      return alert;
    }));

    setUnits(prev => {
      let dispatchedOne = false;
      return prev.map(u => {
        if (!dispatchedOne && (u.status === "Patrol" || u.status === "On Duty")) {
          dispatchedOne = true;
          return {
            ...u,
            status: "Alert",
            location: sector,
            routeCoverage: 95
          };
        }
        return u;
      });
    });
  };

  const handleOptimizeRoute = async (unitId: string) => {
    try {
      const unit = units.find(u => u.id === unitId);
      if (!unit) return;

      const startLocation = { address: unit.location };
      const hotspots = incidents
        .filter(i => i.status !== 'Resolved' && i.status !== 'Dispatched')
        .map(i => ({ 
          address: i.location, 
          priority: i.threatIndex 
        }));

      const optimizedData = await optimizeRoute(startLocation, hotspots);
      const optimizedPath = optimizedData.optimized_path || optimizedData.waypoints || [];
      const totalDistance = optimizedData.total_distance ?? optimizedData.distance_km ?? 0;

      setUnits(prev => prev.map(u => {
        if (u.id === unitId) {
          const updatedWaypoints = optimizedPath.map((loc: any, idx: number) => ({
            name: typeof loc === "string" ? loc : `${loc.lat ?? "?"}, ${loc.lng ?? "?"}`,
            x: 20 + (idx * 10), 
            y: 30 + (idx * 10)
          }));

          return {
            ...u,
            waypoints: updatedWaypoints.length > 0 ? updatedWaypoints : u.waypoints,
            routeCoverage: Math.min(u.routeCoverage + 15, 98),
            status: "Patrol"
          };
        }
        return u;
      }));

      const confirmationAlert: Alert = {
        id: `ALT-OPT-${Date.now()}`,
        type: "Info",
        time: "Immediate UTC",
        message: `ML ROUTE RE-ALIGNED: Engine completed vectors for ${unit.name}. Distance: ${Number(totalDistance).toFixed(2)}km.`,
        sector: unit.location || "HQ",
        status: "Acknowledged"
      };
      setAlerts(prev => [...prev, confirmationAlert]);
    } catch (err) {
      console.error("Route Optimization failed:", err);
    }
  };

  const handleSimulateAlarm = async () => {
    const alarmScenarios = [
      {
        msg: "Perimeter Alert: Microphonic vibration detected on Hangar Fence Sector 4C.",
        sec: "Sector 4C",
        cat: "intrusion"
      },
      {
        msg: "RF Spectral Warning: Broad signal jamming interference on backup sub-band.",
        sec: "Sector 3B",
        cat: "cybercrime"
      },
      {
        msg: "Biometric Lockdown: Unauthorized badge swipe sequence at perimeter checkpoint.",
        sec: "Sector 9A",
        cat: "fraud"
      }
    ];

    const pick = alarmScenarios[Math.floor(Math.random() * alarmScenarios.length)];
    const coords = pick.sec === "Sector 4C" ? [60.2, 25.1] : pick.sec === "Sector 3B" ? [22.1, 78.4] : [87.5, 54.2];
    
    const record = {
      externalId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      type: pick.cat,
      location: { lng: coords[0], lat: coords[1] },
      address: pick.sec,
      description: pick.msg,
      severity: Math.floor(6 + Math.random() * 4)
    };

    try {
      await ingestSimulatedCrime(record);
    } catch (err) {
      console.error("Failed to ingest simulated alarm:", err);
    }
  };

  const handleResetStorage = () => {
    localStorage.removeItem("aegis_view_state");
    localStorage.removeItem("aegis_incidents");
    localStorage.removeItem("aegis_alerts");
    localStorage.removeItem("aegis_units");
    setIncidents(initialIncidents);
    setAlerts(initialAlerts);
    setUnits(initialUnits);
    setViewState("SPLASH");
  };

  if (viewState === "SPLASH") {
    return <SplashView onInitialize={() => setViewState("OPERATIONS")} />;
  }

  return (
    <div id="application-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500 selection:text-slate-950">
      
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1.5 p-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
            <div className="h-8 w-8 rounded bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-mono tracking-widest text-blue-400 font-bold uppercase leading-none">
                Ahmedabad Police
              </div>
              <h2 className="text-sm font-extrabold tracking-tight text-white font-display mt-0.5">
                COMMAND CENTER
              </h2>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider font-semibold block px-2.5 mb-2">
              Command Screens
            </span>

            <button
              onClick={() => setViewState("OPERATIONS")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "OPERATIONS" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Operations Console</span>
            </button>

            <button
              onClick={() => setViewState("SURVEILLANCE")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "SURVEILLANCE" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Surveillance Mesh</span>
            </button>

            <button
              onClick={() => setViewState("TACTICAL_PLAN")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "TACTICAL_PLAN" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>Optimal Routing</span>
            </button>

            <button
              onClick={() => setViewState("INTELLIGENCE")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "INTELLIGENCE" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Intelligence Matrix</span>
            </button>

            <button
              onClick={() => setViewState("MOBILE_OFFICER")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "MOBILE_OFFICER" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-500 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              <span>Field Officer Sync</span>
            </button>

            <button
              onClick={() => setViewState("DRONE_CONTROL")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "DRONE_CONTROL" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Drone Fleet Core</span>
            </button>

            <button
              onClick={() => setViewState("SECURE_COMMS")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "SECURE_COMMS" 
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Secure Comms</span>
            </button>

            <button
              onClick={() => setViewState("AUDIT_LOGS")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "AUDIT_LOGS"
                  ? 'bg-slate-950 border border-blue-500/30 text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              <span>Audit Logs</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex flex-col gap-3 font-mono text-xs">
          <div className="truncate text-slate-500">
            SEC: <b className="text-slate-400 font-semibold">GUJ-POLICE-2026</b>
          </div>

          <button
            onClick={handleResetStorage}
            className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col max-w-full overflow-hidden">
        
        <header className="p-5 border-b border-slate-800 bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">System Connection Status</span>
              <h1 className="text-xs font-mono text-slate-200">
                AHMEDABAD POLICE ACTIVE · PORT <b className="text-blue-400">3000</b>
              </h1>
            </div>
          </div>

          <div id="perspective-selector" className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-[10px] font-mono">
            <button
              onClick={() => setViewState("OPERATIONS")}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                viewState !== 'MOBILE_OFFICER' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
            >
              COMMANDER CONSOLE (DESKTOP)
            </button>
            <button
              onClick={() => setViewState("MOBILE_OFFICER")}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                viewState === 'MOBILE_OFFICER' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
            >
              FIELD OFFICER UNIT (MOBILE APP)
            </button>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto bg-slate-950">
          
          {viewState === "OPERATIONS" && (
            <div className="animate-fade-in">
              <CommandDashboard
                incidents={incidents}
                alerts={alerts}
                units={units}
                onDispatchUnit={handleDispatchUnit}
                onAddIncident={handleAddIncident}
                onAckAlert={handleAckAlert}
                onSimulateAlarm={handleSimulateAlarm}
              />
            </div>
          )}

          {viewState === "SURVEILLANCE" && (
            <div className="animate-fade-in">
              <SurveillanceHeatmap
                alerts={alerts}
                onAckAlert={handleAckAlert}
                onDispatchAlertUnit={handleDispatchAlertUnit}
              />
            </div>
          )}

          {viewState === "TACTICAL_PLAN" && (
            <div className="animate-fade-in">
              <TacticalPlanning
                units={units}
                onOptimizeRoute={handleOptimizeRoute}
              />
            </div>
          )}

          {viewState === "INTELLIGENCE" && (
            <div className="animate-fade-in">
              <IntelligenceAnalytics
                incidents={incidents}
                onDeployUnitFromHotspot={(sec) => {
                  const match = incidents.find(i => i.location.includes(sec));
                  if (match) {
                    handleDispatchUnit("P001", match.id);
                  } else {
                    const freshId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
                    const generatedInc: Incident = {
                      id: freshId,
                      category: "Patrol Request",
                      location: `${sec}`,
                      coordinates: [23.0225, 72.5714],
                      status: "Dispatched",
                      description: `Tactical reinforcement dispatched.`,
                      timestamp: "Immediate",
                      reportedBy: "Commander",
                      isHighPriority: true,
                      attachmentsCount: 0,
                      threatIndex: 78
                    };
                    setIncidents(prev => [generatedInc, ...prev]);
                    handleDispatchUnit("P001", freshId);
                  }
                }}
              />
            </div>
          )}

          {viewState === "MOBILE_OFFICER" && (
            <div className="animate-fade-in">
              <MobileOfficerSimulator
                onAddIncident={handleAddIncident}
                onAddAlert={handleAddAlert}
                alerts={alerts}
              />
            </div>
          )}

          {viewState === "DRONE_CONTROL" && (
            <div className="animate-fade-in">
              <DroneControl />
            </div>
          )}

          {viewState === "SECURE_COMMS" && (
            <div className="animate-fade-in">
              <SecureComms />
            </div>
          )}

          {viewState === "AUDIT_LOGS" && (
            <div className="animate-fade-in">
              <AuditLogView />
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
