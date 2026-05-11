// ==================== MRDEV QR CODE v2.1 — Firebase + Local Sync ====================
import { initAuth, smartSave, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { getFirebase } from '../../assets/js/firebase-helper.js';

var _db = null;
function getDB() {
    if (!_db) { var fb = getFirebase(); _db = fb.db; }
    return _db;
}

import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, writeBatch, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== DOM ====================
var $ = function(id) { return document.getElementById(id); };
var toast = $('toast');
var qrCanvas = $('qrCanvas');
var qrText = $('qrText');
var scanResult = $('scanResult');
var scannedText = $('scannedText');
var imageResult = $('imageResult');
var imageScannedText = $('imageScannedText');
var historyList = $('historyList');
var historyCount = $('historyCount');
var historyCloud = $('historyCloud');
var wifiQrCanvas = $('wifiQrCanvas');

// ==================== STATE ====================
var currentUser = null;
var currentStream = null;
var scanning = false;
var lastScannedCode = null;
var lastScanTime = 0;
var scanHistory = [];
var currentScannedText = null;
var currentImageScannedText = null;

// ==================== THEME ====================
function initTheme() {
    var saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcon();
    $('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    var isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    var btn = $('themeToggle');
    if (!btn) return;
    var isDark = document.documentElement.classList.contains('dark');
    btn.innerHTML = isDark
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

// ==================== TOAST ====================
function showToast(msg, type) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ==================== TABS ====================
document.querySelectorAll('.qr-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.qr-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(function(c) { c.style.display = 'none'; });
        var tabId = tab.dataset.tab;
        $(tabId + 'Tab').style.display = 'block';
        if (tabId === 'generate') generateQR();
        if (tabId === 'wifi') generateWifiQR();
        if (tabId === 'scan') startCamera('environment');
        if (tabId !== 'scan') stopCamera();
    });
});

// ==================== QR GENERATE ====================
function generateQR() {
    var text = qrText.value.trim();
    if (!text) {
        qrCanvas.style.display = 'none';
        return;
    }
    try {
        qrCanvas.style.display = 'block';
        QRCode.toCanvas(qrCanvas, text, {
            width: 250,
            margin: 2,
            color: { dark: '#000000', light: '#FFFFFF' }
        });
    } catch(e) {
        console.error('QR Error:', e);
        showToast('QR yaratishda xatolik', 'error');
    }
}

$('generateBtn').addEventListener('click', generateQR);
qrText.addEventListener('input', generateQR);

// Download
$('downloadBtn').addEventListener('click', function() {
    if (!qrCanvas.style.display || qrCanvas.style.display === 'none') {
        showToast('Avval QR kod yarating', 'error'); return;
    }
    var link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = qrCanvas.toDataURL();
    link.click();
    showToast('Yuklab olindi', 'success');
});

// Share
$('shareBtn').addEventListener('click', async function() {
    if (!qrCanvas.style.display || qrCanvas.style.display === 'none') {
        showToast('Avval QR kod yarating', 'error'); return;
    }
    var blob = await new Promise(function(resolve) { qrCanvas.toBlob(resolve); });
    var file = new File([blob], 'qrcode.png', { type: 'image/png' });
    if (navigator.share) {
        await navigator.share({ files: [file], title: 'QR Kod' });
    } else {
        showToast('Bu qurilma ulashishni qo\'llab quvvatlamaydi');
    }
});

// Fullscreen
$('fullscreenBtn').addEventListener('click', function() {
    if (!qrCanvas.style.display || qrCanvas.style.display === 'none') {
        showToast('Avval QR kod yarating', 'error'); return;
    }
    var fc = $('fullscreenCanvas');
    fc.width = 350; fc.height = 350;
    fc.getContext('2d').drawImage(qrCanvas, 0, 0, 350, 350);
    $('qrModal').classList.add('show');
});

$('closeModalBtn').addEventListener('click', function() { $('qrModal').classList.remove('show'); });
$('qrModal').addEventListener('click', function(e) { if (e.target.id === 'qrModal') $('qrModal').classList.remove('show'); });

// Templates
document.querySelectorAll('.template-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        qrText.value = btn.dataset.template;
        generateQR();
        document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
    });
});

// ==================== CAMERA SCAN ====================
async function startCamera(facingMode) {
    stopCamera();
    scanning = true;
    lastScannedCode = null;
    scanResult.style.display = 'none';
    try {
        var stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
        var video = $('qrVideo');
        video.srcObject = stream;
        currentStream = stream;
        await video.play();
        requestAnimationFrame(scanLoop);
        showToast('Kamera ishga tushdi');
    } catch(e) {
        showToast('Kamera ruxsati kerak!', 'error');
        scanning = false;
    }
}

function stopCamera() {
    scanning = false;
    if (currentStream) {
        currentStream.getTracks().forEach(function(t) { t.stop(); });
        currentStream = null;
    }
    var video = $('qrVideo');
    if (video) video.srcObject = null;
}

$('cameraBackBtn').addEventListener('click', function() { startCamera('environment'); });
$('cameraFrontBtn').addEventListener('click', function() { startCamera('user'); });
$('stopCameraBtn').addEventListener('click', stopCamera);

function scanLoop() {
    if (!scanning) return;
    var video = $('qrVideo');
    if (!video || !video.videoWidth || video.videoWidth === 0) {
        requestAnimationFrame(scanLoop); return;
    }
    try {
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
        var now = Date.now();
        if (code && code.data) {
            if (code.data !== lastScannedCode || (now - lastScanTime) > 2000) {
                lastScannedCode = code.data; lastScanTime = now;
                currentScannedText = code.data;
                scannedText.innerHTML = '<strong>Natija:</strong><br>' + escapeHtml(code.data);
                scanResult.style.display = 'block';
            }
        }
    } catch(e) {}
    requestAnimationFrame(scanLoop);
}

// ==================== IMAGE SCAN ====================
$('uploadArea').addEventListener('click', function() { $('imageUpload').click(); });
$('imageUpload').addEventListener('change', function(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(event) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = img.width; canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            var imageData = ctx.getImageData(0, 0, img.width, img.height);
            var code = jsQR(imageData.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
                currentImageScannedText = code.data;
                imageScannedText.innerHTML = '<strong>Natija:</strong><br>' + escapeHtml(code.data);
                imageResult.style.display = 'block';
                showToast('QR kod topildi!', 'success');
            } else { showToast('QR kod topilmadi', 'error'); imageResult.style.display = 'none'; }
        };
        img.onerror = function() { showToast('Rasm yuklanmadi', 'error'); };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
});

// ==================== COPY / OPEN / SAVE ====================
$('copyScanBtn').addEventListener('click', function() { if (currentScannedText) { navigator.clipboard.writeText(currentScannedText); showToast('Nusxalandi', 'success'); } });
$('openScanBtn').addEventListener('click', function() { if (currentScannedText) openUrl(currentScannedText); });
$('saveScanBtn').addEventListener('click', function() { if (currentScannedText) saveToHistory(currentScannedText); });
$('copyImageBtn').addEventListener('click', function() { if (currentImageScannedText) { navigator.clipboard.writeText(currentImageScannedText); showToast('Nusxalandi', 'success'); } });
$('openImageBtn').addEventListener('click', function() { if (currentImageScannedText) openUrl(currentImageScannedText); });
$('saveImageBtn').addEventListener('click', function() { if (currentImageScannedText) saveToHistory(currentImageScannedText); });

function openUrl(text) {
    if (!text) return;
    if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('mailto:') || text.startsWith('tel:')) {
        window.open(text, '_blank');
    } else { showToast('Bu web manzil emas'); }
}

// ==================== HISTORY ====================
function loadLocalHistory() { scanHistory = JSON.parse(localStorage.getItem('qr_history') || '[]'); renderHistory(); }
function loadCloudHistory() {
    if (!currentUser) return;
    var q = query(collection(getDB(), 'users', currentUser.uid, 'qrcodes'), orderBy('createdAt', 'desc'));
    onSnapshot(q, function(snap) {
        var cloud = snap.docs.map(function(d) { return { id: d.id, text: d.data().text, createdAt: d.data().createdAt, isCloud: true, isLocal: false }; });
        var local = JSON.parse(localStorage.getItem('qr_history') || '[]').map(function(i) { return { ...i, isLocal: true, isCloud: false }; });
        scanHistory = cloud.concat(local).sort(function(a, b) { return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date); });
        renderHistory();
    });
}

async function saveToHistory(text) {
    if (!text || scanHistory.some(function(i) { return i.text === text; })) { showToast('Allaqachon mavjud'); return; }
    if (currentUser) {
        await addDoc(collection(getDB(), 'users', currentUser.uid, 'qrcodes'), { text: text, createdAt: serverTimestamp() });
        showToast('Cloud ga saqlandi', 'success');
    } else {
        var local = JSON.parse(localStorage.getItem('qr_history') || '[]');
        local.unshift({ text: text, date: new Date().toISOString(), id: 'local_' + Date.now(), isLocal: true });
        localStorage.setItem('qr_history', JSON.stringify(local.slice(0, 50)));
        loadLocalHistory();
        showToast('Local saqlandi', 'success');
    }
}

async function deleteHistoryItem(id, isCloud) {
    if (!isCloud) {
        var local = JSON.parse(localStorage.getItem('qr_history') || '[]').filter(function(i) { return i.id !== id; });
        localStorage.setItem('qr_history', JSON.stringify(local));
    } else if (currentUser) {
        await deleteDoc(doc(getDB(), 'users', currentUser.uid, 'qrcodes', id));
    }
    showToast('O\'chirildi');
}

$('clearHistoryBtn').addEventListener('click', async function() {
    if (!confirm('Barcha tarixni tozalashni xohlaysizmi?')) return;
    if (currentUser) {
        var snap = await getDocs(collection(getDB(), 'users', currentUser.uid, 'qrcodes'));
        var batch = writeBatch(getDB());
        snap.docs.forEach(function(d) { batch.delete(d.ref); });
        await batch.commit();
    }
    localStorage.removeItem('qr_history');
    scanHistory = [];
    renderHistory();
    showToast('Tozalandi');
});

function renderHistory() {
    if (!historyCount || !historyCloud || !historyList) return;
    historyCount.textContent = scanHistory.length + ' ta';
    historyCloud.textContent = currentUser ? 'Cloud' : 'Local';
    if (!scanHistory.length) { historyList.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">Tarix bo\'sh</div>'; return; }
    historyList.innerHTML = scanHistory.slice(0, 50).map(function(item) {
        var isCloud = item.isCloud && !item.isLocal;
        return '<div class="history-item" data-text="' + escapeHtml(item.text) + '" data-id="' + item.id + '" data-cloud="' + isCloud + '">' +
            '<div class="history-item-content"><div class="history-item-text">' + escapeHtml((item.text || '').substring(0, 50)) + '</div><div class="history-item-date">' + new Date(item.createdAt || item.date).toLocaleString() + '</div></div>' +
            '<div class="history-item-actions"><button class="history-btn copy-item"><svg width="14" height="14" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><button class="history-btn delete-item"><svg width="14" height="14" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div>';
    }).join('');
    document.querySelectorAll('.history-item').forEach(function(card) {
        card.addEventListener('click', function(e) { if (!e.target.closest('button')) { qrText.value = card.dataset.text; document.querySelector('.qr-tab[data-tab="generate"]').click(); generateQR(); } });
    });
    document.querySelectorAll('.copy-item').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); navigator.clipboard.writeText(btn.closest('.history-item').dataset.text); showToast('Nusxalandi', 'success'); }); });
    document.querySelectorAll('.delete-item').forEach(function(btn) { btn.addEventListener('click', function(e) { e.stopPropagation(); var card = btn.closest('.history-item'); deleteHistoryItem(card.dataset.id, card.dataset.cloud === 'true'); }); });
}

// ==================== WIFI QR ====================
function generateWifiQR() {
    var ssid = $('wifiSSID').value.trim(), password = $('wifiPassword').value, encryption = $('wifiEncryption').value;
    if (!ssid) { wifiQrCanvas.style.display = 'none'; return; }
    QRCode.toCanvas(wifiQrCanvas, 'WIFI:S:' + ssid + ';T:' + encryption + ';P:' + password + ';;', { width: 250, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
    wifiQrCanvas.style.display = 'block';
}

$('generateWifiBtn').addEventListener('click', function() { if (!$('wifiSSID').value.trim()) { showToast('WiFi nomini kiriting', 'error'); return; } generateWifiQR(); showToast('WiFi QR yaratildi', 'success'); });
$('downloadWifiBtn').addEventListener('click', function() { if (!wifiQrCanvas.style.display || wifiQrCanvas.style.display === 'none') { showToast('Avval WiFi QR yarating', 'error'); return; } var a = document.createElement('a'); a.download = 'wifi-qrcode.png'; a.href = wifiQrCanvas.toDataURL(); a.click(); showToast('Yuklab olindi', 'success'); });
$('wifiSSID').addEventListener('input', generateWifiQR);
$('wifiPassword').addEventListener('input', generateWifiQR);
$('wifiEncryption').addEventListener('change', generateWifiQR);

// ==================== UTILS ====================
function escapeHtml(text) { var d = document.createElement('div'); d.textContent = text || ''; return d.innerHTML; }

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var tn = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var ta = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    if (user) { var dn = user.displayName || (user.email ? user.email.split('@')[0] : 'User'); if (tn) tn.textContent = dn; if (ta) { if (user.photoURL) ta.innerHTML = '<img src="' + user.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'; else ta.textContent = dn.charAt(0).toUpperCase(); } }
    else { if (tn) tn.textContent = 'Mehmon'; if (ta) ta.textContent = '?'; }
}

// ==================== INIT ====================
function init() {
    console.log('MRDEV QR Code v2.1 ishga tushmoqda...');
    initTheme();
    generateQR();

    initAuth(function(user) {
        currentUser = user; updateUserUI(user);
        if (user) loadCloudHistory(); else loadLocalHistory();
        try { initMiniDropdown(user); } catch(e) { console.warn('Dropdown error:', e); }
    });
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', function() { stopCamera(); });
