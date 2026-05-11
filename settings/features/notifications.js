import { auth, rtdb } from '../firebase-init.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

export function initNotificationsTab() {
    loadNotifications();
    document.getElementById('notificationsRetryBtn')?.addEventListener('click', loadNotifications);
}

async function loadNotifications() {
    const loading = document.getElementById('notificationsLoading');
    const empty = document.getElementById('notificationsEmpty');
    const noAuth = document.getElementById('notificationsNoAuth');
    const error = document.getElementById('notificationsError');
    const list = document.getElementById('notificationsList');

    hideAll(loading, empty, noAuth, error, list);
    show(loading);

    const user = auth.currentUser;
    if (!user) { hideAll(loading); show(noAuth); return; }

    try {
        const snapshot = await get(ref(rtdb, 'pass_notifications'));
        const items = [];
        snapshot.forEach(c => {
            const d = c.val();
            if (d.uid === user.uid) items.push({ id: c.key, ...d });
        });
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        hideAll(loading);
        if (!items.length) { show(empty); return; }

        list.innerHTML = items.map(item => {
            const d = new Date(item.createdAt || Date.now());
            const expired = Date.now() > (item.expiresAt || 0);
            const used = item.used;
            let cls = 'active', txt = 'Faol';
            if (used) { cls = 'used'; txt = 'Ishlatilgan'; }
            else if (expired) { cls = 'expired'; txt = 'Muddati tugagan'; }
            return `<div class="pass-notif-item">
                <div class="pass-notif-code">${item.passCode || '------'}</div>
                <div class="pass-notif-date">${d.toLocaleString('uz-UZ')}${item.mrdevId ? ' &bull; ' + item.mrdevId : ''}</div>
                <span class="pass-notif-status ${cls}">${txt}</span>
            </div>`;
        }).join('');
        show(list);

    } catch (e) {
        console.error(e);
        hideAll(loading);
        show(error);
    }
}

function hideAll(...els) { els.forEach(e => e && (e.style.display = 'none')); }
function show(el) { if (el) el.style.display = ''; }
window.initNotificationsTab = initNotificationsTab;
