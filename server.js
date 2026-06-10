import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const SRC_DIR = path.join(__dirname, "src");

const app = express();
app.use(express.json());

function resolveSourceFile(requestPath) {
  const relativePath = requestPath.replace(/^\/+/, "");
  const directPath = path.join(__dirname, relativePath);

  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  const candidates = [];
  if (!path.extname(directPath)) {
    candidates.push(`${directPath}.ts`, `${directPath}.tsx`, `${directPath}.js`, `${directPath}.jsx`, path.join(directPath, "index.ts"), path.join(directPath, "index.tsx"), path.join(directPath, "index.js"), path.join(directPath, "index.jsx"));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function transpileSource(code, fileName) {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowJs: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName,
  });

  return result.outputText;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/ai/briefing", async (req, res) => {
  const { prompt, context } = req.body;
  const key = process.env.GEMINI_API_KEY;

  if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
    return res.json({
      success: true,
      response: mockAILiaisonResponse(prompt, context),
      isMock: true,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Context:\n${JSON.stringify(context)}\n\nUser Request: ${prompt}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          "You are the Aegis Systems Tactical Command Intelligence AI (AI Liaison-9). Respond in a formal, concise tactical console format.",
        temperature: 0.4,
        maxOutputTokens: 350,
      },
    });

    res.json({
      success: true,
      response: response.text || "Empty response from Aegis AI core.",
      isMock: false,
    });
  } catch (error) {
    res.json({
      success: true,
      response: `[ERROR] Secure connection to Aegis AI Core was interrupted.\n\n${mockAILiaisonResponse(prompt, context)}`,
      isMock: true,
      error: error?.message || String(error),
    });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/src/*", (req, res) => {
  const sourceFile = resolveSourceFile(req.path);
  if (!sourceFile) {
    return res.status(404).send("Source file not found");
  }

  const ext = path.extname(sourceFile);
  if (ext === ".css") {
    return res.type("text/css").sendFile(sourceFile);
  }

  const source = fs.readFileSync(sourceFile, "utf-8");
  const output = transpileSource(source, sourceFile);
  res.type("application/javascript").send(output);
});

app.use(express.static(__dirname));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Frontend] Running on http://localhost:${PORT}`);
});

function mockAILiaisonResponse(prompt, context) {
  const query = String(prompt || "").toLowerCase();

  if (query.includes("risk") || query.includes("sector 7g") || query.includes("gate")) {
    return "[AEGIS TACTICAL INTEL - CONSOLE REPORT]\nSTATUS: ELEVATED THREAT (94%)";
  }

  if (query.includes("signal") || query.includes("jamming") || query.includes("comms")) {
    return "[AEGIS COMMS SYSTEM DIAGNOSTICS]\nSTATUS: SIGNAL DEGRADATION (45% Loss)";
  }

  if (query.includes("route") || query.includes("plan")) {
    return "[AEGIS ROUTE OPTIMIZATION PROTOCOL]\nAFFECTED UNIT: Unit Bravo-2";
  }

  return "[AEGIS INTEL ASSISTANCE]\nSystem operational.";
}
