const BACKEND_PROXY_API = "/api/backend-proxy";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

function buildProxyUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_PROXY_API}?path=${encodeURIComponent(normalizedPath)}`;
}

export async function requestBackend<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || "GET";

  const response = await fetch(buildProxyUrl(path), {
    method,
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}
