// ==========================================================
// ELENCO SPESE — tab "Spese": riepilogo, filtri, riepilogo
// del contesto selezionato, lista raggruppata per mese.
// ==========================================================
import * as store from '../core/store.js';
import { money, fmtDate, monthLabel, rangeLabel, esc, plural } from '../core/format.js';
import { periodFilter } from '../core/periods.js';
import { categoryChip, contextTag, emptyState } from '../ui/components.js';
import { openExpenseForm } from './expense-form.js';

const PERIODS = {
    all: 'Tutto il periodo', thisMonth: 'Questo mese', lastMonth: 'Mese scorso',
    last30: 'Ultimi 30 giorni', thisYear: "Quest'anno", custom: 'Intervallo personalizzato…'
};
const SORTS = {
    'date-desc': 'Data (recenti)', 'date-asc': 'Data (vecchie)',
    'cost-desc': 'Costo (alto→basso)', 'cost-asc': 'Costo (basso→alto)', 'name-asc': 'Nome (A-Z)'
};

let root;
const ref = name => root.querySelector(`[data-ref="${name}"]`);
const sum = list => list.reduce((s, e) => s + e.cost, 0);
const options = obj => Object.entries(obj).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

export function initExpenseList(container) {
    root = container;
    root.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card month">
                <div class="summary-label" data-ref="leftLabel">Questo mese</div>
                <div class="summary-value" data-ref="leftValue"></div>
            </div>
            <div class="summary-card total">
                <div class="summary-label">Totale</div>
                <div class="summary-value" data-ref="allValue"></div>
            </div>
        </div>

        <div class="search-bar">
            <span>🔍</span>
            <input type="text" data-ref="search" placeholder="Cerca per nome, categoria o contesto">
        </div>

        <select class="select block" data-ref="period">${options(PERIODS)}</select>
        <div class="range-row" data-ref="range">
            <div class="range-field"><label>Da</label><input type="date" class="select" data-ref="from"></div>
            <div class="range-field"><label>A</label><input type="date" class="select" data-ref="to"></div>
        </div>

        <div class="filters-row">
            <select class="select" data-ref="sort">${options(SORTS)}</select>
            <select class="select" data-ref="category"></select>
        </div>
        <select class="select block" data-ref="context" hidden></select>

        <div data-ref="banner"></div>
        <div data-ref="list"></div>
        <button class="fab" data-ref="add" aria-label="Aggiungi spesa">+</button>`;

    ref('search').addEventListener('input', render);
    ['period', 'from', 'to', 'sort', 'category', 'context'].forEach(r => ref(r).addEventListener('change', render));
    ref('add').addEventListener('click', () => openExpenseForm());
    ref('list').addEventListener('click', e => {
        const item = e.target.closest('[data-id]');
        if (item) openExpenseForm(item.dataset.id);
    });
    ref('banner').addEventListener('click', e => {
        if (e.target.closest('[data-action="clear-context"]')) { ref('context').value = ''; render(); }
    });

    store.subscribe(render);
    render();
}

function render() {
    const all = store.getAll();
    const contexts = distinctAlpha(all, 'context');
    fillSelect(ref('category'), distinctAlpha(all, 'category'), 'Tutte le categorie');
    fillSelect(ref('context'), contexts, 'Tutti i contesti');
    ref('context').hidden = !contexts.length;

    const f = {
        search: ref('search').value.trim().toLowerCase(),
        period: ref('period').value, from: ref('from').value, to: ref('to').value,
        sort: ref('sort').value, category: ref('category').value, context: ref('context').value
    };
    ref('range').classList.toggle('show', f.period === 'custom');

    const inRange = periodFilter(f.period, f.from, f.to);
    const items = all.filter(e =>
        (!f.search || [e.name, e.category, e.context].some(v => v.toLowerCase().includes(f.search))) &&
        (!f.category || e.category === f.category) &&
        (!f.context || e.context === f.context) &&
        inRange(e.date));

    renderSummary(all, f, inRange);
    renderBanner(items, f);
    renderList(all.length, sortItems(items, f.sort), f.sort);
}

// Riquadro sinistro: segue il periodo scelto (se "tutto", mostra il mese corrente)
function renderSummary(all, f, inRange) {
    const usePeriod = f.period !== 'all';
    const match = usePeriod ? inRange : periodFilter('thisMonth');
    ref('leftLabel').textContent = !usePeriod ? 'Questo mese' : f.period === 'custom' ? 'Periodo scelto' : PERIODS[f.period];
    ref('leftValue').textContent = money(sum(all.filter(e => match(e.date))));
    ref('allValue').textContent = money(sum(all));
}

// Riepilogo del contesto selezionato: totale, numero spese e date coperte
function renderBanner(items, f) {
    if (!f.context) { ref('banner').innerHTML = ''; return; }
    const dates = items.map(e => e.date).sort();
    const span = dates.length ? ` · ${rangeLabel(dates[0], dates[dates.length - 1])}` : '';
    const filtered = f.search || f.category || f.period !== 'all';
    ref('banner').innerHTML = `
        <div class="context-banner">
            <div class="cb-head">
                <span class="cb-label">Totale del contesto</span>
                <button class="cb-clear" data-action="clear-context" aria-label="Togli il filtro contesto">✕</button>
            </div>
            <div class="cb-name">${esc(f.context)}</div>
            <div class="cb-total">${money(sum(items))}</div>
            <div class="cb-meta">${plural(items.length, 'spesa', 'spese')}${span}${filtered ? ' · con i filtri attivi' : ''}</div>
        </div>`;
}

function renderList(totalCount, items, sort) {
    const list = ref('list');
    if (!totalCount) {
        list.innerHTML = emptyState('🧾', 'Ancora nessuna spesa', 'Tocca il pulsante + per aggiungere la tua prima spesa.');
        return;
    }
    if (!items.length) {
        list.innerHTML = emptyState('🔍', 'Nessun risultato', 'Nessuna spesa corrisponde a questi filtri.');
        return;
    }
    if (!sort.startsWith('date')) {
        list.innerHTML = `<div class="list-header">${plural(items.length, 'spesa', 'spese')}</div>` + items.map(card).join('');
        return;
    }

    // Ordinate per data: raggruppo per mese con il subtotale
    const totals = {};
    items.forEach(e => { const k = e.date.slice(0, 7); totals[k] = (totals[k] || 0) + e.cost; });
    let html = '', last = null;
    items.forEach(e => {
        const k = e.date.slice(0, 7);
        if (k !== last) {
            html += `<div class="month-header${last ? '' : ' first'}">
                <span class="mh-name">${monthLabel(e.date)}</span><span class="mh-total">${money(totals[k])}</span>
            </div>`;
            last = k;
        }
        html += card(e);
    });
    list.innerHTML = html;
}

const card = e => `
    <div class="expense-item" data-id="${esc(e.id)}">
        <div class="exp-left">
            <div class="exp-name">${esc(e.name)}</div>
            <div class="exp-meta">${categoryChip(e.category)}${contextTag(e.context)}<span class="exp-date">${fmtDate(e.date)}</span></div>
        </div>
        <div class="exp-cost">${money(e.cost)}</div>
    </div>`;

// ---------- Utility locali ----------
function sortItems(items, sort) {
    const by = {
        'date-asc': (a, b) => a.date.localeCompare(b.date),
        'date-desc': (a, b) => b.date.localeCompare(a.date),
        'cost-desc': (a, b) => b.cost - a.cost,
        'cost-asc': (a, b) => a.cost - b.cost,
        'name-asc': (a, b) => a.name.localeCompare(b.name, 'it')
    };
    return [...items].sort(by[sort] || by['date-desc']);
}

function distinctAlpha(all, field) {
    return [...new Set(all.map(e => e[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
}

function fillSelect(select, values, allLabel) {
    const current = select.value;
    select.innerHTML = `<option value="">${allLabel}</option>` +
        values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    select.value = values.includes(current) ? current : '';
}
