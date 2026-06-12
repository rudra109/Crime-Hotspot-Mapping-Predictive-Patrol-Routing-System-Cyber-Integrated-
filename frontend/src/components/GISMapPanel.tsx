/**
 * GISMapPanel — Advanced GIS-Based Crime Mapping
 *
 * Features:
 * - Real Ahmedabad police station boundaries with station icons
 * - Administrative zone overlays (East/West/North/South/Central)
 * - Hotspot heatmap with crime density circles
 * - Area-to-street drill-down via click
 * - Real-time filtering by time window, crime type, source, and zone
 * - Live Nominatim reverse geocoding on click
 * - Road network via OpenStreetMap tile layers
 * - Dark map tile option for tactical view
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Filter, Layers, Building2, ChevronRight,
  Search, Clock, Shield, AlertTriangle, X, Radio,
  Navigation, Eye, ZoomIn, ZoomOut, RefreshCw, Activity
} from 'lucide-react';
import { Incident } from '../types';
import {
  AHMEDABAD_POLICE_STATIONS, AHMEDABAD_ZONES, TIME_FILTERS, CRIME_TYPE_COLORS,
  PoliceStation, AhmedabadZone, findNearestStation, findZone, reverseGeocode
} from '../gis-data';
import { crimeHotspots } from '../data';

const getL = () => (window as any).L;

// Tile layer options
const TILE_LAYERS = {
  standard: {
    label: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    className: ''
  },
  dark: {
    label: 'Dark Tactical',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    className: ''
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    className: ''
  }
};

interface DrilldownData {
  lat: number;
  lng: number;
  street?: string;
  area?: string;
  locality?: string;
  nearestStation?: PoliceStation;
  zone?: AhmedabadZone | null;
  nearbyIncidents?: Incident[];
  isLoading: boolean;
}

interface GISMapPanelProps {
  incidents: Incident[];
}

const CRIME_CATEGORIES = Object.keys(CRIME_TYPE_COLORS);

export default function GISMapPanel({ incidents }: GISMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const layerGroupRefs = useRef<{ [key: string]: any[] }>({
    stations: [], zones: [], hotspots: [], incidents: [], drilldown: []
  });

  // Filter state
  const [activeTimeFilter, setActiveTimeFilter] = useState('all');
  const [activeCrimeTypes, setActiveCrimeTypes] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<'all' | 'fir' | 'complaint' | 'patrol_log' | 'cyber_branch'>('all');
  const [activeZone, setActiveZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Layer visibility
  const [showStations, setShowStations] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [activeTile, setActiveTile] = useState<keyof typeof TILE_LAYERS>('dark');

  // Drilldown
  const [drilldown, setDrilldown] = useState<DrilldownData | null>(null);
  const [selectedStation, setSelectedStation] = useState<PoliceStation | null>(null);
  const [selectedZone, setSelectedZone] = useState<AhmedabadZone | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Stats
  const [filteredCount, setFilteredCount] = useState(0);

  // ──────────────────────── FILTER LOGIC ────────────────────────

  const getFilteredIncidents = useCallback(() => {
    let filtered = [...incidents];

    // Crime type filter
    if (activeCrimeTypes.length > 0) {
      filtered = filtered.filter(i => activeCrimeTypes.includes(i.category));
    }

    // Zone filter
    if (activeZone !== 'all') {
      const zone = AHMEDABAD_ZONES.find(z => z.id === activeZone);
      if (zone) {
        const [minLat, maxLat] = [zone.boundary[2][0], zone.boundary[0][0]];
        const [minLng, maxLng] = [zone.boundary[0][1], zone.boundary[1][1]];
        filtered = filtered.filter(i =>
          i.coordinates[0] >= minLat && i.coordinates[0] <= maxLat &&
          i.coordinates[1] >= minLng && i.coordinates[1] <= maxLng
        );
      }
    }

    return filtered;
  }, [incidents, activeCrimeTypes, activeZone, activeTimeFilter]);

  // ──────────────────────── MAP INIT ────────────────────────

  useEffect(() => {
    let attempts = 0;
    const tryInit = () => {
      const L = getL();
      if (!L) {
        if (attempts++ < 30) setTimeout(tryInit, 150);
        return;
      }
      if (!mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [23.0225, 72.5714],
        zoom: 12,
        zoomControl: false,
        preferCanvas: true,
      });

      // Dark tile by default
      const tl = TILE_LAYERS[activeTile];
      tileLayerRef.current = L.tileLayer(tl.url, {
        attribution: tl.attribution,
        maxZoom: 19,
      }).addTo(map);

      // Custom zoom control placement
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Scale bar
      L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 200);

      // Map click for drilldown
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        setDrilldown({ lat, lng, isLoading: true });

        const station = findNearestStation(lat, lng);
        const zone = findZone(lat, lng);
        const nearby = incidents.filter(i =>
          Math.sqrt(Math.pow(i.coordinates[0] - lat, 2) + Math.pow(i.coordinates[1] - lng, 2)) < 0.015
        );

        const geo = await reverseGeocode(lat, lng);
        setDrilldown({
          lat, lng,
          street: geo?.street || '',
          area: geo?.area || '',
          locality: geo?.locality || '',
          nearestStation: station,
          zone,
          nearbyIncidents: nearby,
          isLoading: false
        });
      });
    };

    tryInit();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ──────────────────────── TILE LAYER SWITCH ────────────────────────

  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;
    if (tileLayerRef.current) { tileLayerRef.current.remove(); }
    const tl = TILE_LAYERS[activeTile];
    tileLayerRef.current = L.tileLayer(tl.url, {
      attribution: tl.attribution,
      maxZoom: 19,
    }).addTo(mapRef.current);
    tileLayerRef.current.setZIndex(0);
  }, [activeTile, mapReady]);

  // ──────────────────────── ZONE OVERLAYS ────────────────────────

  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    layerGroupRefs.current.zones.forEach(l => l.remove());
    layerGroupRefs.current.zones = [];

    if (!showZones) return;

    AHMEDABAD_ZONES.forEach(zone => {
      const isSelected = selectedZone?.id === zone.id || activeZone === zone.id;
      const poly = L.polygon(zone.boundary, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: isSelected ? 0.15 : 0.06,
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.9 : 0.5,
        dashArray: isSelected ? '' : '6 4',
      }).addTo(mapRef.current);

      // Zone label
      const label = L.marker(zone.center, {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background: ${zone.color}22;
            color: ${zone.color};
            border: 1px solid ${zone.color}66;
            border-radius: 6px;
            padding: 3px 10px;
            font-size: 10px;
            font-family: ui-monospace,monospace;
            font-weight: 800;
            white-space: nowrap;
            letter-spacing: 1px;
            text-transform: uppercase;
            pointer-events: none;
            backdrop-filter: blur(4px);
          ">${zone.name} — DCP Zone</div>`,
          iconAnchor: [55, 10],
        }),
        interactive: false,
      }).addTo(mapRef.current);

      poly.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        setSelectedZone(zone);
        setActiveZone(zone.id);
      });

      poly.bindTooltip(`
        <b style="font-family:monospace">${zone.name}</b><br/>
        <span style="font-size:11px">DCP: ${zone.dcp}</span><br/>
        <span style="font-size:11px">Stations: ${zone.stationIds.length} | Area: ${zone.area_sqkm} km²</span>
      `, { direction: 'center' });

      layerGroupRefs.current.zones.push(poly, label);
    });
  }, [mapReady, showZones, selectedZone, activeZone]);

  // ──────────────────────── POLICE STATIONS ────────────────────────

  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    layerGroupRefs.current.stations.forEach(l => l.remove());
    layerGroupRefs.current.stations = [];

    if (!showStations) return;

    AHMEDABAD_POLICE_STATIONS.forEach(station => {
      const zone = AHMEDABAD_ZONES.find(z => z.id === `ZONE-${station.zone}`);
      const color = zone?.color || '#00E5FF';
      const isSelected = selectedStation?.id === station.id;

      const marker = L.marker([station.lat, station.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            width: ${isSelected ? 36 : 28}px;
            height: ${isSelected ? 36 : 28}px;
            background: ${isSelected ? color : '#0B1220'};
            border: ${isSelected ? '3px' : '2px'} solid ${color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? 16 : 13}px;
            box-shadow: 0 0 ${isSelected ? 20 : 10}px ${color}55;
            cursor: pointer;
            transition: all 0.2s;
          ">🛡️</div>`,
          iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
          iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
        })
      }).addTo(mapRef.current);

      marker.bindPopup(`
        <div style="font-family:ui-monospace,monospace;font-size:12px;min-width:220px;padding:4px">
          <div style="font-weight:800;color:#0f172a;font-size:13px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">
            🛡️ ${station.name}
          </div>
          <div style="color:#475569;margin-bottom:3px">Zone: <b>${station.zone}</b></div>
          <div style="color:#475569;margin-bottom:3px">Beats: <b>${station.beatCount}</b></div>
          <div style="color:#475569;margin-bottom:3px">📍 ${station.address}</div>
          ${station.phone ? `<div style="color:#475569">📞 ${station.phone}</div>` : ''}
          <div style="color:#64748b;font-size:10px;margin-top:6px">Jurisdiction: ${station.jurisdiction}</div>
        </div>
      `);

      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        setSelectedStation(station);
      });

      layerGroupRefs.current.stations.push(marker);
    });
  }, [mapReady, showStations, selectedStation]);

  // ──────────────────────── HOTSPOT CIRCLES ────────────────────────

  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    layerGroupRefs.current.hotspots.forEach(l => l.remove());
    layerGroupRefs.current.hotspots = [];

    if (!showHotspots) return;

    crimeHotspots.forEach(hs => {
      const isCritical = hs.severity === 'CRITICAL';
      const color = isCritical ? '#ef4444' : '#f59e0b';
      const radius = isCritical ? 700 : 500;

      // Outer pulsing ring
      const outer = L.circle([hs.lat, hs.lng], {
        radius: radius * 1.5,
        fillColor: color, fillOpacity: 0.04,
        color, weight: 1, opacity: 0.3, dashArray: '8 6'
      }).addTo(mapRef.current);

      // Main circle
      const inner = L.circle([hs.lat, hs.lng], {
        radius,
        fillColor: color, fillOpacity: 0.15,
        color, weight: 2, opacity: 0.75
      }).addTo(mapRef.current);

      // Label
      const label = L.marker([hs.lat, hs.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="
            background:${isCritical ? 'rgba(127,29,29,0.85)' : 'rgba(120,53,15,0.85)'};
            color:${color};border:1px solid ${color}80;
            border-radius:6px;padding:3px 8px;
            font-size:9px;font-family:ui-monospace,monospace;
            font-weight:700;white-space:nowrap;
            pointer-events:none;backdrop-filter:blur(4px);
            box-shadow:0 2px 8px rgba(0,0,0,.4)
          ">⚠ ${hs.name.replace(' Hotspot', '').toUpperCase()} (${hs.crimeCount} crimes)</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(mapRef.current);

      layerGroupRefs.current.hotspots.push(outer, inner, label);
    });
  }, [mapReady, showHotspots]);

  // ──────────────────────── INCIDENT MARKERS ────────────────────────

  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    layerGroupRefs.current.incidents.forEach(l => l.remove());
    layerGroupRefs.current.incidents = [];

    if (!showIncidents) return;

    const filtered = getFilteredIncidents().filter(i => i.status !== 'Resolved');
    setFilteredCount(filtered.length);

    filtered.forEach(incident => {
      const [lat, lng] = incident.coordinates;
      const color = CRIME_TYPE_COLORS[incident.category] || '#475569';
      const radius = incident.threatIndex >= 90 ? 13 : incident.isHighPriority ? 10 : 7;

      const marker = L.circleMarker([lat, lng], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(mapRef.current);

      const nearStation = findNearestStation(lat, lng);

      marker.bindPopup(`
        <div style="font-family:ui-sans-serif,system-ui;font-size:12px;min-width:220px;padding:4px">
          <div style="font-weight:700;color:#0f172a;font-size:13px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px">
            <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:4px"></span>
            ${incident.category}
          </div>
          <div style="color:#475569;margin-bottom:3px">📍 ${incident.location}</div>
          <div style="color:#475569;margin-bottom:3px">⚠️ Threat: <b style="color:${color}">${incident.threatIndex}/100</b></div>
          <div style="color:#475569;margin-bottom:3px">📋 Status: ${incident.status}</div>
          <div style="color:#475569;margin-bottom:3px">🛡️ Nearest PS: ${nearStation.shortName}</div>
          <div style="color:#64748b;font-size:10px;margin-top:5px">🕐 ${incident.timestamp}</div>
          <div style="color:#64748b;font-size:10px">${incident.id} — ${incident.reportedBy}</div>
        </div>
      `);

      layerGroupRefs.current.incidents.push(marker);
    });
  }, [mapReady, showIncidents, getFilteredIncidents]);

  // ──────────────────────── GEOCODE SEARCH ────────────────────────

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const L = getL();
      const encoded = encodeURIComponent(`${searchQuery}, Ahmedabad, Gujarat, India`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'AhmedabadPolice/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });

        // Drop a marker
        layerGroupRefs.current.drilldown.forEach(l => l.remove());
        layerGroupRefs.current.drilldown = [];
        const m = L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="color:#00E5FF;font-size:28px;text-shadow:0 0 10px #00E5FF">📍</div>`,
            iconSize: [28, 28], iconAnchor: [14, 28]
          })
        }).addTo(mapRef.current);
        m.bindPopup(`<b style="font-family:monospace">${data[0].display_name.split(',').slice(0, 3).join(',')}</b>`).openPopup();
        layerGroupRefs.current.drilldown.push(m);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCrimeType = (type: string) => {
    setActiveCrimeTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const resetFilters = () => {
    setActiveCrimeTypes([]);
    setActiveTimeFilter('all');
    setActiveSource('all');
    setActiveZone('all');
    setSelectedZone(null);
    setSelectedStation(null);
    setDrilldown(null);
  };

  const filteredIncidents = getFilteredIncidents();

  return (
    <div className="flex flex-col gap-6 font-sans" id="gis-map-panel">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-cyan-400 font-semibold mb-1">Advanced GIS Module</div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-none">CRIME HOTSPOT MAP</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">Real police boundaries · Station overlays · Street drill-down · Live geocoding</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-slate-400 bg-[#0B1220] border border-slate-800 rounded-lg py-1 px-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {filteredCount} active incidents
          </span>
          <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white bg-[#0B1220] border border-slate-800 hover:border-slate-600 rounded-lg py-1 px-3 transition-colors">
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left Panel: Filters + Stats ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Search */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Geocode Search
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search area, street..."
                className="flex-1 bg-[#050B14] border border-slate-700 text-slate-200 placeholder-slate-600 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500/50 transition-colors font-mono"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Map Layers */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Map Layers
            </div>
            <div className="space-y-2">
              {[
                { label: 'Police Stations', key: 'showStations', value: showStations, setter: setShowStations, icon: '🛡️', color: 'cyan' },
                { label: 'Zone Boundaries', key: 'showZones', value: showZones, setter: setShowZones, icon: '🗺️', color: 'purple' },
                { label: 'Crime Hotspots', key: 'showHotspots', value: showHotspots, setter: setShowHotspots, icon: '⚠️', color: 'red' },
                { label: 'Incidents', key: 'showIncidents', value: showIncidents, setter: setShowIncidents, icon: '📍', color: 'amber' },
              ].map(layer => (
                <button
                  key={layer.key}
                  onClick={() => layer.setter(!layer.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                    layer.value
                      ? 'border-slate-600 bg-slate-800/50 text-white'
                      : 'border-slate-800 bg-transparent text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{layer.icon}</span>
                    {layer.label}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${layer.value ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Tile Style */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">Map Style</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveTile(key)}
                  className={`py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider border transition-all ${
                    activeTile === key
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {TILE_LAYERS[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Filter */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Time Window
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TIME_FILTERS.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setActiveTimeFilter(tf.value)}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider border transition-all ${
                    activeTimeFilter === tf.value
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zone Filter */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Navigation className="w-3 h-3" /> Filter by Zone
            </div>
            <div className="space-y-1">
              <button
                onClick={() => { setActiveZone('all'); setSelectedZone(null); }}
                className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold text-left border transition-all ${
                  activeZone === 'all' ? 'bg-white/10 text-white border-slate-600' : 'text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                All Zones
              </button>
              {AHMEDABAD_ZONES.map(zone => (
                <button
                  key={zone.id}
                  onClick={() => { setActiveZone(zone.id); setSelectedZone(zone); }}
                  className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold text-left border transition-all flex items-center gap-2 ${
                    activeZone === zone.id ? 'border-slate-600 bg-slate-800/50 text-white' : 'text-slate-500 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                  {zone.name}
                </button>
              ))}
            </div>
          </div>

          {/* Crime Type Filter */}
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> Crime Type
              {activeCrimeTypes.length > 0 && (
                <span className="ml-auto text-cyan-400 font-bold">{activeCrimeTypes.length} active</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {CRIME_CATEGORIES.slice(0, 12).map(type => (
                <button
                  key={type}
                  onClick={() => toggleCrimeType(type)}
                  className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border transition-all ${
                    activeCrimeTypes.includes(type)
                      ? 'text-white border-transparent'
                      : 'text-slate-500 border-slate-800 hover:border-slate-700 bg-transparent'
                  }`}
                  style={activeCrimeTypes.includes(type) ? {
                    backgroundColor: CRIME_TYPE_COLORS[type] + '44',
                    borderColor: CRIME_TYPE_COLORS[type] + '88',
                    color: CRIME_TYPE_COLORS[type]
                  } : {}}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ── Right Panel: Map ── */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          <div className="bg-[#0B1220] border border-slate-800 rounded-xl overflow-hidden relative">
            {/* Map */}
            <div
              ref={mapContainerRef}
              className="w-full"
              style={{ height: '600px', zIndex: 0, backgroundColor: '#050B14', minHeight: '600px' }}
            />

            {/* Legend overlay */}
            <div className="absolute top-3 right-3 z-[400] bg-[#0B1220]/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 flex flex-col gap-1.5 shadow-xl">
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">Legend</div>
              {AHMEDABAD_ZONES.map(z => (
                <div key={z.id} className="flex items-center gap-2 text-[9px] font-mono text-slate-300">
                  <span className="w-3 h-2 rounded shrink-0" style={{ backgroundColor: z.color + '88', border: `1px solid ${z.color}` }} />
                  {z.name}
                </div>
              ))}
              <div className="border-t border-slate-800 my-1" />
              <div className="flex items-center gap-2 text-[9px] font-mono text-slate-300">
                <span className="text-xs">🛡️</span> Police Station
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-red-400">
                <span className="w-3 h-3 rounded-full shrink-0 bg-red-500/40 border border-red-500/60" /> Critical Hotspot
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono text-amber-400">
                <span className="w-3 h-3 rounded-full shrink-0 bg-amber-500/40 border border-amber-500/60" /> High Hotspot
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-1">Click map to drill-down</div>
            </div>

            {/* Not ready overlay */}
            {!mapReady && (
              <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#050B14]/90">
                <div className="flex flex-col items-center gap-3 text-slate-400 font-mono text-sm">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  <span>Initialising GIS Map...</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Drill-down + Station + Zone Panels ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Drilldown */}
            <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4 md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ZoomIn className="w-3 h-3 text-cyan-400" /> Click Drill-Down
                </div>
                {drilldown && (
                  <button onClick={() => setDrilldown(null)} className="text-slate-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {!drilldown ? (
                <div className="text-center py-6 text-slate-600 font-mono text-[11px]">
                  <MapPin className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Click anywhere on the map for street-level details and geocoding
                </div>
              ) : drilldown.isLoading ? (
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs py-4">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Geocoding...
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  <div className="bg-[#050B14] rounded-lg p-2.5 border border-slate-800">
                    <div className="text-slate-400 text-[9px] uppercase mb-1">Coordinates</div>
                    <div className="text-cyan-300 font-bold">{drilldown.lat.toFixed(5)}, {drilldown.lng.toFixed(5)}</div>
                  </div>
                  {drilldown.street && (
                    <div className="bg-[#050B14] rounded-lg p-2.5 border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase mb-1">Street</div>
                      <div className="text-white">{drilldown.street}</div>
                    </div>
                  )}
                  {drilldown.area && (
                    <div className="bg-[#050B14] rounded-lg p-2.5 border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase mb-1">Area / Locality</div>
                      <div className="text-white">{drilldown.area}</div>
                    </div>
                  )}
                  {drilldown.zone && (
                    <div className="bg-[#050B14] rounded-lg p-2.5 border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase mb-1">Police Zone</div>
                      <div className="font-bold" style={{ color: drilldown.zone.color }}>{drilldown.zone.name}</div>
                      <div className="text-slate-400 text-[9px]">{drilldown.zone.dcp}</div>
                    </div>
                  )}
                  {drilldown.nearestStation && (
                    <div className="bg-[#050B14] rounded-lg p-2.5 border border-slate-800">
                      <div className="text-slate-400 text-[9px] uppercase mb-1">Nearest Station</div>
                      <div className="text-white font-bold">{drilldown.nearestStation.shortName}</div>
                      <div className="text-slate-400 text-[9px]">{drilldown.nearestStation.beatCount} beats</div>
                    </div>
                  )}
                  {drilldown.nearbyIncidents && drilldown.nearbyIncidents.length > 0 && (
                    <div className="bg-[#050B14] rounded-lg p-2.5 border border-red-900/40">
                      <div className="text-red-400 text-[9px] uppercase mb-1">Nearby Incidents ({drilldown.nearbyIncidents.length})</div>
                      {drilldown.nearbyIncidents.slice(0, 3).map(i => (
                        <div key={i.id} className="text-slate-300 text-[9px] py-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CRIME_TYPE_COLORS[i.category] || '#475569' }} />
                          {i.category} — {i.id}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Station Panel */}
            <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-cyan-400" /> Station Details
              </div>
              {!selectedStation ? (
                <div className="text-center py-6 text-slate-600 font-mono text-[11px]">
                  <Building2 className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Click a 🛡️ station icon on the map
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{selectedStation.shortName}</div>
                      <div className="text-slate-400 text-[10px]">{selectedStation.zone} Zone</div>
                    </div>
                    <button onClick={() => setSelectedStation(null)} className="text-slate-600 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Address', val: selectedStation.address },
                      { label: 'Beats', val: `${selectedStation.beatCount} patrol beats` },
                      { label: 'Jurisdiction', val: selectedStation.jurisdiction },
                      { label: 'Phone', val: selectedStation.phone || 'N/A' },
                    ].map(row => (
                      <div key={row.label} className="bg-[#050B14] rounded-lg px-2.5 py-2 border border-slate-800">
                        <div className="text-slate-500 text-[9px] uppercase">{row.label}</div>
                        <div className="text-slate-200 text-[10px] mt-0.5">{row.val}</div>
                      </div>
                    ))}
                    <div className="bg-[#050B14] rounded-lg px-2.5 py-2 border border-slate-800">
                      <div className="text-slate-500 text-[9px] uppercase">Incidents in Jurisdiction</div>
                      <div className="text-cyan-300 font-bold text-sm mt-0.5">
                        {incidents.filter(i => {
                          const dist = Math.sqrt(
                            Math.pow(i.coordinates[0] - selectedStation.lat, 2) +
                            Math.pow(i.coordinates[1] - selectedStation.lng, 2)
                          );
                          return dist < 0.04;
                        }).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Zone Stats */}
            <div className="bg-[#0B1220] border border-slate-800 rounded-xl p-4">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-cyan-400" /> Zone Summary
              </div>
              <div className="space-y-2">
                {AHMEDABAD_ZONES.map(zone => {
                  const [minLat, maxLat] = [zone.boundary[2][0], zone.boundary[0][0]];
                  const [minLng, maxLng] = [zone.boundary[0][1], zone.boundary[1][1]];
                  const count = incidents.filter(i =>
                    i.coordinates[0] >= minLat && i.coordinates[0] <= maxLat &&
                    i.coordinates[1] >= minLng && i.coordinates[1] <= maxLng &&
                    i.status !== 'Resolved'
                  ).length;
                  const pct = Math.round((count / Math.max(incidents.length, 1)) * 100);
                  return (
                    <button
                      key={zone.id}
                      onClick={() => { setActiveZone(zone.id); setSelectedZone(zone); }}
                      className="w-full"
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                          {zone.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: zone.color }}>{count}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: zone.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-800 mt-3 pt-3 font-mono text-[10px] text-slate-400">
                Total active: <span className="text-white font-bold">{incidents.filter(i => i.status !== 'Resolved').length}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
