// ==================== MRDEV AUTH STATE MANAGER v4.1 ====================
// localStorage orqali auth holati boshqariladi

import logger from './logger.js';
import { auth, db, onAuthChange } from './firebase-init.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from './toast.js';
import { initDropdown } from '../dropdown.js';
import { saveUserMrdevId } from '../notif-pass.js';
import { 
    addOrUpdateAccount, 
    getActiveAccount, 
    getAllAccounts, 
    clearAllAccounts 
} from './multi-account.js';

let currentUser = null;

function saveLocalAuth(userData) {
    if (userData) {
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid: userData.uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL || null,
            mrdevId: userData.mrdevId || '',
            provider: userData.provider || 'mrdev',
            authType: userData.authType || 'mrdev',
            isLoggedIn: true,          // FIX: mini app'lar uchun kerak
            loginTime: Date.now()
        }));
    } else {
        localStorage.removeItem('mrdev_local_auth');
    }
}

function getLocalAuth() {
    try {
        const data = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (data && data.loginTime) {
            const hoursSinceLogin = (Date.now() - data.loginTime) / (1000 * 60 * 60);
            if (hoursSinceLogin > 24) {
                localStorage.removeItem('mrdev_local_auth');
                return null;
            }
        }
        return data;
    } catch (e) {
        return null;
    }
}

export function getCurrentUser() {
    return currentUser;
}

export function updateUIForUser(user) {
    if (!user) {
        hideSidebarUser();
        updateOldUserMenu(null);
        updateHeaderTrigger(null);
        return;
    }

    const dn = user.displayName || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const avatar = dn.charAt(0).toUpperCase();
    const mrdevId = user.mrdevId || localStorage.getItem('mrdev_user_id') || '';

    showSidebarUser(dn, email, mrdevId, user.photoURL, avatar);
    updateOldUserMenu(user, dn, email, mrdevId);
    updateHeaderTrigger(user, dn);
}

function hideSidebarUser() {
    ['sidebarUser', 'sidebarLogout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    ['sidebarLogin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    const notifNav = document.getElementById('notifNav');
    if (notifNav) notifNav.style.display = 'none';
}

function showSidebarUser(dn, email, mrdevId, photoURL, avatar) {
    setText('sidebarName', dn);
    setText('sidebarEmail', email);
    setText('sidebarMrdevId', mrdevId);
    setAvatar('sidebarAvatar', photoURL, avatar);

    ['sidebarUser', 'sidebarLogout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    });
    ['sidebarLogin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const notifNav = document.getElementById('notifNav');
    if (notifNav) notifNav.style.display = 'flex';
}

function updateOldUserMenu(user, dn, email, mrdevId) {
    const menuHeader = document.getElementById('userMenuHeader');
    const menuLogin = document.getElementById('userMenuLogin');
    const menuLogout = document.getElementById('userMenuLogout');
    const notifMenuLink = document.getElementById('notifMenuLink');

    if (user) {
        if (menuHeader) menuHeader.style.display = 'flex';
        if (menuLogin) menuLogin.style.display = 'none';
        setText('menuName', dn || '');
        setText('menuEmail', email || '');
        setText('menuMrdevId', mrdevId || '');
        setAvatar('menuAvatar', user.photoURL, (dn || 'U').charAt(0).toUpperCase());
        if (menuLogout) menuLogout.style.display = 'flex';
        if (notifMenuLink) notifMenuLink.style.display = 'flex';
    } else {
        if (menuHeader) menuHeader.style.display = 'none';
        if (menuLogin) menuLogin.style.display = 'block';
        if (menuLogout) menuLogout.style.display = 'none';
        if (notifMenuLink) notifMenuLink.style.display = 'none';
    }
}

function updateHeaderTrigger(user, dn) {
    const avatar = document.getElementById('headerUserAvatar');
    const name = document.getElementById('headerUserName');
    const role = document.querySelector('.header-user-role');

    if (user) {
        if (avatar) {
            avatar.innerHTML = user.photoURL
                ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${dn}">`
                : (dn || 'U').charAt(0).toUpperCase();
        }
        if (name) name.textContent = dn || 'User';
        if (role) role.textContent = 'Foydalanuvchi';
    } else {
        if (avatar) avatar.textContent = '?';
        if (name) name.textContent = 'Mehmon';
        if (role) role.textContent = 'Foydalanuvchi';
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setAvatar(id, photoURL, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    if (photoURL) {
        el.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        el.textContent = fallback;
    }
}

export async function logout() {
    try {
        const activeAccount = getActiveAccount();
        const allAccounts = getAllAccounts();
        
        if (allAccounts.length > 1 && activeAccount) {
            const { removeAccount } = await import('./multi-account.js');
            removeAccount(activeAccount.uid);
            showToast("Hisobdan chiqildi", 'info');
        } else {
            try { await signOut(auth); } catch (e) {}
            clearAllAccounts();
            saveLocalAuth(null);
            showToast("Hisobdan chiqildi", 'info');
        }
        
        setTimeout(() => window.location.reload(), 300);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

export async function loginWithMrdev(userData) {
    logger.localAuth.saved(userData.uid);
    
    saveLocalAuth(userData);
    
    const user = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
        photoURL: userData.photoURL || null,
        providerData: [{ providerId: 'mrdev' }]
    };
    
    currentUser = user;
    updateUIForUser(user);
    
    try { initDropdown(user); } catch (e) { logger.error.dropdown(e.message); }
    
    addOrUpdateAccount(user, { mrdevId: userData.mrdevId, provider: 'mrdev' });
    
    if (userData.mrdevId) {
        localStorage.setItem('mrdev_user_id', userData.mrdevId);
    }
    
    logger.auth.loginOk();
}

export function initAuth() {
    logger.auth.init();
    
    onAuthChange(async (firebaseUser) => {
        if (firebaseUser) {
            logger.auth.google(firebaseUser.email);
            
            currentUser = firebaseUser;
            
            let mrdevId = localStorage.getItem('mrdev_user_id') || '';
            try {
                const id = await saveUserMrdevId(firebaseUser);
                if (id) { mrdevId = id; localStorage.setItem('mrdev_user_id', mrdevId); }
            } catch (e) { logger.error.notif(e.message); }
            
            addOrUpdateAccount(firebaseUser, {
                mrdevId,
                provider: firebaseUser.providerData?.[0]?.providerId || 'google'
            });
            
            updateUIForUser(firebaseUser);
            initDropdown(firebaseUser);
            
        } else {
            const localAuth = getLocalAuth();
            
            if (localAuth) {
                logger.auth.mrdev(localAuth.email);
                
                currentUser = {
                    uid: localAuth.uid,
                    email: localAuth.email,
                    displayName: localAuth.displayName,
                    photoURL: localAuth.photoURL,
                    providerData: [{ providerId: localAuth.provider || 'mrdev' }]
                };
                
                updateUIForUser(currentUser);
                try { initDropdown(currentUser); } catch (e) { logger.error.dropdown(e.message); }
                
            } else {
                const savedAccount = getActiveAccount();
                
                if (savedAccount) {
                    logger.auth.saved(savedAccount.email);
                    
                    currentUser = {
                        uid: savedAccount.uid,
                        email: savedAccount.email,
                        displayName: savedAccount.displayName,
                        photoURL: savedAccount.photoURL,
                        providerData: [{ providerId: savedAccount.provider }]
                    };
                    
                    updateUIForUser(currentUser);
                    try { initDropdown(currentUser); } catch (e) { logger.error.dropdown(e.message); }
                    
                } else {
                    logger.auth.none();
                    updateUIForUser(null);
                }
            }
        }
        
        updateTriggerUI(currentUser);
    });
}

function updateTriggerUI(user) {
    const triggerAvatar = document.querySelector('#mrdevUserTrigger .trigger-avatar');
    const triggerName = document.querySelector('#mrdevUserTrigger .trigger-name');
    
    if (user && triggerAvatar && triggerName) {
        const dn = user.displayName || user.email?.split('@')[0] || 'User';
        triggerAvatar.innerHTML = user.photoURL
            ? `<img src="${user.photoURL}" alt="${dn}">`
            : dn.charAt(0).toUpperCase();
        triggerName.textContent = dn;
    } else if (triggerAvatar && triggerName) {
        triggerAvatar.textContent = '?';
        triggerName.textContent = 'Mehmon';
    }
}
