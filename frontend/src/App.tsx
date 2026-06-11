/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Radio, ShieldCheck, Activity, Map, 
  BarChart3, Cpu, Users, Layers, ExternalLink, LogOut, Navigation
} from "lucide-react";
import { ViewState, Incident, Alert, PatrolUnit } from "./types";
import { initialIncidents, initialAlerts, initialUnits } from "./data";

import { fetchCrimes, ingestSimulatedCrime, wsService, optimizeRoute } from "./api/apiClient";

// Sub component Imports
import SplashView from "./components/SplashView";
import LandingPage from "./components/LandingPage";
import CommandDashboard from "./components/CommandDashboard";
import IntelligenceAnalytics from "./components/IntelligenceAnalytics";
import TacticalPlanning from "./components/TacticalPlanning";
import SurveillanceHeatmap from "./components/SurveillanceHeatmap";
import MobileOfficerSimulator from "./components/MobileOfficerSimulator";
import AuditLogView from "./components/AuditLogView";

export default function App() {
  const [viewState, setViewState] = useState<ViewState>("LANDING");
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
        msg: "Assault reported near Vastrapur Lake. Dispatch requested immediately.",
        sec: "Vastrapur",
        cat: "assault",
        coords: [23.0398, 72.5281]
      },
      {
        msg: "Cyber fraud incident: Target duped via spoofed payment portal link.",
        sec: "Satellite",
        cat: "cybercrime",
        coords: [23.0045, 72.5845]
      },
      {
        msg: "Vehicle theft reported in commercial parking zone near SG Highway.",
        sec: "Thaltej",
        cat: "theft",
        coords: [23.0596, 72.5394]
      }
    ];

    const pick = alarmScenarios[Math.floor(Math.random() * alarmScenarios.length)];
    
    const record = {
      externalId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      type: pick.cat,
      location: { lat: pick.coords[0], lng: pick.coords[1] },
      address: `${pick.sec} (${pick.coords[0]}, ${pick.coords[1]})`,
      description: pick.msg,
      severity: Math.floor(6 + Math.random() * 4),
      source: pick.cat === "cybercrime" ? "cyber_branch" : "fir"
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
    setViewState("LANDING");
  };

  if (viewState === "LANDING") {
    return <LandingPage onEnterDashboard={() => setViewState("OPERATIONS")} />;
  }

  if (viewState === "SPLASH") {
    return <SplashView onInitialize={() => setViewState("OPERATIONS")} />;
  }

  return (
    <div id="application-container" className="min-h-screen bg-[#07111f] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-blue-500/30 selection:text-white">
      
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-64 bg-[#0b1320]/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-700/80 flex flex-col justify-between shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-2 p-6">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-6 mb-6">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-blue-300 font-bold uppercase leading-none mb-1">
                Ahmedabad Police
              </div>
              <h2 className="text-sm font-bold tracking-tight text-white font-sans">
                COMMAND CENTER
              </h2>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-widest font-bold block px-3 mb-3">
              Operations Menu
            </span>

            {[
              { id: "OPERATIONS", icon: Layers, label: "Operations" },
              { id: "SURVEILLANCE", icon: Cpu, label: "Live Map" },
              { id: "TACTICAL_PLAN", icon: Navigation, label: "Patrol Routing" },
              { id: "INTELLIGENCE", icon: BarChart3, label: "Analytics" },
              { id: "MOBILE_OFFICER", icon: Users, label: "Field Units" },
              { id: "AUDIT_LOGS", icon: ShieldAlert, label: "Audit Logs" }
            ].map((navItem) => {
              const Icon = navItem.icon;
              const isActive = viewState === navItem.id;
              return (
                <button
                  key={navItem.id}
                  onClick={() => setViewState(navItem.id as ViewState)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-blue-500/10 border border-blue-400/30 text-blue-200 shadow-[0_0_15px_rgba(37,99,235,0.1)] translate-x-1' 
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-blue-300" : "text-slate-500"}`} />
                  <span className={isActive ? "font-bold tracking-wide" : ""}>{navItem.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-slate-700/80 bg-[#0b1320]/35 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500">SEC:</span>
            <span className="text-slate-300 font-bold tracking-wider">GUJ-POLICE-2026</span>
          </div>

          <button
            onClick={handleResetStorage}
            className="w-full text-left px-4 py-2.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 rounded-xl flex items-center gap-3 text-sm font-medium cursor-pointer transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Reset Session</span>
          </button>
        </div>
      </aside>

      {/* ── Main Stage ── */}
      <main className="flex-1 flex flex-col max-w-full overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-900/20 blur-[120px] rounded-full pointer-events-none" />

        <header className="px-8 py-5 border-b border-slate-700/80 bg-[#07111f]/90 backdrop-blur-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-40 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-300/80 block mb-0.5 font-bold">Command Link Status</span>
              <h1 className="text-xs font-mono text-slate-300 flex items-center gap-2">
                AHMEDABAD POLICE ACTIVE <span className="opacity-40">|</span> PORT <b className="text-white">3000</b>
              </h1>
            </div>
          </div>

          <div id="perspective-selector" className="flex items-center bg-[#0b1320]/70 border border-slate-700/80 p-1 rounded-xl text-xs font-medium shadow-inner backdrop-blur-md">
            <button
              onClick={() => setViewState("OPERATIONS")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 uppercase tracking-widest font-bold text-[10px] ${
                viewState !== 'MOBILE_OFFICER' ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.25)]' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              Command View
            </button>
            <button
              onClick={() => setViewState("MOBILE_OFFICER")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 uppercase tracking-widest font-bold text-[10px] ${
                viewState === 'MOBILE_OFFICER' ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.25)]' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              Field Officer View
            </button>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1 overflow-y-auto w-full mx-auto custom-scrollbar relative z-10">
          
          {viewState === "OPERATIONS" && (
            <div className="animate-fade-in w-full h-full max-w-7xl mx-auto">
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
            <div className="animate-fade-in w-full h-full max-w-7xl mx-auto">
              <SurveillanceHeatmap
                alerts={alerts}
                onAckAlert={handleAckAlert}
                onDispatchAlertUnit={handleDispatchAlertUnit}
              />
            </div>
          )}

          {viewState === "TACTICAL_PLAN" && (
            <div className="animate-fade-in w-full h-full max-w-7xl mx-auto">
              <TacticalPlanning
                units={units}
                onOptimizeRoute={handleOptimizeRoute}
              />
            </div>
          )}

          {viewState === "INTELLIGENCE" && (
            <div className="animate-fade-in w-full h-full max-w-7xl mx-auto">
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
            <div className="animate-fade-in w-full h-full max-w-4xl mx-auto">
              <MobileOfficerSimulator
                onAddIncident={handleAddIncident}
                onAddAlert={handleAddAlert}
                alerts={alerts}
              />
            </div>
          )}



          {viewState === "AUDIT_LOGS" && (
            <div className="animate-fade-in w-full h-full max-w-7xl mx-auto">
              <AuditLogView />
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

