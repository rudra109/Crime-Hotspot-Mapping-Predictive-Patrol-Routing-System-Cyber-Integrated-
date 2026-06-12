/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, HelpCircle, X, ChevronRight, CornerDownLeft } from "lucide-react";
import { ViewState } from "../types";

interface VoiceAssistantProps {
  onNavigate: (view: ViewState) => void;
  onOptimizeRoutes: () => void;
  onSimulateAlarm: () => void;
  crimesCount: number;
  alertsCount: number;
  unitsCount: number;
}

export default function VoiceAssistant({
  onNavigate,
  onOptimizeRoutes,
  onSimulateAlarm,
  crimesCount,
  alertsCount,
  unitsCount
}: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>("");
  const [responseMsg, setResponseMsg] = useState<string>("");
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setTranscript("Listening...");
        setResponseMsg("");
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processCommand(text);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setTranscript(`Error: ${event.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
      }
    } else {
      setTranscript("Speech recognition not supported in this browser. Use keyboard entry below.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop any active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      setResponseMsg(text);
    } else {
      setResponseMsg(text);
    }
  };

  const processCommand = (cmdText: string) => {
    const cmd = cmdText.toLowerCase().trim();

    // 1. Navigation Commands
    if (cmd.includes("go to map") || cmd.includes("show map") || cmd.includes("open map") || cmd.includes("gis map")) {
      onNavigate("GIS_MAP");
      speak("Navigating to GIS Crime Map.");
    } else if (cmd.includes("go to dashboard") || cmd.includes("show dashboard") || cmd.includes("go to operations") || cmd.includes("show operations")) {
      onNavigate("OPERATIONS");
      speak("Navigating to central command operations dashboard.");
    } else if (cmd.includes("go to surveillance") || cmd.includes("show surveillance") || cmd.includes("go to heatmap") || cmd.includes("show heatmap")) {
      onNavigate("SURVEILLANCE");
      speak("Navigating to surveillance and telemetry heatmap.");
    } else if (cmd.includes("go to analytics") || cmd.includes("show analytics") || cmd.includes("go to intelligence") || cmd.includes("show intelligence")) {
      onNavigate("INTELLIGENCE");
      speak("Navigating to analytics and forecasting dashboard.");
    } else if (cmd.includes("go to security") || cmd.includes("show security") || cmd.includes("go to console") || cmd.includes("open console")) {
      onNavigate("SECURITY_CONSOLE");
      speak("Opening security and data compliance console.");
    } else if (cmd.includes("go to cyber") || cmd.includes("show cyber") || cmd.includes("open cyber")) {
      onNavigate("CYBER_INTEL");
      speak("Opening cybercrime intelligence layer.");
    } else if (cmd.includes("go to decision") || cmd.includes("show decision") || cmd.includes("open decision")) {
      onNavigate("DECISION_SUPPORT");
      speak("Opening decision support simulation planner.");
    } else if (cmd.includes("go to field") || cmd.includes("show field") || cmd.includes("open field") || cmd.includes("go to mobile")) {
      onNavigate("MOBILE_OFFICER");
      speak("Navigating to field PCR officer simulator screen.");
    } else if (cmd.includes("go to audit") || cmd.includes("show audit") || cmd.includes("open audit")) {
      onNavigate("AUDIT_LOGS");
      speak("Opening system audit logs list.");
    } 
    
    // 2. Action Commands
    else if (cmd.includes("optimize routes") || cmd.includes("optimize route") || cmd.includes("align routes")) {
      onOptimizeRoutes();
      speak("Route optimization triggered for PCR patrol units.");
    } else if (cmd.includes("simulate alarm") || cmd.includes("trigger alert") || cmd.includes("simulate crime") || cmd.includes("trigger alarm")) {
      onSimulateAlarm();
      speak("Simulated emergency call incident generated.");
    } 
    
    // 3. Status Check Commands
    else if (cmd.includes("status check") || cmd.includes("check status") || cmd.includes("system status") || cmd.includes("status report")) {
      const speechOutput = `Ahmedabad Police Command Center report: Central communication link is healthy. There are currently ${crimesCount} registered crimes, ${alertsCount} active dispatcher alerts, and ${unitsCount} PCR vehicles on patrol duty.`;
      speak(speechOutput);
    } else {
      speak(`Command not recognized: "${cmdText}". Click help to see allowed voice prompts.`);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    setTranscript(commandInput);
    processCommand(commandInput);
    setCommandInput("");
  };

  return (
    <div className="relative font-sans select-none flex items-center gap-3 bg-[#0B1220]/75 border border-slate-800 p-2.5 rounded-2xl backdrop-blur-xl">
      
      {/* Mic Trigger Button */}
      <div className="relative flex items-center">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`h-9 w-9 rounded-xl flex items-center justify-center cursor-pointer transition-all border ${
            isListening
              ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse"
              : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20"
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Pulsing ring indicator when listening */}
        {isListening && (
          <span className="absolute -inset-1 rounded-2xl bg-red-500/10 border border-red-500/20 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Transcript Info Block */}
      <div className="hidden sm:flex flex-col text-left max-w-xs justify-center leading-none">
        <div className="text-[8px] font-mono tracking-widest text-[#00E5FF] uppercase font-bold flex items-center gap-1.5">
          <Volume2 className="w-3 h-3 text-[#00E5FF]" />
          VOICE COMMAND ASSISTANT
        </div>
        <div className="text-[10px] text-slate-300 font-mono mt-1 font-semibold truncate max-w-[180px]">
          {transcript || 'Click mic to speak command...'}
        </div>
      </div>

      {/* Speech Output Readout Toast */}
      {responseMsg && (
        <div className="absolute right-0 top-14 w-80 bg-[#0B1220]/95 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-xl z-50 animate-fade-in text-xs font-mono flex flex-col gap-2">
          <div className="flex justify-between items-center text-slate-500 text-[9px] font-bold">
            <span>VOICE READOUT RESPONSE:</span>
            <button onClick={() => setResponseMsg("")} className="text-slate-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-slate-200 leading-normal">{responseMsg}</p>
        </div>
      )}

      {/* Manual query keyboard entry input field */}
      <form onSubmit={handleTextSubmit} className="flex items-center gap-1.5 bg-[#050B14] border border-slate-800/80 px-2.5 py-1.5 rounded-xl">
        <input
          type="text"
          placeholder="Type command..."
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          className="bg-transparent text-[10px] placeholder-slate-600 outline-none w-28 text-white font-mono"
        />
        <button type="submit" className="text-slate-400 hover:text-white cursor-pointer">
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </form>

      {/* Help info indicator */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="text-slate-500 hover:text-white cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Voice commands list popup help modal */}
      {showHelp && (
        <div className="absolute right-0 top-14 w-80 bg-[#0B1220] border border-slate-800 p-4 rounded-3xl shadow-2xl backdrop-blur-2xl z-50 text-xs font-mono space-y-3">
          <div className="flex justify-between items-center border-b border-slate-850 pb-2">
            <span className="font-bold text-[#00E5FF] tracking-wider">SUPPORTED COMMANDS</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 text-slate-400 leading-normal text-[10px]">
            <div>
              <b className="text-slate-200 block">Tab Navigation:</b>
              "go to map" · "go to dashboard" · "go to surveillance" · "go to security" · "go to decisions" · "go to cyber" · "go to field"
            </div>
            <div>
              <b className="text-slate-200 block">System Actions:</b>
              "optimize routes" · "simulate alarm"
            </div>
            <div>
              <b className="text-slate-200 block">central telemetry:</b>
              "status check" (system speaks active telemetry count out loud)
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
