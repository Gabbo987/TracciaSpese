// ==========================================================
// ANDAMENTO — grafico delle spese nel tempo (dentro Statistiche).
// Il periodo arriva dalla schermata Statistiche; qui si sceglie:
//   Somma      una curva con il totale delle categorie scelte
//   Confronta  una curva per categoria, per metterle a confronto
// e la granularità (giorno / settimana / mese).
// ==========================================================
import { catColor, rgba } from '../core/colors.js';
import { money, fmt, monthLabel, capitalize, parseDate, toISO, esc, plural } from '../core/format.js';
import { renderLineChart } from '../ui/line-chart.js';
import { colorDot } from '../ui/components.js';

const MODES = [['sum', 'Somma'], ['compare', 'Confronta']];
const GRANULARITY = [['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese']];
const UNIT = { day: 'giorno', week: 'settimana', month: 'mese' };
const COMPARE_START = 3; // entrando in Confronta senza una scelta: le 3 categorie principali

const state = {
    mode: 'sum',
    selected: null, // null = tutte le categorie, altrimenti un Set di nomi
    gran: null,     // null = scelta automatica in base alla durata del periodo
    range: ''
};

/** items: spese del periodo; range: [da, a] ISO */
export function renderTrend(container, items, range) {
    const [from, to] = range;
    if (range.join() !== state.range) { state.gran = null; state.range = range.join(); }
    const gran = state.gran || autoGranularity(from, to);

    const cats = categoriesByTotal(items);
    if (state.selected) {
        state.selected = new Set([...state.selected].filter(c => cats.includes(c)));
        if (!state.selected.size) state.selected = null;
    }
    const active = state.selected ? cats.filter(c => state.selected.has(c)) : cats;
    // In Confronta i chip colorati fanno anche da legenda
    const colored = c => (state.selected ? state.selected.has(c) : state.mode === 'compare');

    const scroll = container.querySelector('.trend-chips')?.scrollLeft || 0;
    container.innerHTML = `
        <div class="trend-card">
            <div class="seg-control small">${segs(MODES, state.mode, 'mode')}</div>
            <div class="trend-chips">
                <button class="trend-chip${state.selected ? '' : ' on'}" data-cat="">Tutte</button>
                ${cats.map(c => chip(c, colored(c))).join('')}
            </div>
            <div class="seg-control small">${segs(GRANULARITY, gran, 'gran')}</div>
            <div class="lc-wrap"></div>
            <div class="trend-foot"></div>
        </div>`;
    container.querySelector('.trend-chips').scrollLeft = scroll;

    container.onclick = e => {
        const btn = e.target.closest('[data-cat], [data-mode], [data-gran]');
        if (!btn) return;
        if (btn.dataset.cat !== undefined) toggleCategory(btn.dataset.cat);
        else if (btn.dataset.mode) setMode(btn.dataset.mode, cats);
        else state.gran = btn.dataset.gran;
        renderTrend(container, items, range);
    };

    const tl = timeline(from, to, gran);
    const labels = tl.dates.map(d => labelsFor(d, gran, from, to));
    const wrap = container.querySelector('.lc-wrap');
    const foot = container.querySelector('.trend-foot');
    if (state.mode === 'compare') drawCompare(wrap, foot, items, active, tl, labels, gran);
    else drawSum(wrap, foot, items, active, tl, labels, gran);
}

// ---------- Somma: una curva ----------
function drawSum(wrap, foot, items, active, tl, labels, gran) {
    const visible = state.selected ? items.filter(e => state.selected.has(e.category)) : items;
    const { values, counts } = totals(visible, tl, gran);
    const color = state.selected && active.length === 1 ? catColor(active[0]) : '#007AFF';
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;

    renderLineChart(wrap, labels,
        [{ name: 'Totale', color, values, subs: counts.map(c => plural(c, 'spesa', 'spese')) }],
        { average: avg });

    const p = peakIndex(values);
    foot.innerHTML = `
        <div class="tf-grid">
            <div><span class="tf-label">${colorDot(color, true)}Picco</span><span class="tf-value">${money(values[p])}</span><span class="tf-sub">${esc(labels[p].tip)}</span></div>
            <div><span class="tf-label"><span class="tf-dash" style="border-color:${color}"></span>Media / ${UNIT[gran]}</span><span class="tf-value">${money(avg)}</span></div>
            <div><span class="tf-label">Totale</span><span class="tf-value">${money(total)}</span><span class="tf-sub">${plural(visible.length, 'spesa', 'spese')}</span></div>
        </div>`;
}

// ---------- Confronta: una curva per categoria ----------
function drawCompare(wrap, foot, items, active, tl, labels, gran) {
    const series = active.map(c => ({
        name: c,
        color: catColor(c),
        values: totals(items.filter(e => e.category === c), tl, gran).values
    }));
    renderLineChart(wrap, labels, series);

    foot.innerHTML = `
        <div class="tc-row tc-head"><span>Categoria</span><span>Totale</span><span>Picco</span></div>
        ${series.map(s => {
            const p = peakIndex(s.values);
            return `
                <div class="tc-row">
                    <span class="tc-name">${colorDot(s.color, true)}<span>${esc(s.name)}</span></span>
                    <span class="tc-total">${money(s.values.reduce((a, b) => a + b, 0))}</span>
                    <span class="tc-peak">${money(s.values[p])}<small>${esc(labels[p].label)}</small></span>
                </div>`;
        }).join('')}`;
}

// ---------- Scelte dell'utente ----------
// Da "Tutte", toccare una categoria la isola; poi se ne aggiungono o tolgono altre.
function toggleCategory(c) {
    if (!c) state.selected = null;
    else if (!state.selected) state.selected = new Set([c]);
    else if (state.selected.has(c)) { state.selected.delete(c); if (!state.selected.size) state.selected = null; }
    else state.selected.add(c);
}

function setMode(mode, cats) {
    if (mode === 'compare' && state.mode !== 'compare' && !state.selected && cats.length > COMPARE_START) {
        state.selected = new Set(cats.slice(0, COMPARE_START));
    }
    state.mode = mode;
}

const segs = (list, active, attr) =>
    list.map(([v, label]) => `<button class="seg${v === active ? ' active' : ''}" data-${attr}="${v}">${label}</button>`).join('');

function chip(c, on) {
    const col = catColor(c);
    const style = on ? ` style="background:${rgba(col, 0.15)};border-color:${col};color:${col}"` : '';
    return `<button class="trend-chip" data-cat="${esc(c)}"${style}>${colorDot(col, true)}${esc(c)}</button>`;
}

function categoriesByTotal(items) {
    const t = {};
    items.forEach(e => { t[e.category] = (t[e.category] || 0) + e.cost; });
    return Object.keys(t).sort((a, b) => t[b] - t[a]);
}

const peakIndex = values => values.indexOf(Math.max(...values));

// ---------- Raggruppamento nel tempo ----------
function autoGranularity(from, to) {
    const days = (parseDate(to) - parseDate(from)) / 86400000 + 1;
    return days <= 62 ? 'day' : days <= 400 ? 'week' : 'month';
}

/** Inizio del giorno / della settimana (lunedì) / del mese che contiene d */
function bucketStart(d, gran) {
    if (gran === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    if (gran === 'week') return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nextBucket(d, gran) {
    if (gran === 'month') return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (gran === 'week' ? 7 : 1));
}

/** Tutti i giorni/settimane/mesi del periodo, anche quelli senza spese */
function timeline(from, to, gran) {
    const dates = [], index = new Map();
    const end = parseDate(to);
    for (let d = bucketStart(parseDate(from), gran); d <= end; d = nextBucket(d, gran)) {
        index.set(toISO(d), dates.length);
        dates.push(d);
    }
    return { dates, index };
}

/** Somma e numero delle spese per ogni punto della timeline */
function totals(items, tl, gran) {
    const values = new Array(tl.dates.length).fill(0);
    const counts = new Array(tl.dates.length).fill(0);
    items.forEach(e => {
        const i = tl.index.get(toISO(bucketStart(parseDate(e.date), gran)));
        if (i != null) { values[i] += e.cost; counts[i]++; }
    });
    return { values, counts };
}

/** label = testo breve per l'asse, tip = testo completo al tocco */
function labelsFor(date, gran, from, to) {
    const iso = toISO(date);
    if (gran === 'month') {
        const multiYear = from.slice(0, 4) !== to.slice(0, 4);
        return { label: fmt(iso, multiYear ? { month: 'short', year: '2-digit' } : { month: 'short' }), tip: monthLabel(iso) };
    }
    if (gran === 'week') {
        return { label: fmt(iso, { day: 'numeric', month: 'short' }), tip: 'Settimana dal ' + fmt(iso, { day: 'numeric', month: 'long' }) };
    }
    return { label: fmt(iso, { day: 'numeric', month: 'short' }), tip: capitalize(fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' })) };
}
