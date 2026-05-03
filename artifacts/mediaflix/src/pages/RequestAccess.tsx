import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Film, ExternalLink } from "lucide-react";
import { useGetConfig } from "@workspace/api-client-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

type FormState = "idle" | "loading" | "success" | "error";

export default function RequestAccess() {
  const { data: config } = useGetConfig();
  const siteKey = config?.captcha_site_key ?? "";

  const [name, setName] = useState("");
  const [plexUsername, setPlexUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [responseMessage, setResponseMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadTimeRef = useRef<number>(Date.now());
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!siteKey) return;

    const scriptId = "cf-turnstile-script";

    const tryRender = () => {
      if (widgetIdRef.current) return;
      if (turnstileContainerRef.current && window.turnstile) {
        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
          "error-callback": () => setTurnstileToken(""),
        });
      }
    };

    if (document.getElementById(scriptId)) {
      // Script already loaded — try to render immediately, then poll briefly
      tryRender();
      if (!widgetIdRef.current) {
        const interval = setInterval(() => {
          tryRender();
          if (widgetIdRef.current) clearInterval(interval);
        }, 100);
        setTimeout(() => clearInterval(interval), 5000);
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => tryRender();
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2)
      errors.name = "Please enter your name.";
    if (!plexUsername.trim() || !/^[a-zA-Z0-9._-]{3,50}$/.test(plexUsername.trim()))
      errors.plexUsername =
        "Enter a valid Plex username (3–50 chars, letters/numbers/dots/dashes/underscores).";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Please enter a valid email address.";
    if (siteKey && !turnstileToken)
      errors.captcha = "Please complete the security check.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setFormState("loading");
    setResponseMessage("");

    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          plex_username: plexUsername.trim(),
          email: email.trim(),
          message: message.trim(),
          turnstile_token: turnstileToken,
          _hp: honeypot,
          _ts: loadTimeRef.current,
        }),
      });

      const data = (await res.json()) as { success: boolean; message: string };

      if (data.success) {
        setFormState("success");
        setResponseMessage(data.message);
      } else {
        setFormState("error");
        setResponseMessage(data.message);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken("");
        }
      }
    } catch {
      setFormState("error");
      setResponseMessage("Something went wrong. Please try again.");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
        setTurnstileToken("");
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(219,39,119,0.1) 0%, transparent 60%)",
        }}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <Link href="/">
            <span className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors mb-8 cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </span>
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Request Access</h1>
          </div>
          <p className="text-white/50 text-sm mb-8">
            Get access to stream on noahflix
          </p>

          {formState === "success" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Request Sent!</h2>
              <p className="text-white/60 text-sm mb-6">{responseMessage}</p>
              <Link href="/">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                  Back to home
                </span>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
              <div className="bg-purple-950/40 border-b border-white/10 px-6 py-4">
                <h2 className="font-semibold text-sm text-white/90">
                  Before you fill out this form
                </h2>
                <p className="text-white/50 text-xs mt-0.5">
                  You need a free Plex account to watch on noahflix
                </p>
              </div>

              <div className="px-6 py-4 border-b border-white/10">
                <ol className="space-y-3">
                  <li className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                      1
                    </span>
                    <div>
                      <span className="text-white/80">
                        Create a free account at{" "}
                      </span>
                      <a
                        href="https://www.plex.tv/sign-up/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-0.5"
                      >
                        plex.tv
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                      <span className="text-white/50 block text-xs mt-0.5">
                        Choose any username — you'll enter it below
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                      2
                    </span>
                    <span className="text-white/80">
                      Fill out the form below and click{" "}
                      <strong className="text-white">Send Request</strong>
                    </span>
                  </li>
                  <li className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                      3
                    </span>
                    <span className="text-white/80">
                      Once approved, you'll receive a Plex invite by email
                    </span>
                  </li>
                </ol>
              </div>

              <form onSubmit={handleSubmit} noValidate className="px-6 py-6 space-y-4">
                {/* Honeypot — hidden from real users, bots fill it */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                  }}
                >
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name or full name"
                    maxLength={100}
                    autoComplete="name"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 transition-all ${
                      fieldErrors.name
                        ? "border-red-500/60 focus:ring-red-500/30"
                        : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/20"
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-400 text-xs mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Plex username
                  </label>
                  <input
                    type="text"
                    value={plexUsername}
                    onChange={(e) => setPlexUsername(e.target.value)}
                    placeholder="your_plex_username"
                    maxLength={50}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 font-mono outline-none focus:ring-2 transition-all ${
                      fieldErrors.plexUsername
                        ? "border-red-500/60 focus:ring-red-500/30"
                        : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/20"
                    }`}
                  />
                  {fieldErrors.plexUsername ? (
                    <p className="text-red-400 text-xs mt-1">
                      {fieldErrors.plexUsername}
                    </p>
                  ) : (
                    <p className="text-white/30 text-xs mt-1">
                      Found under Settings → Account on plex.tv
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Your email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={254}
                    autoComplete="email"
                    className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-2 transition-all ${
                      fieldErrors.email
                        ? "border-red-500/60 focus:ring-red-500/30"
                        : "border-white/10 focus:border-purple-500/60 focus:ring-purple-500/20"
                    }`}
                  />
                  {fieldErrors.email ? (
                    <p className="text-red-400 text-xs mt-1">
                      {fieldErrors.email}
                    </p>
                  ) : (
                    <p className="text-white/30 text-xs mt-1">
                      Used to send your Plex invite and reply to your request
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Message{" "}
                    <span className="text-white/30 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Who are you? How do you know the server owner?"
                    maxLength={1000}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>

                {siteKey ? (
                  <div>
                    <div ref={turnstileContainerRef} />
                    {fieldErrors.captcha && (
                      <p className="text-red-400 text-xs mt-1">
                        {fieldErrors.captcha}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400/80">
                    CAPTCHA is not configured. Set{" "}
                    <code className="font-mono">turnstile.site_key</code> in{" "}
                    <code className="font-mono">settings.yaml</code> to enable bot protection.
                  </div>
                )}

                {formState === "error" && responseMessage && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{responseMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formState === "loading"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {formState === "loading" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Request"
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
