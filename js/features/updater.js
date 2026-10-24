// ==========================================================
// AGGIORNAMENTI — tiene l'app allineata all'ultima versione
// pubblicata su GitHub, senza mai toccare i dati salvati.
// Controlla all'avvio e quando torni nell'app, ma al massimo
// una volta ogni CHECK_EVERY_HOURS: la richiesta è minuscola,
// parte quando l'app è già visibile e salta se sei offline.
// ==========================================================
import { VERSION } from '../version.js';
import { showToast } from '../ui/toast.js';

const CHECK_EVERY_HOURS = 6;
const RETRY_AFTER_MINUTES = 15; // se un aggiornamento non ha avuto effetto, non riprova subito
const KEY = 'updater_v1';       // { lastCheck, lastSeen, attempt: { version, at } }

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* non bloccante */ } };

export function initUpdater() {
    const s = read();
    // Dopo un aggiornamento (fatto qui o arrivato da solo) lo dico una volta
    if (s.lastSeen && s.lastSeen !== VERSION) {
        setTimeout(() => showToast(`App aggiornata alla versione ${VERSION}`), 600);
    }
    s.lastSeen = VERSION;
    if (s.attempt?.version === VERSION) delete s.attempt;
    write(s);

    setTimeout(maybeCheck, 3000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') maybeCheck();
    });
}

/** Momento dell'ultimo controllo (millisecondi) o 0 se mai fatto */
export const lastCheckTime = () => read().lastCheck || 0;

function maybeCheck() {
    if (Date.now() - lastCheckTime() >= CHECK_EVERY_HOURS * 3600e3) checkNow();
}

/**
 * Controlla subito e, se su GitHub c'è una versione diversa, aggiorna.
 * Risultato: 'latest' | 'updating' | 'pending' | 'busy' | 'offline' | 'error'
 */
export async function checkNow() {
    if (!navigator.onLine) return 'offline';

    const s = read();
    s.lastCheck = Date.now(); // conta anche se fallisce: niente tentativi a raffica
    write(s);

    const remote = await fetchRemoteVersion();
    if (!remote) return 'error';
    if (remote === VERSION) return 'latest';

    // Non interrompo chi sta compilando una spesa: riprovo al prossimo ritorno nell'app
    if (document.querySelector('.modal.active')) {
        s.lastCheck = 0;
        write(s);
        return 'busy';
    }
    // Protezione dai cicli: se ho appena provato ad aggiornare a questa versione, aspetto
    if (s.attempt?.version === remote && Date.now() - s.attempt.at < RETRY_AFTER_MINUTES * 60e3) {
        return 'pending';
    }

    s.attempt = { version: remote, at: Date.now() };
    write(s);
    showToast(`Aggiornamento alla versione ${remote}…`, 0);
    await refreshCachedFiles();
    location.reload();
    return 'updating';
}

/** Legge la versione pubblicata, scavalcando la cache. null se non riesce. */
async function fetchRemoteVersion() {
    try {
        const res = await fetch(`js/version.js?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.text()).match(/VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1] || null;
    } catch {
        return null;
    }
}

/** Riscarica dalla rete i file già in memoria, così il ricaricamento usa quelli nuovi */
async function refreshCachedFiles() {
    const urls = new Set([location.href.split('#')[0]]);
    (performance.getEntriesByType?.('resource') || []).forEach(e => {
        if (e.name.startsWith(location.origin)) urls.add(e.name);
    });
    await Promise.all([...urls].map(u => fetch(u, { cache: 'reload' }).catch(() => null)));
}
