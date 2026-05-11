// ==================== MRDEV SEARCH SYSTEM ====================
import { switchTab, popularApps, miniApps, getCurrentTab } from './tabs.js';
import { renderAppGrid } from './grid.js';

export function filterApps(term) {
    const searchTerm = term.toLowerCase();

    const filteredPopular = popularApps.filter(a =>
        a.name.toLowerCase().includes(searchTerm)
    );
    const filteredMini = miniApps.filter(a =>
        a.name.toLowerCase().includes(searchTerm)
    );

    renderAppGrid(filteredPopular, 'popularGrid');
    renderAppGrid(filteredMini, 'miniGrid');
    renderAppGrid(filteredPopular, 'popularOnlyList');
    renderAppGrid(filteredMini, 'miniOnlyList');
}

export function initSearch() {
    // Container ichidagi qidiruv (mobil)
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');

    // Header qidiruv (desktop)
    const headerSearchInput = document.getElementById('headerSearchInput');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterApps(e.target.value);
            // Header search bilan sinxronizatsiya
            if (headerSearchInput) headerSearchInput.value = e.target.value;
            
            if (clearSearch) {
                clearSearch.style.display = e.target.value ? 'flex' : 'none';
            }

            const currentTab = getCurrentTab();
            if (e.target.value && currentTab !== 'all') {
                switchTab('all');
            }
        });
    }

    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                filterApps('');
                clearSearch.style.display = 'none';
                if (headerSearchInput) headerSearchInput.value = '';
            }
        });
    }

    // Header qidiruv (desktop)
    if (headerSearchInput) {
        headerSearchInput.addEventListener('input', (e) => {
            filterApps(e.target.value);
            // Container search bilan sinxronizatsiya
            if (searchInput) searchInput.value = e.target.value;
            if (clearSearch) {
                clearSearch.style.display = e.target.value ? 'flex' : 'none';
            }

            const currentTab = getCurrentTab();
            if (e.target.value && currentTab !== 'all') {
                switchTab('all');
            }
        });
    }
}
