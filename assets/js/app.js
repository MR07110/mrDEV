// ==================== MRDEV APP v7.3 ====================

import { initTheme, toggleTheme } from './core/theme.js';
import { initAuth, logout } from './core/auth.js';
import { initSidebar, toggleSidebar, closeSidebar } from './ui/sidebar.js';
import { initTabs, switchTab } from './ui/tabs.js';
import { initSearch } from './ui/search.js';
import { initModals, showModal, closeModal } from './ui/modal.js';
import { initUserMenu } from './ui/user-menu.js';
import { signInWithGoogle } from './features/google-auth.js';
import {
    showMrdevLogin,
    closeMrdevLoginModal,
    submitMrdevId,
    verifyMrdevPass
} from './features/mrdev-login.js';
import {
    showPassNotifications,
    closePassNotifModal
} from './features/pass-notifications.js';
import { showToast } from './core/toast.js';

// ==================== WINDOW EXPORTS ====================
window.toggleTheme        = toggleTheme;
window.toggleSidebar      = toggleSidebar;
window.closeSidebar       = closeSidebar;
window.switchTab          = switchTab;
window.signInWithGoogle   = signInWithGoogle;
window.logout             = logout;
window.showAuthModal      = () => showModal('authModal');
window.closeAuthModal     = () => closeModal('authModal');
window.showMrdevLogin     = showMrdevLogin;
window.closeMrdevLoginModal = closeMrdevLoginModal;
window.submitMrdevId      = submitMrdevId;
window.verifyMrdevPass    = verifyMrdevPass;
window.showPassNotifications = showPassNotifications;
window.closePassNotifModal  = closePassNotifModal;

// toggleUserMenu va closeUserMenu
window.toggleUserMenu = function () {
    document.getElementById('userMenu')?.classList.toggle('show');
};
window.closeUserMenu = function () {
    document.getElementById('userMenu')?.classList.remove('show');
};

// Mobil qidiruv toggle
window.toggleMobileSearch = function () {
    const searchSection = document.getElementById('mobileSearchSection');
    const searchInput   = document.getElementById('searchInput');
    if (!searchSection) return;

    const isOpen = searchSection.classList.contains('show');
    if (isOpen) {
        searchSection.classList.remove('show');
        if (searchInput) {
            searchInput.blur();
            searchInput.value = '';
        }
        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) clearSearch.style.display = 'none';
    } else {
        searchSection.classList.add('show');
        if (searchInput) setTimeout(() => searchInput.focus(), 400);
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 MRDEV v7.3 ishga tushmoqda...');

    initTheme();
    initAuth();
    initSidebar();
    initTabs();
    initSearch();
    initModals();
    initUserMenu();

    // Click outside — user menu yopilishi
    document.addEventListener('click', (e) => {
        const userMenu    = document.getElementById('userMenu');
        const userTrigger = document.getElementById('headerUserTrigger');
        if (
            userMenu?.classList.contains('show') &&
            !userMenu.contains(e.target) &&
            !userTrigger?.contains(e.target)
        ) {
            window.closeUserMenu();
        }
    });

    console.log('✅ MRDEV Platform tayyor');
});
