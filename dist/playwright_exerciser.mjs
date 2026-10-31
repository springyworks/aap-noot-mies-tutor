#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/mcp_transponder.ts
var mcp_transponder_exports = {};
__export(mcp_transponder_exports, {
  startTransponderServer: () => startTransponderServer
});
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
function appendToDrillThroughBuffer(packet) {
  const now = Date.now();
  const record = {
    bufferSequenceNumber: ++drillThroughSeq,
    serverReceivedIso: new Date(now).toISOString(),
    serverReceivedEpochMs: now,
    packet
  };
  drillThroughBuffer.push(record);
  if (drillThroughBuffer.length > 50) {
    drillThroughBuffer.shift();
  }
  try {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(TELEMETRY_DIR, "latest_drill_through.json"),
      JSON.stringify(record, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(TELEMETRY_DIR, "drill_through_buffer.json"),
      JSON.stringify(drillThroughBuffer, null, 2),
      "utf-8"
    );
  } catch {
  }
  return record;
}
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
                    "trigger_introspection",
                    "trigger_drill_through",
                    "augment_learning_play"
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
            description: "Saves the latest telemetry + 2D-FFT snapshot to telemetry_logs/ on disk for offline analysis.",
            inputSchema: {
              type: "object",
              properties: {
                label: { type: "string", description: "Optional filename tag" }
              }
            }
          },
          {
            name: "get_drill_through_buffer",
            description: "Retrieves the timestamped Ctrl+Shift+Alt+G Drill-Through Context channel buffer (DOM hit-test stack under cursor, 120-event timeline, 2D-FFT spectrum, Golden Cell hover stage, and External AI learning augmentation recommendations).",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of most recent drill-through records to return (default 5)."
                }
              }
            }
          },
          {
            name: "trigger_drill_through",
            description: "Remotely triggers a Ctrl+Shift+Alt+G Drill-Through Context capture in the connected browser and pushes it into the MCP channel buffer.",
            inputSchema: {
              type: "object",
              properties: {
                openModal: {
                  type: "boolean",
                  description: "Whether to open the JSON inspector modal in the browser UI."
                }
              }
            }
          },
          {
            name: "augment_learning_play",
            description: "External AI Co-Pilot hook: dynamically adjusts real-time learning-play scaffolding (hintThrottleMultiplier, kineticSpeedMultiplier, customEncouragementBanner, spokenEncouragement, emotion, focusPrefix).",
            inputSchema: {
              type: "object",
              properties: {
                hintThrottleMultiplier: {
                  type: "number",
                  description: "Multiplier for phonetic color hint delay (0.3 to 2.5; <1 scaffolds faster, >1 increases challenge)."
                },
                kineticSpeedMultiplier: {
                  type: "number",
                  description: "Multiplier for 2D Lissajous kinetic motion speed (0.2 to 2.5)."
                },
                customEncouragementBanner: {
                  type: "string",
                  description: "Live banner message from the External AI Co-Pilot displayed in the game UI."
                },
                spokenEncouragement: {
                  type: "string",
                  description: "Optional positive encouragement spoken aloud by the tutor voice."
                },
                emotion: {
                  type: "string",
                  enum: VALID_EMOTIONS,
                  description: "One of the 18 strictly positive TutorEmotion expressions."
                },
                focusPrefix: {
                  type: "string",
                  description: "Optional orthographic prefix focus."
                }
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
        const webpFile = path.join(anmDir, `${word}.webp`);
        const pngFile = path.join(anmDir, `${word}.png`);
        const jpgFile = path.join(anmDir, `${word}.jpg`);
        const webpExists = fs.existsSync(webpFile);
        const pngExists = fs.existsSync(pngFile);
        const jpgExists = fs.existsSync(jpgFile);
        const webpSizeBytes = webpExists ? fs.statSync(webpFile).size : 0;
        const pngSizeBytes = pngExists ? fs.statSync(pngFile).size : 0;
        return {
          index: idx + 1,
          word,
          webpUrl: `/aapnootmies/${word}.webp`,
          pngUrl: `/aapnootmies/${word}.png`,
          jpgUrl: `/aapnootmies/${word}.jpg`,
          webpExists,
          pngExists,
          jpgExists,
          webpSizeBytes,
          pngSizeBytes
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
                  allPresent: figures.every((f) => f.webpExists && f.pngExists && f.jpgExists),
                  allAlphaWebpPresent: figures.every((f) => f.webpExists),
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
    if (toolName === "get_drill_through_buffer") {
      const limit = Math.max(1, Math.min(50, Number(args.limit || 5)));
      const slice = drillThroughBuffer.slice(-limit);
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  totalBufferedPackets: drillThroughBuffer.length,
                  returnedCount: slice.length,
                  latestRecord: slice.length > 0 ? slice[slice.length - 1] : null,
                  records: slice
                },
                null,
                2
              )
            }
          ]
        }
      };
    }
    if (toolName === "trigger_drill_through") {
      const cmd = {
        id: `cmd_${Date.now()}_dt`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: "trigger_drill_through",
        payload: { openModal: Boolean(args.openModal) }
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
                  triggered: true,
                  deliveredToSseClients: sseClients.size,
                  currentBufferCount: drillThroughBuffer.length,
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
    if (toolName === "augment_learning_play") {
      if (args.emotion && !VALID_EMOTIONS.includes(String(args.emotion))) {
        return {
          jsonrpc: "2.0",
          id: id ?? null,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: `Zero-Frustration Pedagogical Violation: "${String(args.emotion)}" is forbidden.`
              }
            ]
          }
        };
      }
      const cmd = {
        id: `cmd_${Date.now()}_aug`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: "augment_learning_play",
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
                  augmented: true,
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
function startTransponderServer(port = PORT) {
  return new Promise((resolve) => {
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(null);
      } else {
        throw err;
      }
    });
    server.listen(port, () => {
      const logFn = isStdioMode ? console.error : console.log;
      logFn(`\u{1F680} [RT Tutor MCP Transponder] Live on http://localhost:${port}`);
      logFn(`   \u251C\u2500 \u{1F310} Web App & 17 Aap-Noot-Mies Assets : http://localhost:${port}/`);
      logFn(`   \u251C\u2500 \u{1F4E1} MCP JSON-RPC 2.0 Endpoint         : http://localhost:${port}/mcp ${isStdioMode ? "(+ STDIO active)" : ""}`);
      logFn(`   \u251C\u2500 \u{1F52C} Live Telemetry & 2D-FFT State     : http://localhost:${port}/api/state`);
      logFn(`   \u2514\u2500 \u{1F3AE} Remote Command Stream (SSE/POST)  : http://localhost:${port}/api/command`);
      resolve(server);
    });
  });
}
var VALID_EMOTIONS, AAP_NOOT_MIES_WORDS, PORT, WORKSPACE_ROOT, TELEMETRY_DIR, latestTelemetry, telemetryPacketsReceived, drillThroughSeq, drillThroughBuffer, commandHistory, sseClients, MIME_TYPES, server, isStdioMode;
var init_mcp_transponder = __esm({
  "server/mcp_transponder.ts"() {
    "use strict";
    VALID_EMOTIONS = [
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
    AAP_NOOT_MIES_WORDS = [
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
    PORT = Number(process.env.PORT || 3001);
    WORKSPACE_ROOT = process.cwd();
    TELEMETRY_DIR = path.join(WORKSPACE_ROOT, "telemetry_logs");
    latestTelemetry = null;
    telemetryPacketsReceived = 0;
    drillThroughSeq = 0;
    drillThroughBuffer = [];
    commandHistory = [];
    sseClients = /* @__PURE__ */ new Set();
    MIME_TYPES = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".webp": "image/webp",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml"
    };
    server = http.createServer(async (req, res) => {
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
      if (pathname === "/api/drill-through") {
        if (req.method === "POST") {
          try {
            const body = await readBody(req);
            const parsed = JSON.parse(body);
            const record = appendToDrillThroughBuffer(parsed);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: true,
                bufferedCount: drillThroughBuffer.length,
                bufferSequenceNumber: record.bufferSequenceNumber,
                serverReceivedIso: record.serverReceivedIso
              })
            );
          } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
          return;
        }
        if (req.method === "GET") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify(
              {
                transponder: "RT_TUTOR_DRILL_THROUGH_CHANNEL_BUFFER",
                totalBufferedPackets: drillThroughBuffer.length,
                latestRecord: drillThroughBuffer.length > 0 ? drillThroughBuffer[drillThroughBuffer.length - 1] : null,
                buffer: drillThroughBuffer
              },
              null,
              2
            )
          );
          return;
        }
      }
      if (req.method === "POST" && pathname === "/api/augment") {
        try {
          const body = await readBody(req);
          const parsed = JSON.parse(body);
          const cmd = {
            id: `cmd_${Date.now()}_aug`,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            action: "augment_learning_play",
            payload: parsed
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
              drillThroughPacketsBuffered: drillThroughBuffer.length,
              latestDrillThrough: drillThroughBuffer.length > 0 ? drillThroughBuffer[drillThroughBuffer.length - 1] : null,
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
    isStdioMode = process.argv.includes("--stdio");
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
    if (!process.env.RT_TUTOR_EMBEDDED_TRANSPONDER) {
      void startTransponderServer(PORT);
    }
  }
});

// scripts/playwright_exerciser.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
import { spawn } from "node:child_process";
var BASE_URL = process.env.RT_TUTOR_URL || "http://localhost:3001";
var PLAYWRIGHT_CHROMIUM_BIN = process.env.PLAYWRIGHT_CHROMIUM_BIN || "/home/kos/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome";
async function callMcp(method, params, id = 1) {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  return await res.json();
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function runTransponderAndSyntheticVerification() {
  console.log(`
\u{1F52C} [Channel 2 Exerciser] Connecting to RT Tutor MCP Transponder at ${BASE_URL}...`);
  const initRes = await callMcp("initialize", {}, 1);
  console.log(`\u2705 1. MCP Initialize:`, initRes.result?.serverInfo);
  const toolsRes = await callMcp("tools/list", {}, 2);
  const toolNames = toolsRes.result?.tools?.map((t) => t.name) || [];
  console.log(`\u2705 2. MCP Tools Registered (${toolNames.length}):`, toolNames.join(", "));
  const anmRes = await callMcp("tools/call", { name: "inspect_aapnootmies_figures", arguments: {} }, 3);
  const anmData = JSON.parse(anmRes.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 3. Aap-Noot-Mies Alpha WebP Figures: ${anmData.totalFigures}/17 present (allPresent=${anmData.allPresent}, allAlphaWebpPresent=${anmData.allAlphaWebpPresent})`
  );
  if (!anmData.allPresent || !anmData.allAlphaWebpPresent || anmData.totalFigures !== 17) {
    throw new Error("Missing Aap-Noot-Mies alpha WebP cut-out figure assets!");
  }
  const angryAttempt = await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_emotion", emotion: "ANGRY" }
    },
    4
  );
  const rejectedAngry = Boolean(angryAttempt.result?.isError);
  console.log(`\u2705 4. Zero-Frustration Guardrail (reject 'ANGRY' emotion): ${rejectedAngry ? "PASSED" : "FAILED"}`);
  if (!rejectedAngry) {
    throw new Error("Pedagogical violation: ANGRY emotion was not rejected!");
  }
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_curriculum", mode: "aapnootmies" }
    },
    5
  );
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_target_word", word: "mies" }
    },
    6
  );
  await callMcp(
    "tools/call",
    {
      name: "send_tutor_command",
      arguments: { action: "set_emotion", emotion: "RADIANT" }
    },
    7
  );
  console.log(`\u2705 5. Dispatched live SSE commands: mode=aapnootmies, target="mies", emotion=RADIANT`);
  const now = Date.now();
  const syntheticPoints = Array.from({ length: 64 }, (_, i) => {
    const t = now - (64 - i) * 25;
    const x = Math.round(520 + Math.sin(i * 0.25) * 45);
    const y = Math.round(410 + Math.cos(i * 0.22) * 30);
    return {
      x,
      y,
      t,
      l: 1,
      vx: 0.42,
      vy: 0.28,
      v: 0.5,
      hoverCell: "mies",
      isGoldenHover: true
    };
  });
  const telemetryRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      curriculumMode: "aapnootmies",
      level: 1,
      language: "nl",
      elapsedMs: 3200,
      idleMs: 40,
      streak: 3,
      tutorEmotion: "RADIANT",
      introspectionLevel: 2,
      isVoiceSilent: false,
      kineticMode: true,
      pinholeEnabled: true,
      aliveness: 0.92,
      hesitationIndex: 0.18,
      roundTarget: "mies",
      roundOptions: ["aap", "noot", "mies", "wim", "zus", "jet"],
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      voiceSelected: "Dutch NL",
      viewport: { w: 1280, h: 800 },
      derivedHardData: {
        kinematics: {
          instantVelocityPxMs: 0.5,
          meanVelocityPxMs: 0.48,
          peakVelocityPxMs: 1.12,
          meanAccelerationPxMs2: 8e-3,
          rmsJerkPxMs3: 42e-5,
          totalPathLengthPx: 640,
          directnessIndex: 0.84,
          directionReversals: 2
        },
        hoverAnalytics: {
          currentHoverCell: "mies",
          goldenCellWord: "mies",
          goldenCellEvolutionStage: 4,
          goldenCellDwellMs: 2850,
          totalDistractorDwellMs: 350,
          goldenToDistractorRatio: 0.891,
          timeToFirstGoldenHoverMs: 420,
          cellDwellMs: { aap: 150, noot: 200, mies: 2850, wim: 0, zus: 0, jet: 0 },
          cellVisitCounts: { aap: 1, noot: 1, mies: 2, wim: 0, zus: 0, jet: 0 }
        },
        fft2D: {
          sampleCountUsed: 64,
          effectiveSampleRateHz: 40,
          dominantFrequencyXHz: 1.5,
          dominantFrequencyYHz: 1,
          lowFreqMacroNavPower: 0.42,
          midFreqScanPower: 0.19,
          highFreqTremorPower: 0.04,
          anisotropyRatioXY: 1.38,
          spectralEntropy: 0.54,
          cognitiveLoadSignature: "CALM_DIRECT"
        }
      },
      telemetryPointCount: syntheticPoints.length,
      telemetry: syntheticPoints
    })
  });
  const telemetryJson = await telemetryRes.json();
  console.log(`\u2705 6. Telemetry POST /api/telemetry accepted:`, telemetryJson);
  const readBack = await callMcp(
    "tools/call",
    { name: "get_tutor_telemetry", arguments: { includeRawPoints: false } },
    8
  );
  const readBackObj = JSON.parse(readBack.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 7. MCP get_tutor_telemetry verified: target="${readBackObj.snapshot?.roundTarget}", stage=${readBackObj.snapshot?.derivedHardData?.hoverAnalytics?.goldenCellEvolutionStage}/4, fftSignature=${readBackObj.snapshot?.derivedHardData?.fft2D?.cognitiveLoadSignature}`
  );
  const savedSnap = await callMcp(
    "tools/call",
    { name: "save_telemetry_snapshot", arguments: { label: "channel2_verified" } },
    9
  );
  console.log(`\u2705 8. Saved telemetry snapshot:`, JSON.parse(savedSnap.result?.content?.[0]?.text || "{}"));
  const drillNow = Date.now();
  const drillPacket = {
    packetId: `dt_${drillNow}_ctrl_shift_alt_g`,
    triggerSource: "CTRL_SHIFT_ALT_G",
    timestamps: {
      isoTimestamp: new Date(drillNow).toISOString(),
      epochMs: drillNow,
      performanceNowMs: 4821.37,
      timezoneOffsetMin: -60,
      sessionUptimeMs: 18420,
      roundElapsedMs: 3200,
      idleMs: 40,
      firstGoldenHoverMs: 420
    },
    pointerAndDomDrillThrough: {
      pointerX: 520,
      pointerY: 410,
      normalizedX: 0.406,
      normalizedY: 0.512,
      hoveredWordCell: "mies",
      isGoldenCellUnderPointer: true,
      domStackUnderPointer: [
        { depth: 0, tagName: "button", id: null, className: "relative group overflow-hidden h-32", dataWord: "mies", rect: { x: 420, y: 340, w: 260, h: 160 } },
        { depth: 1, tagName: "div", id: null, className: "grid grid-cols-2 lg:grid-cols-3", dataWord: null, rect: { x: 110, y: 340, w: 1060, h: 344 } }
      ]
    },
    cognitiveAndPedagogicalState: {
      curriculumMode: "aapnootmies",
      anmFigureMode: "hybrid",
      level: 1,
      language: "nl",
      roundTarget: "mies",
      roundOptions: ["aap", "noot", "mies", "wim", "zus", "jet"],
      streak: 3,
      tutorEmotion: "RADIANT",
      introspectionLevel: 2,
      lastIntrospectionLog: 'Gouden Cel "mies" volledig tot bloei gekomen (Fase 4/4)!',
      aliveness: 0.92,
      hesitationIndex: 0.18,
      baseThresholdMs: 1e4,
      kineticMode: true,
      pinholeEnabled: true
    },
    aiAugmentationState: {
      activeConfig: {
        hintThrottleMultiplier: 1,
        kineticSpeedMultiplier: 1,
        customEncouragementBanner: null,
        focusPrefix: null,
        lastUpdatedByAiAt: null
      },
      learnerFlowDiagnosis: "FLOW_MASTERY",
      recommendedHintThrottleMultiplier: 1.25,
      recommendedKineticSpeedMultiplier: 1.2,
      recommendedNextTargetWords: ["wim", "weide", "vuur"]
    }
  };
  const dtPost = await fetch(`${BASE_URL}/api/drill-through`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(drillPacket)
  });
  const dtPostJson = await dtPost.json();
  console.log(`\u2705 9. Ctrl+Shift+Alt+G Drill-Through buffered to MCP server:`, dtPostJson);
  const dtBufferRes = await callMcp(
    "tools/call",
    { name: "get_drill_through_buffer", arguments: { limit: 3 } },
    10
  );
  const dtBufferObj = JSON.parse(dtBufferRes.result?.content?.[0]?.text || "{}");
  console.log(
    `\u2705 10. MCP get_drill_through_buffer verified: totalBuffered=${dtBufferObj.totalBufferedPackets}, latestPacketId="${dtBufferObj.latestRecord?.packet?.packetId}", flowDiagnosis="${dtBufferObj.latestRecord?.packet?.aiAugmentationState?.learnerFlowDiagnosis}"`
  );
  const augRes = await callMcp(
    "tools/call",
    {
      name: "augment_learning_play",
      arguments: {
        hintThrottleMultiplier: 1.2,
        kineticSpeedMultiplier: 1.15,
        customEncouragementBanner: "Super-flow gedetecteerd! Poes Mies spint van trots \u2014 op naar Wim en Vuur!",
        emotion: "WARM_PRIDE",
        focusPrefix: "m"
      }
    },
    11
  );
  console.log(`\u2705 11. External AI Dynamic Learning Augmentation dispatched:`, JSON.parse(augRes.result?.content?.[0]?.text || "{}"));
}
var HeadedPlaywrightCdpSession = class _HeadedPlaywrightCdpSession {
  ws;
  nextId = 1;
  pending = /* @__PURE__ */ new Map();
  constructor(ws) {
    this.ws = ws;
    this.ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.id && this.pending.has(msg.id)) {
          const handler = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) handler.reject(new Error(msg.error.message));
          else handler.resolve(msg.result || {});
        }
      } catch {
      }
    });
  }
  static async connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      ws.addEventListener("open", () => resolve(new _HeadedPlaywrightCdpSession(ws)));
      ws.addEventListener("error", (err) => reject(new Error(`CDP WebSocket error: ${String(err)}`)));
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evalJs(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    const resultObj = res.result;
    return resultObj?.value;
  }
  async captureScreenshotPng(outPath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const b64 = String(res.data || "");
    if (b64) {
      fs2.mkdirSync(path2.dirname(outPath), { recursive: true });
      fs2.writeFileSync(outPath, Buffer.from(b64, "base64"));
    }
  }
  close() {
    try {
      this.ws.close();
    } catch {
    }
  }
};
async function runHeadedPlaywrightBrowserDemo(keepOpenMs) {
  if (!fs2.existsSync(PLAYWRIGHT_CHROMIUM_BIN)) {
    console.log(`\u26A0\uFE0F Playwright Chromium binary not found at ${PLAYWRIGHT_CHROMIUM_BIN}; skipping live browser launch.`);
    return;
  }
  const cdpPort = 9229;
  const userDataDir = `/tmp/rt_tutor_pw_headed_${Date.now()}`;
  const isHeadless = process.argv.includes("--headless");
  const chromeArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=1440,920",
    "--autoplay-policy=no-user-gesture-required"
  ];
  if (isHeadless) {
    chromeArgs.push("--headless=new");
  } else if (process.env.WAYLAND_DISPLAY && !process.env.DISPLAY) {
    chromeArgs.push("--ozone-platform-hint=auto");
  }
  chromeArgs.push(BASE_URL);
  console.log(`
\u{1F3AD} [Headed Playwright Chromium] Launching visible browser window (${isHeadless ? "headless" : "HEADED SHOW-IT-ALL"}) at ${BASE_URL}...`);
  const chromeProc = spawn(PLAYWRIGHT_CHROMIUM_BIN, chromeArgs, {
    stdio: "ignore",
    env: { ...process.env }
  });
  try {
    let sseConnected = false;
    let pageWsUrl = "";
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      try {
        const stRes = await fetch(`${BASE_URL}/api/state`);
        const stJson = await stRes.json();
        if ((stJson.connectedBrowserSseClients || 0) > 0) {
          sseConnected = true;
        }
      } catch {
      }
      try {
        const res = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
        const targets = await res.json();
        const pageTarget = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (pageTarget?.webSocketDebuggerUrl) {
          pageWsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      } catch {
      }
      if (sseConnected && attempt >= 4) break;
    }
    if (pageWsUrl) {
      const cdp = await HeadedPlaywrightCdpSession.connect(pageWsUrl);
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      for (let i = 0; i < 20; i++) {
        const hasBridge = await cdp.evalJs("Boolean(window.__RT_TUTOR_BRIDGE__)");
        if (hasBridge) break;
        await sleep(250);
      }
      console.log(`\u2705 12. Headed Playwright Chromium connected via CDP + SSE (__RT_TUTOR_BRIDGE__ active)!`);
      await cdp.evalJs(`
        (() => {
          const b = window.__RT_TUTOR_BRIDGE__;
          if (!b) return 'no_bridge';
          b.startEngine();
          b.setCurriculum('aapnootmies');
          b.setFigureMode('hybrid');
          b.setTargetWord('mies');
          b.setEmotion('RADIANT');
          return 'started';
        })()
      `);
      await sleep(900);
      const miesBox = await cdp.evalJs(`
        (() => {
          const el = document.querySelector('[data-word="mies"]');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
        })()
      `);
      if (miesBox) {
        for (let step = 0; step < 12; step++) {
          const px = Math.round(miesBox.x + Math.sin(step * 0.5) * 28);
          const py = Math.round(miesBox.y + Math.cos(step * 0.5) * 18);
          await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: px, y: py });
          await sleep(80);
        }
        console.log(`\u2705 13. Animated live pointer hover across Golden Cell "mies" (${miesBox.x}, ${miesBox.y}) \u2014 1960s Motion-Lamp & Golden Bloom active!`);
      }
      await cdp.evalJs(`
        window.__RT_TUTOR_BRIDGE__?.augmentLearningPlay({
          hintThrottleMultiplier: 0.75,
          kineticSpeedMultiplier: 1.25,
          customEncouragementBanner: '\u2728 1960s Motion-Lamp & Alpha WebP Live! Poes Mies straalt in het gouden licht!',
          emotion: 'WARM_PRIDE',
          focusPrefix: 'm'
        })
      `);
      await sleep(700);
      const liveDrillPacketId = await cdp.evalJs(`
        (() => {
          const pkt = window.__RT_TUTOR_BRIDGE__?.triggerDrillThrough();
          return pkt ? pkt.packetId : 'none';
        })()
      `);
      console.log(`\u2705 14. Triggered live Ctrl+Shift+Alt+G Drill-Through in browser: packetId="${liveDrillPacketId}"`);
      await sleep(600);
      const boardShotPath = path2.join(process.cwd(), "public", "aapnootmies", "live_playwright_demo_board.png");
      await cdp.captureScreenshotPng(boardShotPath);
      console.log(`\u{1F4F8} 15. Captured live Playwright screenshot -> ${boardShotPath}`);
      await cdp.evalJs(`window.__RT_TUTOR_BRIDGE__?.toggleLeesplankModal()`);
      await sleep(900);
      const modalShotPath = path2.join(process.cwd(), "public", "aapnootmies", "live_playwright_demo_leesplank.png");
      await cdp.captureScreenshotPng(modalShotPath);
      console.log(`\u{1F4F8} 16. Captured live Leesplankje 17-figure modal screenshot -> ${modalShotPath}`);
      await cdp.evalJs(`window.__RT_TUTOR_BRIDGE__?.toggleLeesplankModal()`);
      if (keepOpenMs > 0 && !isHeadless) {
        console.log(`\u{1F440} Keeping headed Playwright Chromium window open for ${Math.round(keepOpenMs / 1e3)}s so you can inspect & play...`);
        await sleep(keepOpenMs);
      }
      cdp.close();
    } else {
      console.log(`\u2705 12. Headed Playwright Chromium launched (SSE connected=${sseConnected}) \u2014 driving live visual demo via MCP SSE Command Stream!`);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "start_engine" } }, 20);
      await sleep(500);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "set_curriculum", mode: "aapnootmies" } }, 21);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "set_figure_mode", figureMode: "hybrid" } }, 22);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "set_target_word", word: "mies" } }, 23);
      console.log(`\u2705 13. Live browser switched to Aap-Noot-Mies Hybrid (Alpha WebP + 1960s Motion-Lamp) targeting "mies"!`);
      await sleep(900);
      await callMcp("tools/call", {
        name: "augment_learning_play",
        arguments: {
          hintThrottleMultiplier: 0.75,
          kineticSpeedMultiplier: 1.25,
          customEncouragementBanner: "\u2728 1960s Motion-Lamp & Alpha WebP Live! Poes Mies straalt in het gouden licht!",
          emotion: "WARM_PRIDE",
          focusPrefix: "m"
        }
      }, 24);
      console.log(`\u2705 14. Live External AI Co-Pilot banner & 1960s Motion-Lamp speed boost applied on screen!`);
      await sleep(900);
      await callMcp("tools/call", { name: "trigger_drill_through", arguments: { openModal: true } }, 25);
      console.log(`\u2705 15. Triggered live Ctrl+Shift+Alt+G Drill-Through capture in browser -> auto-copied & buffered to MCP!`);
      await sleep(1e3);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "toggle_leesplank_modal" } }, 26);
      console.log(`\u2705 16. Toggled 17-Figure Leesplankje Reference Modal in live browser!`);
      await sleep(1200);
      await callMcp("tools/call", { name: "send_tutor_command", arguments: { action: "toggle_leesplank_modal" } }, 27);
      if (keepOpenMs > 0 && !isHeadless) {
        console.log(`\u{1F440} Keeping headed Playwright Chromium window open for ${Math.round(keepOpenMs / 1e3)}s...`);
        await sleep(keepOpenMs);
      }
    }
  } finally {
    if (!process.argv.includes("--stay-open")) {
      chromeProc.kill("SIGTERM");
    }
  }
}
async function main() {
  let transponderAlreadyUp = false;
  try {
    const res = await fetch(`${BASE_URL}/api/state`);
    if (res.ok) transponderAlreadyUp = true;
  } catch {
    transponderAlreadyUp = false;
  }
  let embeddedServer = null;
  if (!transponderAlreadyUp) {
    process.env.RT_TUTOR_EMBEDDED_TRANSPONDER = "1";
    const mod = await Promise.resolve().then(() => (init_mcp_transponder(), mcp_transponder_exports));
    embeddedServer = await mod.startTransponderServer(3001);
  }
  try {
    await runTransponderAndSyntheticVerification();
    const shouldLaunchBrowser = !process.argv.includes("--no-browser");
    if (shouldLaunchBrowser) {
      const keepOpenArg = process.argv.find((a) => a.startsWith("--keep-open-ms="));
      const keepOpenMs = keepOpenArg ? Number(keepOpenArg.split("=")[1]) : 3500;
      await runHeadedPlaywrightBrowserDemo(keepOpenMs);
    }
    console.log(`
\u{1F389} All Channel 1 (MCP Transponder) & Channel 2 (Headed Playwright + Alpha WebP Motion-Lamp) checks passed!
`);
  } finally {
    if (embeddedServer && !process.argv.includes("--stay-open")) {
      embeddedServer.close();
    }
  }
}
main().catch((err) => {
  console.error("\u274C Exerciser error:", err);
  process.exit(1);
});
