import { Router, type IRouter } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { GetConfigResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SETTINGS_PATH = join(process.cwd(), "..", "..", "settings.yaml");

function loadSettings() {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;

    const background = (parsed.background as Record<string, string>) ?? {};
    const branding = (parsed.branding as Record<string, string>) ?? {};
    const services = (parsed.services as Record<string, string>) ?? {};
    const links = (parsed.links as Record<string, string>) ?? {};
    const access = (parsed.access as Record<string, string>) ?? {};

    return {
      background: {
        style: background.style === "gradient" ? "gradient" : "posters",
      },
      branding: {
        name: branding.name ?? "mediaflix",
        tagline: branding.tagline ?? "Your personal media universe.",
        accent_color: branding.accent_color ?? "#a855f7",
      },
      services: {
        plex: services.plex ?? "",
        overseerr: services.overseerr ?? "",
        tautulli: services.tautulli ?? "",
        radarr: services.radarr ?? "",
        sonarr: services.sonarr ?? "",
        sabnzbd: services.sabnzbd ?? "",
        qbittorrent: services.qbittorrent ?? "",
      },
      links: {
        plex: links.plex ?? "",
        overseerr: links.overseerr ?? "",
        tautulli: links.tautulli ?? "",
        radarr: links.radarr ?? "",
        sonarr: links.sonarr ?? "",
        sabnzbd: links.sabnzbd ?? "",
        qbittorrent: links.qbittorrent ?? "",
      },
      access: {
        request_url: access.request_url ?? "",
        request_label: access.request_label ?? "Request Media",
        access_url: access.access_url ?? "",
        access_label: access.access_label ?? "Request Access",
      },
    };
  } catch (err) {
    logger.warn({ err, path: SETTINGS_PATH }, "Could not read settings.yaml, using defaults");
    const emptyServices = { plex: "", overseerr: "", tautulli: "", radarr: "", sonarr: "", sabnzbd: "", qbittorrent: "" };
    return {
      background: { style: "posters" },
      branding: {
        name: "mediaflix",
        tagline: "Your personal media universe.",
        accent_color: "#a855f7",
      },
      services: { ...emptyServices },
      links: { ...emptyServices },
      access: {
        request_url: "",
        request_label: "Request Media",
        access_url: "",
        access_label: "Request Access",
      },
    };
  }
}

router.get("/config", (_req, res): void => {
  const config = loadSettings();
  const validated = GetConfigResponse.parse(config);
  res.json(validated);
});

export default router;
