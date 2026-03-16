/**
 * Formatting utilities
 * Numbers, currency, percentages, time — consistent across relay responses
 */

// ---- Numbers ----

export function formatNumber(n, opts = {}) {
  if (n == null || isNaN(n)) return '—';
  const { decimals = 0, compact = false } = opts;
  if (compact) {
    if (Math.abs(n) >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(n) >= 1_000_000)     return `${+(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)         return `${+(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

export function formatCurrency(n, opts = {}) {
  if (n == null || isNaN(n)) return '—';
  const { compact = false, currency = 'USD' } = opts;
  if (compact) {
    if (Math.abs(n) >= 1_000_000_000_000) return `$${+(n / 1_000_000_000_000).toFixed(2)}T`;
    if (Math.abs(n) >= 1_000_000_000)     return `$${+(n / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(n) >= 1_000_000)         return `$${+(n / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

export function formatPercent(n, opts = {}) {
  if (n == null || isNaN(n)) return '—';
  const { decimals = 1, sign = false } = opts;
  const prefix = sign && n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(decimals)}%`;
}

// ---- Change indicators ----

export function changeLabel(value, prevValue) {
  if (value == null || prevValue == null) return null;
  const delta = value - prevValue;
  const pct = prevValue !== 0 ? (delta / Math.abs(prevValue)) * 100 : null;
  return {
    delta: +delta.toFixed(4),
    pct: pct !== null ? +pct.toFixed(2) : null,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    arrow: delta > 0 ? '▲' : delta < 0 ? '▼' : '—',
  };
}

// ---- Time ----

export function timeAgo(tsMs) {
  if (!tsMs) return 'never';
  const sec = Math.floor((Date.now() - tsMs) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export function utcString(tsMs) {
  if (!tsMs) return null;
  return new Date(tsMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

// ---- AI Exposure ----

export function exposureLabel(score) {
  if (score == null) return 'unknown';
  if (score >= 8) return 'Critical';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Medium';
  if (score >= 2) return 'Low';
  return 'Minimal';
}

export function exposureColour(score) {
  if (score == null) return '#64748b';
  if (score >= 8) return '#ef4444';
  if (score >= 6) return '#f97316';
  if (score >= 4) return '#eab308';
  if (score >= 2) return '#22c55e';
  return '#0ea5e9';
}

// ---- SOC codes ----

export function formatSOC(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return raw;
}
