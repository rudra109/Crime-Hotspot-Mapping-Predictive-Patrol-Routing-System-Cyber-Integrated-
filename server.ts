/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const PORT = 3000;
  const app = express();
  
  console.log("[STARTUP] Server initialization - test marker v5");
  console.log("[STARTUP] EXPRESS APP OBJECT:", typeof app);

  // Middleware
  app.use(express.json());
  console.log("[STARTUP] JSON middleware added");

  // API Route for AI Intel Advisor
  app.post("/api/ai/briefing", async (req, res) => {
    const { prompt, context } = req.body;
    
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
      return res.json({
        success: true,
        response: mockAILiaisonResponse(prompt, context),
        isMock: true
      });
    }

    try {
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
        response: `[ERROR] Secure connection to Aegis AI Core was interrupted.\n\n${mockAILiaisonResponse(prompt, context)}`,
        isMock: true,
        error: error.message
      });
    }
  });

  // AI status endpoint
  app.get("/api/ai/status", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    const isConfigured = !!key && key !== "MY_GEMINI_API_KEY" && key !== "";
    res.json({ isConfigured });
  });

  // Test root handler FIRST
  console.log("[STARTUP] About to register GET / handler");
  app.get("/", (req, res) => {
    console.log("[TEST] GET / handler called");
    res.send("<h1>Test Root Handler</h1>");
  });
  console.log("[STARTUP] GET / handler registered");

  // Development: Use Vite directly without middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEBUG] Creating Vite server in SSR mode");
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.js"),
      server: { middlewareMode: false },
    });
    
    // FOR NOW: Skip Vite middleware to test if routes work
    // app.use(vite.middlewares);
    
    // Handle all other requests by serving index.html
    app.use("*", async (req, res, next) => {
      try {
        console.log(`[DEBUG] SPA fallback for: ${req.url}`);
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        
        template = await vite.transformIndexHtml(req.url, template);
        
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        console.error("[ERROR] Error in index.html transformation:", e);
        res.status(500).end(e.message);
      }
    });
  } else {
    // Production: Serve static files
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // SPA fallback
    app.use("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Aegis Server] Running on http://localhost:${PORT}`);
    console.log(`[DEBUG] Routes registered: ${app._router.stack.filter((r: any) => r.route).length}`);
    console.log(`[DEBUG] Middlewares registered: ${app._router.stack.length}`);
  });
}

// Fallback AI response generator
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

  if (query.includes("signal") || query.includes("jamming") || query.includes("comms")) {
    return `[AEGIS COMMS SYSTEM DIAGNOSTICS]
STATUS: SIGNAL DEGRADATION (45% Loss)
AFFECTED FREQUENCY: channel Sigma-9

DEPLOYED COUNTERMEASURE:
1. Automated communication channels transitioned to encrypted infrared laser links.
2. Unit Delta-4 has been dispatched for interference source location.
3. Recommend physical inspection of Comms Relay Tower 4.`;
  }

  if (query.includes("route") || query.includes("plan")) {
    return `[AEGIS ROUTE OPTIMIZATION PROTOCOL]
AFFECTED UNIT: Unit Bravo-2 (Location: Sector 4C)
RECOMMENDED ADJUSTMENT: Shift patrol grid 15% west.

BENEFIT PROFILE:
- Incident response latency reduced from 4.2m to 2.9m.
- Patrol overlap coverage optimized (Integrity: 92%).`;
  }

  return `[AEGIS INTEL ASSISTANCE]
Tactical query received. System operational.
Core systems functioning within permissible tolerances.`;
}

startServer().catch((err) => {
  console.error("[ERROR] Failed to start server:", err);
  process.exit(1);
});
