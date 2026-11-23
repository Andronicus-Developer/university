import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

/**
 * Creates a privileged service-role Supabase admin client.
 * WARNING: Never import this in client-side code or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (input, init) => supabaseFetchWithRetry(input, init, 2, 4000),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const getAdminClient = createAdminClient;

/**
 * Creates a direct Supabase service-role client using native fetch (bypasses the virtual-DB
 * PostgREST interceptor) so Super Admin operations read/write directly to live Supabase tables
 * (`public.schools`, `public.profiles`, `public.school_memberships`, `auth.users`, etc.)
 * without touching or hijacking any browser auth session.
 */
export function createDirectAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createDirectAdminClient must only run on the server");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

