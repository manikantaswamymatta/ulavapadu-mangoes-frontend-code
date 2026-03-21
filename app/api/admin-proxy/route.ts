import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, loadAdminProxyConfig } from "@/lib/serverAdminConfig";

async function handle(request: NextRequest) {
  try {
    const config = await loadAdminProxyConfig();
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (session !== config.sessionToken) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const rawPath = (request.nextUrl.searchParams.get("path") || "").trim();
    const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (!cleanPath || cleanPath === "/") {
      return NextResponse.json({ detail: "Missing proxy path" }, { status: 400 });
    }

    const upstreamUrl = `${config.backendBaseUrl}${cleanPath}`;

    const forwardHeaders = new Headers();
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");

    if (contentType) forwardHeaders.set("content-type", contentType);
    if (accept) forwardHeaders.set("accept", accept);
    forwardHeaders.set("X-Admin-Internal-Token", config.backendInternalToken);

    const method = request.method.toUpperCase();
    const bodyAllowed = method !== "GET" && method !== "HEAD";
    const body = bodyAllowed ? await request.text() : undefined;

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: forwardHeaders,
      body,
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    const responseContentType = upstreamResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    const responseBody = await upstreamResponse.text();
    if (upstreamResponse.status === 401) {
      return NextResponse.json(
        {
          detail:
            "Admin backend rejected the request. Check backendBaseUrl and backendInternalToken in creds/admin_proxy.json.",
        },
        { status: 502 }
      );
    }

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json({ detail: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function PUT(request: NextRequest) {
  return handle(request);
}

export async function PATCH(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
