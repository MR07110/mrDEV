// ==================== MRDEV TAB SWITCHER ====================
import { renderAppGrid } from './grid.js';

let currentTab = 'all';

export const popularApps = [
    { name: "AI", icon: "ai.svg", path: "./popular/ai/" },
    { name: "Jamoaviy-Doska", icon: "groupboard.svg", path: "./popular/groupboard/" },
    { name: "LearnCode", icon: "learncode.svg", path: "./popular/learncode/" },
    { name: "MrGram", icon: "mrgram.svg", path: "./popular/mrgram/" },
    { name: "Xabarlar-Markazi", icon: "notifyhub.svg", path: "./popular/notifyhub/" },
    { name: "Typing", icon: "typing.svg", path: "./popular/typing/" },
    { name: "Xavfsizlik", icon: "security.svg", path: "./popular/security/" },
    { name: "CodeStudio", icon: "codestudio.svg", path: "./popular/codestudio/" },
    { name: "Videolarim", icon: "videohub.svg", path: "./popular/videohub/" },
    { name: "ObHavo", icon: "weather.svg", path: "./popular/weather/" },
    { name: "Eslatmalar", icon: "notes.svg", path: "./popular/notes/" },
    { name: "Kun-Tartibi", icon: "todo.svg", path: "./popular/todo/" }
];

export const miniApps = [
    { name: "Kalkulyator", icon: "calculator.svg", path: "./mini/calculator/" },
    { name: "Bingo", icon: "bingo.svg", path: "./mini/bingo/" },
    { name: "Doska", icon: "board.svg", path: "./mini/board/" },
    { name: "Musiqalarim", icon: "music.svg", path: "./mini/music/" },
    { name: "KopOyna", icon: "splitview.svg", path: "./mini/splitview/" },
    { name: "Examer", icon: "examer.svg", path: "./mini/examer/" },
    { name: "Soat", icon: "clock.svg", path: "./mini/clock/" },
    { name: "Sekundnomer", icon: "stopwatch.svg", path: "./mini/stopwatch/" },
    { name: "Taymer", icon: "timer.svg", path: "./mini/timer/" },
    { name: "QR kod", icon: "qr.svg", path: "./mini/qr/" }
];

export function switchTab(tabId) {
    currentTab = tabId;

    // Tab button'larini yangilash
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });

    // Sidebar nav'ni yangilash
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeMap = {
        'all': 'navAll',
        'popular': 'navPopular',
        'mini': 'navMini'
    };

    const activeNav = document.getElementById(activeMap[tabId]);
    if (activeNav) activeNav.classList.add('active');

    // Grid'larni ko'rsatish/yashirish
    const allGrid = document.getElementById('allGrid');
    const popularOnlyGrid = document.getElementById('popularOnlyGrid');
    const miniOnlyGrid = document.getElementById('miniOnlyGrid');

    [allGrid, popularOnlyGrid, miniOnlyGrid].forEach(grid => {
        if (grid) grid.style.display = 'none';
    });

    if (tabId === 'all' && allGrid) allGrid.style.display = 'block';
    if (tabId === 'popular' && popularOnlyGrid) popularOnlyGrid.style.display = 'block';
    if (tabId === 'mini' && miniOnlyGrid) miniOnlyGrid.style.display = 'block';

    // Sarlavhalarni yangilash
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');

    const titles = {
        'all': ['MR DEV', 'Barcha ilovalar'],
        'popular': ['MR DEV', "Eng ko'p ishlatiladigan ilovalar"],
        'mini': ['MR DEV', 'Kichik va foydali ilovalar']
    };

    if (pageTitle) pageTitle.textContent = titles[tabId][0];
    if (pageSubtitle) pageSubtitle.textContent = titles[tabId][1];
}

export function initTabs() {
    renderAppGrid(popularApps, 'popularGrid');
    renderAppGrid(miniApps, 'miniGrid');
    renderAppGrid(popularApps, 'popularOnlyList');
    renderAppGrid(miniApps, 'miniOnlyList');
    switchTab('all');
}

export function getCurrentTab() {
    return currentTab;
}
