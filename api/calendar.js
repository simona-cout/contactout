// Read-only Google Calendar: this week's events from the primary calendar.
import { route, google, HttpError } from "./_lib.js";
export default route(async ({ user, body }) => {
  const min = new Date(body.timeMin), max = new Date(body.timeMax);
  if (isNaN(min) || isNaN(max) || max - min > 40 * 864e5) throw new HttpError(400, "invalid_argument", "Bad date range");
  const p = new URLSearchParams({ timeMin: min.toISOString(), timeMax: max.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: String(Math.min(Number(body.pageSize) || 150, 250)) });
  if (body.timeZone) p.set("timeZone", String(body.timeZone).slice(0, 60));
  const r = await google(user.id, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`);
  const events = (r.items || []).map(e => ({ ...e, conferenceUrl: e.hangoutLink || ((e.conferenceData && e.conferenceData.entryPoints || []).find(x => x.entryPointType === "video") || {}).uri || "" }));
  return { events };
});
