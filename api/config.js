// Public settings the sign-in page needs. The anon key is designed to be public;
// row level security in the database decides what each person can see.
import { env, route } from "./_lib.js";
export default route(async () => ({
  supabaseUrl: env.supabaseUrl,
  supabaseAnonKey: env.anonKey,
  domain: env.domain,
  google: !!(env.googleId && env.googleSecret),
  metabase: !!(env.mbUrl && env.mbKey),
  ai: !!env.aiKey,
}), { auth: false });
