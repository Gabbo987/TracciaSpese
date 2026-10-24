// ==========================================================
// AUTOCOMPLETE — suggerimenti sotto un campo di testo.
// Usato per categoria e contesto nel form delle spese.
// ==========================================================
import { esc } from '../core/format.js';

/**
 * input:      il campo (il suo contenitore deve avere position: relative)
 * getOptions: funzione che restituisce i valori possibili, già ordinati
 * decorate:   HTML opzionale prima del testo (es. pallino colorato)
 */
export function attachAutocomplete(input, getOptions, decorate = () => '') {
    const box = document.createElement('div');
    box.className = 'suggestions';
    input.insertAdjacentElement('afterend', box);
    let matches = [];

    const hide = () => box.classList.remove('show');
    const show = () => {
        const q = input.value.trim().toLowerCase();
        matches = getOptions()
            .filter(o => o.toLowerCase().includes(q) && o.toLowerCase() !== q)
            .slice(0, 8);
        if (!matches.length) return hide();
        box.innerHTML = matches
            .map((o, i) => `<div class="suggestion" data-i="${i}">${decorate(o)}${esc(o)}</div>`)
            .join('');
        box.classList.add('show');
    };

    input.addEventListener('input', show);
    input.addEventListener('focus', show);
    input.addEventListener('blur', () => setTimeout(hide, 150));
    box.addEventListener('mousedown', e => {
        const el = e.target.closest('.suggestion');
        if (!el) return;
        e.preventDefault();
        input.value = matches[+el.dataset.i];
        hide();
    });

    return { hide };
}
