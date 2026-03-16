/**
 * Security helpers
 * SSRF protection, rate limiting, input sanitization
 */

import { createRequire } from 'module';

// ---- SSRF PROTECTION ----

// Private / loopback / link-local IP ranges
const PRIVATE_RANGES = [
  /^127\./,                        // loopback
  /^10\./,                         // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./,   // RFC 1918
  /^192\.168\./,                   // RFC 1918
  /^169\.254\./,                   // link-local
  /^::1$/,                         // IPv6 loopback
  /^fc00:/i,                       // IPv6 ULA
  /^fe80:/i,                       // IPv6 link-local
  /^0\./,                          // "this" network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

const PRIVATE_HOSTNAMES = ['localhost', 'metadata.google.internal', '169.254.169.254'];

/**
 * Validates a gateway URL — rejects non-http(s), private IPs, and known cloud metadata endpoints.
 * Returns { ok: true } or { ok: false, reason: string }
 */
export function validateGatewayUrl(raw) {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'URL is required' };

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  const host = parsed.hostname.toLowerCase();

  if (PRIVATE_HOSTNAMES.includes(host)) {
    return { ok: false, reason: 'Gateway URL points to a reserved hostname' };
  }

  // Check for bare IP — reject private ranges
  // IPv4 pattern
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    for (const range of PRIVATE_RANGES) {
      if (range.test(host)) {
        return { ok: false, reason: 'Gateway URL points to a private IP range' };
      }
    }
  }

  // Reject IPv6 private ranges
  if (host.startsWith('[')) {
    const ipv6 = host.slice(1, -1);
    for (const range of PRIVATE_RANGES) {
      if (range.test(ipv6)) {
        return { ok: false, reason: 'Gateway URL points to a private IPv6 range' };
      }
    }
  }

  return { ok: true };
}

// ---- RATE LIMITING ----

// Simple in-memory sliding window per clientId
// { clientId: [timestamp, timestamp, ...] }
const windows = new Map();

const WINDOW_MS = 60_000;   // 1 minute
const MAX_REQUESTS = 20;    // per window per clientId

export function rateLimitCheck(clientId) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let hits = windows.get(clientId) || [];
  hits = hits.filter(t => t > cutoff); // drop expired
  hits.push(now);
  windows.set(clientId, hits);

  if (hits.length > MAX_REQUESTS) {
    const retryAfter = Math.ceil((hits[0] + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

// Periodically prune stale entries (every 5 min)
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, hits] of windows.entries()) {
    const pruned = hits.filter(t => t > cutoff);
    if (!pruned.length) windows.delete(key);
    else windows.set(key, pruned);
  }
}, 300_000);

// ---- MESSAGE SANITIZATION ----

export function sanitizeMessage(msg, maxLen = 4000) {
  if (typeof msg !== 'string') return '';
  return msg.trim().slice(0, maxLen);
}
