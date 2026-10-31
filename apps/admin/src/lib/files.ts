'use client';

import { useEffect, useState } from 'react';
import { env } from './env';
import { session } from './session';

/**
 * Fetches an authenticated file (worker documents, ticket attachments) and
 * exposes it as an object URL, since <img src> can't carry the bearer token.
 */
export function useAuthedFile(path: string | null): {
  url: string | null;
  type: string | null;
  error: boolean;
} {
  const [state, setState] = useState<{ url: string | null; type: string | null; error: boolean }>({
    url: null,
    type: null,
    error: false,
  });

  useEffect(() => {
    if (!path) return;
    let revoked = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const token = await session.getAccessToken();
        const res = await fetch(`${env.apiUrl}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (revoked) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, type: blob.type, error: false });
      } catch {
        if (!revoked) setState({ url: null, type: null, error: true });
      }
    })();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return path ? state : { url: null, type: null, error: false };
}

/** Uploads a worker document (multipart) with the staff member's token. */
export async function uploadWorkerDocument(
  workerId: string,
  kind: 'PHOTO' | 'ID_FRONT' | 'ID_BACK',
  file: File,
): Promise<void> {
  const token = await session.getAccessToken();
  const body = new FormData();
  body.set('file', file);
  const res = await fetch(`${env.apiUrl}/v1/admin/workers/${workerId}/documents/${kind}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(detail?.message) ? detail.message.join('. ') : detail?.message;
    throw new Error(message ?? `Upload failed (${res.status})`);
  }
}

/** Downloads an authenticated file (e.g. the CSV export) through a temporary link. */
export async function downloadAuthed(path: string, filename: string): Promise<void> {
  const token = await session.getAccessToken();
  const res = await fetch(`${env.apiUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
