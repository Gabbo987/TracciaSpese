// ==========================================================
// IMPOSTAZIONI — aggiornamenti, backup (esporta / importa)
// e cancellazione dei dati.
// ==========================================================
import * as store from '../core/store.js';
import { todayISO, toISO, plural } from '../core/format.js';
import { onTabChange } from '../ui/tabs.js';
import { showToast } from '../ui/toast.js';
import { VERSION } from '../version.js';
import { checkNow, lastCheckTime } from './updater.js';

const CHECK_MESSAGES = {
    latest: `Hai già l'ultima versione (${VERSION}).`,
    pending: "Aggiornamento in arrivo: riapri l'app tra qualche minuto.",
    offline: 'Nessuna connessione: riprova quando sei online.',
    error: 'Controllo non riuscito: riprova più tardi.'
};

export function initSettings(container) {
    container.innerHTML = `
        <div class="card">
            <h3>Aggiornamenti</h3>
            <div class="info-row"><span>Versione installata</span><span>${VERSION}</span></div>
            <div class="info-row"><span>Ultimo controllo</span><span data-ref="lastCheck"></span></div>
            <button class="btn btn-secondary" data-ref="check">🔄 Controlla aggiornamenti</button>
        </div>
        <div class="card">
            <h3>Dati e backup</h3>
            <div class="info-row"><span>Spese registrate</span><span data-ref="count">0</span></div>
            <button class="btn btn-primary" data-ref="export">📤 Esporta le spese</button>
            <button class="btn btn-secondary" data-ref="import">📥 Importa da file</button>
            <input type="file" accept=".json,application/json" data-ref="file" hidden>
        </div>
        <div class="card">
            <button class="btn btn-danger" data-ref="clear">🗑️ Elimina tutte le spese</button>
        </div>
        <p class="footnote">
            Le spese sono salvate solo su questo dispositivo.<br>
            Su iPhone, rimuovere l'app dalla Home cancella anche le spese: esporta prima un backup.<br>
            Per installarla come app: Condividi → Aggiungi a Home.
        </p>`;

    const ref = name => container.querySelector(`[data-ref="${name}"]`);

    // Aggiornamenti
    const showLastCheck = () => { ref('lastCheck').textContent = describeTime(lastCheckTime()); };
    ref('check').addEventListener('click', async () => {
        const btn = ref('check');
        btn.disabled = true;
        btn.textContent = '🔄 Controllo in corso…';
        const result = await checkNow();
        btn.disabled = false;
        btn.textContent = '🔄 Controlla aggiornamenti';
        if (CHECK_MESSAGES[result]) showToast(CHECK_MESSAGES[result]);
        showLastCheck();
    });
    onTabChange(tab => { if (tab === 'settings') showLastCheck(); });
    showLastCheck();

    // Dati
    ref('export').addEventListener('click', exportData);
    ref('import').addEventListener('click', () => ref('file').click());
    ref('file').addEventListener('change', importData);
    ref('clear').addEventListener('click', deleteAll);

    const updateCount = () => { ref('count').textContent = store.getAll().length; };
    store.subscribe(updateCount);
    updateCount();
}

/** "oggi, 14:32" oppure "12 set, 09:05" */
function describeTime(t) {
    if (!t) return 'mai';
    const d = new Date(t);
    const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const day = toISO(d) === todayISO() ? 'oggi' : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    return `${day}, ${time}`;
}

function exportData() {
    const blob = new Blob([JSON.stringify(store.getAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `spese-${todayISO()}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importData(ev) {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        let list = null;
        try { list = JSON.parse(reader.result); } catch { /* gestito sotto */ }
        if (!Array.isArray(list)) { alert('File non valido: serve un backup esportato da questa app.'); return; }
        const replace = confirm('OK = sostituisci tutte le spese\nAnnulla = aggiungi a quelle esistenti');
        const n = store.importMany(list, replace);
        alert(`Importazione completata: ${plural(n, 'spesa', 'spese')}.`);
    };
    reader.readAsText(file);
}

function deleteAll() {
    const n = store.getAll().length;
    if (!n) { alert('Non ci sono spese da eliminare.'); return; }
    if (confirm(`Eliminare tutte le ${n} spese? L'azione non è reversibile.`)) store.clear();
}
