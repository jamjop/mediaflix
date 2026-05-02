import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetPostersResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");
const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w780";

const FALLBACK_POSTERS = [
  "/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
  "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
  "/3bhkrj58Vtu7enYsLegHnDmni7.jpg",
  "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg",
  "/8kSerJrhrJWKLk1LViesGcnrUPE.jpg",
  "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
  "/oU7Oq2kFAAlGqbU4VoAE36g4hoI.jpg",
  "/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg",
  "/gNBCvtYyGPbjd0XknR3n2gMCOmg.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  "/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg",
].map((p) => `${POSTER_BASE}${p}`);

function loadApiKey(): string {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const tmdb = parsed.tmdb as Record<string, string> | undefined;
    return tmdb?.api_key?.trim() ?? "";
  } catch {
    return "";
  }
}

// Simple in-memory cache — refresh every 6 hours
let cachedPosters: string[] = [];
let cacheExpiry = 0;

async function fetchNowPlayingPosters(apiKey: string): Promise<string[]> {
  if (Date.now() < cacheExpiry && cachedPosters.length > 0) {
    return cachedPosters;
  }

  // Fetch two pages to get ~40 movies for a varied mosaic
  const [page1, page2] = await Promise.all([
    fetch(`${TMDB_BASE}/movie/now_playing?api_key=${apiKey}&language=en-US&page=1`, {
      signal: AbortSignal.timeout(8000),
    }),
    fetch(`${TMDB_BASE}/movie/now_playing?api_key=${apiKey}&language=en-US&page=2`, {
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  if (!page1.ok) {
    throw new Error(`TMDB responded ${page1.status}`);
  }

  const data1 = (await page1.json()) as { results: Array<{ poster_path: string | null }> };
  const data2 = page2.ok
    ? ((await page2.json()) as { results: Array<{ poster_path: string | null }> })
    : { results: [] };

  const posters = [...data1.results, ...data2.results]
    .filter((m) => m.poster_path)
    .map((m) => `${POSTER_BASE}${m.poster_path}`);

  if (posters.length < 8) {
    throw new Error("Too few poster results from TMDB");
  }

  cachedPosters = posters;
  cacheExpiry = Date.now() + 6 * 60 * 60 * 1000; // 6 hours
  return posters;
}

router.get("/posters", async (_req, res): Promise<void> => {
  const apiKey = loadApiKey();

  if (!apiKey) {
    res.json(GetPostersResponse.parse({ posters: FALLBACK_POSTERS, source: "fallback" }));
    return;
  }

  try {
    const posters = await fetchNowPlayingPosters(apiKey);
    res.json(GetPostersResponse.parse({ posters, source: "tmdb" }));
  } catch (err) {
    logger.warn({ err }, "Failed to fetch TMDB posters, using fallback");
    res.json(GetPostersResponse.parse({ posters: FALLBACK_POSTERS, source: "fallback" }));
  }
});

export default router;
