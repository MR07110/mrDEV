export function initAppearanceTab() {
    const lightBtn = document.getElementById('themeLight');
    const darkBtn = document.getElementById('themeDark');
    const headerBtn = document.getElementById('theme-btn-settings');

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
        updateActiveButton(theme);
        updateHeaderButton(theme);
    }

    function updateActiveButton(theme) {
        if (lightBtn && darkBtn) {
            lightBtn.classList.toggle('active', theme === 'light');
            darkBtn.classList.toggle('active', theme === 'dark');
        }
    }

    function updateHeaderButton(theme) {
        if (!headerBtn) return;
        headerBtn.innerHTML = theme === 'dark' ? getDarkIcon() : getLightIcon();
    }

    lightBtn?.addEventListener('click', () => applyTheme('light'));
    darkBtn?.addEventListener('click', () => applyTheme('dark'));
    headerBtn?.addEventListener('click', () => {
        applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function getDarkIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

function getLightIcon() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}
