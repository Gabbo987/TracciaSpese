// ==========================================================
// LINE CHART — grafico a linee riutilizzabile, in SVG puro.
// Una linea:  area colorata, media tratteggiata, picco con valore.
// Più linee:  una per serie (per confrontare), ognuna col suo picco.
// Le curve usano un'interpolazione "monotona": passano esattamente
// per ogni punto e tra due punti non salgono oltre il più alto né
// scendono sotto il più basso (niente picchi inventati, niente
// valori negativi). Toccando il grafico appare il dettaglio.
// ==========================================================
import { esc, money, moneyShort } from '../core/format.js';

let uid = 0;
const r = v => Math.round(v * 10) / 10;

/**
 * container: elemento in cui disegnare
 * labels:    [{ label, tip }]                  uno per punto: asse X e titolo del dettaglio
 * series:    [{ name, color, values, subs? }]  una o più linee (la prima resta in primo piano)
 * opts:      { average, height }               average: linea tratteggiata, solo con una linea
 */
export function renderLineChart(container, labels, series, opts = {}) {
    const n = labels.length;
    if (!n || !series.length) { container.innerHTML = '<div class="lc-empty">Nessun dato</div>'; return; }

    const W = Math.max(container.clientWidth || 0, 280);
    const H = opts.height || 220;
    const maxV = Math.max(0, ...series.flatMap(s => s.values));
    const ticks = niceTicks(maxV);
    const yMax = ticks[ticks.length - 1];

    const pad = { top: 28, right: 12, bottom: 26, left: Math.max(...ticks.map(t => moneyShort(t).length)) * 6.5 + 10 };
    const iw = W - pad.left - pad.right;
    const ih = H - pad.top - pad.bottom;
    const base = pad.top + ih;
    const X = i => pad.left + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const Y = v => base - (v / yMax) * ih;
    const coords = series.map(s => s.values.map((v, i) => [X(i), Y(v)]));
    const anchorAt = x => (x - pad.left < 20 ? 'start' : W - pad.right - x < 20 ? 'end' : 'middle');

    // Griglia orizzontale con valori
    const grid = ticks.map(t => `
        <line class="lc-grid" x1="${pad.left}" x2="${W - pad.right}" y1="${r(Y(t))}" y2="${r(Y(t))}"/>
        <text class="lc-axis" x="${r(pad.left - 8)}" y="${r(Y(t) + 4)}" text-anchor="end">${moneyShort(t)}</text>`).join('');

    // Etichette asse X: al massimo una ogni ~58px
    const every = Math.ceil(n / Math.max(1, Math.floor(iw / 58)));
    const xLabels = labels.map((l, i) => (i % every ? '' :
        `<text class="lc-axis" x="${r(X(i))}" y="${H - 8}" text-anchor="${anchorAt(X(i))}">${esc(l.label)}</text>`)).join('');

    const plot = series.length === 1
        ? singleSeries(series[0], coords[0], { n, base, W, pad, Y, anchorAt, average: opts.average })
        : multiSeries(series, coords, n);

    container.innerHTML = `
        <svg class="lc-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
            ${grid}
            ${plot}
            ${xLabels}
            <line class="lc-guide" data-guide x1="0" x2="0" y1="${pad.top}" y2="${base}" style="display:none"/>
            ${series.map(s => `<circle data-focus r="5" style="display:none;fill:${s.color};stroke:var(--card);stroke-width:2"/>`).join('')}
            <rect data-hit x="${pad.left - 12}" y="0" width="${iw + 24}" height="${H}" fill="transparent"/>
        </svg>
        <div class="lc-tip" data-tip hidden></div>`;

    attachTooltip(container, labels, series, coords, { W, pad, iw, n });
}

// ---------- Una linea ----------
function singleSeries(s, pts, { n, base, W, pad, Y, anchorAt, average }) {
    const gradId = `lc-grad-${++uid}`;
    const line = monotonePath(pts);
    const area = n > 1
        ? `<path d="${line} L${r(pts[n - 1][0])},${base} L${r(pts[0][0])},${base} Z" fill="url(#${gradId})"/>`
        : '';
    const avg = average > 0
        ? `<line class="lc-avg" x1="${pad.left}" x2="${W - pad.right}" y1="${r(Y(average))}" y2="${r(Y(average))}" stroke="${s.color}"/>`
        : '';
    const dots = n <= 40 ? pts.map(([x, y]) =>
        `<circle cx="${r(x)}" cy="${r(y)}" r="3" style="fill:var(--card);stroke:${s.color};stroke-width:2"/>`).join('') : '';

    const maxV = Math.max(...s.values);
    let peak = '';
    if (maxV > 0) {
        const [px, py] = pts[s.values.indexOf(maxV)];
        peak = `<circle cx="${r(px)}" cy="${r(py)}" r="5" style="fill:${s.color};stroke:var(--card);stroke-width:2"/>
                <text class="lc-peak" x="${r(px)}" y="${r(py - 11)}" text-anchor="${anchorAt(px)}">${esc(money(maxV))}</text>`;
    }

    return `
        <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="${s.color}" stop-opacity="0.28"/>
                <stop offset="1" stop-color="${s.color}" stop-opacity="0"/>
            </linearGradient>
        </defs>
        ${area}${avg}
        <path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}${peak}`;
}

// ---------- Più linee ----------
function multiSeries(series, coords, n) {
    // Disegno dall'ultima alla prima, così la prima serie resta in primo piano
    return series.map((s, k) => ({ s, pts: coords[k] })).reverse().map(({ s, pts }) => {
        const dots = n <= 24 ? pts.map(([x, y]) =>
            `<circle cx="${r(x)}" cy="${r(y)}" r="2.5" style="fill:var(--card);stroke:${s.color};stroke-width:1.5"/>`).join('') : '';
        const maxV = Math.max(...s.values);
        const [px, py] = pts[s.values.indexOf(maxV)];
        const peak = maxV > 0
            ? `<circle cx="${r(px)}" cy="${r(py)}" r="4.5" style="fill:${s.color};stroke:var(--card);stroke-width:2"/>`
            : '';
        return `<path d="${monotonePath(pts)}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>${dots}${peak}`;
    }).join('');
}

// ---------- Dettaglio al tocco ----------
function attachTooltip(container, labels, series, coords, { W, pad, iw, n }) {
    const svg = container.querySelector('svg');
    const tip = container.querySelector('[data-tip]');
    const guide = svg.querySelector('[data-guide]');
    const focus = [...svg.querySelectorAll('[data-focus]')];
    const hit = svg.querySelector('[data-hit]');
    const single = series.length === 1;

    const show = ev => {
        const box = svg.getBoundingClientRect();
        const px = (ev.clientX - box.left) * (W / (box.width || W));
        const i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px - pad.left) / (iw / (n - 1)))));
        const x = coords[0][i][0];

        guide.setAttribute('x1', x);
        guide.setAttribute('x2', x);
        guide.style.display = '';
        focus.forEach((f, k) => {
            f.setAttribute('cx', x);
            f.setAttribute('cy', coords[k][i][1]);
            f.style.display = single || series[k].values[i] > 0 ? '' : 'none';
        });

        tip.innerHTML = `<div class="lc-tip-title">${esc(labels[i].tip || labels[i].label)}</div>`
            + (single ? singleTip(series[0], i) : multiTip(series, i));
        tip.hidden = false;
        const tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(W - tw, x - tw / 2)) + 'px';
    };
    const hide = () => {
        guide.style.display = 'none';
        focus.forEach(f => { f.style.display = 'none'; });
        tip.hidden = true;
    };

    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointermove', show);
    hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
}

const singleTip = (s, i) =>
    `<div class="lc-tip-value">${money(s.values[i])}</div>${s.subs ? `<div class="lc-tip-sub">${esc(s.subs[i])}</div>` : ''}`;

/** Le serie con una spesa in quel punto, dalla più alta, più il totale */
function multiTip(series, i) {
    const rows = series.filter(s => s.values[i] > 0).sort((a, b) => b.values[i] - a.values[i]);
    if (!rows.length) return '<div class="lc-tip-sub">Nessuna spesa</div>';
    const total = rows.reduce((t, s) => t + s.values[i], 0);
    return rows.map(s => `
        <div class="lc-tip-row"><span class="dot sm" style="background:${s.color}"></span><span class="lc-tip-name">${esc(s.name)}</span><b>${money(s.values[i])}</b></div>`).join('')
        + (rows.length > 1 ? `<div class="lc-tip-row lc-tip-total"><span class="lc-tip-name">Totale</span><b>${money(total)}</b></div>` : '');
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
