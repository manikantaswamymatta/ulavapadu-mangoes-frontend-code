import { NextRequest, NextResponse } from "next/server";

import { loadFrontendProxyConfig } from "@/src/utils/serverProxyConfig";

async function handle(request: NextRequest) {
  try {
    const config = await loadFrontendProxyConfig();

    const rawPath = (request.nextUrl.searchParams.get("path") || "").trim();
    const cleanPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    if (!cleanPath || cleanPath === "/") {
      return NextResponse.json({ detail: "Missing proxy path" }, { status: 400 });
    }

    const upstreamUrl = `${config.backendBaseUrl}${cleanPath}`;

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");
    if (contentType) headers.set("content-type", contentType);
    if (accept) headers.set("accept", accept);
    headers.set("x-internal-token", config.internalApiToken);

    const method = request.method.toUpperCase();
    const bodyAllowed = method !== "GET" && method !== "HEAD";
    const body = bodyAllowed ? await request.text() : undefined;

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });

    const responseBody = await upstreamResponse.text();
    const responseHeaders = new Headers();
    const responseContentType = upstreamResponse.headers.get("content-type");
    if (responseContentType) {
      responseHeaders.set("content-type", responseContentType);
    }

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backend proxy failed";
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
