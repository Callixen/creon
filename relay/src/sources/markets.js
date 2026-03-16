/**
 * Markets data source
 * Polls Yahoo Finance for real-time prices on AI-adjacent equities and crypto
 * Falls back to cached values on failure
 */

import fetch from 'node-fetch';
import { broadcast } from '../ws/broadcast.js';

// Symbols to track
export const EQUITY_SYMBOLS = ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'AMD', 'TSLA', 'ORCL', 'IBM'];
export const CRYPTO_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
export const ALL_SYMBOLS = [...EQUITY_SYMBOLS, ...CRYPTO_SYMBOLS];

let cache = {};
let lastUpdated = null;
let failCount = 0;

async function fetchSymbol(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; creon-relay/1.0)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('no meta');

  const price = meta.regularMarketPrice;
  const prev = meta.previousClose || meta.chartPreviousClose;
  const change = price - prev;
  const changePct = (change / prev) * 100;

  return {
    symbol,
    price: +price.toFixed(4),
    prevClose: +prev.toFixed(4),
    change: +change.toFixed(4),
    changePct: +changePct.toFixed(3),
    currency: meta.currency || 'USD',
    exchangeName: meta.exchangeName || '',
    marketState: meta.marketState || '',
    ts: Date.now(),
  };
}

export async function pollMarkets() {
  const results = {};
  let successCount = 0;

  await Promise.allSettled(
    ALL_SYMBOLS.map(async (symbol) => {
      try {
        results[symbol] = await fetchSymbol(symbol);
        successCount++;
      } catch (err) {
        // Keep stale cached value if available
        if (cache[symbol]) results[symbol] = cache[symbol];
      }
    })
  );

  if (successCount > 0) {
    cache = { ...cache, ...results };
    lastUpdated = Date.now();
    failCount = 0;
    broadcast('markets', results);
    console.log(`[markets] updated ${successCount}/${ALL_SYMBOLS.length} symbols`);
  } else {
    failCount++;
    console.warn(`[markets] all symbols failed (streak: ${failCount})`);
  }

  return results;
}

export function getMarketsCache() {
  return { data: cache, lastUpdated, failCount };
}

// Price-change alert thresholds — broadcast a special alert if large moves detected
const ALERT_THRESHOLD_PCT = 5;

export function checkForAlerts(prev, current) {
  const alerts = [];
  for (const symbol of Object.keys(current)) {
    if (!prev[symbol]) continue;
    const prevPrice = prev[symbol].price;
    const currPrice = current[symbol].price;
    const movePct = Math.abs(((currPrice - prevPrice) / prevPrice) * 100);
    if (movePct >= ALERT_THRESHOLD_PCT) {
      alerts.push({
        symbol,
        direction: currPrice > prevPrice ? 'up' : 'down',
        movePct: +movePct.toFixed(2),
        from: prevPrice,
        to: currPrice,
      });
    }
  }
  if (alerts.length) broadcast('market_alert', alerts);
  return alerts;
}
