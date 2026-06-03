import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { AuthLoginBody, AuthLoginResponse, GetAuthMeResponse, AuthLogoutResponse } from "@workspace/api-zod";

const router: IRouter = Router();

export const COOKIE_NAME = "mf_auth";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Derive a stable token from SESSION_SECRET so sessions survive API restarts.
// Falls back to a random token in dev when no secret is configured.
const secret = process.env.SESSION_SECRET?.trim() ?? "";
const AUTH_TOKEN = secret
  ? crypto.createHmac("sha256", secret).update("mf_auth_v1").digest("hex")
  : crypto.randomBytes(32).toString("hex");

// Dedicated rate limiter for login — 10 attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json(
      AuthLoginResponse.parse({ success: false, message: "Too many login attempts. Try again in 15 minutes." }),
    );
  },
});

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = (req as Request & { cookies: Record<string, string> }).cookies?.[COOKIE_NAME];
  if (token && token === AUTH_TOKEN) {
    next();
    return;
  }
  res.status(401).json({ success: false, message: "Unauthorized" });
}

router.get("/auth/me", (req, res): void => {
  const cookies = (req as Request & { cookies: Record<string, string> }).cookies ?? {};
  const authenticated = cookies[COOKIE_NAME] === AUTH_TOKEN;
  res.json(GetAuthMeResponse.parse({ authenticated }));
});

router.post("/auth/login", loginLimiter, (req, res): void => {
  const configuredPassword = process.env.METRICS_PASSWORD?.trim();

  if (!configuredPassword) {
    res.status(503).json(
      AuthLoginResponse.parse({ success: false, message: "Metrics password not configured. Set METRICS_PASSWORD in .env." }),
    );
    return;
  }

  const parsed = AuthLoginBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.password) {
    res.status(400).json(AuthLoginResponse.parse({ success: false, message: "Password required." }));
    return;
  }

  const a = Buffer.from(parsed.data.password);
  const b = Buffer.from(configuredPassword);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json(AuthLoginResponse.parse({ success: false, message: "Incorrect password." }));
    return;
  }

  res.cookie(COOKIE_NAME, AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE_MS,
  });
  res.json(AuthLoginResponse.parse({ success: true, message: "Authenticated." }));
});

router.post("/auth/logout", (req, res): void => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "strict" });
  res.json(AuthLogoutResponse.parse({ success: true, message: "Logged out." }));
});

export default router;
