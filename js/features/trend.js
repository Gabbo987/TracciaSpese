// ==========================================================
// ANDAMENTO — grafico delle spese nel tempo (dentro Statistiche).
// Il periodo arriva dalla schermata Statistiche; qui si scelgono
// le categorie da sommare e la granularità (giorno/settimana/mese).
// ==========================================================
import { catColor, rgba } from '../core/colors.js';
import { money, fmt, monthLabel, capitalize, parseDate, toISO, esc, plural } from '../core/format.js';
import { renderLineChart } from '../ui/line-chart.js';
import { colorDot } from '../ui/components.js';

const GRANULARITY = [['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese']];
const UNIT = { day: 'giorno', week: 'settimana', month: 'mese' };

let selected = null;   // null = tutte le categorie, altrimenti un Set di nomi
let chosenGran = null; // null = scelta automatica in base alla durata del periodo
let lastRange = '';

/** items: spese del periodo; range: [da, a] ISO */
export function renderTrend(container, items, range) {
    const [from, to] = range;
    if (range.join() !== lastRange) { chosenGran = null; lastRange = range.join(); }
    const gran = chosenGran || autoGranularity(from, to);

    const cats = categoriesByTotal(items);
    if (selected) {
        selected = new Set([...selected].filter(c => cats.includes(c)));
        if (!selected.size) selected = null;
    }
    const visible = selected ? items.filter(e => selected.has(e.category)) : items;
    const color = selected && selected.size === 1 ? catColor([...selected][0]) : '#007AFF';

    const chipsScroll = container.querySelector('.trend-chips')?.scrollLeft || 0;
    container.innerHTML = `
        <div class="trend-card">
            <div class="trend-chips">
                <button class="trend-chip${selected ? '' : ' on'}" data-cat="">Tutte</button>
                ${cats.map(c => chip(c, !!selected && selected.has(c))).join('')}
            </div>
            <div class="seg-control small">
                ${GRANULARITY.map(([g, label]) => `<button class="seg${g === gran ? ' active' : ''}" data-gran="${g}">${label}</button>`).join('')}
            </div>
            <div class="lc-wrap"></div>
            <div class="trend-foot"></div>
        </div>`;
    container.querySelector('.trend-chips').scrollLeft = chipsScroll;

    container.onclick = e => {
        const c = e.target.closest('[data-cat]');
        const g = e.target.closest('[data-gran]');
        if (c) toggleCategory(c.dataset.cat);
        else if (g) chosenGran = g.dataset.gran;
        else return;
        renderTrend(container, items, range);
    };

    // Punti del grafico: un punto per giorno/settimana/mese
    const buckets = buildBuckets(visible, from, to, gran);
    const points = buckets.map(b => ({
        ...labels(b.date, gran, from, to),
        value: b.value,
        sub: plural(b.count, 'spesa', 'spese')
    }));
    const total = buckets.reduce((s, b) => s + b.value, 0);
    const avg = total / buckets.length;
    renderLineChart(container.querySelector('.lc-wrap'), points, { color, average: avg });

    const peak = points.reduce((a, b) => (b.value > a.value ? b : a));
    container.querySelector('.trend-foot').innerHTML = `
        <div><span class="tf-label">${colorDot(color, true)}Picco</span><span class="tf-value">${money(peak.value)}</span><span class="tf-sub">${esc(peak.tip)}</span></div>
        <div><span class="tf-label"><span class="tf-dash" style="border-color:${color}"></span>Media / ${UNIT[gran]}</span><span class="tf-value">${money(avg)}</span></div>
        <div><span class="tf-label">Totale</span><span class="tf-value">${money(total)}</span><span class="tf-sub">${plural(visible.length, 'spesa', 'spese')}</span></div>`;
}

// ---------- Selezione categorie ----------
// Da "Tutte", toccare una categoria la isola; poi se ne aggiungono o tolgono altre.
function toggleCategory(c) {
    if (!c) selected = null;
    else if (!selected) selected = new Set([c]);
    else if (selected.has(c)) { selected.delete(c); if (!selected.size) selected = null; }
    else selected.add(c);
}

function chip(c, on) {
    const col = catColor(c);
    const style = on ? ` style="background:${rgba(col, 0.15)};border-color:${col};color:${col}"` : '';
    return `<button class="trend-chip" data-cat="${esc(c)}"${style}>${colorDot(col, true)}${esc(c)}</button>`;
}

function categoriesByTotal(items) {
    const totals = {};
    items.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.cost; });
    return Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
}

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

/** Un contenitore per ogni giorno/settimana/mese del periodo, anche se vuoto */
function buildBuckets(items, from, to, gran) {
    const buckets = [];
    const index = new Map();
    const end = parseDate(to);
    for (let d = bucketStart(parseDate(from), gran); d <= end; d = nextBucket(d, gran)) {
        index.set(toISO(d), buckets.length);
        buckets.push({ date: d, value: 0, count: 0 });
    }
    items.forEach(e => {
        const i = index.get(toISO(bucketStart(parseDate(e.date), gran)));
        if (i != null) { buckets[i].value += e.cost; buckets[i].count++; }
    });
    return buckets;
}

/** label = testo breve per l'asse, tip = testo completo al tocco */
function labels(date, gran, from, to) {
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
