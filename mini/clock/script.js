// ==================== MRDEV CLOCK v2.0 — Firebase + Local Sync ====================
import { initAuth, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { getFirebase } from '../../assets/js/firebase-helper.js';

var _db = null;
function getDB() {
    if (!_db) { var fb = getFirebase(); _db = fb.db; }
    return _db;
}

import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== DOM ====================
var $ = function(id) { return document.getElementById(id); };
var timeText = $('timeText');
var dateText = $('dateText');
var statusIndicator = $('statusIndicator');
var statusLabel = $('statusLabel');
var timezoneLabel = $('timezoneLabel');
var sourceLabel = $('sourceLabel');
var timezoneSelect = $('timezoneSelect');
var alarmsList = $('alarmsList');
var alarmModal = $('alarmModal');
var alarmModalTitle = $('alarmModalTitle');
var alarmTime = $('alarmTime');
var alarmLabel = $('alarmLabel');
var alarmEnabled = $('alarmEnabled');
var toast = $('toast');

// ==================== STATE ====================
var currentUser = null;
var currentFormat = localStorage.getItem('clock_format') || '24h';
var currentTimezone = localStorage.getItem('clock_timezone') || 'local';
var alarms = [];
var internetOffset = 0;
var isOnline = true;
var editAlarmId = null;
var canvas, ctx, animId;

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
    drawClock();
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

// ==================== TIME SYNC ====================
async function syncTime() {
    var start = Date.now();
    try {
        var ctrl = new AbortController();
        setTimeout(function() { ctrl.abort(); }, 5000);
        var res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { signal: ctrl.signal, cache: 'no-store' });
        if (res.ok) {
            var data = await res.json();
            var serverTime = new Date(data.utc_datetime).getTime();
            var delay = (Date.now() - start) / 2;
            internetOffset = (serverTime + delay) - Date.now();
            isOnline = true;
        }
    } catch(e) { isOnline = false; }

    statusIndicator.className = 'status-indicator' + (isOnline ? '' : ' offline');
    statusLabel.textContent = isOnline ? 'Online' : 'Offline';
    sourceLabel.textContent = isOnline ? 'Internet vaqti' : 'Qurilma vaqti';
}

function getNow() {
    var now = isOnline && internetOffset ? new Date(Date.now() + internetOffset) : new Date();
    if (currentTimezone !== 'local') {
        try {
            var tzStr = now.toLocaleString('en-US', { timeZone: currentTimezone });
            now = new Date(tzStr);
        } catch(e) {}
    }
    return now;
}

function updateDisplay() {
    var now = getNow();
    var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();

    if (currentFormat === '12h') {
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        timeText.textContent = h12 + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' ' + ampm;
    } else {
        timeText.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    var days = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    var months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    dateText.textContent = days[now.getDay()] + ', ' + now.getDate() + '-' + months[now.getMonth()] + ' ' + now.getFullYear();

    var tz = currentTimezone === 'local' ? 'Mahalliy' : currentTimezone.split('/').pop().replace('_', ' ');
    timezoneLabel.textContent = tz;

    checkAlarms(now);
}

function initCanvas() {
    canvas = $('analogCanvas');
    var size = canvas.parentElement.clientWidth;
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx = canvas.getContext('2d');
}

function drawClock() {
    if (!ctx || !canvas) return;
    var size = canvas.width, cx = size / 2, cy = size / 2, r = cx - 12;
    var now = getNow();

    ctx.clearRect(0, 0, size, size);

    var style = getComputedStyle(document.documentElement);
    var textCol = style.getPropertyValue('--text').trim() || '#202124';
    var surfaceCol = style.getPropertyValue('--surface').trim() || '#ffffff';
    var borderCol = style.getPropertyValue('--border').trim() || '#dadce0';
    var accentCol = style.getPropertyValue('--accent').trim() || '#1a73e8';

    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = surfaceCol;
    ctx.fill();
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold ' + (size * 0.05) + 'px "Segoe UI", sans-serif';
    ctx.fillStyle = textCol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 1; i <= 12; i++) {
        var a = (i * 30 - 90) * Math.PI / 180;
        ctx.fillText(i, cx + (r - 26) * Math.cos(a), cy + (r - 26) * Math.sin(a));
    }

    for (var j = 0; j < 60; j++) {
        if (j % 5 === 0) continue;
        var ja = (j * 6 - 90) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(cx + (r - 10) * Math.cos(ja), cy + (r - 10) * Math.sin(ja));
        ctx.lineTo(cx + (r - 4) * Math.cos(ja), cy + (r - 4) * Math.sin(ja));
        ctx.strokeStyle = style.getPropertyValue('--text-3').trim();
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    var h = now.getHours() % 12, m = now.getMinutes(), s = now.getSeconds();
    var ha = (h * 30 + m * 0.5 - 90) * Math.PI / 180;
    var ma = (m * 6 + s * 0.1 - 90) * Math.PI / 180;
    var sa = (s * 6 - 90) * Math.PI / 180;

    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fillStyle = accentCol; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.42 * Math.cos(ha), cy + r * 0.42 * Math.sin(ha));
    ctx.strokeStyle = textCol; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.62 * Math.cos(ma), cy + r * 0.62 * Math.sin(ma));
    ctx.strokeStyle = textCol; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.15 * Math.cos(sa), cy - r * 0.15 * Math.sin(sa));
    ctx.lineTo(cx + r * 0.72 * Math.cos(sa), cy + r * 0.72 * Math.sin(sa));
    ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();
}

// ==================== FORMAT ====================
document.querySelectorAll('.format-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.format-option').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFormat = btn.dataset.format;
        localStorage.setItem('clock_format', currentFormat);
        updateDisplay();
    });
});

// ==================== TIMEZONE ====================
timezoneSelect.value = currentTimezone;
timezoneSelect.addEventListener('change', function() {
    currentTimezone = timezoneSelect.value;
    localStorage.setItem('clock_timezone', currentTimezone);
    updateDisplay();
    drawClock();
});

// ==================== SYNC ====================
$('syncBtn').addEventListener('click', async function() {
    await syncTime();
    showToast(isOnline ? 'Vaqt sinxronlandi' : 'Internet yo\'q');
});

// ==================== ALARMS ====================
function loadAlarms() {
    var uid = getUserId();
    var db = getDB();
    if (!uid || !db) return;
    var q = query(collection(db, 'users', uid, 'alarms'), orderBy('time'));
    return onSnapshot(q, function(snap) {
        alarms = snap.docs.map(function(d) { return { id: d.id, time: d.data().time, label: d.data().label, enabled: d.data().enabled, isCloud: true }; });
        renderAlarms();
    });
}

function renderAlarms() {
    if (!alarms.length) {
        alarmsList.innerHTML = '<div class="empty-alarms"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/></svg><p>Alarmlar mavjud emas</p></div>';
        return;
    }
    alarmsList.innerHTML = alarms.map(function(a) {
        return '<div class="alarm-card">' +
            '<div class="alarm-info"><div class="alarm-time">' + a.time + '</div>' +
            (a.label ? '<div class="alarm-label">' + escapeHtml(a.label) + '</div>' : '') + '</div>' +
            '<button class="alarm-toggle' + (a.enabled !== false ? ' active' : '') + '" data-id="' + a.id + '"></button>' +
            '<button class="alarm-delete" data-id="' + a.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>';
    }).join('');

    document.querySelectorAll('.alarm-toggle').forEach(function(b) {
        b.addEventListener('click', function() { toggleAlarm(b.dataset.id); });
    });
    document.querySelectorAll('.alarm-delete').forEach(function(b) {
        b.addEventListener('click', function() { deleteAlarmHandler(b.dataset.id); });
    });
}

async function toggleAlarm(id) {
    var alarm = alarms.find(function(a) { return a.id === id; });
    if (!alarm) return;
    var newState = alarm.enabled === false;
    if (alarm.isCloud && getUserId()) {
        await updateDoc(doc(getDB(), 'users', getUserId(), 'alarms', id), { enabled: newState });
    } else {
        var local = JSON.parse(localStorage.getItem('clock_alarms') || '[]');
        var idx = local.findIndex(function(a) { return a.id === id; });
        if (idx > -1) { local[idx].enabled = newState; localStorage.setItem('clock_alarms', JSON.stringify(local)); }
        alarms = alarms.map(function(a) { return a.id === id ? { time: a.time, label: a.label, enabled: newState, id: a.id, isCloud: a.isCloud } : a; });
        renderAlarms();
    }
}

async function deleteAlarmHandler(id) {
    var alarm = alarms.find(function(a) { return a.id === id; });
    if (!alarm) return;
    if (alarm.isCloud && getUserId()) {
        await deleteDoc(doc(getDB(), 'users', getUserId(), 'alarms', id));
    } else {
        var local = JSON.parse(localStorage.getItem('clock_alarms') || '[]').filter(function(a) { return a.id !== id; });
        localStorage.setItem('clock_alarms', JSON.stringify(local));
        alarms = alarms.filter(function(a) { return a.id !== id; });
        renderAlarms();
    }
    showToast('Alarm o\'chirildi');
}

// ==================== ALARM MODAL ====================
$('addAlarmBtn').addEventListener('click', function() {
    editAlarmId = null;
    alarmModalTitle.textContent = 'Yangi alarm';
    alarmTime.value = '07:00';
    alarmLabel.value = '';
    alarmEnabled.checked = true;
    alarmModal.classList.add('show');
});

$('closeAlarmModal').addEventListener('click', function() { alarmModal.classList.remove('show'); });
$('cancelAlarm').addEventListener('click', function() { alarmModal.classList.remove('show'); });

$('saveAlarm').addEventListener('click', async function() {
    var time = alarmTime.value, label = alarmLabel.value.trim(), enabled = alarmEnabled.checked;
    if (!time) return;
    var data = { time: time, label: label, enabled: enabled };
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        if (editAlarmId) await updateDoc(doc(db, 'users', uid, 'alarms', editAlarmId), data);
        else await addDoc(collection(db, 'users', uid, 'alarms'), { time: time, label: label, enabled: enabled, createdAt: serverTimestamp() });
    } else {
        var local = JSON.parse(localStorage.getItem('clock_alarms') || '[]');
        if (editAlarmId) {
            var idx = local.findIndex(function(a) { return a.id === editAlarmId; });
            if (idx > -1) local[idx] = { id: local[idx].id, time: time, label: label, enabled: enabled };
        } else {
            local.push({ id: 'local_' + Date.now(), time: time, label: label, enabled: enabled });
        }
        localStorage.setItem('clock_alarms', JSON.stringify(local));
        alarms = local;
        renderAlarms();
    }
    alarmModal.classList.remove('show');
    showToast('Alarm saqlandi');
});

// ==================== CHECK ALARMS ====================
var lastAlarmCheck = '';
function checkAlarms(now) {
    var current = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    if (current === lastAlarmCheck) return;
    lastAlarmCheck = current;
    alarms.forEach(function(a) {
        if (a.time === current && a.enabled !== false) {
            showToast('Alarm: ' + (a.label || a.time), 'success');
        }
    });
}

// ==================== ESCAPE HTML ====================
function escapeHtml(t) {
    var d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var triggerName = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var triggerAvatar = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    if (user) {
        var dn = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        if (triggerName) triggerName.textContent = dn;
        if (triggerAvatar) {
            if (user.photoURL) {
                triggerAvatar.innerHTML = '<img src="' + user.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            } else {
                triggerAvatar.textContent = dn.charAt(0).toUpperCase();
            }
        }
    } else {
        if (triggerName) triggerName.textContent = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
    }
}

// ==================== RESIZE ====================
var resizeTimer;
window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() { initCanvas(); drawClock(); }, 150);
});

// ==================== TICK ====================
function tick() {
    updateDisplay();
    drawClock();
    animId = requestAnimationFrame(tick);
}

// ==================== INIT ====================
async function init() {
    console.log('MRDEV Clock v2.0 ishga tushmoqda...');
    initTheme();
    initCanvas();

    var formatBtn = document.querySelector('.format-option[data-format="' + currentFormat + '"]');
    if (formatBtn) formatBtn.classList.add('active');
    timezoneSelect.value = currentTimezone;

    await syncTime();
    tick();
    setInterval(syncTime, 300000);

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) {
            loadAlarms();
        } else {
            alarms = JSON.parse(localStorage.getItem('clock_alarms') || '[]');
            renderAlarms();
        }
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('Clock tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', function() { if (animId) cancelAnimationFrame(animId); });
