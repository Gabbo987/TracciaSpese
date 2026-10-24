// ==========================================================
// TABS — navigazione tra le schermate (tab bar in basso).
// Le funzionalità possono reagire al cambio con onTabChange().
// ==========================================================

let current = 'spese';
const listeners = new Set();

export function initTabs() {
    const active = document.querySelector('.tab-btn.active');
    if (active) current = active.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(btn =>
        btn.addEventListener('click', () => showTab(btn.dataset.tab)));
}

export function showTab(tab) {
    current = tab;
    document.querySelectorAll('.tab-content').forEach(s =>
        s.classList.toggle('active', s.id === 'tab-' + tab));
    document.querySelectorAll('.tab-btn').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('active', on);
        if (on) document.getElementById('pageTitle').textContent = b.dataset.title || '';
    });
    window.scrollTo(0, 0);
    listeners.forEach(fn => fn(tab));
}

export const currentTab = () => current;
export const onTabChange = fn => listeners.add(fn);
