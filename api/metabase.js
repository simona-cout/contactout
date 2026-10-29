// Metabase: the server builds the SQL itself. The browser only says which of two queries it wants,
// so nobody can run their own SQL against the company database through this route.
import { route, env, db, HttpError } from "./_lib.js";

export function buildSql(body) {
  if (body.kind === "accounts") {
    const id = String(body.salesId || "").trim();
    const off = Math.max(0, Math.min(Number(body.offset) || 0, 20000));
    if (!/^\d{1,12}$/.test(id)) throw new HttpError(400, "invalid_argument", "Add your Metabase sales ID (numbers only) in Settings");
    return { id, sql: `SELECT c.id, c.domain, c.name, c.deal_status, c.sales_assigned_date, c.last_transferred_date, c.amount_received, c.paid_date, c.expiration_date, c.linkedin, s.industry, s.size, s.location, s.user_count, s.active_users_count, s.credit_30, s.credit_all, s.last_contact_assigned_rep, s.last_reply, s.last_meeting, s.action, (SELECT MIN(p.paid_date) FROM company_deal_payments p JOIN company_deal_statuses ds ON ds.id = p.company_deal_status_id WHERE ds.company_id = c.id AND p.deleted_at IS NULL) AS first_paid, (SELECT MAX(p.paid_date) FROM company_deal_payments p JOIN company_deal_statuses ds ON ds.id = p.company_deal_status_id WHERE ds.company_id = c.id AND p.deleted_at IS NULL) AS last_paid, (SELECT SUM(p.amount_received) FROM company_deal_payments p JOIN company_deal_statuses ds ON ds.id = p.company_deal_status_id WHERE ds.company_id = c.id AND p.deleted_at IS NULL AND p.paid_date >= COALESCE(c.last_transferred_date, c.sales_assigned_date)) AS paid_since_claim FROM companies c LEFT JOIN company_statistics s ON s.domain = c.domain WHERE c.sales_id = ${id} ORDER BY c.id LIMIT 500 OFFSET ${off - (off % 500)}` };
  }
  if (body.kind === "users") {
    const dom = String(body.domain || "").toLowerCase();
    if (!/^[a-z0-9.-]{3,100}$/.test(dom)) throw new HttpError(400, "invalid_argument", "Bad domain");
    return { sql: `SELECT name, email, last_revealed_at FROM users WHERE email_domain = '${dom}' ORDER BY last_revealed_at IS NULL, last_revealed_at DESC LIMIT 60` };
  }
  throw new HttpError(400, "invalid_argument", "Unknown query");
}

export default route(async ({ user, body }) => {
  if (!env.mbUrl || !env.mbKey) throw new HttpError(503, "server_not_connected", "Metabase isn't set up yet");
  const { sql, id } = buildSql(body);
  if (id) db(`profiles?id=eq.${user.id}`, { method: "PATCH", body: { sales_id: id } }).catch(() => {});
  const r = await fetch(`${env.mbUrl}/api/dataset`, {
    method: "POST",
    headers: { "x-api-key": env.mbKey, "Content-Type": "application/json" },
    body: JSON.stringify({ database: env.mbDb, type: "native", native: { query: sql } }),
  });
  if (r.status === 401 || r.status === 403) throw new HttpError(502, "needs_reauth", "Metabase key was refused");
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new HttpError(502, "metabase_error", "Metabase query failed");
  const d = j.data || {};
  return { data: { cols: (d.cols || []).map(c => ({ name: c.name })), rows: d.rows || [] } };
});
