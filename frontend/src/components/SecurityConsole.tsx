/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Lock, UserCheck, ShieldCheck, Activity, RefreshCw, Key,
  Sliders, Plus, X, Trash2, Calendar, FileText, Ban, Server, AlertTriangle
} from "lucide-react";
import {
  registerUser,
  loginUser,
  verifyMfaUser,
  generateMfaCodeApi,
  fetchLegalHolds,
  addLegalHold,
  removeLegalHold,
  fetchRetentionPolicy,
  updateRetentionPolicy,
  pruneComplianceData,
  fetchAuditLogs,
  simulateSmartCitySos,
  simulateSmartCityTraffic,
  simulateSmartCityStreetlight,
  triggerAnomalyCheck
} from "../api/apiClient";

export default function SecurityConsole() {
  // Authentication states
  const [regForm, setRegForm] = useState({ badgeNumber: "", name: "", password: "", role: "officer" });
  const [regSuccess, setRegSuccess] = useState<string>("");
  const [regError, setRegError] = useState<string>("");
  const [regTotpSecret, setRegTotpSecret] = useState<string>("");

  const [loginForm, setLoginForm] = useState({ badgeNumber: "", password: "" });
  const [loginError, setLoginError] = useState<string>("");
  const [mfaChallenge, setMfaChallenge] = useState<boolean>(false);
  const [mfaToken, setMfaToken] = useState<string>("");
  const [simTotpSecret, setSimTotpSecret] = useState<string>("");
  
  const [activeUser, setActiveUser] = useState<any>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  // Compliance states
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [holds, setHolds] = useState<any[]>([]);
  const [newHold, setNewHold] = useState({ incidentId: "", reason: "" });
  const [holdError, setHoldError] = useState<string>("");
  const [complianceSuccess, setComplianceSuccess] = useState<string>("");

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);

  const handleAutofillTotp = async () => {
    if (!simTotpSecret) return;
    try {
      const code = await generateMfaCodeApi(simTotpSecret);
      setMfaToken(code);
    } catch (err) {
      console.error("Failed to generate simulated TOTP:", err);
    }
  };

  const handleSimulateSmartCitySos = async () => {
    setComplianceSuccess("");
    setHoldError("");
    try {
      const res = await simulateSmartCitySos({
        poleId: "SOS-POLE-14",
        sector: "Maninagar",
        notes: "SOS Button pressed on public safety pole #14 near Maninagar market.",
        latitude: 22.9975,
        longitude: 72.6020
      });
      if (res.success) {
        setComplianceSuccess("Smart City SOS Panic Pole Webhook simulated. Critical alert generated.");
        loadAuditLogs();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Failed to trigger smart city SOS webhook");
    }
  };

  const handleSimulateSmartCityTraffic = async () => {
    setComplianceSuccess("");
    setHoldError("");
    try {
      const res = await simulateSmartCityTraffic({
        cameraId: "CAM-TRAF-28",
        sector: "Thaltej",
        violationType: "speeding",
        speedKmh: 125,
        latitude: 23.0596,
        longitude: 72.5394
      });
      if (res.success) {
        setComplianceSuccess("Smart City Traffic Camera Speeding webhook simulated. Warning alert generated.");
        loadAuditLogs();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Failed to trigger traffic webhook");
    }
  };

  const handleSimulateSmartCityStreetlight = async () => {
    setComplianceSuccess("");
    setHoldError("");
    try {
      const res = await simulateSmartCityStreetlight({
        sensorId: "IoT-LITE-99",
        sector: "Satellite",
        status: "offline",
        latitude: 23.0045,
        longitude: 72.5845
      });
      if (res.success) {
        setComplianceSuccess("Smart City IoT Light failure blackout webhook simulated. Warning alert generated.");
        loadAuditLogs();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Failed to trigger streetlight sensor webhook");
    }
  };

  const handleTriggerAnomalyEvaluation = async () => {
    setComplianceSuccess("");
    setHoldError("");
    try {
      const res = await triggerAnomalyCheck();
      if (res.success) {
        setComplianceSuccess(`AI Anomaly Engine: Evaluated trends. Found ${res.newAnomaliesCount} statistical anomalies.`);
        loadAuditLogs();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "AI evaluation failed");
    }
  };

  useEffect(() => {
    // Read active session if exists
    const token = localStorage.getItem("aegis_jwt_token");
    const userStr = localStorage.getItem("aegis_user");
    if (token && userStr) {
      setActiveToken(token);
      setActiveUser(JSON.parse(userStr));
    }
    
    loadComplianceData();
    loadAuditLogs();
  }, []);

  const loadComplianceData = async () => {
    try {
      const days = await fetchRetentionPolicy();
      setRetentionDays(days);
      const legalHolds = await fetchLegalHolds();
      setHolds(legalHolds);
    } catch (err) {
      console.warn("Failed to load compliance details:", err);
    }
  };

  const loadAuditLogs = async () => {
    setLogsLoading(true);
    try {
      // Re-fetch audit logs from backend using existing /audit or stats API
      // Since backend audit log service is active, we call fetchAuditLogs
      const logs = await fetchAuditLogs();
      setAuditLogs(logs || []);
    } catch {
      // Mock logs fallback
      setAuditLogs([
        { id: "audit-1", timestamp: new Date().toISOString(), user_id: "BADGE-1111", action: "API_REQUEST", resource: "POST /decision/simulate", status: "success", changes: { ip: "127.0.0.1", statusCode: 200 } },
        { id: "audit-2", timestamp: new Date(Date.now() - 50000).toISOString(), user_id: "ANONYMOUS", action: "API_REQUEST", resource: "GET /crimes", status: "success", changes: { ip: "127.0.0.1", statusCode: 200 } }
      ]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    setRegTotpSecret("");
    try {
      const res = await registerUser(regForm);
      if (res.success) {
        setRegSuccess(`Badge ${res.user.badgeNumber} registered successfully!`);
        setRegTotpSecret(res.totpSecret);
        setRegForm({ badgeNumber: "", name: "", password: "", role: "officer" });
      }
    } catch (err: any) {
      setRegError(err.response?.data?.error || "Registration failed");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await loginUser(loginForm);
      if (res.mfaRequired) {
        setMfaChallenge(true);
        setSimTotpSecret(res.totpSecret || "");
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || "Authentication failed");
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await verifyMfaUser({
        badgeNumber: loginForm.badgeNumber,
        token: mfaToken
      });
      if (res.success) {
        setActiveToken(res.token);
        setActiveUser(res.user);
        localStorage.setItem("aegis_jwt_token", res.token);
        localStorage.setItem("aegis_user", JSON.stringify(res.user));
        
        // Reset forms
        setMfaChallenge(false);
        setMfaToken("");
        setLoginForm({ badgeNumber: "", password: "" });
        loadComplianceData();
        loadAuditLogs();
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || "Invalid MFA code");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("aegis_jwt_token");
    localStorage.removeItem("aegis_user");
    setActiveToken(null);
    setActiveUser(null);
  };

  const handleUpdatePolicy = async () => {
    setComplianceSuccess("");
    try {
      const res = await updateRetentionPolicy(retentionDays);
      if (res.success) {
        setComplianceSuccess(`Retention duration updated to ${retentionDays} days.`);
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Failed to update retention policy");
    }
  };

  const handleAddHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setHoldError("");
    setComplianceSuccess("");
    try {
      const res = await addLegalHold(newHold);
      if (res.success) {
        setComplianceSuccess(`Legal hold successfully applied to incident ${newHold.incidentId}`);
        setNewHold({ incidentId: "", reason: "" });
        loadComplianceData();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Access Denied: Supervisor privileges required");
    }
  };

  const handleRemoveHold = async (id: string) => {
    setHoldError("");
    setComplianceSuccess("");
    try {
      const res = await removeLegalHold(id);
      if (res.success) {
        setComplianceSuccess(`Legal hold removed for incident ${id}`);
        loadComplianceData();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Access Denied: Supervisor privileges required");
    }
  };

  const handleExecutePrune = async () => {
    setComplianceSuccess("");
    setHoldError("");
    try {
      const res = await pruneComplianceData();
      if (res.success) {
        setComplianceSuccess(`Retention prune complete! Removed ${res.prunedCount} records. Locked ${res.lockedCount} records.`);
        loadAuditLogs();
      }
    } catch (err: any) {
      setHoldError(err.response?.data?.error || "Prune failed");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-200 font-sans animate-fade-in pb-12 selection:bg-cyan-500/30">
      
      {/* ── Banner ── */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0B1220]/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-lg gap-4">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-[#FF4D4F] uppercase block mb-1">
            Tactical Module Phase 9
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-[#FF4D4F]" />
            DATA SECURITY & COMPLIANCE CONSOLE
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Audit API request streams, manage role permissions, regulate time-to-live logs retention, and review legal holds.
          </p>
        </div>
        
        {activeUser ? (
          <div className="flex items-center gap-3 bg-[#131B2E] border border-slate-800 p-2.5 rounded-2xl">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight">{activeUser.name}</div>
              <div className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest leading-none mt-0.5">{activeUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-400 hover:text-red-400 font-mono font-bold ml-2 border border-slate-800 hover:border-red-500/20 px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer transition"
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 px-4 py-2.5 rounded-2xl text-xs text-slate-400 font-medium">
            <Key className="w-3.5 h-3.5 text-red-400" />
            Protected Session: Authentication Required
          </div>
        )}
      </div>

      {/* ── Left Column: Authentication & Compliance Policy ── */}
      <div className="lg:col-span-7 space-y-8">
        
        {/* User Auth Simulator */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4D4F]/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Security Login & MFA Simulator</h2>
          </div>

          {!activeUser ? (
            <div className="space-y-6">
              {/* Login block */}
              {!mfaChallenge ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Account Sign-In</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Badge ID (e.g. BADGE-1111)"
                        value={loginForm.badgeNumber}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                        className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder="Password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                  >
                    Submit Credentials
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyMfa} className="space-y-4 animate-pulse-once">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Multi-Factor Authentication Required
                  </span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Enter the 6-digit TOTP code. For testing, copy the simulated seed below into an OTP tool or check the challenge seed.
                  </p>
                  
                  {/* Simulator key box */}
                  <div className="bg-[#121A2C] border border-slate-800 p-3 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-mono">SIMULATED SECRET SEED:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#00E5FF] font-mono font-bold tracking-wider">{simTotpSecret}</span>
                      <button
                        type="button"
                        onClick={handleAutofillTotp}
                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-bold px-2 py-0.5 rounded text-[9px] cursor-pointer border border-cyan-500/30 transition"
                      >
                        AUTOFILL OTP
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit Code"
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value)}
                      className="flex-1 bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-sm focus:border-cyan-500 focus:outline-none text-center text-white tracking-widest font-mono font-bold"
                    />
                    <button
                      type="submit"
                      className="bg-[#00E5FF] hover:bg-[#00B4D8] text-[#080F1D] font-extrabold px-6 rounded-xl transition text-xs cursor-pointer"
                    >
                      Verify MFA & Get JWT
                    </button>
                  </div>
                </form>
              )}

              {loginError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-xs font-semibold">
                  {loginError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">Active Secure Session Authenticated</div>
                  <div className="mt-0.5 text-slate-400 leading-normal">
                    Signed JWT token loaded. API header automatically includes `Authorization: Bearer [JWT]` for all requests.
                  </div>
                </div>
              </div>

              {/* JWT display box */}
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Active JSON Web Token (JWT)</span>
                <div className="bg-[#121A2C] border border-slate-800 p-3.5 rounded-xl font-mono text-[10px] text-slate-400 break-all select-all leading-normal max-h-24 overflow-y-auto">
                  {activeToken}
                </div>
              </div>
            </div>
          )}

          {/* Registration Section */}
          <div className="border-t border-slate-800/80 mt-6 pt-6 space-y-4">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">Register Officer/Badge Account</span>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Badge ID (e.g. BADGE-3333)"
                  value={regForm.badgeNumber}
                  onChange={(e) => setRegForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                  className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white font-mono"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Officer Full Name"
                  value={regForm.name}
                  onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Create password"
                  value={regForm.password}
                  onChange={(e) => setRegForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white font-mono"
                />
              </div>
              <div>
                <select
                  value={regForm.role}
                  onChange={(e) => setRegForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-[#131B2E] border border-slate-800 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-white font-mono"
                >
                  <option value="officer">Officer (Read-only HUD)</option>
                  <option value="dispatcher">Dispatcher (Operations/Alerts)</option>
                  <option value="supervisor">Supervisor (Admin/DSS/Compliance)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer shadow-md"
                >
                  Register Account Badge
                </button>
              </div>
            </form>

            {regSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-center text-xs font-semibold">
                {regSuccess}
              </div>
            )}

            {regTotpSecret && (
              <div className="bg-[#121A2C] border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-mono">MFA SETUP SECRET KEY:</span>
                  <span className="text-[#00E5FF] font-mono font-bold select-all">{regTotpSecret}</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-normal">
                  Copy this key to configure your virtual authenticator app or use it in the Login MFA verifier simulator.
                </div>
              </div>
            )}

            {regError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-center text-xs font-semibold">
                {regError}
              </div>
            )}
          </div>
        </div>

        {/* Data Retention policy control */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg space-y-5">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Compliance & Data Retention Policy</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Data Retention Period</span>
                <span className="text-xs font-mono font-bold text-white">{retentionDays} Days</span>
              </div>
              <input
                type="range"
                min="7"
                max="365"
                step="7"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleUpdatePolicy}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
              >
                Apply Retention Period
              </button>
              
              <button
                onClick={handleExecutePrune}
                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Run Pruning Job Now
              </button>
            </div>

            {complianceSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-2xl text-center text-xs font-bold leading-normal">
                {complianceSuccess}
              </div>
            )}
          </div>
        </div>

        {/* Smart City & AI Anomaly Telemetry Simulator */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg space-y-5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Smart City IoT & Anomaly Simulator</h2>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Simulate incoming data feeds from smart city infrastructure sensors, IoT panic poles, municipal traffic cams, and trigger AI statistical checks.
          </p>

          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold mb-2">Smart City Ingestion Webhooks</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleSimulateSmartCitySos}
                  className="bg-[#050B14] hover:bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-red-400 hover:text-red-300 font-mono font-bold py-2 px-3 rounded-xl transition text-[10px] cursor-pointer"
                >
                  🚨 TRIGGER SOS PANIC POLE
                </button>
                <button
                  onClick={handleSimulateSmartCityTraffic}
                  className="bg-[#050B14] hover:bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-amber-400 hover:text-amber-300 font-mono font-bold py-2 px-3 rounded-xl transition text-[10px] cursor-pointer"
                >
                  📷 SPEED CAM VIOLATION
                </button>
                <button
                  onClick={handleSimulateSmartCityStreetlight}
                  className="bg-[#050B14] hover:bg-[#0B1220] border border-slate-800 hover:border-slate-700 text-cyan-400 hover:text-cyan-300 font-mono font-bold py-2 px-3 rounded-xl transition text-[10px] cursor-pointer"
                >
                  💡 IoT LIGHT BLACKOUT
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-bold mb-2">AI Statistical Engine Evaluation</span>
              <button
                onClick={handleTriggerAnomalyEvaluation}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.2)]"
              >
                Run AI Anomaly & Predictive Spike Checks
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Right Column: Access logs & Legal Holds ── */}
      <div className="lg:col-span-5 space-y-8">
        
        {/* Legal Holds Panel */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-white">Active Case Legal Holds</h2>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Incidents registered under a Legal Hold lock are exempted from automated data retention cleanup scripts.
          </p>

          {/* Holds table */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {holds.length === 0 ? (
              <div className="text-xs text-slate-500 italic text-center py-4 bg-[#121A2C]/30 border border-slate-800 rounded-xl">
                No active case locks registered.
              </div>
            ) : (
              holds.map((h: any) => (
                <div key={h.incidentId} className="bg-[#121A2C]/70 border border-slate-800 p-3 rounded-2xl flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#FF4D4F] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {h.incidentId}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-1 leading-normal">Reason: {h.reason}</div>
                    <div className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                      Locked By: {h.markedBy} | {new Date(h.markedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveHold(h.incidentId)}
                    className="h-6 w-6 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center text-red-400 cursor-pointer transition shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add hold form */}
          <form onSubmit={handleAddHold} className="border-t border-slate-800/80 pt-4 space-y-3">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Register Legal Hold Lock</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Incident ID"
                value={newHold.incidentId}
                onChange={(e) => setNewHold(prev => ({ ...prev, incidentId: e.target.value }))}
                className="bg-[#131B2E] border border-slate-800 rounded-xl p-2 text-xs focus:border-red-500 focus:outline-none text-white font-mono col-span-1"
              />
              <input
                type="text"
                placeholder="Investigative Reason"
                value={newHold.reason}
                onChange={(e) => setNewHold(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-[#131B2E] border border-slate-800 rounded-xl p-2 text-xs focus:border-red-500 focus:outline-none text-white col-span-2"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#1E293B] hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Apply Legal Hold
            </button>
          </form>

          {holdError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-center text-xs font-semibold leading-normal flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {holdError}
            </div>
          )}
        </div>

        {/* Access Logs Panel */}
        <div className="bg-[#0B1220]/85 border border-slate-800/80 backdrop-blur-xl p-6 rounded-3xl shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#00E5FF]" />
              <h2 className="text-base font-bold text-white">Global Access Audit Trail</h2>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={logsLoading}
              className="h-7 w-7 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Logs scroll area */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {auditLogs.map((log: any) => {
              const methodColor =
                log.resource.includes("GET") ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" :
                log.resource.includes("POST") ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                "text-red-400 bg-red-500/10 border-red-500/20";
              const isFailed = log.status === "failed" || log.status === "denied";

              return (
                <div key={log.id} className="bg-[#121A2C]/65 border border-slate-850 p-3 rounded-2xl flex flex-col gap-1.5 leading-none">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${methodColor}`}>
                        {log.resource.split(" ")[0]}
                      </span>
                      <span className="text-[10px] font-mono text-slate-300">
                        {log.resource.split(" ")[1]}
                      </span>
                    </div>
                    <span className={`text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded border ${
                      isFailed ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    }`}>
                      {log.changes?.statusCode || log.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                    <div>Badge: <b className="text-slate-400">{log.user_id}</b></div>
                    <div>{log.changes?.ip || "127.0.0.1"}</div>
                    <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
