// ==================== MRDEV SETTINGS ====================
import { auth } from '../assets/js/core/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { initTheme, toggleTheme } from '../assets/js/core/theme.js';
import { showToast } from '../assets/js/core/toast.js';
import { initSettingsNav, switchSettingsTab } from './features/nav.js';
import { initProfileTab } from './features/profile.js';
import { initAccountsTab } from './features/accounts.js';
import { initSecurityTab } from './features/security.js';
import { initAppearanceTab } from './features/appearance.js';
import { initNotificationsTab } from './features/notifications.js';
import { initDataTab } from './features/data.js';

// Window exports
window.toggleTheme = toggleTheme;
window.switchSettingsTab = switchSettingsTab;
window.showToast = showToast;

window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = '../';
    } catch (e) {
        showToast(e.message, 'error');
    }
};

let currentUser = null;
export function getCurrentUser() {
    return currentUser;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings ishga tushmoqda...');

    initTheme();

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateHeaderUser();
    });

    initSettingsNav();
    initProfileTab();
    initAccountsTab();
    initSecurityTab();
    initAppearanceTab();
    initNotificationsTab();
    initDataTab();

    const hash = window.location.hash.replace('#', '');
    const tabs = ['profile', 'accounts', 'security', 'appearance', 'notifications', 'data'];
    switchSettingsTab(tabs.includes(hash) ? hash : 'profile');

    console.log('Settings tayyor');
});

function updateHeaderUser() {
    const user = currentUser;
    const avatar = document.getElementById('settingsAvatar');
    const name = document.getElementById('settingsUserName');
    if (!avatar || !name) return;

    if (user) {
        const dn = user.displayName || user.email?.split('@')[0] || 'User';
        name.textContent = dn;
        avatar.innerHTML = user.photoURL 
            ? `<img src="${user.photoURL}" alt="${dn}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
    } else {
        name.textContent = 'Mehmon';
        avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`;
    }
}
