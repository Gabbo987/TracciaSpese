// ==========================================================
// FORM SPESA — aggiungere, modificare ed eliminare una spesa.
// Si apre da qualsiasi schermata con openExpenseForm(id?).
// ==========================================================
import * as store from '../core/store.js';
import { parseCost, todayISO } from '../core/format.js';
import { catColor } from '../core/colors.js';
import { createModal } from '../ui/modal.js';
import { attachAutocomplete } from '../ui/autocomplete.js';
import { colorDot } from '../ui/components.js';

let modal, form, editingId = null;
const field = name => form.querySelector(`[name="${name}"]`);

export function initExpenseForm() {
    modal = createModal();
    modal.body.innerHTML = `
        <form>
            <div class="form-group">
                <label class="form-label">Nome spesa</label>
                <input type="text" class="form-input" name="name" required placeholder="es. Spesa supermercato" autocomplete="off">
            </div>
            <div class="form-group">
                <label class="form-label">Categoria</label>
                <input type="text" class="form-input" name="category" required placeholder="es. Alimentari" autocomplete="off">
            </div>
            <div class="form-group">
                <label class="form-label">Contesto (facoltativo)</label>
                <input type="text" class="form-input" name="context" placeholder="es. Viaggio Roma" autocomplete="off">
            </div>
            <div class="form-group">
                <label class="form-label">Costo (€)</label>
                <input type="text" inputmode="decimal" class="form-input" name="cost" required placeholder="0,00" autocomplete="off">
            </div>
            <div class="form-group">
                <label class="form-label">Data</label>
                <input type="date" class="form-input" name="date" required>
            </div>
            <button type="submit" class="btn btn-primary" data-role="save"></button>
            <button type="button" class="btn btn-danger" data-role="delete">🗑️ Elimina spesa</button>
        </form>`;
    form = modal.body.querySelector('form');

    const acCategory = attachAutocomplete(field('category'), () => store.distinct('category'), c => colorDot(catColor(c)));
    const acContext = attachAutocomplete(field('context'), () => store.distinct('context'));
    modal.onClose(() => { acCategory.hide(); acContext.hide(); });

    form.addEventListener('submit', onSubmit);
    form.querySelector('[data-role="delete"]').addEventListener('click', onDelete);
}

/** Apre il form: senza id per una nuova spesa, con id per modificarla. */
export function openExpenseForm(id = null) {
    const e = id ? store.getById(id) : null;
    editingId = e ? e.id : null;

    form.reset();
    field('name').value = e ? e.name : '';
    field('category').value = e ? e.category : '';
    field('context').value = e ? e.context : '';
    field('cost').value = e ? String(e.cost).replace('.', ',') : '';
    field('date').value = e ? e.date : todayISO();
    form.querySelector('[data-role="save"]').textContent = e ? '💾 Salva modifiche' : '💾 Aggiungi spesa';
    form.querySelector('[data-role="delete"]').hidden = !e;

    modal.open(e ? 'Modifica spesa' : 'Nuova spesa');
    if (!e) setTimeout(() => field('name').focus(), 300);
}

function onSubmit(ev) {
    ev.preventDefault();
    const cost = parseCost(field('cost').value);
    if (isNaN(cost) || cost < 0) { alert('Inserisci un costo valido.'); return; }

    const data = {
        name: field('name').value.trim(),
        category: field('category').value.trim(),
        context: field('context').value.trim(),
        cost,
        date: field('date').value
    };
    if (editingId) store.update(editingId, data);
    else store.add(data);
    modal.close();
}

function onDelete() {
    if (editingId && confirm('Eliminare questa spesa?')) {
        store.remove(editingId);
        modal.close();
    }
}
