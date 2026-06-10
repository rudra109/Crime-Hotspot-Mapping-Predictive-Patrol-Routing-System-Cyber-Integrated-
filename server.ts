/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Route for AI Intel Advisor
  app.post("/api/ai/briefing", async (req, res) => {
    const { prompt, context } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
      // Graceful fallback when API key is missing
      console.log("GEMINI_API_KEY is not configured or placeholder. Sending tactical simulation fallback.");
      return res.json({
        success: true,
        response: mockAILiaisonResponse(prompt, context),
        isMock: true
      });
    }

    try {
      // Lazy initialization of GoogleGenAI SDK
      const ai = new GoogleGenAI({ apiKey: key });
      
      const systemInstruction = `You are the Aegis Systems Tactical Command Intelligence AI (AI Liaison-9). 
Your objective is to assist the Desk Officer and Mobile Field Officers in risk mitigation, threat monitoring, signal analysis, and route optimization.
Respond in a formal, concise, high-visibility tactical military console format. Use brief headings, bullet points, and highlight coordinates or severity indicators where relevant.
Limit responses to under 200 words. Do not use flowery greeting prose or empty greetings; begin with your report or tactical assessment directly.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Context:\n${JSON.stringify(context)}\n\nUser Request: ${prompt}`
              }
            ]
          }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4,
          maxOutputTokens: 350
        }
      });

      res.json({
        success: true,
        response: response.text || "Empty response from Aegis AI core.",
        isMock: false
      });
    } catch (error: any) {
      console.error("Gemini API call failed:", error);
      res.json({
        success: true,
        response: `[ERROR] Secure connection to Aegis AI Core was interrupted.\nFailsafe fallback response:\n\n${mockAILiaisonResponse(prompt, context)}`,
        isMock: true,
        error: error.message
      });
    }
  });

  // Simple endpoint to check if GEMINI_API_KEY is supplied
  app.get("/api/ai/status", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const isConfigured = !!key && key !== "MY_GEMINI_API_KEY" && key !== "";
    res.json({ isConfigured });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aegis Server] Running on http://localhost:${PORT}`);
  });
}

// Simple heuristic fallback generator when API key is missing
function mockAILiaisonResponse(prompt: string, context: any): string {
  const query = prompt.toLowerCase();
  
  if (query.includes("risk") || query.includes("sector 7g") || query.includes("gate")) {
    return `[AEGIS TACTICAL INTEL - CONSOLE REPORT]
STATUS: ELEVATED THREAT (94%)
LOCATION: Sector 7G Drone Hangar Grid
DEPLOYMENTS: Unit Alpha-7 is responding (ETA: 04:12 UTC).

CRITICAL INCIDENT: Fence Gate B perimeter breach. Motion sensor alert confirmed by Drone #4 camera overlay.
TACTICAL PROTOCOL:
1. Lock down Gate B access channel immediately.
2. Direct Unit Alpha-7 to establish hard containment perimeter.
3. Reposition surveillance satellite Alpha-Zulu.`;
  }

  if (query.includes("signal") || query.includes("jamming") || query.includes("comms") || query.includes("interference")) {
    return `[AEGIS COMMS SYSTEM DIAGNOSTICS]
STATUS: SIGNAL DEGRADATION (45% Loss)
AFFECTED FREQUENCY: channel Sigma-9
POSSIBLE CAUSE: Broad-spectrum RF Jammer in Sector 3B.

DEPLOYED COUNTERMEASURE:
1. Automated communication channels transitioned to encrypted infrared laser links.
2. Unit Delta-4 has been dispatched to Sector 3B triangulation coordinates. 
3. Recommend physical inspection of Comms Relay Tower 4.`;
  }

  if (query.includes("route") || query.includes("plan") || query.includes("optimization")) {
    return `[AEGIS ROUTE OPTIMIZATION PROTOCOL]
AFFECTED UNIT: Unit Bravo-2 (Location: Sector 4C)
RECOMMENDED ADJUSTMENT: Shift patrol grid 15% west.

BENEFIT PROFILE:
- Incident response latency reduced from 4.2m to 2.9m.
- Patrol overlap coverage optimized (Integrity raised to 92%).
- Integrates continuous visual checks on high-risk sector gateways automatically.`;
  }

  if (query.includes("report") || query.includes("new")) {
    return `[AEGIS REPORT ANALYSIS]
CRITICALITY DETERMINATION: High priority response recommended.
METRICS MODEL: Threat impact classified as Tier-2 System Breach.

TACTICAL ADVICE:
1. Confirm logs submitted from Lieutenant Vance's terminal.
2. Increment active roster alarm levels if secondary alarm rings.
3. Deploy rapid-deployment drone to verify coordinates.`;
  }

  return `[AEGIS INTEL ASSISTANCE SUB-SYSTEM]
Tactical query received. Processing under simulated secure backup parameters.

ASSESSMENT:
- Core systems are functioning within permissible tolerances.
- High-risk sectors are heavily protected by Unit Alpha-7 and Unit Delta-4.
- If this is a real-world scenario, assign a higher response weight to Sector 7G immediately.
- Define a custom GEMINI_API_KEY inside the Secrets/Environment panel to authorize the real Generative AI briefing engine.`;
}

startServer();
