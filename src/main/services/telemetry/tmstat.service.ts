import { app } from 'electron';
import { getDeviceFingerprint } from '../license/license.service';
import { getDatabase } from '../../database';

const PROD_URL = 'https://1link.so/api/1.1/wf/tmstat';
const DEV_URL = 'https://1link.so/version-test/api/1.1/wf/tmstat';

/** Returns total messages successfully sent across all jobs (direct + scheduled). */
function getTotalSent(): number {
  try {
    const db = getDatabase();
    const row = db
      .prepare(`SELECT COUNT(*) as c FROM job_targets WHERE status = 'sent'`)
      .get() as { c: number } | undefined;
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

/** Format as `YYYY-MM-DDTHH:mm:ssZ` (UTC, no millis). */
function formatLad(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Fire-and-forget startup ping to the 1link tmstat endpoint.
 * Never throws — telemetry must not block app startup.
 */
export async function reportStartup(): Promise<void> {
  try {
    const url = app.isPackaged ? PROD_URL : DEV_URL;
    const body = {
      fp: getDeviceFingerprint(),
      lad: formatLad(new Date()),
      sent: getTotalSent(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn('[tmstat] non-OK response', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('[tmstat] failed:', (err as Error).message);
  }
}
