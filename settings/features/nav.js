export function initSettingsNav() {
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.addEventListener('click', function () {
            switchSettingsTab(this.dataset.tab);
        });
    });
}

export function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });

    document.querySelectorAll('.settings-section').forEach(section => {
        section.classList.remove('active');
    });

    const target = document.getElementById('section-' + tabId);
    if (target) target.classList.add('active');

    try {
        window.history.replaceState(null, '', '#' + tabId);
    } catch (e) {}
}

window.switchSettingsTab = switchSettingsTab;
