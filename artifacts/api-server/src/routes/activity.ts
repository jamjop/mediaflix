import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetActivityResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");

function loadTautulliSettings(): { url: string; apiKey: string } {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const services = (parsed.services as Record<string, string>) ?? {};
    const tautulli = (parsed.tautulli as Record<string, string>) ?? {};
    return {
      url: services.tautulli?.trim() ?? "",
      apiKey: tautulli.api_key?.trim() ?? "",
    };
  } catch {
    return { url: "", apiKey: "" };
  }
}

router.get("/activity", async (_req, res): Promise<void> => {
  const { url, apiKey } = loadTautulliSettings();

  if (!url || !apiKey) {
    const result = GetActivityResponse.parse({
      stream_count: 0,
      sessions: [],
      configured: false,
    });
    res.json(result);
    return;
  }

  try {
    const apiUrl = `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=get_activity`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Tautulli API returned non-OK status");
      res.json(GetActivityResponse.parse({ stream_count: 0, sessions: [], configured: true }));
      return;
    }

    const data = (await response.json()) as {
      response?: {
        data?: {
          stream_count?: string | number;
          sessions?: Array<Record<string, unknown>>;
        };
      };
    };

    const tData = data?.response?.data ?? {};
    const rawSessions = tData.sessions ?? [];
    const streamCount = parseInt(String(tData.stream_count ?? "0"), 10);

    const sessions = rawSessions.map((s) => ({
      user: String(s.user ?? s.friendly_name ?? "Unknown"),
      title: String(s.title ?? "Unknown"),
      parent_title: String(s.parent_title ?? ""),
      grandparent_title: String(s.grandparent_title ?? ""),
      media_type: String(s.media_type ?? "movie"),
      progress_percent: String(s.progress_percent ?? "0"),
      state: String(s.state ?? "playing"),
      player: String(s.player ?? ""),
      duration: parseInt(String(s.duration ?? "0"), 10),
      view_offset: parseInt(String(s.view_offset ?? "0"), 10),
    }));

    const result = GetActivityResponse.parse({
      stream_count: streamCount,
      sessions,
      configured: true,
    });

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to fetch Tautulli activity");
    res.json(GetActivityResponse.parse({ stream_count: 0, sessions: [], configured: true }));
  }
});

export default router;
