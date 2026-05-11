// ==================== MRDEV MULTI-ACCOUNT MANAGER v1.0 ====================

const STORAGE_KEY = 'mrdev_accounts';
const ACTIVE_KEY = 'mrdev_active_account';
const MAX_ACCOUNTS = 3; // Maksimal 3 ta akkaunt

/**
 * Barcha saqlangan akkauntlarni olish
 */
export function getAllAccounts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Aktiv akkauntni olish
 */
export function getActiveAccount() {
    try {
        return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
    } catch (e) {
        return null;
    }
}

/**
 * Akkauntlarni saqlash
 */
function saveAccounts(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/**
 * Aktiv akkauntni saqlash
 */
function saveActiveAccount(account) {
    if (account) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify({
            uid: account.uid,
            email: account.email,
            displayName: account.displayName,
            photoURL: account.photoURL,
            provider: account.provider,
            mrdevId: account.mrdevId || '',
            lastActive: Date.now()
        }));
    } else {
        localStorage.removeItem(ACTIVE_KEY);
    }
}

/**
 * Yangi akkaunt qo'shish yoki mavjudini yangilash
 */
export function addOrUpdateAccount(user, extra = {}) {
    if (!user || !user.uid) return null;

    const accounts = getAllAccounts();
    const existingIndex = accounts.findIndex(a => a.uid === user.uid);

    const accountData = {
        uid: user.uid,
        email: user.email || extra.email || '',
        displayName: user.displayName || extra.displayName || 'User',
        photoURL: user.photoURL || extra.photoURL || null,
        provider: extra.provider || 'email',
        mrdevId: extra.mrdevId || '',
        addedAt: existingIndex >= 0 ? accounts[existingIndex].addedAt : Date.now(),
        lastActive: Date.now()
    };

    if (existingIndex >= 0) {
        accounts[existingIndex] = accountData;
    } else {
        accounts.push(accountData);
    }

    saveAccounts(accounts);
    setActiveAccount(user.uid);
    return accountData;
}

/**
 * Akkauntni aktiv qilish
 */
export function setActiveAccount(uid) {
    const accounts = getAllAccounts();
    const account = accounts.find(a => a.uid === uid);
    if (account) {
        account.lastActive = Date.now();
        saveAccounts(accounts);
        saveActiveAccount(account);
        return account;
    }
    return null;
}

/**
 * Akkauntni o'chirish
 */
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

/**
 * Akkauntlar soni limitga yetganmi
 */
export function isAccountLimitReached() {
    return getAllAccounts().length >= MAX_ACCOUNTS;
}

/**
 * Akkauntlar sonini olish
 */
export function getAccountCount() {
    return getAllAccounts().length;
}

/**
 * Maksimal akkauntlar soni
 */
export function getMaxAccounts() {
    return MAX_ACCOUNTS;
}

/**
 * Barcha akkauntlarni tozalash
 */
export function clearAllAccounts() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
}
