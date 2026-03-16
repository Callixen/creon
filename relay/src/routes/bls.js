/**
 * BLS routes
 * GET /api/bls — all tracked series (latest values)
 * GET /api/bls/highlights — key macro indicators formatted for display
 * GET /api/bls/occupation/:soc — single occupation wage/employment detail
 * GET /api/bls/series/:id — named series by key
 */

import { Router } from 'express';
import { getBLSCache, fetchOccupationDetail, BLS_SERIES } from '../sources/bls.js';
import { config } from '../config.js';

const router = Router();

// All series — latest snapshot
router.get('/', (req, res) => {
  const { data, lastUpdated } = getBLSCache();
  res.json({ data: data || {}, lastUpdated });
});

// Highlights panel — curated for dashboard display
router.get('/highlights', (req, res) => {
  const { data, lastUpdated } = getBLSCache();
  if (!data) return res.status(503).json({ error: 'BLS data not yet loaded' });

  const highlights = [
    {
      key: 'unemploymentRate',
      label: 'Unemployment Rate',
      value: data.unemploymentRate?.value,
      change: data.unemploymentRate?.change,
      unit: '%',
      direction: getDirection(data.unemploymentRate?.change, true), // lower = better
    },
    {
      key: 'laborForceParticipation',
      label: 'Labor Participation',
      value: data.laborForceParticipation?.value,
      change: data.laborForceParticipation?.change,
      unit: '%',
      direction: getDirection(data.laborForceParticipation?.change, false),
    },
    {
      key: 'avgHourlyEarnings',
      label: 'Avg Hourly Earnings',
      value: data.avgHourlyEarnings?.value,
      change: data.avgHourlyEarnings?.change,
      unit: '$',
      direction: getDirection(data.avgHourlyEarnings?.change, false),
    },
    {
      key: 'nonfarmPayroll',
      label: 'Nonfarm Payroll',
      value: data.nonfarmPayroll?.value,
      change: data.nonfarmPayroll?.change,
      unit: 'K',
      direction: getDirection(data.nonfarmPayroll?.change, false),
    },
    {
      key: 'techOccupations',
      label: 'Tech Occupations',
      value: data.techOccupations?.value,
      change: data.techOccupations?.change,
      unit: 'K',
      direction: getDirection(data.techOccupations?.change, false),
    },
  ].filter(h => h.value != null);

  res.json({ highlights, lastUpdated, seriesCount: Object.keys(data).length });
});

// Named series lookup
router.get('/series/:key', (req, res) => {
  const { data } = getBLSCache();
  const key = req.params.key;
  if (!BLS_SERIES[key]) {
    return res.status(404).json({ error: `unknown series key "${key}"`, available: Object.keys(BLS_SERIES) });
  }
  if (!data?.[key]) {
    return res.status(503).json({ error: 'data not yet available for this series' });
  }
  res.json(data[key]);
});

// Occupation detail by SOC code (e.g. 15-1252)
router.get('/occupation/:soc', async (req, res) => {
  const soc = req.params.soc;
  // Validate SOC format
  if (!/^\d{2}-\d{4}$/.test(soc)) {
    return res.status(400).json({ error: 'SOC code must be in format XX-XXXX (e.g. 15-1252)' });
  }

  try {
    const detail = await fetchOccupationDetail(soc, config.apis.bls);
    if (!detail) {
      return res.status(404).json({ error: `no data found for SOC ${soc}` });
    }
    res.json(detail);
  } catch (err) {
    res.status(502).json({ error: `BLS lookup failed: ${err.message}` });
  }
});

// ---- helpers ----

function getDirection(change, invertedScale) {
  if (change == null) return 'neutral';
  const positive = change > 0;
  return (positive !== invertedScale) ? 'positive' : 'negative';
}

export default router;
