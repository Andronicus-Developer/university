/**
 * Resilient fetch wrapper and Edge-compatible session utilities for Supabase requests.
 * Uses pure Web APIs (TextEncoder / TextDecoder / btoa / atob) so it runs identically
 * in Next.js Edge Middleware and Node.js Route Handlers without Node `Buffer`.
 */

import {
  isPostgrestUrl,
  handleVirtualPostgrestRequest,
  getVirtualDb,
} from "@/lib/supabase/virtual-db";

export interface FallbackUserSpec {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_name: string;
  school_id?: string | null;
}

const FALLBACK_SIG_PREFIX = "local-fallback-sig-";
export const FALLBACK_REFRESH_PREFIX = "fallback-refresh-";

const SCHOOL_A_ID = "u0000001-0000-0000-0000-000000000001"; // Accra Institute of Technology (University)
const SCHOOL_B_ID = "u0000002-0000-0000-0000-000000000002"; // Kumasi Technical & Vocational Institute (Vocational)
const SCHOOL_C_ID = "u0000003-0000-0000-0000-000000000003"; // Achimota Senior High School (High School)

export const DEMO_USERS: Record<string, { password?: string; spec: FallbackUserSpec }> = {
  "superadmin@university.edu.gh": {
    password: "SuperAdmin@123456",
    spec: {
      id: "1440ed7e-cb23-4248-a372-f38b20d01554",
      email: "superadmin@university.edu.gh",
      full_name: "Master Super Administrator",
      role: "superadmin",
      role_name: "Super Administrator",
      school_id: null,
    },
  },
  "admin@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000001",
      email: "admin@university.edu.gh",
      full_name: "Andronicus Johnson",
      role: "system_admin",
      role_name: "System Administrator",
      school_id: SCHOOL_A_ID,
    },
  },
  "eugenedoeteh@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "ce155d80-2f26-4bfb-9ca1-72879fc60b62",
      email: "eugenedoeteh@university.edu.gh",
      full_name: "Eugene Doeteh",
      role: "finance_officer",
      role_name: "Finance Officer / Bursar",
      school_id: SCHOOL_A_ID,
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
      school_id: SCHOOL_A_ID,
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
      school_id: SCHOOL_A_ID,
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
      school_id: SCHOOL_A_ID,
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
      school_id: SCHOOL_A_ID,
    },
  },
  "applicant@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000004",
      email: "applicant@university.edu.gh",
      full_name: "Kofi Boateng",
      role: "applicant",
      role_name: "Applicant",
      school_id: SCHOOL_A_ID,
    },
  },
  "advisor@university.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "a0000000-0000-0000-0000-000000000005",
      email: "advisor@university.edu.gh",
      full_name: "Prof. Abena Owusu",
      role: "academic_advisor",
      role_name: "Academic Advisor",
      school_id: SCHOOL_A_ID,
    },
  },
  // Tenant School B: Kumasi Technical & Vocational Institute (Vocational School)
  "admin@ktvi.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "b0000000-0000-0000-0000-000000000001",
      email: "admin@ktvi.edu.gh",
      full_name: "Engr. Samuel Ofori (KTVI Admin)",
      role: "system_admin",
      role_name: "System Administrator",
      school_id: SCHOOL_B_ID,
    },
  },
  "student@ktvi.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "b0000000-0000-0000-0000-000000000002",
      email: "student@ktvi.edu.gh",
      full_name: "Yaw Asante (KTVI Trainee)",
      role: "student",
      role_name: "Student",
      school_id: SCHOOL_B_ID,
    },
  },
  // Tenant School C: Achimota Senior High School (High School)
  "admin@achimota.edu.gh": {
    password: "Admin@123456",
    spec: {
      id: "c0000000-0000-0000-0000-000000000001",
      email: "admin@achimota.edu.gh",
      full_name: "Mrs. Grace Mensah (Achimota Admin)",
      role: "system_admin",
      role_name: "System Administrator",
      school_id: SCHOOL_C_ID,
    },
  },
};

function computeFallbackSignature(input: string): string {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "ums-fallback-secret-key";
  const data = `${secret}:${input}:${secret}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${FALLBACK_SIG_PREFIX}${hex1}${hex2}`;
}

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
  if (!normalized) return null;
  const known = DEMO_USERS[normalized];

  if (known) {
    if (password !== undefined && (!known.password || known.password !== password)) {
      return null;
    }
    return known.spec;
  }

  const vdb = (globalThis as any).__UMS_VIRTUAL_DB__;
  if (vdb && Array.isArray(vdb.profiles)) {
    const prof = vdb.profiles.find(
      (p: any) => String(p.email || "").trim().toLowerCase() === normalized
    );
    if (prof) {
      if (password !== undefined) {
        const expectedPass = prof.metadata?.temp_password || "Admin@123456";
        if (password !== expectedPass) {
          return null;
        }
      }
      const role = prof.metadata?.role || prof.metadata?.default_role || "student";
      const schoolId =
        prof.school_id ||
        prof.university_id ||
        prof.metadata?.school_id ||
        prof.metadata?.university_id ||
        SCHOOL_A_ID;
      return {
        id: prof.id,
        email: prof.email,
        full_name: prof.full_name || prof.email,
        role,
        role_name: role,
        school_id: role === "superadmin" ? null : schoolId,
      };
    }
  }

  return null;
}

export function registerDynamicUser(email: string, password: string, spec: FallbackUserSpec) {
  const norm = email.trim().toLowerCase();
  DEMO_USERS[norm] = { password, spec };
}

export function unregisterDynamicUser(emailOrId: string) {
  const target = emailOrId.trim().toLowerCase();
  for (const [key, val] of Object.entries(DEMO_USERS)) {
    if (key === target || val.spec.id === emailOrId || val.spec.email?.toLowerCase() === target) {
      if (val.spec.role !== "superadmin") {
        delete DEMO_USERS[key];
      }
    }
  }
}

export function unregisterDynamicUsersForSchool(schoolId: string, schoolCode?: string) {
  const cleanId = (schoolId || "").toLowerCase();
  const cleanCode = (schoolCode || "").toLowerCase();
  for (const [key, val] of Object.entries(DEMO_USERS)) {
    const sId = (val.spec.school_id || "").toLowerCase();
    if (
      (cleanId && sId === cleanId) ||
      (cleanCode && sId === cleanCode) ||
      (cleanCode && key.includes(cleanCode))
    ) {
      if (val.spec.role !== "superadmin") {
        delete DEMO_USERS[key];
      }
    }
  }
}

export function resolveFallbackUserFromRefreshToken(refreshToken: string): FallbackUserSpec | null {
  if (refreshToken && refreshToken.startsWith(FALLBACK_REFRESH_PREFIX)) {
    try {
      const encodedPart = refreshToken.slice(FALLBACK_REFRESH_PREFIX.length);
      const [emailB64, sig] = encodedPart.split(".");
      const email = fromBase64Url(emailB64);
      if (sig && sig !== toBase64Url(computeFallbackSignature(email))) {
        return null;
      }
      const matched = resolveFallbackUserByEmail(email);
      if (matched) return matched;
    } catch {
      return null;
    }
  }
  return null;
}

export function buildSupabaseUserObject(spec: FallbackUserSpec) {
  const nowIso = new Date().toISOString();
  const schoolId =
    spec.role === "superadmin"
      ? null
      : spec.school_id !== undefined
      ? spec.school_id
      : SCHOOL_A_ID;

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
      role: spec.role,
      school_id: schoolId,
      university_id: schoolId,
    },
    user_metadata: {
      default_role: spec.role,
      role: spec.role,
      full_name: spec.full_name,
      school_id: schoolId,
      university_id: schoolId,
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
  const schoolId =
    spec.role === "superadmin"
      ? null
      : spec.school_id !== undefined
      ? spec.school_id
      : SCHOOL_A_ID;

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
        role: spec.role,
        school_id: schoolId,
        university_id: schoolId,
      },
      user_metadata: {
        default_role: spec.role,
        role: spec.role,
        full_name: spec.full_name,
        school_id: schoolId,
        university_id: schoolId,
      },
      role: "authenticated",
      aal: "aal1",
      amr: [{ method: "password", timestamp: nowSec }],
      session_id: spec.id,
      is_anonymous: false,
    })
  );
  const signature = toBase64Url(computeFallbackSignature(`${header}.${payload}`));
  const accessToken = `${header}.${payload}.${signature}`;
  const refreshSig = toBase64Url(computeFallbackSignature(spec.email));
  const user = buildSupabaseUserObject(spec);

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: `${FALLBACK_REFRESH_PREFIX}${toBase64Url(spec.email)}.${refreshSig}`,
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
    if (!sigDecoded.startsWith(FALLBACK_SIG_PREFIX)) return false;
    const expectedSig = computeFallbackSignature(`${parts[0]}.${parts[1]}`);
    return sigDecoded === expectedSig;
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
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  if (!clean) return null;
  const parts = clean.split(".");
  if (parts.length === 3) {
    try {
      const sigDecoded = fromBase64Url(parts[2]);
      if (sigDecoded.startsWith(FALLBACK_SIG_PREFIX)) {
        const expectedSig = computeFallbackSignature(`${parts[0]}.${parts[1]}`);
        if (sigDecoded !== expectedSig) {
          return null;
        }
      }
    } catch {
      return null;
    }
  }

  const payload = decodeJwtPayload(clean);
  if (!payload || !payload.sub || !payload.email) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < nowSec) {
    return null;
  }

  const role =
    payload.app_metadata?.role ||
    payload.user_metadata?.role ||
    payload.user_metadata?.default_role ||
    (payload.email === "admin@university.edu.gh" ? "system_admin" : "student");

  const fullName =
    payload.user_metadata?.full_name ||
    (payload.email === "admin@university.edu.gh" ? "System Administrator" : payload.email);

  const schoolId =
    role === "superadmin"
      ? null
      : payload.app_metadata?.school_id ||
        payload.app_metadata?.university_id ||
        payload.user_metadata?.school_id ||
        payload.user_metadata?.university_id ||
        (String(payload.email).includes("ktvi")
          ? SCHOOL_B_ID
          : String(payload.email).includes("achimota")
          ? SCHOOL_C_ID
          : SCHOOL_A_ID);

  return buildSupabaseUserObject({
    id: payload.sub,
    email: payload.email,
    full_name: fullName,
    role,
    role_name: role,
    school_id: schoolId,
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

async function handleVirtualAdminAuthRequest(
  urlStr: string,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  const db = await getVirtualDb();

  let bodyObj: Record<string, any> = {};
  if (init?.body) {
    try {
      const text =
        typeof init.body === "string"
          ? init.body
          : init.body instanceof ArrayBuffer
          ? new TextDecoder().decode(init.body)
          : ArrayBuffer.isView(init.body)
          ? new TextDecoder().decode(init.body)
          : "";
      if (text) bodyObj = JSON.parse(text);
    } catch {
      // ignore
    }
  }

  // GET /auth/v1/admin/users
  if (method === "GET" && urlStr.includes("/admin/users")) {
    const users = (db.profiles || []).map((p) =>
      buildSupabaseUserObject({
        id: p.id,
        email: p.email,
        full_name: p.full_name || p.email,
        role: p.metadata?.role || "student",
        role_name: p.metadata?.role || "Student",
      })
    );
    headers.set("x-total-count", String(users.length));
    return new Response(JSON.stringify({ users, aud: "authenticated" }), {
      status: 200,
      headers,
    });
  }

  // POST /auth/v1/admin/users
  if (method === "POST" && urlStr.includes("/admin/users")) {
    const email = String(bodyObj.email || "").trim().toLowerCase();
    const fullName = bodyObj.user_metadata?.full_name || email;
    const role = bodyObj.user_metadata?.role || bodyObj.user_metadata?.default_role || "student";
    const id = crypto.randomUUID();
    const spec: FallbackUserSpec = {
      id,
      email,
      full_name: fullName,
      role,
      role_name: role,
    };
    if (email) {
      DEMO_USERS[email] = {
        password: bodyObj.password || undefined,
        spec,
      };
    }
    const userObj = buildSupabaseUserObject(spec);
    return new Response(JSON.stringify(userObj), { status: 200, headers });
  }

  // PUT /auth/v1/admin/users/:id
  if (method === "PUT" && urlStr.includes("/admin/users/")) {
    const id = urlStr.split("/admin/users/")[1]?.split("?")[0] || crypto.randomUUID();
    const prof = (db.profiles || []).find((p) => String(p.id) === String(id));
    const email = bodyObj.email || prof?.email || "user@university.edu.gh";
    const fullName = bodyObj.user_metadata?.full_name || prof?.full_name || email;
    const role = bodyObj.user_metadata?.role || prof?.metadata?.role || "student";
    const spec: FallbackUserSpec = {
      id,
      email,
      full_name: fullName,
      role,
      role_name: role,
    };
    if (email && bodyObj.password) {
      DEMO_USERS[email.toLowerCase()] = {
        password: bodyObj.password,
        spec,
      };
    }
    return new Response(JSON.stringify(buildSupabaseUserObject(spec)), {
      status: 200,
      headers,
    });
  }

  // DELETE /auth/v1/admin/users/:id
  if (method === "DELETE" && urlStr.includes("/admin/users/")) {
    return new Response(JSON.stringify({ user: null }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ status: "ok" }), { status: 200, headers });
}

export async function supabaseFetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = 1,
  timeoutMs = 12000
): Promise<Response> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;

  // Route PostgREST (/rest/v1/*) directly through our Cloud-Synced Virtual UMS DB
  if (isPostgrestUrl(urlStr)) {
    return handleVirtualPostgrestRequest(input, init);
  }

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

      if (!response.ok && urlStr.includes("/auth/v1/admin/users")) {
        return handleVirtualAdminAuthRequest(urlStr, init);
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

  if (urlStr.includes("/auth/v1/admin/users")) {
    return handleVirtualAdminAuthRequest(urlStr, init);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to connect to Supabase after retries.");
}
