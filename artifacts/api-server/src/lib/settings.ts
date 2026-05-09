import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { logger } from "./logger";

export const SETTINGS_PATH =
  process.env.SETTINGS_PATH ?? fileURLToPath(new URL("../../../settings.yaml", import.meta.url));

const TTL_MS = 5_000;

let cache: { data: Record<string, unknown>; expiresAt: number } | null = null;

export function loadSettings(): Record<string, unknown> {
  const now = Date.now();
  if (cache && now < cache.expiresAt) return cache.data;
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const data = ((yaml.load(raw) ?? {}) as Record<string, unknown>);
    cache = { data, expiresAt: now + TTL_MS };
    return data;
  } catch (err) {
    logger.warn({ err, path: SETTINGS_PATH }, "Could not read settings.yaml, using defaults");
    cache = { data: {}, expiresAt: now + TTL_MS };
    return {};
  }
}
