// ==========================================================
// COMPONENTS — piccoli pezzi di HTML usati da più schermate,
// così hanno lo stesso aspetto ovunque.
// ==========================================================
import { esc } from '../core/format.js';
import { catColor, rgba } from '../core/colors.js';

/** Chip colorato della categoria */
export function categoryChip(category) {
    const c = catColor(category);
    return `<span class="chip" style="background:${rgba(c, 0.15)};color:${c}">${esc(category)}</span>`;
}

/** Etichetta neutra del contesto (vuota se non c'è) */
export const contextTag = context =>
    (context ? `<span class="context-tag">${esc(context)}</span>` : '');

/** Pallino colorato */
export const colorDot = (color, small = false) =>
    `<span class="dot${small ? ' sm' : ''}" style="background:${color}"></span>`;

/** Messaggio per liste vuote */
export const emptyState = (icon, title, text) => `
    <div class="empty">
        <div class="empty-icon">${icon}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-text">${text}</div>
    </div>`;
