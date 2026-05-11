// ==================== SETTINGS ACCOUNTS TAB ====================
import { 
    getAllAccounts, 
    getActiveAccount, 
    setActiveAccount, 
    removeAccount, 
    isAccountLimitReached,
    getAccountCount,
    getMaxAccounts 
} from '../../assets/js/core/multi-account.js';
import { showToast } from '../../assets/js/core/toast.js';

export function initAccountsTab() {
    renderAccountsList();
}

function renderAccountsList() {
    const accounts = getAllAccounts();
    const active = getActiveAccount();
    const max = getMaxAccounts();
    const count = accounts.length;

    // Max raqamini ko'rsatish
    const maxText = document.getElementById('maxAccountsText');
    if (maxText) maxText.textContent = max;

    // Limit info
    const limitInfo = document.getElementById('accountLimitInfo');
    if (limitInfo) limitInfo.textContent = count + ' / ' + max + ' ta hisob';

    // Containerlarni ko'rsatish/yashirish
    const emptyState = document.getElementById('accountsEmpty');
    const listContainer = document.getElementById('accountsList');
    const footer = document.getElementById('accountsFooter');
    const addBtn1 = document.getElementById('addAccountBtnEmpty');
    const addBtn2 = document.getElementById('addAccountBtn');

    if (accounts.length === 0) {
        show(emptyState);
        hide(listContainer);
        hide(footer);
        if (addBtn1) {
            addBtn1.onclick = () => {
                if (isAccountLimitReached()) {
                    showToast('Maksimal ' + max + ' ta hisob', 'error');
                    return;
                }
                window.location.href = '../?action=login';
            };
        }
        return;
    }

    hide(emptyState);
    show(listContainer);
    show(footer);
    hide(addBtn1);

    // Ro'yxatni to'ldirish
    if (listContainer) {
        listContainer.innerHTML = accounts.map(account => {
            const isActive = active && active.uid === account.uid;
            const avatarChar = (account.displayName || 'U').charAt(0).toUpperCase();
            const name = account.displayName || 'User';
            const email = account.email || '';
            const photoURL = account.photoURL || '';
            const provider = account.provider || 'email';
            const mrdevId = account.mrdevId || '';

            return `
                <div class="account-item${isActive ? ' active' : ''}" data-uid="${account.uid}">
                    <div class="account-item-left">
                        <div class="account-avatar">
                            ${photoURL ? `<img src="${photoURL}" alt="${name}">` : avatarChar}
                        </div>
                        <div class="account-info">
                            <div class="account-name">
                                ${name}
                                ${isActive ? '<span class="active-badge">Faol</span>' : ''}
                            </div>
                            <div class="account-email">${email}</div>
                            <div class="account-meta">
                                <span class="account-provider">${getProviderName(provider)}</span>
                                ${mrdevId ? '<span class="account-id">' + mrdevId + '</span>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="account-item-actions">
                        ${!isActive ? '<button class="account-action-btn switch-btn" data-uid="' + account.uid + '">' + getSwitchIcon() + '</button>' : ''}
                        <button class="account-action-btn delete-btn" data-uid="${account.uid}">${getDeleteIcon()}</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Add button ko'rinishi
    if (addBtn2) {
        addBtn2.style.display = count < max ? 'inline-flex' : 'none';
        addBtn2.onclick = () => {
            if (isAccountLimitReached()) {
                showToast('Maksimal ' + max + ' ta hisob', 'error');
                return;
            }
            window.location.href = '../?action=login';
        };
    }

    attachEvents();
}

function attachEvents() {
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const account = setActiveAccount(btn.dataset.uid);
            if (account) {
                showToast(account.displayName + ' hisobiga o\'tildi', 'success');
                setTimeout(() => window.location.reload(), 300);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            const accounts = getAllAccounts();
            const account = accounts.find(a => a.uid === uid);
            if (!confirm((account?.displayName || 'User') + ' hisobini o\'chirmoqchimisiz?')) return;
            const result = removeAccount(uid);
            if (result) {
                showToast('Hisob o\'chirildi', 'success');
                renderAccountsList();
            } else {
                showToast('Barcha hisoblar o\'chirildi', 'info');
                window.logout();
            }
        });
    });

    document.querySelectorAll('.account-item').forEach(item => {
        item.addEventListener('click', function() {
            const uid = this.dataset.uid;
            const active = getActiveAccount();
            if (!active || active.uid !== uid) {
                const account = setActiveAccount(uid);
                if (account) {
                    showToast(account.displayName + ' hisobiga o\'tildi', 'success');
                    setTimeout(() => window.location.reload(), 300);
                }
            }
        });
    });
}

function getProviderName(provider) {
    const names = { 'google.com': 'Google', 'password': 'Email/Parol', 'email': 'Email/Parol' };
    return names[provider] || 'Email/Parol';
}

function getSwitchIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
}

function getDeleteIcon() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
}

function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }
