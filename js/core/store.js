// ==========================================================
// STORE — unica fonte di verità per le spese.
// Nucleo: tutte le letture e scritture passano da qui.
// Le funzionalità non toccano mai localStorage: chiamano
// add / update / remove e si aggiornano con subscribe().
// ==========================================================

const KEY = 'spese_v1'; // NON cambiare: è dove sono salvati i dati esistenti

const listeners = new Set();
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Rende valida una spesa (dati salvati, form, import). null se inutilizzabile. */
export function normalize(x) {
    if (!x || x.name == null || x.cost == null || !x.date) return null;
    return {
        id: x.id ? String(x.id) : newId(),
        name: String(x.name).trim(),
        category: String(x.category || 'Altro').trim(),
        context: String(x.context || '').trim(),
        cost: Number(x.cost) || 0,
        date: String(x.date)
    };
}

let expenses = load();

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(raw) ? raw.map(normalize).filter(Boolean) : [];
    } catch {
        return [];
    }
}

function commit() {
    try { localStorage.setItem(KEY, JSON.stringify(expenses)); }
    catch { alert('Impossibile salvare i dati su questo dispositivo.'); }
    listeners.forEach(fn => fn());
}

// ---------- Lettura ----------
export const getAll = () => expenses;
export const getById = id => expenses.find(e => e.id === id);

/** Valori distinti di un campo ('category' o 'context'), dal più usato. */
export function distinct(field) {
    const count = {};
    expenses.forEach(e => { if (e[field]) count[e[field]] = (count[e[field]] || 0) + 1; });
    return Object.keys(count).sort((a, b) => count[b] - count[a]);
}

// ---------- Scrittura ----------
export function add(data) {
    const e = normalize({ ...data, id: newId() });
    if (e) { expenses.push(e); commit(); }
}

export function update(id, data) {
    const i = expenses.findIndex(e => e.id === id);
    if (i === -1) return;
    const e = normalize({ ...expenses[i], ...data, id });
    if (e) { expenses[i] = e; commit(); }
}

export function remove(id) {
    expenses = expenses.filter(e => e.id !== id);
    commit();
}

/** Import da backup: sostituisce tutto o aggiunge. Restituisce quante spese valide sono entrate. */
export function importMany(list, replace) {
    const clean = list.map(normalize).filter(Boolean);
    if (replace) {
        expenses = clean;
    } else {
        const ids = new Set(expenses.map(e => e.id));
        expenses = expenses.concat(clean.map(e => (ids.has(e.id) ? { ...e, id: newId() } : e)));
    }
    commit();
    return clean.length;
}

export function clear() {
    expenses = [];
    commit();
}

// ---------- Notifiche ----------
/** Registra una funzione chiamata a ogni modifica dei dati. */
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
