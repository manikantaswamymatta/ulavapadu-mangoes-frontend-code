import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  getDefaultShippingConfig,
  normalizeShippingConfig,
  type ShippingConfig,
} from "@/src/utils/shippingConfig";

const runtimeShippingConfigPath = path.join(
  process.cwd(),
  "creds",
  "shipping_rates.json"
);

export async function loadServerShippingConfig(): Promise<ShippingConfig> {
  try {
    const raw = await readFile(runtimeShippingConfigPath, "utf-8");
    return normalizeShippingConfig(JSON.parse(raw));
  } catch {
    return getDefaultShippingConfig();
  }
}

export async function saveServerShippingConfig(
  value: unknown
): Promise<ShippingConfig> {
  const normalized = normalizeShippingConfig(value);
  await mkdir(path.dirname(runtimeShippingConfigPath), { recursive: true });
  await writeFile(
    runtimeShippingConfigPath,
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf-8"
  );
  return normalized;
}
