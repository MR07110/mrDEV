// ==================== MRDEV AUTH STATE MANAGER v5.1 ====================
// FIX v5.1: Google/Email login bo'lganda ham MRDEV ID avtomatik yaratiladi
//           localStorage har doim yangilanadi
//           Eski ID o'rniga yangisi chiqadi

import logger from './logger.js';
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
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

// ==================== LOCAL AUTH ====================

function saveLocalAuth(userData) {
    if (userData) {
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid: userData.uid,
            email: userData.email || '',
            displayName: userData.displayName || 'User',
            photoURL: userData.photoURL || null,
            mrdevId: userData.mrdevId || '',
            provider: userData.provider || 'unknown',
            authType: userData.authType || 'unknown',
            isLoggedIn: true,
            loginTime: Date.now()
        }));
    } else {
        localStorage.removeItem('mrdev_local_auth');
    }
}

function getLocalAuth() {
    try {
        const data = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (!data || !data.loginTime) return null;
        const hours = (Date.now() - data.loginTime) / (1000 * 60 * 60);
        if (hours > 24) { localStorage.removeItem('mrdev_local_auth'); return null; }
        return data;
    } catch (e) { return null; }
}

export function getCurrentUser() { return currentUser; }

// ==================== UI ====================

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
}

function setAvatar(id, photoURL, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    if (photoURL) {
        el.innerHTML = `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        el.textContent = fallback || '?';
    }
}

export function updateUIForUser(user) {
    if (!user) {
        ['sidebarUser','sidebarLogout'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const sl = document.getElementById('sidebarLogin'); if (sl) sl.style.display = 'block';
        const nn = document.getElementById('notifNav'); if (nn) nn.style.display = 'none';
        
        const mh = document.getElementById('userMenuHeader'); if (mh) mh.style.display = 'none';
        const ml = document.getElementById('userMenuLogin'); if (ml) ml.style.display = 'block';
        const mo = document.getElementById('userMenuLogout'); if (mo) mo.style.display = 'none';
        const nm = document.getElementById('notifMenuLink'); if (nm) nm.style.display = 'none';
        
        const av = document.getElementById('headerUserAvatar'); if (av) av.textContent = '?';
        const nm2 = document.getElementById('headerUserName'); if (nm2) nm2.textContent = 'Mehmon';
        return;
    }

    const dn = user.displayName || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const avatar = dn.charAt(0).toUpperCase();
    // FIX: mrdevId ni user dan yoki localStorage dan olish
    const mrdevId = user.mrdevId || localStorage.getItem('mrdev_user_id') || '';

    console.log('🖥️ [Auth] UI:', dn, '| MRDEV ID:', mrdevId || '(yo\'q)');

    // Sidebar
    setText('sidebarName', dn);
    setText('sidebarEmail', email);
    setText('sidebarMrdevId', mrdevId);
    setAvatar('sidebarAvatar', user.photoURL, avatar);
    ['sidebarUser','sidebarLogout'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; });
    const sl = document.getElementById('sidebarLogin'); if (sl) sl.style.display = 'none';
    const nn = document.getElementById('notifNav'); if (nn) nn.style.display = 'flex';

    // User Menu
    const mh = document.getElementById('userMenuHeader'); if (mh) mh.style.display = 'flex';
    const ml = document.getElementById('userMenuLogin'); if (ml) ml.style.display = 'none';
    const mo = document.getElementById('userMenuLogout'); if (mo) mo.style.display = 'flex';
    const nm = document.getElementById('notifMenuLink'); if (nm) nm.style.display = 'flex';
    setText('menuName', dn);
    setText('menuEmail', email);
    setText('menuMrdevId', mrdevId);
    setAvatar('menuAvatar', user.photoURL, avatar);

    // Header
    const av = document.getElementById('headerUserAvatar');
    if (av) {
        av.innerHTML = user.photoURL 
            ? `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` 
            : avatar;
    }
    const nm2 = document.getElementById('headerUserName'); if (nm2) nm2.textContent = dn;

    // Trigger
    const ta = document.querySelector('#mrdevUserTrigger .trigger-avatar');
    const tn = document.querySelector('#mrdevUserTrigger .trigger-name');
    if (ta && tn) {
        ta.innerHTML = user.photoURL ? `<img src="${user.photoURL}" alt="${dn}">` : avatar;
        tn.textContent = dn;
    }
}

// ==================== LOGOUT ====================

export async function logout() {
    try {
        try { await signOut(auth); } catch (e) {}
        clearAllAccounts();
        localStorage.removeItem('mrdev_local_auth');
        localStorage.removeItem('mrdev_user_id');
        showToast('Hisobdan chiqildi', 'info');
        setTimeout(() => window.location.reload(), 300);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ==================== ASOSIY INIT ====================

export function initAuth() {
    console.log('🚀 [Auth] initAuth v5.1 boshlandi');

    onAuthStateChanged(auth, async (firebaseUser) => {

        // ──────── FIREBASE AUTH USER (Google / Email) ────────────────
        if (firebaseUser && firebaseUser.uid) {
            console.log('🔥 [Auth] Firebase user:', firebaseUser.email, '| uid:', firebaseUser.uid);

            // FIX: Har doim localStorage dan eski ID ni o'chirish
            localStorage.removeItem('mrdev_user_id');

            let mrdevId = '';

            try {
                // FIX: To'g'ridan-to'g'ri saveUserMrdevId chaqirish
                // Bu funksiya ichida getDoc bor — mavjud bo'lsa qaytaradi, yo'q bo'lsa yaratadi
                mrdevId = await saveUserMrdevId(firebaseUser);
                
                if (mrdevId) {
                    console.log('✅ [Auth] MRDEV ID:', mrdevId);
                    localStorage.setItem('mrdev_user_id', mrdevId);
                } else {
                    console.warn('⚠️ [Auth] MRDEV ID null qaytdi!');
                }
            } catch (e) {
                console.error('❌ [Auth] saveUserMrdevId xatolik:', e.message);
            }

            // FIX: currentUser ni to'ldirish
            currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || null,
                mrdevId: mrdevId,
                providerData: firebaseUser.providerData || [],
                isAuthenticated: true
            };

            console.log('👤 [Auth] currentUser:', currentUser.displayName, '| MRDEV ID:', currentUser.mrdevId);

            // Local auth saqlash
            saveLocalAuth({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: currentUser.displayName,
                photoURL: firebaseUser.photoURL,
                mrdevId: mrdevId,
                provider: firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
                authType: firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email'
            });

            // Multi-account
            addOrUpdateAccount(currentUser, { mrdevId, provider: firebaseUser.providerData?.[0]?.providerId || 'email' });

            // UI
            updateUIForUser(currentUser);
            try { initDropdown(currentUser); } catch (e) {}

        // ──────── LOCAL AUTH ──────────────────────
        } else {
            const localAuth = getLocalAuth();
            if (localAuth) {
                currentUser = {
                    uid: localAuth.uid,
                    email: localAuth.email,
                    displayName: localAuth.displayName,
                    photoURL: localAuth.photoURL,
                    mrdevId: localAuth.mrdevId || localStorage.getItem('mrdev_user_id') || '',
                    providerData: [{ providerId: localAuth.provider || 'mrdev' }],
                    isAuthenticated: true
                };
                updateUIForUser(currentUser);
                try { initDropdown(currentUser); } catch (e) {}
            } else {
                currentUser = null;
                updateUIForUser(null);
            }
        }
    });
}