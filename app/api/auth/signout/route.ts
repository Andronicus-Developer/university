import { NextRequest, NextResponse } from "next/server";
import { getProjectAuthStorageKey } from "@/lib/supabase/fetch";

export async function GET(request: NextRequest) {
  return handleSignout(request, true);
}

export async function POST(request: NextRequest) {
  return handleSignout(request, false);
}

export function clearAllAuthCookies(
  response: NextResponse,
  requestCookies?: Array<{ name: string; value: string }>
) {
  const projectKey = getProjectAuthStorageKey();
  const knownKeys = [
    projectKey,
    `${projectKey}.0`,
    `${projectKey}.1`,
    `${projectKey}.2`,
    `${projectKey}.3`,
    `${projectKey}.4`,
    "sb-wcpwzyikenlzqlrrwcvu-auth-token",
    "sb-wcpwzyikenlzqlrrwcvu-auth-token.0",
    "sb-wcpwzyikenlzqlrrwcvu-auth-token.1",
    "sb-wcpwzyikenlzqlrrwcvu-auth-token.2",
    "sb-wcpwzyikenlzqlrrwcvu-auth-token.3",
    "sb-localhost-auth-token",
    "supabase-auth-token",
    "sb-access-token",
    "sb-refresh-token",
    "sb-provider-token",
  ];

  const allNames = new Set<string>(knownKeys);
  if (Array.isArray(requestCookies)) {
    for (const c of requestCookies) {
      if (
        c.name.startsWith("sb-") ||
        c.name.includes("auth-token") ||
        c.name.includes("supabase") ||
        c.name.includes("session")
      ) {
        allNames.add(c.name);
      }
    }
  }

  for (const name of allNames) {
    // Delete via Next.js cookie helper
    response.cookies.delete(name);

    // Explicit deletion headers with HttpOnly
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    );

    // Explicit deletion headers without HttpOnly (for client-accessible cookies)
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
    );
  }

  // Enforce zero cache on logout responses
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

async function handleSignout(request: NextRequest, isRedirect: boolean) {
  const redirectTarget = request.nextUrl.searchParams.get("redirect") || "/";
  const response = isRedirect
    ? NextResponse.redirect(new URL(redirectTarget, request.url))
    : NextResponse.json({ success: true, redirect: redirectTarget });

  const cookiesList = request.cookies.getAll().map((c) => ({
    name: c.name,
    value: c.value,
  }));

  clearAllAuthCookies(response, cookiesList);

  return response;
}
