// Shared helpers for the My Day server routes. No dependencies: plain fetch (Node 24).

export const env = {
  supabaseUrl: (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""),
  anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  domain: (process.env.ALLOWED_DOMAIN || "contactout.io").toLowerCase(),
  googleId: process.env.GOOGLE_CLIENT_ID || "",
  googleSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  mbUrl: (process.env.METABASE_URL || "").replace(/\/$/, ""),
  mbKey: process.env.METABASE_API_KEY || "",
  mbDb: Number(process.env.METABASE_DB_ID || 4),
  aiKey: process.env.ANTHROPIC_API_KEY || "",
  aiModel: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
};

export class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

// Wraps a route: POST only, JSON in/out, errors as {error:{code,message}}.
export function route(fn, { auth = true } = {}) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (auth && req.method !== "POST") throw new HttpError(405, "method_not_allowed");
      const user = auth ? await currentUser(req) : null;
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const out = await fn({ req, user, body });
      res.status(200).json(out ?? {});
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (!(e instanceof HttpError)) console.error(e);
      res.status(status).json({ error: { code: e.code || "server_error", message: status >= 500 ? "Something went wrong on the server" : e.message } });
    }
  };
}

// Checks the Supabase sign-in token and the company email domain.
export async function currentUser(req) {
  if (!env.supabaseUrl || !env.anonKey) throw new HttpError(503, "not_configured", "Supabase isn't set up yet");
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new HttpError(401, "needs_reauth", "Sign in again");
  const r = await fetch(`${env.supabaseUrl}/auth/v1/user`, { headers: { apikey: env.anonKey, Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new HttpError(401, "needs_reauth", "Sign in again");
  const u = await r.json();
  const email = String(u.email || "").toLowerCase();
  if (!email.endsWith("@" + env.domain)) throw new HttpError(403, "not_granted", "Use your company Google account");
  return { id: u.id, email, name: (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || "" };
}

// Server-only database access (service role). Never sent to the browser.
export async function db(path, { method = "GET", body, prefer } = {}) {
  if (!env.serviceKey) throw new HttpError(503, "not_configured", "Server database key missing");
  const r = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`db ${method} ${path.split("?")[0]} ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

// A fresh Google access token for this user (read-only Gmail + Calendar), refreshed when needed.
export async function googleToken(userId) {
  const rows = await db(`google_tokens?user_id=eq.${encodeURIComponent(userId)}&select=*`);
  const row = rows && rows[0];
  if (!row || !row.refresh_token) {
    if (row && row.access_token && row.expires_at && new Date(row.expires_at) > new Date(Date.now() + 60e3)) return row.access_token;
    throw new HttpError(409, "needs_reauth", "Reconnect Google");
  }
  if (row.access_token && row.expires_at && new Date(row.expires_at) > new Date(Date.now() + 60e3)) return row.access_token;
  if (!env.googleId || !env.googleSecret) throw new HttpError(503, "not_configured", "Google client isn't set up yet");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.googleId, client_secret: env.googleSecret, refresh_token: row.refresh_token, grant_type: "refresh_token" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new HttpError(409, "needs_reauth", "Reconnect Google");
  const expires_at = new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString();
  await db(`google_tokens?user_id=eq.${encodeURIComponent(userId)}`, { method: "PATCH", body: { access_token: j.access_token, expires_at, updated_at: new Date().toISOString() } });
  return j.access_token;
}

export async function google(userId, url) {
  const tok = await googleToken(userId);
  const r = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } });
  if (r.status === 401 || r.status === 403) throw new HttpError(409, "needs_reauth", "Reconnect Google");
  if (!r.ok) throw new HttpError(502, "google_error", `Google returned ${r.status}`);
  return r.json();
}

// Runs async jobs with a small concurrency limit, keeping order.
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
