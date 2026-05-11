// ==================== MRDEV DROPDOWN SYSTEM v3.4 ====================
// ROOT: To'liq dropdown (profil, ID, tablar, grid, parol xabarlari, chiqish)
// MINI: Faqat profil (ism + email) + katta 3x3 grid — boshqa hech narsa yo'q

import { showPassNotifications } from './features/pass-notifications.js';
import { logout } from './core/auth.js';

// ==================== BAZA YO'L ANIQLASH ====================
function getBasePath() {
    const path = window.location.pathname;
    // Agar mini yoki popular papkasida bo'lsa, 2 qavat yuqoriga (../../)
    if (path.includes('/mini/') || path.includes('/popular/')) {
        return '../..';
    }
    // Root da bo'lsa (./)
    return '.';
}

function getAssetsPath() {
    const path = window.location.pathname;
    if (path.includes('/mini/') || path.includes('/popular/')) {
        return '../..';
    }
    return '.';
}

const BASE = getBasePath();
const ASSETS = getAssetsPath();

const APPS_LIST = {
    popular: [
        { name: 'AI', icon: 'ai', path: `${BASE}/popular/ai/` },
        { name: 'GroupBoard', icon: 'groupboard', path: `${BASE}/popular/groupboard/` },
        { name: 'LearnCode', icon: 'learncode', path: `${BASE}/popular/learncode/` },
        { name: 'MrGram', icon: 'mrgram', path: `${BASE}/popular/mrgram/` },
        { name: 'NotifyHub', icon: 'notifyhub', path: `${BASE}/popular/notifyhub/` },
        { name: 'Typing', icon: 'typing', path: `${BASE}/popular/typing/` },
        { name: 'Security', icon: 'security', path: `${BASE}/popular/security/` },
        { name: 'CodeStudio', icon: 'codestudio', path: `${BASE}/popular/codestudio/` },
        { name: 'VideoHub', icon: 'videohub', path: `${BASE}/popular/videohub/` },
        { name: 'Weather', icon: 'weather', path: `${BASE}/popular/weather/` },
        { name: 'Notes', icon: 'notes', path: `${BASE}/popular/notes/` },
        { name: 'Todo', icon: 'todo', path: `${BASE}/popular/todo/` }
    ],
    mini: [
        { name: 'Calculator', icon: 'calculator', path: `${BASE}/mini/calculator/` },
        { name: 'Bingo', icon: 'bingo', path: `${BASE}/mini/bingo/` },
        { name: 'Board', icon: 'board', path: `${BASE}/mini/board/` },
        { name: 'Music', icon: 'music', path: `${BASE}/mini/music/` },
        { name: 'SplitView', icon: 'splitview', path: `${BASE}/mini/splitview/` },
        { name: 'Examer', icon: 'examer', path: `${BASE}/mini/examer/` },
        { name: 'Clock', icon: 'clock', path: `${BASE}/mini/clock/` },
        { name: 'Stopwatch', icon: 'stopwatch', path: `${BASE}/mini/stopwatch/` },
        { name: 'Timer', icon: 'timer', path: `${BASE}/mini/timer/` },
        { name: 'QR Code', icon: 'qr', path: `${BASE}/mini/qr/` }
    ]
};

// ==================== IKONKA YASASH ====================
function getAppIconHTML(app, size) {
    const isLarge = size === 'large';
    const prefix = isLarge ? '-mini' : '';
    const iconSize = isLarge ? '48px' : '36px';
    const imgSize = isLarge ? '26px' : '20px';

    return `
        <div class="dropdown-app-icon-grid${prefix}" style="width:${iconSize};height:${iconSize};">
            <img
                src="${ASSETS}/assets/favicons/${app.icon}.svg"
                alt="${app.name}"
                data-fallback="${app.name.substring(0, 2).toUpperCase()}"
                class="dropdown-icon-img-grid${prefix}"
                style="width:${imgSize};height:${imgSize};"
            >
        </div>
    `;
}

function attachIconFallbacks(container) {
    container.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', function () {
            const fallback = this.getAttribute('data-fallback') || '??';
            const parent = this.parentElement;
            parent.innerHTML = `<span style="font-size:12px;font-weight:600;color:var(--text-3);">${fallback}</span>`;
            parent.style.display = 'flex';
            parent.style.alignItems = 'center';
            parent.style.justifyContent = 'center';
        });
    });
}

// ====================================================================
//  ROOT DROPDOWN — profil, ID, tablar, grid, parol xabarlari, chiqish
// ====================================================================
export function initDropdown(user) {
    // 1. DOM yaratish
    if (!document.getElementById('mrdevDropdown')) {
        const html = `
            <div class="mrdev-dropdown-overlay" id="mrdevDropdownOverlay"></div>
            <div class="mrdev-dropdown" id="mrdevDropdown">
                <div class="dropdown-profile">
                    <div class="dropdown-avatar" id="dropdownAvatar"></div>
                    <div class="dropdown-name" id="dropdownName"></div>
                    <div class="dropdown-email" id="dropdownEmail"></div>
                    <div class="dropdown-mrdev-id" id="dropdownMrdevId"></div>
                </div>
                <div class="dropdown-tabs">
                    <button class="dropdown-tab active" data-tab="all">Barcha</button>
                    <button class="dropdown-tab" data-tab="popular">Popular</button>
                    <button class="dropdown-tab" data-tab="mini">Mini</button>
                </div>
                <div class="dropdown-apps" id="dropdownApps"></div>
                <div class="dropdown-menu-items">
                    <a href="#" class="dropdown-menu-item" id="notifMenuItem">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                        Parol xabarlari
                    </a>
                    <button class="dropdown-menu-item danger" id="logoutMenuItem">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Chiqish
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // 2. Foydalanuvchi ma'lumotlarini yangilash
    updateRootUserInfo(user);

    // 3. Tablar
    document.querySelectorAll('#mrdevDropdown .dropdown-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('#mrdevDropdown .dropdown-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderRootAppsGrid(this.dataset.tab);
        });
    });

    // 4. Grid
    renderRootAppsGrid('all');

    // 5. Trigger
    setupRootTrigger(user);

    // 6. Menu harakatlari
    document.getElementById('notifMenuItem')?.addEventListener('click', function (e) {
        e.preventDefault();
        closeRootDropdown();
        showPassNotifications();
    });

    document.getElementById('logoutMenuItem')?.addEventListener('click', function () {
        closeRootDropdown();
        logout();
    });

    // 7. Overlay va trigger eventlari
    const overlay = document.getElementById('mrdevDropdownOverlay');
    const dropdown = document.getElementById('mrdevDropdown');
    const trigger = document.getElementById('mrdevUserTrigger');

    trigger?.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.contains('show') ? closeRootDropdown() : openRootDropdown();
    });

    overlay?.addEventListener('click', closeRootDropdown);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && dropdown?.classList.contains('show')) {
            closeRootDropdown();
        }
    });

    document.addEventListener('click', function (e) {
        if (dropdown?.classList.contains('show') && !dropdown.contains(e.target) && trigger && !trigger.contains(e.target)) {
            closeRootDropdown();
        }
    });
}

function updateRootUserInfo(user) {
    const avatar = document.getElementById('dropdownAvatar');
    const name = document.getElementById('dropdownName');
    const email = document.getElementById('dropdownEmail');
    const mrdevId = document.getElementById('dropdownMrdevId');
    const notifItem = document.getElementById('notifMenuItem');
    const logoutItem = document.getElementById('logoutMenuItem');

    if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const userEmail = user.email || '';
        const photoURL = user.photoURL;
        const userId = localStorage.getItem('mrdev_user_id') || '';

        if (avatar) {
            avatar.innerHTML = photoURL
                ? `<img src="${photoURL}" alt="${displayName}">`
                : displayName.charAt(0).toUpperCase();
        }
        if (name) name.textContent = displayName;
        if (email) email.textContent = userEmail;
        if (mrdevId) {
            mrdevId.textContent = userId;
            mrdevId.style.display = 'block';
        }
        if (notifItem) notifItem.style.display = 'flex';
        if (logoutItem) logoutItem.style.display = 'flex';
    } else {
        if (avatar) avatar.textContent = '?';
        if (name) name.textContent = 'Mehmon';
        if (email) email.textContent = 'Hisobga kiring';
        if (mrdevId) mrdevId.style.display = 'none';
        if (notifItem) notifItem.style.display = 'none';
        if (logoutItem) logoutItem.style.display = 'none';
    }
}

function renderRootAppsGrid(category) {
    const container = document.getElementById('dropdownApps');
    if (!container) return;

    let apps = category === 'all' ? [...APPS_LIST.popular, ...APPS_LIST.mini] : (APPS_LIST[category] || []);

    container.innerHTML = `
        <div class="dropdown-apps-grid">
            ${apps.map(app => `
                <a href="${app.path}" class="dropdown-app-grid-item" title="${app.name}">
                    ${getAppIconHTML(app, 'small')}
                    <span class="dropdown-app-grid-name">${app.name}</span>
                </a>
            `).join('')}
        </div>
    `;

    attachIconFallbacks(container);
}

function setupRootTrigger(user) {
    const avatarEl = document.querySelector('#mrdevUserTrigger .trigger-avatar');
    const nameEl = document.querySelector('#mrdevUserTrigger .trigger-name');

    if (user && avatarEl && nameEl) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        avatarEl.innerHTML = user.photoURL
            ? `<img src="${user.photoURL}" alt="${displayName}">`
            : displayName.charAt(0).toUpperCase();
        nameEl.textContent = displayName;
    }
}

function openRootDropdown() {
    document.getElementById('mrdevDropdownOverlay')?.classList.add('show');
    document.getElementById('mrdevDropdown')?.classList.add('show');
}

function closeRootDropdown() {
    document.getElementById('mrdevDropdownOverlay')?.classList.remove('show');
    document.getElementById('mrdevDropdown')?.classList.remove('show');
}

// ====================================================================
//  MINI APPS DROPDOWN — faqat profil (ism + email) + katta 3x3 grid
// ====================================================================
export function initMiniDropdown(user) {
    // 1. DOM yaratish
    if (!document.getElementById('mrdevDropdownMini')) {
        const html = `
            <div class="mrdev-dropdown-overlay" id="mrdevDropdownOverlayMini"></div>
            <div class="mrdev-dropdown-mini" id="mrdevDropdownMini">
                <div class="dropdown-profile-mini">
                    <div class="dropdown-avatar" id="dropdownAvatarMini"></div>
                    <div>
                        <div class="dropdown-name" id="dropdownNameMini"></div>
                        <div class="dropdown-email" id="dropdownEmailMini"></div>
                    </div>
                </div>
                <div class="dropdown-apps" id="dropdownAppsMini"></div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    // 2. Foydalanuvchi ma'lumotlari
    updateMiniUserInfo(user);

    // 3. Katta grid
    renderMiniAppsGrid();

    // 4. Trigger
    setupMiniTrigger(user);

    // 5. Eventlar
    const overlay = document.getElementById('mrdevDropdownOverlayMini');
    const dropdown = document.getElementById('mrdevDropdownMini');
    const trigger = document.getElementById('mrdevUserTriggerMini');

    trigger?.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.contains('show') ? closeMiniDropdown() : openMiniDropdown();
    });

    overlay?.addEventListener('click', closeMiniDropdown);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && dropdown?.classList.contains('show')) {
            closeMiniDropdown();
        }
    });

    document.addEventListener('click', function (e) {
        if (dropdown?.classList.contains('show') && !dropdown.contains(e.target) && trigger && !trigger.contains(e.target)) {
            closeMiniDropdown();
        }
    });
}

function updateMiniUserInfo(user) {
    const avatar = document.getElementById('dropdownAvatarMini');
    const name = document.getElementById('dropdownNameMini');
    const email = document.getElementById('dropdownEmailMini');

    if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const userEmail = user.email || '';

        if (avatar) {
            avatar.innerHTML = user.photoURL
                ? `<img src="${user.photoURL}" alt="${displayName}">`
                : displayName.charAt(0).toUpperCase();
        }
        if (name) name.textContent = displayName;
        if (email) email.textContent = userEmail;
    } else {
        if (avatar) avatar.textContent = '?';
        if (name) name.textContent = 'Mehmon';
        if (email) email.textContent = 'Hisobga kiring';
    }
}

function renderMiniAppsGrid() {
    const container = document.getElementById('dropdownAppsMini');
    if (!container) return;

    const allApps = [...APPS_LIST.popular, ...APPS_LIST.mini];

    container.innerHTML = `
        <div class="dropdown-apps-grid-mini">
            ${allApps.map(app => `
                <a href="${app.path}" class="dropdown-app-grid-item-mini" title="${app.name}">
                    ${getAppIconHTML(app, 'large')}
                    <span class="dropdown-app-grid-name-mini">${app.name}</span>
                </a>
            `).join('')}
        </div>
    `;

    attachIconFallbacks(container);
}

function setupMiniTrigger(user) {
    const avatarEl = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    const nameEl = document.querySelector('#mrdevUserTriggerMini .trigger-name');

    if (user && avatarEl && nameEl) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        avatarEl.innerHTML = user.photoURL
            ? `<img src="${user.photoURL}" alt="${displayName}">`
            : displayName.charAt(0).toUpperCase();
        nameEl.textContent = displayName;
    }
}

function openMiniDropdown() {
    document.getElementById('mrdevDropdownOverlayMini')?.classList.add('show');
    document.getElementById('mrdevDropdownMini')?.classList.add('show');
}

function closeMiniDropdown() {
    document.getElementById('mrdevDropdownOverlayMini')?.classList.remove('show');
    document.getElementById('mrdevDropdownMini')?.classList.remove('show');
}

export { openRootDropdown as openDropdown, closeRootDropdown as closeDropdown };
