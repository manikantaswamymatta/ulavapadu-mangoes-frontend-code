import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, loadAdminProxyConfig } from "@/lib/serverAdminConfig";
import {
  loadServerShippingConfig,
  saveServerShippingConfig,
} from "@/lib/serverShippingConfig";

export const dynamic = "force-dynamic";

async function isAuthorizedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const config = await loadAdminProxyConfig();
  return session === config.sessionToken;
}

export async function GET() {
  try {
    const config = await loadServerShippingConfig();
    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load shipping config.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await isAuthorizedAdmin())) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const savedConfig = await saveServerShippingConfig(payload);

    return NextResponse.json(savedConfig, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save shipping config.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
