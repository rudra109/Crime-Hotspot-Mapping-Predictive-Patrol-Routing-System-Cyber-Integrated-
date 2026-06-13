/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, Radio, Activity, Navigation,
  MapPin, CheckCircle, RefreshCw, Send, Plus, X, AlertTriangle,
  Eye, Flame, Cpu, ChevronRight, Bell, History, TrendingUp, AlertOctagon,
  Download, FileSpreadsheet, FileText, Filter, Calendar, Users, Briefcase, Paperclip
} from "lucide-react";
import { Incident, Alert, PatrolUnit } from "../types";
import { crimeHotspots, compulsoryPatrolRoutes } from "../data";
import { acknowledgeAlert, escalateAlert, fetchAlertHistory, simulate112Call, fetch112Logs } from "../api/apiClient";

// Leaflet is loaded via CDN script tag — access via window to avoid ES module strict-mode issues
const getL = () => (window as any).L;

interface CommandDashboardProps {
  incidents: Incident[];
  alerts: Alert[];
  units: PatrolUnit[];
  onDispatchUnit: (unitId: string, incidentId: string) => void;
  onAddIncident: (incident: Incident) => void;
  onAckAlert: (alertId: string, payload?: any) => void;
  onEscalateAlert?: (alertId: string, level: number, reason?: string) => void;
  onSimulateAlarm: () => void;
}

const CRIME_CATEGORIES = [
  "Assault", "Robbery", "Theft", "Snatching", "Vandalism",
  "Drug Trafficking", "Cybercrime", "Fraud", "Domestic Violence",
  "Traffic Violation", "Accident", "Kidnapping", "Arson",
  "Rioting", "Gang Activity", "Other"
];

export default function CommandDashboard({
  incidents,
  alerts,
  units,
  onDispatchUnit,
  onAddIncident,
  onAckAlert,
  onEscalateAlert,
  onSimulateAlarm,
}: CommandDashboardProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hotspotLayersRef = useRef<any[]>([]);
  const patrolLayersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [patrolCount] = useState(12);

  // Role HUD/Dashboard view states
  const [dashboardMode, setDashboardMode] = useState<'dispatcher' | 'supervisor' | 'officer'>('dispatcher');

  // Unified registry filters state
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterZone, setFilterZone] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Incident Drill-down details state
  const [drillDownIncident, setDrillDownIncident] = useState<Incident | null>(null);
  const [newTimelineNote, setNewTimelineNote] = useState("");
  const [newAttachmentName, setNewAttachmentName] = useState("");
  
  // Custom timeline notes store indexed by case ID
  const [customIncNotes, setCustomIncNotes] = useState<Record<string, Array<{ time: string; note: string; officer: string }>>>({});
  // Custom attachments store indexed by case ID
  const [customIncFiles, setCustomIncFiles] = useState<Record<string, Array<{ name: string; size: string; date: string; type: string }>>>({});

  // Memoized filter logic for the incident list
  const filteredIncidents = React.useMemo(() => {
    return incidents.filter(inc => {
      // 1. Search Query
      if (filterSearch) {
        const query = filterSearch.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(query);
        const matchesCat = inc.category.toLowerCase().includes(query);
        const matchesLoc = inc.location.toLowerCase().includes(query);
        const matchesDesc = inc.description?.toLowerCase().includes(query) ?? false;
        if (!matchesId && !matchesCat && !matchesLoc && !matchesDesc) return false;
      }

      // 2. Date Range
      if (filterDateRange !== 'all') {
        const ts = inc.timestamp || "";
        if (filterDateRange === 'last24h') {
          // Mock filter: return cases containing "IST" or "Immediate"
          if (!ts.includes('IST') && !ts.includes('Immediate')) return false;
        }
      }

      // 3. Source
      if (filterSource !== 'all') {
        const sourceVal = inc.source || (inc.reportedBy?.toLowerCase().includes('mobile') || inc.location.includes('Mobile') ? 'mobile_officer' : 'fir');
        if (filterSource === 'fir' && sourceVal !== 'fir') return false;
        if (filterSource === 'complaint' && sourceVal !== 'complaint') return false;
        if (filterSource === 'patrol' && sourceVal !== 'patrol_log') return false;
        if (filterSource === 'cyber' && sourceVal !== 'cyber_branch') return false;
        if (filterSource === 'mobile' && sourceVal !== 'mobile_officer') return false;
      }

      // 4. Zone
      if (filterZone !== 'all') {
        const zoneLower = filterZone.toLowerCase();
        let incZone = "central";
        const loc = inc.location.toLowerCase();
        if (loc.includes('vastrapur') || loc.includes('thaltej') || loc.includes('sg highway') || loc.includes('bopal')) incZone = "west";
        else if (loc.includes('naranpura') || loc.includes('chandkheda') || loc.includes('sabarmati')) incZone = "north";
        else if (loc.includes('bapunagar') || loc.includes('odhav') || loc.includes('nikol')) incZone = "east";
        else if (loc.includes('maninagar') || loc.includes('vatva')) incZone = "south";
        
        if (incZone !== zoneLower) return false;
      }

      // 5. Severity
      if (filterSeverity !== 'all') {
        const index = inc.threatIndex;
        if (filterSeverity === 'critical' && index < 85) return false;
        if (filterSeverity === 'high' && (index < 60 || index >= 85)) return false;
        if (filterSeverity === 'moderate' && (index < 40 || index >= 60)) return false;
        if (filterSeverity === 'routine' && index >= 40) return false;
      }

      // 6. Case Status
      if (filterStatus !== 'all') {
        if (inc.status !== filterStatus) return false;
      }

      return true;
    });
  }, [incidents, filterSearch, filterDateRange, filterSource, filterZone, filterSeverity, filterStatus]);

  // CSV Export utility
  const handleExportCSV = () => {
    const headers = ["Incident ID", "Category", "Location", "Coordinates", "Status", "Reported By", "Threat Index", "Timestamp", "Source"];
    const rows = filteredIncidents.map(inc => {
      const sourceVal = inc.source || (inc.reportedBy?.toLowerCase().includes('mobile') || inc.location.includes('Mobile') ? 'mobile_officer' : 'fir');
      return [
        inc.id,
        inc.category,
        `"${inc.location.replace(/"/g, '""')}"`,
        `"${inc.coordinates.join(', ')}"`,
        inc.status,
        `"${inc.reportedBy.replace(/"/g, '""')}"`,
        inc.threatIndex,
        inc.timestamp,
        sourceVal.toUpperCase()
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ahmedabad_incident_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export utility (renders a stylized printing page in a new window)
  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the PDF Report.");
      return;
    }

    const rowsHtml = filteredIncidents.map(inc => {
      const sourceVal = inc.source || (inc.reportedBy?.toLowerCase().includes('mobile') || inc.location.includes('Mobile') ? 'mobile_officer' : 'fir');
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">
          <td style="padding: 8px; font-weight: bold; color: #1e293b;">${inc.id}</td>
          <td style="padding: 8px;">${inc.category}</td>
          <td style="padding: 8px;">${inc.location}</td>
          <td style="padding: 8px;">
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;
              ${inc.status === 'Resolved' ? 'background-color: #d1fae5; color: #065f46;' :
                inc.status === 'Dispatched' ? 'background-color: #dbeafe; color: #1e40af;' :
                inc.status === 'Intervening' ? 'background-color: #fef3c7; color: #92400e;' :
                'background-color: #fee2e2; color: #991b1b;'} font-family: sans-serif;">
              ${inc.status.toUpperCase()}
            </span>
          </td>
          <td style="padding: 8px; font-weight: bold; color: ${inc.threatIndex >= 80 ? '#dc2626' : inc.threatIndex >= 50 ? '#d97706' : '#2563eb'}">${inc.threatIndex}%</td>
          <td style="padding: 8px;">${sourceVal.toUpperCase()}</td>
          <td style="padding: 8px;">${inc.timestamp}</td>
        </tr>
      `;
    }).join("");

    const totalCount = filteredIncidents.length;
    const criticalCount = filteredIncidents.filter(i => i.threatIndex >= 85).length;
    const activeCount = filteredIncidents.filter(i => i.status !== 'Resolved').length;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ahmedabad Police Command Center - Incident Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; margin: 40px; }
            h1 { font-size: 22px; color: #0f172a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
            .header-bar { border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
            .meta { font-size: 11px; color: #64748b; font-family: monospace; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .card-title { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 5px; }
            .card-value { font-size: 20px; font-weight: bold; color: #0f172a; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #f1f5f9; text-align: left; padding: 10px 8px; font-size: 10px; font-weight: bold; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            @media print {
              button { display: none; }
              body { margin: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <h1>Ahmedabad Police Command & Control</h1>
              <div class="meta">TACTICAL INCIDENT INTELLIGENCE REPORT</div>
            </div>
            <div class="meta" style="text-align: right;">
              <div>REPORT_GENERATED: ${new Date().toLocaleString()}</div>
              <div>FILTERED_TOTAL: ${totalCount} cases</div>
            </div>
          </div>

          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Filtered Cases</div>
              <div class="card-value">${totalCount}</div>
            </div>
            <div class="card">
              <div class="card-title">Critical Severity</div>
              <div class="card-value">${criticalCount}</div>
            </div>
            <div class="card">
              <div class="card-title">Active Dispatches</div>
              <div class="card-value">${activeCount}</div>
            </div>
          </div>

          <button onclick="window.print()" style="margin-bottom: 20px; padding: 8px 16px; background-color: #1e3a8a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
            🖨 Print / Save as PDF
          </button>

          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Category</th>
                <th>Location</th>
                <th>Status</th>
                <th>Threat %</th>
                <th>Source</th>
                <th>Time (IST)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No records matches the current filters.</td></tr>'}
            </tbody>
          </table>
          <footer style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; font-family: monospace; text-align: center;">
            CONFIDENTIAL // GUJARAT POLICE DEPT INTERNAL USE ONLY
          </footer>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Map layer toggles
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPatrolRoutes, setShowPatrolRoutes] = useState(true);

  // Add Incident Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    category: "Theft",
    location: "",
    lat: "",
    lng: "",
    description: "",
    reportedBy: "",
    priority: "false",
    threatIndex: "50",
  });
  const [addFormError, setAddFormError] = useState("");
  const [mapClickMode, setMapClickMode] = useState(false);

  const [aiResponse, setAiResponse] = useState<string>(
    "Ahmedabad Police operations assistant online. Enter a query or choose a quick directive below."
  );
  const [userQuery, setUserQuery] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Alert Detail Modal & Lifecycle tracking states
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [alertHistory, setAlertHistory] = useState<any[]>([]);
  const [showAckForm, setShowAckForm] = useState(false);
  const [showEscForm, setShowEscForm] = useState(false);
  const [ackOperatorId, setAckOperatorId] = useState("OP-77");
  const [ackOperatorName, setAckOperatorName] = useState("Inspector K. Gadhvi");
  const [ackNotes, setAckNotes] = useState("");
  const [escLevel, setEscLevel] = useState(2);
  const [escReason, setEscReason] = useState("");
  const [show112Logs, setShow112Logs] = useState(false);
  const [logs112, setLogs112] = useState<any[]>([]);
  const [simulating112, setSimulating112] = useState(false);
  const [sim112Error, setSim112Error] = useState("");
  const [sim112Success, setSim112Success] = useState("");

  // Fetch history for selected alert
  useEffect(() => {
    if (selectedAlert) {
      fetchAlertHistory(selectedAlert.id)
        .then(setAlertHistory)
        .catch(err => console.error("Error fetching alert history:", err));
    }
  }, [selectedAlert]);

  // Fetch 112 logs when open
  useEffect(() => {
    if (show112Logs) {
      fetch112Logs()
        .then(setLogs112)
        .catch(err => console.error("Error fetching 112 logs:", err));
    }
  }, [show112Logs]);

  // Sync active alert updates into selectedAlert if detail modal is open
  useEffect(() => {
    if (selectedAlert) {
      const current = alerts.find(a => a.id === selectedAlert.id);
      if (current) {
        setSelectedAlert(current);
      }
    }
  }, [alerts]);

  const handleSimulate112Call = async () => {
    setSimulating112(true);
    setSim112Error("");
    setSim112Success("");

    const emergencyTypes = [
      { type: "Armed Assault", desc: "Report of multiple shots fired near local shopping center.", district: "Vastrapur", lat: 23.0398, lng: 72.5281 },
      { type: "Cyber Ransomware Attack", desc: "LockBit ransomware encrypting local bank branch files.", district: "Satellite", lat: 23.0045, lng: 72.5845 },
      { type: "Vehicle Accident", desc: "Multi-car pileup causing major traffic bottleneck.", district: "Memnagar", lat: 23.0123, lng: 72.5612 },
      { type: "Arson/Fire Incident", desc: "Fire started in commercial warehouse building.", district: "Odhav", lat: 23.0290, lng: 72.6400 },
      { type: "Domestic Brawl", desc: "Violent confrontation reported at apartment block.", district: "Naranpura", lat: 23.0520, lng: 72.5680 }
    ];

    const pick = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
    const callId = `ERSS-112-${Math.floor(100000 + Math.random() * 900000)}`;
    const phone = `+91998${Math.floor(1000 + Math.random() * 9000)}7788`;

    try {
      const res = await simulate112Call({
        call_id: callId,
        caller_phone: phone,
        district: pick.district,
        incident_details: pick.desc,
        latitude: pick.lat,
        longitude: pick.lng,
        emergency_type: pick.type
      });

      setSim112Success(`Emergency call synced! Alert ID: ${res.alertId}`);
      if (show112Logs) {
        fetch112Logs().then(setLogs112);
      }
      setTimeout(() => setSim112Success(""), 4000);
    } catch (err: any) {
      setSim112Error(`Sync error: ${err.message}`);
    } finally {
      setSimulating112(false);
    }
  };

  const handleAcknowledgeDetailed = async () => {
    if (!selectedAlert) return;
    try {
      const payload = {
        operatorId: ackOperatorId,
        operatorName: ackOperatorName,
        notes: ackNotes
      };
      
      onAckAlert(selectedAlert.id, payload);
      
      setSelectedAlert({
        ...selectedAlert,
        status: 'Acknowledged',
        ...payload
      });
      setShowAckForm(false);
      setAckNotes("");
    } catch (err: any) {
      console.error("Failed to acknowledge alert detailed:", err);
    }
  };

  const handleEscalateDetailed = async () => {
    if (!selectedAlert) return;
    try {
      if (onEscalateAlert) {
        onEscalateAlert(selectedAlert.id, escLevel, escReason);
      } else {
        await escalateAlert(selectedAlert.id, {
          level: escLevel,
          reason: escReason
        });
      }
      
      setSelectedAlert({
        ...selectedAlert,
        status: 'Escalated',
        escalationLevel: escLevel,
        escalation: { level: escLevel, reason: escReason, at: new Date().toISOString() }
      });
      setShowEscForm(false);
      setEscReason("");
    } catch (err: any) {
      console.error("Failed to escalate alert detailed:", err);
    }
  };

  const activePresets = [
    { label: "Assess Vastrapur risk level", query: "Assess current sector risks and threat levels for Vastrapur." },
    { label: "Check SG Highway traffic", query: "Perform traffic diagnostics on SG Highway." },
    { label: "Request Deployment Strategy", query: "Draft deployment recommendation for active units in Memnagar." },
  ];

  // Initialize Leaflet map — poll until window.L CDN is available
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
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: 'map-tiles-dark-filter', // Assuming you might have a dark filter CSS class, otherwise standard tiles
        }
      ).addTo(map);

      mapRef.current = map;
      setMapReady(true);

      // Force size recalculation after DOM settles
      setTimeout(() => map.invalidateSize(), 200);
    };

    tryInit();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Map click mode for adding incident by clicking the map
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    const handleMapClick = (e: any) => {
      if (!mapClickMode) return;
      const { lat, lng } = e.latlng;
      setAddForm(prev => ({
        ...prev,
        lat: lat.toFixed(4),
        lng: lng.toFixed(4),
        location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      }));
      setMapClickMode(false);
      setShowAddModal(true);
    };

    mapRef.current.on("click", handleMapClick);
    return () => {
      if (mapRef.current) mapRef.current.off("click", handleMapClick);
    };
  }, [mapReady, mapClickMode]);

  // Toggle map cursor for click mode
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (container) {
      container.style.cursor = mapClickMode ? "crosshair" : "";
    }
  }, [mapClickMode]);

  // Draw / remove hotspot overlay circles
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    hotspotLayersRef.current.forEach(l => l.remove());
    hotspotLayersRef.current = [];

    if (!showHotspots) return;

    crimeHotspots.forEach(hs => {
      const isCritical = hs.severity === "CRITICAL";
      const radius = isCritical ? 600 : 450;
      const color = isCritical ? "#ef4444" : "#f59e0b";

      // Outer pulsing ring
      const outerCircle = L.circle([hs.lat, hs.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.08,
        color,
        weight: 2,
        opacity: 0.6,
        dashArray: "6 4",
      }).addTo(mapRef.current);

      // Inner filled hotspot
      const innerCircle = L.circle([hs.lat, hs.lng], {
        radius: radius * 0.45,
        fillColor: color,
        fillOpacity: 0.2,
        color,
        weight: 1.5,
        opacity: 0.8,
      }).addTo(mapRef.current);

      // Label
      const label = L.marker([hs.lat, hs.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="
            background:${isCritical ? "#7f1d1d" : "#78350f"};
            color:${color};
            border:1px solid ${color};
            border-radius:6px;
            padding:4px 8px;
            font-size:10px;
            font-family:ui-monospace, monospace;
            font-weight:700;
            white-space:nowrap;
            pointer-events:none;
            box-shadow:0 4px 12px rgba(0,0,0,.6);
            backdrop-filter: blur(4px);
          ">⚠ ${hs.name.toUpperCase()} (${hs.crimeCount})</div>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(mapRef.current);

      hotspotLayersRef.current.push(outerCircle, innerCircle, label);
    });
  }, [mapReady, showHotspots]);

  // Draw / remove compulsory patrol routes
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    patrolLayersRef.current.forEach(l => l.remove());
    patrolLayersRef.current = [];

    if (!showPatrolRoutes) return;

    compulsoryPatrolRoutes.forEach(route => {
      const latlngs = route.waypoints.map(wp => [wp.lat, wp.lng]);

      // Dashed route polyline
      const line = L.polyline(latlngs, {
        color: route.color,
        weight: 3,
        opacity: 0.8,
        dashArray: "10 8",
      }).addTo(mapRef.current);

      // Waypoint dots + markers
      route.waypoints.forEach((wp, idx) => {
        if (idx === 0 || idx === route.waypoints.length - 1) return; // skip HQ
        const dot = L.circleMarker([wp.lat, wp.lng], {
          radius: 5,
          fillColor: route.color,
          color: "#050B14",
          weight: 2,
          fillOpacity: 1,
        }).addTo(mapRef.current);
        dot.bindTooltip(`<span style="font-family:monospace;font-size:11px;font-weight:600;">${route.name}: ${wp.name}</span>`, { direction: "top", className: "custom-tooltip" });
        patrolLayersRef.current.push(dot);
      });

      patrolLayersRef.current.push(line);
    });
  }, [mapReady, showPatrolRoutes]);

  // Update markers whenever incidents change or map becomes ready
  useEffect(() => {
    const L = getL();
    if (!mapRef.current || !L || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredIncidents
      .filter((i) => i.status !== "Resolved")
      .forEach((incident) => {
        const [lat, lng] = incident.coordinates;

        // Choose color based on threat level
        const color =
          incident.threatIndex >= 80
            ? "#ef4444"
            : incident.threatIndex >= 50
              ? "#f59e0b"
              : "#00E5FF";

        // Larger pulsing marker for very high threat
        const radius = incident.threatIndex >= 90 ? 14 : incident.isHighPriority ? 11 : 8;

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          fillColor: color,
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          className: incident.threatIndex >= 90 ? 'pulse-marker' : ''
        }).addTo(mapRef.current);

        circleMarker.bindPopup(`
          <div style="font-family: ui-sans-serif, system-ui; font-size: 13px; min-width: 200px; padding: 4px;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size:14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">${incident.category}</div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>📍</span> ${incident.location}</div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>⚠️</span> Threat: <b style="color:${color}">${incident.threatIndex}/100</b></div>
            <div style="color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;"><span>📋</span> ${incident.status}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 6px;">🕐 ${incident.timestamp}</div>
          </div>
        `);

        circleMarker.on("click", () => {
          setSelectedIncident(incident);
        });

        markersRef.current.push(circleMarker);
      });
  }, [filteredIncidents, mapReady]);

  const handleQuerySubmit = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAiLoading(true);
    setAiResponse("Query sent. Analysing databanks...");

    try {
      const response = await fetch("/api/ai/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryText,
          context: { incidentsCount: incidents.length, incidentSample: incidents.slice(0, 3) },
        }),
      });
      const data = await response.json();
      setAiResponse(data.success ? data.response : "Failed to query AI Core.");
    } catch (err: any) {
      setAiResponse(`Connection timed out: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Handle Add Incident Form Submit ──
  const handleAddIncidentSubmit = () => {
    const lat = parseFloat(addForm.lat);
    const lng = parseFloat(addForm.lng);

    if (!addForm.location.trim()) { setAddFormError("Location name is required."); return; }
    if (isNaN(lat) || isNaN(lng)) { setAddFormError("Valid coordinates are required (Lat & Lng)."); return; }
    if (lat < 22.5 || lat > 23.5 || lng < 72.0 || lng > 73.5) {
      setAddFormError("Coordinates must be within Ahmedabad region (Lat 22.5–23.5, Lng 72.0–73.5)."); return;
    }
    if (!addForm.reportedBy.trim()) { setAddFormError("Reported By field is required."); return; }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")} IST`;
    const threatVal = Math.min(100, Math.max(0, parseInt(addForm.threatIndex) || 50));

    const newIncident: Incident = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      category: addForm.category,
      location: `${addForm.location} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      coordinates: [lat, lng],
      status: "Assessing",
      description: addForm.description || `${addForm.category} incident reported manually.`,
      timestamp: timeStr,
      reportedBy: addForm.reportedBy,
      isHighPriority: addForm.priority === "true",
      attachmentsCount: 0,
      threatIndex: threatVal,
    };

    onAddIncident(newIncident);
    setShowAddModal(false);
    setAddFormError("");
    setAddForm({
      category: "Theft", location: "", lat: "", lng: "",
      description: "", reportedBy: "", priority: "false", threatIndex: "50",
    });
  };

  const activeIncidentCount = incidents.filter((i) => i.status !== "Resolved").length;
  const avgResponseTime = "4.2m";
  const overallRiskLevel =
    activeIncidentCount > 5 ? "CRITICAL" : activeIncidentCount > 3 ? "HIGH" : activeIncidentCount > 1 ? "MODERATE" : "NORMAL";

  const riskColor =
    overallRiskLevel === "CRITICAL" ? "text-[#FF4D4F]" :
      overallRiskLevel === "HIGH" ? "text-[#FFB020]" :
        overallRiskLevel === "MODERATE" ? "text-amber-400" : "text-[#00FFA3]";

  const spikeAlerts = alerts.filter(a => a.status === 'Escalated' && a.escalationLevel === 3);
  const hasSpike = spikeAlerts.length > 0;
  const spikeSectors = [...new Set(spikeAlerts.map(a => a.sector))].join(', ');
  const spikeTypes = [...new Set(spikeAlerts.map(a => a.routeCategory || 'general_dispatch'))].map(t => t.toUpperCase()).join(', ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8 animate-fade-in text-slate-200 font-sans selection:bg-cyan-500/30">

      {/* ── Role HUD Selector Banner ── */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center bg-[#0B1220]/80 border border-slate-800 p-4 rounded-3xl backdrop-blur-md shadow-md gap-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
              Command Center Control Core
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Active Session ID: AHMEDABAD-COMMAND-POLICE</span>
          </div>
        </div>
        
        <div className="flex bg-[#050B14] p-1 rounded-xl border border-slate-800 text-[10px] font-bold tracking-widest font-mono shadow-inner">
          <button 
            onClick={() => setDashboardMode('dispatcher')}
            className={`px-4 py-2 rounded-lg transition-all ${dashboardMode === 'dispatcher' ? 'bg-[#00E5FF] text-[#050B14] font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            DISPATCHER HUD
          </button>
          <button 
            onClick={() => setDashboardMode('supervisor')}
            className={`px-4 py-2 rounded-lg transition-all ${dashboardMode === 'supervisor' ? 'bg-amber-400 text-[#050B14] font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            SUPERVISOR PANEL
          </button>
          <button 
            onClick={() => setDashboardMode('officer')}
            className={`px-4 py-2 rounded-lg transition-all ${dashboardMode === 'officer' ? 'bg-violet-500 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            OFFICER FIELD VIEW
          </button>
        </div>
      </div>

      {/* ── Repeated Spike Emergency Pulsing Banner ── */}
      {hasSpike && (
        <div className="lg:col-span-12 bg-red-950/85 border border-red-500/50 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse relative z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertOctagon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-100 uppercase tracking-widest font-mono block">
                [ALERT PROTOCOL LEVEL 3]: CRITICAL REPEATED SPIKE DETECTED
              </span>
              <span className="text-xs text-red-300 font-sans mt-1 block">
                Spike threshold exceeded in Sector(s) <b className="text-white font-bold">{spikeSectors}</b> for type(s) <b className="text-white font-bold">{spikeTypes}</b>. Direct QRT intervention deployed.
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-red-400 bg-red-950 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold">
            MANDATORY DISPATCH REQUIRED
          </div>
        </div>
      )}

      {/* ── DISPATCHER MODE ── */}
      {dashboardMode === 'dispatcher' && (
        <>
          {/* Map Click Mode Banner */}
          {mapClickMode && (
            <div className="lg:col-span-12 bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,229,255,0.1)] z-40">
              <div className="flex items-center gap-3 text-sm text-cyan-100 font-medium tracking-wide">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                </span>
                <span>Target Acquisition Mode Active: Click anywhere on the tactical map to log coordinates.</span>
              </div>
              <button
                onClick={() => setMapClickMode(false)}
                className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:bg-slate-800 px-5 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
              >
                Abort
              </button>
            </div>
          )}

          {/* Dynamic KPI Grid */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1 */}
            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#00E5FF]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,229,255,0.15)] flex flex-col justify-between shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00E5FF]/10 blur-[50px] rounded-full group-hover:bg-[#00E5FF]/20 transition-all duration-700" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 flex items-center justify-center border border-[#00E5FF]/20 text-[#00E5FF] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#FF4D4F] bg-[#FF4D4F]/10 border border-[#FF4D4F]/20 px-3 py-1.5 rounded-full shadow-sm">
                  ↑ 12% Spike
                </span>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">{filteredIncidents.filter((i) => i.status !== "Resolved").length}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Active Incidents</div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
                  <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> High probability near SG Highway
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* KPI 2 */}
            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#00FFA3]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,255,163,0.15)] flex flex-col justify-between shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00FFA3]/10 blur-[50px] rounded-full group-hover:bg-[#00FFA3]/20 transition-all duration-700" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#00FFA3]/10 flex items-center justify-center border border-[#00FFA3]/20 text-[#00FFA3] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Navigation className="w-6 h-6" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-3 py-1.5 rounded-full shadow-sm">
                  Optimal
                </span>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">{patrolCount}</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Patrol Units</div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
                  <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> All high-risk sectors covered
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00FFA3]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* KPI 3 */}
            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-[#FFB020]/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(255,176,32,0.15)] flex flex-col justify-between shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFB020]/10 blur-[50px] rounded-full group-hover:bg-[#FFB020]/20 transition-all duration-700" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[#FFB020]/10 flex items-center justify-center border border-[#FFB020]/20 text-[#FFB020] group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <div className="relative z-10 mt-auto">
                <div className={`text-4xl font-extrabold mb-1 tracking-tight ${
                  filteredIncidents.filter((i) => i.status !== "Resolved").length > 5 ? "text-[#FF4D4F]" : "text-[#00FFA3]"
                }`}>
                  {filteredIncidents.filter((i) => i.status !== "Resolved").length > 5 ? "CRITICAL" : "NORMAL"}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Risk Matrix</div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
                  <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> Escalation predicted in 2 hrs
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FFB020]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* KPI 4 */}
            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/80 hover:border-indigo-500/40 rounded-3xl p-6 relative overflow-hidden group transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] flex flex-col justify-between shadow-xl">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700 text-slate-300 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-3 py-1.5 rounded-full shadow-sm">
                  ↓ 0.5m Fast
                </span>
              </div>
              <div className="relative z-10 mt-auto">
                <div className="text-4xl font-extrabold text-white mb-1 tracking-tight">4.2m</div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Response Time</div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
                  <span className="text-[#00E5FF] font-semibold">AI DEPLOY:</span> Routing efficiency at peak
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>

          {/* Command Map Section (70/30) */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-10 gap-6 z-10">
            {/* Map Container (70%) */}
            <div className="lg:col-span-7 bg-[#0B1220] border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative shadow-xl">
              <div className="absolute top-4 left-4 z-[400] bg-[#0B1220]/80 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 flex items-center gap-4 shadow-lg">
                <div className="flex items-center gap-2 pl-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D4F] shadow-[0_0_8px_#FF4D4F] animate-pulse" />
                  <span className="text-[11px] font-bold text-white tracking-widest uppercase">Live Map</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-700" />
                <div className="flex gap-1 pr-1">
                  <button onClick={() => setShowHotspots(!showHotspots)} className={`text-[10px] px-2.5 py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors cursor-pointer ${showHotspots ? 'bg-[#FF4D4F]/20 text-[#FF4D4F]' : 'text-slate-400 hover:bg-slate-800'}`}>Hotspots</button>
                  <button onClick={() => setShowPatrolRoutes(!showPatrolRoutes)} className={`text-[10px] px-2.5 py-1.5 rounded-lg uppercase font-bold tracking-wider transition-colors cursor-pointer ${showPatrolRoutes ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'text-slate-400 hover:bg-slate-800'}`}>Routes</button>
                </div>
              </div>

              <div ref={mapContainerRef} className="h-[550px] w-full bg-[#050B14]" style={{ zIndex: 0 }} />

              {/* Map Controls Glass Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-[400] bg-[#0B1220]/85 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 flex justify-between items-center shadow-xl">
                <div className="text-[11px] text-slate-300 font-mono tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#00E5FF]" />
                  {selectedIncident ? `Selected case: ${selectedIncident.id} // ${selectedIncident.category}` : "Awaiting case selection..."}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddModal(true)} className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_15px_rgba(0,229,255,0.2)] font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all border border-cyan-400/50 cursor-pointer">
                    Log Incident
                  </button>
                  {selectedIncident && selectedIncident.status === "Assessing" && (
                    <button onClick={() => {
                      const firstUnit = units.find((u: any) => u.status === "Patrol") || units[0];
                      if (firstUnit) {
                        onDispatchUnit(firstUnit.id, selectedIncident.id);
                        setSelectedIncident(prev => prev ? { ...prev, status: "Dispatched" } : null);
                      }
                    }} className="px-5 py-2 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/40 text-[#00FFA3] font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(0,255,163,0.1)] cursor-pointer">
                      Dispatch Unit
                    </button>
                  )}
                  <button onClick={onSimulateAlarm} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                    Test Alert
                  </button>
                </div>
              </div>
            </div>

            {/* Intelligence Sidebar (30%) */}
            <div className="lg:col-span-3 bg-[#0B1220] border border-slate-800 rounded-2xl flex flex-col shadow-xl h-[550px] relative overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-[#0B1220]/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF4D4F] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF4D4F]"></span>
                  </span>
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Alerts & Escalations</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FFA3] animate-pulse" />
                  <span className="text-[9px] font-bold font-mono text-[#00FFA3]">112 ERSS</span>
                </div>
              </div>

              <div className="p-3 border-b border-slate-800/80 bg-white/[0.01] grid grid-cols-2 gap-2 text-center">
                <button
                  onClick={handleSimulate112Call}
                  disabled={simulating112}
                  className="py-1.5 px-2 bg-gradient-to-r from-red-600/20 to-orange-600/20 hover:from-red-600/30 hover:to-orange-600/30 border border-red-500/20 hover:border-red-500/40 text-[9px] font-bold uppercase tracking-wider text-red-200 rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {simulating112 ? <RefreshCw className="w-3 h-3 animate-spin text-red-400" /> : <Radio className="w-3 h-3 text-red-400" />}
                  Distress 112
                </button>
                <button
                  onClick={() => setShow112Logs(true)}
                  className="py-1.5 px-2 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-500/60 text-[9px] font-bold uppercase tracking-wider text-slate-300 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <History className="w-3 h-3 text-slate-400" />
                  112 Sync Log
                </button>
              </div>

              {sim112Success && <div className="bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-300 text-[10px] font-mono p-2 text-center animate-fade-in truncate">{sim112Success}</div>}
              {sim112Error && <div className="bg-red-950/60 border-b border-red-500/30 text-red-300 text-[10px] font-mono p-2 text-center animate-fade-in truncate">{sim112Error}</div>}

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="text-xs text-slate-500 font-mono text-center mt-12 flex flex-col items-center gap-2">
                    <Activity className="w-6 h-6 opacity-20 animate-pulse" />
                    Awaiting emergency feeds...
                  </div>
                ) : (
                  alerts.slice().reverse().map((alert) => {
                    const isCritical = alert.type === "Critical";
                    const isEscalated = alert.status === "Escalated";
                    const isAcked = alert.status === "Acknowledged";
                    
                    const routeLabels: Record<string, string> = {
                      cyber_cell: "CYBER",
                      traffic_control: "TRAFFIC",
                      quick_response: "QRT",
                      general_dispatch: "GENERAL"
                    };
                    const routeColors: Record<string, string> = {
                      cyber_cell: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                      traffic_control: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
                      quick_response: "bg-red-500/10 text-red-400 border-red-500/20",
                      general_dispatch: "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    };

                    const categoryLabel = routeLabels[alert.routeCategory || ''] || "GENERAL";
                    const categoryColor = routeColors[alert.routeCategory || ''] || "bg-blue-500/10 text-blue-400 border-blue-500/20";
                    
                    return (
                      <div
                        key={alert.id}
                        onClick={() => setSelectedAlert(alert)}
                        className={`relative p-3.5 bg-[#050B14]/40 hover:bg-[#0B1220]/80 border rounded-xl transition-all cursor-pointer group shadow-sm flex flex-col justify-between select-none ${
                          isEscalated ? 'border-red-500/30 hover:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.05)]' :
                          isAcked ? 'border-slate-800/80 hover:border-slate-700/80 opacity-75 hover:opacity-100' :
                          'border-slate-800/60 hover:border-[#00E5FF]/40'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                              isEscalated ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' :
                              isAcked ? 'bg-slate-800 text-slate-400 border-slate-700' :
                              isCritical ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            }`}>
                              {alert.status === "Escalated" ? `ESCALATED L${alert.escalationLevel || 2}` : alert.status}
                            </span>
                            
                            <span className={`text-[8px] font-bold border rounded px-1.5 py-0.5 tracking-wider ${categoryColor}`}>
                              {categoryLabel}
                            </span>
                          </div>
                          
                          <span className="text-[9px] font-mono text-slate-500">{alert.time || new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>

                        <p className="text-[12px] text-slate-300 leading-normal mb-3 font-sans line-clamp-2 group-hover:text-white transition-colors">{alert.message}</p>

                        <div className="flex items-center justify-between mt-1 text-[9px] font-mono">
                          <span className="text-slate-500">SECTOR: <b className="text-slate-300 font-semibold">{alert.sector}</b></span>
                          <span className="text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity font-bold tracking-wider uppercase flex items-center gap-0.5">
                            VIEW TIMELINE <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* AI Copilot & Hotspots Grid */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#0B1220]/60 backdrop-blur-xl border border-[#00E5FF]/20 shadow-[0_10px_30px_rgba(0,229,255,0.05)] rounded-3xl p-6 flex flex-col relative overflow-hidden group">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00E5FF]/10 blur-[70px] rounded-full pointer-events-none group-hover:bg-[#00E5FF]/20 transition-colors duration-700" />
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6 relative z-10">
                <Cpu className="w-5 h-5 text-[#00E5FF]" />
                Operations Briefing
              </h3>

              <div className="flex-1 bg-[#050B14]/50 border border-slate-800/80 rounded-2xl p-5 mb-5 min-h-[160px] max-h-[200px] overflow-y-auto text-[13px] leading-relaxed text-slate-300 custom-scrollbar relative shadow-inner">
                {isAiLoading && (
                  <div className="absolute inset-0 bg-[#050B14]/80 flex items-center justify-center gap-3 backdrop-blur-[2px] z-10 rounded-2xl">
                    <RefreshCw className="w-5 h-5 text-[#00E5FF] animate-spin" />
                    <span className="text-[11px] text-[#00E5FF] font-bold tracking-widest uppercase">Processing Request</span>
                  </div>
                )}
                <div className="whitespace-pre-line font-mono leading-relaxed">{aiResponse}</div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-5 relative z-10">
                {activePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    disabled={isAiLoading}
                    onClick={() => { setUserQuery(preset.query); handleQuerySubmit(preset.query); }}
                    className="w-full p-4 bg-slate-800/30 hover:bg-slate-800/80 border border-slate-800 hover:border-[#00E5FF]/30 text-[11px] text-slate-400 hover:text-cyan-300 uppercase font-bold tracking-wider rounded-xl transition-all flex items-center justify-between text-left group disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 shadow-sm cursor-pointer"
                  >
                    <span>{preset.label}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#00E5FF] transition-colors" />
                  </button>
                ))}
              </div>

              <div className="flex gap-3 relative z-10">
                <input
                  type="text"
                  placeholder="Query strategic databanks..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit(userQuery)}
                  className="flex-1 bg-[#050B14]/50 text-white placeholder-slate-500 border border-slate-800 focus:border-[#00E5FF]/50 focus:ring-1 focus:ring-[#00E5FF]/50 rounded-xl px-5 py-3 text-xs outline-none font-mono transition-all shadow-inner"
                />
                <button
                  onClick={() => handleQuerySubmit(userQuery)}
                  className="px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] rounded-xl flex items-center justify-center transition-all disabled:opacity-50 group hover:-translate-y-0.5 cursor-pointer"
                  disabled={isAiLoading || !userQuery.trim()}
                >
                  <Send className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                <Flame className="w-5 h-5 text-[#FFB020]" />
                Risk Hotspots
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {crimeHotspots.slice(0, 4).map((hs, idx) => (
                  <div key={idx} className="bg-[#050B14]/40 border border-slate-800/60 rounded-2xl p-5 flex flex-col justify-between group hover:border-[#FFB020]/30 hover:bg-slate-800/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-[13px] font-bold text-white mb-1.5 group-hover:text-amber-100 transition-colors">{hs.name}</h4>
                        <span className={`text-[10px] px-2.5 py-1 rounded border uppercase font-bold tracking-wider ${hs.severity === 'CRITICAL' ? 'bg-[#FF4D4F]/10 text-[#FF4D4F] border-[#FF4D4F]/20' : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20'}`}>{hs.severity}</span>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#050B14] border border-slate-800 flex items-center justify-center text-sm font-bold text-white group-hover:border-[#FFB020]/40 group-hover:text-[#FFB020] transition-colors shadow-inner">
                        {hs.crimeCount}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono bg-[#0B1220]/80 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[#00E5FF] font-semibold mr-1">AI DEPLOY:</span> Recommended +2 units at 20:00.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enterprise Modules */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-colors duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:-translate-y-1">
              <h3 className="font-bold mb-4 text-[11px] uppercase tracking-widest text-[#00E5FF] flex items-center gap-2">
                Incident Trend Analytics
              </h3>
              <div className="flex items-end gap-3 h-32 mb-6 mt-2">
                {[40, 70, 45, 90, 65, 85, 60].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-[#00E5FF]/10 to-[#00E5FF]/50 rounded-t-lg hover:from-[#00E5FF]/30 hover:to-[#00E5FF] transition-all cursor-pointer relative group/bar" style={{ height: `${h}%` }}>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] font-mono px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      {h}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono flex justify-between border-t border-slate-800/80 pt-4">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>

            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:-translate-y-1">
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                <Cpu className="w-48 h-48 text-[#00FFA3]" />
              </div>
              <div className="relative z-10">
                <h3 className="font-bold mb-5 text-[11px] uppercase tracking-widest text-[#00FFA3]">Risk Forecast</h3>
                <div className="text-5xl font-extrabold text-white mb-4 tracking-tighter">84% <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase ml-1 block mt-1">Confidence Score</span></div>
                <p className="text-[11px] leading-relaxed text-slate-400 font-mono bg-[#050B14]/50 p-4 rounded-xl border border-slate-800/80">High probability of traffic anomalies in SG Highway sector between 18:00 - 20:00.</p>
              </div>
              <button className="w-full mt-6 py-3 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/30 text-[#00FFA3] text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm relative z-10 group-hover:shadow-[0_0_20px_rgba(0,255,163,0.1)] cursor-pointer">Execute Pre-Deployment</button>
            </div>

            <div className="bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800/60 hover:border-slate-700 transition-colors duration-300 rounded-3xl p-6 flex flex-col justify-between shadow-xl group hover:-translate-y-1">
              <h3 className="font-bold mb-6 text-[11px] uppercase tracking-widest text-[#FFB020]">Resource Planning</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Route Optimization</span><span className="text-[#FFB020]">92%</span></div>
                  <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-orange-500 to-[#FFB020] w-[92%]" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Resource Allocation</span><span className="text-[#00FFA3]">Optimal</span></div>
                  <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-emerald-500 to-[#00FFA3] w-full" /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3"><span className="text-slate-400">Response ETA</span><span className="text-[#00E5FF]">Fast</span></div>
                  <div className="h-2 w-full bg-[#050B14] rounded-full overflow-hidden border border-slate-800"><div className="h-full bg-gradient-to-r from-blue-500 to-[#00E5FF] w-[85%]" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── NEW: Tactical Incident Registry & Advanced Filters Section ── */}
          <div className="lg:col-span-12 bg-[#0B1220]/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  Tactical Incident Registry
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Real-time filtered case tracking desk</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="px-3.5 py-2 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.05)]"
                >
                  <FileText className="w-3.5 h-3.5" /> Export PDF Report
                </button>
              </div>
            </div>

            {/* Filter controls panel */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-[#050B14]/40 p-4 rounded-2xl border border-slate-800/80 text-xs">
              {/* Search */}
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Free Text Search</label>
                <input 
                  type="text" 
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search case ID, description, category..."
                  className="bg-[#0B1220] border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-600 outline-none focus:border-cyan-500/50"
                />
              </div>

              {/* Date Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Time Period</label>
                <select 
                  value={filterDateRange}
                  onChange={e => setFilterDateRange(e.target.value)}
                  className="bg-[#0B1220] border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Logs</option>
                  <option value="last24h">Last 24 Hours</option>
                </select>
              </div>

              {/* Source */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Provenant Source</label>
                <select 
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  className="bg-[#0B1220] border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Sources</option>
                  <option value="fir">FIR Databases</option>
                  <option value="complaint">Complaint Systems</option>
                  <option value="patrol">Patrol Logs</option>
                  <option value="cyber">Cyber Branch</option>
                  <option value="mobile">Field Officer App</option>
                </select>
              </div>

              {/* Zone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Municipal Zone</label>
                <select 
                  value={filterZone}
                  onChange={e => setFilterZone(e.target.value)}
                  className="bg-[#0B1220] border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Zones</option>
                  <option value="west">West Zone (Vastrapur/Thaltej/Bopal)</option>
                  <option value="north">North Zone (Naranpura/Chandkheda)</option>
                  <option value="east">East Zone (Bapunagar/Odhav)</option>
                  <option value="south">South Zone (Maninagar)</option>
                </select>
              </div>

              {/* Severity */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 font-bold uppercase tracking-widest text-[9px] font-mono">Severity Band</label>
                <select 
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  className="bg-[#0B1220] border border-slate-800 rounded-xl px-3.5 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="all">All Threat Scales</option>
                  <option value="critical">Critical (Index &ge; 85)</option>
                  <option value="high">High (Index 60-84)</option>
                  <option value="moderate">Moderate (Index 40-59)</option>
                  <option value="routine">Routine (Index &lt; 40)</option>
                </select>
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="w-full text-left font-mono text-xs text-slate-300">
                <thead>
                  <tr className="bg-[#050B14]/80 text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-800">
                    <th className="py-3 px-4">Case ID</th>
                    <th className="py-3 px-3">Time</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Location Address</th>
                    <th className="py-3 px-3 text-center">Threat Index</th>
                    <th className="py-3 px-3 text-center">Case Status</th>
                    <th className="py-3 px-4 text-right">Drill Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredIncidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic">No incidents match the active filter criteria.</td>
                    </tr>
                  ) : (
                    filteredIncidents.map(inc => {
                      const isHigh = inc.threatIndex >= 85;
                      const hasAttachments = inc.attachmentsCount > 0 || (customIncFiles[inc.id] || []).length > 0;
                      return (
                        <tr key={inc.id} className="hover:bg-slate-850/40 transition-colors group">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-red-500 animate-pulse' : 'bg-cyan-400'}`} />
                            {inc.id}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 text-[11px]">{inc.timestamp}</td>
                          <td className="py-3.5 px-3 text-slate-200 font-sans font-semibold">{inc.category}</td>
                          <td className="py-3.5 px-3 text-slate-400 font-sans truncate max-w-[220px]" title={inc.location}>{inc.location.split('(')[0]}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-slate-100">{inc.threatIndex}%</td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inc.status === 'Resolved' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' :
                              inc.status === 'Dispatched' ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20' :
                              inc.status === 'Intervening' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' :
                              'bg-red-950/40 text-red-400 border border-red-500/20'
                            }`}>
                              {inc.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button 
                              onClick={() => setDrillDownIncident(inc)}
                              className="px-3 py-1 bg-slate-800 hover:bg-violet-900/40 hover:text-violet-300 hover:border-violet-500/30 text-[10px] border border-slate-700 text-slate-300 font-bold uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              Details {hasAttachments && <Paperclip className="w-3 h-3 text-slate-400 group-hover:text-violet-400" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-slate-500 font-mono text-center">
               Ahmedabad Command and Control Incident Registry logs are synced dynamically every 8 seconds.
            </div>
          </div>
        </>
      )}

      {/* ── SUPERVISOR PANEL ── */}
      {dashboardMode === 'supervisor' && (
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* KPI summaries */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-2xl shadow-md">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Dispatch Speed</span>
              <span className="text-3xl font-extrabold text-white block">4.2m</span>
              <span className="text-[9px] font-mono text-emerald-400 block mt-1">Within optimal parameter range</span>
            </div>
            <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-2xl shadow-md">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Coverage Index</span>
              <span className="text-3xl font-extrabold text-white block">96.4%</span>
              <span className="text-[9px] font-mono text-emerald-400 block mt-1">+1.2% this shift rotation</span>
            </div>
            <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-2xl shadow-md">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Spike Alarm Warnings</span>
              <span className="text-3xl font-extrabold text-amber-400 block">{hasSpike ? "1 ACTIVE" : "0 ACTIVE"}</span>
              <span className="text-[9px] font-mono text-slate-400 block mt-1">Automatic auto-escalation active</span>
            </div>
            <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-2xl shadow-md">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-1">Resolution Rate</span>
              <span className="text-3xl font-extrabold text-white block">94.2%</span>
              <span className="text-[9px] font-mono text-cyan-400 block mt-1">Target benchmark exceeded</span>
            </div>
          </div>

          {/* Audit trail summary */}
          <div className="lg:col-span-7 bg-[#0B1220]/60 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Supervisor System Audits</h3>
                  <span className="text-[10px] font-mono text-slate-400">Security and dispatcher lifecycle logs</span>
                </div>
                <button 
                  onClick={() => setShow112Logs(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  View 112 Sync Log
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {alerts.filter(a => a.status === 'Acknowledged').slice(-4).map((alert, idx) => (
                  <div key={idx} className="bg-[#050B14] border border-slate-850 rounded-xl p-3.5 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-1.5 font-mono text-slate-500">
                      <span>AUDIT_ID: ALT-DISP-{alert.id}</span>
                      <span className="text-emerald-400 font-bold">SUCCESS</span>
                    </div>
                    <p className="text-slate-300 font-sans leading-relaxed"><b>Operator {alert.operatorName || 'Duty Dispatcher'} ({alert.operatorId || 'OP-77'})</b> acknowledged critical distress alert in Sector <b>{alert.sector}</b>.</p>
                    {alert.operatorNotes && <div className="bg-[#0B1220] p-2 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono">Notes: {alert.operatorNotes}</div>}
                  </div>
                ))}
                {alerts.filter(a => a.status === 'Acknowledged').length === 0 && (
                  <div className="text-xs text-slate-500 font-mono text-center py-12">No dispatch acknowledgements recorded in this session. Acknowledge alerts to log operator events.</div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono pt-4 border-t border-slate-850 mt-4">
              All modifications are cryptographically signed and stored on system databanks.
            </div>
          </div>

          {/* Model monitoring triggers */}
          <div className="lg:col-span-5 bg-[#0B1220]/60 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#00FFA3] uppercase tracking-widest mb-4">ML Intelligence Tuning Desk</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed mb-5">Predictive hotspot ML models run versioned retraining loops. If predictions drift from actual outcomes, manually execute sync or model retraining below.</p>
              
              <div className="space-y-4">
                <div className="bg-[#050B14]/40 p-4 border border-slate-800 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-extrabold text-white block">Hotspot ML v2.4.1</span>
                    <span className="text-[9px] font-mono text-slate-500">Accuracy: 88.4% | Drift: 0.02</span>
                  </div>
                  <span className="text-[9px] text-[#00FFA3] bg-[#00FFA3]/10 border border-[#00FFA3]/20 px-2 py-0.5 rounded-full font-bold font-mono">NOMINAL</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => alert("Simulated ML retraining triggered. v2.4.2 compiles in background.")}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Retrain Model
                  </button>
                  <button 
                    onClick={() => alert("Simulated outcomes synced. Forecast metrics reconciled.")}
                    className="py-3 bg-[#00FFA3]/10 hover:bg-[#00FFA3]/20 border border-[#00FFA3]/30 text-[#00FFA3] text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Sync Outcomes
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl mt-4">
              <span className="text-[9px] text-[#00E5FF] font-bold font-mono block">AI ENGINE STATUS:</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Recalibrating spatial grid mapping. Next cron target at 12:00 UTC.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── OFFICER FIELD VIEW ── */}
      {dashboardMode === 'officer' && (
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Dispatch Assignment details card */}
          <div className="lg:col-span-4 bg-[#0B1220]/60 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Active Dispatch Target</h3>
                  <span className="text-[10px] font-mono text-violet-400">Lieutenant Badge #9428</span>
                </div>
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              </div>

              <div className="bg-[#050B14] p-4 rounded-xl border border-slate-850 space-y-2">
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block">ASSIGNED VEHICLE:</span>
                <span className="text-xs font-bold text-white block">🚨 PCR Van 3 (Officer J. Vance)</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mt-3">TARGET DESTINATION:</span>
                <span className="text-xs font-bold text-white block">📍 Vastrapur Sector (Vastrapur Lake Road)</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase block mt-3">THREAT PRIORITY SCALE:</span>
                <span className="text-xs font-extrabold text-red-400 block font-mono">LEVEL 3: URGENT ACTION MANDATED</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-4">
              <button 
                onClick={() => alert("GPS coordinate handshake resolved. Dispatch accepted.")}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              >
                Acknowledge & Accept Route
              </button>
              <button 
                onClick={() => alert("Rejection protocol reported. Backup reassigned.")}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                Reject / Report Obstruction
              </button>
            </div>
          </div>

          {/* Turn-by-turn Navigation Instruction lists */}
          <div className="lg:col-span-5 bg-[#0B1220]/60 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3 mb-4">Tactical Turn-by-Turn Navigation</h3>
              
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar font-mono text-xs">
                <div className="p-3 bg-violet-900/10 border border-violet-500/20 rounded-xl flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <span className="font-bold text-white block">Next stop: Vastrapur Lake Junction</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Distance: 450 meters | Speed: 40 km/h</span>
                  </div>
                </div>

                <div className="p-3 bg-[#050B14] border border-slate-850 rounded-xl flex items-center gap-3 text-slate-400">
                  <span className="text-sm">⬆</span>
                  <div>
                    <span className="block">Proceed straight past SG Highway service road</span>
                    <span className="text-[10px] text-slate-600 block mt-0.5">Distance: 1.2 km</span>
                  </div>
                </div>

                <div className="p-3 bg-[#050B14] border border-slate-850 rounded-xl flex items-center gap-3 text-slate-400">
                  <span className="text-sm">↱</span>
                  <div>
                    <span className="block">Turn right at Bopal Crossing Circle</span>
                    <span className="text-[10px] text-slate-600 block mt-0.5">Distance: 800 meters</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono pt-4 border-t border-slate-850 mt-4">
               GPS accuracy verified &plusmn;4m. Connected via secure operational satellite link.
            </div>
          </div>

          {/* Officer device upload evidence panel */}
          <div className="lg:col-span-3 bg-[#0B1220]/60 border border-slate-800 rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800 pb-3">Evidence Attachments Log</h3>
              
              <div className="bg-[#050B14] p-4 border border-slate-850 rounded-2xl">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-slate-400 font-mono">Attachment Logs:</span>
                  <span className="text-white font-bold">2 files ready</span>
                </div>

                <div className="space-y-2">
                  <div className="bg-[#0B1220] p-2.5 border border-slate-800 rounded-xl flex items-center gap-2 text-[10px]">
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 truncate">pcr_cam_capture_12.jpg</span>
                  </div>
                  <div className="bg-[#0B1220] p-2.5 border border-slate-800 rounded-xl flex items-center gap-2 text-[10px]">
                    <Paperclip className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300 truncate">suspect_statement_log.txt</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono font-bold text-slate-500 uppercase block">Log New Scene File</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="File name (e.g. dashcam_record.mp4)..." 
                    className="flex-1 bg-[#050B14] border border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-violet-400 text-white font-mono"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        alert("File upload simulated. Syncing with command center registry.");
                        (e.target as any).value = "";
                      }
                    }}
                  />
                  <button 
                    onClick={() => alert("File upload simulated. Syncing with command center registry.")}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  >
                    ADD
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-xl mt-4">
              <span className="text-[9px] text-violet-400 font-bold font-mono block">GPS BOUNDARY ALARMS:</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">VIP Sector curfew is ACTIVE in Thaltej region. Avoid Route Bopal.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Case Intelligence File Modal ── */}
      {drillDownIncident && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050B14]/70 backdrop-blur-md animate-fade-in" onClick={() => setDrillDownIncident(null)}>
          <div 
            className="bg-[#0B1220] border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] w-full max-w-2xl mx-4 overflow-hidden transform transition-all text-slate-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Case Intelligence File: {drillDownIncident.id}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{drillDownIncident.category} · Reported by {drillDownIncident.reportedBy}</p>
                </div>
              </div>
              <button onClick={() => setDrillDownIncident(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Detailed Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#050B14]/60 p-4 rounded-xl border border-slate-800/80 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block mb-1">LOCATION:</span>
                  <span className="text-white font-bold">{drillDownIncident.location.split('(')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">COORDINATES:</span>
                  <span className="text-white font-bold">{drillDownIncident.coordinates.join(', ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">THREAT LEVEL:</span>
                  <span className={`font-bold ${drillDownIncident.threatIndex >= 85 ? 'text-red-400' : drillDownIncident.threatIndex >= 60 ? 'text-orange-400' : 'text-cyan-400'}`}>
                    {drillDownIncident.threatIndex}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">CASE STATUS:</span>
                  <span className="text-[#00E5FF] font-bold">{drillDownIncident.status.toUpperCase()}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 font-mono">Incident Intelligence Brief</span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed bg-[#050B14]/40 p-3.5 rounded-xl border border-slate-800">{drillDownIncident.description}</p>
              </div>

              {/* Chronological Case History / Audit Trail */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3 font-mono">Incident Dispatch History</span>
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="relative pl-5 border-l border-slate-850 pb-3 font-sans">
                    <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                    <div className="flex justify-between items-start text-[10px] mb-1">
                      <span className="font-bold text-white uppercase tracking-wide">CASE INGESTED ({drillDownIncident.id})</span>
                      <span className="text-slate-500 font-mono">{drillDownIncident.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400">Incident successfully ingested via source connector. Dispatch queue assessing priority.</p>
                  </div>

                  {/* Step 2 */}
                  {drillDownIncident.status !== "Assessing" && (
                    <div className="relative pl-5 border-l border-slate-850 pb-3 font-sans">
                      <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                      <div className="flex justify-between items-start text-[10px] mb-1">
                        <span className="font-bold text-white uppercase tracking-wide">UNIT DISPATCHED</span>
                        <span className="text-slate-500 font-mono">+1.5m Latency</span>
                      </div>
                      <p className="text-xs text-slate-400">Patrol unit PCR-03 assigned to hot zone sector route. ETA 4.2 minutes.</p>
                    </div>
                  )}

                  {/* Step 3 */}
                  {(drillDownIncident.status === "Intervening" || drillDownIncident.status === "Resolved") && (
                    <div className="relative pl-5 border-l border-slate-850 pb-3 font-sans">
                      <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                      <div className="flex justify-between items-start text-[10px] mb-1">
                        <span className="font-bold text-white uppercase tracking-wide">OFFICER ON SCENE (INTERVENING)</span>
                        <span className="text-slate-500 font-mono">+3.8m Latency</span>
                      </div>
                      <p className="text-xs text-slate-400">Patrol unit J. Vance arrived at mapped coordinates. Activating bodycam surveillance.</p>
                    </div>
                  )}

                  {/* Step 4 */}
                  {drillDownIncident.status === "Resolved" && (
                    <div className="relative pl-5 border-l border-slate-850 pb-3 font-sans">
                      <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                      <div className="flex justify-between items-start text-[10px] mb-1">
                        <span className="font-bold text-white uppercase tracking-wide">CASE RESOLVED</span>
                        <span className="text-slate-500 font-mono">+8.4m Total</span>
                      </div>
                      <p className="text-xs text-slate-400">Scene cleared. Threat index neutralized. Roster log filed by lead inspector.</p>
                    </div>
                  )}

                  {/* Custom supervisor notes timeline */}
                  {(customIncNotes[drillDownIncident.id] || []).map((noteItem, idx) => (
                    <div key={idx} className="relative pl-5 border-l border-slate-850 pb-3 font-sans">
                      <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-violet-400" />
                      <div className="flex justify-between items-start text-[10px] mb-1">
                        <span className="font-bold text-white uppercase tracking-wide">SUPERVISOR AUDIT NOTE</span>
                        <span className="text-slate-500 font-mono">{noteItem.time}</span>
                      </div>
                      <p className="text-xs text-violet-200"><b>{noteItem.officer}:</b> {noteItem.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3 font-mono">Evidence Attachments ({(drillDownIncident.attachmentsCount || 0) + (customIncFiles[drillDownIncident.id] || []).length})</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Mock static attachments */}
                  {Array.from({ length: drillDownIncident.attachmentsCount || 0 }).map((_, idx) => (
                    <div key={idx} className="bg-[#050B14]/70 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2 text-[10px] hover:border-slate-700 transition-colors">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <div className="truncate">
                        <span className="block text-slate-200 font-mono truncate">attachment_{idx + 1}.png</span>
                        <span className="block text-[8px] text-slate-500">IMAGE · 480 KB</span>
                      </div>
                    </div>
                  ))}

                  {/* Mock uploaded attachments */}
                  {(customIncFiles[drillDownIncident.id] || []).map((file, idx) => (
                    <div key={idx} className="bg-[#050B14]/70 border border-violet-500/20 p-2.5 rounded-xl flex items-center gap-2 text-[10px] hover:border-violet-500/30 transition-colors">
                      <FileText className="w-4 h-4 text-violet-400" />
                      <div className="truncate">
                        <span className="block text-violet-200 font-mono truncate">{file.name}</span>
                        <span className="block text-[8px] text-slate-500">{file.type} · {file.size}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Simulated Attachment form */}
                <div className="mt-4 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter file name (e.g. CCTV_Footage.mp4)..." 
                    value={newAttachmentName}
                    onChange={e => setNewAttachmentName(e.target.value)}
                    className="flex-1 bg-[#050B14] border border-slate-700 text-xs rounded-lg px-3 py-2 text-white outline-none focus:border-violet-500 font-mono"
                  />
                  <button 
                    onClick={() => {
                      if (!newAttachmentName.trim()) return;
                      const fileObj = {
                        name: newAttachmentName.trim(),
                        size: "2.4 MB",
                        date: new Date().toLocaleTimeString(),
                        type: newAttachmentName.includes('.') ? newAttachmentName.split('.').pop()?.toUpperCase() || "BIN" : "LOG"
                      };
                      setCustomIncFiles(prev => ({
                        ...prev,
                        [drillDownIncident.id]: [...(prev[drillDownIncident.id] || []), fileObj]
                      }));
                      setNewAttachmentName("");
                    }}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors font-mono cursor-pointer"
                  >
                    Attach File
                  </button>
                </div>
              </div>

              {/* Add Note Form */}
              <div className="border-t border-slate-800/80 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 font-mono">Append Dispatch Note</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Add operational notes or dispatch remarks..." 
                    value={newTimelineNote} 
                    onChange={e => setNewTimelineNote(e.target.value)}
                    className="flex-1 bg-[#050B14] border border-slate-700 text-xs rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                  <button 
                    onClick={() => {
                      if (!newTimelineNote.trim()) return;
                      const noteObj = {
                        time: new Date().toLocaleTimeString() + " IST",
                        note: newTimelineNote.trim(),
                        officer: "Supervisor (OP-HUD)"
                      };
                      setCustomIncNotes(prev => ({
                        ...prev,
                        [drillDownIncident.id]: [...(prev[drillDownIncident.id] || []), noteObj]
                      }));
                      setNewTimelineNote("");
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Save Remarks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Incident Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050B14]/60 backdrop-blur-md animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div
            className="bg-[#0B1220] border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-lg mx-4 overflow-hidden transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-inner">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Register Incident</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">INCIDENT_ENTRY</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Category *</label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner cursor-pointer"
                  >
                    {CRIME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Priority *</label>
                  <select
                    value={addForm.priority}
                    onChange={e => setAddForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner cursor-pointer"
                  >
                    <option value="false">Routine Response</option>
                    <option value="true">High Priority / Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Location Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vastrapur Lake Road"
                  value={addForm.location}
                  onChange={e => setAddForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Coordinates (Lat, Lng) *</label>
                  <button
                    onClick={() => { setShowAddModal(false); setMapClickMode(true); }}
                    className="text-xs text-[#00E5FF] hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium bg-[#00E5FF]/10 px-2.5 py-1 rounded-md border border-[#00E5FF]/20 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Pick on Map
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Lat (23.xxxx)"
                    value={addForm.lat}
                    onChange={e => setAddForm(p => ({ ...p, lat: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Lng (72.xxxx)"
                    value={addForm.lng}
                    onChange={e => setAddForm(p => ({ ...p, lng: e.target.value }))}
                    className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#050B14] p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Threat Index</label>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${parseInt(addForm.threatIndex) >= 80 ? 'bg-red-500/20 text-red-400' : parseInt(addForm.threatIndex) >= 50 ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {addForm.threatIndex} / 100
                  </span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  value={addForm.threatIndex}
                  onChange={e => setAddForm(p => ({ ...p, threatIndex: e.target.value }))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed intelligence here..."
                  value={addForm.description}
                  onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none resize-none transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Reported By *</label>
                <input
                  type="text"
                  placeholder="e.g. Officer Badge # / Name"
                  value={addForm.reportedBy}
                  onChange={e => setAddForm(p => ({ ...p, reportedBy: e.target.value }))}
                  className="w-full bg-[#050B14] border border-slate-700 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-200 placeholder-slate-600 text-sm rounded-lg px-4 py-2.5 outline-none transition-all shadow-inner"
                />
              </div>

              {addFormError && (
                <div className="text-xs text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" /> {addFormError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-800 bg-white/[0.02]">
              <button
                onClick={() => { setShowAddModal(false); setAddFormError(""); }}
                className="flex-1 py-2.5 bg-transparent hover:bg-slate-800 text-sm text-slate-300 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIncidentSubmit}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] border border-cyan-400/30 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Submit Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert Details & Lifecycle Audit Timeline Modal ── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050B14]/70 backdrop-blur-md animate-fade-in" onClick={() => setSelectedAlert(null)}>
          <div 
            className="bg-[#0B1220] border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] w-full max-w-xl mx-4 overflow-hidden transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">Alert Lifecycle Timeline</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedAlert.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Alert Info Summary Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#050B14]/60 p-4 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">SECTOR:</span>
                  <span className="text-white font-bold font-sans">{selectedAlert.sector}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">STATUS:</span>
                  <span className={`font-bold ${
                    selectedAlert.status === 'Escalated' ? 'text-red-400' :
                    selectedAlert.status === 'Acknowledged' ? 'text-emerald-400' :
                    'text-yellow-400'
                  }`}>
                    {selectedAlert.status} (L{selectedAlert.escalationLevel || 1})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">OPERATIONAL ROUTING:</span>
                  <span className="text-cyan-400 font-bold font-mono">
                    {String(selectedAlert.routeCategory || 'general').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">SOURCE:</span>
                  <span className="text-slate-300 font-bold font-sans">
                    {selectedAlert.source === 'erss_112' ? 'Emergency 112 ERSS' : 'Local Control Feed'}
                  </span>
                </div>
              </div>

              {/* Alert Message */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Message Detail</span>
                <p className="text-sm text-slate-300 font-sans leading-relaxed bg-[#050B14]/40 p-3.5 rounded-xl border border-slate-800">{selectedAlert.message}</p>
              </div>

              {/* Acknowledgment Operator Info */}
              {selectedAlert.status === 'Acknowledged' && (
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl space-y-2 text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Acknowledged Details</span>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-sans text-slate-300">
                    <div><b>Operator Name:</b> {selectedAlert.operatorName}</div>
                    <div><b>Badge ID:</b> {selectedAlert.operatorId}</div>
                    <div className="col-span-2 border-t border-slate-800/80 pt-2 mt-1"><b>Notes:</b> {selectedAlert.operatorNotes}</div>
                  </div>
                </div>
              )}

              {/* Escalation History Timeline */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">Audit Log & Escalation History</span>
                <div className="space-y-4">
                  {alertHistory.length === 0 ? (
                    <div className="text-xs text-slate-600 font-mono pl-2">No history logs fetched.</div>
                  ) : (
                    alertHistory.map((evt, idx) => (
                      <div key={idx} className="relative pl-5 border-l border-slate-800 pb-3 last:pb-0 font-sans">
                        <div className="absolute -left-[4.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-900" />
                        <div className="flex justify-between items-start text-[11px] mb-1">
                          <span className="font-bold text-white uppercase tracking-wide">{evt.event}</span>
                          <span className="text-slate-500 font-mono">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal font-sans">{evt.details}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Acknowledge Form (if pending/escalated) */}
              {selectedAlert.status !== 'Acknowledged' && (
                <div className="border-t border-slate-800 pt-5 space-y-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setShowAckForm(!showAckForm); setShowEscForm(false); }}
                      className={`flex-1 py-2 text-xs uppercase font-bold tracking-wider rounded-lg transition-colors border ${
                        showAckForm ? 'bg-[#00FFA3]/20 text-[#00FFA3] border-[#00FFA3]/30' : 'bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      Acknowledge Workflow
                    </button>
                    <button 
                      onClick={() => { setShowEscForm(!showEscForm); setShowAckForm(false); }}
                      className={`flex-1 py-2 text-xs uppercase font-bold tracking-wider rounded-lg transition-colors border ${
                        showEscForm ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-transparent text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      Escalate Level
                    </button>
                  </div>

                  {showAckForm && (
                    <div className="bg-[#050B14] p-4 rounded-xl border border-slate-800 space-y-3 animate-fade-in text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 block mb-1">Operator ID</label>
                          <input 
                            value={ackOperatorId} 
                            onChange={e => setAckOperatorId(e.target.value)}
                            className="w-full bg-[#0B1220] border border-slate-700 rounded p-2 text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Operator Name</label>
                          <input 
                            value={ackOperatorName} 
                            onChange={e => setAckOperatorName(e.target.value)}
                            className="w-full bg-[#0B1220] border border-slate-700 rounded p-2 text-white outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Resolution / Acknowledgment Notes</label>
                        <textarea 
                          rows={2}
                          value={ackNotes} 
                          onChange={e => setAckNotes(e.target.value)}
                          placeholder="Verify unit status or dispatch update..."
                          className="w-full bg-[#0B1220] border border-slate-700 rounded p-2 text-white resize-none outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleAcknowledgeDetailed}
                        className="w-full py-2 bg-[#00FFA3] hover:bg-[#00FFA3]/80 text-[#050B14] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                      >
                        Submit Acknowledgment
                      </button>
                    </div>
                  )}

                  {showEscForm && (
                    <div className="bg-[#050B14] p-4 rounded-xl border border-slate-800 space-y-3 animate-fade-in text-xs">
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-slate-400 block mb-1">Target Escalation Level</label>
                          <select 
                            value={escLevel} 
                            onChange={e => setEscLevel(parseInt(e.target.value, 10))}
                            className="w-full bg-[#0B1220] border border-slate-700 rounded p-2 text-white outline-none"
                          >
                            <option value={2}>Level 2: Duty Inspector</option>
                            <option value={3}>Level 3: Superintendent / QRT</option>
                          </select>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-normal">
                          Level 3 deployment mandates direct tactical dispatch and spikes operational alert routing.
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Reason for Escalation</label>
                        <textarea 
                          rows={2}
                          value={escReason} 
                          onChange={e => setEscReason(e.target.value)}
                          placeholder="e.g., Target responder unavailable, incident severity threshold spike..."
                          className="w-full bg-[#0B1220] border border-slate-700 rounded p-2 text-white resize-none outline-none"
                        />
                      </div>
                      <button 
                        onClick={handleEscalateDetailed}
                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
                      >
                        Submit Escalation Route
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 112 ERSS Log Synced Drawer Modal ── */}
      {show112Logs && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050B14]/70 backdrop-blur-md animate-fade-in" onClick={() => setShow112Logs(false)}>
          <div 
            className="bg-[#0B1220] border border-slate-700/60 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] w-full max-w-2xl mx-4 overflow-hidden transform transition-all"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">112 ERSS Sync Log Dashboard</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Gujarat Emergency Response Support System Feed</p>
                </div>
              </div>
              <button onClick={() => setShow112Logs(false)} className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logs List */}
            <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar space-y-4">
              {logs112.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono text-center py-12">
                  No synced ERSS logs available. Use "Distress 112" to simulate emergency alerts.
                </div>
              ) : (
                logs112.map((log, index) => (
                  <div key={index} className="bg-[#050B14]/60 border border-slate-800 p-4 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-500 border-b border-slate-800/80 pb-2 mb-2">
                      <span>SYNC_TIMESTAMP: {new Date(log.timestamp).toLocaleString()}</span>
                      <span className="text-[#00E5FF]">CALL_ID: {log.payload?.call_id}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div><b>Caller Phone:</b> {log.payload?.caller_phone}</div>
                      <div><b>Emergency Category:</b> {log.payload?.emergency_type}</div>
                      <div><b>District:</b> {log.payload?.district}</div>
                      <div><b>Coordinates:</b> {log.payload?.latitude?.toFixed(4)}, {log.payload?.longitude?.toFixed(4)}</div>
                      <div className="col-span-2 mt-1.5 pt-1.5 border-t border-slate-800/80">
                        <b>Raw Decoded details:</b> {log.payload?.incident_details}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
