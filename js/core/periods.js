// ==========================================================
// PERIODS — filtri temporali condivisi da elenco e statistiche.
// Nucleo: tutte le date sono stringhe ISO "AAAA-MM-GG",
// quindi si confrontano direttamente come testo.
// ==========================================================
import { toISO } from './format.js';

/**
 * Intervallo [da, a] (estremi inclusi) come stringhe ISO; null = senza limite.
 * period: 'all' | 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'custom'
 */
export function periodBounds(period, from = '', to = '') {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    switch (period) {
        case 'thisMonth': return [toISO(new Date(y, m, 1)), toISO(new Date(y, m + 1, 0))];
        case 'lastMonth': return [toISO(new Date(y, m - 1, 1)), toISO(new Date(y, m, 0))];
        case 'last30':    return [toISO(new Date(y, m, d - 29)), toISO(new Date(y, m, d))];
        case 'thisYear':  return [toISO(new Date(y, 0, 1)), toISO(new Date(y, 11, 31))];
        case 'custom':    return [from || null, to || null];
        default:          return [null, null]; // 'all'
    }
}

/** Restituisce una funzione che dice se una data ISO cade nel periodo. */
export function periodFilter(period, from, to) {
    const [a, b] = periodBounds(period, from, to);
    return iso => (!a || iso >= a) && (!b || iso <= b);
}
