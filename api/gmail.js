// Read-only Gmail: finds threads and returns sender/recipient/date metadata. Never reads bodies, never sends.
import { route, google, pool, HttpError } from "./_lib.js";

const G = "https://gmail.googleapis.com/gmail/v1/users/me";
const HEADERS = ["From", "To", "Cc", "Subject", "Date"].map(h => "metadataHeaders=" + h).join("&");

// Splits "A <a@x.com>, \"Last, First\" <b@y.com>" into separate addresses.
export function splitAddrs(s) {
  const out = []; let cur = "", q = false, angle = false;
  for (const ch of String(s || "")) {
    if (ch === '"') q = !q;
    if (ch === "<") angle = true;
    if (ch === ">") angle = false;
    if (ch === "," && !q && !angle) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function toMessage(m) {
  const h = {}; ((m.payload && m.payload.headers) || []).forEach(x => { h[x.name.toLowerCase()] = x.value; });
  const ms = Number(m.internalDate || 0);
  return {
    id: m.id, threadId: m.threadId, labelIds: m.labelIds || [], snippet: m.snippet || "",
    sender: h.from || "", toRecipients: splitAddrs(h.to), ccRecipients: splitAddrs(h.cc),
    subject: h.subject || "", internalDate: String(ms), date: ms ? new Date(ms).toISOString() : (h.date || ""),
  };
}

export function toThread(t) {
  const messages = (t.messages || []).map(toMessage);
  return { id: t.id, messages, messageCount: messages.length, viewUrl: `https://mail.google.com/mail/u/0/#all/${t.id}` };
}

export default route(async ({ user, body }) => {
  if (body.op === "thread") {
    if (!/^[A-Za-z0-9]+$/.test(String(body.threadId || ""))) throw new HttpError(400, "invalid_argument", "Bad thread id");
    const t = await google(user.id, `${G}/threads/${body.threadId}?format=metadata&${HEADERS}`);
    return { messages: toThread(t).messages };
  }
  if (body.op !== "search") throw new HttpError(400, "invalid_argument", "Unknown operation");
  const q = String(body.query || "").slice(0, 500);
  const size = Math.min(Math.max(Number(body.pageSize) || 25, 1), 50);
  const page = body.pageToken ? `&pageToken=${encodeURIComponent(String(body.pageToken))}` : "";
  const list = await google(user.id, `${G}/threads?maxResults=${size}&q=${encodeURIComponent(q)}${page}`);
  const ids = (list.threads || []).map(t => t.id);
  const threads = await pool(ids, 10, id => google(user.id, `${G}/threads/${id}?format=metadata&${HEADERS}`).then(toThread).catch(() => null));
  return { threads: threads.filter(Boolean), nextPageToken: list.nextPageToken || null };
});
