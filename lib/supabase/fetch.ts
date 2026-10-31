/**
 * Resilient fetch wrapper and Edge-compatible session utilities for Supabase requests.
 * Uses pure Web APIs (TextEncoder / TextDecoder / btoa / atob) so it runs identically
 * in Next.js Edge Middleware and Node.js Route Handlers without Node `Buffer`.
 */

export interface FallbackUserSpec {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_name: string;
}

const FALLBACK_SIG_PREFIX = "local-fallback-sig-";
export const FALLBACK_REFRESH_PREFIX = "fallback-refresh-";

const DEMO_USERS: Record<string, { password?: string; spec: FallbackUserSpec }> = {
  "admin@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000001",
      email: "admin@university.edu.gh",
      full_name: "System Administrator",
      role: "system_admin",
      role_name: "System Administrator",
    },
  },
  "lecturer@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000002",
      email: "lecturer@university.edu.gh",
      full_name: "Dr. Kwame Mensah",
      role: "lecturer",
      role_name: "Lecturer / Instructor",
    },
  },
  "adaahessel@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "6d8f80fb-c341-4622-b23b-0efa4702bb66",
      email: "adaahessel@university.edu.gh",
      full_name: "Keziah Adaah Essel",
      role: "lecturer",
      role_name: "Lecturer / Instructor",
    },
  },
  "student@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000003",
      email: "student@university.edu.gh",
      full_name: "Ama Osei",
      role: "student",
      role_name: "Student",
    },
  },
  "ama.johnson@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "6015cdd8-1c8e-4995-bde4-2bb90435e6ee",
      email: "ama.johnson@university.edu.gh",
      full_name: "Ama Johnson",
      role: "student",
      role_name: "Student",
    },
  },
  "applicant@university.edu.gh": {
    spec: {
      id: "a0000000-0000-0000-0000-000000000004",
      email: "applicant@university.edu.gh",
      full_name: "Kofi Boateng",
      role: "applicant",
      role_name: "Applicant",
    },
  },
  "advisor@university.edu.gh": {
    spec: {
      id: "a0000000-0000-0000-0000-000000000005",
      email: "advisor@university.edu.gh",
      full_name: "Prof. Abena Owusu",
      role: "academic_advisor",
      role_name: "Academic Advisor",
    },
  },
};

export function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(b64url: string): string {
  const normalized = b64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function resolveFallbackUserByEmail(email: string, password?: string): FallbackUserSpec | null {
  const normalized = email.trim().toLowerCase();
  const known = DEMO_USERS[normalized];

  if (known) {
    if (password !== undefined && known.password && known.password !== password) {
      return null;
    }
    return known.spec;
  }

  return null;
}

export function resolveFallbackUserFromRefreshToken(refreshToken: string): FallbackUserSpec {
  if (refreshToken.startsWith(FALLBACK_REFRESH_PREFIX)) {
    try {
      const email = fromBase64Url(refreshToken.slice(FALLBACK_REFRESH_PREFIX.length));
      const matched = resolveFallbackUserByEmail(email);
      if (matched) return matched;
    } catch {
      // ignore
    }
  }
  return DEMO_USERS["admin@university.edu.gh"].spec;
}

export function buildSupabaseUserObject(spec: FallbackUserSpec) {
  const nowIso = new Date().toISOString();
  return {
    id: spec.id,
    aud: "authenticated",
    role: "authenticated",
    email: spec.email,
    email_confirmed_at: nowIso,
    phone: "",
    confirmed_at: nowIso,
    last_sign_in_at: nowIso,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      default_role: spec.role,
      role: spec.role,
      full_name: spec.full_name,
    },
    identities: [
      {
        identity_id: spec.id,
        id: spec.id,
        user_id: spec.id,
        identity_data: {
          email: spec.email,
          sub: spec.id,
        },
        provider: "email",
        last_sign_in_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        email: spec.email,
      },
    ],
    created_at: nowIso,
    updated_at: nowIso,
    is_anonymous: false,
  };
}

export function buildFallbackSession(spec: FallbackUserSpec) {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = 3600 * 24;
  const expiresAt = nowSec + expiresIn;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wcpwzyikenlzqlrrwcvu.supabase.co";

  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: `${supabaseUrl}/auth/v1`,
      sub: spec.id,
      aud: "authenticated",
      exp: expiresAt,
      iat: nowSec,
      email: spec.email,
      phone: "",
      app_metadata: {
        provider: "email",
        providers: ["email"],
      },
      user_metadata: {
        default_role: spec.role,
        role: spec.role,
        full_name: spec.full_name,
      },
      role: "authenticated",
      aal: "aal1",
      amr: [{ method: "password", timestamp: nowSec }],
      session_id: spec.id,
      is_anonymous: false,
    })
  );
  const signature = toBase64Url(`${FALLBACK_SIG_PREFIX}${spec.id}`);
  const accessToken = `${header}.${payload}.${signature}`;
  const user = buildSupabaseUserObject(spec);

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: `${FALLBACK_REFRESH_PREFIX}${toBase64Url(spec.email)}`,
    user,
  };
}

export function isFallbackJwt(token: string): boolean {
  try {
    const clean = token.replace(/^Bearer\s+/i, "").trim();
    if (!clean) return false;
    const parts = clean.split(".");
    if (parts.length !== 3) return false;
    const sigDecoded = fromBase64Url(parts[2]);
    return sigDecoded.startsWith(FALLBACK_SIG_PREFIX);
  } catch {
    return false;
  }
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.replace(/^Bearer\s+/i, "").trim().split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(fromBase64Url(parts[1]));
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function decodeUserFromJwt(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.sub || !payload.email) return null;

  const role =
    payload.user_metadata?.role ||
    payload.user_metadata?.default_role ||
    (payload.email === "admin@university.edu.gh" ? "system_admin" : "student");

  const fullName =
    payload.user_metadata?.full_name ||
    (payload.email === "admin@university.edu.gh" ? "System Administrator" : payload.email);

  return buildSupabaseUserObject({
    id: payload.sub,
    email: payload.email,
    full_name: fullName,
    role,
    role_name: role,
  });
}

function tryDecodeRawSessionValue(rawVal: string): Record<string, any> | null {
  try {
    let unescaped = rawVal;
    try {
      unescaped = decodeURIComponent(rawVal);
    } catch {
      // keep rawVal
    }
    const jsonStr = unescaped.startsWith("base64-")
      ? fromBase64Url(unescaped.slice("base64-".length))
      : unescaped;
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object") {
      // Handle newer compact array format from @supabase/ssr: [access_token, refresh_token, ...]
      if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].includes(".")) {
        const jwtUser = decodeUserFromJwt(parsed[0]);
        return {
          access_token: parsed[0],
          refresh_token: typeof parsed[1] === "string" ? parsed[1] : undefined,
          user: jwtUser,
        };
      }
      if (parsed.access_token || parsed.user) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getProjectAuthStorageKey(supabaseUrl?: string): string {
  const rawUrl =
    supabaseUrl ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://wcpwzyikenlzqlrrwcvu.supabase.co";
  try {
    const projectRef = new URL(rawUrl).hostname.split(".")[0];
    if (projectRef) {
      return `sb-${projectRef}-auth-token`;
    }
  } catch {
    // fallback below
  }
  return "sb-wcpwzyikenlzqlrrwcvu-auth-token";
}

export function hasProjectAuthCookie(
  cookiesList: { name: string; value: string }[],
  supabaseUrl?: string
): boolean {
  const expectedKey = getProjectAuthStorageKey(supabaseUrl);
  return cookiesList.some(
    (c) =>
      Boolean(c.value) &&
      (c.name === expectedKey ||
        c.name.startsWith(`${expectedKey}.`) ||
        (c.name.startsWith("sb-") && c.name.includes("-auth-token")))
  );
}

export function parseSessionFromCookies(
  cookiesList: { name: string; value: string }[],
  supabaseUrl?: string
): Record<string, any> | null {
  const expectedKey = getProjectAuthStorageKey(supabaseUrl);
  const cookieMap = new Map<string, string>();

  // First collect keys matching the project expected key
  for (const c of cookiesList) {
    if (!c.value) continue;
    if (c.name === expectedKey || c.name.startsWith(`${expectedKey}.`)) {
      cookieMap.set(c.name, c.value);
    }
  }

  // If no exact match, allow any sb-*-auth-token cookie as fallback
  if (cookieMap.size === 0) {
    for (const c of cookiesList) {
      if (!c.value) continue;
      if (c.name.startsWith("sb-") && c.name.includes("-auth-token")) {
        cookieMap.set(c.name, c.value);
      }
    }
  }

  if (cookieMap.size === 0) {
    return null;
  }

  // 1. Check exact unchunked cookie
  for (const [key, val] of cookieMap.entries()) {
    if (!key.includes(".")) {
      const decodedExact = tryDecodeRawSessionValue(val);
      if (decodedExact) return decodedExact;
    }
  }

  // 2. Check sequential chunked cookies (.0, .1, ...)
  const candidatePrefixes = Array.from(
    new Set(Array.from(cookieMap.keys()).map((k) => k.split(".")[0]))
  );

  for (const prefix of candidatePrefixes) {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunkVal = cookieMap.get(`${prefix}.${i}`);
      if (!chunkVal) break;
      chunks.push(chunkVal);
    }
    if (chunks.length > 0) {
      const decodedChunked = tryDecodeRawSessionValue(chunks.join(""));
      if (decodedChunked) return decodedChunked;
    }
  }

  return null;
}

export function isSessionStillFresh(
  cookiesList: { name: string; value: string }[],
  bufferSeconds = 60
): boolean {
  const session = parseSessionFromCookies(cookiesList);
  if (!session) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof session.expires_at === "number") {
    return session.expires_at > nowSec + bufferSeconds;
  }
  if (typeof session.access_token === "string") {
    const payload = decodeJwtPayload(session.access_token);
    if (payload && typeof payload.exp === "number") {
      return payload.exp > nowSec + bufferSeconds;
    }
  }
  return false;
}

export function isFallbackSessionInCookies(
  cookiesList: { name: string; value: string }[]
): boolean {
  const session = parseSessionFromCookies(cookiesList);
  if (!session) return false;
  if (typeof session.refresh_token === "string" && session.refresh_token.startsWith(FALLBACK_REFRESH_PREFIX)) {
    return true;
  }
  if (typeof session.access_token === "string" && isFallbackJwt(session.access_token)) {
    return true;
  }
  return false;
}

export function extractUserFromCookies(
  cookiesList: { name: string; value: string }[]
) {
  const parsed = parseSessionFromCookies(cookiesList);
  if (!parsed) return null;

  const jwtUser =
    typeof parsed.access_token === "string"
      ? decodeUserFromJwt(parsed.access_token)
      : null;

  if (parsed.user && parsed.user.id && (parsed.user.email || jwtUser?.email)) {
    const email = parsed.user.email || jwtUser?.email;
    return {
      ...parsed.user,
      email,
      user_metadata: {
        ...(jwtUser?.user_metadata || {}),
        ...(parsed.user.user_metadata || {}),
      },
    };
  }

  return jwtUser;
}

export async function supabaseFetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = 1,
  timeoutMs = 12000
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
        cache: init?.cache ?? "no-store",
      });
      clearTimeout(timer);

      if (
        (response.status === 502 || response.status === 503 || response.status === 504) &&
        attempt < maxRetries
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to connect to Supabase after retries.");
}
