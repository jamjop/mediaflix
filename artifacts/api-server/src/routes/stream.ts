import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

async function fetchJson(port: string, path: string): Promise<unknown> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    logger.warn({ err, path }, "SSE internal fetch failed");
    return null;
  }
}

router.get("/stream", async (req, res): Promise<void> => {
  const port = process.env.PORT!;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  function sendEvent(event: string, data: unknown): void {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  }

  async function pushAll(): Promise<void> {
    const [activity, downloads, serviceStatus] = await Promise.allSettled([
      fetchJson(port, "/activity"),
      fetchJson(port, "/downloads"),
      fetchJson(port, "/service-status"),
    ]);
    if (activity.status === "fulfilled" && activity.value !== null)
      sendEvent("activity", activity.value);
    if (downloads.status === "fulfilled" && downloads.value !== null)
      sendEvent("downloads", downloads.value);
    if (serviceStatus.status === "fulfilled" && serviceStatus.value !== null)
      sendEvent("serviceStatus", serviceStatus.value);
  }

  try { await pushAll(); } catch (err) { logger.warn({ err }, "SSE initial push failed"); }

  const interval = setInterval(async () => {
    if (res.writableEnded) {
      clearInterval(interval);
      return;
    }
    res.write(": heartbeat\n\n");
    try { await pushAll(); } catch (err) { logger.warn({ err }, "SSE push failed"); }
  }, 15_000);

  req.on("close", () => {
    clearInterval(interval);
    if (!res.writableEnded) res.end();
  });
});

export default router;
