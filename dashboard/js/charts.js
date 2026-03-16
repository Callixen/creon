/**
 * CREON Chart Renderers
 * D3-based visualisation modules: treemap, heatmap, choropleth, scatter, gauge
 * Each renderer is a pure function: (container, data, options) => { update, destroy }
 */

'use strict';

// ---- COLOUR SCALE ----

const EXPOSURE_SCALE = d3.scaleLinear()
  .domain([0, 2, 4, 6, 8, 10])
  .range(['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'])
  .clamp(true);

function exposureColour(score) {
  return EXPOSURE_SCALE(score ?? 5);
}

// ---- TREEMAP ----

export function renderTreemap(container, occupations, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;

  const width  = opts.width  || el.clientWidth  || 800;
  const height = opts.height || el.clientHeight || 600;
  const onHover  = opts.onHover  || (() => {});
  const onClick  = opts.onClick  || (() => {});
  const onLeave  = opts.onLeave  || (() => {});

  el.innerHTML = '';
  const svg = d3.select(el).append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('background', '#0a0d12');

  const g = svg.append('g');

  function build(data) {
    const root = d3.hierarchy({ children: data })
      .sum(d => d.employment || 0)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([width, height])
      .padding(1)
      .round(true)(root);

    g.selectAll('rect').remove();
    g.selectAll('text').remove();

    const leaf = g.selectAll('g.leaf')
      .data(root.leaves())
      .join('g')
      .attr('class', 'leaf')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => onHover(event, d.data))
      .on('mouseleave', (event, d) => onLeave(event, d.data))
      .on('click', (event, d) => onClick(event, d.data));

    leaf.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => exposureColour(d.data.aiExposure))
      .attr('fill-opacity', 0.85)
      .attr('rx', 2);

    leaf.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('font-size', d => {
        const w = d.x1 - d.x0;
        return w < 60 ? '8px' : w < 100 ? '9px' : '10px';
      })
      .attr('fill', '#f8fafc')
      .attr('fill-opacity', 0.9)
      .text(d => {
        const w = d.x1 - d.x0;
        const h = d.y1 - d.y0;
        if (w < 40 || h < 20) return '';
        const title = d.data.title || '';
        return title.length > Math.floor(w / 6) ? title.slice(0, Math.floor(w / 6)) + '…' : title;
      });
  }

  build(occupations);

  return {
    update(newData) { build(newData); },
    resize(w, h) {
      svg.attr('width', w).attr('height', h);
      build(occupations);
    },
    destroy() { el.innerHTML = ''; },
  };
}

// ---- SECTOR HEATMAP ----

export function renderHeatmap(container, data, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;

  const margin = { top: 24, right: 16, bottom: 48, left: 160 };
  const width  = (opts.width  || el.clientWidth  || 600) - margin.left - margin.right;
  const height = (opts.height || el.clientHeight || 400) - margin.top  - margin.bottom;

  el.innerHTML = '';
  const svg = d3.select(el).append('svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .style('background', '#0a0d12');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const sectors = [...new Set(data.map(d => d.sector))].sort();
  const metrics = ['avgExposure', 'employment', 'medianWage'];

  const xScale = d3.scaleBand().domain(metrics).range([0, width]).padding(0.05);
  const yScale = d3.scaleBand().domain(sectors).range([0, height]).padding(0.05);

  // Aggregate by sector
  const sectorMap = {};
  for (const occ of data) {
    if (!sectorMap[occ.sector]) sectorMap[occ.sector] = { exps: [], emps: [], wages: [] };
    sectorMap[occ.sector].exps.push(occ.aiExposure);
    sectorMap[occ.sector].emps.push(occ.employment);
    sectorMap[occ.sector].wages.push(occ.medianWage);
  }

  const cellData = [];
  for (const sector of sectors) {
    const s = sectorMap[sector];
    if (!s) continue;
    const avgExp  = s.exps.reduce((a,b)=>a+b,0) / s.exps.length;
    const totalEmp = s.emps.reduce((a,b)=>a+b,0);
    const avgWage = s.wages.reduce((a,b)=>a+b,0) / s.wages.length;
    cellData.push({ sector, metric: 'avgExposure', value: avgExp });
    cellData.push({ sector, metric: 'employment',  value: totalEmp });
    cellData.push({ sector, metric: 'medianWage',  value: avgWage });
  }

  const expScale  = d3.scaleLinear().domain([0, 10]).range(['#1e3a5f','#ef4444']);
  const empScale  = d3.scaleLinear().domain([0, d3.max(cellData.filter(d=>d.metric==='employment'), d=>d.value)]).range(['#0f2027','#0ea5e9']);
  const wageScale = d3.scaleLinear().domain([0, d3.max(cellData.filter(d=>d.metric==='medianWage'), d=>d.value)]).range(['#0f2027','#22c55e']);

  g.selectAll('rect.cell')
    .data(cellData)
    .join('rect')
    .attr('class', 'cell')
    .attr('x', d => xScale(d.metric))
    .attr('y', d => yScale(d.sector))
    .attr('width', xScale.bandwidth())
    .attr('height', yScale.bandwidth())
    .attr('fill', d => {
      if (d.metric === 'avgExposure') return expScale(d.value);
      if (d.metric === 'employment')  return empScale(d.value);
      return wageScale(d.value);
    })
    .attr('rx', 2);

  // Y axis labels
  g.append('g').call(d3.axisLeft(yScale).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .selectAll('text')
    .attr('fill', '#94a3b8')
    .attr('font-size', '10px');

  // X axis labels
  g.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d => ({
      avgExposure: 'AI Exposure', employment: 'Employment', medianWage: 'Median Wage'
    }[d] || d)).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .selectAll('text')
    .attr('fill', '#94a3b8')
    .attr('font-size', '10px');

  return { destroy() { el.innerHTML = ''; } };
}

// ---- SCATTER PLOT: exposure vs wage ----

export function renderScatter(container, data, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;

  const margin = { top: 20, right: 20, bottom: 48, left: 64 };
  const width  = (opts.width  || el.clientWidth  || 600) - margin.left - margin.right;
  const height = (opts.height || el.clientHeight || 400) - margin.top  - margin.bottom;

  el.innerHTML = '';
  const svg = d3.select(el).append('svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .style('background', '#0a0d12');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain([0, 10]).range([0, width]);
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.medianWage || 0) * 1.05])
    .range([height, 0]);

  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.employment || 0)])
    .range([2, 14]);

  // Grid lines
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
    .call(ax => ax.select('.domain').remove())
    .selectAll('line').attr('stroke', '#1e293b').attr('stroke-dasharray', '2,4');

  g.selectAll('circle.dot')
    .data(data)
    .join('circle')
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.aiExposure ?? 5))
    .attr('cy', d => yScale(d.medianWage ?? 0))
    .attr('r',  d => rScale(d.employment ?? 1))
    .attr('fill', d => exposureColour(d.aiExposure))
    .attr('fill-opacity', 0.7)
    .attr('stroke', '#0a0d12')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseenter', (event, d) => opts.onHover?.(event, d))
    .on('mouseleave', (event, d) => opts.onLeave?.(event, d));

  // Axes
  g.append('g').attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => `${d}/10`))
    .call(ax => ax.select('.domain').attr('stroke', '#334155'))
    .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${(d/1000).toFixed(0)}K`))
    .call(ax => ax.select('.domain').attr('stroke', '#334155'))
    .selectAll('text').attr('fill', '#64748b').attr('font-size', '10px');

  return { destroy() { el.innerHTML = ''; } };
}

// ---- FEAR INDEX GAUGE ----

export function renderGauge(container, score, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return null;

  const w = opts.width || 260;
  const h = opts.height || 140;
  const cx = w / 2;
  const cy = h - 20;
  const r = Math.min(cx, cy) - 10;

  el.innerHTML = '';
  const svg = d3.select(el).append('svg').attr('width', w).attr('height', h);

  // Background arc
  const arc = d3.arc().innerRadius(r * 0.65).outerRadius(r).startAngle(-Math.PI / 2);

  svg.append('path')
    .datum({ endAngle: Math.PI / 2 })
    .attr('d', arc)
    .attr('transform', `translate(${cx},${cy})`)
    .attr('fill', '#1e293b');

  // Score arc (0–10 → -π/2 to π/2)
  const scoreAngle = -Math.PI / 2 + (score / 10) * Math.PI;
  const colourScale = d3.scaleLinear().domain([0,3,5,7,10])
    .range(['#0ea5e9','#22c55e','#eab308','#f97316','#ef4444']);

  svg.append('path')
    .datum({ endAngle: scoreAngle })
    .attr('d', arc)
    .attr('transform', `translate(${cx},${cy})`)
    .attr('fill', colourScale(score));

  // Needle
  const needleAngle = -Math.PI / 2 + (score / 10) * Math.PI;
  const nx = cx + (r * 0.58) * Math.cos(needleAngle);
  const ny = cy + (r * 0.58) * Math.sin(needleAngle);

  svg.append('line')
    .attr('x1', cx).attr('y1', cy)
    .attr('x2', nx).attr('y2', ny)
    .attr('stroke', '#f8fafc')
    .attr('stroke-width', 2)
    .attr('stroke-linecap', 'round');

  svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('fill', '#f8fafc');

  // Score label
  svg.append('text')
    .attr('x', cx).attr('y', cy - 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '28px')
    .attr('font-family', 'IBM Plex Mono, monospace')
    .attr('font-weight', 700)
    .attr('fill', colourScale(score))
    .text(score.toFixed(1));

  const label = score >= 8 ? 'CRITICAL' : score >= 6 ? 'ELEVATED' : score >= 4 ? 'MODERATE' : score >= 2 ? 'LOW' : 'MINIMAL';

  svg.append('text')
    .attr('x', cx).attr('y', cy - 12)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-family', 'IBM Plex Mono, monospace')
    .attr('letter-spacing', '2px')
    .attr('fill', '#94a3b8')
    .text(label);

  return {
    update(newScore) { renderGauge(container, newScore, opts); },
    destroy() { el.innerHTML = ''; },
  };
}

// ---- EXPOSURE DISTRIBUTION BAR ----

export function renderDistributionBars(container, occupations, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el) return;

  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i}–${i+1}`,
    count: occupations.filter(o => o.aiExposure >= i && o.aiExposure < i + 1).length,
    employment: occupations.filter(o => o.aiExposure >= i && o.aiExposure < i + 1)
      .reduce((s, o) => s + (o.employment || 0), 0),
  }));

  const maxEmp = Math.max(...bins.map(b => b.employment));
  el.innerHTML = bins.map(b => `
    <div class="dist-row" style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
      <span style="color:#64748b;font-size:9px;width:28px;">${b.range}</span>
      <div style="flex:1;background:#1e293b;border-radius:2px;height:10px;">
        <div style="width:${(b.employment/maxEmp*100).toFixed(1)}%;height:100%;background:${exposureColour((parseInt(b.range)+parseInt(b.range)+1)/2)};border-radius:2px;transition:width 0.3s;"></div>
      </div>
      <span style="color:#475569;font-size:9px;width:36px;text-align:right;">${b.count}</span>
    </div>
  `).join('');
}

// ---- TREND LINE (sparkline) ----

export function renderSparkline(container, values, opts = {}) {
  const el = typeof container === 'string' ? document.querySelector(container) : container;
  if (!el || !values?.length) return;

  const w = opts.width  || el.clientWidth  || 200;
  const h = opts.height || 40;
  const colour = opts.colour || '#0ea5e9';

  el.innerHTML = '';
  const svg = d3.select(el).append('svg').attr('width', w).attr('height', h);

  const xScale = d3.scaleLinear().domain([0, values.length - 1]).range([0, w]);
  const yScale = d3.scaleLinear().domain([d3.min(values), d3.max(values)]).range([h - 2, 2]);

  const line = d3.line().x((_, i) => xScale(i)).y(d => yScale(d)).curve(d3.curveCatmullRom);

  svg.append('path')
    .datum(values)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', colour)
    .attr('stroke-width', 1.5);
}
