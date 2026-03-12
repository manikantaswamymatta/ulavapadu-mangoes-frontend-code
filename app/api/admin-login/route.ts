import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, loadAdminProxyConfig } from "@/lib/serverAdminConfig";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { username?: string; password?: string };
    const username = typeof payload?.username === "string" ? payload.username.trim() : "";
    const password = typeof payload?.password === "string" ? payload.password : "";

    const config = await loadAdminProxyConfig();
    const validUser = config.adminUsers.find(
      (user) => user.username === username && user.password === password
    );
    if (!validUser) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: config.sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch {
    return NextResponse.json({ detail: "Invalid request" }, { status: 400 });
  }
}
