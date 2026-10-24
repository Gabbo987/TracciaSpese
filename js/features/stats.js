// ==========================================================
// STATISTICHE — tab "Statistiche": periodo, torta, riepilogo,
// andamento nel tempo, dettaglio per categoria e per contesto.
// Toccando una categoria o un contesto si apre l'elenco delle
// sue spese nel periodo; toccando una spesa la si modifica.
// ==========================================================
import * as store from '../core/store.js';
import { money, fmtDate, rangeLabel, todayISO, esc, plural } from '../core/format.js';
import { catColor } from '../core/colors.js';
import { periodBounds, periodFilter } from '../core/periods.js';
import { currentTab, onTabChange } from '../ui/tabs.js';
import { emptyState, categoryChip, contextTag, colorDot } from '../ui/components.js';
import { openExpenseForm } from './expense-form.js';
import { renderTrend } from './trend.js';

const PERIODS = [['thisMonth', 'Mese'], ['thisYear', 'Anno'], ['all', 'Sempre'], ['custom', 'Scegli']];
const state = { period: 'thisMonth', from: '', to: '' };
const expanded = new Set(); // gruppi aperti, es. "category:Sport"

let root;
const ref = name => root.querySelector(`[data-ref="${name}"]`);
const sum = list => list.reduce((s, e) => s + e.cost, 0);

export function initStats(container) {
    root = container;
    root.innerHTML = `
        <div class="seg-control" data-ref="periods">
            ${PERIODS.map(([p, label]) => `<button class="seg" data-period="${p}">${label}</button>`).join('')}
        </div>
        <div class="range-row" data-ref="range">
            <div class="range-field"><label>Da</label><input type="date" class="select" data-ref="from"></div>
            <div class="range-field"><label>A</label><input type="date" class="select" data-ref="to"></div>
        </div>
        <div class="stats-caption" data-ref="caption"></div>
        <div data-ref="body"></div>`;

    ref('periods').addEventListener('click', e => {
        const b = e.target.closest('[data-period]');
        if (b) { state.period = b.dataset.period; render(); }
    });
    ref('from').addEventListener('change', e => { state.from = e.target.value; render(); });
    ref('to').addEventListener('change', e => { state.to = e.target.value; render(); });

    ref('body').addEventListener('click', e => {
        const exp = e.target.closest('[data-id]');
        if (exp) return openExpenseForm(exp.dataset.id);
        const head = e.target.closest('[data-toggle]');
        if (head) toggle(head.dataset.toggle, head.closest('.breakdown-item'));
    });

    // Si ridisegna solo quando è visibile (il grafico ha bisogno della larghezza reale)
    store.subscribe(() => { if (currentTab() === 'stats') render(); });
    onTabChange(tab => { if (tab === 'stats') render(); });
    let timer;
    window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { if (currentTab() === 'stats') render(); }, 200);
    });
}

function render() {
    root.querySelectorAll('[data-period]').forEach(b => b.classList.toggle('active', b.dataset.period === state.period));
    ref('range').classList.toggle('show', state.period === 'custom');

    const inRange = periodFilter(state.period, state.from, state.to);
    const items = store.getAll().filter(e => inRange(e.date)).sort((a, b) => b.date.localeCompare(a.date));
    const range = visibleRange(items);
    ref('caption').textContent = rangeLabel(...range);

    if (!items.length) {
        ref('body').innerHTML = emptyState('📊', 'Nessuna spesa nel periodo',
            'Cambia periodo o aggiungi qualche spesa per vedere le statistiche.');
        return;
    }

    const total = sum(items);
    const cats = groupBy(items, 'category');
    const ctxs = groupBy(items.filter(e => e.context), 'context');

    ref('body').innerHTML =
        donut(cats, total, items.length) +
        summaryCards(items, total, cats) +
        `<div class="list-header">Andamento nel tempo</div><div data-ref="trend"></div>` +
        `<div class="list-header">Dettaglio per categoria</div>${breakdown(cats, 'category', total)}` +
        (ctxs.length ? `<div class="list-header">Spesa per contesto</div>${breakdown(ctxs, 'context')}` : '');

    renderTrend(ref('trend'), items, range);
}

// Periodo effettivo: i limiti aperti si chiudono sulle spese e non si va
// oltre oggi (salvo spese future), così il grafico non finisce con giorni vuoti.
function visibleRange(items) {
    const today = todayISO();
    const first = items.length ? items[items.length - 1].date : today;
    const last = items.length ? items[0].date : today;
    const limit = last > today ? last : today;
    let [a, b] = periodBounds(state.period, state.from, state.to);
    a = a || first;
    b = !b || b > limit ? limit : b;
    return a <= b ? [a, b] : [a, a];
}

function toggle(key, item) {
    if (expanded.has(key)) expanded.delete(key);
    else expanded.add(key);
    item.classList.toggle('open', expanded.has(key));
}

/** [{ key, total, items }] ordinati dal totale più alto */
function groupBy(items, field) {
    const groups = new Map();
    items.forEach(e => {
        const g = groups.get(e[field]) || { key: e[field], total: 0, items: [] };
        g.total += e.cost;
        g.items.push(e);
        groups.set(e[field], g);
    });
    return [...groups.values()].sort((a, b) => b.total - a.total);
}

// ---------- Blocchi della pagina ----------

function donut(cats, total, count) {
    // Separatori tra le fette: restano distinte anche con colori simili
    const gap = cats.length > 1 ? 0.9 : 0;
    let acc = 0;
    const stops = [];
    cats.forEach(g => {
        const pct = total ? (g.total / total) * 100 : 0;
        const end = Math.max(acc, acc + pct - gap);
        stops.push(`${catColor(g.key)} ${acc}% ${end}%`);
        if (gap) stops.push(`var(--bg) ${end}% ${acc + pct}%`);
        acc += pct;
    });
    const background = total ? `conic-gradient(${stops.join(', ')})` : 'var(--bg)';
    return `
        <div class="donut-wrap">
            <div class="donut" style="background:${background}">
                <div class="donut-center">
                    <div class="donut-total">${money(total)}</div>
                    <div class="donut-caption">${plural(count, 'spesa', 'spese')}</div>
                </div>
            </div>
        </div>`;
}

function summaryCards(items, total, cats) {
    const top = cats[0];
    const topPct = total ? Math.round((top.total / total) * 100) : 0;
    return `
        <div class="stat-cards">
            <div class="stat-mini"><div class="stat-mini-value">${money(total)}</div><div class="stat-mini-label">Totale periodo</div></div>
            <div class="stat-mini"><div class="stat-mini-value">${items.length}</div><div class="stat-mini-label">Numero spese</div></div>
            <div class="stat-mini"><div class="stat-mini-value">${money(total / items.length)}</div><div class="stat-mini-label">Spesa media</div></div>
            <div class="stat-mini"><div class="stat-mini-value">${esc(top.key)}</div><div class="stat-mini-label">Categoria top · ${topPct}%</div></div>
        </div>`;
}

/** Righe espandibili per categoria (con % sul totale) o per contesto */
function breakdown(groups, field, total = 0) {
    const isCat = field === 'category';
    const max = groups[0].total || 1;
    return groups.map(g => {
        const key = `${field}:${g.key}`;
        const color = isCat ? catColor(g.key) : 'var(--primary)';
        const n = g.items.length;
        const width = total ? (g.total / total) * 100 : (g.total / max) * 100;
        return `
            <div class="breakdown-item${expanded.has(key) ? ' open' : ''}">
                <div class="bd-head" data-toggle="${esc(key)}">
                    <div class="bd-top">
                        <div class="bd-name">${isCat ? colorDot(color) : ''}<span class="bd-cat">${esc(g.key)}</span></div>
                        <div class="bd-right"><span class="bd-amount">${money(g.total)}</span><span class="bd-chevron">›</span></div>
                    </div>
                    <div class="bd-bar"><div class="bd-bar-fill" style="width:${width}%;background:${color}"></div></div>
                    <div class="bd-meta">
                        ${total ? `<span>${((g.total / total) * 100).toFixed(1)}%</span>` : ''}
                        <span>${plural(n, 'spesa', 'spese')}</span>
                        <span>media ${money(g.total / n)}</span>
                    </div>
                </div>
                <div class="bd-list">${g.items.map(e => expenseRow(e, isCat)).join('')}</div>
            </div>`;
    }).join('');
}

// In una categoria mostro il contesto; in un contesto mostro la categoria
const expenseRow = (e, inCategory) => `
    <div class="bd-exp" data-id="${esc(e.id)}">
        <div class="bd-exp-left">
            <div class="bd-exp-name">${esc(e.name)}</div>
            <div class="bd-exp-sub"><span>${fmtDate(e.date)}</span>${inCategory ? contextTag(e.context) : categoryChip(e.category)}</div>
        </div>
        <div class="bd-exp-cost">${money(e.cost)}</div>
    </div>`;
