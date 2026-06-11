/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Radio, MapPin, Cpu, Users, BarChart3, ChevronRight, Activity } from "lucide-react";

interface SplashViewProps {
  onInitialize: () => void;
}

export default function SplashView({ onInitialize }: SplashViewProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initStage, setInitStage] = useState("System Offline");
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (!isInitializing) return;

    const stages = [
      "Authenticating Officer Credentials...",
      "Syncing Ahmedabad Sector Grid...",
      "Initializing Route Optimizer...",
      "Connecting to PCR Network...",
      "Establishing Field Officer Sync...",
      "Command Center Ready. Launching...",
    ];

    const timer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onInitialize();
          }, 300);
          return 100;
        }
        const stageIndex = Math.min(
          Math.floor((prev / 100) * stages.length),
          stages.length - 1
        );
        setInitStage(stages[stageIndex]);
        return prev + 2;
      });
    }, 40);

    return () => clearInterval(timer);
  }, [isInitializing, onInitialize]);

  return (
    <div
      id="splash-screen"
      className="min-h-screen bg-[#050B14] text-slate-100 flex flex-col justify-between p-6 md:p-12 font-sans overflow-y-auto"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono text-cyan-300 border border-blue-500/30 bg-blue-950/40 rounded">
              Gujarat Police
            </span>
            <span className="text-[10px] font-mono text-slate-500">GUJ-POLICE-2026</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            AHMEDABAD <span className="text-cyan-300 font-medium">COMMAND CENTER</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider font-mono text-slate-500">Operational Status</div>
            <div className="text-sm font-semibold font-mono text-green-400">● SYSTEMS ONLINE</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-cyan-300">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto my-8 md:my-14 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">

        {/* Left: Launch Panel */}
        <div className="md:col-span-7 space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Unified Police Command &amp; Control
            </h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              A real-time command suite for the Ahmedabad Police Department — covering tactical resource dispatch, crime intelligence analysis, optimal patrol routing, and field officer synchronization.
            </p>
          </div>

          {!isInitializing ? (
            <div className="space-y-4 pt-2">
              <button
                id="btn-initialize-system"
                onClick={() => setIsInitializing(true)}
                className="group relative px-8 py-4 bg-blue-600 hover:bg-cyan-500 active:bg-blue-700 text-white font-bold tracking-wider rounded-lg flex items-center gap-3 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:scale-[1.02] cursor-pointer"
              >
                <Activity className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                <span>INITIALIZE COMMAND CONSOLE</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>All systems operational. PCR network connected.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 max-w-md">
              <div className="flex justify-between items-center text-xs font-mono text-cyan-300">
                <span className="font-semibold uppercase tracking-wider">{initStage}</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#0B1220] rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-cyan-500 transition-all duration-75 shadow-lg shadow-blue-400/50"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-slate-500">
                Establishing secure link. Telemetry hooks active on port 3000.
              </p>
            </div>
          )}

          {/* Capability badges */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="flex gap-2.5">
              <div className="mt-1 text-cyan-300"><Radio className="w-4 h-4" /></div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Real-Time Dispatch</h4>
                <p className="text-[11px] text-slate-400">Live incident tracking and unit deployment.</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="mt-1 text-slate-400"><MapPin className="w-4 h-4" /></div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Sector Mapping</h4>
                <p className="text-[11px] text-slate-400">Ahmedabad zone coverage and threat overlays.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Architecture Nodes */}
        <div id="architecture-nodes" className="md:col-span-5 bg-[#0B1220] border border-slate-800 rounded-xl p-6 relative">
          <div className="absolute top-3 right-3 text-[9px] font-mono text-cyan-400/60 border border-blue-500/20 bg-blue-900/10 px-2 py-0.5 rounded">
            Live Network
          </div>

          {/* City image */}
          <div className="relative h-44 rounded-lg overflow-hidden border border-slate-800 mb-5 bg-[#050B14]">
            <img
              src="https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80"
              alt="Ahmedabad City"
              className="w-full h-full object-cover opacity-65 hover:scale-[1.03] transition-transform duration-700 select-none"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
            <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              <span className="text-[9px] font-mono font-bold text-blue-300 uppercase tracking-widest bg-[#050B14]/80 px-2 py-0.5 rounded border border-slate-800">
                AHMEDABAD · GUJARAT · INDIA
              </span>
            </div>
          </div>

          <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            System Architecture
          </h3>

          <div className="space-y-3 font-mono text-xs">
            {[
              { icon: Shield, label: "Operations Command", color: "text-cyan-300", status: "Online", statusColor: "text-green-400" },
              { icon: BarChart3, label: "Intelligence Analytics", color: "text-indigo-400", status: "Recharts Active", statusColor: "text-green-400" },
              { icon: Cpu, label: "Surveillance & Heatmap", color: "text-cyan-300", status: "98% Ready", statusColor: "text-cyan-300" },
              { icon: Users, label: "Field Officer Sync", color: "text-amber-500", status: "Mobile Ready", statusColor: "text-green-400" },
            ].map((node, idx) => (
              <div key={idx}>
                {idx > 0 && (
                  <div className="h-4 flex items-center pl-6">
                    <div className="w-0.5 h-full bg-slate-800 border-l border-slate-700"></div>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 bg-[#050B14] border border-slate-800 rounded hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <node.icon className={`w-3.5 h-3.5 ${node.color}`} />
                    <span className="text-slate-300">{node.label}</span>
                  </div>
                  <span className={`text-[10px] ${node.statusColor}`}>{node.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed font-mono">
            Ahmedabad Police Department · Unified Command System · Gujarat, India
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-800 pt-6 mt-4 gap-4 text-xs font-mono text-slate-500">
        <div>
          <span>© 2026 Ahmedabad Police Department. All Rights Reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>PORT: <span className="text-cyan-300 font-bold">3000</span></span>
          <span className="text-slate-700">|</span>
          <span>LATENCY: <span className="text-cyan-300">12ms</span></span>
          <span className="text-slate-700">|</span>
          <span>REGION: GUJARAT, IND</span>
        </div>
      </div>
    </div>
  );
}
