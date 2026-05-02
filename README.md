# MediaFlix

A self-hosted media center landing page — rotating TMDB movie backdrops, quick-access service cards, and a live dashboard for streams, downloads, and media requests. Configured entirely via `settings.yaml`.

---

## Stack

- **Frontend** — React + Vite (`artifacts/mediaflix`)
- **API server** — Express 5 + Node.js (`artifacts/api-server`)
- **Config** — `settings.yaml` at the repo root (read live, no restart needed)
- **Web server** — nginx (config included as `noahflix.net.conf`)

---

## 1. Server prerequisites

```bash
# Node.js v20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx

# pnpm
npm install -g pnpm
```

---

## 2. Clone and install

```bash
git clone https://github.com/youruser/yourrepo.git /opt/mediaflix
cd /opt/mediaflix
pnpm install
```

---

## 3. Configure settings.yaml

`settings.yaml` at the repo root is the only file you need to edit. The API server reads it live on every request — no restart required when you change URLs or API keys.

```yaml
background:
  style: "posters"        # "posters" = rotating TMDB backdrops | "gradient" = dark purple/pink

branding:
  name: "noahflix"
  tagline: "Your personal streaming universe — all your media services, stats, and downloads in one beautiful dashboard."

# Hero buttons
access:
  request_url: "https://requests.noahflix.net"
  request_label: "Request Media"
  access_url: ""
  access_label: "Request Access"

# Internal service URLs (used for API health checks and proxying stats)
services:
  plex: "http://localhost:32400"
  tautulli: "http://localhost:8181"
  radarr: "http://localhost:7878"
  sonarr: "http://localhost:8989"
  sabnzbd: "http://localhost:8080"
  qbittorrent: "http://localhost:8082"
  overseerr: "http://localhost:5055"

# Public-facing URLs shown on the Quick Access buttons
links:
  plex: "https://app.plex.tv"
  overseerr: "https://requests.noahflix.net"
  tautulli: "/tautulli"
  radarr: "/radarr"
  sonarr: "/sonarr"
  sabnzbd: "/sabnzbd"
  qbittorrent: "/qbittorrent"

# API keys for live dashboard data
tautulli:
  api_key: "YOUR_TAUTULLI_KEY"

radarr:
  api_key: "YOUR_RADARR_KEY"

sonarr:
  api_key: "YOUR_SONARR_KEY"

overseerr:
  api_key: "YOUR_OVERSEERR_KEY"

sabnzbd:
  api_key: "YOUR_SABNZBD_KEY"

# TMDB — rotating backdrop images in the background
# Free key at https://www.themoviedb.org/settings/api
# source options: now_playing | popular | top_rated | upcoming
tmdb:
  api_key: "YOUR_TMDB_KEY"
  source: "now_playing"
```

---

## 4. Build both apps

```bash
cd /opt/mediaflix

pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
```

---

## 5. Deploy the frontend

```bash
sudo mkdir -p /var/www/noahflix.net
sudo cp -r /opt/mediaflix/artifacts/mediaflix/dist/public/. /var/www/noahflix.net/
```

---

## 6. Run the API server with systemd

Create `/etc/systemd/system/mediaflix-api.service`:

```ini
[Unit]
Description=MediaFlix API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mediaflix
ExecStart=/usr/bin/node --enable-source-maps artifacts/api-server/dist/index.mjs
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=8057

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mediaflix-api
sudo systemctl status mediaflix-api
```

---

## 7. Configure nginx + SSL

```bash
# Obtain SSL certificate
sudo certbot certonly --nginx -d noahflix.net -d www.noahflix.net

# Install the included nginx config
sudo cp /opt/mediaflix/noahflix.net.conf /etc/nginx/sites-available/noahflix.net.conf
sudo ln -s /etc/nginx/sites-available/noahflix.net.conf /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

The included `noahflix.net.conf`:
- Redirects all HTTP → HTTPS
- Serves the built frontend from `/var/www/noahflix.net`
- Proxies `/api/` requests to the API server on port `8057`
- Sets long-lived cache headers for static assets
- Enables gzip compression

---

## 8. Updating after a git pull

```bash
cd /opt/mediaflix
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
sudo cp -r artifacts/mediaflix/dist/public/. /var/www/noahflix.net/
sudo systemctl restart mediaflix-api
```

> **Note:** Changes to `settings.yaml` (API keys, URLs, background style) take effect immediately — no rebuild or restart needed.
