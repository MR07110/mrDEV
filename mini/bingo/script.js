// ==================== MRDEV BINGO v4.1 — Firebase + Local Sync ====================
import { initAuth, smartSave, smartLoad, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';

// ==================== DOM ELEMENTLAR ====================
const $ = (id) => document.getElementById(id);

const lobbyView = $('lobbyView');
const gameView = $('gameView');

const winStreakEl = $('winStreak');
const xpPointsEl = $('xpPoints');
const playerLevelEl = $('playerLevel');
const totalGamesEl = $('totalGames');
const xpFillEl = $('xpFill');
const xpTextEl = $('xpText');
const scoreXEl = $('scoreX');
const scoreOEl = $('scoreO');
const scoreDrawEl = $('scoreDraw');

const offlineBtn = $('offlineBtn');
const botBtn = $('botBtn');
const botPanel = $('botPanel');
const difficultySlider = $('difficultySlider');
const diffIcon = $('diffIcon');
const diffLabel = $('diffLabel');
const diffDesc = $('diffDesc');
const startBotBtn = $('startBotBtn');
const startOfflineBtn = $('startOfflineBtn');

const gameModeBadge = $('gameModeBadge');
const gameScoreX = $('gameScoreX');
const gameScoreO = $('gameScoreO');
const turnIndicator = $('turnIndicator');
const turnText = $('turnText');
const botThinking = $('botThinking');
const bingoGrid = $('bingoGrid');
const gameResult = $('gameResult');
const restartBtn = $('restartBtn');
const backToLobbyBtn = $('backToLobbyBtn');
const historyList = $('historyList');
const levelUpEl = $('levelUp');
const toastEl = $('toast');

let cells = [];

// ==================== STATE ====================
let currentUser = null;
let board = Array(9).fill('');
let turn = 'X';
let active = false;
let mode = 'offline';
let botDifficulty = 50;
let gameOver = false;
let winStreak = 0;
let xpPoints = 0;
let playerLevel = 1;
let scoreX = 0;
let scoreO = 0;
let scoreDraw = 0;
let totalGames = 0;
let gameStartTime = 0;
let historyItems = [];
let botThinkingTimeout = null;

// ==================== AUDIO ====================
let audioCtx;
function playSound(freq, type, duration, vol = 0.08) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function sfxClick()   { playSound(800, 'sine', 0.08, 0.04); }
function sfxPlace()   { playSound(600, 'triangle', 0.12, 0.04); }
function sfxWin()     { playSound(523, 'square', 0.15); setTimeout(function() { playSound(659, 'square', 0.15); }, 100); setTimeout(function() { playSound(784, 'square', 0.2); }, 200); }
function sfxLose()    { playSound(200, 'sawtooth', 0.3, 0.05); }
function sfxDraw()    { playSound(400, 'sine', 0.2, 0.05); }
function sfxLevelUp() { playSound(800, 'sine', 0.15); setTimeout(function() { playSound(1000, 'sine', 0.15); }, 120); setTimeout(function() { playSound(1200, 'sine', 0.25); }, 240); }

// ==================== THEME ====================
function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();

    const themeBtn = $('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    sfxClick();
}

function updateThemeIcon() {
    const themeBtn = $('themeToggle');
    if (!themeBtn) return;
    const isDark = document.documentElement.classList.contains('dark');
    themeBtn.innerHTML = isDark
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

// ==================== TOAST ====================
function showToast(message, type) {
    type = type || '';
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast show ' + type;
    clearTimeout(toastEl._timeout);
    toastEl._timeout = setTimeout(function() {
        toastEl.classList.remove('show');
    }, 2500);
}

// ==================== STATS ====================
function loadStatsFromLocal() {
    var uid = getUserId();
    var prefix = uid ? 'mrdev_bingo_' + uid + '_' : 'bingo_';
    winStreak = parseInt(localStorage.getItem(prefix + 'winstreak') || '0', 10);
    xpPoints = parseInt(localStorage.getItem(prefix + 'xp') || '0', 10);
    playerLevel = parseInt(localStorage.getItem(prefix + 'level') || '1', 10);
    scoreX = parseInt(localStorage.getItem(prefix + 'scoreX') || '0', 10);
    scoreO = parseInt(localStorage.getItem(prefix + 'scoreO') || '0', 10);
    scoreDraw = parseInt(localStorage.getItem(prefix + 'scoreDraw') || '0', 10);
    totalGames = parseInt(localStorage.getItem(prefix + 'totalGames') || '0', 10);
    try {
        var json = localStorage.getItem(prefix + 'history');
        historyItems = json ? JSON.parse(json) : [];
    } catch(e) { historyItems = []; }
}

function saveStatsToLocal() {
    var uid = getUserId();
    var prefix = uid ? 'mrdev_bingo_' + uid + '_' : 'bingo_';
    localStorage.setItem(prefix + 'winstreak', winStreak);
    localStorage.setItem(prefix + 'xp', xpPoints);
    localStorage.setItem(prefix + 'level', playerLevel);
    localStorage.setItem(prefix + 'scoreX', scoreX);
    localStorage.setItem(prefix + 'scoreO', scoreO);
    localStorage.setItem(prefix + 'scoreDraw', scoreDraw);
    localStorage.setItem(prefix + 'totalGames', totalGames);
    localStorage.setItem(prefix + 'history', JSON.stringify(historyItems.slice(0, 50)));
}

async function saveStatsToCloud() {
    var uid = getUserId();
    if (!uid) return;
    try {
        await smartSave('bingo_stats', 'bingo_stats_' + uid, {
            winStreak: winStreak,
            xpPoints: xpPoints,
            playerLevel: playerLevel,
            scoreX: scoreX,
            scoreO: scoreO,
            scoreDraw: scoreDraw,
            totalGames: totalGames,
            updatedAt: new Date().toISOString()
        });
    } catch(e) { console.warn('Cloud stats save failed:', e.message); }
}

async function loadStatsFromCloud() {
    var uid = getUserId();
    if (!uid) return;
    return new Promise(function(resolve) {
        var resolved = false;
        var unsub = smartLoad('bingo_stats', 'bingo_stats_' + uid, function(items) {
            if (!resolved && items && items.length > 0) {
                resolved = true;
                var s = items[0];
                winStreak = s.winStreak || winStreak;
                xpPoints = s.xpPoints || xpPoints;
                playerLevel = s.playerLevel || playerLevel;
                scoreX = s.scoreX || scoreX;
                scoreO = s.scoreO || scoreO;
                scoreDraw = s.scoreDraw || scoreDraw;
                totalGames = s.totalGames || totalGames;
            }
            resolve();
        });
        setTimeout(function() {
            unsub();
            if (!resolved) resolve();
        }, 3000);
    });
}

async function loadHistoryFromCloud() {
    var uid = getUserId();
    if (!uid) return;
    return new Promise(function(resolve) {
        var resolved = false;
        var unsub = smartLoad('bingo', 'bingo_history_' + uid, function(items) {
            if (!resolved && items && items.length > 0) {
                resolved = true;
                var cloudItems = items.map(function(i) {
                    return {
                        id: i.id,
                        result: i.result,
                        type: i.type,
                        time: i.time,
                        mode: i.mode,
                        botDifficulty: i.botDifficulty,
                        date: i.date || i.createdAt || new Date().toISOString()
                    };
                });
                var merged = mergeHistories(historyItems, cloudItems);
                historyItems = merged.slice(0, 50);
                saveStatsToLocal();
            }
            resolve();
        });
        setTimeout(function() {
            unsub();
            if (!resolved) resolve();
        }, 3000);
    });
}

function mergeHistories(local, cloud) {
    var map = new Map();
    cloud.forEach(function(item) {
        var key = item.date + '_' + item.result + '_' + (item.time || '');
        if (!map.has(key)) map.set(key, item);
    });
    local.forEach(function(item) {
        var key = item.date + '_' + item.result + '_' + (item.time || '');
        if (!map.has(key)) map.set(key, item);
    });
    return Array.from(map.values()).sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });
}

function updateStatsUI() {
    if (winStreakEl) winStreakEl.textContent = winStreak;
    if (xpPointsEl) xpPointsEl.textContent = xpPoints;
    if (playerLevelEl) playerLevelEl.textContent = playerLevel;
    if (totalGamesEl) totalGamesEl.textContent = totalGames;
    if (scoreXEl) scoreXEl.textContent = scoreX;
    if (scoreOEl) scoreOEl.textContent = scoreO;
    if (scoreDrawEl) scoreDrawEl.textContent = scoreDraw;
    var xpNeeded = playerLevel * 100;
    var pct = Math.min((xpPoints / xpNeeded) * 100, 100);
    if (xpFillEl) xpFillEl.style.width = pct + '%';
    if (xpTextEl) xpTextEl.textContent = xpPoints + ' / ' + xpNeeded + ' XP';
}

function addXP(amount) {
    xpPoints += amount;
    var needed = playerLevel * 100;
    if (xpPoints >= needed) {
        xpPoints -= needed;
        playerLevel++;
        showLevelUp();
        sfxLevelUp();
    }
    saveStatsToLocal();
    saveStatsToCloud();
    updateStatsUI();
}

function showLevelUp() {
    if (!levelUpEl) return;
    levelUpEl.textContent = 'LEVEL UP! ' + playerLevel;
    levelUpEl.className = 'level-up show';
    setTimeout(function() { levelUpEl.className = 'level-up'; }, 2000);
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#fbbf24', '#8ab4f8', '#34a853', '#ea4335', '#8b5cf6']
        });
    }
}

// ==================== HISTORY ====================
async function addHistoryItem(result, type, time) {
    var item = {
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        result: result,
        type: type,
        time: time,
        mode: mode,
        botDifficulty: mode === 'bot' ? botDifficulty : null,
        date: new Date().toISOString()
    };
    historyItems.unshift(item);
    historyItems = historyItems.slice(0, 50);
    saveStatsToLocal();
    if (getUserId()) {
        try {
            await smartSave('bingo', 'bingo_history_' + getUserId(), {
                result: result,
                type: type,
                time: time,
                mode: mode,
                botDifficulty: mode === 'bot' ? botDifficulty : null
            });
        } catch(e) { console.warn('History cloud save failed:', e.message); }
    }
    renderHistory();
}

function renderHistory() {
    if (!historyList) return;
    var recent = historyItems.slice(0, 15);
    if (recent.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Hali o\'yin tarixi yo\'q</div>';
        return;
    }
    historyList.innerHTML = recent.map(function(item) {
        var date = new Date(item.date);
        var timeAgo = getTimeAgo(date);
        var modeText = item.mode === 'bot' ? 'Robot' : '2 kishi';
        var diffText = item.botDifficulty ? ' | ' + item.botDifficulty + '%' : '';
        return '<div class="history-item ' + item.type + '">' +
            '<div><strong>' + item.result + '</strong>' +
            '<span style="font-size:10px;color:var(--text-3);margin-left:6px;">' + modeText + diffText + ' | ' + (item.time || '?') + 's</span></div>' +
            '<span style="font-size:10px;color:var(--text-3);">' + timeAgo + '</span></div>';
    }).join('');
}

function getTimeAgo(date) {
    var seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Hozir';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' daqiqa';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' soat';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' kun';
    return date.toLocaleDateString('uz-UZ');
}

// ==================== DIFFICULTY ====================
function updateDifficultyLabel() {
    botDifficulty = parseInt(difficultySlider.value, 10);
    var icon = '-', label = '', desc = '';
    if (botDifficulty === 0) {
        label = 'Juda oson (0%)'; desc = 'Robot tasodifiy o\'ynaydi';
    } else if (botDifficulty <= 20) {
        label = 'Oson (' + botDifficulty + '%)'; desc = 'Robot ko\'pincha xato qiladi';
    } else if (botDifficulty <= 40) {
        label = 'O\'rta (' + botDifficulty + '%)'; desc = 'Robot ba\'zan xato qiladi';
    } else if (botDifficulty <= 60) {
        label = 'Qiyin (' + botDifficulty + '%)'; desc = 'Robot kam xato qiladi';
    } else if (botDifficulty <= 80) {
        label = 'Juda qiyin (' + botDifficulty + '%)'; desc = 'Robot deyarli mukammal';
    } else {
        label = 'Mukammal (100%)'; desc = 'Robot hech qachon yutqazmaydi!';
    }
    if (diffIcon) diffIcon.textContent = icon;
    if (diffLabel) diffLabel.textContent = label;
    if (diffDesc) diffDesc.textContent = desc;
}

// ==================== MODE SELECTION ====================
offlineBtn.addEventListener('click', function() {
    offlineBtn.classList.add('active');
    botBtn.classList.remove('active');
    botPanel.style.display = 'none';
    mode = 'offline';
    sfxClick();
});

botBtn.addEventListener('click', function() {
    botBtn.classList.add('active');
    offlineBtn.classList.remove('active');
    botPanel.style.display = 'block';
    mode = 'bot';
    sfxClick();
});

difficultySlider.addEventListener('input', updateDifficultyLabel);

startOfflineBtn.addEventListener('click', function() {
    mode = 'offline';
    startGame('offline');
    sfxClick();
});

startBotBtn.addEventListener('click', function() {
    mode = 'bot';
    startGame('bot');
    sfxClick();
});

// ==================== GAME LOGIC ====================
function startGame(mode_) {
    mode = mode_;
    board = Array(9).fill('');
    turn = 'X';
    active = true;
    gameOver = false;
    gameStartTime = Date.now();
    cells = document.querySelectorAll('.cell');
    lobbyView.style.display = 'none';
    gameView.style.display = 'block';
    gameResult.style.display = 'none';
    gameResult.className = 'game-result';
    botThinking.style.display = 'none';
    if (mode === 'offline') {
        gameModeBadge.textContent = '2 kishi';
    } else {
        gameModeBadge.textContent = 'Robot | ' + botDifficulty + '%';
    }
    gameScoreX.textContent = scoreX;
    gameScoreO.textContent = scoreO;
    turnDot('x');
    turnText.textContent = 'Navbat: X';
    cells.forEach(function(c) {
        c.textContent = '';
        c.className = 'cell';
        c.disabled = false;
    });
    botPanel.style.display = 'none';
}

function turnDot(type) {
    var dot = turnIndicator ? turnIndicator.querySelector('.turn-dot') : null;
    if (dot) dot.className = 'turn-dot ' + (type === 'x' ? 'x-dot' : 'o-dot');
}

function makeMove(idx, player) {
    board[idx] = player;
    sfxPlace();
    var cell = document.querySelector('.cell[data-idx="' + idx + '"]');
    if (cell) {
        cell.textContent = player;
        cell.classList.add(player.toLowerCase());
    }
}

function checkWinner() {
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var i = 0; i < lines.length; i++) {
        var a = lines[i][0], b = lines[i][1], c = lines[i][2];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], cells: [a, b, c] };
        }
    }
    if (!board.includes('')) return { winner: 'draw', cells: [] };
    return null;
}

async function endGame(result) {
    active = false;
    gameOver = true;
    var time = Math.floor((Date.now() - gameStartTime) / 1000);
    cells.forEach(function(c) { c.disabled = true; });
    gameResult.style.display = 'block';
    totalGames++;

    if (result.winner === 'draw') {
        gameResult.className = 'game-result draw';
        gameResult.textContent = 'Durang! (' + time + 's)';
        scoreDraw++;
        addXP(5);
        sfxDraw();
        addHistoryItem('Durang', 'draw', time);
    } else if (result.winner === 'X') {
        gameResult.className = 'game-result win';
        scoreX++;
        if (mode === 'offline') {
            gameResult.textContent = 'X yutdi! (' + time + 's)';
        } else {
            gameResult.textContent = 'Siz yutdingiz! (' + time + 's)';
            winStreak++;
            addXP(Math.floor(botDifficulty / 2) + 20);
            sfxWin();
            if (typeof confetti === 'function') {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#1a73e8','#8ab4f8','#34a853','#fbbf24','#8b5cf6'] });
            }
        }
        addHistoryItem(mode === 'offline' ? 'X g\'alaba' : 'G\'alaba', 'win', time);
    } else if (result.winner === 'O') {
        gameResult.className = 'game-result lose';
        scoreO++;
        if (mode === 'offline') {
            gameResult.textContent = 'O yutdi! (' + time + 's)';
        } else {
            gameResult.textContent = 'Robot yutdi! (' + time + 's)';
            winStreak = 0;
            sfxLose();
        }
        addHistoryItem(mode === 'offline' ? 'O g\'alaba' : 'Mag\'lubiyat', 'lose', time);
    }

    if (result.cells && result.cells.length > 0 && result.winner !== 'draw') {
        result.cells.forEach(function(idx) {
            var cell = document.querySelector('.cell[data-idx="' + idx + '"]');
            if (cell) cell.classList.add('win');
        });
    }
    gameScoreX.textContent = scoreX;
    gameScoreO.textContent = scoreO;
    updateStatsUI();
    saveStatsToLocal();
    saveStatsToCloud();
}

function handleCellClick(idx) {
    if (!active || board[idx] || gameOver) return;
    if (mode === 'bot' && turn !== 'X') return;
    makeMove(idx, turn);
    var result = checkWinner();
    if (result) {
        endGame(result);
    } else {
        turn = turn === 'X' ? 'O' : 'X';
        turnDot(turn.toLowerCase());
        turnText.textContent = 'Navbat: ' + turn;
        if (mode === 'bot' && turn === 'O' && !gameOver) botMove();
    }
}

function botMove() {
    botThinking.style.display = 'flex';
    cells.forEach(function(c) { c.style.pointerEvents = 'none'; });
    var delay = 400 + Math.random() * 700;
    botThinkingTimeout = setTimeout(function() {
        botThinking.style.display = 'none';
        cells.forEach(function(c) { c.style.pointerEvents = 'auto'; });
        var idx = findBotMove();
        if (idx >= 0 && !gameOver) {
            makeMove(idx, 'O');
            var result = checkWinner();
            if (result) {
                endGame(result);
            } else {
                turn = 'X';
                turnDot('x');
                turnText.textContent = 'Navbat: X';
            }
        }
    }, delay);
}

function findBotMove() {
    var emptyCells = board.map(function(v, i) { return v === '' ? i : -1; }).filter(function(i) { return i >= 0; });
    if (emptyCells.length === 0) return -1;
    if (botDifficulty === 100) return findBestMove('O');
    return Math.random() * 100 < botDifficulty ? findBestMove('O') : emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function findBestMove(player) {
    var opponent = player === 'O' ? 'X' : 'O';
    var lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (var i = 0; i < lines.length; i++) {
        var a = lines[i][0], b = lines[i][1], c = lines[i][2];
        if (board[a] === player && board[b] === player && board[c] === '') return c;
        if (board[a] === player && board[c] === player && board[b] === '') return b;
        if (board[b] === player && board[c] === player && board[a] === '') return a;
    }
    for (var j = 0; j < lines.length; j++) {
        var d = lines[j][0], e = lines[j][1], f = lines[j][2];
        if (board[d] === opponent && board[e] === opponent && board[f] === '') return f;
        if (board[d] === opponent && board[f] === opponent && board[e] === '') return e;
        if (board[e] === opponent && board[f] === opponent && board[d] === '') return d;
    }
    if (board[4] === '') return 4;
    var corners = [0,2,6,8].filter(function(i) { return board[i] === ''; });
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    var empty = board.map(function(v, i) { return v === '' ? i : -1; }).filter(function(i) { return i >= 0; });
    return empty.length > 0 ? empty[Math.floor(Math.random() * empty.length)] : -1;
}

// ==================== RESTART & BACK ====================
restartBtn.addEventListener('click', function() {
    clearTimeout(botThinkingTimeout);
    startGame(mode);
    sfxClick();
});

backToLobbyBtn.addEventListener('click', function() {
    clearTimeout(botThinkingTimeout);
    active = false;
    gameOver = false;
    gameView.style.display = 'none';
    lobbyView.style.display = 'block';
    updateStatsUI();
    renderHistory();
    sfxClick();
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && gameView.style.display !== 'none') {
        backToLobbyBtn.click();
    }
    if (e.key === 'r' && gameView.style.display !== 'none' && gameOver) {
        restartBtn.click();
    }
});

// ==================== CELL CLICK ====================
bingoGrid.addEventListener('click', function(e) {
    var cell = e.target.closest('.cell');
    if (cell) {
        handleCellClick(parseInt(cell.dataset.idx, 10));
    }
});

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var triggerName = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var triggerAvatar = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    if (user) {
        var dn = user.displayName || user.email.split('@')[0] || 'User';
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
async function init() {
    console.log('MRDEV Bingo v4.1 ishga tushmoqda...');
    initTheme();
    updateDifficultyLabel();
    loadStatsFromLocal();
    updateStatsUI();
    renderHistory();

    initAuth(async function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) {
            await loadStatsFromCloud();
            await loadHistoryFromCloud();
            updateStatsUI();
            renderHistory();
            showToast('Xush kelibsiz, ' + (user.displayName || 'User') + '!', 'success');
        } else {
            loadStatsFromLocal();
            updateStatsUI();
            renderHistory();
        }
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('Bingo tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
