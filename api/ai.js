// Call-note summaries. The AI key stays on the server.
import { route, env, HttpError } from "./_lib.js";
export default route(async ({ body }) => {
  if (!env.aiKey) throw new HttpError(503, "not_granted", "Summaries aren't set up yet");
  const prompt = String(body.prompt || "").slice(0, 24000);
  if (!prompt.trim()) throw new HttpError(400, "invalid_argument", "Empty prompt");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.aiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.aiModel, max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
  });
  if (r.status === 429) throw new HttpError(429, "rate_limited", "Too many requests");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new HttpError(502, "ai_error", "Summary failed");
  const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  let out = null; try { out = m ? JSON.parse(m[0]) : null; } catch (e) { out = null; }
  return { result: out };
});
