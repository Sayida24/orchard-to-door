import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Password-reset emails are sent by Supabase Auth. Orchiva still keeps its own users and
// passwords (NextAuth + the User table): Supabase only emails the link and later confirms
// that the person opening it controls that email address. Server-only: uses the service role key.

let client: SupabaseClient | undefined;

function supabase() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: "implicit" },
  });
  return client;
}

/**
 * Asks Supabase Auth to email a reset link that opens `redirectTo`. The first time, it adds
 * a matching Supabase Auth user (email only, no password). Returns false if nothing was sent.
 */
export async function sendSupabaseResetEmail(email: string, redirectTo: string) {
  const sb = supabase();
  if (!sb) return false;
  try {
    const created = await sb.auth.admin.createUser({ email, email_confirm: true });
    if (created.error && created.error.code !== "email_exists" && created.error.code !== "user_already_exists") {
      console.error("Supabase Auth: couldn't add user:", created.error.code ?? created.error.message);
      return false;
    }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("Supabase Auth: reset email not sent:", error.code ?? error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase Auth: reset email failed:", e);
    return false;
  }
}

/** The email address a Supabase reset link was sent to, if its access token is still valid. */
export async function emailFromRecoveryToken(accessToken: string) {
  const sb = supabase();
  if (!sb || !accessToken || accessToken.length > 4000) return null;
  const { data, error } = await sb.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return data.user.email.toLowerCase();
}

/** Ends the Supabase session from a reset link, so the same link can't be used twice. */
export async function endRecoverySession(accessToken: string) {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.auth.admin.signOut(accessToken, "global");
  if (error) console.error("Supabase Auth: couldn't end reset session:", error.code ?? error.message);
}
