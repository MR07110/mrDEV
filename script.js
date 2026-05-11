// script.js (ROOT papkada)
import logger from './assets/js/core/logger.js';
import { initTheme, toggleTheme } from './assets/js/core/theme.js';
import { initAuth, logout } from './assets/js/core/auth.js';
import { initSidebar, toggleSidebar, closeSidebar } from './assets/js/ui/sidebar.js';
import { initTabs, switchTab } from './assets/js/ui/tabs.js';
import { initSearch } from './assets/js/ui/search.js';
import { initModals, showModal, closeModal } from './assets/js/ui/modal.js';
import { initUserMenu } from './assets/js/ui/user-menu.js';
import { signInWithGoogle } from './assets/js/features/google-auth.js';
import {
    showMrdevLogin, closeMrdevLoginModal, submitMrdevId, verifyMrdevPass
} from './assets/js/features/mrdev-login.js';
import {
    showPassNotifications, closePassNotifModal
} from './assets/js/features/pass-notifications.js';
// ✅ EMAIL AUTH
import {
    setAuthMode, toggleAuthMode, submitAuthForm, signInWithEmail, signUpWithEmail
} from './assets/js/features/email-auth.js';
import { showToast } from './assets/js/core/toast.js';

// ==================== WINDOW EXPORTS ====================
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.switchTab = switchTab;
window.signInWithGoogle = signInWithGoogle;
window.logout = logout;

// Auth modal
window.showAuthModal = () => {
    setAuthMode('login');
    showModal('authModal');
};
window.closeAuthModal = () => closeModal('authModal');

// Email auth
window.setAuthMode = setAuthMode;
window.toggleAuthMode = toggleAuthMode;
window.submitAuthForm = submitAuthForm;
window.signInWithEmail = signInWithEmail;
window.signUpWithEmail = signUpWithEmail;

// MRDEV ID
window.showMrdevLogin = showMrdevLogin;
window.closeMrdevLoginModal = closeMrdevLoginModal;
window.submitMrdevId = submitMrdevId;
window.verifyMrdevPass = verifyMrdevPass;

// Pass notifications
window.showPassNotifications = showPassNotifications;
window.closePassNotifModal = closePassNotifModal;

// User menu
window.toggleUserMenu = function () {
    document.getElementById('userMenu')?.classList.toggle('show');
};
window.closeUserMenu = function () {
    document.getElementById('userMenu')?.classList.remove('show');
};

// Mobile search
window.toggleMobileSearch = function () {
    const searchSection = document.getElementById('mobileSearchSection');
    const searchInput = document.getElementById('searchInput');
    if (!searchSection) return;
    const isOpen = searchSection.classList.contains('show');
    if (isOpen) {
        searchSection.classList.remove('show');
        if (searchInput) { searchInput.blur(); searchInput.value = ''; }
        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) clearSearch.style.display = 'none';
    } else {
        searchSection.classList.add('show');
        if (searchInput) setTimeout(() => searchInput.focus(), 400);
    }
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    logger.platformStart();
    initTheme();
    initAuth();
    initSidebar();
    initTabs();
    initSearch();
    initModals();
    initUserMenu();

    // Click outside - userMenu yopilishi
    document.addEventListener('click', (e) => {
        const userMenu = document.getElementById('userMenu');
        const userTrigger = document.getElementById('headerUserTrigger');
        if (userMenu?.classList.contains('show') && !userMenu.contains(e.target) && !userTrigger?.contains(e.target)) {
            window.closeUserMenu();
        }
    });

    logger.platformReady();
});
