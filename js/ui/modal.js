// ==========================================================
// MODAL — finestra che sale dal basso, riutilizzabile.
// const m = createModal();  m.body.innerHTML = '...';  m.open('Titolo');
// ==========================================================

export function createModal() {
    const root = document.createElement('div');
    root.className = 'modal';
    root.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title"></h2>
                <button type="button" class="modal-close" aria-label="Chiudi">×</button>
            </div>
            <div class="modal-body"></div>
        </div>`;
    document.body.appendChild(root);

    const closeFns = [];
    const close = () => {
        root.classList.remove('active');
        closeFns.forEach(fn => fn());
    };

    root.querySelector('.modal-close').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); }); // tocco sullo sfondo

    return {
        body: root.querySelector('.modal-body'),
        open(title) {
            root.querySelector('.modal-title').textContent = title;
            root.classList.add('active');
        },
        close,
        onClose: fn => closeFns.push(fn)
    };
}
