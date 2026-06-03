import { Router, type IRouter } from "express";
import { GetDownloadsResponse } from "@workspace/api-zod";
import { loadSettings } from "../lib/settings";
import { logger } from "../lib/logger";
import { isValidServiceUrl } from "../lib/validateUrl";

const router: IRouter = Router();

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

interface HistorySlotShape {
  filename: string;
  size: string;
  source: string;
  completed_at: number | null;
}

function loadDownloadSettings(): {
  sabUrl: string;
  sabKey: string;
  qbtUrl: string;
  qbtUser: string;
  qbtPass: string;
} {
  const parsed = loadSettings();
  const services = (parsed.services as Record<string, string>) ?? {};
  const sabnzbd = (parsed.sabnzbd as Record<string, string>) ?? {};
  const qbittorrent = (parsed.qbittorrent as Record<string, string>) ?? {};
  return {
    sabUrl: services.sabnzbd?.trim() ?? "",
    sabKey: process.env.SABNZBD_API_KEY?.trim() ?? sabnzbd.api_key?.trim() ?? "",
    qbtUrl: services.qbittorrent?.trim() ?? "",
    qbtUser: process.env.QBITTORRENT_USERNAME?.trim() ?? qbittorrent.username?.trim() ?? "",
    qbtPass: process.env.QBITTORRENT_PASSWORD?.trim() ?? qbittorrent.password?.trim() ?? "",
  };
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
  history: HistorySlotShape[];
  kbpersec: number;
  speed: string;
  mb: string;
  mbleft: string;
  diskspace1: string;
  noofslots: number;
} | null> {
  const [queueRes, historyRes] = await Promise.allSettled([
    fetch(`${url}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=queue`, { signal: AbortSignal.timeout(5000) }),
    fetch(`${url}/api?apikey=${encodeURIComponent(apiKey)}&output=json&mode=history&limit=5`, { signal: AbortSignal.timeout(5000) }),
  ]);

  if (queueRes.status !== "fulfilled" || !queueRes.value.ok) {
    logger.warn({ status: queueRes.status === "fulfilled" ? queueRes.value.status : "error" }, "SABnzbd queue API returned non-OK");
    return null;
  }

  const queueData = (await queueRes.value.json()) as {
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
  const q = queueData?.queue ?? {};
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

  let history: HistorySlotShape[] = [];
  if (historyRes.status === "fulfilled" && historyRes.value.ok) {
    const historyData = (await historyRes.value.json()) as {
      history?: { slots?: Array<Record<string, unknown>> };
    };
    history = (historyData?.history?.slots ?? []).map((s) => ({
      filename: String(s.name ?? s.filename ?? "Unknown"),
      size: String(s.size ?? "0 B"),
      source: "sabnzbd",
      completed_at: s.completed != null ? parseInt(String(s.completed), 10) : null,
    }));
  }

  return {
    slots,
    history,
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
  history: HistorySlotShape[];
  kbpersec: number;
} | null> {
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
      logger.warn("qBittorrent login failed — check credentials in .env");
      return null;
    }
  }

  const headers: Record<string, string> = {};
  if (cookie) headers["Cookie"] = cookie;

  const [activeRes, completedRes] = await Promise.allSettled([
    fetch(`${url}/api/v2/torrents/info?filter=downloading`, { headers, signal: AbortSignal.timeout(5000) }),
    fetch(`${url}/api/v2/torrents/info?filter=completed&limit=5`, { headers, signal: AbortSignal.timeout(5000) }),
  ]);

  if (activeRes.status !== "fulfilled" || !activeRes.value.ok) {
    logger.warn({ status: activeRes.status === "fulfilled" ? activeRes.value.status : "error" }, "qBittorrent API returned non-OK");
    return null;
  }

  const torrents = (await activeRes.value.json()) as Array<{
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
    return {
      filename: String(t.name ?? "Unknown"),
      percentage: pct,
      size: formatBytes(t.size ?? 0),
      sizeleft: formatBytes(t.amount_left ?? 0),
      status: mapQbtState(t.state ?? ""),
      timeleft: formatEta(t.eta ?? -1),
      cat: String(t.category ?? ""),
      source: "qbittorrent",
    };
  });

  let history: HistorySlotShape[] = [];
  if (completedRes.status === "fulfilled" && completedRes.value.ok) {
    const completed = (await completedRes.value.json()) as Array<{
      name?: string;
      size?: number;
      completion_on?: number;
    }>;
    history = completed.slice(0, 5).map((t) => ({
      filename: String(t.name ?? "Unknown"),
      size: formatBytes(t.size ?? 0),
      source: "qbittorrent",
      completed_at: t.completion_on != null && t.completion_on > 0 ? t.completion_on : null,
    }));
  }

  return { slots, history, kbpersec: totalDlSpeed / 1024 };
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
  history: [] as HistorySlotShape[],
  configured: false,
  qbt_configured: false,
} as const satisfies Parameters<typeof GetDownloadsResponse.parse>[0];

router.get("/downloads", async (_req, res): Promise<void> => {
  const { sabUrl, sabKey, qbtUrl, qbtUser, qbtPass } = loadDownloadSettings();

  const sabConfigured = !!(sabUrl && sabKey && isValidServiceUrl(sabUrl));
  const qbtConfigured = !!(qbtUrl && isValidServiceUrl(qbtUrl));

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
  const allHistory = [...(sab?.history ?? []), ...(qbt?.history ?? [])];

  res.json(GetDownloadsResponse.parse({
    speed: combinedKbpersec > 0 ? `${(combinedKbpersec / 1024).toFixed(1)} M` : sab?.speed ?? "0",
    kbpersec: String(combinedKbpersec.toFixed(1)),
    mb: sab?.mb ?? "0",
    mbleft: sab?.mbleft ?? "0",
    diskspace1: sab?.diskspace1 ?? "0",
    noofslots: allSlots.length,
    slots: allSlots,
    history: allHistory,
    configured: sabConfigured || qbtConfigured,
    qbt_configured: qbtConfigured,
  }));
});

export default router;
