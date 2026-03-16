/**
 * CREON UI layer
 * Tooltip management, panel resizing, filter controls, agent chat, ticker tape
 * All DOM manipulation outside of D3 chart renderers lives here
 */

'use strict';

// ---- TOOLTIP ----

export class Tooltip {
  constructor(opts = {}) {
    this._el = document.createElement('div');
    this._el.className = 'creon-tooltip';
    Object.assign(this._el.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '9999',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '6px',
      padding: '10px 14px',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '11px',
      color: '#e2e8f0',
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      maxWidth: '280px',
      display: 'none',
      lineHeight: '1.6',
    });
    document.body.appendChild(this._el);
    this._margin = opts.margin || 14;
  }

  show(html, x, y) {
    this._el.innerHTML = html;
    this._el.style.display = 'block';
    this._position(x, y);
  }

  hide() {
    this._el.style.display = 'none';
  }

  move(x, y) {
    if (this._el.style.display !== 'none') this._position(x, y);
  }

  _position(x, y) {
    const m = this._margin;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = this._el.offsetWidth;
    const th = this._el.offsetHeight;
    let left = x + m;
    let top  = y + m;
    if (left + tw > vw - m) left = x - tw - m;
    if (top  + th > vh - m) top  = y - th - m;
    this._el.style.left = `${left}px`;
    this._el.style.top  = `${top}px`;
  }

  destroy() {
    this._el.remove();
  }
}

export function occupationTooltipHtml(occ) {
  if (!occ) return '';
  const colourMap = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e', Minimal: '#0ea5e9' };
  const tier = occ.aiExposure >= 8 ? 'Critical' : occ.aiExposure >= 6 ? 'High' : occ.aiExposure >= 4 ? 'Medium' : occ.aiExposure >= 2 ? 'Low' : 'Minimal';
  const colour = colourMap[tier];
  return `
    <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#f8fafc;">${occ.title}</div>
    <div style="color:#94a3b8;font-size:10px;margin-bottom:6px;">${occ.sector} · SOC ${occ.soc}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
      <span style="background:${colour}22;color:${colour};padding:2px 7px;border-radius:3px;font-size:10px;">
        AI Risk: ${occ.aiExposure?.toFixed(1) ?? '—'}/10 ${tier}
      </span>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <tr><td style="color:#64748b;padding:1px 0;">Employment</td><td style="text-align:right;color:#e2e8f0;">${(occ.employment||0).toLocaleString()}</td></tr>
      <tr><td style="color:#64748b;padding:1px 0;">Median Wage</td><td style="text-align:right;color:#e2e8f0;">$${(occ.medianWage||0).toLocaleString()}/yr</td></tr>
      <tr><td style="color:#64748b;padding:1px 0;">Outlook</td><td style="text-align:right;color:#e2e8f0;">${occ.outlook || '—'}</td></tr>
      <tr><td style="color:#64748b;padding:1px 0;">Education</td><td style="text-align:right;color:#e2e8f0;">${occ.education || '—'}</td></tr>
    </table>
  `;
}

// ---- TICKER TAPE ----

export class Ticker {
  constructor(container, opts = {}) {
    this._el = typeof container === 'string' ? document.querySelector(container) : container;
    this._speed = opts.speed || 40; // px/s
    this._items = [];
    this._raf = null;
    this._offset = 0;
    this._render();
  }

  setData(marketData) {
    this._items = Object.values(marketData || {}).map(d => ({
      symbol: d.symbol,
      price: d.price,
      changePct: d.changePct,
    }));
    this._render();
  }

  _render() {
    if (!this._el) return;
    const html = [...this._items, ...this._items].map(item => {
      const sign = item.changePct >= 0 ? '+' : '';
      const colour = item.changePct >= 0 ? '#22c55e' : '#ef4444';
      return `<span style="margin:0 20px;white-space:nowrap;">
        <span style="color:#94a3b8;">${item.symbol}</span>
        <span style="color:#e2e8f0;margin-left:6px;">$${item.price?.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
        <span style="color:${colour};margin-left:4px;">${sign}${item.changePct?.toFixed(2)}%</span>
      </span>`;
    }).join('');

    this._el.innerHTML = `<div class="ticker-inner" style="display:inline-flex;animation:none;will-change:transform;">${html}</div>`;
    this._inner = this._el.querySelector('.ticker-inner');
    this._offset = 0;
    this._startAnimation();
  }

  _startAnimation() {
    if (this._raf) cancelAnimationFrame(this._raf);
    let lastTime = null;
    const totalWidth = this._inner ? this._inner.scrollWidth / 2 : 1000;

    const tick = (time) => {
      if (lastTime === null) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      this._offset = (this._offset + this._speed * delta) % totalWidth;
      if (this._inner) this._inner.style.transform = `translateX(-${this._offset}px)`;
      this._raf = requestAnimationFrame(tick);
    };

    this._raf = requestAnimationFrame(tick);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._el) this._el.innerHTML = '';
  }
}

// ---- PANEL RESIZE ----

export function makeResizable(panel, opts = {}) {
  const minW = opts.minWidth || 200;
  const maxW = opts.maxWidth || 600;
  const handle = document.createElement('div');
  handle.className = 'resize-handle';
  Object.assign(handle.style, {
    position: 'absolute', right: '0', top: '0', bottom: '0', width: '4px',
    cursor: 'col-resize', zIndex: '10',
    background: 'transparent',
  });
  panel.style.position = 'relative';
  panel.appendChild(handle);

  let dragging = false, startX = 0, startW = 0;

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX = e.clientX;
    startW = panel.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const newW = Math.max(minW, Math.min(maxW, startW + e.clientX - startX));
    panel.style.width = `${newW}px`;
    opts.onResize?.(newW);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  return handle;
}

// ---- FILTER CONTROLS ----

export class FilterBar {
  constructor(container, opts = {}) {
    this._el = typeof container === 'string' ? document.querySelector(container) : container;
    this._onChange = opts.onChange || (() => {});
    this._state = { tier: 'all', sector: '', query: '' };
    this._build(opts.sectors || []);
  }

  _build(sectors) {
    if (!this._el) return;
    const tiers = ['all', 'high', 'medium', 'low'];
    this._el.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <div class="tier-buttons" style="display:flex;gap:4px;">
          ${tiers.map(t => `
            <button data-tier="${t}" style="padding:4px 10px;border-radius:4px;border:1px solid #334155;background:${t==='all'?'#1e293b':'transparent'};color:#94a3b8;font-family:IBM Plex Mono,monospace;font-size:10px;cursor:pointer;letter-spacing:1px;">
              ${t.toUpperCase()}
            </button>`).join('')}
        </div>
        <select class="sector-select" style="background:#0f172a;border:1px solid #334155;color:#94a3b8;padding:4px 8px;border-radius:4px;font-family:IBM Plex Mono,monospace;font-size:10px;">
          <option value="">ALL SECTORS</option>
          ${sectors.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <input class="search-input" type="text" placeholder="Search occupations…"
          style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 10px;border-radius:4px;font-family:IBM Plex Mono,monospace;font-size:10px;width:200px;" />
      </div>
    `;

    this._el.querySelectorAll('[data-tier]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._state.tier = btn.dataset.tier;
        this._el.querySelectorAll('[data-tier]').forEach(b => {
          b.style.background = b.dataset.tier === this._state.tier ? '#1e293b' : 'transparent';
        });
        this._onChange({ ...this._state });
      });
    });

    const sel = this._el.querySelector('.sector-select');
    sel?.addEventListener('change', () => {
      this._state.sector = sel.value;
      this._onChange({ ...this._state });
    });

    const input = this._el.querySelector('.search-input');
    let debounce;
    input?.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        this._state.query = input.value.trim();
        this._onChange({ ...this._state });
      }, 200);
    });
  }

  getState() { return { ...this._state }; }
  destroy() { if (this._el) this._el.innerHTML = ''; }
}

// ---- NOTIFICATION TOAST ----

const toastQueue = [];
let toastEl = null;

export function showToast(message, opts = {}) {
  const type = opts.type || 'info';
  const duration = opts.duration ?? 3500;
  const colours = { info: '#0ea5e9', success: '#22c55e', warn: '#eab308', error: '#ef4444' };

  if (!toastEl) {
    toastEl = document.createElement('div');
    Object.assign(toastEl.style, {
      position: 'fixed', bottom: '24px', right: '24px', zIndex: '99999',
      display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none',
    });
    document.body.appendChild(toastEl);
  }

  const item = document.createElement('div');
  Object.assign(item.style, {
    background: '#1e293b',
    borderLeft: `3px solid ${colours[type]}`,
    borderRadius: '4px',
    padding: '10px 16px',
    color: '#e2e8f0',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '11px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    opacity: '0',
    transition: 'opacity 0.2s',
    maxWidth: '320px',
  });
  item.textContent = message;
  toastEl.appendChild(item);

  requestAnimationFrame(() => { item.style.opacity = '1'; });
  setTimeout(() => {
    item.style.opacity = '0';
    setTimeout(() => item.remove(), 250);
  }, duration);
}

// ---- CLOCK ----

export function startClock(el, opts = {}) {
  const fmt = opts.utc ? () => {
    const d = new Date();
    return d.toUTCString().replace('GMT', 'UTC').slice(0, -4);
  } : () => new Date().toLocaleTimeString();

  const update = () => {
    if (typeof el === 'string') {
      const node = document.querySelector(el);
      if (node) node.textContent = fmt();
    } else if (el) {
      el.textContent = fmt();
    }
  };

  update();
  return setInterval(update, 1000);
}
