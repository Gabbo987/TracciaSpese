// ==========================================================
// FORMAT — formattazione di importi e date, piccole utility.
// Nucleo: nessuna dipendenza, si tocca raramente.
// Le date sono sempre stringhe ISO "AAAA-MM-GG".
// ==========================================================

const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const whole = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

/** 1234.5 → "1234,50 €" */
export const money = n => eur.format(n || 0);

/** 1234.5 → "1235 €" (per gli assi dei grafici) */
export const moneyShort = n => whole.format(n || 0) + ' €';

/** "12,50", "12.50" o "1.234,50" → numero */
export function parseCost(value) {
    let s = String(value).replace(/\s|€/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    return parseFloat(s);
}

/** "2026-09-22" → Date locale (senza sorprese di fuso orario) */
export function parseDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Date → "2026-09-22" */
export function toISO(date) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export const todayISO = () => toISO(new Date());

export const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Data ISO formattata in italiano con le opzioni di toLocaleDateString */
export const fmt = (iso, opts) => parseDate(iso).toLocaleDateString('it-IT', opts);

/** "22 set 2026" */
export const fmtDate = iso => fmt(iso, { day: '2-digit', month: 'short', year: 'numeric' });

/** "Settembre 2026" */
export const monthLabel = iso => capitalize(fmt(iso, { month: 'long', year: 'numeric' }));

/** "12 set – 15 set 2026" (anno ripetuto solo se cambia) */
export function rangeLabel(a, b) {
    if (a === b) return fmtDate(a);
    const sameYear = a.slice(0, 4) === b.slice(0, 4);
    const left = fmt(a, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
    return `${left} – ${fmt(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** plural(3, 'spesa', 'spese') → "3 spese" */
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Protegge il testo scritto dall'utente quando finisce nell'HTML */
export const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
