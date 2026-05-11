// ==================== MRDEV USER MENU ====================
export function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.toggle('show');
}

export function closeUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) menu.classList.remove('show');
}

export function initUserMenu() {
    document.addEventListener('click', (e) => {
        const trigger = document.getElementById('mrdevUserTrigger');
        const menu = document.getElementById('userMenu');
        if (trigger && menu && !trigger.contains(e.target) && !menu.contains(e.target)) {
            closeUserMenu();
        }
    });
}
