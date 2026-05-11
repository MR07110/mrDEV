// ==================== MRDEV BOARD v2.4 — Firebase + Local Sync ====================

import logger from '../../assets/js/core/logger.js';
import { initAuth, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { db } from '../../assets/js/core/firebase-init.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== DOM ====================
const $ = (id) => document.getElementById(id);
const canvas = $('boardCanvas');
const ctx = canvas.getContext('2d');
const container = $('boardContainer');
const toast = $('toast');
const zoomLabel = $('zoomLabel');

// ==================== STATE ====================
let currentUser = null;
const state = {
    tool: 'draw', isDrawing: false, isPanning: false,
    scale: 1, offset: { x: 0, y: 0 },
    elements: [], history: [], historyIndex: -1,
    lastMouse: { x: 0, y: 0 },
    penSize: 4, penColor: '#8ab4f8', currentPath: null
};

// ==================== THEME ====================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcon();
    const themeBtn = $('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    render();
}

function updateThemeIcon() {
    const btn = $('themeToggle');
    if (!btn) return;
    const isDark = document.documentElement.classList.contains('dark');
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

// ==================== RESIZE ====================
function resize() { canvas.width = container.clientWidth; canvas.height = container.clientHeight; render(); }
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

// ==================== COORDINATES ====================
function getWorld(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return { x: (cx - r.left - state.offset.x) / state.scale, y: (cy - r.top - state.offset.y) / state.scale };
}

// ==================== RENDER ====================
function render() {
    var dark = document.documentElement.classList.contains('dark');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = dark ? '#1a1a2e' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(state.scale, 0, 0, state.scale, state.offset.x, state.offset.y);
    state.elements.forEach(function(el) {
        if (el.type === 'path' && el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = el.color;
            ctx.lineWidth = el.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (var i = 1; i < el.points.length - 1; i++) {
                var xc = (el.points[i].x + el.points[i + 1].x) / 2;
                var yc = (el.points[i].y + el.points[i + 1].y) / 2;
                ctx.quadraticCurveTo(el.points[i].x, el.points[i].y, xc, yc);
            }
            if (el.points.length > 1) ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
            ctx.stroke();
        }
    });
    if (zoomLabel) zoomLabel.textContent = Math.round(state.scale * 100) + '%';
    updateUndoRedo();
}

// ==================== HISTORY ====================
function addHistory() {
    if (state.historyIndex < state.history.length - 1) state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.parse(JSON.stringify(state.elements)));
    state.historyIndex++;
    if (state.history.length > 50) { state.history.shift(); state.historyIndex--; }
    updateUndoRedo();
}
function undo() { if (state.historyIndex > 0) { state.historyIndex--; state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex])); render(); } }
function redo() { if (state.historyIndex < state.history.length - 1) { state.historyIndex++; state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex])); render(); } }
function updateUndoRedo() {
    var u = $('btnUndo'), r = $('btnRedo');
    if (u) u.style.opacity = state.historyIndex > 0 ? '1' : '0.3';
    if (r) r.style.opacity = state.historyIndex < state.history.length - 1 ? '1' : '0.3';
}

// ==================== TOOLS ====================
document.querySelectorAll('.tool-btn[data-tool]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.tool = btn.dataset.tool;
        canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'crosshair';
    });
});
$('boardColorPicker').addEventListener('input', function(e) { state.penColor = e.target.value; $('boardColorDot').style.background = e.target.value; });
$('btnUndo').addEventListener('click', undo);
$('btnRedo').addEventListener('click', redo);

// ==================== DRAWING ====================
canvas.addEventListener('pointerdown', function(e) {
    if (state.tool === 'pan') { state.isPanning = true; state.lastMouse = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; return; }
    state.isDrawing = true;
    var world = getWorld(e.clientX, e.clientY);
    var dark = document.documentElement.classList.contains('dark');
    state.currentPath = { type: 'path', points: [world], color: state.tool === 'erase' ? (dark ? '#1a1a2e' : '#ffffff') : state.penColor, size: state.tool === 'erase' ? 20 : state.penSize };
});
canvas.addEventListener('pointermove', function(e) {
    if (state.isPanning) { state.offset.x += e.clientX - state.lastMouse.x; state.offset.y += e.clientY - state.lastMouse.y; state.lastMouse = { x: e.clientX, y: e.clientY }; render(); return; }
    if (!state.isDrawing || !state.currentPath) return;
    var world = getWorld(e.clientX, e.clientY);
    var last = state.currentPath.points[state.currentPath.points.length - 1];
    if (Math.hypot(world.x - last.x, world.y - last.y) > 1) { state.currentPath.points.push(world); state.elements = state.elements.concat([state.currentPath]); render(); }
});
canvas.addEventListener('pointerup', function() {
    if (state.isDrawing && state.currentPath && state.currentPath.points.length > 1) { state.elements.push(state.currentPath); addHistory(); }
    state.isDrawing = false; state.isPanning = false; state.currentPath = null; canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'crosshair';
});
canvas.addEventListener('pointerleave', function() {
    if (state.isDrawing && state.currentPath && state.currentPath.points.length > 1) { state.elements.push(state.currentPath); addHistory(); }
    state.isDrawing = false; state.isPanning = false; state.currentPath = null; canvas.style.cursor = state.tool === 'pan' ? 'grab' : 'crosshair';
});

// ==================== ZOOM ====================
canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var world = getWorld(e.clientX, e.clientY);
    var d = e.deltaY > 0 ? 0.95 : 1.05;
    state.scale = Math.max(0.1, Math.min(5, state.scale * d));
    state.offset.x = e.clientX - canvas.getBoundingClientRect().left - world.x * state.scale;
    state.offset.y = e.clientY - canvas.getBoundingClientRect().top - world.y * state.scale;
    render();
}, { passive: false });

// ==================== SAVE ====================
$('saveBoardBtn').addEventListener('click', async function() {
    var data = JSON.stringify({ elements: state.elements, version: 2, savedAt: new Date().toISOString() });
    var uid = getUserId();
    logger.board.save(uid);
    
    var prefix = uid ? 'mrdev_board_' + uid + '_' : 'board_';
    localStorage.setItem(prefix + 'data', data);

    if (uid && db) {
        try {
            await setDoc(doc(db, 'users', uid, 'board', 'current'), { data: data, elementsCount: state.elements.length, updatedAt: serverTimestamp() });
            showToast('Bulutga saqlandi! ☁️', 'success');
        } catch(e) {
            logger.board.cloudSaveError(e);
            showToast('Faqat lokalga saqlandi', 'error');
        }
    } else {
        showToast('Lokalga saqlandi', 'success');
    }
});

// ==================== LOAD ====================
function loadLocalBoard() {
    var uid = getUserId();
    var prefix = uid ? 'mrdev_board_' + uid + '_' : 'board_';
    var saved = localStorage.getItem(prefix + 'data');
    if (saved) {
        try { var d = JSON.parse(saved); state.elements = d.elements || []; addHistory(); render(); } catch(e) {}
    }
}

function loadCloudBoard() {
    var uid = getUserId();
    logger.board.load(uid);
    if (!uid || !db) return;

    onSnapshot(doc(db, 'users', uid, 'board', 'current'), function(snap) {
        if (snap.exists()) {
            try {
                var d = JSON.parse(snap.data().data);
                state.elements = d.elements || [];
                var u = getUserId();
                var p = u ? 'mrdev_board_' + u + '_' : 'board_';
                localStorage.setItem(p + 'data', snap.data().data);
            } catch(e) { loadLocalBoard(); return; }
        }
        addHistory(); render();
    }, function(error) {
        logger.board.cloudLoadError(error);
        loadLocalBoard();
    });
}

// ==================== CLEAR ====================
$('clearBoardBtn').addEventListener('click', function() {
    if (!confirm('Doskani tozalash?')) return;
    state.elements = []; addHistory(); render();
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); $('saveBoardBtn').click(); }
});

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var triggerName = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var triggerAvatar = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    
    if (user && user.displayName) {
        var dn = user.displayName;
        if (triggerName) triggerName.textContent = dn;
        if (triggerAvatar) {
            triggerAvatar.innerHTML = user.photoURL 
                ? '<img src="' + user.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
                : dn.charAt(0).toUpperCase();
        }
        logger.board.ui(dn);
    } else {
        if (triggerName) triggerName.textContent = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
        logger.board.guest();
    }
}

// ==================== INIT ====================
async function init() {
    logger.board.init();
    initTheme(); resize(); addHistory(); loadLocalBoard(); render();

    try {
        const savedAuth = localStorage.getItem('mrdev_local_auth');
        if (savedAuth) {
            const user = JSON.parse(savedAuth);
            // FIX: isLoggedIn yo'q bo'lsa ham uid + email bilan tekshir
            if ((user.isLoggedIn || user.uid) && user.uid) {
                currentUser = { uid: user.uid, email: user.email, displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'User'), photoURL: user.photoURL || null, isAuthenticated: true };
                updateUserUI(currentUser);
                loadCloudBoard();
                try { initMiniDropdown(currentUser); } catch(e) { logger.board.dropdownError(e); }
            }
        }
    } catch(e) { logger.board.dropdownError(e); }

    initAuth(function(user) {
        if (user?.isAuthenticated || user?.uid) {
            currentUser = user;
            updateUserUI(user);
            loadCloudBoard();
            try { initMiniDropdown(user); } catch(e) { logger.board.dropdownError(e); }
        }
    });

    logger.board.ready(getUserId());
}

document.addEventListener('DOMContentLoaded', init);
