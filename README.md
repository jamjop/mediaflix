# MediaFlix

A self-hosted media center landing page — rotating TMDB movie backdrops, quick-access service cards, and a live dashboard for streams, downloads, and media requests. Configured via `settings.yaml` and an optional `.env` file for secrets.

---

## Stack

- **Frontend** — React + Vite (`artifacts/mediaflix`)
- **API server** — Express 5 + Node.js (`artifacts/api-server`)
- **Config** — `settings.yaml` at the repo root (read live on every request, no restart needed)
- **Secrets** — `.env` at the repo root (requires `sudo systemctl restart mediaflix-api` after changes)
- **Web server** — nginx (config included as `mediaflix.net.conf`)

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

## 3. Configure

Both `settings.yaml` and `.env` are gitignored. Use the provided example files as templates:

```bash
cp settings.yaml.example settings.yaml
cp .env.example .env
```

### settings.yaml

Controls all non-sensitive settings and API keys. The API server reads it live on every request — no restart required when you change URLs, labels, background style, or API keys.

Key sections:

```yaml
background:
  style: "posters"        # "posters" = rotating TMDB backdrops | "gradient" = dark purple/pink

branding:
  name: "MediaFlix"
  tagline: "Your personal streaming universe — all your media services, stats, and downloads in one beautiful dashboard."
  accent_color: "#a855f7"

# Internal service URLs — used for API proxying and health checks
services:
  plex: "http://127.0.0.1:32400"
  overseerr: "http://127.0.0.1:5055"
  tautulli: "http://127.0.0.1:8181/tautulli"
  radarr: "http://127.0.0.1:7878/radarr"
  sonarr: "http://127.0.0.1:8989/sonarr"
  sabnzbd: "http://127.0.0.1:8282"
  qbittorrent: "http://127.0.0.1:9091"

# Public-facing links shown on the quick-access service cards
links:
  plex: "https://app.plex.tv"
  overseerr: "https://requests.yourdomain.com"
  tautulli: "/tautulli"
  radarr: "/radarr"
  sonarr: "/sonarr"
  sabnzbd: "/sabnzbd"
  qbittorrent: "/qbittorrent"

# API keys (kept server-side, never exposed to the browser)
tautulli:
  api_key: "your_tautulli_api_key"
overseerr:
  api_key: "your_overseerr_api_key"
sabnzbd:
  api_key: "your_sabnzbd_api_key"
tmdb:
  api_key: "your_tmdb_api_key"
  source: "now_playing"   # now_playing | popular | top_rated | upcoming

# Cloudflare Turnstile CAPTCHA — leave site_key blank to disable
# Secret key goes in .env as TURNSTILE_SECRET_KEY
turnstile:
  site_key: "your_cloudflare_turnstile_site_key"
```

See `settings.yaml.example` for the full reference.

### .env

Used for secrets that require a service restart to take effect. See `.env.example` for all available variables:

```env
SESSION_SECRET=a_long_random_string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_app_password
NOTIFY_EMAIL=notify@yourdomain.com
PUSHOVER_USER_KEY=your_pushover_user_key
PUSHOVER_APP_TOKEN=your_pushover_app_token
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
LOG_LEVEL=info
```

---

## 4. Build both apps

```bash
cd /opt/mediaflix
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
```

> **Note:** `BASE_PATH` defaults to `/` — no extra environment variables are needed for a standard nginx deployment. If serving under a sub-path (e.g. `/mediaflix/`), set `BASE_PATH=/mediaflix/ pnpm --filter @workspace/mediaflix run build`.

---

## 5. Deploy the frontend

```bash
sudo mkdir -p /var/www/yourdomain.com
sudo cp -r /opt/mediaflix/artifacts/mediaflix/dist/public/. /var/www/yourdomain.com/
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

## 7. Configure nginx

The included `mediaflix.net.conf` is pre-configured for Cloudflare origin certificates. It includes:

- HTTP → HTTPS redirect
- Cloudflare origin certificate (mTLS) with `ssl_verify_client`
- Rate limiting: 10 req/s per IP, burst of 30 (`/api/` location)
- WebSocket support for Sonarr
- Reverse proxy blocks for Tautulli, Radarr, Sonarr, SABnzbd, Overseerr, and Qui
- `server_tokens off` and `proxy_hide_header Server` for security

### SSL certificates

Place your Cloudflare origin cert files at:

```
/etc/ssl/cloudflare/cloudflare.pem      ← origin certificate
/etc/ssl/cloudflare/cloudflare.key      ← private key
/etc/ssl/cloudflare/cloudflare-ca.crt  ← Cloudflare CA (for ssl_verify_client)
```

### Install the config

```bash
sudo cp /opt/mediaflix/mediaflix.net.conf /etc/nginx/sites-available/mediaflix.net.conf
sudo ln -s /etc/nginx/sites-available/mediaflix.net.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Cloudflare real IP passthrough

The config references `/etc/nginx/conf.d/cloudflare_realip.conf` for real IP passthrough. This is only needed when traffic is proxied through Cloudflare (i.e. using Cloudflare origin certs). If you switch to direct connections or Let's Encrypt, remove or disable that file.

### Service sub-paths

Each proxied service must be configured to match its nginx path:

| Service     | nginx path     | Setting to configure                              |
|-------------|----------------|---------------------------------------------------|
| Tautulli    | `/tautulli/`   | Settings → Web Interface → HTTP Root = `/tautulli` |
| Radarr      | `/radarr/`     | Settings → General → URL Base = `/radarr`         |
| Sonarr      | `/sonarr/`     | Settings → General → URL Base = `/sonarr`         |
| SABnzbd     | `/sabnzbd/`    | Config → General → URL Prefix = `/sabnzbd`        |
| Qui         | `/qui/`        | Built-in path — no extra config needed            |

> **Note:** The qBittorrent location block is commented out in `mediaflix.net.conf`. It is only needed if accessing qBittorrent directly without using Qui (`/qui/`).

### Switching to Let's Encrypt

To switch from Cloudflare to Let's Encrypt, edit `mediaflix.net.conf`:
- Comment out the `Cloudflare Origin Certificate` SSL block
- Uncomment the `Let's Encrypt` SSL block
- Remove or disable `/etc/nginx/conf.d/cloudflare_realip.conf`

Then run:

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Updating after a git pull

```bash
cd /opt/mediaflix
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/mediaflix run build
sudo cp -r artifacts/mediaflix/dist/public/. /var/www/yourdomain.com/
sudo systemctl restart mediaflix-api
```

> **Tip:** Changes to `settings.yaml` (URLs, labels, API keys, background style) take effect immediately — no restart needed. Changes to `.env` require `sudo systemctl restart mediaflix-api`.
