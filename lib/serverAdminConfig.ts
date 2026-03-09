import { readFile } from "node:fs/promises";
import path from "node:path";

export const ADMIN_SESSION_COOKIE = "mhf_admin_session";

export type AdminUser = {
  username: string;
  password: string;
};

type AdminProxyConfig = {
  backendBaseUrl: string;
  backendInternalToken: string;
  adminUsers: AdminUser[];
  sessionToken: string;
};

let cachedConfig: AdminProxyConfig | null = null;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function assertNonEmpty(value: unknown, key: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid admin proxy config: '${key}' must be a non-empty string.`);
  }
  return value.trim();
}

function parseAdminUsers(value: unknown): AdminUser[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Invalid admin proxy config: 'adminUsers' must be a non-empty array.");
  }

  return value.map((entry, index) => {
    const row = entry as Record<string, unknown>;
    const username = assertNonEmpty(row?.username, `adminUsers[${index}].username`);
    const password = assertNonEmpty(row?.password, `adminUsers[${index}].password`);
    return { username, password };
  });
}

export async function loadAdminProxyConfig(): Promise<AdminProxyConfig> {
  if (cachedConfig) return cachedConfig;

  const candidates = [
    path.join(process.cwd(), "creds", "admin_proxy.json"),
    path.join(process.cwd(), "..", "webpage-frontend", "creds", "admin_proxy.json"),
  ];

  let raw = "";
  for (const filePath of candidates) {
    try {
      raw = await readFile(filePath, "utf-8");
      break;
    } catch {
      // try next candidate
    }
  }

  if (!raw) {
    throw new Error("Missing admin proxy config at creds/admin_proxy.json");
  }

  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const backendBaseUrl = normalizeBaseUrl(assertNonEmpty(parsed.backendBaseUrl, "backendBaseUrl"));
  const backendInternalToken = assertNonEmpty(parsed.backendInternalToken, "backendInternalToken");
  const adminUsers = parseAdminUsers(parsed.adminUsers);
  const sessionToken = assertNonEmpty(parsed.sessionToken, "sessionToken");

  cachedConfig = {
    backendBaseUrl,
    backendInternalToken,
    adminUsers,
    sessionToken,
  };
  return cachedConfig;
}
