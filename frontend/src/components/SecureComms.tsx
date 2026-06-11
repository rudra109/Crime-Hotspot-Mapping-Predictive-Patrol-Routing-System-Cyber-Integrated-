/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Radio, Cpu, RefreshCw, Send, CheckCircle, Activity, 
  ShieldAlert, ShieldCheck, Key, Lock, Unlock, HelpCircle, AlertTriangle, ArrowUpRight
} from "lucide-react";

interface CommsChannel {
  id: string;
  name: string;
  frequency: string; // e.g. "433.05 MHz"
  packetQuality: number; // 0-100
  status: "SECURE" | "JAMMED" | "FALLBACK" | "CALIBRATING";
  latency: number; // ms
}

export default function SecureComms() {
  const [channels, setChannels] = useState<CommsChannel[]>(
    [
      { id: "SIG-9", name: "Channel Sigma-9", frequency: "433.05 MHz", packetQuality: 52, status: "JAMMED", latency: 120 },
      { id: "GAM-3", name: "Channel Gamma-3", frequency: "868.10 MHz", packetQuality: 98, status: "SECURE", latency: 24 },
      { id: "LAS-Z", name: "Laser Fallback Link", frequency: "1550 nm (Optical)", packetQuality: 100, status: "FALLBACK", latency: 5 },
      { id: "SYS-T", name: "Hangar Tactical Core", frequency: "2.45 GHz", packetQuality: 12, status: "CALIBRATING", latency: 450 }
    ]
  );

  const [activeChannelId, setActiveChannelId] = useState<string>("SIG-9");
  
  // Decryptor Simulator States
  const [crypticInput, setCrypticInput] = useState<string>("");
  const [decryptedOutput, setDecryptedOutput] = useState<string>(
    "Awaiting tactical decryption seed. Feed payload string above to decrypt."
  );
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decryptionRate, setDecryptionRate] = useState<number>(0);

  // Spectrogram bars visualizer
  const [spectrumHeights, setSpectrumHeights] = useState<number[]>(Array.from({ length: 40 }, () => Math.floor(Math.random() * 80 + 10)));

  useEffect(() => {
    const timer = setInterval(() => {
      setSpectrumHeights(Array.from({ length: 40 }, () => {
        const variance = Math.random() > 0.7 ? 40 : 15;
        return Math.min(Math.max(Math.floor(Math.sin(Date.now() * 0.01) * 30 + 50 + (Math.random() * variance - variance/2)), 5), 100);
      }));
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // Quick Cipher Presets
  const cipherPresets = [
    { label: "Interceptor 7G Code", payload: "0x4A65706572735F536563746F7237475F427265616368" },
    { label: "RF Noise Signature Delta", payload: "0x88EEFF_SIGMA9_JAMMER_DETECTED_COORD_3B" },
    { label: "Hangar Badge Logs Tag", payload: "0x12903_BADGE_AUTH_EXCEEDED_LEVEL3" }
  ];

  const handleDecryptPayload = (payload: string) => {
    if (!payload.trim()) return;
    setIsDecrypting(true);
    setDecryptionRate(0);
    
    // Simulate rate countdown
    const decryptionTimer = setInterval(() => {
      setDecryptionRate((prev) => {
        if (prev >= 100) {
          clearInterval(decryptionTimer);
          setIsDecrypting(false);
          
          // Translate payload output based on heuristic patterns
          const p = payload.toLowerCase();
          if (p.includes("7g") || p.includes("4a65")) {
            setDecryptedOutput(
              "[DECRYPT PROTOCOL COMPLETE] \xbb DECLASSIFIED INTEL REPORT\n\nMESSAGE: INTRUSION AT FENCE B GATE IS A DIVERSION; CHIEF ROGUES ATTEMPTING COMPUTER TERMINAL BREACH IN COMPARTMENT 4C AT 04:30 ZULU. BACKUP ROSTER RE-ALIGNMENT REQUIRED IMMEDIATELY."
            );
          } else if (p.includes("3b") || p.includes("88ee")) {
            setDecryptedOutput(
              "[DECRYPT PROTOCOL COMPLETE] \xbb RF SIGNATURE TRANSLATION\n\nMESSAGE: BROAD BAND JAMMING FIELD EMITTING FROM HIGH RISE RADIO GRID LOCATED AT GPS COORDINATES 22.1E, 78.4N. POWER SOURCE IS REMOTE CELL REPLICATOR. DISPATCH PHYSICAL MITIGATION SQUAD (UNIT DELTA-4)."
            );
          } else if (p.includes("badge") || p.includes("12903")) {
            setDecryptedOutput(
              "[DECRYPT PROTOCOL COMPLETE] \xbb SECURE SYSTEM AUTHORIZATION SWEEP\n\nMESSAGE: unauthorized badge scan sequence matches ID pattern of former S.H.I.E.L.D agent decommissioned last semester. Remote override code 'DELTA-SECURE-2026' is approved for immediate compartment lockdowns."
            );
          } else {
            setDecryptedOutput(
              `[DECRYPT COMPLETE] \xbb RECOVERED HEADER BLOCK\n\nMESSAGE: Payload deciphered. Sequence is stable but carries empty tactical value. Source tag: ${payload.substring(0, 16)}... Status is nominal.`
            );
          }
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleCalibrateChannel = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: "CALIBRATING",
            packetQuality: 45
          };
        }
        return c;
      })
    );

    // After 2.5 seconds, set as SECURE with 98% quality
    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return {
              ...c,
              status: "SECURE",
              packetQuality: 96,
              latency: 18
            };
          }
          return c;
        })
      );
    }, 2000);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* Page Title Header */}
      <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-semibold mb-1 animate-pulse">
            Cryptographic Node Calibration
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">
            SECURE DECRYPTION &amp; COMMS MONITOR
          </h2>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400 bg-[#0B1220] border border-slate-800 rounded-lg py-1 px-3">
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          <span>FIPS-140-3 Cryptographic Integrity: <strong>VERIFIED SECURE</strong></span>
        </div>
      </div>

      {/* Grid Left: Comms Spectral Spectrogram & Channel list (7/12 cols) */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        
        {/* Spectral Analyzer Visual Block */}
        <div className="bg-[#0B1220]/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              RF Spectral Spectrogram Visualizer
            </h3>
            <span className="text-[10px] font-mono text-slate-400">REALTIME DECAY DIAGNOSIS OVER LOCAL SPECTRA</span>
          </div>

          {/* Animated Frequency Bars Container */}
          <div className="h-[200px] bg-[#050B14] border border-slate-850 rounded-lg p-5 flex items-end justify-between gap-[3px] relative overflow-hidden">
            {/* Horizontal Threshold alert line */}
            <div className="absolute top-[35%] inset-x-0 h-0.5 border-t border-dashed border-red-500/25 pointer-events-none">
              <span className="absolute right-3 -top-2 text-[8px] font-mono text-red-500 font-semibold">JAM LEVEL THRESHOLD</span>
            </div>
            
            {/* Spectrogram Gridlines */}
            <div className="absolute inset-4 grid grid-rows-4 pointer-events-none border-b border-slate-900/30">
              <div className="border-t border-slate-900/40 text-[8px] font-mono text-slate-700">90dB</div>
              <div className="border-t border-slate-900/40 text-[8px] font-mono text-slate-700">60dB</div>
              <div className="border-t border-slate-900/40 text-[8px] font-mono text-slate-700">30dB</div>
              <div className="border-t border-slate-900/40 text-[8px] font-mono text-slate-700">0dB</div>
            </div>

            {/* Bars */}
            {spectrumHeights.map((height, i) => {
              // Highlight bars red when exceeding jam thresh in Jammed active channel
              const isJamHigh = activeChannel.status === "JAMMED" && i > 12 && i < 24;
              const barColor = isJamHigh 
                ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]" 
                : "bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.2)]";

              return (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t transition-all duration-300 ${barColor}`}
                  style={{ height: `${height}%` }}
                ></div>
              );
            })}
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex justify-between bg-[#050B14] p-2.5 rounded-lg border border-slate-850">
            <span>SPAN: 400MHz - 950MHz</span>
            <span>CURRENT TUNED FREQUENCY: <strong className="text-emerald-400 font-bold">{activeChannel.frequency}</strong></span>
            <span>NOISE COEFFICIENT: <strong className={activeChannel.packetQuality < 60 ? "text-red-400" : "text-emerald-400"}>{(100 - activeChannel.packetQuality).toFixed(0)}%</strong></span>
          </div>
        </div>

        {/* Channels Table Roster log */}
        <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-300 font-bold">TACTICAL RF CHANNEL CALIBRATION</h4>
            <span className="text-[10px] font-mono text-slate-500">SELECT FREQUENCY STAGES</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-semibold">
                  <th className="py-2">Radio Identifier</th>
                  <th className="py-2">Frequency Band</th>
                  <th className="py-2">Quality (Packet)</th>
                  <th className="py-2">Latency</th>
                  <th className="py-2 text-right">Alignment sweep</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/40">
                {channels.map((chan) => {
                  const isActive = activeChannelId === chan.id;
                  let statusBadge = "text-emerald-400 border-emerald-500/20 bg-emerald-950/20";
                  if (chan.status === "JAMMED") statusBadge = "text-red-400 border-red-500/20 bg-red-950/20 animate-pulse";
                  if (chan.status === "FALLBACK") statusBadge = "text-cyan-400 border-cyan-500/20 bg-cyan-950/20";
                  if (chan.status === "CALIBRATING") statusBadge = "text-amber-405 border-amber-500/20 bg-amber-955/20 animate-pulse";

                  return (
                    <tr 
                      key={chan.id} 
                      onClick={() => setActiveChannelId(chan.id)}
                      className={`hover:bg-[#0B1220]/30 transition-colors cursor-pointer ${isActive ? "bg-[#050B14]/80" : ""}`}
                    >
                      <td className="py-2.5 font-bold text-slate-100 flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-800'}`}></span>
                        {chan.name}
                      </td>
                      <td className="py-2.5 text-slate-400">{chan.frequency}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 border text-[10px] rounded ${statusBadge}`}>
                            {chan.packetQuality}% {chan.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-300">{chan.latency}ms</td>
                      <td className="py-2.5 text-right">
                        {chan.status === "JAMMED" || chan.status === "CALIBRATING" ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCalibrateChannel(chan.id);
                            }}
                            className="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-[9px] uppercase cursor-pointer transition-colors"
                          >
                            Recalibrate
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-500">SECURED</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Grid Right: Cryptographic Cipher Decryptor (5/12 cols) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Cryptographic Cipher Decryptor module */}
        <div id="crypto-decryptor" className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-24 bg-emerald-500/5 blur-[50px] pointer-events-none rounded-full"></div>
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h4 className="text-xs uppercase tracking-wider font-mono text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Cryptographic Cipher Decryptor
            </h4>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/25">
              MIL-SPEC RECOVERER
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Directly decipher intercepted payload signals from the field checkpoint sensors or suspicious RF sub-bands using our offline military seed keys.
          </p>

          {/* Cipher presets selectors */}
          <div className="space-y-1.5 font-mono">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Intercepted Cyber Presets</span>
            <div className="flex flex-col gap-2">
              {cipherPresets.map((preset, idx) => (
                <button
                  key={idx}
                  disabled={isDecrypting}
                  onClick={() => {
                    setCrypticInput(preset.payload);
                    handleDecryptPayload(preset.payload);
                  }}
                  className="w-full text-left p-2 border border-slate-800 hover:border-emerald-500/40 bg-[#050B14] hover:bg-[#050B14]/80 text-[10px] text-slate-350 hover:text-white rounded cursor-pointer transition-colors flex justify-between items-center whitespace-nowrap overflow-hidden"
                >
                  <span className="truncate">{preset.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Input field and decrypt button CTA */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase block font-mono">Raw Payload seed</span>
            <div className="flex gap-1.5">
              <input 
                type="text" 
                placeholder="0x4A65706572735F53656374..." 
                value={crypticInput}
                onChange={(e) => setCrypticInput(e.target.value)}
                className="flex-1 bg-[#050B14] border border-slate-800 focus:border-emerald-400 text-xs rounded-lg px-2.5 py-2 text-white font-mono outline-none"
              />
              <button
                onClick={() => handleDecryptPayload(crypticInput)}
                className="px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono rounded-lg text-xs cursor-pointer active:scale-95 transition-all outline-none"
              >
                DECRYPT
              </button>
            </div>
          </div>

          {/* Decryption cleartext output terminal block */}
          <div className="bg-[#050B14] border border-slate-850 p-4 rounded-xl min-h-[140px] max-h-[220px] overflow-y-auto font-mono text-[11px] leading-relaxed relative">
            {isDecrypting && (
              <div className="absolute inset-0 bg-[#050B14]/85 flex flex-col items-center justify-center gap-2 rounded-xl">
                <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-[10px] text-slate-450 tracking-wider">UNPACKING CYPHER MATRIX... {decryptionRate}%</span>
                <div className="w-40 h-1 bg-[#0B1220] rounded overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all" style={{ width: `${decryptionRate}%` }}></div>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-emerald-400 font-bold mb-1.5">
              <span>{isDecrypting ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 animate-bounce" />}</span>
              <span>CLEARTEXT INTEL OUTPUT:</span>
            </div>
            
            <div className="text-slate-350 whitespace-pre-wrap leading-relaxed">
              {decryptedOutput}
            </div>
          </div>

        </div>

        {/* Instruction guidelines panel */}
        <div className="bg-[#0B1220]/60 border border-slate-800 p-5 rounded-xl flex flex-col gap-2 font-mono text-[11px] leading-relaxed text-slate-400 relative">
          <h4 className="text-xs uppercase text-slate-300 font-bold mb-1">
            Standard Operating Protocol (SOP-84)
          </h4>
          <p>
            When a channel is <b>JAMMED</b>, active packet quality drops to beneath 60% and response latency escalates. Officer safety depends on laser fallback transmission link integrity.
          </p>
          <div className="mt-2 text-slate-500">
            * Always execute "Recalibrate" on Jammed stations to attempt baseline RF spectrum alignment automatically.
          </div>
        </div>

      </div>

    </div>
  );
}
