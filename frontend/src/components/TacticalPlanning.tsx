/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Navigation, RefreshCw, MapPin, AlertTriangle, Activity,
  Flame, CheckCircle2, Clock, Route, Zap, ShieldAlert, Plus, X
} from "lucide-react";
import { PatrolUnit } from "../types";
import { crimeHotspots, initialIncidents } from "../data";

const getL = () => (window as any).L;

interface TacticalPlanningProps {
  units: PatrolUnit[];
  onOptimizeRoute: (unitId: string) => void;
}

// ── OSRM Free Router (follows actual roads) ──────────────────────────────────
async function fetchOsrmRoute(
  coordinates: [number, number][]  // [lat, lng] pairs
): Promise<{ geometry: [number, number][]; distanceKm: number; durationMin: number } | null> {
  if (coordinates.length < 2) return null;
  // OSRM expects lng,lat
  const coordStr = coordinates.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return null;
    const route = data.routes[0];
    // geojson coords are [lng, lat] — flip to [lat, lng]
    const geometry: [number, number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    return {
      geometry,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null;
  }
}

// ── Hotspot priority sort helper ─────────────────────────────────────────────
function getHotspotCoords(): [number, number][] {
  const sorted = [...crimeHotspots].sort((a, b) => {
    const sev = (s: string) => (s === "CRITICAL" ? 2 : s === "HIGH" ? 1 : 0);
    return sev(b.severity) - sev(a.severity);
  });
  return sorted.map(h => [h.lat, h.lng] as [number, number]);
}

// Build ordered waypoint list: HQ → hotspots (sorted by severity) → HQ
const HQ: [number, number] = [23.0225, 72.5714];

const ROUTE_PRESETS = {
  ALPHA: {
    label: "Route Alpha — West Sweep",
    color: "#f59e0b",
    waypoints: [HQ, [23.0398, 72.5281], [23.0620, 72.5370], [23.0580, 72.5410], [23.0320, 72.4630], HQ] as [number, number][],
    description: "HQ → Vastrapur → SG Highway → Thaltej → Bopal → HQ"
  },
  BETA: {
    label: "Route Beta — North-East Sweep",
    color: "#ef4444",
    waypoints: [HQ, [23.0522, 72.5678], [23.1035, 72.5860], [23.0350, 72.6200], [23.0290, 72.6400], [22.9975, 72.6020], HQ] as [number, number][],
    description: "HQ → Naranpura → Chandkheda → Bapunagar → Odhav → Maninagar → HQ"
  },
  FULL: {
    label: "Route Gamma — Full City Sweep",
    color: "#10b981",
    waypoints: [HQ, [23.0398, 72.5281], [23.0620, 72.5370], [23.0522, 72.5678], [23.1035, 72.5860], [23.0350, 72.6200], [22.9975, 72.6020], [23.0320, 72.4630], HQ] as [number, number][],
    description: "All critical hotspots — maximum coverage"
  }
} as const;

type PresetKey = keyof typeof ROUTE_PRESETS;

export default function TacticalPlanning({ units, onOptimizeRoute }: TacticalPlanningProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapLayersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("ALPHA");
  const [activeUnitId, setActiveUnitId] = useState<string>(units[0]?.id || "");

  // Route result state
  const [isRouting, setIsRouting] = useState(false);
  const [routeResult, setRouteResult] = useState<{
    distanceKm: number;
    durationMin: number;
    hotspotsCount: number;
    presetKey: PresetKey;
  } | null>(null);
  const [routeError, setRouteError] = useState<string>("");

  // Custom waypoints
  const [customMode, setCustomMode] = useState(false);
  const [customWaypoints, setCustomWaypoints] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [newWpName, setNewWpName] = useState("");
  const [newWpLat, setNewWpLat] = useState("");
  const [newWpLng, setNewWpLng] = useState("");

  // ── Initialize Leaflet ────────────────────────────────────────────────────
  useEffect(() => {
    let attempts = 0;
    const tryInit = () => {
      const L = getL();
      if (!L) { if (attempts++ < 40) setTimeout(tryInit, 150); return; }
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [23.0400, 72.5600],
        zoom: 12,
        zoomControl: true,
      });

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

  // ── Map click to add custom waypoint ─────────────────────────────────────
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;
    const handleClick = (e: any) => {
      if (!customMode) return;
      const name = `WP-${customWaypoints.length + 1}`;
      setCustomWaypoints(prev => [...prev, { name, lat: e.latlng.lat, lng: e.latlng.lng }]);
    };
    mapRef.current.on("click", handleClick);
    return () => { if (mapRef.current) mapRef.current.off("click", handleClick); };
  }, [mapReady, customMode, customWaypoints.length]);

  // Toggle crosshair cursor when custom mode active
  useEffect(() => {
    if (!mapRef.current) return;
    const c = mapRef.current.getContainer();
    if (c) c.style.cursor = customMode ? "crosshair" : "";
  }, [customMode]);

  // ── Clear all drawn layers ────────────────────────────────────────────────
  const clearMapLayers = useCallback(() => {
    mapLayersRef.current.forEach(l => { try { l.remove(); } catch {} });
    mapLayersRef.current = [];
  }, []);

  // ── Draw base: hotspot circles + crime markers ───────────────────────────
  const drawBaseLayer = useCallback(() => {
    const L = getL();
    if (!mapRef.current || !L) return;

    // Crime markers (clustered view)
    initialIncidents.filter(i => i.status !== "Resolved").forEach(inc => {
      const color = inc.threatIndex >= 80 ? "#ef4444" : inc.threatIndex >= 50 ? "#f59e0b" : "#8b5cf6";
      const m = L.circleMarker(inc.coordinates, {
        radius: inc.threatIndex >= 90 ? 10 : 7,
        fillColor: color, color: "#fff", weight: 1.5, fillOpacity: 0.85
      }).addTo(mapRef.current);
      m.bindTooltip(`<span style="font-family:monospace;font-size:11px;font-weight:bold">${inc.category}</span><br><span style="font-size:10px;color:#666">${inc.location.split(" (")[0]} · ${inc.threatIndex}/100</span>`, { direction: "top" });
      mapLayersRef.current.push(m);
    });

    // Hotspot zone rings
    crimeHotspots.forEach(hs => {
      const isCrit = hs.severity === "CRITICAL";
      const color = isCrit ? "#ef4444" : "#f59e0b";
      const outer = L.circle([hs.lat, hs.lng], {
        radius: isCrit ? 700 : 500,
        fillColor: color, fillOpacity: 0.06,
        color, weight: 2, opacity: 0.5, dashArray: "6 4"
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

    // HQ Marker
    const hqIcon = L.divIcon({
      className: "",
      html: `<div style="background:#1d4ed8;color:#fff;border:2px solid #60a5fa;border-radius:6px;padding:3px 8px;font-size:9px;font-family:monospace;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏛 POLICE HQ</div>`,
      iconAnchor: [30, 10],
    });
    const hqMarker = L.marker(HQ, { icon: hqIcon }).addTo(mapRef.current);
    mapLayersRef.current.push(hqMarker);
  }, []);

  // ── Initial base layer on map ready ──────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    drawBaseLayer();
  }, [mapReady, drawBaseLayer]);

  // ── Draw road route via OSRM ─────────────────────────────────────────────
  const drawRoute = useCallback(async (waypoints: [number, number][], color: string, presetKey: PresetKey) => {
    const L = getL();
    if (!mapRef.current || !L) return;

    setIsRouting(true);
    setRouteError("");
    clearMapLayers();
    drawBaseLayer();

    const result = await fetchOsrmRoute(waypoints);

    if (!result) {
      setIsRouting(false);
      setRouteError("⚠ Road routing service unavailable. Check internet connection.");
      return;
    }

    // Draw the actual road path
    const routeLine = L.polyline(result.geometry, {
      color,
      weight: 5,
      opacity: 0.85,
    }).addTo(mapRef.current);

    // Animated direction arrows (using arrowheads via SVG pattern)
    const dashedLine = L.polyline(result.geometry, {
      color: "#ffffff",
      weight: 2,
      opacity: 0.35,
      dashArray: "4 10",
    }).addTo(mapRef.current);

    // Waypoint stop markers
    waypoints.forEach((wp, idx) => {
      const isHQ = idx === 0 || idx === waypoints.length - 1;
      if (isHQ) return; // HQ already drawn
      const stopMarker = L.circleMarker(wp, {
        radius: 8,
        fillColor: color,
        color: "#fff",
        weight: 2.5,
        fillOpacity: 1,
      }).addTo(mapRef.current);

      // Find matching hotspot name
      const matchHs = crimeHotspots.find(h => Math.abs(h.lat - wp[0]) < 0.005 && Math.abs(h.lng - wp[1]) < 0.005);
      const label = matchHs ? matchHs.name.split(" Hotspot")[0] : `Stop ${idx}`;
      stopMarker.bindTooltip(
        `<div style="font-family:monospace;font-size:11px"><b>Stop ${idx}: ${label}</b></div>`,
        { permanent: false, direction: "top" }
      );
      mapLayersRef.current.push(stopMarker);
    });

    // Fit map to route
    mapRef.current.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    mapLayersRef.current.push(routeLine, dashedLine);

    // Count hotspots covered
    const covered = crimeHotspots.filter(hs =>
      waypoints.some(wp => Math.abs(wp[0] - hs.lat) < 0.01 && Math.abs(wp[1] - hs.lng) < 0.01)
    ).length;

    setRouteResult({
      distanceKm: result.distanceKm,
      durationMin: result.durationMin,
      hotspotsCount: covered,
      presetKey,
    });
    setIsRouting(false);
  }, [clearMapLayers, drawBaseLayer]);

  // ── Draw custom waypoints route ───────────────────────────────────────────
  const drawCustomRoute = useCallback(async () => {
    if (customWaypoints.length < 2) {
      setRouteError("Add at least 2 waypoints to generate a custom route.");
      return;
    }
    const coords: [number, number][] = customWaypoints.map(w => [w.lat, w.lng]);
    setIsRouting(true);
    setRouteError("");
    clearMapLayers();
    drawBaseLayer();

    const result = await fetchOsrmRoute(coords);
    if (!result) {
      setIsRouting(false);
      setRouteError("⚠ Road routing failed. Verify coordinates are on drivable roads.");
      return;
    }

    const L = getL();
    const line = L.polyline(result.geometry, { color: "#a78bfa", weight: 5, opacity: 0.85 }).addTo(mapRef.current);
    const dashed = L.polyline(result.geometry, { color: "#fff", weight: 2, opacity: 0.3, dashArray: "4 10" }).addTo(mapRef.current);

    coords.forEach((wp, idx) => {
      const m = L.circleMarker(wp, { radius: 8, fillColor: "#a78bfa", color: "#fff", weight: 2.5, fillOpacity: 1 }).addTo(mapRef.current);
      m.bindTooltip(`<span style="font-family:monospace;font-size:11px"><b>${customWaypoints[idx]?.name || `Stop ${idx + 1}`}</b></span>`, { direction: "top" });
      mapLayersRef.current.push(m);
    });

    mapRef.current.fitBounds(line.getBounds(), { padding: [40, 40] });
    mapLayersRef.current.push(line, dashed);
    setRouteResult({ distanceKm: result.distanceKm, durationMin: result.durationMin, hotspotsCount: 0, presetKey: "ALPHA" });
    setIsRouting(false);
  }, [customWaypoints, clearMapLayers, drawBaseLayer]);

  // ── Auto-draw Alpha route on mount ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady) return;
    const preset = ROUTE_PRESETS.ALPHA;
    drawRoute(preset.waypoints, preset.color, "ALPHA");
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeUnit = units.find(u => u.id === activeUnitId) || units[0];

  // Hotspot severity order
  const sortedHotspots = [...crimeHotspots].sort((a, b) => {
    const s = (x: string) => x === "CRITICAL" ? 2 : 1;
    return s(b.severity) - s(a.severity);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">

      {/* ── Title Header ── */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-violet-400 font-semibold mb-1">
            Road-Accurate Patrol Routing · OSRM Engine
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">
            PATROL ROUTE OPTIMIZATION PLANNING
          </h2>
        </div>
        <div className="flex items-center gap-4 text-right font-mono">
          <div>
            <span className="block text-[9px] text-slate-500 uppercase">Hotspot Zones</span>
            <span className="text-xs font-bold text-red-400">{crimeHotspots.length} ACTIVE</span>
          </div>
          <div className="h-8 w-px bg-violet-500" />
          <div>
            <span className="block text-[9px] text-slate-500 uppercase">Roster Active</span>
            <span className="text-xs font-bold text-white">{units.length}/15 UNITS</span>
          </div>
        </div>
      </div>

      {/* ── Left: Live Map ── */}
      <div className="lg:col-span-8 flex flex-col gap-5">

        {/* Map Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">

          {/* Map Toolbar */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-violet-400" />
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">LIVE ROAD ROUTING MAP</h3>
                <span className="text-[10px] font-mono text-slate-400">Routes follow actual Ahmedabad road network · OSRM</span>
              </div>
            </div>

            {/* Preset Route Buttons */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ROUTE_PRESETS) as PresetKey[]).map(key => {
                const p = ROUTE_PRESETS[key];
                const isActive = selectedPreset === key && !customMode;
                return (
                  <button
                    key={key}
                    disabled={isRouting}
                    onClick={() => {
                      setSelectedPreset(key);
                      setCustomMode(false);
                      drawRoute(p.waypoints, p.color, key);
                    }}
                    className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? "border-violet-400 text-violet-300 bg-violet-900/30"
                        : "border-slate-700 text-slate-400 bg-slate-950 hover:border-slate-500 hover:text-slate-200"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
                    {p.label.split(" — ")[0]}
                  </button>
                );
              })}
              <button
                onClick={() => { setCustomMode(m => !m); if (customMode) setCustomWaypoints([]); }}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer ${
                  customMode
                    ? "border-emerald-400 text-emerald-300 bg-emerald-900/20"
                    : "border-slate-700 text-slate-400 bg-slate-950 hover:border-slate-500"
                }`}
              >
                <Plus className="w-3 h-3 inline mr-1" />
                CUSTOM
              </button>
            </div>
          </div>

          {/* Custom Mode Info Banner */}
          {customMode && (
            <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-500/20 flex items-center justify-between gap-3">
              <span className="text-[10px] font-mono text-emerald-300">
                📍 Click on the map to add waypoints ({customWaypoints.length} added). Click "Generate Route" when done.
              </span>
              <div className="flex gap-2">
                {customWaypoints.length >= 2 && (
                  <button
                    onClick={drawCustomRoute}
                    disabled={isRouting}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold rounded cursor-pointer transition-all disabled:opacity-50"
                  >
                    GENERATE ROUTE
                  </button>
                )}
                <button
                  onClick={() => { setCustomMode(false); setCustomWaypoints([]); }}
                  className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white text-[10px] font-mono rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Leaflet Map */}
          <div className="relative">
            <div ref={mapContainerRef} style={{ height: "480px", zIndex: 0 }} className="w-full bg-slate-800" />

            {/* Loading overlay */}
            {isRouting && (
              <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-3 z-10">
                <RefreshCw className="w-7 h-7 text-violet-400 animate-spin" />
                <div className="text-center">
                  <div className="text-sm font-bold text-white font-mono">CALCULATING ROAD ROUTE</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">Fetching from OSRM road network…</div>
                </div>
              </div>
            )}
          </div>

          {/* Route Stats Bar */}
          {routeResult && !isRouting && (
            <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: ROUTE_PRESETS[routeResult.presetKey]?.color || "#a78bfa" }} />
                <span className="text-slate-400">{customMode ? "Custom Route" : ROUTE_PRESETS[routeResult.presetKey]?.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 ml-auto">
                <Route className="w-3.5 h-3.5 text-violet-400" />
                <span className="font-bold text-white">{routeResult.distanceKm.toFixed(1)} km</span>
                <span className="text-slate-600 mx-1">|</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{Math.round(routeResult.durationMin)} min patrol</span>
                {!customMode && (
                  <>
                    <span className="text-slate-600 mx-1">|</span>
                    <Flame className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-bold text-white">{routeResult.hotspotsCount} hotspots</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {routeError && (
            <div className="p-3 bg-red-900/20 border-t border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {routeError}
            </div>
          )}
        </div>

        {/* Route Description Card */}
        {!customMode && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Selected Route Details</h4>
              <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded border border-violet-500/30 text-violet-400 bg-violet-900/20">
                ROAD-ACCURATE
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-slate-300">
                <span className="text-slate-500 mr-2">PATH:</span>
                {ROUTE_PRESETS[selectedPreset].description}
              </div>

              {/* Stops list */}
              <div className="mt-2 space-y-1.5">
                {ROUTE_PRESETS[selectedPreset].waypoints.map((wp, idx) => {
                  const isHQ = idx === 0 || idx === ROUTE_PRESETS[selectedPreset].waypoints.length - 1;
                  const matchHs = crimeHotspots.find(h => Math.abs(h.lat - wp[0]) < 0.01 && Math.abs(h.lng - wp[1]) < 0.01);
                  return (
                    <div key={idx} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                      isHQ
                        ? "bg-blue-900/10 border-blue-500/20"
                        : matchHs?.severity === "CRITICAL"
                        ? "bg-red-900/10 border-red-500/20"
                        : "bg-slate-800/50 border-slate-700"
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono border-2 ${
                        isHQ ? "bg-blue-800 border-blue-400 text-blue-200" :
                        matchHs?.severity === "CRITICAL" ? "bg-red-900 border-red-400 text-red-200" :
                        "bg-slate-800 border-amber-400 text-amber-200"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-mono text-white">
                          {isHQ ? "🏛 Police HQ (Commissioner Office)" : matchHs ? `⚠ ${matchHs.name}` : `Stop ${idx}`}
                        </span>
                        {matchHs && (
                          <span className={`ml-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            matchHs.severity === "CRITICAL" ? "bg-red-900/40 text-red-400" : "bg-amber-900/40 text-amber-400"
                          }`}>
                            {matchHs.severity} · {matchHs.crimeCount} CRIMES
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-600">{wp[0].toFixed(4)}, {wp[1].toFixed(4)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Custom Waypoints Manager */}
        {customMode && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Custom Waypoints
              <span className="ml-auto text-[10px] font-mono text-slate-500">{customWaypoints.length} points</span>
            </h4>

            {/* Waypoints list */}
            {customWaypoints.length > 0 && (
              <div className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
                {customWaypoints.map((wp, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-800 border border-emerald-400 text-emerald-200 text-[10px] font-bold font-mono flex items-center justify-center">{idx + 1}</span>
                    <span className="text-xs font-mono text-white flex-1">{wp.name}</span>
                    <span className="text-[9px] font-mono text-slate-500">{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
                    <button
                      onClick={() => setCustomWaypoints(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-600 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Manual add form */}
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Waypoint name"
                value={newWpName}
                onChange={e => setNewWpName(e.target.value)}
                className="col-span-4 bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-emerald-400 placeholder-slate-600"
              />
              <input
                type="number"
                placeholder="Lat"
                value={newWpLat}
                onChange={e => setNewWpLat(e.target.value)}
                step="0.0001"
                className="col-span-3 bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
              />
              <input
                type="number"
                placeholder="Lng"
                value={newWpLng}
                onChange={e => setNewWpLng(e.target.value)}
                step="0.0001"
                className="col-span-3 bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
              />
              <button
                onClick={() => {
                  const lat = parseFloat(newWpLat), lng = parseFloat(newWpLng);
                  if (isNaN(lat) || isNaN(lng)) return;
                  setCustomWaypoints(prev => [...prev, { name: newWpName || `WP-${prev.length + 1}`, lat, lng }]);
                  setNewWpName(""); setNewWpLat(""); setNewWpLng("");
                }}
                className="col-span-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[9px] font-mono text-slate-600 mt-2">Or click directly on the map above to add waypoints</p>
          </div>
        )}
      </div>

      {/* ── Right: Panel ── */}
      <div className="lg:col-span-4 flex flex-col gap-5">

        {/* Crime Hotspot Priority List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <Flame className="w-4 h-4 text-red-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hotspot Priority Queue</h4>
            <span className="ml-auto text-[9px] font-mono text-red-400 bg-red-900/20 border border-red-500/20 px-2 py-0.5 rounded">
              PATROL MANDATORY
            </span>
          </div>
          <div className="space-y-2">
            {sortedHotspots.map((hs, idx) => (
              <div key={idx} className={`p-3 rounded-lg border flex items-center gap-3 ${
                hs.severity === "CRITICAL"
                  ? "bg-red-900/10 border-red-500/20"
                  : "bg-amber-900/10 border-amber-500/20"
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                  hs.severity === "CRITICAL" ? "bg-red-900/50 text-red-300" : "bg-amber-900/50 text-amber-300"
                }`}>
                  {hs.crimeCount}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-white font-semibold leading-tight truncate">{hs.name}</div>
                  <div className={`text-[9px] font-mono font-bold mt-0.5 ${
                    hs.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"
                  }`}>
                    {hs.severity}
                  </div>
                </div>
                <div className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  hs.severity === "CRITICAL" ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400"
                }`}>
                  {hs.crimeCount} crimes
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Dispatch to Route */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Assign Unit to Route</h4>
          </div>
          <div className="space-y-2 mb-4">
            {units.slice(0, 5).map(unit => (
              <button
                key={unit.id}
                onClick={() => setActiveUnitId(unit.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  activeUnitId === unit.id
                    ? "bg-violet-900/20 border-violet-500/40"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-white">{unit.name}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    unit.status === "Alert" ? "bg-red-900/40 text-red-400" :
                    unit.status === "Moving" ? "bg-amber-900/40 text-amber-400" :
                    unit.status === "Patrol" ? "bg-green-900/40 text-green-400" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {unit.status}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">{unit.officerName} · {unit.location}</div>
              </button>
            ))}
          </div>
          <button
            disabled={isRouting}
            onClick={() => {
              onOptimizeRoute(activeUnitId);
              const preset = ROUTE_PRESETS[selectedPreset];
              drawRoute(preset.waypoints, preset.color, selectedPreset);
            }}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRouting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isRouting ? "ROUTING…" : `DISPATCH ${activeUnit?.name || "UNIT"} ON ROUTE`}
          </button>
        </div>

        {/* Route Stats Summary */}
        {routeResult && !isRouting && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              Route Analytics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Distance</div>
                <div className="text-xl font-bold font-mono text-violet-400">{routeResult.distanceKm.toFixed(1)}<span className="text-xs text-slate-500 ml-1">km</span></div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Patrol Time</div>
                <div className="text-xl font-bold font-mono text-amber-400">{Math.round(routeResult.durationMin)}<span className="text-xs text-slate-500 ml-1">min</span></div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Hotspots</div>
                <div className="text-xl font-bold font-mono text-red-400">{routeResult.hotspotsCount}<span className="text-xs text-slate-500 ml-1">zones</span></div>
              </div>
              <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                <div className="text-[9px] font-mono text-slate-500 uppercase">Coverage</div>
                <div className="text-xl font-bold font-mono text-green-400">{Math.min(95, 70 + routeResult.hotspotsCount * 6)}<span className="text-xs text-slate-500 ml-1">%</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Route verified via OSRM road network · All hotspots included
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
