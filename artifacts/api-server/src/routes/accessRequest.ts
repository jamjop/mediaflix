import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import { logger } from "../lib/logger";

const router = Router();

const SETTINGS_PATH =
  process.env.SETTINGS_PATH ??
  fileURLToPath(new URL("../../../settings.yaml", import.meta.url));

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ACCESS_TO_EMAIL =
  process.env.ACCESS_TO_EMAIL ?? "capture_garnet1e@icloud.com";

const MIN_SUBMIT_MS = 3000;

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { success: false, message: "Too many requests. Please try again in an hour." },
  keyGenerator: (req) =>
    (req.headers["cf-connecting-ip"] as string) ??
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.ip ??
    "unknown",
});

function getTurnstileSecret(): string {
  return process.env.TURNSTILE_SECRET_KEY ?? "";
}

function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? `"noahflix" <noreply@noahflix.net>`,
  };
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = getTurnstileSecret();
  if (!secret) {
    logger.warn("TURNSTILE_SECRET_KEY not set — rejecting submission");
    return false;
  }

  const body = new URLSearchParams({ secret, response: token, remoteip: ip });

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      logger.warn({ errors: data["error-codes"] }, "Turnstile verification failed");
    }
    return data.success;
  } catch (err) {
    logger.error({ err }, "Turnstile verification request error");
    return false;
  }
}

function isValidPlexUsername(u: string): boolean {
  return /^[a-zA-Z0-9._-]{3,50}$/.test(u);
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function sanitize(s: string, maxLen = 500): string {
  return s.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

function getPushoverConfig() {
  return {
    token: process.env.PUSHOVER_APP_TOKEN ?? "",
    user: process.env.PUSHOVER_USER_KEY ?? "",
  };
}

async function sendPushover(
  name: string,
  plexUsername: string,
  email: string,
  message: string,
  log: (typeof logger),
): Promise<void> {
  const { token, user } = getPushoverConfig();
  if (!token || !user) return;

  const body = new URLSearchParams({
    token,
    user,
    title: "🎬 New Access Request",
    message: [
      `<b>${name}</b> wants to join noahflix`,
      `Plex: <b>${plexUsername}</b>`,
      `Email: ${email}`,
      message ? `\n${message}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: "1",
    url: `mailto:${email}?subject=Re%3A%20noahflix%20Access%20Request`,
    url_title: `Reply to ${name}`,
    priority: "0",
    sound: "magic",
  });

  try {
    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = (await res.json()) as { status: number; errors?: string[] };
    if (data.status !== 1) {
      log.warn({ errors: data.errors }, "Pushover notification failed");
    }
  } catch (err) {
    log.warn({ err }, "Pushover notification error — email was still sent");
  }
}

function loadTurnstiteSiteKey(): string {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf8");
    const parsed = yaml.load(raw) as Record<string, unknown>;
    const t = parsed.turnstile as Record<string, string> | undefined;
    return t?.site_key ?? "";
  } catch {
    return "";
  }
}

router.get("/access-config", (_req, res): void => {
  res.json({ captcha_site_key: loadTurnstiteSiteKey() });
});

router.post("/access-request", limiter, async (req, res): Promise<void> => {
  const { name, plex_username, email, message, turnstile_token, _hp, _ts } =
    req.body as {
      name?: unknown;
      plex_username?: unknown;
      email?: unknown;
      message?: unknown;
      turnstile_token?: unknown;
      _hp?: unknown;
      _ts?: unknown;
    };

  const ip =
    (req.headers["cf-connecting-ip"] as string) ??
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.ip ??
    "unknown";

  // Honeypot — silent success so bots think it worked
  if (typeof _hp === "string" && _hp.length > 0) {
    req.log.warn({ ip }, "Honeypot triggered on access request");
    res.json({ success: true, message: "Your request has been sent!" });
    return;
  }

  // Time check — bots submit forms instantly
  const loadTime = typeof _ts === "number" ? _ts : 0;
  if (Date.now() - loadTime < MIN_SUBMIT_MS) {
    req.log.warn({ ip, elapsed: Date.now() - loadTime }, "Access request submitted too quickly");
    res.status(400).json({
      success: false,
      message: "Please take a moment to fill out the form completely.",
    });
    return;
  }

  // Input validation
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100
  ) {
    res.status(400).json({ success: false, message: "Please enter your name." });
    return;
  }

  if (
    typeof plex_username !== "string" ||
    !isValidPlexUsername(plex_username.trim())
  ) {
    res.status(400).json({
      success: false,
      message:
        "Please enter a valid Plex username (3–50 characters, letters, numbers, dots, dashes, underscores only).",
    });
    return;
  }

  if (typeof email !== "string" || !isValidEmail(email.trim())) {
    res.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
    return;
  }

  // Turnstile CAPTCHA — only enforced when a site key is configured
  const captchaSiteKey = loadTurnstiteSiteKey();
  if (captchaSiteKey) {
    if (typeof turnstile_token !== "string" || !turnstile_token) {
      res.status(400).json({
        success: false,
        message: "Please complete the security check.",
      });
      return;
    }

    const captchaOk = await verifyTurnstile(turnstile_token as string, ip);
    if (!captchaOk) {
      res.status(400).json({
        success: false,
        message: "Security check failed. Please refresh the page and try again.",
      });
      return;
    }
  } else {
    req.log.warn({ ip }, "Turnstile site_key not configured — skipping CAPTCHA check");
  }

  // Sanitize
  const safeName = sanitize(name, 100);
  const safePlex = sanitize(plex_username, 50);
  const safeEmail = sanitize(email, 254);
  const safeMessage =
    typeof message === "string" ? sanitize(message, 1000) : "";

  // Send email
  const smtp = getSmtpConfig();
  if (!smtp.host) {
    req.log.error("SMTP_HOST not configured — cannot send access request email");
    res.status(500).json({
      success: false,
      message:
        "Email service is not configured. Please contact the admin directly.",
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>New Access Request</title></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#13131f;border-radius:16px;overflow:hidden;border:1px solid #1e1e3a;">
    <div style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:24px 28px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎬 New Access Request</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Someone wants to join noahflix</p>
    </div>
    <div style="padding:28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;width:130px;vertical-align:top;">Name</td>
          <td style="padding:10px 0;color:#f3f4f6;font-weight:600;">${safeName}</td>
        </tr>
        <tr style="border-top:1px solid #1e1e3a;">
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;">Plex Username</td>
          <td style="padding:10px 0;">
            <code style="background:#7c3aed;color:#fff;padding:3px 10px;border-radius:6px;font-size:14px;font-family:monospace;">${safePlex}</code>
          </td>
        </tr>
        <tr style="border-top:1px solid #1e1e3a;">
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;">Reply Email</td>
          <td style="padding:10px 0;"><a href="mailto:${safeEmail}" style="color:#a78bfa;text-decoration:none;">${safeEmail}</a></td>
        </tr>
        ${
          safeMessage
            ? `<tr style="border-top:1px solid #1e1e3a;">
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;">Message</td>
          <td style="padding:10px 0;color:#d1d5db;">${safeMessage}</td>
        </tr>`
            : ""
        }
        <tr style="border-top:1px solid #1e1e3a;">
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;">IP Address</td>
          <td style="padding:10px 0;color:#4b5563;font-size:12px;font-family:monospace;">${ip}</td>
        </tr>
      </table>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1e1e3a;">
        <a href="mailto:${safeEmail}?subject=Re%3A%20noahflix%20Access%20Request&body=Hi%20${encodeURIComponent(safeName)}%2C%0A%0AYour%20Plex%20invite%20has%20been%20sent%20to%20your%20email.%0A%0AThanks%2C%0ANoah"
           style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Reply to ${safeName}
        </a>
      </div>
    </div>
    <div style="padding:12px 28px;border-top:1px solid #1e1e3a;background:#0d0d1a;">
      <p style="margin:0;color:#374151;font-size:11px;">Sent from noahflix.net &middot; ${new Date().toUTCString()}</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: smtp.from,
      to: ACCESS_TO_EMAIL,
      replyTo: safeEmail,
      subject: `🎬 Access Request: ${safePlex} (${safeName})`,
      html,
      text: [
        "New noahflix Access Request",
        "",
        `Name:          ${safeName}`,
        `Plex Username: ${safePlex}`,
        `Email:         ${safeEmail}`,
        safeMessage ? `Message:       ${safeMessage}` : "",
        "",
        `IP:   ${ip}`,
        `Time: ${new Date().toISOString()}`,
      ]
        .filter((l) => l !== undefined)
        .join("\n"),
    });

    req.log.info({ ip, plex: safePlex }, "Access request email sent");

    // Fire-and-forget — Pushover failure never blocks the user's response
    void sendPushover(safeName, safePlex, safeEmail, safeMessage, logger);

    res.json({
      success: true,
      message: "Your request has been sent! You'll hear back soon.",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send access request email");
    res.status(500).json({
      success: false,
      message: "Failed to send your request. Please try again later.",
    });
  }
});

export default router;
