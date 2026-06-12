/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TacticalPlanning — Phase 4 Patrol Route Optimization
 * Features:
 *  1. Live GPS vehicle tracking (real-time simulated positions from backend)
 *  2. Turn-by-turn navigation display
 *  3. Route acknowledgment / rejection from officer device
 *  4. Route constraints editor (road closures, curfews, weather, availability)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Navigation, RefreshCw, MapPin, AlertTriangle, Activity,
  Flame, CheckCircle2, Clock, Route, Zap, ShieldAlert, Plus, X,
  Satellite, CloudRain, Construction, Ban, Shield, ChevronRight,
  Wifi, WifiOff, ThumbsUp, ThumbsDown, ArrowRight, Radar, Signal
} from "lucide-react";
import { PatrolUnit } from "../types";
import { crimeHotspots } from "../data";
import {
  fetchVehiclePositions,
  fetchPatrolConstraints,
  toggleConstraint,
  assignPatrolRoute,
  acknowledgePatrolRoute,
  progressPatrolRoute,
  fetchAllPatrolRoutes,
  upsertConstraint,
} from "../api/apiClient";

const getL = () => (window as any).L;

interface TacticalPlanningProps {
  units: PatrolUnit[];
  onOptimizeRoute: (unitId: string) => void;
}

// ── OSRM road router ─────────────────────────────────────────────────────────
async function fetchOsrmRoute(coordinates: [number, number][]): Promise<{
  geometry: [number, number][];
  distanceKm: number;
  durationMin: number;
  steps: any[];
} | null> {
  if (coordinates.length < 2) return null;
  const coordStr = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    const geometry: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    const steps = route.legs?.flatMap((leg: any) => leg.steps || []) || [];
    return { geometry, distanceKm: route.distance / 1000, durationMin: route.duration / 60, steps };
  } catch {
    return null;
  }
}

const CONSTRAINT_ICONS: Record<string, any> = {
  road_closure: Ban,
  curfew: Shield,
  weather: CloudRain,
  vip_area: ShieldAlert,
  construction: Construction,
};

const CONSTRAINT_COLORS: Record<string, string> = {
  road_closure: "#ef4444",
  curfew: "#a855f7",
  weather: "#3b82f6",
  vip_area: "#f59e0b",
  construction: "#f97316",
};

const STATUS_COLORS: Record<string, string> = {
  en_route: "#f59e0b",
  on_scene: "#ef4444",
  idle: "#6b7280",
  offline: "#374151",
};

const ROUTE_STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  acknowledged: "#22c55e",
  in_progress: "#f59e0b",
  completed: "#10b981",
  rejected: "#ef4444",
};

const HQ: [number, number] = [23.0225, 72.5714];

const ROUTE_PRESETS = {
  ALPHA: {
    label: "Route Alpha — West Sweep",
    color: "#f59e0b",
    waypoints: [HQ, [23.0398, 72.5281], [23.0620, 72.5370], [23.0580, 72.5410], [23.0320, 72.4630], HQ] as [number, number][],
    description: "HQ → Vastrapur → SG Highway → Thaltej → Bopal → HQ",
    namedWaypoints: [
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
      { name: "Vastrapur Lake", lat: 23.0398, lng: 72.5281 },
      { name: "SG Highway Crossing", lat: 23.0620, lng: 72.5370 },
      { name: "Thaltej", lat: 23.0580, lng: 72.5410 },
      { name: "Bopal Junction", lat: 23.0320, lng: 72.4630 },
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
    ],
  },
  BETA: {
    label: "Route Beta — North-East Sweep",
    color: "#ef4444",
    waypoints: [HQ, [23.0522, 72.5678], [23.1035, 72.5860], [23.0350, 72.6200], [23.0290, 72.6400], [22.9975, 72.6020], HQ] as [number, number][],
    description: "HQ → Naranpura → Chandkheda → Bapunagar → Odhav → Maninagar → HQ",
    namedWaypoints: [
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
      { name: "Naranpura", lat: 23.0522, lng: 72.5678 },
      { name: "Chandkheda", lat: 23.1035, lng: 72.5860 },
      { name: "Bapunagar", lat: 23.0350, lng: 72.6200 },
      { name: "Odhav", lat: 23.0290, lng: 72.6400 },
      { name: "Maninagar", lat: 22.9975, lng: 72.6020 },
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
    ],
  },
  FULL: {
    label: "Route Gamma — Full City Sweep",
    color: "#10b981",
    waypoints: [HQ, [23.0398, 72.5281], [23.0620, 72.5370], [23.0522, 72.5678], [23.1035, 72.5860], [23.0350, 72.6200], [22.9975, 72.6020], [23.0320, 72.4630], HQ] as [number, number][],
    description: "All critical hotspots — maximum coverage",
    namedWaypoints: [
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
      { name: "Vastrapur Lake", lat: 23.0398, lng: 72.5281 },
      { name: "SG Highway", lat: 23.0620, lng: 72.5370 },
      { name: "Naranpura", lat: 23.0522, lng: 72.5678 },
      { name: "Chandkheda", lat: 23.1035, lng: 72.5860 },
      { name: "Bapunagar", lat: 23.0350, lng: 72.6200 },
      { name: "Maninagar", lat: 22.9975, lng: 72.6020 },
      { name: "Bopal Junction", lat: 23.0320, lng: 72.4630 },
      { name: "Police HQ", lat: HQ[0], lng: HQ[1] },
    ],
  },
} as const;

type PresetKey = keyof typeof ROUTE_PRESETS;
type PanelTab = "MAP" | "VEHICLES" | "CONSTRAINTS" | "NAV" | "DISPATCH";

export default function TacticalPlanning({ units, onOptimizeRoute }: TacticalPlanningProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapLayersRef = useRef<any[]>([]);
  const vehicleMarkersRef = useRef<Map<string, any>>(new Map());
  const constraintCirclesRef = useRef<Map<string, any>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  const [activeTab, setActiveTab] = useState<PanelTab>("VEHICLES");
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("ALPHA");
  const [activeVehicleId, setActiveVehicleId] = useState<string>("PCR-01");

  // Route drawing state
  const [isRouting, setIsRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<{ distanceKm: number; durationMin: number; steps: any[] } | null>(null);
  const [routeError, setRouteError] = useState("");

  // Backend data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [constraints, setConstraints] = useState<any[]>([]);
  const [allRoutes, setAllRoutes] = useState<any[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  // Turn-by-turn
  const [turnByTurn, setTurnByTurn] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Acknowledgment UI
  const [pendingAck, setPendingAck] = useState<{ routeId: string; vehicleId: string } | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [ackRejReason, setAckRejReason] = useState("");
  const [ackLoading, setAckLoading] = useState(false);
  const [lastAckResult, setLastAckResult] = useState<string>("");

  // New constraint form
  const [showConstraintForm, setShowConstraintForm] = useState(false);
  const [newConstraint, setNewConstraint] = useState({
    type: "road_closure" as string,
    lat: "23.0310",
    lng: "72.5880",
    radius: "300",
    description: "",
    severity: "medium" as string,
  });

  // ── Fetch backend data ───────────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    setIsLoadingVehicles(true);
    const [v, c, r] = await Promise.all([
      fetchVehiclePositions(),
      fetchPatrolConstraints(),
      fetchAllPatrolRoutes(),
    ]);
    setVehicles(v);
    setConstraints(c);
    setAllRoutes(r);
    setIsLoadingVehicles(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 8000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // ── Map init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const tryInit = () => {
      const L = getL();
      if (!L) { if (attempts++ < 40) setTimeout(tryInit, 150); return; }
      if (!mapContainerRef.current || mapRef.current) return;
      const map = L.map(mapContainerRef.current, { center: [23.0400, 72.5600], zoom: 12 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 300);
    };
    tryInit();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // ── Draw hotspot base layer ─────────────────────────────────────────────
  const drawBaseLayer = useCallback(() => {
    const L = getL();
    if (!mapRef.current || !L) return;
    crimeHotspots.forEach(hs => {
      const isCrit = hs.severity === "CRITICAL";
      const color = isCrit ? "#ef4444" : "#f59e0b";
      const outer = L.circle([hs.lat, hs.lng], {
        radius: isCrit ? 700 : 500,
        fillColor: color, fillOpacity: 0.06, color, weight: 2, opacity: 0.4, dashArray: "6 4"
      }).addTo(mapRef.current);
      const label = L.marker([hs.lat, hs.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${isCrit ? "#450a0a" : "#431407"};color:${color};border:1px solid ${color};border-radius:4px;padding:2px 6px;font-size:9px;font-family:monospace;font-weight:bold;white-space:nowrap;pointer-events:none">⚠ ${hs.name.split(" Hotspot")[0].toUpperCase()} (${hs.crimeCount})</div>`,
          iconAnchor: [0, 0],
        }), interactive: false,
      }).addTo(mapRef.current);
      mapLayersRef.current.push(outer, label);
    });
    const hqMarker = L.marker(HQ, {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:#1d4ed8;color:#fff;border:2px solid #60a5fa;border-radius:6px;padding:3px 8px;font-size:9px;font-family:monospace;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏛 POLICE HQ</div>`,
        iconAnchor: [30, 10],
      })
    }).addTo(mapRef.current);
    mapLayersRef.current.push(hqMarker);
  }, []);

  useEffect(() => { if (mapReady) drawBaseLayer(); }, [mapReady, drawBaseLayer]);

  // ── Live vehicle markers ─────────────────────────────────────────────────
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    vehicles.forEach(v => {
      const statusColor = STATUS_COLORS[v.status] || "#6b7280";
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative">
          <div style="background:${statusColor};color:#fff;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.6);transform:rotate(${v.heading}deg)">🚔</div>
          <div style="position:absolute;top:30px;left:50%;transform:translateX(-50%);background:#111827;color:${statusColor};border:1px solid ${statusColor};border-radius:3px;padding:1px 5px;font-size:8px;font-family:monospace;white-space:nowrap;font-weight:bold">${v.vehicleId}</div>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const existing = vehicleMarkersRef.current.get(v.vehicleId);
      if (existing) {
        existing.setLatLng([v.lat, v.lng]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([v.lat, v.lng], { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div style="font-family:monospace;font-size:11px;min-width:180px">
              <div style="font-weight:bold;color:${statusColor};margin-bottom:6px">🚔 ${v.vehicleId}</div>
              <div>Status: <b>${v.status.replace("_", " ").toUpperCase()}</b></div>
              <div>Speed: <b>${v.speed} km/h</b></div>
              <div>Heading: <b>${v.heading}°</b></div>
              <div>GPS Accuracy: <b>${Math.round(v.accuracy)}m</b></div>
              ${v.batteryLevel !== undefined ? `<div>Battery: <b>${v.batteryLevel}%</b></div>` : ""}
              <div style="font-size:9px;color:#888;margin-top:4px">${new Date(v.timestamp).toLocaleTimeString()}</div>
            </div>
          `);
        vehicleMarkersRef.current.set(v.vehicleId, marker);
      }
    });
  }, [vehicles, mapReady]);

  // ── Constraint circles on map ───────────────────────────────────────────
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    // Remove old constraint circles
    constraintCirclesRef.current.forEach(c => { try { c.remove(); } catch {} });
    constraintCirclesRef.current.clear();

    constraints.forEach(c => {
      if (!c.active) return;
      const color = CONSTRAINT_COLORS[c.type] || "#6b7280";
      const circle = L.circle([c.lat, c.lng], {
        radius: c.radius,
        fillColor: color, fillOpacity: 0.12,
        color, weight: 2, opacity: 0.7, dashArray: "8 4"
      }).addTo(mapRef.current)
        .bindTooltip(`<div style="font-family:monospace;font-size:10px"><b>${c.type.replace("_", " ").toUpperCase()}</b><br>${c.description}</div>`);
      constraintCirclesRef.current.set(c.id, circle);
    });
  }, [constraints, mapReady]);

  // ── Draw route via OSRM ──────────────────────────────────────────────────
  const clearRouteLines = useCallback(() => {
    mapLayersRef.current.forEach(l => { try { l.remove(); } catch {} });
    mapLayersRef.current = [];
  }, []);

  const drawRoute = useCallback(async (waypoints: [number, number][], color: string, presetKey: PresetKey) => {
    const L = getL();
    if (!mapRef.current || !L) return;
    setIsRouting(true);
    setRouteError("");
    clearRouteLines();
    drawBaseLayer();

    const result = await fetchOsrmRoute(waypoints);
    if (!result) {
      setIsRouting(false);
      setRouteError("⚠ Road routing service unavailable. Check internet connection.");
      return;
    }

    const routeLine = L.polyline(result.geometry, { color, weight: 5, opacity: 0.85 }).addTo(mapRef.current);
    const dashedLine = L.polyline(result.geometry, { color: "#ffffff", weight: 2, opacity: 0.3, dashArray: "4 10" }).addTo(mapRef.current);

    waypoints.forEach((wp, idx) => {
      const isHQ = idx === 0 || idx === waypoints.length - 1;
      if (isHQ) return;
      const stopMarker = L.circleMarker(wp, { radius: 8, fillColor: color, color: "#fff", weight: 2.5, fillOpacity: 1 }).addTo(mapRef.current);
      const matchHs = crimeHotspots.find(h => Math.abs(h.lat - wp[0]) < 0.005 && Math.abs(h.lng - wp[1]) < 0.005);
      stopMarker.bindTooltip(`<div style="font-family:monospace;font-size:11px"><b>Stop ${idx}: ${matchHs ? matchHs.name : `Waypoint ${idx}`}</b></div>`, { direction: "top" });
      mapLayersRef.current.push(stopMarker);
    });

    mapRef.current.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    mapLayersRef.current.push(routeLine, dashedLine);

    // Build turn-by-turn from OSRM steps
    const tt = result.steps.slice(0, 15).map((step: any, i: number) => ({
      step: i + 1,
      instruction: step.maneuver?.instruction || step.name || `Continue on ${step.name || "road"}`,
      distance: Math.round(step.distance),
      duration: Math.round(step.duration),
      maneuver: step.maneuver?.type || "straight",
    }));
    setTurnByTurn(tt);
    setCurrentStep(0);
    setRouteResult({ distanceKm: result.distanceKm, durationMin: result.durationMin, steps: tt });
    setIsRouting(false);
  }, [clearRouteLines, drawBaseLayer]);

  useEffect(() => {
    if (!mapReady) return;
    const preset = ROUTE_PRESETS.ALPHA;
    drawRoute(preset.waypoints, preset.color, "ALPHA");
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Assign route to vehicle ─────────────────────────────────────────────
  const handleAssignRoute = async () => {
    const preset = ROUTE_PRESETS[selectedPreset];
    try {
      setIsRouting(true);
      onOptimizeRoute(activeVehicleId);
      drawRoute(preset.waypoints, preset.color, selectedPreset);
      const route = await assignPatrolRoute({
        vehicleId: activeVehicleId,
        waypoints: preset.namedWaypoints,
        distanceKm: routeResult?.distanceKm || 0,
        estimatedMins: routeResult?.durationMin || 0,
        priority: "normal",
      });
      setPendingAck({ routeId: route.routeId, vehicleId: activeVehicleId });
      await refreshData();
    } catch (e: any) {
      setRouteError("Failed to assign route: " + e.message);
    } finally {
      setIsRouting(false);
    }
  };

  // ── Acknowledge route ─────────────────────────────────────────────────
  const handleAcknowledge = async (accepted: boolean) => {
    if (!pendingAck) return;
    setAckLoading(true);
    try {
      await acknowledgePatrolRoute(pendingAck.routeId, {
        vehicleId: pendingAck.vehicleId,
        accepted,
        note: ackNote,
        rejectionReason: ackRejReason,
      });
      setLastAckResult(accepted ? "✅ Route ACKNOWLEDGED by officer" : "❌ Route REJECTED by officer");
      setPendingAck(null);
      setAckNote("");
      setAckRejReason("");
      await refreshData();
    } finally {
      setAckLoading(false);
    }
  };

  // ── Constraint toggle ─────────────────────────────────────────────────
  const handleConstraintToggle = async (id: string, currentActive: boolean) => {
    await toggleConstraint(id, !currentActive);
    await refreshData();
  };

  // ── Add new constraint ────────────────────────────────────────────────
  const handleAddConstraint = async () => {
    if (!newConstraint.description) return;
    await upsertConstraint({
      id: `rc-${Date.now()}`,
      type: newConstraint.type,
      lat: parseFloat(newConstraint.lat),
      lng: parseFloat(newConstraint.lng),
      radius: parseInt(newConstraint.radius),
      description: newConstraint.description,
      active: true,
      severity: newConstraint.severity,
    });
    setShowConstraintForm(false);
    setNewConstraint({ type: "road_closure", lat: "23.0310", lng: "72.5880", radius: "300", description: "", severity: "medium" });
    await refreshData();
  };

  const TABS: { key: PanelTab; label: string; icon: any }[] = [
    { key: "VEHICLES", label: "Live GPS", icon: Satellite },
    { key: "CONSTRAINTS", label: "Constraints", icon: Ban },
    { key: "NAV", label: "Turn-by-Turn", icon: Navigation },
    { key: "DISPATCH", label: "Dispatch", icon: ShieldAlert },
  ];

  const activeVehicle = vehicles.find(v => v.vehicleId === activeVehicleId) || vehicles[0];
  const activeRouteForVehicle = allRoutes.filter(r => r.vehicleId === activeVehicleId).sort((a: any, b: any) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">

      {/* ── Header ── */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-violet-400 font-semibold mb-1 flex items-center gap-2">
            <Radar className="w-3 h-3" /> GPS-Enabled Patrol Routing · OSRM Engine · Live Tracking
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
            PATROL ROUTE OPTIMIZATION — PHASE 4
          </h2>
        </div>
        <div className="flex items-center gap-4 font-mono">
          <div className="text-center">
            <span className="block text-[9px] text-slate-500 uppercase">Active Vehicles</span>
            <span className="text-sm font-bold text-green-400">{vehicles.filter(v => v.status !== "offline").length} / {vehicles.length}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <span className="block text-[9px] text-slate-500 uppercase">Active Constraints</span>
            <span className="text-sm font-bold text-amber-400">{constraints.filter(c => c.active).length}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div className="text-center">
            <span className="block text-[9px] text-slate-500 uppercase">Routes Today</span>
            <span className="text-sm font-bold text-violet-400">{allRoutes.length}</span>
          </div>
          <button
            onClick={refreshData}
            disabled={isLoadingVehicles}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-300 text-[10px] font-mono rounded-lg cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingVehicles ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* ── Left: Map ── */}
      <div className="lg:col-span-8 flex flex-col gap-5">

        {/* Map Card */}
        <div className="bg-[#0B1220] border border-slate-800 rounded-xl overflow-hidden">
          {/* Map Toolbar */}
          <div className="p-4 border-b border-slate-800 bg-[#050B14]/60 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-violet-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">LIVE PATROL MAP</h3>
                <span className="text-[10px] font-mono text-slate-400">Real-time GPS vehicles · Constraints overlay · OSRM road network</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ROUTE_PRESETS) as PresetKey[]).map(key => {
                const p = ROUTE_PRESETS[key];
                const isActive = selectedPreset === key;
                return (
                  <button
                    key={key}
                    disabled={isRouting}
                    onClick={() => { setSelectedPreset(key); drawRoute(p.waypoints, p.color, key); }}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer flex items-center gap-1.5 ${isActive ? "border-violet-400 text-violet-300 bg-violet-900/30" : "border-slate-700 text-slate-400 bg-[#050B14] hover:border-slate-500 hover:text-slate-200"} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                    {p.label.split(" — ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="relative">
            <div ref={mapContainerRef} style={{ height: "480px", zIndex: 0 }} className="w-full bg-slate-800" />
            {isRouting && (
              <div className="absolute inset-0 bg-[#050B14]/70 flex flex-col items-center justify-center gap-3 z-10">
                <RefreshCw className="w-7 h-7 text-violet-400 animate-spin" />
                <div className="text-sm font-bold text-white font-mono">CALCULATING ROAD ROUTE…</div>
              </div>
            )}
            {/* Live GPS badge */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-[#050B14]/90 border border-green-500/30 rounded-lg px-3 py-1.5">
              <Signal className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-[10px] font-mono text-green-400">{vehicles.filter(v => v.status !== "offline").length} VEHICLES LIVE</span>
            </div>
          </div>

          {/* Route Stats */}
          {routeResult && !isRouting && (
            <div className="p-3 bg-[#050B14]/60 border-t border-slate-800 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: ROUTE_PRESETS[selectedPreset]?.color }} />
                <span className="text-slate-400">{ROUTE_PRESETS[selectedPreset]?.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-300 ml-auto">
                <div className="flex items-center gap-1"><Route className="w-3.5 h-3.5 text-violet-400" /><span className="font-bold text-white">{routeResult.distanceKm.toFixed(1)} km</span></div>
                <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-400" /><span className="font-bold text-white">{Math.round(routeResult.durationMin)} min</span></div>
              </div>
            </div>
          )}
          {routeError && (
            <div className="p-3 bg-red-900/20 border-t border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />{routeError}
            </div>
          )}
        </div>

        {/* Acknowledgment UI */}
        {(pendingAck || lastAckResult) && (
          <div className={`bg-[#0B1220] border rounded-xl p-5 ${pendingAck ? "border-amber-500/30" : "border-slate-700"}`}>
            {pendingAck ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Wifi className="w-4 h-4 text-amber-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Officer Device — Route Acknowledgment Required</h4>
                  <span className="ml-auto text-[10px] font-mono text-slate-500">{pendingAck.vehicleId} / {pendingAck.routeId.slice(-8)}</span>
                </div>
                <div className="text-xs font-mono text-slate-300 mb-3">
                  Route <b className="text-white">{ROUTE_PRESETS[selectedPreset].label}</b> dispatched to <b className="text-violet-300">{activeVehicle?.vehicleId || activeVehicleId}</b>. Simulating officer acknowledgment:
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1">Officer Note (Optional)</label>
                    <input
                      value={ackNote}
                      onChange={e => setAckNote(e.target.value)}
                      placeholder="e.g., En route, ETA 5 min"
                      className="w-full bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-amber-400 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-500 mb-1">Rejection Reason (If rejecting)</label>
                    <input
                      value={ackRejReason}
                      onChange={e => setAckRejReason(e.target.value)}
                      placeholder="e.g., Vehicle malfunction"
                      className="w-full bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-red-400 placeholder-slate-600"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcknowledge(true)}
                    disabled={ackLoading}
                    className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    {ackLoading ? "PROCESSING…" : "ACKNOWLEDGE ROUTE"}
                  </button>
                  <button
                    onClick={() => handleAcknowledge(false)}
                    disabled={ackLoading}
                    className="flex-1 py-2.5 bg-red-900/50 hover:bg-red-800 border border-red-500/30 text-red-300 font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    REJECT ROUTE
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <span className="text-sm font-mono text-green-300 font-semibold">{lastAckResult}</span>
                <button onClick={() => setLastAckResult("")} className="ml-auto text-slate-600 hover:text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}

        {/* All Routes Status */}
        {allRoutes.length > 0 && (
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-violet-400" />Route Log
              <span className="ml-auto text-[10px] font-mono text-slate-500">{allRoutes.length} routes</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allRoutes.slice().reverse().map((r: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 bg-[#050B14] border border-slate-800 rounded-lg px-3 py-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: ROUTE_STATUS_COLORS[r.status] || "#6b7280" }} />
                  <span className="text-[10px] font-mono font-bold text-white">{r.vehicleId}</span>
                  <span className="text-[10px] font-mono text-slate-400 flex-1 truncate">{r.waypoints?.length || 0} stops · {r.distanceKm?.toFixed(1) || "0"} km</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold" style={{ background: `${ROUTE_STATUS_COLORS[r.status]}22`, color: ROUTE_STATUS_COLORS[r.status] }}>
                    {r.status.toUpperCase()}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600">{new Date(r.assignedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Panel ── */}
      <div className="lg:col-span-4 flex flex-col gap-5">

        {/* Tab Switcher */}
        <div className="bg-[#0B1220] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-800">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2.5 text-[9px] font-mono font-bold uppercase tracking-wide transition-all cursor-pointer flex flex-col items-center gap-1 ${activeTab === tab.key ? "bg-violet-900/20 text-violet-300 border-b-2 border-violet-500" : "text-slate-500 hover:text-slate-300"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-4">

            {/* VEHICLES TAB */}
            {activeTab === "VEHICLES" && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Satellite className="w-3 h-3" />Live Vehicle GPS Feed
                </div>
                {vehicles.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs font-mono">
                    <WifiOff className="w-6 h-6 mx-auto mb-2" />Backend offline — starting vehicles…
                  </div>
                ) : (
                  vehicles.map(v => {
                    const statusColor = STATUS_COLORS[v.status] || "#6b7280";
                    const isSelected = activeVehicleId === v.vehicleId;
                    return (
                      <div
                        key={v.vehicleId}
                        onClick={() => setActiveVehicleId(v.vehicleId)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "border-violet-500/40 bg-violet-900/10" : "border-slate-700 bg-[#050B14] hover:border-slate-600"}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                            🚔 {v.vehicleId}
                            {v.batteryLevel !== undefined && (
                              <span className={`text-[8px] ${v.batteryLevel < 30 ? "text-red-400" : "text-slate-500"}`}>🔋{v.batteryLevel}%</span>
                            )}
                          </span>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${statusColor}22`, color: statusColor }}>
                            {v.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400">
                          <span>📍 {v.lat.toFixed(4)}, {v.lng.toFixed(4)}</span>
                          <span className="text-center">🔰 {v.speed}km/h</span>
                          <span className="text-right">±{Math.round(v.accuracy)}m</span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-600 mt-1">
                          ↗ {v.heading}° · {new Date(v.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CONSTRAINTS TAB */}
            {activeTab === "CONSTRAINTS" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide flex items-center gap-2">
                    <Ban className="w-3 h-3" />Route Constraints
                  </span>
                  <button
                    onClick={() => setShowConstraintForm(f => !f)}
                    className="flex items-center gap-1 px-2 py-1 bg-violet-900/30 border border-violet-500/30 text-violet-300 text-[9px] font-mono rounded cursor-pointer hover:bg-violet-900/50 transition-all"
                  >
                    <Plus className="w-3 h-3" /> ADD
                  </button>
                </div>

                {showConstraintForm && (
                  <div className="bg-[#050B14] border border-violet-500/20 rounded-lg p-3 mb-3 space-y-2">
                    <select
                      value={newConstraint.type}
                      onChange={e => setNewConstraint(p => ({ ...p, type: e.target.value }))}
                      className="w-full bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400"
                    >
                      <option value="road_closure">Road Closure</option>
                      <option value="curfew">Curfew</option>
                      <option value="weather">Weather</option>
                      <option value="vip_area">VIP Area</option>
                      <option value="construction">Construction</option>
                    </select>
                    <input value={newConstraint.description} onChange={e => setNewConstraint(p => ({ ...p, description: e.target.value }))} placeholder="Description *" className="w-full bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
                    <div className="grid grid-cols-3 gap-1">
                      <input value={newConstraint.lat} onChange={e => setNewConstraint(p => ({ ...p, lat: e.target.value }))} placeholder="Lat" className="bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
                      <input value={newConstraint.lng} onChange={e => setNewConstraint(p => ({ ...p, lng: e.target.value }))} placeholder="Lng" className="bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
                      <input value={newConstraint.radius} onChange={e => setNewConstraint(p => ({ ...p, radius: e.target.value }))} placeholder="Radius(m)" className="bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400" />
                    </div>
                    <select value={newConstraint.severity} onChange={e => setNewConstraint(p => ({ ...p, severity: e.target.value }))} className="w-full bg-[#050B14] border border-slate-700 text-white text-xs font-mono rounded-lg px-2 py-1.5 outline-none focus:border-violet-400">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <button onClick={handleAddConstraint} className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition-all">ADD CONSTRAINT</button>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {constraints.map((c: any) => {
                    const color = CONSTRAINT_COLORS[c.type] || "#6b7280";
                    const Icon = CONSTRAINT_ICONS[c.type] || Ban;
                    return (
                      <div key={c.id} className={`p-3 rounded-lg border transition-all ${c.active ? "border-slate-700 bg-[#050B14]" : "border-slate-800 bg-slate-900/20 opacity-50"}`}>
                        <div className="flex items-start gap-2">
                          <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono font-bold" style={{ color }}>{c.type.replace("_", " ").toUpperCase()}</span>
                              <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${c.severity === "critical" ? "bg-red-900/30 text-red-400" : c.severity === "high" ? "bg-amber-900/30 text-amber-400" : "bg-slate-800 text-slate-500"}`}>{c.severity.toUpperCase()}</span>
                            </div>
                            <div className="text-[9px] font-mono text-slate-400 leading-tight mb-1">{c.description}</div>
                            <div className="text-[8px] font-mono text-slate-600">{c.lat.toFixed(4)}, {c.lng.toFixed(4)} · r={c.radius}m</div>
                            {c.expiresAt && <div className="text-[8px] font-mono text-slate-600 mt-0.5">Expires: {new Date(c.expiresAt).toLocaleDateString()}</div>}
                          </div>
                          <button
                            onClick={() => handleConstraintToggle(c.id, c.active)}
                            className={`shrink-0 px-2 py-1 text-[8px] font-mono font-bold rounded border cursor-pointer transition-all ${c.active ? "border-green-500/30 text-green-400 hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-400" : "border-slate-700 text-slate-500 hover:border-green-500/30 hover:text-green-400"}`}
                          >
                            {c.active ? "ON" : "OFF"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NAV TAB */}
            {activeTab === "NAV" && (
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Navigation className="w-3 h-3" />Turn-by-Turn Navigation
                  {turnByTurn.length > 0 && <span className="ml-auto text-violet-400">{turnByTurn.length} steps</span>}
                </div>
                {turnByTurn.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs font-mono">
                    Select a route on the map to see navigation steps
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {turnByTurn.map((step: any, idx: number) => {
                      const isActive = idx === currentStep;
                      return (
                        <div
                          key={idx}
                          onClick={() => setCurrentStep(idx)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${isActive ? "border-violet-500/40 bg-violet-900/10" : "border-slate-800 bg-[#050B14] hover:border-slate-700"}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold font-mono shrink-0 ${isActive ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-500"}`}>{step.step}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono text-white leading-tight">{step.instruction || "Continue"}</div>
                              <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                                {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)}km` : `${step.distance}m`} · {Math.round(step.duration)}s
                              </div>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DISPATCH TAB */}
            {activeTab === "DISPATCH" && (
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" />Assign & Dispatch Route
                </div>

                {/* Vehicle selector */}
                <div className="mb-3">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1.5">Select Vehicle</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {vehicles.slice(0, 6).map(v => (
                      <button
                        key={v.vehicleId}
                        onClick={() => setActiveVehicleId(v.vehicleId)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${activeVehicleId === v.vehicleId ? "border-violet-500/40 bg-violet-900/10" : "border-slate-700 bg-[#050B14] hover:border-slate-600"}`}
                      >
                        <span className="text-xs font-mono text-white">🚔 {v.vehicleId}</span>
                        <span className="text-[9px] font-mono" style={{ color: STATUS_COLORS[v.status] }}>{v.status.replace("_", " ").toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Route selector */}
                <div className="mb-3">
                  <label className="block text-[10px] font-mono text-slate-500 mb-1.5">Select Route</label>
                  {(Object.keys(ROUTE_PRESETS) as PresetKey[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setSelectedPreset(key); drawRoute(ROUTE_PRESETS[key].waypoints, ROUTE_PRESETS[key].color, key); }}
                      className={`w-full mb-1.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${selectedPreset === key ? "border-violet-500/40 bg-violet-900/10" : "border-slate-700 bg-[#050B14] hover:border-slate-600"}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ROUTE_PRESETS[key].color }} />
                      <div>
                        <div className="text-[10px] font-mono font-bold text-white">{ROUTE_PRESETS[key].label}</div>
                        <div className="text-[9px] font-mono text-slate-500">{ROUTE_PRESETS[key].namedWaypoints.length - 2} stops</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active vehicle's current route */}
                {activeRouteForVehicle && (
                  <div className="mb-3 p-3 bg-[#050B14] border border-slate-700 rounded-lg">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">Current Route Status</div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ROUTE_STATUS_COLORS[activeRouteForVehicle.status] }} />
                      <span className="text-xs font-mono font-bold" style={{ color: ROUTE_STATUS_COLORS[activeRouteForVehicle.status] }}>{activeRouteForVehicle.status.toUpperCase()}</span>
                      <span className="text-[9px] font-mono text-slate-500 ml-auto">{activeRouteForVehicle.waypoints?.length || 0} stops</span>
                    </div>
                    {activeRouteForVehicle.turnByTurnInstructions?.length > 0 && (
                      <div className="mt-2 text-[9px] font-mono text-slate-500">
                        Next: {activeRouteForVehicle.turnByTurnInstructions[activeRouteForVehicle.currentWaypointIndex]?.instruction || "—"}
                      </div>
                    )}
                    {activeRouteForVehicle.status === "acknowledged" && (
                      <button
                        onClick={() => progressPatrolRoute(activeVehicleId).then(refreshData)}
                        className="mt-2 w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-[9px] font-mono font-bold rounded cursor-pointer transition-all"
                      >
                        ▶ ADVANCE TO NEXT WAYPOINT
                      </button>
                    )}
                  </div>
                )}

                <button
                  disabled={isRouting || !activeVehicleId}
                  onClick={handleAssignRoute}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRouting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isRouting ? "DISPATCHING…" : `DISPATCH ${activeVehicleId} — ${ROUTE_PRESETS[selectedPreset].label.split(" — ")[0]}`}
                </button>

                {/* Hotspot Priority Queue */}
                <div className="mt-4">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Flame className="w-3 h-3 text-red-400" />Hotspot Priority Queue
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {[...crimeHotspots].sort((a, b) => (b.severity === "CRITICAL" ? 1 : 0) - (a.severity === "CRITICAL" ? 1 : 0)).map((hs, idx) => (
                      <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg border ${hs.severity === "CRITICAL" ? "border-red-500/20 bg-red-900/5" : "border-amber-500/20 bg-amber-900/5"}`}>
                        <div className={`w-6 h-6 rounded text-[9px] font-bold font-mono flex items-center justify-center shrink-0 ${hs.severity === "CRITICAL" ? "bg-red-900/50 text-red-300" : "bg-amber-900/50 text-amber-300"}`}>{hs.crimeCount}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-mono text-white truncate">{hs.name}</div>
                          <div className={`text-[8px] font-mono font-bold ${hs.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"}`}>{hs.severity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
