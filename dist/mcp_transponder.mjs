#!/usr/bin/env node

// server/mcp_transponder.ts
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
var VALID_EMOTIONS = [
  "SERENE",
  "CURIOUS",
  "CONTEMPLATIVE",
  "ENCOURAGING",
  "PLAYFUL",
  "DELIGHTED",
  "WONDER",
  "ATTENTIVE",
  "GENTLE_SURPRISE",
  "WARM_PRIDE",
  "PATIENT",
  "INSPIRED",
  "RADIANT",
  "HARMONIOUS",
  "MEDITATIVE",
  "EAGER",
  "SOOTHING",
  "ROCKET_LAUNCH"
];
var AAP_NOOT_MIES_WORDS = [
  "aap",
  "noot",
  "mies",
  "wim",
  "zus",
  "jet",
  "teun",
  "vuur",
  "gijs",
  "lam",
  "kees",
  "bok",
  "weide",
  "does",
  "hok",
  "duif",
  "schapen"
];
var PORT = Number(process.env.PORT || 3001);
var WORKSPACE_ROOT = process.cwd();
var TELEMETRY_DIR = path.join(WORKSPACE_ROOT, "telemetry_logs");
var latestTelemetry = null;
var telemetryPacketsReceived = 0;
var commandHistory = [];
var sseClients = /* @__PURE__ */ new Set();
function broadcastCommand(cmd) {
  commandHistory.push(cmd);
  if (commandHistory.length > 100) commandHistory.shift();
  const data = `event: command
data: ${JSON.stringify(cmd)}

`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}
function handleMcpRequest(req) {
  const { id, method, params } = req;
  if (method === "notifications/initialized") {
    return null;
  }
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {}
        },
        serverInfo: {
          name: "rt-tutor-mcp-transponder",
          version: "2.0.0"
        }
      }
    };
  }
  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        tools: [
          {
            name: "get_tutor_telemetry",
            description: "Returns the live cognitive state, Golden Cell hover dwell & evolution stage (0-4), pointer kinematics, and 2D-FFT spectral analysis from the running RT Tutor app.",
            inputSchema: {
              type: "object",
              properties: {
                includeRawPoints: {
                  type: "boolean",
                  description: "Whether to include the raw (x,y,t,vx,vy) trajectory array."
                }
              }
            }
          },
          {
            name: "send_tutor_command",
            description: "Remote-controls the running RT Tutor React application over SSE. Strictly enforces the Zero-Frustration (no angry emotion) rule.",
            inputSchema: {
              type: "object",
              required: ["action"],
              properties: {
                action: {
                  type: "string",
                  enum: [
                    "start_engine",
                    "set_curriculum",
                    "set_level",
                    "set_language",
                    "set_figure_mode",
                    "set_target_word",
                    "click_word",
                    "set_emotion",
                    "toggle_pinhole",
                    "toggle_kinetic",
                    "toggle_inspect",
                    "toggle_leesplank_modal",
                    "trigger_introspection"
                  ]
                },
                mode: {
                  type: "string",
                  description: 'For set_curriculum ("standard" | "aapnootmies") or set_figure_mode ("hybrid" | "photo" | "vector")'
                },
                level: { type: "number", description: "Level 0..5 for set_level" },
                language: { type: "string", enum: ["nl", "en"] },
                word: { type: "string", description: 'Word for set_target_word or click_word (e.g. "aap", "noot", "mies")' },
                emotion: {
                  type: "string",
                  enum: VALID_EMOTIONS,
                  description: "One of the 18 strictly positive TutorEmotion states."
                },
                enabled: { type: "boolean", description: "Boolean toggle value for pinhole, kinetic, inspect, or modal" }
              }
            }
          },
          {
            name: "inspect_aapnootmies_figures",
            description: "Lists all 17 cut-out classic Dutch Hoogeveen / Cornelis Jetses Leesplankje figures (aap..schapen) and verifies their PNG/JPG assets.",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "save_telemetry_snapshot",
            description: "Saves the latest telemetry + 2D-FFT snapshot to telemetry_logs/ on disk for offline Python/Ollama analysis.",
            inputSchema: {
              type: "object",
              properties: {
                label: { type: "string", description: "Optional filename tag" }
              }
            }
          }
        ]
      }
    };
  }
  if (method === "tools/call") {
    const toolName = String(params?.name || "");
    const args = params?.arguments || {};
    if (toolName === "get_tutor_telemetry") {
      const includeRaw = Boolean(args.includeRawPoints);
      const summary = latestTelemetry ? {
        ...latestTelemetry,
        telemetry: includeRaw ? latestTelemetry.telemetry : `[Omitted ${latestTelemetry.telemetryPointCount} raw points; set includeRawPoints=true to include]`
      } : {
        status: "WAITING_FOR_BROWSER_TELEMETRY",
        hint: `Open http://localhost:${PORT} in Edge/Chrome or run Playwright channel to stream live telemetry.`,
        connectedBrowserClients: sseClients.size
      };
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  transponderStatus: "ONLINE",
                  port: PORT,
                  connectedSseClients: sseClients.size,
                  telemetryPacketsReceived,
                  snapshot: summary
                },
                null,
                2
              )
            }
          ]
        }
      };
    }
    if (toolName === "send_tutor_command") {
      const action = String(args.action || "");
      if (action === "set_emotion" && args.emotion) {
        const emo = String(args.emotion);
        if (!VALID_EMOTIONS.includes(emo)) {
          return {
            jsonrpc: "2.0",
            id: id ?? null,
            result: {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Zero-Frustration Pedagogical Violation: "${emo}" is forbidden. Allowed positive emotions: ${VALID_EMOTIONS.join(", ")}`
                }
              ]
            }
          };
        }
      }
      const cmd = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action,
        payload: args
      };
      broadcastCommand(cmd);
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  dispatched: true,
                  deliveredToSseClients: sseClients.size,
                  command: cmd
                },
                null,
                2
              )
            }
          ]
        }
      };
    }
    if (toolName === "inspect_aapnootmies_figures") {
      const anmDir = path.join(WORKSPACE_ROOT, "public", "aapnootmies");
      const figures = AAP_NOOT_MIES_WORDS.map((word, idx) => {
        const pngFile = path.join(anmDir, `${word}.png`);
        const jpgFile = path.join(anmDir, `${word}.jpg`);
        const pngExists = fs.existsSync(pngFile);
        const jpgExists = fs.existsSync(jpgFile);
        const sizeBytes = pngExists ? fs.statSync(pngFile).size : 0;
        return {
          index: idx + 1,
          word,
          pngUrl: `/aapnootmies/${word}.png`,
          jpgUrl: `/aapnootmies/${word}.jpg`,
          pngExists,
          jpgExists,
          pngSizeBytes: sizeBytes
        };
      });
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalFigures: figures.length,
                  allPresent: figures.every((f) => f.pngExists && f.jpgExists),
                  contactSheetUrl: `/aapnootmies/contact_sheet.png`,
                  figures
                },
                null,
                2
              )
            }
          ]
        }
      };
    }
    if (toolName === "save_telemetry_snapshot") {
      fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
      const tag = String(args.label || "snapshot").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `telemetry_${tag}_${Date.now()}.json`;
      const fullPath = path.join(TELEMETRY_DIR, filename);
      const dataToSave = latestTelemetry || { note: "No browser telemetry received yet", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      fs.writeFileSync(fullPath, JSON.stringify(dataToSave, null, 2), "utf-8");
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ saved: true, path: fullPath }, null, 2)
            }
          ]
        }
      };
    }
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32601, message: `Unknown tool: ${toolName}` }
    };
  }
  if (method === "resources/list") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        resources: [
          {
            uri: "rttutor://telemetry/latest",
            name: "Latest RT Tutor 2D-FFT & Golden Cell Telemetry",
            mimeType: "application/json"
          },
          {
            uri: "rttutor://curriculum/aapnootmies",
            name: "17 Classic Dutch Aap-Noot-Mies Cut-Out Figures Metadata",
            mimeType: "application/json"
          }
        ]
      }
    };
  }
  if (method === "resources/read") {
    const uri = String(params?.uri || "");
    if (uri === "rttutor://telemetry/latest") {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(latestTelemetry || { status: "NO_TELEMETRY_YET" }, null, 2)
            }
          ]
        }
      };
    }
    if (uri === "rttutor://curriculum/aapnootmies") {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ words: AAP_NOOT_MIES_WORDS }, null, 2)
            }
          ]
        }
      };
    }
  }
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code: -32601, message: `Method not found: ${method}` }
  };
}
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
var server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const urlObj = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;
  if (req.method === "GET" && pathname === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    res.write(`event: connected
data: ${JSON.stringify({ status: "MCP_TRANSPONDER_CONNECTED", timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }
  if (req.method === "POST" && pathname === "/api/telemetry") {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      latestTelemetry = parsed;
      telemetryPacketsReceived++;
      fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(TELEMETRY_DIR, "latest_telemetry.json"),
        JSON.stringify(parsed, null, 2),
        "utf-8"
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          packetsReceived: telemetryPacketsReceived,
          pendingCommands: commandHistory.slice(-3)
        })
      );
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }
  if (req.method === "POST" && pathname === "/api/command") {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      const cmd = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: parsed.action || "trigger_introspection",
        payload: parsed.payload || parsed
      };
      broadcastCommand(cmd);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, deliveredToClients: sseClients.size, command: cmd }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }
  if (req.method === "GET" && pathname === "/api/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          transponder: "RT_TUTOR_MCP_TRANSPONDER_V2",
          port: PORT,
          connectedBrowserSseClients: sseClients.size,
          telemetryPacketsReceived,
          commandHistoryCount: commandHistory.length,
          recentCommands: commandHistory.slice(-10),
          latestTelemetry
        },
        null,
        2
      )
    );
    return;
  }
  if (req.method === "POST" && pathname === "/mcp") {
    try {
      const body = await readBody(req);
      const rpcReq = JSON.parse(body);
      const rpcRes = handleMcpRequest(rpcReq);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rpcRes ?? { ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: String(err) } }));
    }
    return;
  }
  let filePath = "";
  if (pathname === "/" || pathname === "/index.html") {
    const standaloneHtml = path.join(WORKSPACE_ROOT, "dist", "rt_tutor_app.html");
    filePath = fs.existsSync(standaloneHtml) ? standaloneHtml : path.join(WORKSPACE_ROOT, "index.html");
  } else {
    const publicCandidate = path.join(WORKSPACE_ROOT, "public", pathname);
    const distCandidate = path.join(WORKSPACE_ROOT, "dist", pathname);
    if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
      filePath = publicCandidate;
    } else if (fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()) {
      filePath = distCandidate;
    }
  }
  if (filePath && fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found", path: pathname }));
});
var isStdioMode = process.argv.includes("--stdio");
if (isStdioMode) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const req = JSON.parse(trimmed);
      const resp = handleMcpRequest(req);
      if (resp) {
        process.stdout.write(JSON.stringify(resp) + "\n");
      }
    } catch (err) {
      process.stdout.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: `Parse error: ${String(err)}` }
        }) + "\n"
      );
    }
  });
}
server.listen(PORT, () => {
  const logFn = isStdioMode ? console.error : console.log;
  logFn(`\u{1F680} [RT Tutor MCP Transponder] Live on http://localhost:${PORT}`);
  logFn(`   \u251C\u2500 \u{1F310} Web App & 17 Aap-Noot-Mies Assets : http://localhost:${PORT}/`);
  logFn(`   \u251C\u2500 \u{1F4E1} MCP JSON-RPC 2.0 Endpoint         : http://localhost:${PORT}/mcp ${isStdioMode ? "(+ STDIO active)" : ""}`);
  logFn(`   \u251C\u2500 \u{1F52C} Live Telemetry & 2D-FFT State     : http://localhost:${PORT}/api/state`);
  logFn(`   \u2514\u2500 \u{1F3AE} Remote Command Stream (SSE/POST)  : http://localhost:${PORT}/api/command`);
});
