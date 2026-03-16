/**
 * OpenClaw agent proxy
 * Routes chat messages to the configured OpenClaw gateway
 * Maintains per-client session keys for conversation continuity
 */

import fetch from 'node-fetch';

// clientId → sessionKey
const sessions = new Map();

// Per-client message history for context injection (last N messages)
const histories = new Map();
const MAX_HISTORY = 20;

export function clearSession(clientId) {
  sessions.delete(clientId);
  histories.delete(clientId);
}

export function getSessionCount() {
  return sessions.size;
}

function getHistory(clientId) {
  return histories.get(clientId) || [];
}

function appendHistory(clientId, role, content) {
  const hist = getHistory(clientId);
  hist.push({ role, content });
  if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
  histories.set(clientId, hist);
}

export async function sendMessage(clientId, message, config) {
  const { gatewayUrl, token, agentId, timeoutMs = 30_000 } = config;

  if (!gatewayUrl || !token) {
    throw new Error('OpenClaw gateway not configured — set OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN');
  }

  const text = message.trim().slice(0, 4_000);
  appendHistory(clientId, 'user', text);

  const sessionKey = sessions.get(clientId) || null;

  const payload = {
    model: agentId,
    messages: getHistory(clientId),
    stream: false,
  };
  if (sessionKey) payload.session_key = sessionKey;

  const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`gateway ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '';

  if (data.session_key) sessions.set(clientId, data.session_key);
  appendHistory(clientId, 'assistant', reply);

  return {
    reply,
    sessionKey: data.session_key || sessionKey,
    historyLength: getHistory(clientId).length,
  };
}

// System context injected at session start — grounded in CREON's data
export const SYSTEM_CONTEXT = `You are CREON, an AI agent specialising in labor market intelligence.
You have access to:
- BLS OES employment and wage data for 341 US occupations
- AI exposure risk scores (1–10) per occupation
- WEF Future of Jobs 2025 data: job shifts, fastest-growing/declining roles
- Real-time equity and crypto markets (NVDA, MSFT, GOOGL, BTC, ETH, SOL)
- Research signals from IMF, Stanford HAI, Goldman Sachs, Harvard, McKinsey

Answer questions about AI's impact on jobs, wages, sectors, and specific occupations.
Be direct, cite data where possible, and flag uncertainty clearly.`;
