import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetPostersResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");
const TMDB_BASE = "https://api.themoviedb.org/3";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

const VALID_SOURCES = ["now_playing", "popular", "top_rated", "upcoming"] as const;
type TmdbSource = (typeof VALID_SOURCES)[number];

// Landscape backdrops (w1280) used when no TMDB key is configured
const FALLBACK_POSTERS = [
  "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg", // Inception
  "/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg", // The Dark Knight
  "/xJHokMbljvjADYdit5fK5VQsXEG.jpg", // Interstellar
  "/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg", // The Avengers
  "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg", // Guardians of the Galaxy
  "/9BBTo108Khn9VM37E0hOeGCLMiU.jpg", // The Matrix
  "/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg", // Blade Runner 2049
  "/3P52oz9HPQWxcwHOwxtyrVV1LKi.jpg", // Dune
].map((p) => `${BACKDROP_BASE}${p}`);

function loadTmdbConfig(): { apiKey: string; source: TmdbSource } {
  const envKey = process.env.TMDB_API_KEY?.trim();
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const tmdb = parsed.tmdb as Record<string, string> | undefined;
    const apiKey = envKey ?? tmdb?.api_key?.trim() ?? "";
    const rawSource = tmdb?.source?.trim() ?? "now_playing";
    const source: TmdbSource = (VALID_SOURCES as readonly string[]).includes(rawSource)
      ? (rawSource as TmdbSource)
      : "now_playing";
    return { apiKey, source };
  } catch {
    return { apiKey: envKey ?? "", source: "now_playing" };
  }
}

// Per-source cache so changing source in settings takes effect immediately
const cache: Partial<Record<TmdbSource, { posters: string[]; expiry: number }>> = {};

async function fetchPosters(apiKey: string, source: TmdbSource): Promise<string[]> {
  const cached = cache[source];
  if (cached && Date.now() < cached.expiry && cached.posters.length > 0) {
    return cached.posters;
  }

  // Fetch two pages (~40 movies) for a varied rotation
  const [page1, page2] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/${source}?api_key=${apiKey}&language=en-US&page=1`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(`${TMDB_BASE}/movie/${source}?api_key=${apiKey}&language=en-US&page=2`, {
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  if (!page1.ok) throw new Error(`TMDB responded ${page1.status}`);

  const data1 = (await page1.json()) as { results: Array<{ backdrop_path: string | null }> };
  const data2 = page2.ok
    ? ((await page2.json()) as { results: Array<{ backdrop_path: string | null }> })
    : { results: [] };

  const posters = [...data1.results, ...data2.results]
    .filter((m) => m.backdrop_path)
    .map((m) => `${BACKDROP_BASE}${m.backdrop_path}`);

  if (posters.length < 4) throw new Error("Too few backdrop results from TMDB");

  cache[source] = { posters, expiry: Date.now() + 6 * 60 * 60 * 1000 };
  return posters;
}

router.get("/posters", async (_req, res): Promise<void> => {
  const { apiKey, source } = loadTmdbConfig();

  if (!apiKey) {
    res.json(GetPostersResponse.parse({ posters: FALLBACK_POSTERS, source: "fallback" }));
    return;
  }

  try {
    const posters = await fetchPosters(apiKey, source);
    res.json(GetPostersResponse.parse({ posters, source }));
  } catch (err) {
    logger.warn({ err, source }, "Failed to fetch TMDB posters, using fallback");
    res.json(GetPostersResponse.parse({ posters: FALLBACK_POSTERS, source: "fallback" }));
  }
});

export default router;
