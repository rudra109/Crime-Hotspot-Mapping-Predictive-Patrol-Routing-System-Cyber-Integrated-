/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  MapPin, ShieldAlert, Radio, Clock, Clipboard, FileText, CheckCircle, 
  User, Send, Battery, Signal, Wifi, Activity, AlertOctagon, HelpCircle 
} from "lucide-react";
import { Incident, Alert, MobileTab } from "../types";

interface MobileOfficerSimulatorProps {
  onAddIncident: (incident: Incident) => void;
  onAddAlert: (alert: Alert) => void;
  alerts: Alert[];
}

export default function MobileOfficerSimulator({
  onAddIncident,
  onAddAlert,
  alerts
}: MobileOfficerSimulatorProps) {
  // Simulator Navigation State
  const [activeTab, setActiveTab] = useState<MobileTab>("MAP");

  // Officer Shift Status State
  const [dutyState, setDutyState] = useState<"ON_DUTY" | "BREAK" | "END_SHIFT">("ON_DUTY");
  const [timeActive, setTimeActive] = useState(15735); // 04:22:15 in seconds
  const [distancePatrolled, setDistancePatrolled] = useState(8.4);
  const [incidentsLoggedCount, setIncidentsLoggedCount] = useState(3);

  // Status Counter Increment Hook
  useEffect(() => {
    if (dutyState !== "ON_DUTY") return;
    const interval = setInterval(() => {
      setTimeActive((prev) => prev + 1);
      // simulate walking
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
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":");
  };

  // Report Form state
  const [reportCategory, setReportCategory] = useState<IncomingIncidentCategory>("Intrusion");
  const [reportLocation, setReportLocation] = useState("Sector 7G Drone Gate B");
  const [reportDetails, setReportDetails] = useState("");
  const [reportHighPriority, setReportHighPriority] = useState(true);
  const [reportFiles, setReportFiles] = useState<string[]>(["thermal_fence_scan_7G.png", "telemetry_logs_bay2.txt"]);
  const [newFileName, setNewFileName] = useState("");
  const [recentSubmitMessage, setRecentSubmitMessage] = useState<string | null>(null);

  type IncomingIncidentCategory = "Intrusion" | "System Sabotage" | "Critical Asset Leak" | "Comms Jamming" | "Biometric Alarm" | "Drill";

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      setReportFiles([...reportFiles, newFileName.trim()]);
      setNewFileName("");
    }
  };

  const handleRemoveFile = (idx: number) => {
    setReportFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Custom Quick Actions
  const handleRequestBackup = () => {
    const freshAlert: Alert = {
      id: `ALT-MOB-${Date.now()}`,
      type: "Critical",
      message: "[OFFICER FIELD EMERGENCY] Officer J. Vance requesting immediate back-up in Sector 7G!",
      time: "Immediate UTC",
      sector: "Sector 7G",
      status: "Pending"
    };
    onAddAlert(freshAlert);
    
    // Alert Sound Visualization Trigger
    alert("ALERT: Emergency backup dispatch message sent. High audit log recorded.");
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    const incidentId = `INC-MOB-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const freshIncident: Incident = {
      id: incidentId,
      category: reportCategory,
      location: `${reportLocation} (Mobile Input)`,
      coordinates: [45 + (Math.random() * 10 - 5), 32 + (Math.random() * 10 - 5)],
      status: "Assessing",
      description: reportDetails || `Field report: ${reportCategory} incident categorized in ${reportLocation}. Raw logs attached by Lieutenant Vance.`,
      timestamp: "Immediate UTC",
      reportedBy: "Officer J. Vance (Mobile Terminal)",
      isHighPriority: reportHighPriority,
      attachmentsCount: reportFiles.length,
      threatIndex: reportHighPriority ? 95 : 45
    };

    onAddIncident(freshIncident);

    // Also auto-append an Alert to the ticker
    const companionAlert: Alert = {
      id: `ALT-COMP-${Date.now()}`,
      type: reportHighPriority ? "Critical" : "Warning",
      message: `[MOBILE REPORTED] ${reportCategory} detected in ${reportLocation}`,
      time: "Immediate UTC",
      sector: "Sector 7G",
      status: "Pending",
      incidentId: incidentId
    };
    onAddAlert(companionAlert);

    setIncidentsLoggedCount(prev => prev + 1);
    setRecentSubmitMessage(`REPORT SENT! Incident Ref: ${incidentId}`);
    setReportDetails("");
    
    setTimeout(() => {
      setRecentSubmitMessage(null);
      setActiveTab("MAP"); // redirect back to map on submit!
    }, 2500);
  };

  return (
    <div id="mobile-device-simulator" className="flex flex-col xl:flex-row items-center justify-center p-2 gap-8 font-sans">
      
      {/* Device Frame Wrapper (Simulating an iPhone dimensions 390x844 approx) */}
      <div className="w-[380px] h-[780px] bg-slate-950 border-[10px] border-slate-900 rounded-[40px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative flex flex-col justify-between overflow-hidden outline outline-1 outline-slate-800">
        
        {/* Device Notch & Status bar */}
        <div className="absolute top-0 inset-x-0 h-10 bg-slate-950 flex items-center justify-between px-6 z-40 text-[10px] font-mono text-slate-400">
          <span className="font-bold">04:22 UTC</span>
          {/* Mock Camera Notch */}
          <div className="w-24 h-4.5 bg-slate-900 rounded-b-xl -mt-1 ml-2.5"></div>
          <div className="flex items-center gap-1">
            <Signal className="w-3.5 h-3.5 text-teal-400" />
            <Wifi className="w-3.5 h-3.5 text-teal-400" />
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Dynamic Mobile Screen Section */}
        <div className="flex-1 mt-10 mb-14 bg-slate-950 flex flex-col overflow-y-auto px-4 py-3 relative">
          
          {/* VIEW 1: MAP / QUICK ROUTE TAB */}
          {activeTab === "MAP" && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Search Field */}
              <div id="quick-patrol-search" className="relative">
                <input 
                  type="text" 
                  placeholder="Quick Search Patrol Sector..." 
                  className="w-full bg-slate-900 text-[11px] placeholder-slate-500 border border-slate-800 focus:border-teal-400 rounded-lg py-2 pl-3 pr-8 outline-none font-mono text-white"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
              </div>

              {/* Duty Toggle / Backup CTA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 p-2.5 border border-slate-805/60 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold font-mono text-slate-200">ON DUTY</span>
                  </div>
                </div>

                <button 
                  onClick={handleRequestBackup}
                  className="bg-red-950/40 hover:bg-red-900/30 border border-red-500/30 active:scale-95 text-red-100 font-mono text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer py-2 px-1 transition-all"
                >
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                  REQUEST BACKUP
                </button>
              </div>

              {/* Waypoints Active Route layout */}
              <div className="bg-slate-900 p-4 border border-slate-805/60 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-805/60">
                  <div>
                    <h4 className="text-[11px] text-white uppercase font-bold tracking-wider">Active Patrol Route</h4>
                    <span className="text-[9px] font-mono text-teal-400">PATROL SECTOR 7G</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 border border-slate-800 bg-slate-950 px-1.5 rounded">GPS SYNCED</span>
                </div>

                {/* Simulated Path Visual Block */}
                <div className="h-28 bg-slate-950 rounded-lg relative overflow-hidden flex items-center justify-center border border-slate-850">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c111d_1px,transparent_1px),linear-gradient(to_bottom,#0c111d_1px,transparent_1px)] bg-[size:15px_15px] opacity-70"></div>
                  {/* Waypoint markers */}
                  <div className="absolute top-[20%] left-[25%] flex flex-col items-center">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-[7px] font-mono text-slate-500">Alpha Post</span>
                  </div>
                  <div className="absolute bottom-[35%] left-[55%] flex flex-col items-center">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                    <span className="text-[7px] font-mono text-white font-bold">Gate B</span>
                  </div>
                  {/* Path Connector */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="25" y1="20" x2="55" y2="65" stroke="#10b981" strokeWidth="1" strokeDasharray="1,1" />
                  </svg>
                </div>

                <div className="bg-slate-950 p-2 border border-slate-850 rounded-lg text-[10px] font-mono">
                  <span className="text-slate-500 block text-[8px] uppercase font-bold">Next Move Instruction:</span>
                  <span className="text-slate-300">Scan perimeter fence B near the drone hangar East Gate.</span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ALERTS LIST */}
          {activeTab === "ALERTS" && (
            <div className="flex flex-col gap-3 animate-fade-in font-mono">
              <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-800">
                <span className="text-[11px] text-white uppercase font-bold">Active Station Alarms</span>
                <span className="text-[9px] text-teal-400">RADIO SYNC</span>
              </div>
              
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
                {alerts.slice(-4).reverse().map((alert) => {
                  const isCritical = alert.type === "Critical";
                  return (
                    <div 
                      key={alert.id}
                      className={`p-3 rounded-xl border text-[11px] ${
                        isCritical 
                          ? 'bg-red-950/20 border-red-500/20 text-red-200' 
                          : 'bg-slate-900 border-slate-805 text-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${isCritical ? 'bg-red-500 text-slate-950' : 'bg-slate-850 text-slate-300'}`}>
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

          {/* VIEW 3: REPORT INCIDENT FORM */}
          {activeTab === "REPORT" && (
            <form onSubmit={handleSubmitReport} className="flex flex-col gap-3.5 animate-fade-in font-mono text-[11px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="text-[11px] text-white uppercase font-bold">Report Incident</span>
                <span className="text-[10px] text-slate-400">Terminal J. Vance</span>
              </div>

              {recentSubmitMessage ? (
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-xl text-center text-emerald-400 font-bold block">
                  {recentSubmitMessage}
                </div>
              ) : (
                <>
                  {/* Category Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">INCIDENT CATEGORY</label>
                    <select
                      value={reportCategory}
                      onChange={(e) => setReportCategory(e.target.value as IncomingIncidentCategory)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      <option value="Intrusion">Fence Intrusion</option>
                      <option value="System Sabotage">System Sabotage</option>
                      <option value="Critical Asset Leak">Critical Asset Leak</option>
                      <option value="Comms Jamming">Comms Jamming</option>
                      <option value="Biometric Alarm">Biometric Alarm</option>
                    </select>
                  </div>

                  {/* Auto GPS Location display */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">AUTO DETECTED LOCATION</label>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-slate-200 text-xs">
                      <span>{reportLocation}</span>
                      <span className="text-[10px] text-slate-500 italic">45.3E, 12.9N</span>
                    </div>
                  </div>

                  {/* High priority toggle */}
                  <div className="flex items-center justify-between bg-slate-900 p-2.5 border border-slate-805 rounded-xl">
                    <span className="text-slate-200">High Priority Incident</span>
                    <input 
                      type="checkbox" 
                      checked={reportHighPriority}
                      onChange={(e) => setReportHighPriority(e.target.checked)}
                      className="w-4 h-4 accent-teal-400 bg-slate-800 rounded border-slate-800"
                    />
                  </div>

                  {/* Details Paragraph Text box */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">DETAILS DETAILS</label>
                    <textarea
                      placeholder="Input eyewitness log details..."
                      rows={2}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-400 text-xs rounded-lg px-2.5 py-1.5 text-white placeholder-slate-700 outline-none"
                    ></textarea>
                  </div>

                  {/* Attachment selector */}
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">ATTACHMENTS ({reportFiles.length})</span>
                    <div className="space-y-1 max-h-[80px] overflow-y-auto mb-1">
                      {reportFiles.map((file, idx) => (
                        <div key={idx} className="bg-slate-950 p-1.5 border border-slate-850 rounded flex justify-between items-center text-[10px]">
                          <span className="text-slate-300 truncate">{file}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-red-400 font-bold px-1 hover:text-red-300 cursor-pointer"
                          >
                            ✖
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add attachment block */}
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="Attach filename... (e.g. img.jpg)" 
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px]"
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

                  {/* Submit Incident Report CTA */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-lg text-xs tracking-wider uppercase cursor-pointer transition-all flex items-center justify-center gap-1 mt-1 shadow-lg"
                  >
                    <Send className="w-4 h-4 font-bold" />
                    SUBMIT INCIDENT REPORT
                  </button>
                </>
              )}
            </form>
          )}

          {/* VIEW 4: OFFICER STATUS & SHIFT LOGS */}
          {activeTab === "STATUS" && (
            <div className="flex flex-col gap-4 animate-fade-in text-[11px] font-mono">
              {/* Profile Card */}
              <div className="bg-slate-900/60 p-3.5 border border-slate-805/60 rounded-2xl flex items-center gap-3">
                <div className="h-11 w-11 bg-slate-950 border border-slate-800 rounded-full flex items-center justify-center text-teal-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold leading-none">J. Vance, ID-9428</h4>
                  <span className="text-[10px] text-slate-500">Lieutenant · Sentinel Group A</span>
                </div>
              </div>

              {/* Shift analytics active values */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2 border border-slate-805/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Active Time</span>
                  <span id="mobile-timer-val" className="text-[11px] font-bold text-white block mt-0.5">{formatSeconds(timeActive)}</span>
                </div>
                <div className="bg-slate-900 p-2 border border-slate-805/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Dist Active</span>
                  <span className="text-xs font-bold text-white block mt-0.5">{distancePatrolled}km</span>
                </div>
                <div className="bg-slate-900 p-2 border border-slate-805/50 rounded-xl">
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Logs Filed</span>
                  <span className="text-xs font-bold text-teal-400 block mt-0.5">0{incidentsLoggedCount}</span>
                </div>
              </div>

              {/* Status State Shift Controllers */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setDutyState("ON_DUTY")}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "ON_DUTY" 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                      : 'bg-slate-950 text-slate-400 border-slate-805 hover:text-white'
                  }`}
                >
                  On Duty
                </button>
                <button
                  type="button"
                  onClick={() => setDutyState("BREAK")}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "BREAK" 
                      ? 'bg-amber-500 text-slate-950 border-amber-400' 
                      : 'bg-slate-950 text-slate-400 border-slate-805 hover:text-white'
                  }`}
                >
                  On Break
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDutyState("END_SHIFT");
                    setTimeActive(15735); // reset/stop
                  }}
                  className={`py-1.5 text-[9px] uppercase font-bold rounded-lg border transition-all cursor-pointer ${
                    dutyState === "END_SHIFT" 
                      ? 'bg-red-500 text-slate-950 border-red-400' 
                      : 'bg-slate-950 text-slate-400 border-slate-805 hover:text-white'
                  }`}
                >
                  End Shift
                </button>
              </div>

              {/* Historic Shifts Activity list logs */}
              <div className="space-y-1.5 mt-2">
                <span className="text-[9px] text-slate-500 block uppercase font-bold">Shift Activity Record</span>
                <div className="space-y-1 max-h-[140px] overflow-y-auto bg-slate-950 p-2 border border-slate-850 rounded-lg">
                  <div className="text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                    [04:12 UTC] Reported Intrusion at Sector 7G Drone Gate B.
                  </div>
                  <div className="text-[10px] text-slate-400 border-b border-slate-900 pb-1">
                    [03:40 UTC] Completed routine patrol loop - Sector 3B clear.
                  </div>
                  <div className="text-[10px] text-slate-500">
                    [02:10 UTC] Checked in at central HQ Command Center Terminal.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Mobile bottom navigation menu bar */}
        <div className="absolute bottom-0 inset-x-0 h-14 bg-slate-950 border-t border-slate-900 flex items-center justify-around px-2 z-40">
          <button 
            onClick={() => setActiveTab("MAP")} 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${activeTab === "MAP" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Map</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("ALERTS")} 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${activeTab === "ALERTS" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Radio className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Alerts</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("REPORT")} 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${activeTab === "REPORT" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Report</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("STATUS")} 
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full cursor-pointer transition-colors ${activeTab === "STATUS" ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            <User className="w-4 h-4" />
            <span className="text-[8px] font-mono tracking-tight font-semibold">Status</span>
          </button>
        </div>

      </div>

      {/* Simulator Guidance Sidebar describing mobile interactions */}
      <div className="max-w-xs space-y-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative">
          <div className="absolute top-2 right-2 text-[9px] font-mono text-teal-400 uppercase">
            Simulator
          </div>
          <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 mb-2">
            Mobile Field Unit Simulator
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-mono">
            This module simulates the **biometric mobile application** issued to field officers like Lieutenant J. Vance.
          </p>
          <div className="space-y-2 pt-3 text-[11px] font-mono border-t border-slate-800 text-slate-400 leading-relaxed">
            <div>
              <b className="text-slate-100 block">⚡ SENSOR CORRELATION</b>
              Submitting reports or sounding emergencies directly pushes telemetry alerts into the Desktop Command Center streams in real time!
            </div>
            <div>
              <b className="text-slate-100 block">⌚ REAL-TIME TRACKING</b>
              The "Active Time" clock automatically counts up, simulating on-foot patrol speed and distance modifiers.
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
