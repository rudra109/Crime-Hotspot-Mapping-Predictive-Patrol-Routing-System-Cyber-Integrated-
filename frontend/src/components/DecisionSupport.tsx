/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sliders, Zap, ShieldAlert, Activity, CheckCircle, BarChart3, Users,
  ArrowRight, RefreshCw, AlertTriangle, AlertOctagon, TrendingUp,
  Clock, MapPin, Compass, Percent, Heart, Shield, Ban, Star, Play
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  fetchDecisionProfiles,
  runDecisionSimulation,
  calculateResourcePlanning,
  fetchEfficiencyMetrics,
  applyTacticalRecommendation
} from "../api/apiClient";
import { Incident } from "../types";

interface DecisionSupportProps {
  incidents: Incident[];
  onDispatchUnit?: (unitId: string, incidentId: string) => void;
  onAddAlert?: (alert: any) => void;
  onRefreshData?: () => void;
}

export default function DecisionSupport({
  incidents,
  onDispatchUnit,
  onAddAlert,
  onRefreshData
}: DecisionSupportProps) {
  // Service profiles
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("RATHA_YATRA");
  const [crowdMult, setCrowdMult] = useState<number>(1.2);
  const [securityMult, setSecurityMult] = useState<number>(1.0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [applyLoading, setApplyLoading] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<string>("");

  // Resource Planning states
  const [unitsCount, setUnitsCount] = useState<number>(8);
  const [timeTarget, setTimeTarget] = useState<number>(5.0);
  const [coverageTarget, setCoverageTarget] = useState<number>(85);
  const [planResult, setPlanResult] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState<boolean>(false);

  // Efficiency metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);

  // Load initial configurations
  useEffect(() => {
    const loadInit = async () => {
      try {
        const scenarioProfiles = await fetchDecisionProfiles();
        setProfiles(scenarioProfiles);

        // Fetch metrics
        setMetricsLoading(true);
        const efficiencyMetrics = await fetchEfficiencyMetrics();
        setMetrics(efficiencyMetrics);
        setMetricsLoading(false);
      } catch (err) {
        console.error("Failed to load decision data:", err);
      }
    };
    loadInit();
  }, []);

  // Run initial simulation & planning on load/update
  useEffect(() => {
    if (selectedScenario) {
      handleRunSimulation();
    }
  }, [selectedScenario]);

  useEffect(() => {
    handleCalculatePlanning();
  }, [unitsCount, timeTarget, coverageTarget]);

  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const data = await runDecisionSimulation(selectedScenario, crowdMult, securityMult);
      setSimResult(data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleCalculatePlanning = async () => {
    setPlanLoading(true);
    try {
      const data = await calculateResourcePlanning(unitsCount, timeTarget, coverageTarget);
      setPlanResult(data);
    } catch (err) {
      console.error("Planning calculation failed:", err);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDeployTacticalPlan = async () => {
    if (!simResult) return;
    setApplyLoading(true);
    setApplySuccess("");
    try {
      // Map mock recommended dispatches to PCR-02 / PCR-04 units if applicable
      const recommendedDispatches = [
        { vehicleId: "PCR-02", sector: "CG Road", lat: 23.0242, lng: 72.5614 },
        { vehicleId: "PCR-04", sector: "Maninagar", lat: 22.9975, lng: 72.6020 }
      ];

      const res = await applyTacticalRecommendation({
        scenarioId: simResult.scenarioId,
        recommendedConstraints: simResult.recommendedConstraints || [],
        recommendedDispatches
      });

      if (res.success) {
        setApplySuccess(`Tactical deployment successful! Alert ID ${res.alertId} issued.`);
        // Propagate updates
        if (onRefreshData) onRefreshData();
        if (onAddAlert) {
          onAddAlert({
            id: res.alertId,
            type: "Critical",
            time: "Immediate",
            message: `[DEPLOYED] Tactical Plan active for ${simResult.name}. Constraints added.`,
            sector: "Vastrapur",
            status: "Acknowledged"
          });
        }
        setTimeout(() => setApplySuccess(""), 6000);
      }
    } catch (err) {
      console.error("Failed to deploy tactical plan:", err);
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-200 font-sans animate-fade-in pb-12 selection:bg-cyan-500/30">
      
      {/* ── Heading Banner ── */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0B1220]/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-lg gap-4">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-[#00FFA3] uppercase block mb-1">
            Tactical Module Phase 8
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#00FFA3]" />
            INTELLIGENT DECISION SUPPORT CONSOLE
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulate security scenarios, optimize patrol allocations, and evaluate response trade-offs with real-time confidence scores.
          </p>
        </div>
        <button
          onClick={async () => {
            handleRunSimulation();
            handleCalculatePlanning();
            const efficiencyMetrics = await fetchEfficiencyMetrics();
            setMetrics(efficiencyMetrics);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:border-slate-500 bg-slate-800/60 rounded-xl hover:bg-slate-800 transition-all text-xs font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Models
        </button>
      </div>

      {/* ── Left Column: Event Scenario Simulator ── */}
      <div className="lg:col-span-7 space-y-8">
        
        {/* Scenario Config Panel */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Event Scenario Simulator</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block mb-1.5 font-bold">
                Select Active Profile
              </label>
              <select
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs font-mono text-[#00FFA3] focus:border-cyan-500 focus:outline-none transition"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Parameter Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#121A2C]/65 border border-slate-800/80 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Crowd Density Multiplier</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{crowdMult.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={crowdMult}
                  onChange={(e) => setCrowdMult(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="bg-[#121A2C]/65 border border-slate-800/80 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Security Priority Multiplier</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{securityMult.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={securityMult}
                  onChange={(e) => setSecurityMult(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {simLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating Scenario Vectors...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Run Scenario Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Simulation Output Panel */}
        {simResult && (
          <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[9px] font-mono text-[#00FFA3] uppercase font-bold">Simulation Results</span>
                <h3 className="text-sm font-bold text-white">{simResult.name}</h3>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Confidence</span>
                <span className="text-base font-mono font-bold text-[#00FFA3]">{simResult.confidenceScore}%</span>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#121A2C]/50 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase block">Hazard Level</span>
                <span className={`text-xs font-bold font-mono tracking-wider block mt-1 ${
                  simResult.hazardLevel === 'CRITICAL' ? 'text-red-400' :
                  simResult.hazardLevel === 'HIGH' ? 'text-orange-400' :
                  'text-yellow-400'
                }`}>{simResult.hazardLevel}</span>
              </div>

              <div className="bg-[#121A2C]/50 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase block">Units Needed</span>
                <span className="text-sm font-bold font-mono text-white block mt-1">{simResult.targetUnits}</span>
              </div>

              <div className="bg-[#121A2C]/50 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase block">Units Available</span>
                <span className="text-sm font-bold font-mono text-white block mt-1">{simResult.availableUnits}</span>
              </div>

              <div className="bg-[#121A2C]/50 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[9px] font-mono text-slate-400 uppercase block">Resource Deficit</span>
                <span className={`text-sm font-bold font-mono block mt-1 ${simResult.resourceDeficit > 0 ? 'text-red-400' : 'text-[#00FFA3]'}`}>
                  {simResult.resourceDeficit}
                </span>
              </div>
            </div>

            {/* Sector Risk Multipliers */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2 font-bold">Sector Incident Spikes</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(simResult.sectorMultipliers || {}).map(([sector, val]: any) => (
                  <div key={sector} className="flex justify-between items-center bg-[#131B2E] border border-slate-800 p-3 rounded-xl">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {sector}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">+{((val - 1.0) * 100).toFixed(0)}% Risk</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Constraints */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-2 font-bold">Recommended Road Constraints</span>
              <div className="space-y-2.5">
                {simResult.recommendedConstraints?.map((c: any) => (
                  <div key={c.id} className="flex items-start gap-3 bg-[#131B2E] border border-slate-800/80 p-3 rounded-xl">
                    <div className="mt-0.5 h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{c.description}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5 uppercase tracking-wider">
                        Type: {c.type} | Radius: {c.radius}m | Severity: {c.severity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advisories */}
            <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] font-mono text-amber-400 uppercase block font-bold">Security Advisories</span>
              {simResult.advisories?.map((adv: string, idx: number) => (
                <div key={idx} className="text-xs text-amber-300/90 flex items-start gap-2">
                  <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></span>
                  {adv}
                </div>
              ))}
            </div>

            {/* Deploy strategy button */}
            <div className="pt-2">
              <button
                onClick={handleDeployTacticalPlan}
                disabled={applyLoading}
                className="w-full bg-[#00E5FF] hover:bg-[#00B4D8] text-[#080F1D] font-extrabold py-3.5 rounded-xl shadow-lg transition duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {applyLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deploying Tactical Plan...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 animate-pulse" />
                    DEPLOY RECOMMENDED TACTICAL PLAN
                  </>
                )}
              </button>
              {applySuccess && (
                <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center text-xs font-bold animate-pulse">
                  {applySuccess}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ── Right Column: Resource Allocation Planner & Metrics ── */}
      <div className="lg:col-span-5 space-y-8">
        
        {/* Resource Allocation Panel */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Resource Planner & Optimizer</h2>
          </div>

          <div className="space-y-4">
            {/* Active Units Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Active Patrol Units</span>
                <span className="text-xs font-mono font-bold text-white">{unitsCount} vehicles</span>
              </div>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={unitsCount}
                onChange={(e) => setUnitsCount(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Target Response Time Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Target Response Time</span>
                <span className="text-xs font-mono font-bold text-white">{timeTarget} mins</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="10.0"
                step="0.5"
                value={timeTarget}
                onChange={(e) => setTimeTarget(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Coverage Density Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Required Coverage Target</span>
                <span className="text-xs font-mono font-bold text-white">{coverageTarget}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                step="5"
                value={coverageTarget}
                onChange={(e) => setCoverageTarget(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          {/* Plan results display */}
          {planResult && (
            <div className="pt-6 border-t border-slate-800/80 mt-5 space-y-5">
              
              {/* Output meters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#121A2C]/50 border border-slate-800/80 p-3 rounded-2xl">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Est. Response Time</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-mono font-bold text-[#00FFA3]">{planResult.estimatedAvgResponseTime}</span>
                    <span className="text-[10px] text-slate-400 font-mono">mins</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-[#00FFA3] h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (6 / planResult.estimatedAvgResponseTime) * 80)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-[#121A2C]/50 border border-slate-800/80 p-3 rounded-2xl">
                  <div className="text-[9px] font-mono text-slate-500 uppercase">Projected Coverage</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-lg font-mono font-bold text-cyan-400">{planResult.estimatedCoveragePct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-500"
                      style={{ width: `${planResult.estimatedCoveragePct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tradeoffs List */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Plan Tradeoffs & Rationale</span>
                <div className="space-y-1.5">
                  {planResult.tradeoffs?.map((tr: any, idx: number) => (
                    <div key={idx} className={`text-xs p-2.5 rounded-xl border flex items-start gap-2 ${
                      tr.type === 'pro'
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'
                        : 'bg-red-500/5 border-red-500/10 text-red-300'
                    }`}>
                      <span className="mt-0.5 font-bold shrink-0">
                        {tr.type === 'pro' ? '✓' : '⚠'}
                      </span>
                      <span>{tr.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allocation Recommendations */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Suggested PCR Allocations</span>
                <div className="space-y-2">
                  {planResult.recommendedAssignments?.map((as: any, idx: number) => (
                    <div key={idx} className="bg-[#121A2C]/40 border border-slate-800 p-3 rounded-2xl flex justify-between items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-200">{as.sector}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{as.rationale}</div>
                      </div>
                      <div className="bg-[#1E293B] border border-slate-700 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-cyan-400 shrink-0">
                        {as.suggestedUnits} PCRs
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings Banners */}
              {planResult.warnings?.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono text-red-400 uppercase block font-bold">Resource Alerts</span>
                  {planResult.warnings.map((warn: string, idx: number) => (
                    <div key={idx} className="text-xs text-red-300/80 flex items-start gap-2 leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      {warn}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ── Bottom Section: Patrol Efficiency & Fleet Status Metrics ── */}
      {metrics && (
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Latency Area Chart */}
          <div className="bg-[#0B1220]/80 border border-slate-800 p-5 rounded-3xl shadow-lg flex flex-col h-[280px]">
            <span className="text-xs font-mono font-bold tracking-widest text-[#00FFA3] uppercase block mb-1">
              Response Performance
            </span>
            <h3 className="text-sm font-bold text-white mb-4">Historical Response Time (7d)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.responseTimeTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} fontClassName="font-mono" />
                  <YAxis stroke="#64748B" fontSize={10} fontClassName="font-mono" unit="m" />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "10px", fontSize: "10px" }} />
                  <Area type="monotone" dataKey="avgResponseTime" name="Avg Latency" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" />
                  <Area type="monotone" dataKey="targetTime" name="Target Target" stroke="#00FFA3" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Bar Chart */}
          <div className="bg-[#0B1220]/80 border border-slate-800 p-5 rounded-3xl shadow-lg flex flex-col h-[280px]">
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase block mb-1">
              Corridor Intercepts
            </span>
            <h3 className="text-sm font-bold text-white mb-4">Patrol Route Compliance by Sector</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.sectorCompliance} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="sector" stroke="#64748B" fontSize={8} />
                  <YAxis stroke="#64748B" fontSize={10} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "10px", fontSize: "10px" }} />
                  <Bar dataKey="complianceRate" name="Compliance %" fill="#00FFA3" radius={[4, 4, 0, 0]}>
                    {metrics.sectorCompliance?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.complianceRate >= 90 ? "#00FFA3" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fleet status Pie Chart */}
          <div className="bg-[#0B1220]/80 border border-slate-800 p-5 rounded-3xl shadow-lg flex flex-col h-[280px]">
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase block mb-1">
              Roster Availability
            </span>
            <h3 className="text-sm font-bold text-white mb-4">Patrol Fleet Status Allocation</h3>
            <div className="flex-1 w-full min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.fleetStatusBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {metrics.fleetStatusBreakdown?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "10px", fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend Overlay */}
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-4 flex-wrap px-4">
                {metrics.fleetStatusBreakdown?.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 font-mono">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
