import { Router, type IRouter } from "express";
import { GetConfigResponse } from "@workspace/api-zod";
import { loadSettings } from "../lib/settings";

const router: IRouter = Router();

router.get("/config", (_req, res): void => {
  const parsed = loadSettings();

  const background = (parsed.background as Record<string, string>) ?? {};
  const branding = (parsed.branding as Record<string, string>) ?? {};
  const services = (parsed.services as Record<string, string>) ?? {};
  const links = (parsed.links as Record<string, string>) ?? {};
  const access = (parsed.access as Record<string, string>) ?? {};
  const turnstile = (parsed.turnstile as Record<string, string>) ?? {};

  const emptyServices = { plex: "", overseerr: "", tautulli: "", radarr: "", sonarr: "", sabnzbd: "", qbittorrent: "" };

  const config = {
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
    captcha_site_key: turnstile.site_key ?? "",
  };

  const validated = GetConfigResponse.parse(
    Object.keys(parsed).length === 0
      ? {
          background: { style: "posters" },
          branding: { name: "mediaflix", tagline: "Your personal media universe.", accent_color: "#a855f7" },
          services: { ...emptyServices },
          links: { ...emptyServices },
          access: { request_url: "", request_label: "Request Media", access_url: "", access_label: "Request Access" },
        }
      : config,
  );
  res.json(validated);
});

export default router;
