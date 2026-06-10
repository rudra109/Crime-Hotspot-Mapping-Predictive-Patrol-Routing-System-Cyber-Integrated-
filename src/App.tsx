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

// Sub component Imports
import SplashView from "./components/SplashView";
import CommandDashboard from "./components/CommandDashboard";
import IntelligenceAnalytics from "./components/IntelligenceAnalytics";
import TacticalPlanning from "./components/TacticalPlanning";
import SurveillanceHeatmap from "./components/SurveillanceHeatmap";
import MobileOfficerSimulator from "./components/MobileOfficerSimulator";
import DroneControl from "./components/DroneControl";
import SecureComms from "./components/SecureComms";

export default function App() {
  // Global States (synchronized across views via standard LocalStorage persistence)
  const [viewState, setViewState] = useState<ViewState>(() => {
    const saved = localStorage.getItem("aegis_view_state");
    return (saved as ViewState) || "SPLASH";
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const saved = localStorage.getItem("aegis_incidents");
    return saved ? JSON.parse(saved) : initialIncidents;
  });

  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = localStorage.getItem("aegis_alerts");
    return saved ? JSON.parse(saved) : initialAlerts;
  });

  const [units, setUnits] = useState<PatrolUnit[]>(() => {
    const saved = localStorage.getItem("aegis_units");
    return saved ? JSON.parse(saved) : initialUnits;
  });

  // Persist state blocks
  useEffect(() => {
    localStorage.setItem("aegis_view_state", viewState);
  }, [viewState]);

  useEffect(() => {
    localStorage.setItem("aegis_incidents", JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem("aegis_alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("aegis_units", JSON.stringify(units));
  }, [units]);

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

  const handleOptimizeRoute = (unitId: string) => {
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) {
        // Shuffle waypoint nodes slightly to represent computation loop
        const shuffledWps = [...u.waypoints];
        if (shuffledWps.length > 2) {
          const first = shuffledWps.shift()!;
          shuffledWps.push(first);
        }
        return {
          ...u,
          waypoints: shuffledWps,
          routeCoverage: Math.min(u.routeCoverage + 8, 98),
          status: "Patrol"
        };
      }
      return u;
    }));

    // Alert dispatch confirmations
    const confirmationAlert: Alert = {
      id: `ALT-OPT-${Date.now()}`,
      type: "Info",
      time: "Immediate UTC",
      message: `ROUTE RE-ALIGNED: Autonomous vector calculations completed for ${units.find(u => u.id === unitId)?.name || 'unit'}.`,
      sector: units.find(u => u.id === unitId)?.location || "HQ",
      status: "Acknowledged"
    };
    setAlerts(prev => [...prev, confirmationAlert]);
  };

  // Simulate random sensor activity to make application feel highly interactive and functional
  const handleSimulateAlarm = () => {
    const alarmScenarios = [
      {
        msg: "Perimeter Alert: Microphonic vibration detected on Hangar Fence Sector 4C.",
        sec: "Sector 4C",
        cat: "Intrusion" as const
      },
      {
        msg: "RF Spectral Warning: Broad signal jamming interference on backup sub-band.",
        sec: "Sector 3B",
        cat: "Comms Jamming" as const
      },
      {
        msg: "Biometric Lockdown: Unauthorized badge swipe sequence at perimeter checkpoint.",
        sec: "Sector 9A",
        cat: "Biometric Alarm" as const
      }
    ];

    const pick = alarmScenarios[Math.floor(Math.random() * alarmScenarios.length)];
    const id = `INC-${Math.floor(1000 + Math.random() * 9000)}`;

    const generatedIncident: Incident = {
      id,
      category: pick.cat,
      location: `${pick.sec} (Grid Center)`,
      coordinates: pick.sec === "Sector 4C" ? [60.2, 25.1] : pick.sec === "Sector 3B" ? [22.1, 78.4] : [87.5, 54.2],
      status: "Assessing",
      description: pick.msg,
      timestamp: "Immediate UTC",
      reportedBy: "S.H.I.E.L.D Field Scanner Core",
      isHighPriority: Math.random() > 0.4,
      attachmentsCount: 1,
      threatIndex: Math.floor(45 + Math.random() * 50)
    };

    setIncidents(prev => [generatedIncident, ...prev]);

    const companionAlert: Alert = {
      id: `ALT-SIM-${Date.now()}`,
      type: generatedIncident.isHighPriority ? "Critical" : "Warning",
      message: pick.msg,
      time: "Immediate UTC",
      sector: pick.sec,
      status: "Pending",
      incidentId: id
    };
    setAlerts(prev => [...prev, companionAlert]);
  };

  // Quick reset to clear local state to default preset
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
    <div id="application-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Immersive Left Sidebar Navigation (Desktop version) */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-805/60 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-1.5 p-5">
          {/* Corporate Header */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-4">
            <div className="h-8.5 w-8.5 rounded bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] font-mono tracking-widest text-teal-400 font-bold uppercase leading-none">
                Aegis Systems
              </div>
              <h2 className="text-sm font-extrabold tracking-tight text-white font-display mt-0.5">
                CRITICAL COMMAND
              </h2>
            </div>
          </div>

          {/* Nav Links list */}
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-mono text-slate-500 tracking-wider font-semibold block px-2.5 mb-2">
              Command Screens
            </span>

            {/* Tab 1: Operations */}
            <button
              onClick={() => setViewState("OPERATIONS")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "OPERATIONS" 
                  ? 'bg-slate-950 border border-teal-500/30 text-teal-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Layers className="w-4 h-4 text-teal-500" />
              <span>Operations Console</span>
            </button>

            {/* Tab 2: Surveillance Heatmap */}
            <button
              onClick={() => setViewState("SURVEILLANCE")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "SURVEILLANCE" 
                  ? 'bg-slate-950 border border-pink-500/30 text-pink-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Cpu className="w-4 h-4 text-pink-400" />
              <span>Surveillance Mesh</span>
            </button>

            {/* Tab 3: Route Vectors */}
            <button
              onClick={() => setViewState("TACTICAL_PLAN")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "TACTICAL_PLAN" 
                  ? 'bg-slate-950 border border-teal-550 text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Navigation className="w-4 h-4 text-teal-400" />
              <span>Optimal Routing</span>
            </button>

            {/* Tab 4: Analytics */}
            <button
              onClick={() => setViewState("INTELLIGENCE")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "INTELLIGENCE" 
                  ? 'bg-slate-950 border border-sky-505 text-sky-400 font-bold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Intelligence Matrix</span>
            </button>

            {/* Tab 5: Mobile simulator */}
            <button
              onClick={() => setViewState("MOBILE_OFFICER")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "MOBILE_OFFICER" 
                  ? 'bg-slate-950 border border-amber-500/30 text-amber-500 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Field Officer Sync</span>
            </button>

            {/* Tab 6: Drone Core */}
            <button
              onClick={() => setViewState("DRONE_CONTROL")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "DRONE_CONTROL" 
                  ? 'bg-slate-950 border border-cyan-500/30 text-cyan-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Compass className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Drone Fleet Core</span>
            </button>

            {/* Tab 7: Secure Comms */}
            <button
              onClick={() => setViewState("SECURE_COMMS")}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-xs font-mono transition-all cursor-pointer ${
                viewState === "SECURE_COMMS" 
                  ? 'bg-slate-950 border border-emerald-500/30 text-emerald-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-950/40'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Secure Comms</span>
            </button>
          </div>
        </div>

        {/* Action Panel Footer S.H.I.E.L.D Challenge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3 font-mono text-xs">
          <div className="truncate text-slate-500">
            SEC: <b className="text-slate-400 font-semibold">KANAD-SHIELD-2026</b>
          </div>

          <button
            onClick={handleResetStorage}
            className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-950/10 hover:text-red-300 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </aside>

      {/* Main stage with unified top coordinates / indicators and live viewport wrapper */}
      <main className="flex-1 flex flex-col max-w-full overflow-hidden">
        
        {/* Universal System Banner Header */}
        <header className="p-5 border-b border-slate-805/60 bg-slate-905 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">System Connection Status</span>
              <h1 className="text-xs font-mono text-slate-200">
                AEGIS CONTROL ACTIVE · PORT <b className="text-teal-400">3000</b>
              </h1>
            </div>
          </div>

          {/* Quick Perspective Selectors Ribbon */}
          <div id="perspective-selector" className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-0.5 rounded-lg text-[10px] font-mono">
            <button
              onClick={() => setViewState("OPERATIONS")}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                viewState !== 'MOBILE_OFFICER' ? 'bg-teal-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
            >
              COMMANDER CONSOLE (DESKTOP)
            </button>
            <button
              onClick={() => setViewState("MOBILE_OFFICER")}
              className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                viewState === 'MOBILE_OFFICER' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'text-slate-400 hover:text-white'
              }`}
            >
              FIELD OFFICER UNIT (MOBILE APP)
            </button>
          </div>
        </header>

        {/* Primary View Router Stage */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          
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
                  // Find first incident matching sector, then trigger dispatch with Alpha-7
                  const match = incidents.find(i => i.location.includes(sec));
                  if (match) {
                    handleDispatchUnit("UA-7", match.id);
                  } else {
                    // Create an incident on the fly to support dispatch loop
                    const freshId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
                    const generatedInc: Incident = {
                      id: freshId,
                      category: "Intrusion",
                      location: `${sec} Geo Grid`,
                      coordinates: [45, 32],
                      status: "Dispatched",
                      description: `Forced tactical reinforcement dispatched from Hotspots panel to ${sec}.`,
                      timestamp: "Immediate UTC",
                      reportedBy: "Commander Intelligence Overlay",
                      isHighPriority: true,
                      attachmentsCount: 0,
                      threatIndex: 78
                    };
                    setIncidents(prev => [generatedInc, ...prev]);
                    handleDispatchUnit("UA-7", freshId);
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

        </div>

      </main>

    </div>
  );
}
