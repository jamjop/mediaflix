import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { GetDownloadsResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH =
  process.env.SETTINGS_PATH ?? fileURLToPath(new URL("../../../settings.yaml", import.meta.url));

interface SlotShape {
  filename: string;
  percentage: string;
  size: string;
  sizeleft: string;
  status: string;
  timeleft: string;
  cat: string;
  source: string;
}

function loadSettings(): {
  sabUrl: string;
  sabKey: string;
  qbtUrl: string;
  qbtUser: string;
  qbtPass: string;
} {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const services = (parsed.services as Record<string, string>) ?? {};
    const sabnzbd = (parsed.sabnzbd as Record<string, string>) ?? {};
    const qbittorrent = (parsed.qbittorrent as Record<string, string>) ?? {};
    return {
      sabUrl: services.sabnzbd?.trim() ?? "",
      sabKey: sabnzbd.api_key?.trim() ?? "",
      qbtUrl: services.qbittorrent?.trim() ?? "",
      qbtUser: qbittorrent.username?.trim() ?? "",
      qbtPass: qbittorrent.password?.trim() ?? "",
    };
  } catch {
    return { sabUrl: "", sabKey: "", qbtUrl: "", qbtUser: "", qbtPass: "" };
  }
}

// ── Helpers ───────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatEta(seconds: number): string {
  if (seconds < 0 || seconds >= 8640000) return "∞";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mapQbtState(state: string): string {
  const map: Record<string, string> = {
    downloading: "Downloading",
    stalledDL: "Stalled",
    queuedDL: "Queued",
    pausedDL: "Paused",
    checkingDL: "Checking",
    forcedDL: "Downloading",
    allocating: "Allocating",
    metaDL: "Fetching Metadata",
  };
  return map[state] ?? state.charAt(0).toUpperCase() + state.slice(1);
}

// ── SABnzbd ───────────────────────────────────────────────────

async function fetchSabnzbd(url: string, apiKey: string): Promise<{
  slots: SlotShape[];
  kbpersec: number;
  speed: string;
  mb: string;
  mbleft: string;
  diskspace1: string;
  noofslots: number;
} | null> {
  const apiUrl = `${url}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=queue`;
  const response = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) {
    logger.warn({ status: response.status }, "SABnzbd API returned non-OK status");
    return null;
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
  const slots: SlotShape[] = rawSlots.map((s) => ({
    filename: String(s.filename ?? s.name ?? "Unknown"),
    percentage: String(s.percentage ?? "0"),
    size: String(s.size ?? "0 B"),
    sizeleft: String(s.sizeleft ?? "0 B"),
    status: String(s.status ?? "Unknown"),
    timeleft: String(s.timeleft ?? "0:00:00"),
    cat: String(s.cat ?? ""),
    source: "sabnzbd",
  }));
  return {
    slots,
    kbpersec: parseFloat(String(q.kbpersec ?? "0")),
    speed: String(q.speed ?? "0"),
    mb: String(q.mb ?? "0"),
    mbleft: String(q.mbleft ?? "0"),
    diskspace1: String(q.diskspace1 ?? "0"),
    noofslots: Number(q.noofslots ?? 0),
  };
}

// ── qBittorrent ───────────────────────────────────────────────

async function fetchQbittorrent(url: string, user: string, pass: string): Promise<{
  slots: SlotShape[];
  kbpersec: number;
} | null> {
  // Attempt login if credentials provided
  let cookie = "";
  if (user || pass) {
    const loginRes = await fetch(`${url}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`,
      signal: AbortSignal.timeout(5000),
    });
    const sid = loginRes.headers.get("set-cookie")?.match(/SID=([^;]+)/)?.[1];
    if (sid) cookie = `SID=${sid}`;
    const body = await loginRes.text();
    if (body.trim() === "Fails.") {
      logger.warn("qBittorrent login failed — check credentials in settings.yaml");
      return null;
    }
  }

  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(`${url}/api/v2/torrents/info?filter=downloading`, {
    headers,
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    logger.warn({ status: res.status }, "qBittorrent API returned non-OK status");
    return null;
  }

  const torrents = (await res.json()) as Array<{
    name?: string;
    progress?: number;
    size?: number;
    amount_left?: number;
    dlspeed?: number;
    eta?: number;
    state?: string;
    category?: string;
  }>;

  let totalDlSpeed = 0;
  const slots: SlotShape[] = torrents.map((t) => {
    totalDlSpeed += t.dlspeed ?? 0;
    const pct = ((t.progress ?? 0) * 100).toFixed(1);
    const sizeBytes = t.size ?? 0;
    const leftBytes = t.amount_left ?? 0;
    return {
      filename: String(t.name ?? "Unknown"),
      percentage: pct,
      size: formatBytes(sizeBytes),
      sizeleft: formatBytes(leftBytes),
      status: mapQbtState(t.state ?? ""),
      timeleft: formatEta(t.eta ?? -1),
      cat: String(t.category ?? ""),
      source: "qbittorrent",
    };
  });

  return { slots, kbpersec: totalDlSpeed / 1024 };
}

// ── Route ─────────────────────────────────────────────────────

const EMPTY = {
  speed: "0",
  kbpersec: "0",
  mb: "0",
  mbleft: "0",
  diskspace1: "0",
  noofslots: 0,
  slots: [] as SlotShape[],
  configured: false,
  qbt_configured: false,
} as const satisfies Parameters<typeof GetDownloadsResponse.parse>[0];

router.get("/downloads", async (_req, res): Promise<void> => {
  const { sabUrl, sabKey, qbtUrl, qbtUser, qbtPass } = loadSettings();

  const sabConfigured = !!(sabUrl && sabKey);
  const qbtConfigured = !!qbtUrl;

  if (!sabConfigured && !qbtConfigured) {
    res.json(GetDownloadsResponse.parse(EMPTY));
    return;
  }

  const [sabResult, qbtResult] = await Promise.allSettled([
    sabConfigured ? fetchSabnzbd(sabUrl, sabKey) : Promise.resolve(null),
    qbtConfigured ? fetchQbittorrent(qbtUrl, qbtUser, qbtPass) : Promise.resolve(null),
  ]);

  const sab = sabResult.status === "fulfilled" ? sabResult.value : null;
  const qbt = qbtResult.status === "fulfilled" ? qbtResult.value : null;

  if (sabResult.status === "rejected") logger.error({ err: sabResult.reason }, "Failed to fetch SABnzbd queue");
  if (qbtResult.status === "rejected") logger.error({ err: qbtResult.reason }, "Failed to fetch qBittorrent queue");

  const combinedKbpersec = (sab?.kbpersec ?? 0) + (qbt?.kbpersec ?? 0);
  const allSlots = [...(sab?.slots ?? []), ...(qbt?.slots ?? [])];

  const result = GetDownloadsResponse.parse({
    speed: combinedKbpersec > 0 ? `${(combinedKbpersec / 1024).toFixed(1)} M` : sab?.speed ?? "0",
    kbpersec: String(combinedKbpersec.toFixed(1)),
    mb: sab?.mb ?? "0",
    mbleft: sab?.mbleft ?? "0",
    diskspace1: sab?.diskspace1 ?? "0",
    noofslots: allSlots.length,
    slots: allSlots,
    configured: sabConfigured || qbtConfigured,
    qbt_configured: qbtConfigured,
  });

  res.json(result);
});

export default router;
