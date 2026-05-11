// ==================== MRDEV CALCULATOR v2.0 — Firebase + Local Sync ====================
import { initAuth, smartSave, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { getFirebase } from '../../assets/js/firebase-helper.js';

var _db = null;
function getDB() {
    if (!_db) {
        var fb = getFirebase();
        _db = fb.db;
    }
    return _db;
}

import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, writeBatch, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== DOM ====================
var $ = function(id) { return document.getElementById(id); };
var expressionEl = $('expression');
var resultEl = $('result');
var historyPanel = $('historyPanel');
var historyList = $('historyList');
var toast = $('toast');

// ==================== STATE ====================
var currentUser = null;
var expression = '';
var shouldReset = false;
var lastResult = null;

// ==================== THEME ====================
function initTheme() {
    var saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
    var themeBtn = $('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
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

// ==================== CALCULATE ====================
function updateDisplay() {
    var displayExpr = expression.replace(/\*/g, 'x');
    expressionEl.textContent = displayExpr || '0';

    if (!expression) { resultEl.textContent = ''; return; }

    try {
        var calcExpr = expression.replace(/x/g, '*').replace(/%/g, '/100');
        var lastChar = calcExpr.slice(-1);
        if (['+', '-', '*', '/'].indexOf(lastChar) > -1) {
            calcExpr = calcExpr.slice(0, -1);
        }
        if (!calcExpr) { resultEl.textContent = ''; return; }

        var result = new Function('return (' + calcExpr + ')')();
        resultEl.textContent = formatNumber(result);
    } catch(e) {
        resultEl.textContent = '';
    }
}

function formatNumber(num) {
    if (!Number.isFinite(num)) return 'Xato';
    if (Number.isInteger(num)) {
        if (Math.abs(num) > 1e15) return num.toExponential(6);
        return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    var fixed = parseFloat(num.toFixed(10));
    return fixed.toLocaleString('en-US', { maximumFractionDigits: 10 });
}

function handleNumber(num) {
    if (shouldReset) { expression = ''; shouldReset = false; }
    expression += num;
    updateDisplay();
}

function handleOperator(op) {
    if (shouldReset) { shouldReset = false; }
    if (!expression && op !== '-') return;
    var last = expression.slice(-1);
    if (['+', '-', '*', '/'].indexOf(last) > -1) {
        expression = expression.slice(0, -1);
    }
    expression += op;
    updateDisplay();
}

function handlePercent() {
    if (!expression) return;
    expression += '%';
    updateDisplay();
}

function calculate() {
    if (!expression) return;
    var originalExpr = expression.replace(/\*/g, 'x');

    try {
        var calcExpr = expression.replace(/x/g, '*').replace(/%/g, '/100');
        var result = new Function('return (' + calcExpr + ')')();
        var formattedResult = formatNumber(result);

        expressionEl.textContent = originalExpr + ' =';
        resultEl.textContent = formattedResult;

        saveCalculation(originalExpr, formattedResult);

        expression = result.toString();
        shouldReset = true;
        lastResult = formattedResult;
    } catch(e) {
        resultEl.textContent = 'Xato';
        shouldReset = true;
    }
}

function clearAll() {
    expression = '';
    shouldReset = false;
    lastResult = null;
    expressionEl.textContent = '0';
    resultEl.textContent = '';
}

function deleteLast() {
    if (shouldReset) { clearAll(); return; }
    expression = expression.slice(0, -1);
    updateDisplay();
}

// ==================== BUTTONS ====================
document.querySelectorAll('.calc-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var action = btn.dataset.action;
        if (action === 'number') handleNumber(btn.dataset.value);
        else if (action === 'operator') handleOperator(btn.dataset.value);
        else if (action === 'percent') handlePercent();
        else if (action === 'calculate') calculate();
        else if (action === 'clear') clearAll();
        else if (action === 'delete') deleteLast();
    });
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', function(e) {
    if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
    else if (e.key === '.') handleNumber('.');
    else if (e.key === '+') handleOperator('+');
    else if (e.key === '-') handleOperator('-');
    else if (e.key === '*') { e.preventDefault(); handleOperator('*'); }
    else if (e.key === '/') { e.preventDefault(); handleOperator('/'); }
    else if (e.key === '%') handlePercent();
    else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); calculate(); }
    else if (e.key === 'Backspace') deleteLast();
    else if (e.key === 'Escape') clearAll();
});

// ==================== HISTORY TOGGLE ====================
$('historyToggle').addEventListener('click', function() {
    historyPanel.classList.toggle('show');
});

// ==================== SAVE CALCULATION ====================
async function saveCalculation(expr, result) {
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try {
            await addDoc(collection(db, 'users', uid, 'calculations'), {
                expression: expr, result: result, createdAt: serverTimestamp()
            });
        } catch(e) { console.warn('Cloud save failed:', e.message); }
    } else {
        var local = JSON.parse(localStorage.getItem('mr_calc_history') || '[]');
        local.unshift({ expression: expr, result: result, date: new Date().toISOString(), id: 'local_' + Date.now() });
        localStorage.setItem('mr_calc_history', JSON.stringify(local.slice(0, 50)));
        loadLocalHistory();
    }
}

// ==================== HISTORY ====================
function loadLocalHistory() {
    var local = JSON.parse(localStorage.getItem('mr_calc_history') || '[]');
    renderHistory(local);
}

function loadCloudHistory() {
    var uid = getUserId();
    var db = getDB();
    if (!uid || !db) return;
    var q = query(collection(db, 'users', uid, 'calculations'), orderBy('createdAt', 'desc'));
    onSnapshot(q, function(snap) {
        var cloud = snap.docs.map(function(d) {
            var data = d.data();
            return { id: d.id, expression: data.expression, result: data.result, createdAt: data.createdAt, isCloud: true };
        });
        var local = JSON.parse(localStorage.getItem('mr_calc_history') || '[]');
        var all = cloud.concat(local).sort(function(a, b) {
            return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        }).slice(0, 50);
        renderHistory(all);
    });
}

function renderHistory(items) {
    if (!items.length) {
        historyList.innerHTML = '<div class="empty-history">Tarix bo\'sh</div>';
        return;
    }
    historyList.innerHTML = items.map(function(item) {
        return '<div class="history-item" data-expr="' + item.expression + '" data-result="' + item.result + '">' +
            '<div class="history-expr">' + item.expression + ' =</div>' +
            '<div class="history-result">' + item.result + '</div></div>';
    }).join('');

    document.querySelectorAll('.history-item').forEach(function(item) {
        item.addEventListener('click', function() {
            expressionEl.textContent = item.dataset.expr + ' =';
            resultEl.textContent = item.dataset.result;
            expression = item.dataset.result;
            shouldReset = true;
        });
    });
}

$('clearHistoryBtn').addEventListener('click', async function() {
    if (!confirm('Tarixni tozalash?')) return;
    var uid = getUserId();
    var db = getDB();
    if (uid && db) {
        try {
            var collRef = collection(db, 'users', uid, 'calculations');
            var snap = await getDocs(collRef);
            if (!snap.empty) {
                var batch = writeBatch(db);
                snap.docs.forEach(function(d) { batch.delete(d.ref); });
                await batch.commit();
            }
        } catch(e) { console.warn('Clear error:', e.message); }
    }
    localStorage.removeItem('mr_calc_history');
    renderHistory([]);
    showToast('Tozalandi');
});

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

// ==================== INIT ====================
function init() {
    console.log('MRDEV Calculator v2.0 ishga tushmoqda...');
    initTheme();
    updateDisplay();
    loadLocalHistory();

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) {
            loadCloudHistory();
        } else {
            loadLocalHistory();
        }
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('Calculator tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
