import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return handleSignout(request, true);
}

export async function POST(request: NextRequest) {
  return handleSignout(request, false);
}

async function handleSignout(request: NextRequest, isRedirect: boolean) {
  const redirectTarget = request.nextUrl.searchParams.get("redirect") || "/";
  const response = isRedirect
    ? NextResponse.redirect(new URL(redirectTarget, request.url))
    : NextResponse.json({ success: true, redirect: redirectTarget });

  const allCookies = request.cookies.getAll();
  for (const c of allCookies) {
    if (
      c.name.startsWith("sb-") ||
      c.name.includes("auth-token") ||
      c.name.includes("supabase") ||
      c.name.includes("session")
    ) {
      response.cookies.set(c.name, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      response.cookies.delete(c.name);
    }
  }

  return response;
}

