// ==================== MRDEV STOPWATCH v2.0 — Firebase + Local Sync ====================
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
var mainTime = $('mainTime');
var subTime = $('subTime');
var startBtn = $('startBtn');
var resetBtn = $('resetBtn');
var lapBtn = $('lapBtn');
var lapsList = $('lapsList');
var historyList = $('historyList');
var statsRow = $('statsRow');
var bestLap = $('bestLap');
var worstLap = $('worstLap');
var avgLap = $('avgLap');
var toast = $('toast');

// ==================== STATE ====================
var currentUser = null;
var startTime = 0;
var elapsedTime = 0;
var timerInterval = null;
var isRunning = false;
var laps = [];
var history = [];

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

// ==================== TIME ====================
function formatMain(ms) {
    var totalSecs = Math.floor(ms / 1000);
    var mins = Math.floor(totalSecs / 60);
    var secs = totalSecs % 60;
    var millis = Math.floor((ms % 1000) / 10);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + String(millis).padStart(2, '0');
}

function formatFull(ms) {
    var totalSecs = Math.floor(ms / 1000);
    var hrs = Math.floor(totalSecs / 3600);
    var mins = Math.floor((totalSecs % 3600) / 60);
    var secs = totalSecs % 60;
    var millis = Math.floor((ms % 1000) / 10);
    return String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0') + '.' + String(millis).padStart(2, '0');
}

function formatLapTime(ms) {
    var totalSecs = Math.floor(ms / 1000);
    var mins = Math.floor(totalSecs / 60);
    var secs = totalSecs % 60;
    var millis = Math.floor((ms % 1000) / 10);
    if (mins > 0) return mins + ':' + String(secs).padStart(2, '0') + '.' + String(millis).padStart(2, '0');
    return secs + '.' + String(millis).padStart(2, '0');
}

function updateDisplay() {
    mainTime.textContent = formatMain(elapsedTime);
    subTime.textContent = formatFull(elapsedTime);
}

// ==================== CONTROLS ====================
startBtn.addEventListener('click', function() {
    if (isRunning) pause(); else start();
});

lapBtn.addEventListener('click', recordLap);
resetBtn.addEventListener('click', reset);

function start() {
    if (isRunning) return;
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(function() {
        elapsedTime = Date.now() - startTime;
        updateDisplay();
    }, 10);
    isRunning = true;
    updateUI();
    saveState();
}

function pause() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateUI();
    saveState();
}

function reset() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;

    if (elapsedTime > 100 || laps.length > 0) saveSession();

    elapsedTime = 0;
    laps = [];
    updateDisplay();
    updateUI();
    renderLaps();
    updateStats();
    clearState();
}

function updateUI() {
    if (isRunning) {
        startBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pauza';
        startBtn.classList.remove('primary');
        startBtn.classList.add('running');
        lapBtn.disabled = false;
    } else {
        startBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg> Boshlash';
        startBtn.classList.remove('running');
        startBtn.classList.add('primary');
        lapBtn.disabled = true;
    }
}

// ==================== LAPS ====================
function recordLap() {
    if (!isRunning) return;
    var lapTime = elapsedTime;
    if (laps.length > 0) lapTime = elapsedTime - laps[laps.length - 1].absoluteTime;
    laps.push({ number: laps.length + 1, time: lapTime, absoluteTime: elapsedTime });
    renderLaps();
    updateStats();
}

function renderLaps() {
    if (!laps.length) { lapsList.innerHTML = '<div class="empty-laps">Lap mavjud emas</div>'; return; }
    var best = Math.min.apply(null, laps.map(function(l) { return l.time; }));
    var worst = Math.max.apply(null, laps.map(function(l) { return l.time; }));
    lapsList.innerHTML = laps.slice().reverse().map(function(lap) {
        var cls = '';
        if (lap.time === best && laps.length > 1) cls = 'best';
        if (lap.time === worst && laps.length > 1) cls = 'worst';
        return '<div class="lap-item"><span class="lap-number">Lap ' + lap.number + '</span><span class="lap-time ' + cls + '">' + formatLapTime(lap.time) + '</span></div>';
    }).join('');
}

function updateStats() {
    if (laps.length < 2) { statsRow.style.display = 'none'; return; }
    statsRow.style.display = 'flex';
    var best = Math.min.apply(null, laps.map(function(l) { return l.time; }));
    var worst = Math.max.apply(null, laps.map(function(l) { return l.time; }));
    var avg = laps.reduce(function(a, b) { return a + b.time; }, 0) / laps.length;
    bestLap.textContent = formatLapTime(best);
    worstLap.textContent = formatLapTime(worst);
    avgLap.textContent = formatLapTime(Math.floor(avg));
}

$('clearLapsBtn').addEventListener('click', function() {
    laps = [];
    renderLaps();
    updateStats();
    saveState();
});

// ==================== HISTORY ====================
function loadLocalHistory() {
    history = JSON.parse(localStorage.getItem('mr_stopwatch_history') || '[]');
    renderHistory();
}

function loadCloudHistory() {
    var uid = getUserId();
    var db = getDB();
    if (!uid || !db) return;
    var q = query(collection(db, 'users', uid, 'stopwatch'), orderBy('createdAt', 'desc'));
    onSnapshot(q, function(snap) {
        var cloud = snap.docs.map(function(d) { return { id: d.id, totalTime: d.data().totalTime, lapCount: d.data().lapCount, createdAt: d.data().createdAt, isCloud: true }; });
        var local = JSON.parse(localStorage.getItem('mr_stopwatch_history') || '[]');
        history = cloud.concat(local).sort(function(a, b) { return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date); }).slice(0, 30);
        renderHistory();
    });
}

async function saveSession() {
    var sessionData = { totalTime: elapsedTime, laps: laps.map(function(l) { return { number: l.number, time: l.time }; }), lapCount: laps.length };
    if (laps.length >= 2) {
        sessionData.bestLap = Math.min.apply(null, laps.map(function(l) { return l.time; }));
        sessionData.worstLap = Math.max.apply(null, laps.map(function(l) { return l.time; }));
        sessionData.avgLap = Math.floor(laps.reduce(function(a, b) { return a + b.time; }, 0) / laps.length);
    }
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try { await addDoc(collection(db, 'users', uid, 'stopwatch'), { totalTime: elapsedTime, laps: laps.map(function(l) { return { number: l.number, time: l.time }; }), lapCount: laps.length, createdAt: serverTimestamp() }); } catch(e) {}
    } else {
        var local = JSON.parse(localStorage.getItem('mr_stopwatch_history') || '[]');
        local.unshift({ totalTime: elapsedTime, lapCount: laps.length, date: new Date().toISOString(), id: 'local_' + Date.now() });
        localStorage.setItem('mr_stopwatch_history', JSON.stringify(local.slice(0, 30)));
        loadLocalHistory();
    }
}

function renderHistory() {
    if (!history.length) { historyList.innerHTML = '<div class="empty-history">Tarix bo\'sh</div>'; return; }
    historyList.innerHTML = history.slice(0, 15).map(function(item) {
        return '<div class="history-item"><div><span style="font-weight:500;color:var(--text);">' + formatMain(item.totalTime) + '</span><span style="font-size:11px;color:var(--text-3);margin-left:8px;">' + (item.lapCount || 0) + ' lap</span></div><span style="font-size:10px;color:var(--text-3);">' + new Date(item.createdAt || item.date).toLocaleDateString() + '</span></div>';
    }).join('');
}

$('clearHistoryBtn').addEventListener('click', async function() {
    if (!confirm('Tarixni tozalash?')) return;
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try {
            var snap = await getDocs(collection(db, 'users', uid, 'stopwatch'));
            if (!snap.empty) { var batch = writeBatch(db); snap.docs.forEach(function(d) { batch.delete(d.ref); }); await batch.commit(); }
        } catch(e) {}
    }
    localStorage.removeItem('mr_stopwatch_history');
    history = [];
    renderHistory();
    showToast('Tozalandi');
});

// ==================== STATE ====================
function saveState() {
    localStorage.setItem('mr_stopwatch_state', JSON.stringify({ elapsedTime: elapsedTime, isRunning: isRunning, startTime: isRunning ? startTime : null, laps: laps }));
}

function loadState() {
    var saved = localStorage.getItem('mr_stopwatch_state');
    if (!saved) return;
    try {
        var data = JSON.parse(saved);
        elapsedTime = data.elapsedTime || 0;
        laps = data.laps || [];
        updateDisplay();
        renderLaps();
        updateStats();
        if (data.isRunning && data.startTime) {
            var elapsed = Date.now() - data.startTime;
            if (elapsed < 86400000 && elapsed >= 0) { startTime = data.startTime; start(); }
        } else { updateUI(); }
    } catch(e) { reset(); }
}

function clearState() { localStorage.removeItem('mr_stopwatch_state'); }

// ==================== VISIBILITY ====================
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isRunning) saveState();
    else if (!document.hidden && isRunning) {
        var saved = localStorage.getItem('mr_stopwatch_state');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                if (data.startTime) { var elapsed = Date.now() - data.startTime; if (elapsed < 86400000 && elapsed >= 0) { startTime = data.startTime; if (!timerInterval) start(); } }
            } catch(e) {}
        }
    }
});

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var triggerName = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var triggerAvatar = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    if (user) {
        var dn = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        if (triggerName) triggerName.textContent = dn;
        if (triggerAvatar) {
            if (user.photoURL) triggerAvatar.innerHTML = '<img src="' + user.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            else triggerAvatar.textContent = dn.charAt(0).toUpperCase();
        }
    } else {
        if (triggerName) triggerName.textContent = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
    }
}

// ==================== INIT ====================
function init() {
    console.log('MRDEV Stopwatch v2.0 ishga tushmoqda...');
    initTheme();
    updateDisplay();
    updateUI();

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) loadCloudHistory(); else loadLocalHistory();
        try { initMiniDropdown(user); } catch(e) { console.warn('Dropdown init failed:', e.message); }
    });

    loadState();
    console.log('Stopwatch tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', function() { if (isRunning) saveState(); });
