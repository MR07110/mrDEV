// ==================== MRDEV TIMER v2.0 — Firebase + Local Sync ====================
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
var timeDisplay = $('timeDisplay');
var timeStatus = $('timeStatus');
var progressCircle = $('progressCircle');
var hoursInput = $('hoursInput');
var minutesInput = $('minutesInput');
var secondsInput = $('secondsInput');
var startBtn = $('startBtn');
var pauseBtn = $('pauseBtn');
var resetBtn = $('resetBtn');
var historyList = $('historyList');
var toast = $('toast');

var CIRCUMFERENCE = 2 * Math.PI * 90;

// ==================== STATE ====================
var currentUser = null;
var remainingSeconds = 0;
var totalSeconds = 0;
var isRunning = false;
var isPaused = false;
var timerInterval = null;
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

// ==================== FORMAT ====================
function formatTime(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function formatTimeLong(sec) {
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    var parts = [];
    if (h > 0) parts.push(h + ' soat');
    if (m > 0) parts.push(m + ' daq');
    if (s > 0 || !parts.length) parts.push(s + ' sek');
    return parts.join(' ');
}

// ==================== PROGRESS ====================
function updateProgress() {
    if (totalSeconds === 0) { progressCircle.style.strokeDashoffset = '0'; return; }
    var progress = remainingSeconds / totalSeconds;
    var offset = CIRCUMFERENCE * (1 - progress);
    progressCircle.style.strokeDashoffset = offset;
}

function updateDisplay() {
    timeDisplay.textContent = formatTime(remainingSeconds);
    updateProgress();
}

function updateStatus(text, className) {
    timeStatus.textContent = text;
    timeStatus.className = 'time-status' + (className ? ' ' + className : '');
}

function getTotalFromInputs() {
    return (parseInt(hoursInput.value) || 0) * 3600 +
           (parseInt(minutesInput.value) || 0) * 60 +
           (parseInt(secondsInput.value) || 0);
}

function setInputsFromRemaining() {
    var h = Math.floor(remainingSeconds / 3600);
    var m = Math.floor((remainingSeconds % 3600) / 60);
    var s = remainingSeconds % 60;
    hoursInput.value = h;
    minutesInput.value = m;
    secondsInput.value = s;
}

function enableInputs(disabled) {
    hoursInput.disabled = disabled;
    minutesInput.disabled = disabled;
    secondsInput.disabled = disabled;
}

// ==================== PRESETS ====================
document.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (isRunning) return;
        var secs = parseInt(btn.dataset.seconds);
        remainingSeconds = secs;
        totalSeconds = secs;
        setInputsFromRemaining();
        updateDisplay();
        updateStatus('Tayyor');
        document.querySelectorAll('.preset-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    });
});

// ==================== CONTROLS ====================
startBtn.addEventListener('click', function() {
    if (isRunning) return;

    if (remainingSeconds <= 0 || (isPaused === false && totalSeconds === 0)) {
        remainingSeconds = getTotalFromInputs();
        totalSeconds = remainingSeconds;
        if (remainingSeconds <= 0) { showToast('Vaqt kiriting', 'error'); return; }
    }

    isRunning = true;
    isPaused = false;
    enableInputs(true);
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    updateStatus('Ishlamoqda', 'running');
    saveState();

    timerInterval = setInterval(function() {
        if (remainingSeconds > 0) {
            remainingSeconds--;
            updateDisplay();
            saveState();
            if (remainingSeconds === 0) completeTimer();
        }
    }, 1000);
});

pauseBtn.addEventListener('click', function() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    isPaused = true;
    enableInputs(false);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    updateStatus('Pauzada', 'paused');
    saveState();
});

resetBtn.addEventListener('click', function() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    isPaused = false;
    remainingSeconds = totalSeconds;
    enableInputs(false);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    updateDisplay();
    updateStatus('Tayyor');
    clearState();
});

function completeTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    isPaused = false;
    remainingSeconds = 0;
    enableInputs(false);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    updateDisplay();
    updateStatus('Tugadi!', 'done');
    clearState();
    saveToHistory(totalSeconds);
    playAlert();

    setTimeout(function() {
        if (!isRunning && remainingSeconds === 0) {
            remainingSeconds = totalSeconds;
            setInputsFromRemaining();
            updateDisplay();
            updateStatus('Tayyor');
        }
    }, 5000);
}

function playAlert() {
    try {
        var utterance = new SpeechSynthesisUtterance('Vaqt tugadi');
        utterance.lang = 'uz';
        utterance.rate = 0.9;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
    } catch(e) {}
    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
}

// ==================== STATE ====================
function saveState() {
    localStorage.setItem('mr_timer_state', JSON.stringify({
        remaining: remainingSeconds, total: totalSeconds,
        running: isRunning, paused: isPaused,
        timestamp: isRunning ? Date.now() : null
    }));
}

function loadState() {
    var saved = localStorage.getItem('mr_timer_state');
    if (!saved) return;
    try {
        var state = JSON.parse(saved);
        totalSeconds = state.total;
        if (state.running && state.timestamp) {
            var elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
            remainingSeconds = Math.max(0, state.remaining - elapsed);
            if (remainingSeconds > 0) { updateDisplay(); setInputsFromRemaining(); startBtn.click(); }
            else { remainingSeconds = 0; updateDisplay(); completeTimer(); }
        } else {
            remainingSeconds = state.remaining;
            updateDisplay();
            setInputsFromRemaining();
            if (state.remaining === 0 && state.total > 0) updateStatus('Tugadi!', 'done');
        }
    } catch(e) {}
}

function clearState() { localStorage.removeItem('mr_timer_state'); }

// ==================== HISTORY ====================
function loadLocalHistory() {
    history = JSON.parse(localStorage.getItem('mr_timer_history') || '[]');
    renderHistory();
}

function loadCloudHistory() {
    var uid = getUserId();
    var db = getDB();
    if (!uid || !db) return;
    var q = query(collection(db, 'users', uid, 'timers'), orderBy('createdAt', 'desc'));
    onSnapshot(q, function(snap) {
        var cloud = snap.docs.map(function(d) { return { id: d.id, seconds: d.data().seconds, label: d.data().label, createdAt: d.data().createdAt, isCloud: true }; });
        var local = JSON.parse(localStorage.getItem('mr_timer_history') || '[]');
        history = cloud.concat(local).sort(function(a, b) { return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date); }).slice(0, 50);
        renderHistory();
    });
}

async function saveToHistory(seconds) {
    if (seconds <= 0) return;
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try { await addDoc(collection(db, 'users', uid, 'timers'), { seconds: seconds, label: formatTimeLong(seconds), completed: true, createdAt: serverTimestamp() }); } catch(e) {}
    } else {
        var local = JSON.parse(localStorage.getItem('mr_timer_history') || '[]');
        local.unshift({ seconds: seconds, label: formatTimeLong(seconds), date: new Date().toISOString(), id: 'local_' + Date.now() });
        localStorage.setItem('mr_timer_history', JSON.stringify(local.slice(0, 50)));
        loadLocalHistory();
    }
}

function renderHistory() {
    if (!history.length) { historyList.innerHTML = '<div class="empty-history">Tarix bo\'sh</div>'; return; }
    historyList.innerHTML = history.slice(0, 20).map(function(item) {
        return '<div class="history-item"><div><div class="history-time">' + formatTime(item.seconds) + '</div><div class="history-label">' + (item.label || '') + ' | ' + new Date(item.createdAt || item.date).toLocaleDateString() + '</div></div><span style="font-size:10px;color:var(--text-3);">' + (item.isCloud ? 'Cloud' : 'Local') + '</span></div>';
    }).join('');
}

$('clearHistoryBtn').addEventListener('click', async function() {
    if (!confirm('Tarixni tozalash?')) return;
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try {
            var snap = await getDocs(collection(db, 'users', uid, 'timers'));
            if (!snap.empty) { var batch = writeBatch(db); snap.docs.forEach(function(d) { batch.delete(d.ref); }); await batch.commit(); }
        } catch(e) {}
    }
    localStorage.removeItem('mr_timer_history');
    history = [];
    renderHistory();
    showToast('Tozalandi');
});

// ==================== INPUT CHANGE ====================
[hoursInput, minutesInput, secondsInput].forEach(function(input) {
    input.addEventListener('change', function() {
        if (!isRunning && !isPaused) {
            remainingSeconds = getTotalFromInputs();
            totalSeconds = remainingSeconds;
            updateDisplay();
            updateStatus('Tayyor');
        }
    });
});

// ==================== VISIBILITY ====================
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isRunning) saveState();
    else if (!document.hidden && isRunning) loadState();
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
    console.log('MRDEV Timer v2.0 ishga tushmoqda...');
    initTheme();
    progressCircle.style.strokeDasharray = CIRCUMFERENCE;
    loadState();

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) loadCloudHistory(); else loadLocalHistory();
        try { initMiniDropdown(user); } catch(e) { console.warn('Dropdown init failed:', e.message); }
    });

    console.log('Timer tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', function() { if (isRunning) saveState(); });
