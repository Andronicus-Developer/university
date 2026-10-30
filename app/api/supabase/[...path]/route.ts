import { NextRequest, NextResponse } from "next/server";
import {
  supabaseFetchWithRetry,
  resolveFallbackUserByEmail,
  resolveFallbackUserFromRefreshToken,
  buildFallbackSession,
  decodeUserFromJwt,
  extractUserFromCookies,
  isFallbackJwt,
  FALLBACK_REFRESH_PREFIX,
} from "@/lib/supabase/fetch";

const FORWARDED_REQUEST_HEADERS = [
  "apikey",
  "authorization",
  "content-type",
  "accept",
  "accept-profile",
  "content-profile",
  "prefer",
  "range",
  "x-client-info",
  "x-upsert",
];

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-range",
  "preference-applied",
  "x-total-count",
  "sb-gateway-version",
];

async function handleFallbackRequest(
  request: NextRequest,
  subPath: string,
  bodyBuffer: ArrayBuffer | null
): Promise<NextResponse> {
  const method = request.method.toUpperCase();
  const grantType = request.nextUrl.searchParams.get("grant_type");

  // 1. Auth Token Endpoint (/auth/v1/token?grant_type=password | refresh_token)
  if (subPath === "auth/v1/token" && method === "POST") {
    let payload: Record<string, unknown> = {};
    if (bodyBuffer && bodyBuffer.byteLength > 0) {
      try {
        payload = JSON.parse(Buffer.from(bodyBuffer).toString("utf8"));
      } catch {
        // ignore parse errors
      }
    }

    if (grantType === "refresh_token" && typeof payload.refresh_token === "string") {
      const spec = resolveFallbackUserFromRefreshToken(payload.refresh_token);
      return NextResponse.json(buildFallbackSession(spec), { status: 200 });
    }

    const email = typeof payload.email === "string" ? payload.email : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    const userSpec = resolveFallbackUserByEmail(email, password);
    if (!userSpec) {
      return NextResponse.json(
        {
          code: "invalid_credentials",
          error: "invalid_grant",
          error_description: "Invalid login credentials",
          msg: "Invalid login credentials",
        },
        { status: 400 }
      );
    }

    const session = buildFallbackSession(userSpec);
    return NextResponse.json(session, { status: 200 });
  }

  // 2. Auth User Endpoint (/auth/v1/user)
  if (subPath === "auth/v1/user" && method === "GET") {
    const authHeader = request.headers.get("authorization") || "";
    const userFromJwt = decodeUserFromJwt(authHeader);
    if (userFromJwt) {
      return NextResponse.json(userFromJwt, { status: 200 });
    }

    const userFromCookies = extractUserFromCookies(request.cookies.getAll());
    if (userFromCookies) {
      return NextResponse.json(userFromCookies, { status: 200 });
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 3. Auth Logout Endpoint (/auth/v1/logout)
  if (subPath === "auth/v1/logout") {
    return new NextResponse(null, { status: 204 });
  }

  // 4. RPC: get_user_roles (/rest/v1/rpc/get_user_roles)
  if (subPath === "rest/v1/rpc/get_user_roles") {
    const authHeader = request.headers.get("authorization") || "";
    const user =
      decodeUserFromJwt(authHeader) ||
      extractUserFromCookies(request.cookies.getAll());

    const roleCode =
      user?.user_metadata?.role ||
      user?.user_metadata?.default_role ||
      "system_admin";

    return NextResponse.json(
      [
        {
          role_code: roleCode,
          role_name:
            roleCode === "system_admin" ? "System Administrator" : roleCode,
        },
      ],
      { status: 200 }
    );
  }

  // 5. Generic PostgREST fallback (/rest/v1/*) so dashboards don't crash when offline
  if (subPath.startsWith("rest/v1/")) {
    const accept = request.headers.get("accept") || "";
    const prefer = request.headers.get("prefer") || "";
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
    });

    if (prefer.includes("count=")) {
      headers.set("content-range", "0-0/0");
    }

    if (method === "HEAD") {
      return new NextResponse(null, { status: 200, headers });
    }

    if (accept.includes("application/vnd.pgrst.object+json")) {
      return NextResponse.json(null, { status: 200, headers });
    }

    return NextResponse.json([], { status: 200, headers });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function proxySupabaseRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const subPath = (path || []).join("/");
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  let bodyBuffer: ArrayBuffer | null = null;

  if (hasBody) {
    try {
      bodyBuffer = await request.arrayBuffer();
    } catch {
      bodyBuffer = null;
    }
  }

  if (!supabaseUrl) {
    return handleFallbackRequest(request, subPath, bodyBuffer);
  }

  const incomingAuth = request.headers.get("authorization") || "";
  const usingFallbackAuth = isFallbackJwt(incomingAuth);

  // Never send local fallback tokens to Supabase Auth endpoints (upstream would return 401/403 and clear client session)
  if (subPath.startsWith("auth/v1/")) {
    if (usingFallbackAuth) {
      return handleFallbackRequest(request, subPath, bodyBuffer);
    }
    if (
      subPath === "auth/v1/token" &&
      request.nextUrl.searchParams.get("grant_type") === "refresh_token" &&
      bodyBuffer &&
      bodyBuffer.byteLength > 0
    ) {
      try {
        const parsed = JSON.parse(Buffer.from(bodyBuffer).toString("utf8"));
        if (
          typeof parsed.refresh_token === "string" &&
          parsed.refresh_token.startsWith(FALLBACK_REFRESH_PREFIX)
        ) {
          return handleFallbackRequest(request, subPath, bodyBuffer);
        }
      } catch {
        // continue upstream
      }
    }
  }

  const targetUrl = `${supabaseUrl}/${subPath}${request.nextUrl.search}`;
  const outgoingHeaders = new Headers();

  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      outgoingHeaders.set(headerName, value);
    }
  }

  if (!outgoingHeaders.has("apikey") && anonKey) {
    outgoingHeaders.set("apikey", anonKey);
  }

  // If the client holds a local fallback session, authenticate upstream PostgREST/Storage calls using service/anon key
  if (usingFallbackAuth && (serviceRoleKey || anonKey)) {
    const upstreamKey = serviceRoleKey || anonKey;
    outgoingHeaders.set("authorization", `Bearer ${upstreamKey}`);
  }

  const timeoutMs = subPath === "auth/v1/token" ? 15000 : 10000;

  try {
    const upstreamResponse = await supabaseFetchWithRetry(
      targetUrl,
      {
        method,
        headers: outgoingHeaders,
        body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      },
      1,
      timeoutMs
    );

    const responseHeaders = new Headers();
    for (const headerName of FORWARDED_RESPONSE_HEADERS) {
      const val = upstreamResponse.headers.get(headerName);
      if (val) {
        responseHeaders.set(headerName, val);
      }
    }

    if (upstreamResponse.status === 204 || method === "HEAD") {
      return new NextResponse(null, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    const responseBody = await upstreamResponse.arrayBuffer();
    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.warn(
      `[Supabase Proxy] Upstream connection failed for /${subPath} (${
        err instanceof Error ? err.message : "unknown error"
      }). Using local fallback.`
    );
    return handleFallbackRequest(request, subPath, bodyBuffer);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxySupabaseRequest(request, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
