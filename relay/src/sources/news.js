/**
 * Research signals and news feed
 * Primary: Newsdata.io live feed
 * Fallback: curated static research citations
 */

import fetch from 'node-fetch';
import { broadcast } from '../ws/broadcast.js';

// Fallback static citations — always shown even without API key
export const STATIC_CITATIONS = [
  { title: 'WEF Future of Jobs 2025: 170M new roles, 92M displaced by AI & automation', source: 'World Economic Forum', url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/', year: '2025' },
  { title: 'Goldman Sachs: AI could impact 300 million full-time jobs globally', source: 'Goldman Sachs Research', url: 'https://www.goldmansachs.com/intelligence/pages/generative-ai-could-raise-global-gdp-by-7-percent.html', year: '2023' },
  { title: 'IMF 2024: Gen-AI could affect 40% of jobs — complementing or displacing labour', source: 'IMF Staff Discussion Notes SDN/2024/001', url: 'https://www.imf.org/en/Publications/Staff-Discussion-Notes/Issues/2024/01/14/Gen-AI', year: '2024' },
  { title: 'Stanford AI Index 2024: AI adoption, capability benchmarks, economic impact', source: 'Stanford HAI', url: 'https://aiindex.stanford.edu/report/', year: '2024' },
  { title: 'Brynjolfsson et al.: Generative AI at Work — +14% productivity in customer support', source: 'arxiv.org / Nov 2024', url: 'https://arxiv.org/abs/2304.11771', year: '2024' },
  { title: 'Harvard Business School: AI boosts knowledge worker output up to 40% on some tasks', source: "Dell'Acqua et al. / HBS 2023", url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4573321', year: '2023' },
  { title: 'Noy & Zhang (Science 2023): GenAI raises productivity — strongest gains for lower-skilled', source: 'Science Vol. 381', url: 'https://www.science.org/doi/10.1126/science.adh2586', year: '2023' },
  { title: 'David Autor (NBER 2024): AI could rebuild middle-class jobs if directed at augmentation', source: 'NBER Working Paper 32140', url: 'https://www.nber.org/system/files/working_papers/w32140/w32140.pdf', year: '2024' },
  { title: 'IFR World Robotics 2024: global robot density in factories doubled in seven years', source: 'International Federation of Robotics', url: 'https://ifr.org/ifr-press-releases/news/global-robot-density-in-factories-doubled-in-seven-years', year: '2024' },
  { title: 'McKinsey: 12M US workers may need to switch occupations by 2030', source: 'McKinsey Global Institute', url: 'https://www.mckinsey.com', year: '2025' },
  { title: 'OpenAI/UPenn: GPT-4 affects 80% of US workforce at some level of exposure', source: 'Eloundou et al. / arxiv 2023', url: 'https://arxiv.org/abs/2303.10130', year: '2023' },
  { title: 'World Bank 2024: GenAI adoption highest in high-income, high-education countries', source: 'World Bank Policy Research WP 10870', url: 'https://documents1.worldbank.org/curated/en/099720008192430535/', year: '2024' },
];

const LIVE_QUERY = 'AI jobs automation labor market displacement';
const LIVE_CATEGORIES = 'technology,business';
const LIVE_COUNTRIES = 'us,gb,ca,au';

let liveCache = [];
let lastUpdated = null;

export async function pollNews(apiKey) {
  if (!apiKey) {
    console.log('[news] no API key — using static citations only');
    return STATIC_CITATIONS;
  }

  try {
    const url = new URL('https://newsdata.io/api/1/latest');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('country', LIVE_COUNTRIES);
    url.searchParams.set('language', 'en');
    url.searchParams.set('category', LIVE_CATEGORIES);
    url.searchParams.set('q', LIVE_QUERY);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.results?.length) throw new Error('empty results');

    liveCache = json.results.slice(0, 20).map(article => ({
      title: article.title?.slice(0, 200) || '(no title)',
      source: article.source_id || 'unknown',
      url: article.link || '',
      time: article.pubDate || '',
      live: true,
    }));

    lastUpdated = Date.now();
    const combined = [...liveCache, ...STATIC_CITATIONS.slice(0, 5)];
    broadcast('news', combined);
    console.log(`[news] ${liveCache.length} live signals fetched`);
    return combined;

  } catch (err) {
    console.error('[news] fetch error:', err.message);
    // Fall back to static on failure
    return [...liveCache, ...STATIC_CITATIONS];
  }
}

export function getNewsCache() {
  return { live: liveCache, static: STATIC_CITATIONS, lastUpdated };
}

// Deduplicate articles by title similarity
export function dedupe(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.title?.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
