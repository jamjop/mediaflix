import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetServiceStatusResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");

type ServiceKey = "plex" | "overseerr" | "tautulli" | "radarr" | "sonarr" | "sabnzbd" | "qbittorrent";
const SERVICE_KEYS: ServiceKey[] = ["plex", "overseerr", "tautulli", "radarr", "sonarr", "sabnzbd", "qbittorrent"];

function loadServiceUrls(): Record<ServiceKey, string> {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const services = (parsed.services as Record<string, string>) ?? {};
    return Object.fromEntries(
      SERVICE_KEYS.map((k) => [k, services[k]?.trim() ?? ""])
    ) as Record<ServiceKey, string>;
  } catch {
    return Object.fromEntries(SERVICE_KEYS.map((k) => [k, ""])) as Record<ServiceKey, string>;
  }
}

async function ping(url: string): Promise<{ ok: boolean; latency_ms: number }> {
  const start = Date.now();
  try {
    await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
    });
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, latency_ms: Date.now() - start };
  }
}

router.get("/service-status", async (_req, res): Promise<void> => {
  const urls = loadServiceUrls();

  const results = await Promise.allSettled(
    SERVICE_KEYS.map(async (key) => {
      const url = urls[key];
      if (!url) return { key, configured: false, ok: false, latency_ms: 0 };
      const { ok, latency_ms } = await ping(url);
      return { key, configured: true, ok, latency_ms };
    })
  );

  const statusMap = Object.fromEntries(
    results.map((r, i) => {
      const key = SERVICE_KEYS[i];
      if (r.status === "fulfilled") {
        return [key, { ok: r.value.ok, latency_ms: r.value.latency_ms, configured: r.value.configured }];
      }
      logger.warn({ key }, "Service ping threw unexpectedly");
      return [key, { ok: false, latency_ms: 0, configured: false }];
    })
  );

  res.json(GetServiceStatusResponse.parse(statusMap));
});

export default router;
