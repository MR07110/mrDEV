// ==================== MRDEV MULTI-ACCOUNT MANAGER v2.0 ====================
// FIX v2.0:
//   1. addOrUpdateAccount — mrdevId har doim saqlanadi
//   2. getActiveAccount — mrdevId qaytaradi
//   3. localStorage debug loglar

const STORAGE_KEY  = 'mrdev_accounts';
const ACTIVE_KEY   = 'mrdev_active_account';
const MAX_ACCOUNTS = 3;

// ==================== O'QISH ====================

export function getAllAccounts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export function getActiveAccount() {
    try {
        const data = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
        return data;
    } catch (e) {
        return null;
    }
}

// ==================== YOZISH ====================

function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function saveActiveAccount(account) {
    if (account) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({
            uid:         account.uid,
            email:       account.email       || '',
            displayName: account.displayName || 'User',
            photoURL:    account.photoURL    || null,
            provider:    account.provider    || 'mrdev',
            mrdevId:     account.mrdevId     || '',
            lastActive:  Date.now()
        }));
    } else {
        localStorage.removeItem(ACTIVE_KEY);
    }
}

// ==================== ASOSIY OPERATSIYALAR ====================

/**
 * Yangi akkaunt qo'shish yoki mavjudini yangilash.
 * FIX: mrdevId har doim saqlanadi — user.mrdevId yoki extra.mrdevId.
 */
export function addOrUpdateAccount(user, extra = {}) {
    if (!user || !user.uid) {
        console.warn('[MultiAccount] addOrUpdateAccount: user.uid yo\'q');
        return null;
    }

    const accounts      = getAllAccounts();
    const existingIndex = accounts.findIndex(a => a.uid === user.uid);

    // mrdevId: user.mrdevId > extra.mrdevId > mavjud account.mrdevId > localStorage
    const existingMrdevId = existingIndex >= 0 ? accounts[existingIndex].mrdevId : '';
    const mrdevId = (
        user.mrdevId        ||
        extra.mrdevId       ||
        existingMrdevId     ||
        localStorage.getItem('mrdev_user_id') ||
        ''
    );

    const accountData = {
        uid:         user.uid,
        email:       user.email       || extra.email       || '',
        displayName: user.displayName || extra.displayName || 'User',
        photoURL:    user.photoURL    || extra.photoURL    || null,
        provider:    extra.provider   || user.providerData?.[0]?.providerId || 'mrdev',
        mrdevId:     mrdevId,
        addedAt:     existingIndex >= 0 ? (accounts[existingIndex].addedAt || Date.now()) : Date.now(),
        lastActive:  Date.now()
    };

    if (existingIndex >= 0) {
        accounts[existingIndex] = accountData;
    } else {
        if (accounts.length >= MAX_ACCOUNTS) {
            // Eng eski akkauntni olib tashlaymiz
            accounts.sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0));
            accounts.shift();
        }
        accounts.push(accountData);
    }

    saveAccounts(accounts);
    setActiveAccount(user.uid);

    console.log('💾 [MultiAccount] Saqlandi:', accountData.uid, '| mrdevId:', accountData.mrdevId || '(yo\'q)');
    return accountData;
}

export function setActiveAccount(uid) {
    const accounts = getAllAccounts();
    const account  = accounts.find(a => a.uid === uid);
    if (account) {
        account.lastActive = Date.now();
        saveAccounts(accounts);
        saveActiveAccount(account);
        return account;
    }
    return null;
}

export function removeAccount(uid) {
    const accounts = getAllAccounts();
    const filtered = accounts.filter(a => a.uid !== uid);

    if (filtered.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ACTIVE_KEY);
        return null;
    }

    saveAccounts(filtered);

    const activeAccount = getActiveAccount();
    if (activeAccount && activeAccount.uid === uid) {
        const newActive = filtered[0];
        setActiveAccount(newActive.uid);
        return newActive;
    }
    return activeAccount;
}

export function isAccountLimitReached() {
    return getAllAccounts().length >= MAX_ACCOUNTS;
}

export function getAccountCount() {
    return getAllAccounts().length;
}

export function getMaxAccounts() {
    return MAX_ACCOUNTS;
}

export function clearAllAccounts() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    console.log('[MultiAccount] Barcha akkauntlar tozalandi');
}
