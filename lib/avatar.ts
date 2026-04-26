import { createHash } from "crypto";

const DICEBEAR_LORELEI_BASE_URL = "https://api.dicebear.com/9.x/lorelei/svg";

export function createDefaultAvatarUrl(seedSource: string) {
  const seed = createHash("sha256").update(seedSource).digest("hex");
  const params = new URLSearchParams({ seed });

  return `${DICEBEAR_LORELEI_BASE_URL}?${params.toString()}`;
}
