// ==================== MRDEV PASS NOTIFICATIONS v3.0 ====================
// FIX v3.0:
//   1. Firebase Auth user va Local auth user — ikkalasi uchun ham ishlaydi
//   2. uid, firestoreUid, email — uchala field orqali ham filtr qilinadi
//   3. Debug loglar qo'shildi

import { auth, rtdb } from '../core/firebase-init.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { showToast } from '../core/toast.js';
import { showModal, closeModal } from '../ui/modal.js';

export function showPassNotifications() {
    let uid   = null;
    let email = null;

    // 1. Firebase Auth user tekshirish
    if (auth && auth.currentUser) {
        uid   = auth.currentUser.uid;
        email = auth.currentUser.email;
        console.log('🔥 [PassNotif] Firebase Auth user:', uid);
    }

    // 2. Local auth user tekshirish (MRDEV Login yoki Email login)
    if (!uid) {
        try {
            const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');
            if (local && local.isLoggedIn && local.uid) {
                uid   = local.uid;
                email = local.email;
                console.log('📦 [PassNotif] Local auth user:', uid);
            }
        } catch (e) {
            console.warn('[PassNotif] Local auth parse xatolik:', e.message);
        }
    }

    if (!uid) {
        console.warn('[PassNotif] Hech qanday auth yo\'q');
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

        console.log('🔍 [PassNotif] Xabarlar qidirilmoqda... uid:', uid, 'email:', email);

        const notifRef = ref(rtdb, 'pass_notifications');
        const snapshot = await get(notifRef);

        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">📭 Xabarlar yo\'q</div>';
            return;
        }

        const items = [];
        snapshot.forEach((child) => {
            const data = child.val();
            if (!data) return;

            // uid, firestoreUid, email — barchasini tekshirish
            const matchesUid   = (uid   && (data.uid === uid || data.firestoreUid === uid));
            const matchesEmail = (email && data.email === email);

            if (matchesUid || matchesEmail) {
                items.push({
                    id:        child.key,
                    ...data,
                    createdAt: data.createdAt || Date.now()
                });
            }
        });

        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        console.log('📋 [PassNotif]', items.length, 'ta xabar topildi');

        if (!items.length) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">📭 Xabarlar yo\'q</div>';
            return;
        }

        container.innerHTML = items.map(data => {
            const date      = new Date(data.createdAt || Date.now());
            const isExpired = Date.now() > (data.expiresAt || 0);
            const isUsed    = data.used === true;

            let status     = 'active';
            let statusText = '✅ Faol';

            if (isUsed) {
                status     = 'used';
                statusText = '✓ Ishlatilgan';
            } else if (isExpired) {
                status     = 'expired';
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
        console.error('❌ [PassNotif] Load xatolik:', error.message);
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:var(--red);">
                ⚠️ Xatolik: ${error.message}
                <button onclick="location.reload()"
                    style="display:block;margin:12px auto;padding:8px 16px;cursor:pointer;">
                    Qayta yuklash
                </button>
            </div>
        `;
    }
}
