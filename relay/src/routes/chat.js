/**
 * Chat routes
 * POST /api/chat — proxy to OpenClaw agent
 * DELETE /api/chat/:clientId — clear session
 * GET /api/chat/:clientId/history — session info
 */

import { Router } from 'express';
import { sendMessage, clearSession, getSessionCount } from '../agent/proxy.js';
import { validateGatewayUrl, rateLimitCheck, sanitizeMessage } from '../security.js';
import { config } from '../config.js';

const router = Router();

router.post('/', async (req, res) => {
  const { message, clientId, gatewayUrl } = req.body;

  if (!clientId || typeof clientId !== 'string' || clientId.length > 128) {
    return res.status(400).json({ error: 'clientId is required (max 128 chars)' });
  }

  const rl = rateLimitCheck(clientId);
  if (rl.limited) {
    res.set('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter });
  }

  const text = sanitizeMessage(message);
  if (!text) {
    return res.status(400).json({ error: 'message is required and must be non-empty' });
  }

  if (gatewayUrl) {
    const check = validateGatewayUrl(gatewayUrl);
    if (!check.ok) {
      return res.status(400).json({ error: `Invalid gateway URL: ${check.reason}` });
    }
  }

  const agentConfig = gatewayUrl
    ? { ...config.agent, gatewayUrl }
    : config.agent;

  try {
    const result = await sendMessage(clientId, text, agentConfig);
    res.json(result);
  } catch (err) {
    const status = err.message.includes('not configured') ? 503
      : err.message.includes('gateway') ? 502 : 500;
    res.status(status).json({ error: err.message });
  }
});

router.delete('/:clientId', (req, res) => {
  const { clientId } = req.params;
  clearSession(clientId);
  res.json({ ok: true, clientId });
});

router.get('/sessions', (req, res) => {
  res.json({ activeSessions: getSessionCount() });
});

export default router;
