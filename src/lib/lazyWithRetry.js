import { lazy } from "react";

const CHUNK_RE = /chunk|loading.*failed|import\(/i;

/**
 * React.lazy com uma nova tentativa após falha de carregamento de chunk (cache/CDN pós-deploy).
 */
export function lazyWithRetry(importFn, { retries = 1, delayMs = 400 } = {}) {
  return lazy(async () => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await importFn();
      } catch (err) {
        lastError = err;
        const msg = err?.message || String(err);
        if (!CHUNK_RE.test(msg) && attempt >= retries) throw err;
        if (attempt < retries) {
          await new Promise((r) => window.setTimeout(r, delayMs));
        }
      }
    }
    throw lastError;
  });
}
