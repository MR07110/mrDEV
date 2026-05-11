// ==================== MRDEV PASS NOTIFICATIONS v2.2 ====================
// FIX: Local auth user uchun ham ishlaydi
// uid yoki email orqali pass_notifications topiladi

import { auth, rtdb } from '../core/firebase-init.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { showToast } from '../core/toast.js';
import { showModal, closeModal } from '../ui/modal.js';

export function showPassNotifications() {
    // FIX: Avval Firebase Auth user, keyin local auth user tekshiriladi
    let uid = null;
    let email = null;

    // Firebase Auth user
    if (auth.currentUser) {
        uid = auth.currentUser.uid;
        email = auth.currentUser.email;
    }

    // Local auth user
    if (!uid) {
        try {
            const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');
            if (local?.isLoggedIn && local?.uid) {
                uid = local.uid;
                email = local.email;
            }
        } catch (e) {}
    }

    if (!uid) {
        showToast('Hisobga kiring', 'error');
        return;
    }

    showModal('passNotifModal');
    loadPassNotifications(uid, email);
}

export function closePassNotifModal() {
    closeModal('passNotifModal');
}

async function loadPassNotifications(uid, email) {
    const container = document.getElementById('passNotifList');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);">⏳ Yuklanmoqda...</div>';

    try {
        if (!rtdb) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--red);">Database ulanishi yo\'q</div>';
            return;
        }

        const notifRef = ref(rtdb, 'pass_notifications');
        const snapshot = await get(notifRef);

        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">📭 Xabarlar yo\'q</div>';
            return;
        }

        const items = [];
        snapshot.forEach((child) => {
            const data = child.val();

            // FIX: uid yoki firestoreUid yoki email orqali tekshirish
            const matchesUid = data.uid === uid || data.firestoreUid === uid;
            const matchesEmail = email && data.email === email;

            if (data && (matchesUid || matchesEmail)) {
                items.push({
                    id: child.key,
                    ...data,
                    createdAt: data.createdAt || Date.now()
                });
            }
        });

        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (!items.length) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">📭 Xabarlar yo\'q</div>';
            return;
        }

        container.innerHTML = items.map(data => {
            const date = new Date(data.createdAt || Date.now());
            const isExpired = Date.now() > (data.expiresAt || 0);
            const isUsed = data.used === true;
            let status = 'active';
            let statusText = '✅ Faol';

            if (isUsed) {
                status = 'used';
                statusText = '✓ Ishlatilgan';
            } else if (isExpired) {
                status = 'expired';
                statusText = '⏰ Muddati tugagan';
            }

            return `
                <div class="pass-notif-item">
                    <div class="pass-notif-header">
                        <span class="pass-notif-code">${data.passCode || '------'}</span>
                        <span class="pass-notif-status ${status}">${statusText}</span>
                    </div>
                    <div class="pass-notif-date">
                        ${date.toLocaleString('uz-UZ')} | ID: ${data.mrdevId || '?'}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('❌ Load error:', error);
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:var(--red);">
                ⚠️ Xatolik: ${error.message}
                <button onclick="location.reload()" 
                    style="display:block;margin:12px auto;padding:8px 16px;">
                    Qayta yuklash
                </button>
            </div>
        `;
    }
}