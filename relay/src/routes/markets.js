/**
 * Markets routes
 * GET /api/markets — full snapshot
 * GET /api/markets/summary — aggregated stats
 * GET /api/markets/:symbol — single symbol
 * GET /api/markets/sector/ai — AI-basket performance
 */

import { Router } from 'express';
import { getMarketsCache, EQUITY_SYMBOLS, CRYPTO_SYMBOLS } from '../sources/markets.js';

const router = Router();

// Full snapshot
router.get('/', (req, res) => {
  const { data, lastUpdated, failCount } = getMarketsCache();
  res.json({ data: data || {}, lastUpdated, failCount });
});

// Aggregated summary — movers, basket performance
router.get('/summary', (req, res) => {
  const { data, lastUpdated } = getMarketsCache();
  if (!data || !Object.keys(data).length) {
    return res.status(503).json({ error: 'market data not yet available' });
  }

  const entries = Object.values(data);

  const gainers = entries
    .filter(e => e.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, 3)
    .map(e => ({ symbol: e.symbol, changePct: e.changePct, price: e.price }));

  const losers = entries
    .filter(e => e.changePct < 0)
    .sort((a, b) => a.changePct - b.changePct)
    .slice(0, 3)
    .map(e => ({ symbol: e.symbol, changePct: e.changePct, price: e.price }));

  // AI equity basket (weighted equal)
  const equities = EQUITY_SYMBOLS.map(s => data[s]).filter(Boolean);
  const basketAvg = equities.length
    ? equities.reduce((sum, e) => sum + e.changePct, 0) / equities.length
    : null;

  // Crypto basket
  const crypto = CRYPTO_SYMBOLS.map(s => data[s]).filter(Boolean);
  const cryptoAvg = crypto.length
    ? crypto.reduce((sum, e) => sum + e.changePct, 0) / crypto.length
    : null;

  res.json({
    gainers,
    losers,
    baskets: {
      aiEquities: { avg: basketAvg ? +basketAvg.toFixed(3) : null, symbols: EQUITY_SYMBOLS },
      crypto: { avg: cryptoAvg ? +cryptoAvg.toFixed(3) : null, symbols: CRYPTO_SYMBOLS },
    },
    lastUpdated,
  });
});

// AI sentiment basket — normalized 0–100 score
router.get('/sentiment', (req, res) => {
  const { data } = getMarketsCache();
  if (!data || !Object.keys(data).length) {
    return res.status(503).json({ error: 'market data not yet available' });
  }

  const equities = EQUITY_SYMBOLS.map(s => data[s]).filter(Boolean);
  if (!equities.length) return res.status(503).json({ error: 'no equity data' });

  const avgChange = equities.reduce((s, e) => s + e.changePct, 0) / equities.length;
  // Normalise: clamp [-5%, +5%] → [0, 100]
  const clamped = Math.max(-5, Math.min(5, avgChange));
  const score = Math.round(((clamped + 5) / 10) * 100);

  const label = score >= 70 ? 'bullish'
    : score >= 55 ? 'slightly bullish'
    : score >= 45 ? 'neutral'
    : score >= 30 ? 'slightly bearish'
    : 'bearish';

  res.json({ score, label, avgChange: +avgChange.toFixed(3), based_on: equities.length });
});

// Single symbol
router.get('/:symbol', (req, res) => {
  const { data } = getMarketsCache();
  const sym = req.params.symbol.toUpperCase();
  if (!data?.[sym]) {
    return res.status(404).json({ error: `symbol ${sym} not found` });
  }
  res.json(data[sym]);
});

export default router;
