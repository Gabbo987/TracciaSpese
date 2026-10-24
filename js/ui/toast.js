// ==========================================================
// TOAST — breve messaggio che compare in basso e sparisce.
// showToast('Fatto');  showToast('Attendi…', 0) resta visibile.
// ==========================================================

let el, timer;

export function showToast(message, duration = 2800) {
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(timer);
    if (duration) timer = setTimeout(() => el.classList.remove('show'), duration);
}
