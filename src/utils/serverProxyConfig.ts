import { readFile } from "node:fs/promises";
import path from "node:path";

type FrontendProxyConfig = {
  backendBaseUrl: string;
  internalApiToken: string;
};

let cachedConfig: FrontendProxyConfig | null = null;

function assertNonEmpty(value: unknown, key: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid frontend proxy config: '${key}' must be a non-empty string.`);
  }
  return value.trim();
}

export async function loadFrontendProxyConfig(): Promise<FrontendProxyConfig> {
  if (cachedConfig) return cachedConfig;

  const filePath = path.join(process.cwd(), "creds", "frontend_proxy.json");
  let parsed: Record<string, unknown> = {};

  try {
    const raw = await readFile(filePath, "utf-8");
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const envBackendBaseUrl = process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  const envInternalApiToken = process.env.INTERNAL_API_TOKEN;

  const backendBaseUrl = assertNonEmpty(envBackendBaseUrl || parsed.backendBaseUrl, "backendBaseUrl").replace(/\/+$/, "");
  const internalApiToken = assertNonEmpty(envInternalApiToken || parsed.internalApiToken, "internalApiToken");

  cachedConfig = {
    backendBaseUrl,
    internalApiToken,
  };

  return cachedConfig;
}
