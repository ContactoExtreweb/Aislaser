"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

let client: SupabaseClient | undefined;

/** keepalive en peticiones pequeñas para que un guardado al cerrar la pestaña llegue (máx. 64 KB) */
const keepaliveFetch: typeof fetch = (input, init) => {
  const body = init?.body;
  const small = body == null || (typeof body === "string" && body.length < 60_000);
  return fetch(input, small ? { ...init, keepalive: true } : init);
};

export function getSupabaseBrowser() {
  client ??= createBrowserClient(supabaseUrl, supabaseKey, { global: { fetch: keepaliveFetch } });
  return client;
}
