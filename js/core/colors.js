// ==========================================================
// COLORS — un colore stabile e distinto per ogni categoria.
// Nucleo: l'abbinamento categoria → colore viene salvato.
// ==========================================================

const KEY = 'catColors_v1'; // NON cambiare: abbinamenti già salvati

// Colori ben distinti; l'ordine è la priorità di assegnazione
const PALETTE = ['#007AFF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE', '#00C7BE',
                 '#FFCC00', '#FF2D55', '#5856D6', '#32ADE6', '#A2845E'];

let map = load();

function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
}

/** Colore della categoria. Una categoria nuova riceve il colore meno usato finora. */
export function catColor(category) {
    const key = (category || '').trim();
    if (map[key]) return map[key];

    const used = Object.fromEntries(PALETTE.map(c => [c, 0]));
    Object.values(map).forEach(c => { if (c in used) used[c]++; });
    const best = PALETTE.reduce((a, b) => (used[b] < used[a] ? b : a));

    map[key] = best;
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* non bloccante */ }
    return best;
}

/** Assegna i colori in ordine di comparsa, così sono sempre gli stessi. */
export const ensureColors = categories => categories.forEach(catColor);

/** "#007AFF", 0.15 → "rgba(0, 122, 255, 0.15)" */
export function rgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
