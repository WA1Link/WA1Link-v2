import { app } from 'electron';

const PROD_URL = 'https://1link.so/api/1.1/wf/min-version';
const DEV_URL = 'https://1link.so/version-test/api/1.1/wf/min-version';

/** Compare two semver strings (e.g. "1.4.10" vs "1.5.0"). Returns
 *  -1 / 0 / 1 in the usual sense. Tolerates pre-release suffixes by
 *  stripping anything past a `-` or `+`. */
export function compareVersions(a: string, b: string): number {
  const norm = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((p) => parseInt(p, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/** Best-effort fetch of the minimum supported version from the server.
 *  Returns null on any failure, missing field, or non-OK response —
 *  the caller treats that as "no gate" rather than blocking the user. */
export async function fetchMinVersion(): Promise<string | null> {
  try {
    const url = app.isPackaged ? PROD_URL : DEV_URL;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | { minVersion?: string; min_version?: string }
      | null;
    if (!data) return null;
    const v = data.minVersion ?? data.min_version;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Returns the minVersion only if the running app is below it; else null. */
export async function checkUpdateRequired(): Promise<{
  currentVersion: string;
  minVersion: string;
} | null> {
  const minVersion = await fetchMinVersion();
  if (!minVersion) return null;
  const currentVersion = app.getVersion();
  if (compareVersions(currentVersion, minVersion) >= 0) return null;
  return { currentVersion, minVersion };
}
