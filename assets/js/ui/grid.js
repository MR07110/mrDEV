// ==================== MRDEV APP GRID RENDERER ====================
function getIconFallback(name) {
    const map = {
        'AI': 'AI', 'Jamoaviy-Doska': 'GB', 'LearnCode': 'LC', 'MrGram': 'MG',
        'Xabarlar-Markazi': 'NH', 'Typing': 'TY', 'Xavfsizlik': 'SC', 'CodeStudio': 'CS',
        'Videolarim': 'VH', 'ObHavo': 'WT', 'Eslatmalar': 'NT', 'Kun-Tartibi': 'TD',
        'Kalkulyator': 'CL', 'Bingo': 'BG', 'Doska': 'BR', 'Musiqalarim': 'MU',
        'KopOyna': 'SV', 'Examer': 'EX', 'Soat': 'CK', 'Sekundnomer': 'SW',
        'Taymer': 'TM', 'QR kod': 'QR'
    };
    return map[name] || 'AP';
}

export function renderAppGrid(apps, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!apps || apps.length === 0) {
        container.innerHTML = '<div class="empty-state">Ilovalar topilmadi</div>';
        return;
    }

    const blankApps = ['AI', 'Jamoaviy-Doska', 'LearnCode', 'MrGram', 'CodeStudio'];

    container.innerHTML = apps.map(app => {
        const isBlank = blankApps.includes(app.name);
        const targetAttr = isBlank ? ' target="_blank" rel="noopener"' : '';
        return `
            <a href="${app.path}" class="app-item"${targetAttr}>
                <div class="app-icon">
                    <img src="./assets/favicons/${app.icon}"
                         onerror="this.onerror=null;this.style.display='none';this.parentElement.innerHTML='<span style=font-size:32px>${getIconFallback(app.name)}</span>'"
                         alt="${app.name}" loading="lazy">
                </div>
                <span class="app-name">${app.name}</span>
            </a>
        `;
    }).join('');
}
