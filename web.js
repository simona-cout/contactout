// My Day on the web: Google sign-in + Supabase storage + server routes for Gmail, Calendar, Metabase and summaries.
// It provides the same window.claude.use(...) interface the app uses inside Claude, so the app code is identical in both places.
(function () {
  "use strict";
  window.MYDAY_WEB = true;
  const NEVER = new Promise(() => {});
  let sb = null, session = null, CFG = {};

  // ---------- small UI: sign-in screen, banner, account menu ----------
  const css = `
  .mdw-wrap{position:fixed;inset:0;display:grid;place-items:center;background:#F6F5F2;z-index:1000;font-family:Figtree,system-ui,sans-serif;padding:16px}
  .mdw-card{background:#fff;border-radius:18px;box-shadow:0 0 0 1px #E5E3DE,0 12px 40px rgba(0,0,0,.08);padding:32px 28px;max-width:400px;width:100%;display:flex;flex-direction:column;gap:14px;text-align:center}
  .mdw-logo{width:44px;height:44px;border-radius:12px;background:#23252A;color:#fff;display:grid;place-items:center;margin:0 auto}
  .mdw-card h1{margin:0;font-size:22px;color:#23252A}.mdw-card p{margin:0;color:#6B6D73;font-size:14.5px;line-height:1.45}
  .mdw-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border:1px solid #D9D6D0;background:#fff;border-radius:10px;padding:11px 16px;font:600 15px Figtree,system-ui,sans-serif;color:#23252A;cursor:pointer}
  .mdw-btn:hover{background:#F2F1ED}.mdw-err{color:#B3261E!important;font-weight:600}
  .mdw-banner{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;z-index:999;background:#23252A;color:#fff;border-radius:10px;padding:9px 14px;font:500 13.5px Figtree,system-ui,sans-serif;max-width:calc(100vw - 32px)}
  .mdw-menu{position:fixed;z-index:999;background:#fff;border-radius:12px;box-shadow:0 0 0 1px #E5E3DE,0 10px 30px rgba(0,0,0,.12);padding:6px;display:flex;flex-direction:column;min-width:220px;font-family:Figtree,system-ui,sans-serif}
  .mdw-menu small{color:#6B6D73;padding:6px 10px 4px;font-size:12.5px}
  .mdw-menu button{border:0;background:none;text-align:left;padding:9px 10px;border-radius:8px;font:500 14px Figtree,system-ui,sans-serif;color:#23252A;cursor:pointer}
  .mdw-menu button:hover{background:#F2F1ED}
  @media (prefers-color-scheme:dark){.mdw-wrap{background:#1C1D20}.mdw-card,.mdw-menu{background:#26282C;box-shadow:0 0 0 1px #34363B}.mdw-card h1,.mdw-btn,.mdw-menu button{color:#EDEDEF}.mdw-btn{background:#26282C;border-color:#3A3C41}.mdw-btn:hover,.mdw-menu button:hover{background:#303237}}`;
  function style() { if (document.getElementById("mdw-css")) return; const s = document.createElement("style"); s.id = "mdw-css"; s.textContent = css; document.head.appendChild(s); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const G_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

  function signInScreen(msg, isErr) {
    style();
    const w = document.createElement("div"); w.className = "mdw-wrap"; w.id = "mdw-login";
    w.innerHTML = `<div class="mdw-card" role="dialog" aria-labelledby="mdw-h"><div class="mdw-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg></div>
      <h1 id="mdw-h">My Day</h1><p>Sign in with your <b>@${esc(CFG.domain || "contactout.io")}</b> Google account. Your pipeline is private to you.</p>
      ${msg ? `<p class="${isErr ? "mdw-err" : ""}">${esc(msg)}</p>` : ""}
      <button class="mdw-btn" id="mdw-go">${G_ICON}Sign in with Google</button>
      <p style="font-size:12.5px">My Day reads Gmail and Calendar to log your touches. It never drafts or sends email.</p></div>`;
    const put = () => { document.body.appendChild(w); document.getElementById("mdw-go").onclick = signIn; };
    document.body ? put() : document.addEventListener("DOMContentLoaded", put);
  }
  function banner(text) { style(); const b = document.createElement("div"); b.className = "mdw-banner"; b.textContent = text; const put = () => document.body.appendChild(b); document.body ? put() : document.addEventListener("DOMContentLoaded", put); }

  function signIn() {
    return sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: location.origin + location.pathname,
        scopes: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly",
        queryParams: { access_type: "offline", prompt: "consent", hd: CFG.domain || "contactout.io" },
      },
    });
  }

  function accountMenu() {
    document.addEventListener("click", e => {
      const me = e.target.closest && e.target.closest(".me");
      const old = document.getElementById("mdw-menu");
      if (old && !e.target.closest("#mdw-menu")) old.remove();
      if (!me || old) return;
      const r = me.getBoundingClientRect(), m = document.createElement("div");
      m.className = "mdw-menu"; m.id = "mdw-menu";
      m.style.left = Math.max(8, r.left) + "px"; m.style.bottom = (innerHeight - r.top + 6) + "px";
      m.innerHTML = `<small>${esc(session.user.email)}</small><button data-m="re">Reconnect Gmail and Calendar</button><button data-m="out">Sign out</button>`;
      m.onclick = async ev => { const k = ev.target.dataset.m; if (k === "re") signIn(); if (k === "out") { await sb.auth.signOut(); location.reload(); } };
      document.body.appendChild(m);
    });
  }

  // ---------- server routes ----------
  async function token() { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : ""; }
  async function api(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (await token()) }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || "Request failed"); e.code = (j.error && j.error.code) || (r.status === 401 ? "needs_reauth" : "unavailable"); throw e; }
    return j;
  }

  // ---------- db: same calls the app makes inside Claude, stored in the Supabase "docs" table ----------
  const T = () => sb.from("docs");
  const snapDoc = (id, data) => ({ id, exists: data !== undefined, data: () => (data === undefined ? undefined : JSON.parse(JSON.stringify(data))) });
  const fail = e => { const x = new Error(e.message || "Couldn't save"); x.code = /quota|size/i.test(e.message || "") ? "quota_exceeded" : e.code === "42501" ? "permission_denied" : "unavailable"; return x; };
  function docRef(coll, id) {
    return {
      id,
      async get() { const { data, error } = await T().select("data").eq("coll", coll).eq("id", id).maybeSingle(); if (error) throw fail(error); return snapDoc(id, data ? data.data : undefined); },
      async set(v) { const { error } = await T().upsert({ coll, id, data: v }, { onConflict: "coll,id" }); if (error) throw fail(error); },
      async update(patch) {
        const { data, error } = await T().select("data").eq("coll", coll).eq("id", id).maybeSingle(); if (error) throw fail(error);
        if (!data) { const x = new Error("Not found"); x.code = "not_found"; throw x; }
        const r = await T().update({ data: { ...data.data, ...patch } }).eq("coll", coll).eq("id", id); if (r.error) throw fail(r.error);
      },
      async delete() { const { error } = await T().delete().eq("coll", coll).eq("id", id); if (error) throw fail(error); },
    };
  }
  let chan = 0;
  function query(coll, filters) {
    const run = async () => {
      let q = T().select("id,data").eq("coll", coll);
      filters.forEach(([f, v]) => { q = q.eq("data->>" + f, String(v)); });
      const { data, error } = await q; if (error) throw fail(error);
      const docs = (data || []).map(r => snapDoc(r.id, r.data));
      return { docs, empty: !docs.length, size: docs.length };
    };
    return {
      get: run,
      where(f, op, v) { if (op !== "==") throw new Error("Only == is supported"); return query(coll, filters.concat([[f, v]])); },
      doc(id) { return docRef(coll, id); },
      async add(v) { const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 20); await docRef(coll, id).set(v); return { id }; },
      onSnapshot(cb, onErr) {
        let t = null, live = true;
        const fire = () => run().then(s => live && cb(s)).catch(e => onErr && onErr(e));
        fire();
        const ch = sb.channel("docs-" + ++chan).on("postgres_changes", { event: "*", schema: "public", table: "docs", filter: "coll=eq." + coll }, () => { clearTimeout(t); t = setTimeout(fire, 350); }).subscribe();
        const iv = setInterval(fire, 120000);   // safety net if a live update is missed
        return () => { live = false; clearInterval(iv); sb.removeChannel(ch); };
      },
    };
  }
  const dbCap = { collection: path => query(String(path), []) };

  // ---------- user ----------
  const userCap = {
    async me() { const u = session.user, md = u.user_metadata || {}; return { id: u.id, name: md.full_name || md.name || u.email.split("@")[0], email: u.email }; },
    async profiles(ids) { const { data } = await sb.from("profiles").select("id,name,email").in("id", ids); const out = {}; (data || []).forEach(p => { out[p.id] = { name: p.name || (p.email || "").split("@")[0] }; }); return out; },
  };

  // ---------- connectors ----------
  const local = s => { const d = new Date(s); return isNaN(d) ? s : d.toISOString(); };
  const mcpCap = {
    async callTool(server, tool, a) {
      a = a || {};
      if (server === "Gmail" && tool === "search_threads") return { payload: await api("/api/gmail", { op: "search", query: a.query, pageSize: a.pageSize, pageToken: a.pageToken }) };
      if (server === "Gmail" && tool === "get_thread") return { payload: await api("/api/gmail", { op: "thread", threadId: a.threadId }) };
      if (server === "Google Calendar" && tool === "list_events") return { payload: await api("/api/calendar", { timeMin: local(a.startTime), timeMax: local(a.endTime), pageSize: a.pageSize, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) };
      if (server === "Metabase" && tool === "execute_sql") {
        const sql = String(a.sql || "");
        let m = sql.match(/FROM companies c .*WHERE c\.sales_id = (\d+) .*OFFSET (\d+)/);
        if (m) return { payload: await api("/api/metabase", { kind: "accounts", salesId: m[1], offset: +m[2] }) };
        m = sql.match(/FROM users WHERE email_domain = '([a-z0-9.-]+)'/);
        if (m) return { payload: await api("/api/metabase", { kind: "users", domain: m[1] }) };
        const e = new Error("Query not allowed"); e.code = "not_granted"; throw e;
      }
      const e = new Error("Not available"); e.code = "server_not_connected"; throw e;
    },
  };
  const sampleCap = { async json(prompt) { return (await api("/api/ai", { prompt })).result; } };

  // ---------- boot ----------
  window.MYDAY_BOOT = (async () => {
    try { CFG = await fetch("/api/config").then(r => r.json()); } catch (e) { CFG = {}; }
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey || !window.supabase) { banner("Setup isn't finished: saving in this browser only."); return false; }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
    const url = new URL(location.href), oauthErr = url.searchParams.get("error_description");
    ({ data: { session } } = await sb.auth.getSession());
    if (!session) { signInScreen(oauthErr ? "Sign-in didn't finish: " + oauthErr : ""); return NEVER; }
    const email = String(session.user.email || "").toLowerCase();
    if (!email.endsWith("@" + (CFG.domain || "contactout.io"))) { await sb.auth.signOut(); signInScreen(`${email} isn't a ${CFG.domain} account. Use your work Google account.`, true); return NEVER; }
    if (url.searchParams.has("code")) history.replaceState(null, "", location.pathname);
    if (session.provider_refresh_token || session.provider_token) api("/api/google-token", { refresh_token: session.provider_refresh_token || "", access_token: session.provider_token || "" }).catch(() => {});
    const md = session.user.user_metadata || {};
    sb.from("profiles").upsert({ id: session.user.id, email, name: md.full_name || md.name || email.split("@")[0], updated_at: new Date().toISOString() }).then(() => {}, () => {});
    sb.auth.onAuthStateChange((ev, s) => { if (s) session = s; if (ev === "SIGNED_OUT") location.reload(); });
    accountMenu();
    const caps = { db: dbCap, user: userCap, mcp: mcpCap, sample: CFG.ai ? sampleCap : null, downloads: null };
    window.claude = { use: async n => { if (!caps[n]) { const e = new Error("Not available"); e.code = "not_granted"; throw e; } return caps[n]; } };
    return true;
  })();
})();
