// ==================== MRDEV MUSIC v2.0 — Firebase + Supabase + Local Sync ====================
import { initAuth, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { getFirebase } from '../../assets/js/firebase-helper.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Firebase
var _db = null;
function getDB() {
    if (!_db) { var fb = getFirebase(); _db = fb.db; }
    return _db;
}

import { collection, addDoc, query, orderBy, limit, startAfter, getDocs, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Supabase
var SUPABASE_URL = "window.__ENV__?.SUPABASE_URL || """;
var SUPABASE_KEY = "window.__ENV__?.SUPABASE_KEY || """;
var supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== DOM ====================
var $ = function(id) { return document.getElementById(id); };
var toast = $('toast');

// ==================== STATE ====================
var currentUser = null;
var mediaRecorder, chunks = [], activeBlob, timerInterval;
var audioCtx = null;
var currentAudio = null;
var currentPlayingId = null;
var isDragging = false;
var lastVisibleDoc = null;
var isFetchingList = false;
var hasMoreDocs = true;
var studioStream, studioAnz, studioData;
var randomNextEnabled = true;
var allAudioIds = [];

// ==================== HELPERS ====================
var formatTime = function(s) {
    if (!s || isNaN(s)) return "00:00";
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
};

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

// ==================== PAGES ====================
document.querySelectorAll('.music-nav-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        document.querySelectorAll('.music-nav-item').forEach(function(n) { n.classList.remove('active'); });
        $(btn.dataset.page).classList.add('active');
        btn.classList.add('active');
    });
});

// ==================== LOAD AUDIOS ====================
async function loadAllAudioIds() {
    try {
        var db = getDB();
        var uid = getUserId();
        if (!uid || !db) return;
        var q = query(collection(db, 'users', uid, 'music'), orderBy('createdAt', 'desc'));
        var snap = await getDocs(q);
        allAudioIds = snap.docs.map(function(d) { return d.id; });
    } catch(e) { console.error('Error loading all IDs:', e); }
}

async function loadAudioList(isNext) {
    isNext = isNext || false;
    if (isFetchingList || !hasMoreDocs) return;
    isFetchingList = true;
    var indicator = $('load-more-indicator');
    if (indicator) indicator.style.display = 'block';

    try {
        var db = getDB();
        var uid = getUserId();
        if (!uid || !db) { isFetchingList = false; return; }

        var q = query(collection(db, 'users', uid, 'music'), orderBy('createdAt', 'desc'), limit(10));
        if (isNext && lastVisibleDoc) {
            q = query(collection(db, 'users', uid, 'music'), orderBy('createdAt', 'desc'), startAfter(lastVisibleDoc), limit(5));
        }

        var snap = await getDocs(q);
        if (snap.empty) {
            hasMoreDocs = false;
        } else {
            lastVisibleDoc = snap.docs[snap.docs.length - 1];
            var list = $('audio-list');
            snap.forEach(function(d) {
                if (!$('card-' + d.id)) {
                    list.appendChild(renderCard(d.id, d.data()));
                    if (allAudioIds.indexOf(d.id) === -1) allAudioIds.push(d.id);
                }
            });
            if (!list.children.length) {
                list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3);">Hali musiqalar yo\'q</div>';
            }
        }
    } catch(e) { console.error('Load error:', e); }
    if (indicator) indicator.style.display = 'none';
    isFetchingList = false;
}

// ==================== RENDER CARD ====================
function renderCard(id, data) {
    var div = document.createElement('div');
    div.className = 'audio-card';
    div.id = 'card-' + id;
    div.innerHTML = '<div class="card-meta">' +
        '<h4>' + (data.name || 'Audio') + '</h4>' +
        '<p>' + (data.createdAt && data.createdAt.toDate ? new Date(data.createdAt.toDate()).toLocaleString() : '') + ' | ' + (data.size || '') + '</p></div>' +
        '<div class="waveform-visualizer" id="wf-' + id + '">' + Array(50).fill('<div class="w-bar"></div>').join('') + '</div>' +
        '<div id="time-' + id + '">00:00 / 00:00</div>' +
        '<div class="progress-box" id="pbox-' + id + '"><div class="progress-fill" id="pf-' + id + '"></div></div>' +
        '<div class="controls">' +
            '<button class="btn-svg" id="loop-btn-' + id + '"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg></button>' +
            '<button class="btn-svg" id="skip-back-' + id + '"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg></button>' +
            '<button class="btn-svg btn-play" id="play-btn-' + id + '"><svg class="svg-icon" id="ic-' + id + '" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
            '<button class="btn-svg" id="skip-fwd-' + id + '"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg></button>' +
            '<button class="btn-svg" id="delete-btn-' + id + '" style="color:var(--red);"><svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div>';

    div.querySelector('#play-btn-' + id).onclick = function(e) { playAudio(id, e.currentTarget, data); };
    div.querySelector('#pbox-' + id).onmousedown = function(e) { seekAudio(e, id); };
    div.querySelector('#pbox-' + id).ontouchstart = function(e) { seekAudio(e, id); };
    div.querySelector('#loop-btn-' + id).onclick = function(e) { toggleLoop(id, e.currentTarget); };
    div.querySelector('#skip-back-' + id).onclick = function() { skipAudio(id, -10); };
    div.querySelector('#skip-fwd-' + id).onclick = function() { skipAudio(id, 10); };
    div.querySelector('#delete-btn-' + id).onclick = function() { deleteAudio(id, data); };

    return div;
}

// ==================== DELETE ====================
async function deleteAudio(id, data) {
    if (!confirm('"' + (data.name || 'Audio') + '" ni o\'chirish?')) return;
    try {
        if (data.storagePath) {
            await supabase.storage.from('videos').remove([data.storagePath]);
        }
        var db = getDB();
        var uid = getUserId();
        if (uid && db) {
            await deleteDoc(doc(db, 'users', uid, 'music', id));
        }
        var card = $('card-' + id);
        if (card) card.remove();
        allAudioIds = allAudioIds.filter(function(a) { return a !== id; });
        showToast('O\'chirildi', 'success');
    } catch(e) {
        console.error('Delete error:', e);
        showToast('O\'chirishda xatolik', 'error');
    }
}

// ==================== PLAY AUDIO ====================
async function playAudio(id, btn, cardData) {
    var icon = $('ic-' + id);
    var bars = document.querySelectorAll('#wf-' + id + ' .w-bar');
    var fill = $('pf-' + id);
    var timeEl = $('time-' + id);

    if (currentPlayingId === id && currentAudio) {
        if (currentAudio.paused) {
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            currentAudio.play();
            icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
            startViz(currentAudio, currentAudio.anz, currentAudio.dat, id, bars, fill);
        } else {
            currentAudio.pause();
            icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }
        return;
    }

    if (currentAudio) { currentAudio.pause(); currentAudio.src = ''; }
    if (currentPlayingId) {
        var oldIcon = $('ic-' + currentPlayingId);
        if (oldIcon) oldIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }

    currentPlayingId = id;

    var spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.id = 'spin-' + id;
    btn.appendChild(spinner);
    icon.style.display = 'none';

    try {
        var audio = new Audio(cardData.supabaseUrl);
        currentAudio = audio;

        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        var source = audioCtx.createMediaElementSource(audio);
        var analyzer = audioCtx.createAnalyser();
        source.connect(analyzer);
        analyzer.connect(audioCtx.destination);
        analyzer.fftSize = 128;
        var data = new Uint8Array(analyzer.frequencyBinCount);
        audio.anz = analyzer;
        audio.dat = data;

        audio.onloadedmetadata = function() {
            if (timeEl) timeEl.innerText = '00:00 / ' + formatTime(audio.duration);
        };

        spinner.remove();
        icon.style.display = 'block';
        icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        audio.play();
        startViz(audio, analyzer, data, id, bars, fill);

        audio.onended = function() {
            if (currentPlayingId === id) {
                icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
                fill.style.width = '0%';
                bars.forEach(function(b) { b.classList.remove('active'); b.style.height = '5px'; });
                if (!audio.loop) playRandomNext();
            }
        };
    } catch(err) {
        console.error('Play error:', err);
        spinner.remove();
        icon.style.display = 'block';
        showToast('Yuklashda xatolik', 'error');
    }
}

function startViz(audio, analyzer, dataArray, id, bars, fill) {
    var timeEl = $('time-' + id);
    var lastSec = -1;

    function draw() {
        if (!audio.paused && currentPlayingId === id) {
            requestAnimationFrame(draw);
            analyzer.getByteFrequencyData(dataArray);
            var currentSec = Math.floor(audio.currentTime);
            if (timeEl && currentSec !== lastSec) {
                lastSec = currentSec;
                timeEl.innerText = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
                timeEl.classList.remove('time-update');
                void timeEl.offsetWidth;
                timeEl.classList.add('time-update');
            }
            var center = Math.floor(bars.length / 2);
            bars.forEach(function(b, i) {
                var dist = Math.abs(i - center);
                var h = (dataArray[dist % dataArray.length] / 3) + 5;
                b.style.height = Math.max(5, h * (1 - (dist / center) * 0.7)) + 'px';
                b.classList.add('active');
            });
            if (!isDragging) fill.style.width = (audio.currentTime / audio.duration) * 100 + '%';
        }
    }
    draw();
}

function seekAudio(e, id) {
    if (currentPlayingId !== id || !currentAudio || !currentAudio.duration) return;
    var box = $('pbox-' + id);
    var fill = $('pf-' + id);
    var update = function(clientX) {
        var rect = box.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        fill.style.width = (p * 100) + '%';
        currentAudio.currentTime = p * currentAudio.duration;
    };
    var onMove = function(me) { isDragging = true; update(me.touches ? me.touches[0].clientX : me.clientX); };
    var onStop = function() { isDragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('touchmove', onMove); };
    update(e.touches ? e.touches[0].clientX : e.clientX);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onStop, { once: true });
    window.addEventListener('touchend', onStop, { once: true });
}

function skipAudio(id, sec) {
    if (currentPlayingId === id && currentAudio) currentAudio.currentTime += sec;
}

function toggleLoop(id, btn) {
    if (currentPlayingId === id && currentAudio) {
        currentAudio.loop = !currentAudio.loop;
        btn.classList.toggle('loop-active', currentAudio.loop);
    }
}

function playRandomNext() {
    if (!randomNextEnabled || allAudioIds.length === 0) return;
    if (currentAudio && currentAudio.loop) return;
    var currentIdx = allAudioIds.indexOf(currentPlayingId);
    var nextIdx = currentIdx;
    while (nextIdx === currentIdx && allAudioIds.length > 1) {
        nextIdx = Math.floor(Math.random() * allAudioIds.length);
    }
    var nextId = allAudioIds[nextIdx];
    var nextCard = $('card-' + nextId);
    var nextPlayBtn = nextCard ? nextCard.querySelector('#play-btn-' + nextId) : null;
    if (nextPlayBtn && nextId) {
        var nameEl = nextCard.querySelector('.card-meta h4');
        var data = { name: nameEl ? nameEl.innerText : 'Audio' };
        nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { playAudio(nextId, nextPlayBtn, data); }, 500);
    }
}

// ==================== RECORD ====================
$('rec-trigger').addEventListener('click', async function() {
    var btn = $('rec-trigger');
    var sViz = $('studio-viz');

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            studioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(studioStream);
            var sCtx = new (AudioContext || window.webkitAudioContext)();
            var sSrc = sCtx.createMediaStreamSource(studioStream);
            studioAnz = sCtx.createAnalyser();
            sSrc.connect(studioAnz);
            studioAnz.fftSize = 64;
            studioData = new Uint8Array(studioAnz.frequencyBinCount);

            sViz.innerHTML = Array(30).fill('<div class="s-bar"></div>').join('');
            var sBars = sViz.querySelectorAll('.s-bar');

            function drawStudio() {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    requestAnimationFrame(drawStudio);
                    studioAnz.getByteFrequencyData(studioData);
                    sBars.forEach(function(b, i) {
                        var h = (studioData[i % studioData.length] / 2.5) + 4;
                        b.style.height = h + 'px';
                        b.style.background = 'var(--red)';
                    });
                }
            }

            chunks = [];
            mediaRecorder.ondataavailable = function(e) { chunks.push(e.data); };
            mediaRecorder.onstop = function() {
                activeBlob = new Blob(chunks, { type: 'audio/webm' });
                $('save-cloud').style.display = 'block';
                studioStream.getTracks().forEach(function(t) { t.stop(); });
            };

            mediaRecorder.start();
            startTimer();
            drawStudio();
            btn.innerHTML = '<svg class="svg-icon" style="fill:var(--red);color:var(--red);" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
        } catch(e) {
            showToast('Mikrofon ruxsati kerak!', 'error');
        }
    } else {
        mediaRecorder.stop();
        clearInterval(timerInterval);
        btn.innerHTML = '<svg class="svg-icon" style="fill:var(--red);color:var(--red);" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg>';
    }
});

// ==================== FILE UPLOAD ====================
document.getElementById('file-in').addEventListener('change', function() {
    if (this.files[0]) {
        activeBlob = this.files[0];
        $('rec-name').value = this.files[0].name.split('.')[0];
        $('save-cloud').style.display = 'block';
    }
});

// ==================== SAVE TO SUPABASE ====================
$('save-cloud').addEventListener('click', async function() {
    if (!currentUser) { showToast('Avval hisobga kiring', 'error'); return; }
    if (!activeBlob) { showToast('Avval audio yozing yoki yuklang', 'error'); return; }

    var name = $('rec-name').value || 'Audio';
    var upTxt = $('up-txt');
    var upBar = $('up-bar');

    upTxt.style.display = 'block';
    upBar.style.width = '0%';

    try {
        var timestamp = Date.now();
        var uid = getUserId();
        var fileName = 'music/' + uid + '/' + timestamp + '_' + name + '.webm';
        var bytes = activeBlob.size;
        var sizeStr = bytes >= 1000000 ? (bytes / 1000000).toFixed(1) + ' MB' : (bytes / 1000).toFixed(1) + ' KB';

        var result = await supabase.storage.from('videos').upload(fileName, activeBlob, {
            cacheControl: '3600',
            upsert: false
        });

        if (result.error) throw result.error;

        var publicUrlData = supabase.storage.from('videos').getPublicUrl(result.data.path);
        var publicUrl = publicUrlData.data.publicUrl;

        var db = getDB();
        if (uid && db) {
            await addDoc(collection(db, 'users', uid, 'music'), {
                name: name,
                size: sizeStr,
                supabaseUrl: publicUrl,
                storagePath: result.data.path,
                createdAt: serverTimestamp()
            });
        }

        upBar.style.width = '100%';
        showToast('Musiqa saqlandi!', 'success');
        setTimeout(function() { location.reload(); }, 500);
    } catch(e) {
        console.error('Upload error:', e);
        showToast('Yuklashda xatolik: ' + e.message, 'error');
    }
});

// ==================== TIMER ====================
function startTimer() {
    var s = 0;
    var tEl = $('timer');
    tEl.innerText = '00:00';
    timerInterval = setInterval(function() {
        s++;
        var m = Math.floor(s / 60);
        tEl.innerText = String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
}

// ==================== INFINITE SCROLL ====================
window.addEventListener('scroll', function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        loadAudioList(true);
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
    console.log('MRDEV Music v2.0 ishga tushmoqda...');
    initTheme();

    initAuth(async function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) {
            await loadAllAudioIds();
            loadAudioList(false);
        } else {
            $('audio-list').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3);">Musiqalarni yuklash uchun hisobga kiring</div>';
        }
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('Music tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
