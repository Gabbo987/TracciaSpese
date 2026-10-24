// ==========================================================
// LINE CHART — grafico a linea riutilizzabile, in SVG puro.
// La curva usa un'interpolazione "monotona": passa esattamente
// per ogni punto e tra due punti non sale oltre il più alto né
// scende sotto il più basso (niente picchi inventati, niente
// valori negativi). Toccando il grafico appare il dettaglio.
// ==========================================================
import { esc, money, moneyShort } from '../core/format.js';

let uid = 0;
const r = v => Math.round(v * 10) / 10;

/**
 * container: elemento in cui disegnare
 * points:    [{ label, tip, sub, value }]  label = asse X, tip/sub = dettaglio al tocco
 * opts:      { color, average, height }
 */
export function renderLineChart(container, points, opts = {}) {
    const n = points.length;
    if (!n) { container.innerHTML = '<div class="lc-empty">Nessun dato</div>'; return; }

    const color = opts.color || '#007AFF';
    const W = Math.max(container.clientWidth || 0, 280);
    const H = opts.height || 220;
    const values = points.map(p => p.value);
    const maxV = Math.max(0, ...values);
    const ticks = niceTicks(maxV);
    const yMax = ticks[ticks.length - 1];

    const pad = { top: 28, right: 12, bottom: 26, left: Math.max(...ticks.map(t => moneyShort(t).length)) * 6.5 + 10 };
    const iw = W - pad.left - pad.right;
    const ih = H - pad.top - pad.bottom;
    const base = pad.top + ih;
    const X = i => pad.left + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const Y = v => base - (v / yMax) * ih;
    const pts = values.map((v, i) => [X(i), Y(v)]);
    const gradId = `lc-grad-${++uid}`;

    const line = monotonePath(pts);
    const area = n > 1 ? `${line} L${r(pts[n - 1][0])},${base} L${r(pts[0][0])},${base} Z` : '';

    // Griglia orizzontale con valori
    const grid = ticks.map(t => `
        <line class="lc-grid" x1="${pad.left}" x2="${W - pad.right}" y1="${r(Y(t))}" y2="${r(Y(t))}"/>
        <text class="lc-axis" x="${r(pad.left - 8)}" y="${r(Y(t) + 4)}" text-anchor="end">${moneyShort(t)}</text>`).join('');

    // Etichette asse X: al massimo una ogni ~58px
    const every = Math.ceil(n / Math.max(1, Math.floor(iw / 58)));
    const anchorAt = x => (x - pad.left < 20 ? 'start' : W - pad.right - x < 20 ? 'end' : 'middle');
    const xLabels = points.map((p, i) => (i % every ? '' :
        `<text class="lc-axis" x="${r(X(i))}" y="${H - 8}" text-anchor="${anchorAt(X(i))}">${esc(p.label)}</text>`)).join('');

    // Linea della media
    const avg = opts.average > 0
        ? `<line class="lc-avg" x1="${pad.left}" x2="${W - pad.right}" y1="${r(Y(opts.average))}" y2="${r(Y(opts.average))}" stroke="${color}"/>`
        : '';

    // Pallini sui punti (solo se non sono troppi)
    const dots = n <= 40 ? pts.map(([x, y]) =>
        `<circle cx="${r(x)}" cy="${r(y)}" r="3" style="fill:var(--card);stroke:${color};stroke-width:2"/>`).join('') : '';

    // Picco evidenziato
    const peakI = values.indexOf(maxV);
    let peak = '';
    if (maxV > 0) {
        const [px, py] = pts[peakI];
        peak = `<circle cx="${r(px)}" cy="${r(py)}" r="5" style="fill:${color};stroke:var(--card);stroke-width:2"/>
                <text class="lc-peak" x="${r(px)}" y="${r(py - 11)}" text-anchor="${anchorAt(px)}">${esc(money(maxV))}</text>`;
    }

    container.innerHTML = `
        <svg class="lc-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="${color}" stop-opacity="0.28"/>
                    <stop offset="1" stop-color="${color}" stop-opacity="0"/>
                </linearGradient>
            </defs>
            ${grid}
            ${area ? `<path d="${area}" fill="url(#${gradId})"/>` : ''}
            ${avg}
            <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            ${dots}
            ${peak}
            ${xLabels}
            <line class="lc-guide" data-guide x1="0" x2="0" y1="${pad.top}" y2="${base}" style="display:none"/>
            <circle data-focus r="5" style="display:none;fill:${color};stroke:var(--card);stroke-width:2"/>
            <rect data-hit x="${pad.left - 12}" y="0" width="${iw + 24}" height="${H}" fill="transparent"/>
        </svg>
        <div class="lc-tip" data-tip hidden></div>`;

    attachTooltip(container, points, pts, { W, pad, iw });
}

// ---------- Dettaglio al tocco ----------
function attachTooltip(container, points, pts, { W, pad, iw }) {
    const n = points.length;
    const svg = container.querySelector('svg');
    const tip = container.querySelector('[data-tip]');
    const guide = svg.querySelector('[data-guide]');
    const focus = svg.querySelector('[data-focus]');
    const hit = svg.querySelector('[data-hit]');

    const show = ev => {
        const box = svg.getBoundingClientRect();
        const px = (ev.clientX - box.left) * (W / (box.width || W));
        const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px - pad.left) / (iw / (n - 1)))));
        const [x, y] = pts[i];
        const p = points[i];

        guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.style.display = '';
        focus.setAttribute('cx', x); focus.setAttribute('cy', y); focus.style.display = '';
        tip.innerHTML = `
            <div class="lc-tip-title">${esc(p.tip || p.label)}</div>
            <div class="lc-tip-value">${money(p.value)}</div>
            ${p.sub ? `<div class="lc-tip-sub">${esc(p.sub)}</div>` : ''}`;
        tip.hidden = false;
        const tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(W - tw, x - tw / 2)) + 'px';
    };
    const hide = () => {
        guide.style.display = 'none';
        focus.style.display = 'none';
        tip.hidden = true;
    };

    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
}

// ---------- Matematica ----------

/** Valori "tondi" per l'asse Y: 0, 50, 100, 150... */
function niceTicks(max) {
    if (max <= 0) return [0, 10];
    const rough = max / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    const step = Math.max(1, (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag);
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    return ticks;
}

/**
 * Curva cubica monotona (Fritsch–Carlson) che passa per tutti i punti.
 * pts: [[x, y], ...] con x crescenti. Restituisce l'attributo "d" di un <path>.
 */
function monotonePath(pts) {
    const n = pts.length;
    if (n === 1) return `M${r(pts[0][0])},${r(pts[0][1])}`;

    const dx = [], slope = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1][0] - pts[i][0];
        slope[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
    }
    m[0] = slope[0];
    m[n - 1] = slope[n - 2];
    for (let i = 1; i < n - 1; i++) {
        m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
        if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
        const a = m[i] / slope[i], b = m[i + 1] / slope[i], s = a * a + b * b;
        if (s > 9) {
            const t = 3 / Math.sqrt(s);
            m[i] = t * a * slope[i];
            m[i + 1] = t * b * slope[i];
        }
    }

    let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += ` C${r(pts[i][0] + h)},${r(pts[i][1] + m[i] * h)}`
           + ` ${r(pts[i + 1][0] - h)},${r(pts[i + 1][1] - m[i + 1] * h)}`
           + ` ${r(pts[i + 1][0])},${r(pts[i + 1][1])}`;
    }
    return d;
}
