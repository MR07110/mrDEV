// ==================== MRDEV LOGIN ADS v1.0 ====================
// Desktop: auth modal ichida chap + o'ng panel
// Mobile: faqat auth modal

import { showModal, closeModal } from '../ui/modal.js';

let adsPanelCreated = false;

export function showAuthWithAds() {
    const isDesktop = window.innerWidth >= 768;

    if (!isDesktop) {
        showModal('authModal');
        return;
    }

    // Desktop: split layout yaratish
    if (!adsPanelCreated) {
        createSplitLayout();
        adsPanelCreated = true;
    }

    showModal('authModal');
}

function createSplitLayout() {
    const authModal = document.getElementById('authModal');
    const modalContent = authModal?.querySelector('.modal-content');
    if (!modalContent) return;

    // === MODAL CONTENT STYLE ===
    modalContent.style.maxWidth = '760px';
    modalContent.style.width = '90vw';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'row';
    modalContent.style.padding = '0';
    modalContent.style.overflow = 'hidden';
    modalContent.style.borderRadius = '20px';
    modalContent.style.minHeight = '560px';

    // === CHAP PANEL ===
    const leftPanel = document.createElement('div');
    leftPanel.className = 'auth-left-panel';
    leftPanel.style.cssText = `
        flex: 1;
        padding: 36px 32px;
        display: flex;
        flex-direction: column;
        background: var(--surface);
        min-width: 340px;
        overflow-y: auto;
    `;

    // Modal-header va modal-body ni chap panelga ko'chirish
    const header = modalContent.querySelector('.modal-header');
    const body = modalContent.querySelector('.modal-body');
    if (header) leftPanel.appendChild(header);
    if (body) leftPanel.appendChild(body);

    // === O'NG PANEL ===
    const rightPanel = document.createElement('div');
    rightPanel.className = 'auth-right-panel';
    rightPanel.style.cssText = `
        flex: 1;
        background: var(--bg);
        display: flex;
        align-items: center;
        justify-content: center;
        border-left: 1px solid var(--border);
        min-width: 340px;
        position: relative;
        overflow: hidden;
        border-radius: 0 20px 20px 0;
    `;

    // === IFRAME: ads-login.html ===
    const iframe = document.createElement('iframe');
    iframe.src = './ads-login.html';
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        min-height: 560px;
        border: none;
        background: var(--bg);
    `;
    iframe.title = 'MRDEV Platform';
    iframe.loading = 'lazy';

    rightPanel.appendChild(iframe);

    // === YIG'ISH ===
    modalContent.innerHTML = '';
    modalContent.appendChild(leftPanel);
    modalContent.appendChild(rightPanel);
}

// ==================== RESPONSIVE ====================
window.addEventListener('resize', () => {
    const isDesktop = window.innerWidth >= 768;
    const modalContent = document.querySelector('#authModal .modal-content');
    if (!modalContent) return;

    if (!isDesktop) {
        // Mobile: qayta tiklash
        modalContent.style.maxWidth = '380px';
        modalContent.style.width = '100%';
        modalContent.style.display = 'block';
        modalContent.style.flexDirection = '';
        modalContent.style.padding = '';
        modalContent.style.overflow = '';
        modalContent.style.borderRadius = '';
        modalContent.style.minHeight = '';
        adsPanelCreated = false;
    }
});
