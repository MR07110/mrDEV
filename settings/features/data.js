import { auth, db } from '../firebase-init.js';
import { collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from '../../assets/js/core/toast.js';

export function initDataTab() {
    updateStorage();
    checkSync();
    document.getElementById('syncNowBtn')?.addEventListener('click', syncNow);
    document.getElementById('clearLocalDataBtn')?.addEventListener('click', clearLocal);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
}

function updateStorage() {
    let bytes = 0;
    const items = [];
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('mr_') || k.startsWith('mrdev_')) {
            const s = new Blob([localStorage.getItem(k) || '']).size;
            bytes += s;
            items.push({ key: k, size: s });
        }
    });
    const kb = (bytes / 1024).toFixed(1);
    const mb = (bytes / 1024 / 1024).toFixed(2);
    const pct = Math.min((bytes / (5 * 1024 * 1024)) * 100, 100).toFixed(1);

    document.getElementById('storageUsed').textContent = kb < 1024 ? kb + ' KB' : mb + ' MB';
    document.getElementById('storagePercent').textContent = pct + '%';
    const bar = document.getElementById('storageBar');
    if (bar) {
        bar.style.width = pct + '%';
        bar.style.background = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--orange)' : 'var(--accent)';
    }

    const top = items.sort((a, b) => b.size - a.size).slice(0, 5);
    const det = document.getElementById('storageDetails');
    if (det) det.innerHTML = top.map(i => `<div><span>${i.key.replace(/^mr_|mrdev_/,'')}</span><span>${(i.size/1024).toFixed(1)} KB</span></div>`).join('');
}

async function checkSync() {
    updateSyncUI('checking', null);
    try {
        if (!auth.currentUser) { updateSyncUI('disconnected', null); return; }
        await getDocs(query(collection(db, 'users', auth.currentUser.uid, 'todos'), limit(1)));
        updateSyncUI('connected', localStorage.getItem('mrdev_last_sync'));
    } catch {
        updateSyncUI('disconnected', localStorage.getItem('mrdev_last_sync'));
    }
}

function updateSyncUI(status, lastSync) {
    const dot = document.getElementById('syncDot');
    const txt = document.getElementById('syncStatusText');
    const time = document.getElementById('syncTime');
    const btn = document.getElementById('syncNowBtn');

    if (dot) dot.className = 'sync-dot ' + (status === 'connected' ? 'connected' : status === 'disconnected' ? 'disconnected' : 'syncing');
    if (txt) txt.textContent = status === 'connected' ? 'Ulangan' : status === 'disconnected' ? 'Ulanmagan' : status === 'checking' ? 'Tekshirilmoqda...' : 'Sinxronlanmoqda...';
    if (time && lastSync && status === 'connected') {
        const s = Math.floor((Date.now() - +lastSync) / 1000);
        time.textContent = s < 60 ? 'Hozirgina' : s < 3600 ? Math.floor(s/60) + ' daqiqa' : s < 86400 ? Math.floor(s/3600) + ' soat' : Math.floor(s/86400) + ' kun';
    } else if (time) time.textContent = '-';
    if (btn) btn.disabled = status === 'syncing';
}

async function syncNow() {
    const user = auth.currentUser;
    if (!user) { showToast('Hisobga kiring', 'error'); return; }
    updateSyncUI('syncing', null);
    try {
        const cols = ['alarms','calculations','timers','stopwatch','board','bingo','qrcodes','notes','exams','todos','bingo_stats'];
        for (const c of cols) {
            try {
                const snap = await getDocs(query(collection(db, 'users', user.uid, c), orderBy('createdAt', 'desc'), limit(100)));
                if (!snap.empty) {
                    localStorage.setItem('mr_' + c + '_data', JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 50)));
                }
            } catch {}
        }
        const now = Date.now().toString();
        localStorage.setItem('mrdev_last_sync', now);
        updateSyncUI('connected', now);
        updateStorage();
        showToast('Sinxronizatsiya yakunlandi', 'success');
    } catch (e) {
        updateSyncUI('disconnected', localStorage.getItem('mrdev_last_sync'));
        showToast(e.message, 'error');
    }
}

function clearLocal() {
    const prefixes = ['mr_','mrdev_','bingo_','splitview_','clock_','timer_','stopwatch_','board_','notes_','todo_','weather_','music_','qr_','exam_','alarm_'];
    let n = 0;
    Object.keys(localStorage).forEach(k => {
        if (prefixes.some(p => k.toLowerCase().startsWith(p))) { localStorage.removeItem(k); n++; }
    });
    localStorage.removeItem('mrdev_last_sync');
    updateStorage();
    updateSyncUI('disconnected', null);
    showToast(n + ' ta ma\'lumot tozalandi', 'success');
}

function exportData() {
    const data = { app: 'MRDEV', v: '7.3', date: new Date().toISOString(), user: { uid: auth.currentUser?.uid, email: auth.currentUser?.email }, data: {} };
    Object.keys(localStorage).forEach(k => { if (k.startsWith('mr_')||k.startsWith('mrdev_')) { try { data.data[k] = JSON.parse(localStorage.getItem(k)); } catch { data.data[k] = localStorage.getItem(k); } } });
    const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mrdev-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('Eksport tayyor', 'success');
}

window.initDataTab = initDataTab;
