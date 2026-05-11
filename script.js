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

// ==================== MRDEV INFO TOGGLE ====================
// Bu funksiya module tashqarisida ishlaydi
function setupMrdevInfoToggle() {
    const modal = document.getElementById('mrdevLoginModal');
    if (!modal) return;

    // Barcha "onclick" li linklarni topish
    const links = modal.querySelectorAll('a[onclick]');
    links.forEach(link => {
        const onclick = link.getAttribute('onclick');
        if (onclick && onclick.includes('toggleMrdevInfo')) {
            // Eski onclick ni o'chirish
            link.removeAttribute('onclick');
            // Yangi event listener qo'shish
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const infoBox = document.getElementById('mrdevInfoBox');
                const helpBox = document.getElementById('mrdevHelpBox');
                
                // Qaysi box ko'rinayotganini aniqlash
                if (infoBox && helpBox) {
                    const infoVisible = infoBox.style.display === 'block';
                    const helpVisible = helpBox.style.display === 'block';
                    
                    if (infoVisible) {
                        infoBox.style.display = 'none';
                        this.textContent = 'Ko\'proq ma\'lumot ▼';
                    } else if (helpVisible) {
                        helpBox.style.display = 'none';
                        this.textContent = 'Kod kelmadimi? ▼';
                    } else {
                        // Ikkalasi ham yopiq — qaysi biri ko'rinishini aniqlash
                        // 1-qadam da infoBox, 2-qadam da helpBox
                        const step1 = document.getElementById('mrdevStep1');
                        const step2 = document.getElementById('mrdevStep2');
                        
                        if (step2 && step2.style.display !== 'none') {
                            helpBox.style.display = 'block';
                            this.textContent = 'Yopish ▲';
                        } else {
                            infoBox.style.display = 'block';
                            this.textContent = 'Yopish ▲';
                        }
                    }
                } else if (infoBox) {
                    const isVisible = infoBox.style.display === 'block';
                    infoBox.style.display = isVisible ? 'none' : 'block';
                    this.textContent = isVisible ? 'Ko\'proq ma\'lumot ▼' : 'Yopish ▲';
                } else if (helpBox) {
                    const isVisible = helpBox.style.display === 'block';
                    helpBox.style.display = isVisible ? 'none' : 'block';
                    this.textContent = isVisible ? 'Kod kelmadimi? ▼' : 'Yopish ▲';
                }
            });
        }
    });
}

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

    // MRDEV Info Toggle ni sozlash
    setupMrdevInfoToggle();

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