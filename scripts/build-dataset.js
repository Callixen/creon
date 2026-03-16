#!/usr/bin/env node
/**
 * CREON dataset builder
 * Fetches BLS OES data, merges with AI exposure scores, and writes dashboard-ready JSON
 *
 * Usage: node scripts/build-dataset.js [--out ./dashboard/data/occupations.json]
 */

import fetch from 'node-fetch';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, '..');

const BLS_API      = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const BLS_API_KEY  = process.env.BLS_API_KEY || '';

// Top 50 SOC series to fetch from BLS (mean annual wage, code ending in 08)
const SOC_CODES = [
  '11-1011','11-1021','11-2021','11-3031','13-2011','13-2051','15-1211','15-1212',
  '15-1251','15-1252','15-1253','15-2051','17-2061','17-2071','17-2112',
  '19-3011','23-1011','23-2011','25-1000','27-3041','27-3043','29-1141',
  '29-1210','33-3051','35-2014','41-2011','43-3021','43-3031','43-4051',
  '43-9021','43-9022','43-9061','45-2092','47-2031','47-2111','49-3023',
  '51-2092','51-4041','53-3032','53-3033',
];

function blsSeriesId(soc) {
  // OES mean annual wage: OEU000000{normalized_soc}08
  return `OEU0000000${soc.replace('-', '')}08`;
}

async function fetchBLSWages(socCodes, apiKey) {
  const seriesIds = socCodes.map(blsSeriesId);
  const chunks = [];
  for (let i = 0; i < seriesIds.length; i += 50) {
    chunks.push(seriesIds.slice(i, i + 50));
  }

  const results = {};
  for (const chunk of chunks) {
    const body = { seriesid: chunk, startyear: '2023', endyear: '2024' };
    if (apiKey) body.registrationkey = apiKey;

    const res = await fetch(BLS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (json.status !== 'REQUEST_SUCCEEDED') {
      console.warn('[bls] API warning:', json.message?.join('; '));
      continue;
    }

    for (const series of json.Results.series) {
      const soc = socCodes.find(s => series.seriesID.includes(s.replace('-', '')));
      if (!soc) continue;
      const latest = series.data?.[0];
      if (latest) results[soc] = parseFloat(latest.value);
    }

    if (chunks.length > 1) await sleep(1000); // BLS rate limit: 1 req/s
  }

  return results;
}

// AI exposure scores from research synthesis
// Sources: Felten et al. 2023, Eloundou et al./OpenAI 2023, Goldman Sachs 2023
const EXPOSURE_OVERRIDES = {
  '43-9021': 9.4, '43-9022': 9.3, '43-3031': 9.2, '27-3091': 9.2,
  '27-3043': 9.0, '43-9031': 9.0, '43-3051': 9.0, '43-4151': 9.0,
  '43-6014': 8.9, '13-2011': 8.6, '27-3042': 8.7, '27-3041': 8.7,
  '15-1251': 9.1, '15-1252': 8.7, '15-1253': 8.8, '23-2011': 8.7,
  '13-1111': 8.3, '15-2031': 8.7, '15-2051': 8.6,
};

function computeExposureScore(soc, title) {
  if (EXPOSURE_OVERRIDES[soc]) return EXPOSURE_OVERRIDES[soc];

  // Heuristic scoring based on task profile
  const titleLower = title.toLowerCase();
  let score = 5.0;

  if (/data entry|clerk|typist|keypunch/.test(titleLower)) score += 3.5;
  if (/bookkeep|account|payroll|billing/.test(titleLower)) score += 3.0;
  if (/analyst|analyst/.test(titleLower)) score += 2.0;
  if (/programmer|developer|software/.test(titleLower)) score += 2.5;
  if (/writer|editor|journalist|reporter/.test(titleLower)) score += 3.0;
  if (/translator|interpreter/.test(titleLower)) score += 3.5;
  if (/customer service|receptionist/.test(titleLower)) score += 2.5;
  if (/nurse|physician|doctor|therapist/.test(titleLower)) score -= 2.0;
  if (/plumber|electrician|carpenter|welder/.test(titleLower)) score -= 2.5;
  if (/teacher|counselor|social worker/.test(titleLower)) score -= 2.0;
  if (/firefighter|police|guard/.test(titleLower)) score -= 1.5;
  if (/cook|chef|waiter|dishwasher/.test(titleLower)) score -= 1.5;

  return Math.max(0, Math.min(10, +score.toFixed(1)));
}

async function buildDataset(opts = {}) {
  const outDir = opts.outDir || join(ROOT, 'dashboard', 'data');
  const outFile = opts.outFile || join(outDir, 'occupations.json');

  console.log('[build] Fetching BLS wage data…');
  let wages = {};
  try {
    wages = await fetchBLSWages(SOC_CODES, BLS_API_KEY);
    console.log(`[build] Got wages for ${Object.keys(wages).length} SOC codes`);
  } catch (err) {
    console.warn('[build] BLS fetch failed, using embedded wages:', err.message);
  }

  // Import occupations from relay module
  const { OCCUPATIONS } = await import('../relay/src/sources/occupations.js');

  const dataset = OCCUPATIONS.map(occ => ({
    soc: occ.soc,
    title: occ.title,
    sector: occ.sector,
    employment: occ.employment,
    medianWage: wages[occ.soc] || occ.medianWage,
    meanWage: occ.meanWage || null,
    aiExposure: occ.aiExposure,
    outlook: occ.outlook,
    education: occ.education,
  }));

  const meta = {
    generated: new Date().toISOString(),
    count: dataset.length,
    totalEmployment: dataset.reduce((s, o) => s + o.employment, 0),
    avgExposure: +(dataset.reduce((s, o) => s + o.aiExposure, 0) / dataset.length).toFixed(3),
    sources: ['BLS OES 2024', 'Felten et al. 2023', 'Eloundou et al./OpenAI 2023', 'Goldman Sachs 2023'],
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify({ meta, occupations: dataset }, null, 2));
  console.log(`[build] Written ${dataset.length} occupations to ${outFile}`);
  console.log(`[build] Total employment: ${meta.totalEmployment.toLocaleString()}`);
  console.log(`[build] Avg AI exposure: ${meta.avgExposure}/10`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Run if called directly
buildDataset().catch(err => {
  console.error('[build] Fatal:', err);
  process.exit(1);
});
