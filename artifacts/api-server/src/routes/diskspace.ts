import { Router } from "express";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";

const router = Router();

interface RawDiskEntry {
  path?: string;
  label?: string;
  freeSpace?: number;
  totalSpace?: number;
}

async function fetchDiskSpace(
  baseUrl: string,
  apiKey: string,
  source: string,
): Promise<
  Array<{
    label: string;
    path: string;
    freeGb: number;
    totalGb: number;
    usedPercent: number;
    source: string;
  }>
> {
  try {
    const res = await fetch(`${baseUrl}/api/v3/diskspace`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RawDiskEntry[];
    return data
      .filter((d) => d.totalSpace && d.totalSpace > 0)
      .map((d) => {
        const freeGb = (d.freeSpace ?? 0) / 1024 ** 3;
        const totalGb = (d.totalSpace ?? 1) / 1024 ** 3;
        const usedGb = totalGb - freeGb;
        return {
          label: d.label ?? d.path ?? "Unknown",
          path: d.path ?? "",
          freeGb: parseFloat(freeGb.toFixed(2)),
          totalGb: parseFloat(totalGb.toFixed(2)),
          usedPercent: parseFloat(((usedGb / totalGb) * 100).toFixed(1)),
          source,
        };
      });
  } catch (err) {
    logger.warn({ err, source }, "Failed to fetch disk space");
    return [];
  }
}

router.get("/diskspace", async (_req, res): Promise<void> => {
  const parsed = loadSettings();
  const services = (parsed.services as Record<string, string>) ?? {};
  const radarrCfg = (parsed.radarr as Record<string, string>) ?? {};
  const sonarrCfg = (parsed.sonarr as Record<string, string>) ?? {};

  const radarrUrl = services.radarr?.trim() ?? "";
  const radarrKey = radarrCfg.api_key?.trim() ?? "";
  const sonarrUrl = services.sonarr?.trim() ?? "";
  const sonarrKey = sonarrCfg.api_key?.trim() ?? "";

  const radarrConfigured = !!(radarrUrl && radarrKey);
  const sonarrConfigured = !!(sonarrUrl && sonarrKey);

  if (!radarrConfigured && !sonarrConfigured) {
    res.json({ drives: [], configured: false });
    return;
  }

  const [radarrResult, sonarrResult] = await Promise.allSettled([
    radarrConfigured
      ? fetchDiskSpace(radarrUrl, radarrKey, "radarr")
      : Promise.resolve([]),
    sonarrConfigured
      ? fetchDiskSpace(sonarrUrl, sonarrKey, "sonarr")
      : Promise.resolve([]),
  ]);

  const radarrDrives =
    radarrResult.status === "fulfilled" ? radarrResult.value : [];
  const sonarrDrives =
    sonarrResult.status === "fulfilled" ? sonarrResult.value : [];

  // Deduplicate by path — same physical drive often appears in both services
  const seen = new Set<string>();
  const drives = [...radarrDrives, ...sonarrDrives].filter((d) => {
    if (seen.has(d.path)) return false;
    seen.add(d.path);
    return true;
  });

  res.json({ drives, configured: true });
});

export default router;
