// ==================== MRDEV SPLITVIEW v2.0 — Firebase + Local Sync ====================
import { initAuth, smartSave, smartLoad, smartDelete, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';

var currentUser = null;
var currentGrid = '1x1';
var panelCount = 1;
var currentPanelId = null;

// DOM
var $ = function(id) { return document.getElementById(id); };
var splitGrid = $('splitGrid');
var urlModal = $('urlModal');
var toast = $('toast');

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

// ==================== AUTH ====================
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
        loadCloudBookmarks();
    } else {
        if (triggerName) triggerName.textContent = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
        loadLocalBookmarks();
    }
}

// ==================== GRID ====================
document.querySelectorAll('.grid-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.grid-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentGrid = btn.dataset.grid;
        var sizes = { '1x1': 1, '2x2': 4, '3x3': 9 };
        panelCount = sizes[currentGrid];
        splitGrid.dataset.grid = currentGrid;
        renderPanels();
    });
});

function renderPanels() {
    splitGrid.innerHTML = '';
    for (var i = 1; i <= panelCount; i++) {
        var panel = document.createElement('div');
        panel.className = 'panel';
        panel.id = 'panel' + i;
        panel.innerHTML = '<div class="panel-placeholder" id="placeholder' + i + '">' +
            '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>' +
            '<span style="font-size:12px;">Video qo\'shish</span></div>' +
            '<iframe id="iframe' + i + '" src="" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="display:none;"></iframe>';
        panel.addEventListener('click', function(panelId) { return function() { openUrlDialog(panelId); }; }(i));
        splitGrid.appendChild(panel);
    }
    loadSavedUrls();
}

// ==================== URL DIALOG ====================
function openUrlDialog(panelId) {
    currentPanelId = panelId;
    $('urlInput').value = '';
    urlModal.classList.add('show');
    setTimeout(function() { $('urlInput').focus(); }, 100);
}

$('cancelUrl').addEventListener('click', function() { urlModal.classList.remove('show'); });
urlModal.addEventListener('click', function(e) { if (e.target === urlModal) urlModal.classList.remove('show'); });

$('loadUrl').addEventListener('click', function() {
    var url = $('urlInput').value.trim();
    if (!url) return;
    loadVideo(currentPanelId, url);
    urlModal.classList.remove('show');
    saveUrlToStorage(currentPanelId, url);
});

$('urlInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        var url = e.target.value.trim();
        if (!url) return;
        loadVideo(currentPanelId, url);
        urlModal.classList.remove('show');
        saveUrlToStorage(currentPanelId, url);
    }
});

// ==================== YOUTUBE HELPER ====================
function extractYouTubeId(url) {
    if (!url) return null;
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideo(panelId, url) {
    var videoId = extractYouTubeId(url);
    var iframe = $('iframe' + panelId);
    var placeholder = $('placeholder' + panelId);
    if (!iframe) return;

    if (videoId) {
        iframe.src = 'https://www.youtube.com/embed/' + videoId + '?enablejsapi=1&autoplay=0&rel=0&controls=1';
    } else {
        iframe.src = url;
    }

    iframe.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
}

// ==================== URL STORAGE ====================
function saveUrlToStorage(panelId, url) {
    var localUrls = JSON.parse(localStorage.getItem('splitview_urls') || '{}');
    localUrls[panelId] = url;
    localStorage.setItem('splitview_urls', JSON.stringify(localUrls));

    if (currentUser) {
        smartSave('splitview_urls', 'splitview_cloud_urls', {
            panelId: String(panelId),
            url: url,
            grid: currentGrid,
            savedAt: new Date().toISOString()
        }).catch(function(e) { console.warn('Cloud URL save failed:', e); });
    }

    showToast('URL saqlandi', 'success');
}

function loadSavedUrls() {
    var localUrls = JSON.parse(localStorage.getItem('splitview_urls') || '{}');
    for (var i = 1; i <= panelCount; i++) {
        if (localUrls[i]) loadVideo(i, localUrls[i]);
    }

    if (currentUser) {
        smartLoad('splitview_urls', 'splitview_cloud_urls', function(items) {
            if (items && items.length > 0) {
                var merged = JSON.parse(JSON.stringify(localUrls));
                items.forEach(function(item) {
                    if (item.panelId && item.url && !merged[item.panelId]) {
                        merged[item.panelId] = item.url;
                        loadVideo(parseInt(item.panelId), item.url);
                    }
                });
                localStorage.setItem('splitview_urls', JSON.stringify(merged));
            }
        });
    }
}

// ==================== MUTE ALL ====================
$('muteAllBtn').addEventListener('click', function() {
    for (var i = 1; i <= panelCount; i++) {
        var iframe = $('iframe' + i);
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'command', func: 'mute', args: []
            }), '*');
        }
    }
    showToast('Ovozlar o\'chirildi');
});

// ==================== CLEAR ALL ====================
$('clearAllBtn').addEventListener('click', function() {
    if (!confirm('Barcha videolarni tozalash?')) return;

    for (var i = 1; i <= panelCount; i++) {
        var iframe = $('iframe' + i);
        var placeholder = $('placeholder' + i);
        if (iframe) { iframe.src = ''; iframe.style.display = 'none'; }
        if (placeholder) placeholder.style.display = 'flex';
    }

    localStorage.removeItem('splitview_urls');

    if (currentUser) {
        import('../../assets/js/firebase-helper.js').then(function(m) {
            m.clearAll('splitview_urls', 'splitview_cloud_urls');
        });
    }

    showToast('Tozalandi');
});

// ==================== BOOKMARK ====================
$('bookmarkBtn').addEventListener('click', function() {
    var panel = $('bookmarkPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

function loadCloudBookmarks() {
    var container = $('bookmarkList');
    if (!container) return;

    smartLoad('splitview_urls', 'splitview_cloud_urls', function(items) {
        if (!items || items.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);">Saqlangan URL\'lar yo\'q</div>';
            return;
        }

        var seen = {};
        var uniqueUrls = [];
        items.forEach(function(item) {
            if (!seen[item.url]) { seen[item.url] = true; uniqueUrls.push(item); }
        });

        container.innerHTML = uniqueUrls.slice(0, 20).map(function(item) {
            return '<div class="bookmark-item" data-url="' + (item.url || '') + '">' +
                '<div class="bookmark-url" title="' + (item.url || '') + '">' + (item.url || '').substring(0, 50) + '...</div>' +
                '<button class="bookmark-delete" data-url="' + (item.url || '') + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/></svg></button></div>';
        }).join('');

        container.querySelectorAll('.bookmark-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (!e.target.closest('.bookmark-delete')) {
                    var url = item.dataset.url;
                    if (url && currentPanelId) {
                        $('urlInput').value = url;
                        openUrlDialog(currentPanelId);
                    }
                }
            });
        });

        container.querySelectorAll('.bookmark-delete').forEach(function(btn) {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                var url = btn.dataset.url;
                var local = JSON.parse(localStorage.getItem('splitview_urls') || '{}');
                Object.keys(local).forEach(function(key) { if (local[key] === url) delete local[key]; });
                localStorage.setItem('splitview_urls', JSON.stringify(local));

                if (currentUser) {
                    var cloudItems = JSON.parse(localStorage.getItem('splitview_cloud_urls') || '[]');
                    var found = cloudItems.find(function(i) { return i.url === url; });
                    if (found && found.isCloud) {
                        await smartDelete('splitview_urls', 'splitview_cloud_urls', found.id, true);
                    }
                }
                loadCloudBookmarks();
                showToast('O\'chirildi');
            });
        });
    });
}

function loadLocalBookmarks() {
    var container = $('bookmarkList');
    if (!container) return;

    var local = JSON.parse(localStorage.getItem('splitview_urls') || '{}');
    var urls = Object.values(local).filter(Boolean);

    if (!urls.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);">Saqlangan URL\'lar yo\'q</div>';
        return;
    }

    var uniqueUrls = urls.filter(function(item, pos) { return urls.indexOf(item) === pos; });

    container.innerHTML = uniqueUrls.slice(0, 20).map(function(url) {
        return '<div class="bookmark-item" data-url="' + url + '"><div class="bookmark-url" title="' + url + '">' + url.substring(0, 50) + '...</div></div>';
    }).join('');

    container.querySelectorAll('.bookmark-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var url = item.dataset.url;
            if (url && currentPanelId) {
                $('urlInput').value = url;
                openUrlDialog(currentPanelId);
            }
        });
    });
}

$('bookmarkBtn').addEventListener('dblclick', async function() {
    var urls = JSON.parse(localStorage.getItem('splitview_urls') || '{}');
    var urlList = Object.values(urls).filter(Boolean);
    if (!urlList.length) { showToast('Avval video yuklang', 'error'); return; }
    if (!currentUser) { showToast('Hisobga kiring', 'error'); return; }

    try {
        for (var i = 0; i < urlList.length; i++) {
            await smartSave('splitview_urls', 'splitview_cloud_urls', {
                url: urlList[i], grid: currentGrid, savedAt: new Date().toISOString()
            });
        }
        showToast('Barcha URL\'lar saqlandi!', 'success');
        loadCloudBookmarks();
    } catch(e) { showToast('Xatolik', 'error'); }
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') urlModal.classList.remove('show');
});

// ==================== INIT ====================
function init() {
    console.log('MRDEV SplitView v2.0 ishga tushmoqda...');
    initTheme();
    renderPanels();

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('SplitView tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
