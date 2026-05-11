import { auth } from '../firebase-init.js';
import { getCurrentUser } from '../script.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showToast } from '../../assets/js/core/toast.js';

export function initSecurityTab() {
    updateSessionInfo();
    setupButtons();
}

function updateSessionInfo() {
    const user = getCurrentUser();
    const el = document.getElementById('activeSessionsText');
    if (!el) return;

    if (user && user.metadata && user.metadata.lastSignInTime) {
        el.textContent = new Date(user.metadata.lastSignInTime).toLocaleString('uz-UZ');
    } else {
        el.textContent = '-';
    }
}

function setupButtons() {
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            showToast('Email topilmadi', 'error');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            showToast('Havola yuborildi', 'success');
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('signOutAllBtn')?.addEventListener('click', async () => {
        try {
            if (auth.currentUser) {
                await auth.currentUser.getIdToken(true);
            }
            window.logout();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });

    document.getElementById('setup2FABtn')?.addEventListener('click', () => {
        showToast('2FA hozircha mavjud emas', 'info');
    });
}
