/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  MapPin,
  Radio,
  Clock,
  FileText,
  User,
  Send,
  Battery,
  Signal,
  Wifi,
  AlertOctagon,
  Camera,
  Navigation2,
  CheckCircle2,
} from "lucide-react";
import { Incident, Alert, MobileTab } from "../types";

interface MobileOfficerSimulatorProps {
  onAddIncident: (incident: Incident) => void;
  onAddAlert: (alert: Alert) => void;
  alerts: Alert[];
}

type IncomingIncidentCategory =
  | "Theft"
  | "Assault"
  | "Cybercrime"
  | "Fraud"
  | "Robbery"
  | "Snatching";

export default function MobileOfficerSimulator({
  onAddIncident,
  onAddAlert,
  alerts,
}: MobileOfficerSimulatorProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("MAP");
  const [dutyState, setDutyState] = useState<"ON_DUTY" | "BREAK" | "END_SHIFT">("ON_DUTY");
  const [timeActive, setTimeActive] = useState(15735);
  const [distancePatrolled, setDistancePatrolled] = useState(8.4);
  const [incidentsLoggedCount, setIncidentsLoggedCount] = useState(3);
  const [lastSync, setLastSync] = useState("Just now");

  const [reportCategory, setReportCategory] = useState<IncomingIncidentCategory>("Theft");
  const [reportLocation, setReportLocation] = useState("Vastrapur Lake");
  const [reportDetails, setReportDetails] = useState("");
  const [reportHighPriority, setReportHighPriority] = useState(true);
  const [reportFiles, setReportFiles] = useState<string[]>([
    "incident_scene_image.png",
    "pcr_dispatch_log.txt",
  ]);
  const [newFileName, setNewFileName] = useState("");
  const [recentSubmitMessage, setRecentSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dutyState !== "ON_DUTY") return;
    const interval = setInterval(() => {
      setTimeActive((prev) => prev + 1);
      if (Math.random() > 0.8) {
        setDistancePatrolled((prev) => parseFloat((prev + 0.05).toFixed(2)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [dutyState]);

  const formatSeconds = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":");
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    setReportFiles((prev) => [...prev, newFileName.trim()]);
    setNewFileName("");
  };

  const handleRemoveFile = (idx: number) => {
    setReportFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCapturePhoto = () => {
    const snapshotName = `camera_${Date.now()}.jpg`;
    setReportFiles((prev) => [snapshotName, ...prev]);
    setLastSync("GPS synced just now");
  };

  const handleRequestBackup = () => {
    const freshAlert: Alert = {
      id: `ALT-MOB-${Date.now()}`,
      type: "Critical",
      message: "[OFFICER REPORT] Immediate backup requested at Vastrapur.",
      time: "Immediate UTC",
      sector: "Vastrapur",
      status: "Pending",
    };
    onAddAlert(freshAlert);
    alert("Backup request sent to command.");
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    const incidentId = `INC-MOB-${Math.floor(1000 + Math.random() * 9000)}`;

    const freshIncident: Incident = {
      id: incidentId,
      category: reportCategory,
      location: `${reportLocation} (Mobile Input)`,
      coordinates: [23.0398, 72.5281],
      status: "Assessing",
      description:
        reportDetails ||
        `Field report: ${reportCategory} incident categorized in ${reportLocation}.`,
      timestamp: "Immediate UTC",
      reportedBy: "Officer J. Vance (Mobile Terminal)",
      isHighPriority: reportHighPriority,
      attachmentsCount: reportFiles.length,
      threatIndex: reportHighPriority ? 95 : 45,
    };

    onAddIncident(freshIncident);

    const companionAlert: Alert = {
      id: `ALT-COMP-${Date.now()}`,
      type: reportHighPriority ? "Critical" : "Warning",
      message: `[MOBILE REPORTED] ${reportCategory} detected in ${reportLocation}`,
      time: "Immediate UTC",
      sector: reportLocation.split(" ")[0],
      status: "Pending",
      incidentId,
    };
    onAddAlert(companionAlert);

    setIncidentsLoggedCount((prev) => prev + 1);
    setRecentSubmitMessage(`Report sent. Ref: ${incidentId}`);
    setReportDetails("");

    setTimeout(() => {
      setRecentSubmitMessage(null);
      setActiveTab("MAP");
    }, 2200);
  };

  return (
    <div id="mobile-device-simulator" className="flex flex-col xl:flex-row items-center justify-center p-2 gap-8 font-sans">
      <div className="w-[380px] h-[780px] bg-black border-[8px] border-slate-900 rounded-[44px] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.85)] relative flex flex-col justify-between overflow-hidden outline outline-1 outline-slate-800">
        <div className="absolute top-0 inset-x-0 h-11 bg-black flex items-center justify-between px-5 z-40 text-[10px] font-mono text-slate-300">
          <span className="font-bold">09:41</span>
          <div className="w-28 h-5 bg-[#0B1220] rounded-b-2xl -mt-2" />
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 text-teal-400" />
            <Wifi className="w-3.5 h-3.5 text-teal-400" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="flex-1 mt-11 mb-14 bg-[#050B14] flex flex-col overflow-y-auto px-4 py-3 relative">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">AHMEDABAD POLICE</div>
              <div className="text-sm font-semibold text-white">Field Officer App</div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-[#0B1220] border border-slate-800 rounded-full px-2.5 py-1">
              <Navigation2 className="w-3.5 h-3.5 text-teal-400" />
              Live GPS
            </div>
          </div>

          {activeTab === "MAP" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search patrol sector..."
                  className="w-full bg-[#0B1220] text-[11px] placeholder-slate-500 border border-slate-800 focus:border-teal-400 rounded-lg py-2 pl-3 pr-8 outline-none font-mono text-white"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0B1220] p-3 border border-slate-800/60 rounded-2xl flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Duty Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-semibold text-slate-200">On Duty</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Officer J. Vance</span>
                </div>

                <button
                  onClick={handleRequestBackup}
                  className="bg-red-950/40 hover:bg-red-900/30 border border-red-500/30 active:scale-95 text-red-100 font-mono text-[10px] font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer py-2 px-1 transition-all"
                >
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                  Request Backup
                </button>
              </div>

              <div className="bg-[#0B1220] p-4 border border-slate-800/60 rounded-3xl flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                  <div>
                    <h4 className="text-[11px] text-white uppercase font-bold tracking-wider">Assigned Route</h4>
                    <span className="text-[9px] font-mono text-teal-400">Vastrapur Sector</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 border border-slate-800 bg-[#050B14] px-1.5 rounded-full">
                    GPS synced
                  </span>
                </div>

                <div className="h-28 bg-[#050B14] rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-850">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c111d_1px,transparent_1px),linear-gradient(to_bottom,#0c111d_1px,transparent_1px)] bg-[size:15px_15px] opacity-70"></div>
                  <div className="absolute top-[20%] left-[25%] flex flex-col items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-[7px] font-mono text-slate-500">Start</span>
                  </div>
                  <div className="absolute bottom-[35%] left-[55%] flex flex-col items-center">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                    <span className="text-[7px] font-mono text-white font-bold">Current</span>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="25" y1="20" x2="55" y2="65" stroke="#10b981" strokeWidth="1" strokeDasharray="1,1" />
                  </svg>
                </div>

                <div className="bg-[#050B14] p-3 border border-slate-850 rounded-2xl text-[10px] font-mono">
                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Next Instruction</span>
                  <span className="text-slate-300">Check perimeter fence B near East Gate.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ALERTS" && (
            <div className="flex flex-col gap-3 animate-fade-in font-mono">
              <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800">
                <span className="text-[11px] text-white uppercase font-bold">Active Alerts</span>
                <span className="text-[9px] text-teal-400">Realtime sync</span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
                {alerts.slice(-4).reverse().map((alert) => {
                  const isCritical = alert.type === "Critical";
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border text-[11px] ${
                        isCritical
                          ? "bg-red-950/20 border-red-500/20 text-red-200"
                          : "bg-[#0B1220] border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                            isCritical ? "bg-red-500 text-slate-950" : "bg-slate-850 text-slate-300"
                          }`}
                        >
                          {alert.type}
                        </span>
                        <span className="text-slate-500 text-[9px]">{alert.time}</span>
                      </div>
                      <p className="leading-relaxed font-sans text-xs text-slate-200">{alert.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "REPORT" && (
            <form onSubmit={handleSubmitReport} className="flex flex-col gap-3.5 animate-fade-in font-mono text-[11px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="text-[11px] text-white uppercase font-bold">Report Incident</span>
                <span className="text-[10px] text-slate-400">Mobile Terminal</span>
              </div>

              {recentSubmitMessage ? (
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl text-center text-emerald-400 font-bold block">
                  {recentSubmitMessage}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Incident Type</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value as IncomingIncidentCategory)}
                      className="w-full bg-[#0B1220] border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Theft">Theft / Larceny</option>
                      <option value="Assault">Physical Assault</option>
                      <option value="Cybercrime">Cybercrime / Fraud</option>
                      <option value="Fraud">Financial Fraud</option>
                      <option value="Robbery">Armed Robbery</option>
                      <option value="Snatching">Snatching / Theft</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Captured Location</label>
                    <div className="bg-[#0B1220] border border-slate-800 rounded-lg p-2 flex items-center justify-between text-slate-200 text-xs">
                      <span>{reportLocation}</span>
                      <span className="text-[10px] text-slate-500 italic">GPS</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#0B1220] p-2.5 border border-slate-800 rounded-xl">
                    <span className="text-slate-200">High Priority Incident</span>
                    <input
                      type="checkbox"
                      checked={reportHighPriority}
                      onChange={(e) => setReportHighPriority(e.target.checked)}
                      className="w-4 h-4 accent-teal-400 bg-slate-800 rounded border-slate-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Incident Notes</label>
                    <textarea
                      placeholder="Enter witness notes..."
                      rows={2}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="w-full bg-[#0B1220] border border-slate-800 focus:border-teal-400 text-xs rounded-lg px-2.5 py-1.5 text-white placeholder-slate-700 outline-none"
                    />
                  </div>

                  <div className="bg-[#0B1220] border border-slate-800 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Photo Attachment</div>
                        <div className="text-xs text-slate-200 mt-1">Attach a photo from the field</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-3 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center gap-1.5"
                      >
                        <Camera className="w-4 h-4" />
                        Capture
                      </button>
                    </div>
                    <div className="mt-3 text-[10px] text-slate-500 font-mono">Last sync: {lastSync}</div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">
                      Attachments ({reportFiles.length})
                    </span>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto mb-1">
                      {reportFiles.map((file, idx) => (
                        <div key={idx} className="bg-[#050B14] p-1.5 border border-slate-850 rounded flex justify-between items-center text-[10px]">
                          <span className="text-slate-300 truncate">{file}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-red-400 font-bold px-1 hover:text-red-300 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Attach filename..."
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="flex-1 bg-[#0B1220] border border-slate-800 rounded px-2 py-1 text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={handleAddFile}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[9px] hover:text-white cursor-pointer"
                      >
                        ADD
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-lg text-xs tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-1 mt-1 shadow-lg"
                  >
                    <Send className="w-4 h-4 font-bold" />
                    Submit Report
                  </button>
                </>
              )}
            </form>
          )}

          {activeTab === "STATUS" && (
            <div className="flex flex-col gap-4 animate-fade-in text-[11px] font-mono">
              <div className="bg-[#0B1220]/60 p-3.5 border border-slate-800/60 rounded-2xl flex items-center gap-3">
                <div className="h-11 w-11 bg-[#050B14] border border-slate-800 rounded-full flex items-center justify-center text-teal-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold leading-none">J. Vance, ID-9428</h4>
                  <span className="text-[10px] text-slate-500">Lieutenant · Patrol Unit A</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#0B1220] p-2 border border-slate-800/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Active Time</span>
                  <span className="text-[11px] font-bold text-white block mt-0.5">{formatSeconds(timeActive)}</span>
                </div>
                <div className="bg-[#0B1220] p-2 border border-slate-800/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Patrolled</span>
                  <span className="text-xs font-bold text-white block mt-0.5">{distancePatrolled} km</span>
                </div>
                <div className="bg-[#0B1220] p-2 border border-slate-800/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Logs Filed</span>
                  <span className="text-xs font-bold text-teal-400 block mt-0.5">{String(incidentsLoggedCount).padStart(2, "0")}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setDutyState("ON_DUTY")}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "ON_DUTY"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-[#050B14] text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  On Duty
                </button>
                <button
                  type="button"
                  onClick={() => setDutyState("BREAK")}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "BREAK"
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-[#050B14] text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  Break
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDutyState("END_SHIFT");
                    setTimeActive(15735);
                  }}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "END_SHIFT"
                      ? "bg-red-500 text-slate-950 border-red-400"
                      : "bg-[#050B14] text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  End Shift
                </button>
              </div>

              <div className="space-y-1.5 mt-2">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Shift Activity Record</span>
                <div className="space-y-1 max-h-[140px] overflow-y-auto bg-[#050B14] p-2 border border-slate-850 rounded-lg">
                  <div className="text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                    [04:12 UTC] Reported theft incident at Vastrapur Lake.
                  </div>
                  <div className="text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                    [03:40 UTC] Completed routine patrol loop - SG Highway clear.
                  </div>
                  <div className="text-[10px] text-slate-500">
                    [02:10 UTC] Checked in at central HQ command center.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-14 bg-[#050B14] border-t border-slate-900 flex items-center justify-around px-2 z-40">
          <button
            onClick={() => setActiveTab("MAP")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "MAP" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Map</span>
          </button>

          <button
            onClick={() => setActiveTab("ALERTS")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "ALERTS" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Alerts</span>
          </button>

          <button
            onClick={() => setActiveTab("REPORT")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "REPORT" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Report</span>
          </button>

          <button
            onClick={() => setActiveTab("STATUS")}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${
              activeTab === "STATUS" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Status</span>
          </button>
        </div>
      </div>

      <div className="max-w-xs space-y-4">
        <div className="bg-[#0B1220] border border-slate-800 p-5 rounded-2xl">
          <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-2">Field Officer App Notes</h4>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            This screen mirrors the mobile app used by field officers. It keeps the same workflow, but reads like a real device interface.
          </p>
          <div className="space-y-2 pt-3 text-[11px] font-mono border-t border-slate-800 text-slate-400 leading-relaxed">
            <div>
              <b className="text-slate-100 block">Incident sync</b>
              Submitting a report pushes it into the desktop command center immediately.
            </div>
            <div>
              <b className="text-slate-100 block">Live patrol</b>
              The active-time clock and distance meters update while duty is on.
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-mono flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {lastSync}
          </div>
        </div>
      </div>
    </div>
  );
}
