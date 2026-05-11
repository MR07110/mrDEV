// ==================== MRDEV AUTH STATE MANAGER v5.0 ====================
// FIX v5.0:
//   1. currentUser har doim mrdevId ni o'z ichiga oladi
//   2. Firestore'dan mrdevId o'qib, localStorage'ga ham yoziladi
//   3. Email auth user uchun ham mrdevId to'g'ri ko'rinadi
//   4. addOrUpdateAccount ga mrdevId uzatiladi
//   5. Debug loglar har bir qadam uchun

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

// ==================== STATE ====================

let currentUser = null;

// ==================== LOCAL AUTH ====================

export function saveLocalAuth(userData) {
    if (userData) {
        const authData = {
            uid:         userData.uid,
            email:       userData.email || '',
            displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
            photoURL:    userData.photoURL || null,
            mrdevId:     userData.mrdevId || '',
            provider:    userData.provider || 'mrdev',
            authType:    userData.authType || 'mrdev',
            isLoggedIn:  true,
            loginTime:   Date.now()
        };
        localStorage.setItem('mrdev_local_auth', JSON.stringify(authData));
        console.log('💾 [Auth] saveLocalAuth:', authData.uid, '| mrdevId:', authData.mrdevId);
    } else {
        localStorage.removeItem('mrdev_local_auth');
        console.log('🗑️ [Auth] Local auth o\'chirildi');
    }
}

export function getLocalAuth() {
    try {
        const data = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (!data) return null;

        // 24 soatlik muddatni tekshirish
        if (data.loginTime) {
            const hours = (Date.now() - data.loginTime) / (1000 * 60 * 60);
            if (hours > 24) {
                console.log('⏰ [Auth] Local auth muddati tugagan, o\'chirildi');
                localStorage.removeItem('mrdev_local_auth');
                return null;
            }
        }
        return data;
    } catch (e) {
        console.warn('[Auth] getLocalAuth xatolik:', e.message);
        return null;
    }
}

// ==================== GETTERS ====================

export function getCurrentUser() {
    return currentUser;
}

// ==================== UI YANGILASH ====================

export function updateUIForUser(user) {
    if (!user) {
        hideSidebarUser();
        updateOldUserMenu(null);
        updateHeaderTrigger(null);
        updateTriggerUI(null);
        return;
    }

    const dn      = user.displayName || user.email?.split('@')[0] || 'User';
    const email   = user.email || '';
    const avatar  = dn.charAt(0).toUpperCase();
    // mrdevId: user.mrdevId yoki localStorage dan olish
    const mrdevId = user.mrdevId || localStorage.getItem('mrdev_user_id') || '';

    console.log('🖥️ [Auth] UI yangilanyapti:', dn, '| MRDEV ID:', mrdevId || '(yo\'q)');

    showSidebarUser(dn, email, mrdevId, user.photoURL, avatar);
    updateOldUserMenu(user, dn, email, mrdevId);
    updateHeaderTrigger(user, dn);
    updateTriggerUI(user);
}

function hideSidebarUser() {
    ['sidebarUser', 'sidebarLogout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const sidebarLogin = document.getElementById('sidebarLogin');
    if (sidebarLogin) sidebarLogin.style.display = 'block';

    const notifNav = document.getElementById('notifNav');
    if (notifNav) notifNav.style.display = 'none';
}

function showSidebarUser(dn, email, mrdevId, photoURL, avatar) {
    setText('sidebarName',    dn);
    setText('sidebarEmail',   email);
    setText('sidebarMrdevId', mrdevId);
    setAvatar('sidebarAvatar', photoURL, avatar);

    ['sidebarUser', 'sidebarLogout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    });
    const sidebarLogin = document.getElementById('sidebarLogin');
    if (sidebarLogin) sidebarLogin.style.display = 'none';

    const notifNav = document.getElementById('notifNav');
    if (notifNav) notifNav.style.display = 'flex';
}

function updateOldUserMenu(user, dn = '', email = '', mrdevId = '') {
    const menuHeader     = document.getElementById('userMenuHeader');
    const menuLogin      = document.getElementById('userMenuLogin');
    const menuLogout     = document.getElementById('userMenuLogout');
    const notifMenuLink  = document.getElementById('notifMenuLink');

    if (user) {
        if (menuHeader) menuHeader.style.display = 'flex';
        if (menuLogin)  menuLogin.style.display  = 'none';
        setText('menuName',    dn);
        setText('menuEmail',   email);
        setText('menuMrdevId', mrdevId);
        setAvatar('menuAvatar', user.photoURL, (dn || 'U').charAt(0).toUpperCase());
        if (menuLogout)     menuLogout.style.display     = 'flex';
        if (notifMenuLink)  notifMenuLink.style.display  = 'flex';
    } else {
        if (menuHeader)    menuHeader.style.display    = 'none';
        if (menuLogin)     menuLogin.style.display     = 'block';
        if (menuLogout)    menuLogout.style.display    = 'none';
        if (notifMenuLink) notifMenuLink.style.display = 'none';
    }
}

function updateHeaderTrigger(user, dn = '') {
    const avatar = document.getElementById('headerUserAvatar');
    const name   = document.getElementById('headerUserName');
    const role   = document.querySelector('.header-user-role');

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
        if (name)   name.textContent   = 'Mehmon';
        if (role)   role.textContent   = 'Foydalanuvchi';
    }
}

function updateTriggerUI(user) {
    const triggerAvatar = document.querySelector('#mrdevUserTrigger .trigger-avatar');
    const triggerName   = document.querySelector('#mrdevUserTrigger .trigger-name');

    if (user && triggerAvatar && triggerName) {
        const dn = user.displayName || user.email?.split('@')[0] || 'User';
        triggerAvatar.innerHTML = user.photoURL
            ? `<img src="${user.photoURL}" alt="${dn}">`
            : dn.charAt(0).toUpperCase();
        triggerName.textContent = dn;
    } else if (triggerAvatar && triggerName) {
        triggerAvatar.textContent = '?';
        triggerName.textContent   = 'Mehmon';
    }
}

// ==================== YORDAMCHI FUNKSIYALAR ====================

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

// ==================== LOGOUT ====================

export async function logout() {
    try {
        const activeAccount = getActiveAccount();
        const allAccounts   = getAllAccounts();

        if (allAccounts.length > 1 && activeAccount) {
            const { removeAccount } = await import('./multi-account.js');
            removeAccount(activeAccount.uid);
            showToast('Hisobdan chiqildi', 'info');
        } else {
            try { await signOut(auth); } catch (e) {}
            clearAllAccounts();
            saveLocalAuth(null);
            localStorage.removeItem('mrdev_user_id');
            showToast('Hisobdan chiqildi', 'info');
        }

        setTimeout(() => window.location.reload(), 300);
    } catch (error) {
        console.error('[Auth] logout xatolik:', error.message);
        showToast(error.message, 'error');
    }
}

// ==================== MRDEV LOCAL LOGIN ====================

export async function loginWithMrdev(userData) {
    console.log('🔑 [Auth] loginWithMrdev:', userData.uid, '| mrdevId:', userData.mrdevId);

    saveLocalAuth(userData);

    const user = {
        uid:          userData.uid,
        email:        userData.email,
        displayName:  userData.displayName || userData.email?.split('@')[0] || 'User',
        photoURL:     userData.photoURL || null,
        mrdevId:      userData.mrdevId || '',
        providerData: [{ providerId: 'mrdev' }],
        isAuthenticated: true
    };

    currentUser = user;
    updateUIForUser(user);

    try { initDropdown(user); } catch (e) {
        console.warn('[Auth] initDropdown xatolik:', e.message);
    }

    addOrUpdateAccount(user, {
        mrdevId:  userData.mrdevId || '',
        provider: 'mrdev'
    });

    if (userData.mrdevId) {
        localStorage.setItem('mrdev_user_id', userData.mrdevId);
        console.log('✅ [Auth] mrdev_user_id saqlandi:', userData.mrdevId);
    }

    logger.auth.loginOk();
}

// ==================== ASOSIY AUTH INIT ====================

export function initAuth() {
    logger.auth.init();
    console.log('🚀 [Auth] initAuth boshlandi');

    onAuthChange(async (firebaseUser) => {

        // ──────── FIREBASE AUTH USER (Google / Email) ────────────────
        if (firebaseUser && firebaseUser.uid) {
            console.log('🔥 [Auth] Firebase user:', firebaseUser.email);

            let mrdevId = '';

            try {
                // 1. Avval Firestore'dan tekshirish
                const userDocRef  = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists() && userDocSnap.data().mrdevId) {
                    // Firestore'da mavjud → o'qib olamiz
                    mrdevId = userDocSnap.data().mrdevId;
                    console.log('📋 [Auth] Firestore\'dan MRDEV ID:', mrdevId);
                } else {
                    // Yo'q → yangi yaratamiz (saveUserMrdevId setDoc/updateDoc qiladi)
                    console.log('🆕 [Auth] MRDEV ID yaratilmoqda...');
                    const newId = await saveUserMrdevId(firebaseUser);
                    if (newId) {
                        mrdevId = newId;
                        console.log('✅ [Auth] Yangi MRDEV ID yaratildi:', mrdevId);
                    } else {
                        console.warn('[Auth] MRDEV ID yaratilmadi (null qaytdi)');
                    }
                }

                // 2. localStorage ga saqlash
                if (mrdevId) {
                    localStorage.setItem('mrdev_user_id', mrdevId);
                }

                // 3. mrdev_local_auth ni ham yangilash (mini-applar uchun)
                const localAuth = getLocalAuth();
                if (!localAuth || localAuth.uid === firebaseUser.uid) {
                    saveLocalAuth({
                        uid:         firebaseUser.uid,
                        email:       firebaseUser.email,
                        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        photoURL:    firebaseUser.photoURL || null,
                        mrdevId:     mrdevId,
                        provider:    firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'mrdev_email',
                        authType:    firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email'
                    });
                }

            } catch (e) {
                console.error('❌ [Auth] MRDEV ID xatolik:', e.message);
                // Xatolik bo'lsa localStorage dan olishga harakat
                mrdevId = localStorage.getItem('mrdev_user_id') || '';
            }

            // 4. currentUser ni to'ldirish
            currentUser = {
                uid:         firebaseUser.uid,
                email:       firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL:    firebaseUser.photoURL || null,
                mrdevId:     mrdevId,
                providerData: firebaseUser.providerData || [],
                isAuthenticated: true
            };

            console.log('👤 [Auth] currentUser:', currentUser.displayName, '| MRDEV ID:', currentUser.mrdevId || '(yo\'q)');

            // 5. Multi-account va UI
            addOrUpdateAccount(currentUser, {
                mrdevId:  mrdevId,
                provider: firebaseUser.providerData?.[0]?.providerId || 'email'
            });

            updateUIForUser(currentUser);
            try { initDropdown(currentUser); } catch (e) {
                console.warn('[Auth] initDropdown xatolik:', e.message);
            }

        // ──────── LOCAL AUTH USER (MRDEV Login) ──────────────────────
        } else {
            const localAuth = getLocalAuth();

            if (localAuth && localAuth.isLoggedIn && localAuth.uid) {
                console.log('📦 [Auth] Local auth user:', localAuth.email, '| mrdevId:', localAuth.mrdevId || '(yo\'q)');

                currentUser = {
                    uid:         localAuth.uid,
                    email:       localAuth.email,
                    displayName: localAuth.displayName || 'User',
                    photoURL:    localAuth.photoURL || null,
                    mrdevId:     localAuth.mrdevId || localStorage.getItem('mrdev_user_id') || '',
                    providerData: [{ providerId: localAuth.provider || 'mrdev' }],
                    isAuthenticated: true
                };

                updateUIForUser(currentUser);
                try { initDropdown(currentUser); } catch (e) {
                    console.warn('[Auth] initDropdown xatolik:', e.message);
                }

            } else {
                // Saqlangan akkauntlarni tekshirish
                const savedAccount = getActiveAccount();

                if (savedAccount && savedAccount.uid) {
                    console.log('💾 [Auth] Saved account:', savedAccount.email, '| mrdevId:', savedAccount.mrdevId || '(yo\'q)');

                    currentUser = {
                        uid:         savedAccount.uid,
                        email:       savedAccount.email,
                        displayName: savedAccount.displayName || 'User',
                        photoURL:    savedAccount.photoURL || null,
                        mrdevId:     savedAccount.mrdevId || localStorage.getItem('mrdev_user_id') || '',
                        providerData: [{ providerId: savedAccount.provider || 'mrdev' }],
                        isAuthenticated: true
                    };

                    updateUIForUser(currentUser);
                    try { initDropdown(currentUser); } catch (e) {
                        console.warn('[Auth] initDropdown xatolik:', e.message);
                    }

                } else {
                    console.log('❌ [Auth] Hech qanday auth yo\'q');
                    currentUser = null;
                    updateUIForUser(null);
                }
            }
        }
    });
}
