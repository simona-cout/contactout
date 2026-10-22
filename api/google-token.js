// Saves the Google tokens from sign-in so the server can read Gmail and Calendar (read-only) later.
import { route, db, HttpError } from "./_lib.js";
export default route(async ({ user, body }) => {
  const refresh = typeof body.refresh_token === "string" ? body.refresh_token : "";
  const access = typeof body.access_token === "string" ? body.access_token : "";
  if (!refresh && !access) throw new HttpError(400, "invalid_argument", "No token");
  const row = { user_id: user.id, updated_at: new Date().toISOString() };
  if (refresh) row.refresh_token = refresh;
  if (access) { row.access_token = access; row.expires_at = new Date(Date.now() + 50 * 60e3).toISOString(); }
  await db("google_tokens?on_conflict=user_id", { method: "POST", body: row, prefer: "resolution=merge-duplicates" });
  return { ok: true };
});
