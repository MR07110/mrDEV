// ==================== MRDEV MODAL MANAGER ====================
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = 'flex';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => modal.classList.add('show'));
    });
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

export function initModals() {
    ['mrdevLoginModal', 'passNotifModal', 'authModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(id);
            }
        });

        const content = modal.querySelector('.modal-content');
        if (content) {
            content.addEventListener('click', (e) => e.stopPropagation());
        }
    });
}
