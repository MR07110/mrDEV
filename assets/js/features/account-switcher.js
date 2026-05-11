// ==================== MRDEV ACCOUNT SWITCHER UI v2.0 ====================
import { 
    getAllAccounts, 
    getActiveAccount, 
    setActiveAccount, 
    removeAccount, 
    isAccountLimitReached,
    getAccountCount,
    getMaxAccounts
} from '../core/multi-account.js';
import { showToast } from '../core/toast.js';
import { showModal, closeModal } from '../ui/modal.js';
import { logout } from '../core/auth.js';

export function createAccountSwitcherHTML() {
    return `
        <div id="accountSwitcherModal" class="modal">
            <div class="modal-content account-switcher-modal">
                <div class="modal-header">
                    <h3>Hisoblar</h3>
                    <button class="modal-close" onclick="closeAccountSwitcher()">✕</button>
                </div>
                <div class="modal-body account-list-body">
                    <div id="accountList" class="account-list"></div>
                </div>
                <div class="account-switcher-footer">
                    <button class="add-account-btn" id="addAccountBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Hisob qo'shish
                    </button>
                    <span class="account-limit-text" id="accountLimitText"></span>
                </div>
            </div>
        </div>
    `;
}

export function openAccountSwitcher() {
    if (!document.getElementById('accountSwitcherModal')) {
        document.body.insertAdjacentHTML('beforeend', createAccountSwitcherHTML());
    }
    renderAccountList();
    showModal('accountSwitcherModal');
    attachAccountEvents();
}

export function closeAccountSwitcher() {
    closeModal('accountSwitcherModal');
}

function renderAccountList() {
    const container = document.getElementById('accountList');
    const limitText = document.getElementById('accountLimitText');
    const addBtn = document.getElementById('addAccountBtn');
    if (!container) return;

    const accounts = getAllAccounts();
    const active = getActiveAccount();
    const count = accounts.length;
    const max = getMaxAccounts();

    if (limitText) {
        limitText.textContent = `${count}/${max} ta hisob`;
        limitText.style.color = count >= max ? 'var(--red)' : 'var(--text-3)';
    }

    if (addBtn) {
        if (count >= max) {
            addBtn.style.opacity = '0.5';
            addBtn.style.pointerEvents = 'none';
            addBtn.title = 'Maksimal 3 ta hisob qo\'sha olasiz';
        } else {
            addBtn.style.opacity = '1';
            addBtn.style.pointerEvents = 'auto';
            addBtn.title = '';
        }
    }

    if (accounts.length === 0) {
        container.innerHTML = `
            <div class="account-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M5 20v-2a7 7 0 0 1 14 0v2"/>
                </svg>
                <p>Hali hisob qo'shilmagan</p>
            </div>
        `;
        return;
    }

    container.innerHTML = accounts.map((account, index) => {
        const isActive = active && active.uid === account.uid;
        const avatarChar = (account.displayName || 'U').charAt(0).toUpperCase();
        const providerIcon = getProviderIcon(account.provider);
        const providerName = getProviderName(account.provider);

        return `
            <div class="account-item ${isActive ? 'active' : ''}" data-uid="${account.uid}">
                <div class="account-item-left">
                    <div class="account-avatar">
                        ${account.photoURL 
                            ? `<img src="${account.photoURL}" alt="${account.displayName}">` 
                            : avatarChar
                        }
                    </div>
                    <div class="account-info">
                        <div class="account-name">
                            ${account.displayName || 'User'}
                            ${isActive ? '<span class="active-badge">Faol</span>' : ''}
                        </div>
                        <div class="account-email">${account.email || ''}</div>
                        <div class="account-meta">
                            <span class="account-provider">
                                ${providerIcon} ${providerName}
                            </span>
                            ${account.mrdevId ? `<span class="account-id">${account.mrdevId}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="account-item-actions">
                    ${!isActive ? `
                        <button class="account-action-btn switch-btn" data-uid="${account.uid}" title="O'tish">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </button>
                    ` : ''}
                    <button class="account-action-btn delete-btn" data-uid="${account.uid}" title="O'chirish">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getProviderIcon(provider) {
    const icons = {
        'google.com': `<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
        'password': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        'email': `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
    };
    return icons[provider] || icons['email'];
}

function getProviderName(provider) {
    const names = {
        'google.com': 'Google',
        'password': 'Email/Parol',
        'email': 'Email/Parol'
    };
    return names[provider] || 'Email/Parol';
}

function attachAccountEvents() {
    // O'tish tugmasi
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            const account = setActiveAccount(uid);
            if (account) {
                showToast(`${account.displayName || 'User'} hisobiga o'tildi`, 'success');
                closeAccountSwitcher();
                setTimeout(() => window.location.reload(), 300);
            }
        });
    });

    // O'chirish tugmasi
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            const accounts = getAllAccounts();
            const account = accounts.find(a => a.uid === uid);
            if (confirm(`${account?.displayName || 'User'} hisobini o'chirmoqchimisiz?`)) {
                const newActive = removeAccount(uid);
                if (newActive) {
                    showToast('Hisob o\'chirildi', 'success');
                    renderAccountList();
                    attachAccountEvents();
                    setTimeout(() => window.location.reload(), 300);
                } else {
                    showToast('Barcha hisoblar o\'chirildi', 'info');
                    closeAccountSwitcher();
                    logout();
                }
            }
        });
    });

    // Yangi hisob qo'shish
    const addBtn = document.getElementById('addAccountBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (isAccountLimitReached()) {
                showToast(`Maksimal ${getMaxAccounts()} ta hisob qo'sha olasiz`, 'error');
                return;
            }
            closeAccountSwitcher();
            showModal('authModal');
        });
    }

    // Account kartasiga bosish
    document.querySelectorAll('.account-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            const uid = this.dataset.uid;
            const active = getActiveAccount();
            if (!active || active.uid !== uid) {
                const account = setActiveAccount(uid);
                if (account) {
                    showToast(`${account.displayName || 'User'} hisobiga o'tildi`, 'success');
                    closeAccountSwitcher();
                    setTimeout(() => window.location.reload(), 300);
                }
            }
        });
    });
}
