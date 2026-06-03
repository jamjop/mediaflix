import { Router, type IRouter } from "express";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function loadTautulliSettings(): { url: string; apiKey: string } {
  const envKey = process.env.TAUTULLI_API_KEY?.trim();
  const parsed = loadSettings();
  const services = (parsed.services as Record<string, string>) ?? {};
  const tautulli = (parsed.tautulli as Record<string, string>) ?? {};
  return {
    url: services.tautulli?.trim() ?? "",
    apiKey: envKey ?? tautulli.api_key?.trim() ?? "",
  };
}

router.get("/poster-proxy", async (req, res): Promise<void> => {
  const img = String(req.query.img ?? "").trim();
  if (!img) {
    res.status(400).send("Missing img param");
    return;
  }

  const { url, apiKey } = loadTautulliSettings();
  if (!url || !apiKey) {
    res.status(503).send("Tautulli not configured");
    return;
  }

  const proxyUrl = `${url}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=pms_image_proxy&img=${encodeURIComponent(img)}&width=150&height=225&fallback=poster`;

  try {
    const upstream = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
    if (!upstream.ok) {
      logger.warn({ status: upstream.status }, "Tautulli poster proxy returned non-OK");
      res.status(502).send("Upstream error");
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    logger.warn({ err }, "Failed to proxy poster from Tautulli");
    res.status(502).send("Failed to fetch poster");
  }
});

export default router;
