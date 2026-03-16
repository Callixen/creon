/**
 * CREON client data layer
 * Manages occupation data, state risk scores, WEF figures, and fear index
 * Provides filtering, aggregation, and normalisation for all chart modules
 */

'use strict';

// ---- SECTOR DEFINITIONS ----

export const SECTOR_ORDER = [
  'Technology', 'Mathematics', 'Finance', 'Office & Admin', 'Business',
  'Legal', 'Media', 'Management', 'Sales', 'Engineering', 'Architecture',
  'Education', 'Healthcare', 'Life Sciences', 'Physical Sciences',
  'Social Sciences', 'Arts', 'Entertainment', 'Construction',
  'Transportation', 'Production', 'Installation & Repair',
  'Protective Services', 'Food Service', 'Maintenance',
  'Agriculture', 'Personal Services', 'Social Services', 'Religious',
];

export const SECTOR_ICONS = {
  Technology: '💻', Mathematics: '📐', Finance: '📊', 'Office & Admin': '🗂️',
  Business: '📋', Legal: '⚖️', Media: '📰', Management: '🏢', Sales: '🤝',
  Engineering: '⚙️', Architecture: '🏛️', Education: '🎓', Healthcare: '🏥',
  'Life Sciences': '🔬', 'Physical Sciences': '⚗️', 'Social Sciences': '🧠',
  Arts: '🎨', Entertainment: '🎭', Construction: '🏗️', Transportation: '🚛',
  Production: '🏭', 'Installation & Repair': '🔧', 'Protective Services': '🛡️',
  'Food Service': '🍽️', Maintenance: '🧹', Agriculture: '🌾',
  'Personal Services': '💇', 'Social Services': '🤲', Religious: '⛪',
};

// ---- WEF 2025 DATA ----

export const WEF_2025 = {
  newRoles: 170_000_000,
  displacedRoles: 92_000_000,
  netJobCreation: 78_000_000,
  timeHorizon: '2025–2030',
  fastestGrowing: [
    { title: 'AI and Machine Learning Specialists', growth: 82 },
    { title: 'Data Analysts and Scientists', growth: 41 },
    { title: 'Big Data Specialists', growth: 65 },
    { title: 'Information Security Analysts', growth: 31 },
    { title: 'Fintech Engineers', growth: 35 },
    { title: 'Renewable Energy Engineers', growth: 47 },
    { title: 'Environmental Engineers', growth: 34 },
    { title: 'Business Intelligence Analysts', growth: 29 },
    { title: 'Agricultural Equipment Operators', growth: 36 },
    { title: 'Digital Marketing Specialists', growth: 43 },
    { title: 'Robotics Engineers', growth: 58 },
    { title: 'Electrotechnology Engineers', growth: 27 },
  ],
  fastestDecling: [
    { title: 'Data Entry Clerks', decline: -55 },
    { title: 'Administrative and Executive Secretaries', decline: -48 },
    { title: 'Accounting, Bookkeeping and Payroll Clerks', decline: -51 },
    { title: 'Bank Tellers and Related Clerks', decline: -61 },
    { title: 'Postal Service Clerks', decline: -42 },
    { title: 'Cashiers and Ticket Clerks', decline: -33 },
    { title: 'Customer Information and Service Workers', decline: -29 },
    { title: 'Door-to-Door Sales Workers', decline: -38 },
    { title: 'Print and Related Machine Operators', decline: -44 },
    { title: 'Legal Secretaries', decline: -52 },
    { title: 'Telemarketers', decline: -67 },
    { title: 'Statistical, Finance and Insurance Clerks', decline: -46 },
  ],
  skillShifts: {
    risingSkills: [
      'AI and big data literacy', 'Networks and cybersecurity', 'Creative thinking',
      'Resilience and adaptability', 'Curiosity and lifelong learning',
      'Technological literacy', 'Design and user experience', 'Motivation and self-awareness',
    ],
    decliningSkills: [
      'Reading, writing and arithmetic', 'Manual dexterity and precision',
      'Attention to detail', 'Memory, verbal/auditory abilities',
      'Equipment operation and control', 'Dependability and attention',
    ],
  },
};

// ---- FEAR INDEX DATA POINTS ----

export const FEAR_INDEX_SOURCES = [
  { year: 2021, score: 4.2, label: 'Pre-ChatGPT baseline', source: 'Pew Research' },
  { year: 2022, score: 4.8, label: 'Automation anxiety rising', source: 'Axios/Ipsos' },
  { year: 2023, score: 5.9, label: 'ChatGPT launches, mass awareness', source: 'SHRM 2023' },
  { year: 2024, score: 6.7, label: 'GPT-4, Gemini, Claude 3 deployment', source: 'Gallup 2024' },
  { year: 2025, score: 7.1, label: 'Agentic AI and workforce restructuring', source: 'WEF 2025' },
];

export const FEAR_FACTS = [
  { stat: '78%', detail: 'of workers fear AI will make their skills obsolete within 5 years', source: 'Axios/Ipsos 2024' },
  { stat: '37%', detail: 'of business leaders plan to reduce headcount due to AI tools', source: 'SHRM 2024' },
  { stat: '12M', detail: 'US workers may need to switch occupations by 2030', source: 'McKinsey 2025' },
  { stat: '$3.7T', detail: 'in annual wages at high AI displacement risk (7+ exposure score)', source: 'BLS OES 2024' },
  { stat: '92M', detail: 'global roles expected to be displaced by automation by 2030', source: 'WEF 2025' },
  { stat: '85%', detail: 'of jobs in 2030 do not yet exist today', source: 'Dell Technologies' },
  { stat: '300M', detail: 'full-time equivalent jobs affected by generative AI globally', source: 'Goldman Sachs 2023' },
  { stat: '40%', detail: 'of jobs globally exposed to AI at some level (IMF 2024)', source: 'IMF 2024' },
];

// ---- US STATE RISK SCORES ----

export const STATE_RISK = {
  'Alabama': 5.9, 'Alaska': 4.1, 'Arizona': 6.2, 'Arkansas': 5.4,
  'California': 7.1, 'Colorado': 6.8, 'Connecticut': 7.0, 'Delaware': 6.9,
  'Florida': 6.3, 'Georgia': 6.1, 'Hawaii': 4.8, 'Idaho': 5.2,
  'Illinois': 6.7, 'Indiana': 5.8, 'Iowa': 5.6, 'Kansas': 5.7,
  'Kentucky': 5.3, 'Louisiana': 5.1, 'Maine': 5.0, 'Maryland': 6.9,
  'Massachusetts': 7.2, 'Michigan': 5.9, 'Minnesota': 6.4, 'Mississippi': 5.0,
  'Missouri': 5.8, 'Montana': 4.4, 'Nebraska': 5.7, 'Nevada': 5.5,
  'New Hampshire': 6.1, 'New Jersey': 7.0, 'New Mexico': 5.3, 'New York': 7.3,
  'North Carolina': 6.2, 'North Dakota': 4.9, 'Ohio': 5.9, 'Oklahoma': 5.4,
  'Oregon': 6.3, 'Pennsylvania': 6.4, 'Rhode Island': 6.5, 'South Carolina': 5.7,
  'South Dakota': 4.8, 'Tennessee': 5.9, 'Texas': 6.5, 'Utah': 6.4,
  'Vermont': 5.2, 'Virginia': 7.0, 'Washington': 7.1, 'West Virginia': 4.6,
  'Wisconsin': 5.8, 'Wyoming': 4.3, 'District of Columbia': 7.8,
};

// ---- AGGREGATION HELPERS ----

export function groupBySector(occupations) {
  const map = {};
  for (const occ of occupations) {
    if (!map[occ.sector]) map[occ.sector] = [];
    map[occ.sector].push(occ);
  }
  return map;
}

export function sectorStats(occupations) {
  const grouped = groupBySector(occupations);
  return Object.entries(grouped).map(([sector, occs]) => ({
    sector,
    count: occs.length,
    employment: occs.reduce((s, o) => s + (o.employment || 0), 0),
    avgExposure: occs.reduce((s, o) => s + o.aiExposure, 0) / occs.length,
    avgWage: occs.reduce((s, o) => s + (o.medianWage || 0), 0) / occs.length,
    maxExposure: Math.max(...occs.map(o => o.aiExposure)),
    minExposure: Math.min(...occs.map(o => o.aiExposure)),
  })).sort((a, b) => b.avgExposure - a.avgExposure);
}

export function exposureTiers(occupations) {
  return {
    critical: occupations.filter(o => o.aiExposure >= 8).length,
    high:     occupations.filter(o => o.aiExposure >= 6 && o.aiExposure < 8).length,
    medium:   occupations.filter(o => o.aiExposure >= 4 && o.aiExposure < 6).length,
    low:      occupations.filter(o => o.aiExposure < 4).length,
  };
}

export function weightedExposure(occupations) {
  const totalEmp = occupations.reduce((s, o) => s + (o.employment || 0), 0);
  if (!totalEmp) return 0;
  return occupations.reduce((s, o) => s + (o.aiExposure * (o.employment || 0) / totalEmp), 0);
}

export function wagesAtRisk(occupations, threshold = 7) {
  return occupations
    .filter(o => o.aiExposure >= threshold)
    .reduce((s, o) => s + (o.employment || 0) * (o.medianWage || 0), 0);
}

export function filterOccupations(occupations, { sector, tier, query } = {}) {
  return occupations.filter(occ => {
    if (sector && occ.sector !== sector) return false;
    if (tier === 'high'   && occ.aiExposure < 7)  return false;
    if (tier === 'medium' && (occ.aiExposure < 4 || occ.aiExposure >= 7)) return false;
    if (tier === 'low'    && occ.aiExposure >= 4)  return false;
    if (query) {
      const q = query.toLowerCase();
      if (!occ.title.toLowerCase().includes(q) && !occ.sector.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function computeFearIndex(sources = FEAR_INDEX_SOURCES) {
  const latest = sources[sources.length - 1];
  return latest?.score ?? 6.4;
}

// ---- MARKET HELPERS ----

export function tickerFormat(price, symbol) {
  const isCrypto = symbol?.includes('-USD');
  if (isCrypto) {
    if (price >= 10000) return `$${Math.round(price).toLocaleString()}`;
    if (price >= 100)   return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(2)}`;
}

export function changeClass(pct) {
  if (pct > 0) return 'positive';
  if (pct < 0) return 'negative';
  return 'neutral';
}
