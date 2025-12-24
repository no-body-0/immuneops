const express = require("express");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

/* ===== METRICS + AI ENGINE ===== */
let incidentId = 0;

function generateMetrics() {
  const rps = Math.floor(5000 + Math.random() * 5000);
  const latency = Math.floor(60 + Math.random() * 180);
  const errors = Number((Math.random() * 0.12).toFixed(4));

  let status = "HEALTHY";
  if (latency > 140 || errors > 0.04) status = "DEGRADED";
  if (latency > 200 || errors > 0.08) status = "CRITICAL";

  let incident = null;
  if (status === "CRITICAL") {
    incident = {
      id: ++incidentId,
      severity: "HIGH",
      service: "payments-api",
      rootCause: "Memory leak in worker",
      action: "Restarting pods + scaling replicas",
      timestamp: Date.now()
    };
  }

  return {
    rps,
    latency,
    errors,
    status,
    incident,
    graph: Array.from({ length: 30 }, () =>
      Math.floor(50 + Math.random() * 150)
    ),
    ai:
      status === "HEALTHY"
        ? "All systems healthy. No action required."
        : status === "DEGRADED"
        ? "Performance anomaly detected. Auto-scaling in progress."
        : "Critical incident detected. Self-healing initiated."
  };
}

let latest = generateMetrics();

/* ===== REST API ===== */
app.get("/api/metrics", (_, res) => {
  latest = generateMetrics();
  res.json(latest);
});

app.get("/api/health", (_, res) => {
  res.json({ status: latest.status });
});

/* ===== SPA FALLBACK ===== */
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ===== SERVER + WEBSOCKET ===== */
const server = app.listen(PORT, () =>
  console.log("ImmuneOps running on port", PORT)
);

const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  ws.send(JSON.stringify(latest));

  const loop = setInterval(() => {
    latest = generateMetrics();
    ws.send(JSON.stringify(latest));
  }, 2000);

  ws.on("close", () => clearInterval(loop));
});
