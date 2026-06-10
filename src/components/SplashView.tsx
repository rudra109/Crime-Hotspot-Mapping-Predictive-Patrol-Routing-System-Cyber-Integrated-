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
      "Securing Link to S.H.I.E.L.D Core...",
      "Synchronizing Sector 7G Thermal Array...",
      "Initializing Route Optimizer AI...",
      "Calibrating RF Interference Monitors...",
      "Establishing Biometric Field Sync...",
      "Tactical Link Ready. Launching..."
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
        
        // Update staging message proportionally
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

  const handleStart = () => {
    setIsInitializing(true);
  };

  return (
    <div id="splash-screen" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 font-sans overflow-y-auto selection:bg-teal-500 selection:text-slate-900">
      {/* Top Header Grid */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-mono text-teal-400 border border-teal-500/30 bg-teal-950/40 rounded">
              Secure Protocol
            </span>
            <span className="text-[10px] font-mono text-slate-500">SYS_V4.2.0_LIVE</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-sans text-white">
            AEGIS <span className="text-teal-400 font-medium">TACTICAL CONTROL</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider font-mono text-slate-500">Operational Grid</div>
            <div className="text-sm font-semibold font-mono text-slate-300">KANAD-SHIELD-2026</div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-teal-950/50 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Shield className="w-5 h-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto my-8 md:my-14 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Column: Concept Text & Launcher */}
        <div className="md:col-span-7 space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              The Next-Gen Command &amp; Control Shield
            </h2>
            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              A highly resilient, multi-perspective command suite engineered for tactical resource coordination, threat intelligence analysis, optimal path planning, and real-time biometric field synchronizations.
            </p>
          </div>

          {!isInitializing ? (
            <div className="space-y-4 pt-2">
              <button
                id="btn-initialize-system"
                onClick={handleStart}
                className="group relative px-8 py-4 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold tracking-wider rounded-lg flex items-center gap-3 transition-all duration-300 shadow-lg shadow-teal-500/20 hover:scale-[1.02] cursor-pointer"
              >
                <Activity className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                <span>INITIALIZE COMMAND CONSOLE</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>All telemetry pipelines are green. System ready.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2 max-w-md">
              <div className="flex justify-between items-center text-xs font-mono text-teal-400">
                <span className="font-semibold uppercase tracking-wider">{initStage}</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-teal-400 transition-all duration-75 shadow-lg shadow-teal-400/50"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-[10px] font-mono text-slate-500">
                Bypassing proxy. Dynamic telemetry hooks established on port 3000.
              </p>
            </div>
          )}

          {/* Core Capability Badges */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
            <div className="flex gap-2.5">
              <div className="mt-1 text-teal-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">99.8% Intel Fidelity</h4>
                <p className="text-[11px] text-slate-400">Sensor mesh aggregation delivers reliable threat data.</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="mt-1 text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Dynamic Sector Mapping</h4>
                <p className="text-[11px] text-slate-400">Adaptive spatial analysis with customizable path nodes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Node Layout / Tech Architecture Grid */}
        <div id="architecture-nodes" className="md:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative">
          <div className="absolute top-3 right-3 text-[9px] font-mono text-teal-500/60 border border-teal-500/20 bg-teal-900/10 px-2 py-0.5 rounded">
            Live Stream Hook
          </div>

          {/* Interactive Satellite Command Map Viewport */}
          <div className="relative h-44 rounded-lg overflow-hidden border border-slate-800 mb-5 bg-slate-950">
            <img 
              src="20.png" 
              alt="Aegis Core Grid telemetry mesh" 
              className="w-full h-full object-cover opacity-65 hover:scale-[1.03] transition-transform duration-700 select-none"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // High-fidelity fallback in case 20.png is not loaded in parent public context yet
                e.currentTarget.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
            <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-widest bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                ORBITAL TELEMETRY FEED (ACTIVE)
              </span>
            </div>
          </div>

          <h3 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
            Node Architecture Overview
          </h3>

          <div className="space-y-3 font-mono text-xs">
            {/* Visual node 1 */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700/80 transition-colors">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-300">Operations Command</span>
              </div>
              <span className="text-[10px] text-emerald-400">Online</span>
            </div>

            {/* Visual Connectors */}
            <div className="h-4 flex items-center pl-6">
              <div className="w-0.5 h-full bg-slate-800 border-dashed border-l border-slate-700"></div>
            </div>

            {/* Visual node 2 */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700/80 transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">Intelligence Analytics</span>
              </div>
              <span className="text-[10px] text-emerald-400">Recharts Array</span>
            </div>

            {/* Visual Connectors */}
            <div className="h-4 flex items-center pl-6">
              <div className="w-0.5 h-full bg-slate-800 border-dashed border-l border-slate-700"></div>
            </div>

            {/* Visual node 3 */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700/80 transition-colors">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-slate-300">Surveillance &amp; Paths</span>
              </div>
              <span className="text-[10px] text-indigo-400">98% Risk Ready</span>
            </div>

            {/* Visual Connectors */}
            <div className="h-4 flex items-center pl-6 font-bold text-slate-700">
              <div className="w-0.5 h-full bg-slate-800 border-dashed border-l border-slate-700"></div>
            </div>

            {/* Visual node 4 */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded hover:border-slate-700/80 transition-colors">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-slate-300">Officer Field Sync (Mobile)</span>
              </div>
              <span className="text-[10px] text-teal-400">Virtual Dev Ready</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/60 text-[11px] text-slate-500 leading-relaxed font-mono">
            Designed for secure sandboxed systems. Click the launcher or top navigation once ready to explore high-impact dashboard profiles.
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-800/60 pt-6 mt-4 gap-4 text-xs font-mono text-slate-500">
        <div>
          <span>© 2026 Aegis Global Guard. Secure Workspace.</span>
        </div>
        <div className="flex items-center gap-4">
          <span>PORT: <span className="text-teal-400 font-bold">3000</span></span>
          <span className="text-slate-700">|</span>
          <span>LATENCY: <span className="text-teal-400">12ms</span></span>
          <span className="text-slate-700">|</span>
          <span>GEO: US-WEST</span>
        </div>
      </div>
    </div>
  );
}
