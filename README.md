# MediaFlix

A self-hosted media center landing page — rotating TMDB movie backdrops, quick-access service cards, and a live dashboard for streams, downloads, and media requests. Configured via `settings.yaml` and an optional `.env` file for secrets.

---

## Stack

- **Frontend** — React + Vite (`artifacts/mediaflix`)
- **API server** — Express 5 + Node.js (`artifacts/api-server`)
- **Config** — `settings.yaml` at the repo root (read live, no restart needed)
- **Secrets** — `.env` at the repo root (optional, takes priority over `settings.yaml`)
- **Web server** — nginx (config included as `noahflix.net.conf`)

---

## 1. Server prerequisites

```bash
# Node.js v20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

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

`settings.yaml` at the repo root controls all non-sensitive settings. The API server reads it live on every request — no restart required when you change URLs, labels, or background style.

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

# Internal service URLs used for health checks and API proxying.
# These should point to services running on the same host.
services:
  plex: "http://localhost:32400"
  tautulli: "http://localhost:8181"
  radarr: "http://localhost:7878"
  sonarr: "http://localhost:8989"
  sabnzbd: "http://localhost:8080"
  qbittorrent: "http://localhost:8082"
  overseerr: "http://localhost:5055"

# Public-facing URLs shown on the Quick Access buttons.
# Use root-relative paths (e.g. /radarr) to route through nginx.
links:
  plex: "https://app.plex.tv"
  overseerr: "/overseerr"
  tautulli: "/tautulli"
  radarr: "/radarr"
  sonarr: "/sonarr"
  sabnzbd: "/sabnzbd"
  qbittorrent: "/qbittorrent"

# TMDB backdrop source — set api_key here or in .env (preferred)
# Free key at https://www.themoviedb.org/settings/api
# source options: now_playing | popular | top_rated | upcoming
tmdb:
  api_key: ""             # leave blank if using .env
  source: "now_playing"
```

---

## 4. Store API keys in .env (recommended)

API keys should never be committed to git. Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
nano .env
```

```env
TAUTULLI_API_KEY=your_tautulli_key
SABNZBD_API_KEY=your_sabnzbd_key
OVERSEERR_API_KEY=your_overseerr_key
TMDB_API_KEY=your_tmdb_key
```

Keys set in `.env` take priority over any `api_key` values in `settings.yaml`. Both `settings.yaml` and `.env` are in `.gitignore` and will never be committed.

---

## 5. Build both apps

```bash
cd /opt/mediaflix

pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
```

---

## 6. Deploy the frontend

```bash
sudo mkdir -p /var/www/noahflix.net
sudo cp -r /opt/mediaflix/artifacts/mediaflix/dist/public/. /var/www/noahflix.net/
```

---

## 7. Run the API server with systemd

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
EnvironmentFile=/opt/mediaflix/.env
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

## 8. Configure nginx (Cloudflare origin certificate)

The included `noahflix.net.conf` is pre-configured for Cloudflare origin certificates stored at `/etc/ssl/cloudflare/`. Let's Encrypt config is present but commented out in case you need to switch.

Place your Cloudflare origin cert files:

```
/etc/ssl/cloudflare/noahflix.net.pem   ← certificate
/etc/ssl/cloudflare/noahflix.net.key   ← private key
```

Then install and enable the config:

```bash
sudo mkdir -p /etc/ssl/cloudflare
# copy your cert files here, then:

sudo cp /opt/mediaflix/noahflix.net.conf /etc/nginx/sites-available/noahflix.net.conf
sudo ln -s /etc/nginx/sites-available/noahflix.net.conf /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx
```

### Service sub-paths

The nginx config proxies each service at a root-relative path. Each service must be configured to match:

| Service | nginx path | Setting to configure |
|---|---|---|
| Tautulli | `/tautulli/` | Settings → Web Interface → HTTP Root = `/tautulli` |
| Radarr | `/radarr/` | Settings → General → URL Base = `/radarr` |
| Sonarr | `/sonarr/` | Settings → General → URL Base = `/sonarr` |
| SABnzbd | `/sabnzbd/` | Config → General → URL Prefix = `/sabnzbd` |
| qBittorrent | `/qbittorrent/` | Preferences → Web UI → Root path = `/qbittorrent` |

### Switching to Let's Encrypt

To switch from Cloudflare to Let's Encrypt, edit `noahflix.net.conf`:
- Comment out the `Cloudflare Origin Certificate` block
- Uncomment the `Let's Encrypt` block

Then run:

```bash
sudo certbot certonly --nginx -d noahflix.net -d www.noahflix.net
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. Updating after a git pull

```bash
cd /opt/mediaflix
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
sudo cp -r artifacts/mediaflix/dist/public/. /var/www/noahflix.net/
sudo systemctl restart mediaflix-api
```

> **Tip:** Changes to `settings.yaml` or `.env` take effect immediately for URL/style changes. API key changes in `.env` require a service restart (`sudo systemctl restart mediaflix-api`).
