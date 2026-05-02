import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetDownloadsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");

function loadSabnzbdSettings(): { url: string; apiKey: string } {
  const envKey = process.env.SABNZBD_API_KEY?.trim();
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const services = (parsed.services as Record<string, string>) ?? {};
    const sabnzbd = (parsed.sabnzbd as Record<string, string>) ?? {};
    return {
      url: services.sabnzbd?.trim() ?? "",
      apiKey: envKey ?? sabnzbd.api_key?.trim() ?? "",
    };
  } catch {
    return { url: "", apiKey: envKey ?? "" };
  }
}

const EMPTY: Parameters<typeof GetDownloadsResponse.parse>[0] = {
  speed: "0",
  kbpersec: "0",
  mb: "0",
  mbleft: "0",
  diskspace1: "0",
  noofslots: 0,
  slots: [],
  configured: false,
};

router.get("/downloads", async (_req, res): Promise<void> => {
  const { url, apiKey } = loadSabnzbdSettings();

  if (!url || !apiKey) {
    res.json(GetDownloadsResponse.parse(EMPTY));
    return;
  }

  try {
    const apiUrl = `${url}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=queue`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "SABnzbd API returned non-OK status");
      res.json(GetDownloadsResponse.parse({ ...EMPTY, configured: true }));
      return;
    }

    const data = (await response.json()) as {
      queue?: {
        speed?: string;
        kbpersec?: string;
        mb?: string;
        mbleft?: string;
        diskspace1?: string;
        noofslots?: number;
        slots?: Array<Record<string, unknown>>;
      };
    };

    const q = data?.queue ?? {};
    const rawSlots = q.slots ?? [];

    const slots = rawSlots.map((s) => ({
      filename: String(s.filename ?? s.name ?? "Unknown"),
      percentage: String(s.percentage ?? "0"),
      size: String(s.size ?? "0 B"),
      sizeleft: String(s.sizeleft ?? "0 B"),
      status: String(s.status ?? "Unknown"),
      timeleft: String(s.timeleft ?? "0:00:00"),
      cat: String(s.cat ?? ""),
    }));

    const result = GetDownloadsResponse.parse({
      speed: String(q.speed ?? "0"),
      kbpersec: String(q.kbpersec ?? "0"),
      mb: String(q.mb ?? "0"),
      mbleft: String(q.mbleft ?? "0"),
      diskspace1: String(q.diskspace1 ?? "0"),
      noofslots: Number(q.noofslots ?? 0),
      slots,
      configured: true,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch SABnzbd queue");
    res.json(GetDownloadsResponse.parse({ ...EMPTY, configured: true }));
  }
});

export default router;
