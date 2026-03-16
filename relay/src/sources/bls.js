/**
 * BLS (Bureau of Labor Statistics) data source
 * Fetches employment statistics, occupation data, and job outlook projections
 * Uses the BLS public API v2
 */

import fetch from 'node-fetch';
import { broadcast } from '../ws/broadcast.js';

const BLS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

// Key economic series IDs
export const BLS_SERIES = {
  unemploymentRate:          'LNS14000000', // Civilian unemployment rate (%)
  laborForceParticipation:   'LNS11300000', // Labor force participation rate (%)
  avgHourlyEarnings:         'CES0500000003', // Avg hourly earnings, private sector ($)
  avgWeeklyHours:            'CES0500000002', // Avg weekly hours, private sector
  nonfarmPayroll:            'CES0000000001', // Total nonfarm payroll (thousands)
  informationSector:         'CES5000000001', // Information sector employment
  professionalServices:      'CES6000000001', // Professional & business services
  techOccupations:           'CES6054151101', // Computer & math occupations
};

// AI-exposure risk labels for display
const SERIES_LABELS = {
  unemploymentRate:        'Unemployment Rate',
  laborForceParticipation: 'Labor Force Participation',
  avgHourlyEarnings:       'Avg Hourly Earnings',
  avgWeeklyHours:          'Avg Weekly Hours',
  nonfarmPayroll:          'Nonfarm Payroll',
  informationSector:       'Information Sector Employment',
  professionalServices:    'Professional Services Employment',
  techOccupations:         'Computer & Math Occupations',
};

let cache = null;
let lastUpdated = null;

export async function pollBLS(apiKey = '') {
  const seriesIds = Object.values(BLS_SERIES);
  const body = {
    seriesid: seriesIds,
    startyear: '2024',
    endyear: '2026',
  };
  if (apiKey) body.registrationkey = apiKey;

  try {
    const res = await fetch(BLS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.status !== 'REQUEST_SUCCEEDED') {
      throw new Error(`BLS API: ${json.message?.join('; ') || 'unknown error'}`);
    }

    const keys = Object.keys(BLS_SERIES);
    const highlights = {};

    json.Results.series.forEach((series, i) => {
      const key = keys[i];
      const latest = series.data[0];
      const prev = series.data[1];
      if (!latest) return;

      const value = parseFloat(latest.value);
      const prevValue = prev ? parseFloat(prev.value) : null;

      highlights[key] = {
        key,
        label: SERIES_LABELS[key] || key,
        value,
        prevValue,
        change: prevValue !== null ? +(value - prevValue).toFixed(3) : null,
        period: latest.period,
        year: latest.year,
        footnotes: latest.footnotes?.map(f => f.text).filter(Boolean) || [],
      };
    });

    cache = highlights;
    lastUpdated = Date.now();
    broadcast('bls', highlights);
    console.log(`[bls] updated ${Object.keys(highlights).length} series`);
    return highlights;

  } catch (err) {
    console.error('[bls] fetch error:', err.message);
    return cache; // return stale on failure
  }
}

// Fetch occupation wage data for a specific SOC code
export async function fetchOccupationDetail(socCode, apiKey = '') {
  // Construct BLS OES series ID from SOC code
  // Format: OEUS000000{SOC_no_dash}03 = mean annual wage
  const normalized = socCode.replace('-', '');
  const seriesId = `OEUS0000000${normalized}03`;

  const body = { seriesid: [seriesId], startyear: '2023', endyear: '2026' };
  if (apiKey) body.registrationkey = apiKey;

  try {
    const res = await fetch(BLS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json();
    const data = json.Results?.series?.[0]?.data;
    if (!data?.length) return null;
    return {
      socCode,
      meanAnnualWage: parseFloat(data[0].value),
      year: data[0].year,
    };
  } catch {
    return null;
  }
}

export function getBLSCache() {
  return { data: cache, lastUpdated };
}
