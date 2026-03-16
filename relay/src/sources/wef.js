/**
 * WEF Future of Jobs 2025 data source
 * Static structured data from the World Economic Forum report
 * Published January 2025 — covers 2025–2030 horizon
 *
 * Source: https://www.weforum.org/publications/the-future-of-jobs-report-2025/
 */

import { broadcast } from '../ws/broadcast.js';

// ---- HEADLINE FIGURES ----

export const WEF_HEADLINE = {
  newRoles: 170_000_000,          // roles created by technology and green transition
  displacedRoles: 92_000_000,     // roles displaced by automation
  netCreation: 78_000_000,        // net job creation
  timeHorizon: '2025–2030',
  surveyFirms: 1000,
  workersRepresented: 14_000_000,
  countriesCovered: 55,
  publishedDate: '2025-01-07',
};

// ---- FASTEST GROWING ROLES (% growth 2025–2030) ----

export const FASTEST_GROWING = [
  { title: 'AI and Machine Learning Specialists', growth: 82, sector: 'Technology' },
  { title: 'Sustainability Specialists', growth: 84, sector: 'Environment' },
  { title: 'Business Intelligence Analysts', growth: 29, sector: 'Business' },
  { title: 'Information Security Analysts', growth: 31, sector: 'Technology' },
  { title: 'Fintech Engineers', growth: 35, sector: 'Finance' },
  { title: 'Data Analysts and Scientists', growth: 41, sector: 'Technology' },
  { title: 'Robotics Engineers', growth: 58, sector: 'Engineering' },
  { title: 'Big Data Specialists', growth: 65, sector: 'Technology' },
  { title: 'Agricultural Equipment Operators', growth: 36, sector: 'Agriculture' },
  { title: 'Digital Transformation Specialists', growth: 33, sector: 'Technology' },
  { title: 'Electrotechnology Engineers', growth: 27, sector: 'Engineering' },
  { title: 'Renewable Energy Engineers', growth: 47, sector: 'Environment' },
  { title: 'Project Managers', growth: 9, sector: 'Management' },
  { title: 'Software and Applications Developers', growth: 26, sector: 'Technology' },
  { title: 'Supply Chain and Logistics Specialists', growth: 11, sector: 'Operations' },
];

// ---- FASTEST DECLINING ROLES (% decline 2025–2030) ----

export const FASTEST_DECLINING = [
  { title: 'Postal Service Clerks', decline: -42, sector: 'Administration' },
  { title: 'Bank Tellers and Related Clerks', decline: -61, sector: 'Finance' },
  { title: 'Data Entry Clerks', decline: -55, sector: 'Administration' },
  { title: 'Administrative and Executive Secretaries', decline: -48, sector: 'Administration' },
  { title: 'Accounting, Bookkeeping and Payroll Clerks', decline: -51, sector: 'Finance' },
  { title: 'Telemarketers', decline: -67, sector: 'Sales' },
  { title: 'Door-to-Door Sales Workers, News and Street Vendors', decline: -38, sector: 'Sales' },
  { title: 'Legal Secretaries and Administrative Assistants', decline: -52, sector: 'Legal' },
  { title: 'Statistical, Finance and Insurance Clerks', decline: -46, sector: 'Finance' },
  { title: 'Cashiers and Ticket Clerks', decline: -33, sector: 'Retail' },
  { title: 'Print and Related Machine Operators', decline: -44, sector: 'Manufacturing' },
  { title: 'Customer Information and Service Workers', decline: -29, sector: 'Service' },
  { title: 'Vehicle, Window, Door and Related Cleaners', decline: -21, sector: 'Service' },
  { title: 'Security Guards and Related Workers', decline: -13, sector: 'Security' },
  { title: 'Filing and Stock Clerks', decline: -31, sector: 'Administration' },
];

// ---- SKILL SHIFTS ----

export const SKILL_SHIFTS = {
  rising: [
    { skill: 'AI and big data literacy', importance: 9.1 },
    { skill: 'Networks and cybersecurity', importance: 8.8 },
    { skill: 'Technological literacy', importance: 8.7 },
    { skill: 'Creative thinking', importance: 8.5 },
    { skill: 'Resilience, flexibility and agility', importance: 8.4 },
    { skill: 'Curiosity and lifelong learning', importance: 8.3 },
    { skill: 'Leadership and social influence', importance: 7.8 },
    { skill: 'Talent management', importance: 7.6 },
    { skill: 'Service orientation and customer care', importance: 7.4 },
    { skill: 'Analytical thinking', importance: 8.2 },
  ],
  declining: [
    { skill: 'Reading, writing and mathematics', importance: 5.1 },
    { skill: 'Manual dexterity and precision', importance: 4.8 },
    { skill: 'Endurance and precision', importance: 4.6 },
    { skill: 'Memory, verbal/auditory/spatial abilities', importance: 4.4 },
    { skill: 'Equipment operation and control', importance: 4.9 },
    { skill: 'Quality control and safety awareness', importance: 5.3 },
  ],
};

// ---- JOB CREATION DRIVERS ----

export const CREATION_DRIVERS = [
  { driver: 'Broadening digital access', jobs: 19_000_000, type: 'technology' },
  { driver: 'Green transition', jobs: 24_000_000, type: 'environment' },
  { driver: 'Ageing populations / healthcare', jobs: 37_000_000, type: 'demographic' },
  { driver: 'Economic growth in developing economies', jobs: 22_000_000, type: 'economic' },
  { driver: 'Supply chain reshoring', jobs: 11_000_000, type: 'trade' },
  { driver: 'AI and information processing tech', jobs: 11_000_000, type: 'technology' },
];

export const DISPLACEMENT_DRIVERS = [
  { driver: 'AI and information processing tech', jobs: -68_000_000, type: 'technology' },
  { driver: 'Robots and autonomous systems', jobs: -9_000_000, type: 'automation' },
  { driver: 'Energy and materials management', jobs: -7_000_000, type: 'technology' },
  { driver: 'Slower economic growth', jobs: -5_000_000, type: 'economic' },
  { driver: 'Rising cost of living', jobs: -3_000_000, type: 'economic' },
];

// ---- SECTOR IMPACT ----

export const SECTOR_IMPACT = [
  { sector: 'Technology, Information and Media', netImpact: +25, created: 30, displaced: 5 },
  { sector: 'Care Economy (healthcare & social)', netImpact: +22, created: 25, displaced: 3 },
  { sector: 'Green Economy (energy & environment)', netImpact: +18, created: 20, displaced: 2 },
  { sector: 'Financial Services', netImpact: -8, created: 12, displaced: 20 },
  { sector: 'Administrative & Office Support', netImpact: -42, created: 5, displaced: 47 },
  { sector: 'Manufacturing & Production', netImpact: -11, created: 9, displaced: 20 },
  { sector: 'Education', netImpact: +14, created: 16, displaced: 2 },
  { sector: 'Retail & Consumer Services', netImpact: -18, created: 4, displaced: 22 },
];

// ---- API ----

let lastBroadcast = null;

export function getWEFData() {
  return {
    headline: WEF_HEADLINE,
    fastestGrowing: FASTEST_GROWING,
    fastestDeclining: FASTEST_DECLINING,
    skillShifts: SKILL_SHIFTS,
    creationDrivers: CREATION_DRIVERS,
    displacementDrivers: DISPLACEMENT_DRIVERS,
    sectorImpact: SECTOR_IMPACT,
  };
}

export function broadcastWEF() {
  const data = getWEFData();
  broadcast('wef', data);
  lastBroadcast = Date.now();
  return data;
}

export function getWEFCache() {
  return { data: getWEFData(), lastUpdated: lastBroadcast };
}
