// ==================== MRDEV UNIVERSAL AUTH HELPER v4.0 ====================
// FIX v4.0:
//   1. Firestore writes Firebase UID ishlatadi (email-based centerId emas!)
//      Sabab: Firestore rule — request.auth.uid == userId
//             email-based ID auth.uid bilan mos kelmaydi → permission denied
//   2. getOrCreateCenterDoc olib tashlandi (rules bilan mos emas)
//   3. addMrdevIdToCenter — Firebase UID bilan to'g'ri ishlaydi
//   4. onAuthChange — mrdevId ham uzatadi
//   5. getCenterUserId helper sifatida saqlab qolindi (eski kod uchun backward compat)

import logger from './logger.js';
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc, getDoc, updateDoc, arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== YORDAMCHILAR ====================

/**
 * Email asosidagi ID (backward compatibility uchun saqlab qolindi).
 * MUHIM: Bu ID Firestore doc ID sifatida ISHLATILMAYDI.
 * Faqat eski kod bilan moslik uchun eksport qilinadi.
 */
export function getCenterUserId(email) {
    if (!email) return null;
    return email.replace(/[.@]/g, '_');
}

// ==================== AUTH TURINI ANIQLASH ====================

function getAuthType(firebaseUser) {
    if (!firebaseUser) return 'none';
    const providerId = firebaseUser.providerData?.[0]?.providerId || 'password';
    return providerId === 'google.com' ? 'google' : 'email';
}

// ==================== ASOSIY FUNKSIYALAR ====================

export async function getCurrentUser() {
    // 1. Firebase Auth (Google yoki Email login)
    if (auth?.currentUser) {
        const u        = auth.currentUser;
        const authType = getAuthType(u);

        // mrdevId ni localStorage'dan olish (Firestore o'qishsiz — tez)
        const mrdevId = localStorage.getItem('mrdev_user_id') || '';

        return {
            uid:             u.uid,
            firebaseUid:     u.uid,
            email:           u.email,
            displayName:     u.displayName || u.email?.split('@')[0] || 'User',
            photoURL:        u.photoURL || null,
            mrdevId:         mrdevId,
            isAuthenticated: true,
            authType:        authType
        };
    }

    // 2. MRDEV Local Auth (MRDEV ID yoki Email login localStorage'da)
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (local?.isLoggedIn && local?.uid && local?.email) {
            const days = (Date.now() - (local.loginTime || 0)) / (1000 * 60 * 60 * 24);
            if (days < 7) {
                return {
                    uid:             local.uid,
                    firebaseUid:     local.uid,
                    email:           local.email,
                    displayName:     local.displayName || 'User',
                    photoURL:        local.photoURL || null,
                    mrdevId:         local.mrdevId || localStorage.getItem('mrdev_user_id') || '',
                    isAuthenticated: true,
                    authType:        local.authType || 'mrdev'
                };
            }
        }
    } catch (e) {
        console.warn('[AuthHelper] getCurrentUser local parse xatolik:', e.message);
    }

    // 3. Auth yo'q
    return {
        uid:             null,
        email:           null,
        displayName:     null,
        photoURL:        null,
        mrdevId:         '',
        isAuthenticated: false,
        authType:        'none'
    };
}

export function getUserId() {
    // 1. Firebase Auth
    const fbUser = auth?.currentUser;
    if (fbUser) return fbUser.uid;

    // 2. Local auth
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (local?.isLoggedIn && local?.uid) return local.uid;
    } catch (e) {}

    return null;
}

export function isAuthenticated() {
    if (auth?.currentUser) return true;
    try {
        return JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}')?.isLoggedIn === true;
    } catch (e) {
        return false;
    }
}

export function getUserEmail() {
    return auth?.currentUser?.email ||
        (() => {
            try { return JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}')?.email; } catch (e) { return null; }
        })();
}

export function getUserDisplayName() {
    const fbUser = auth?.currentUser;
    if (fbUser) return fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}');
        return local.displayName || 'Mehmon';
    } catch (e) {
        return 'Mehmon';
    }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const authType = getAuthType(firebaseUser);
            const mrdevId  = localStorage.getItem('mrdev_user_id') || '';

            callback({
                uid:             firebaseUser.uid,
                firebaseUid:     firebaseUser.uid,
                email:           firebaseUser.email,
                displayName:     firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL:        firebaseUser.photoURL || null,
                mrdevId:         mrdevId,
                isAuthenticated: true,
                authType:        authType
            });
        } else {
            const user = await getCurrentUser();
            callback(user);
        }
    });
}

// ==================== MRDEV ID YORDAMCHILARI ====================

/**
 * Foydalanuvchining mrdevId'sini Firestore'dan oladi.
 * Firebase UID bilan ishlaydi (rules bilan mos).
 */
export async function getMrdevId(uid) {
    if (!uid) return null;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? snap.data().mrdevId || null : null;
    } catch (e) {
        console.warn('[AuthHelper] getMrdevId xatolik:', e.message);
        return null;
    }
}

/**
 * addMrdevIdToCenter — eski nom saqlab qolindi (mrdev-login.js import qiladi).
 * Aslida: Firebase UID asosidagi user doc'ga mrdevId qo'shadi.
 * Hozir saveUserMrdevId bu ishni qiladi, bu funksiya ortiqcha.
 * Xatoliksiz davom etish uchun stub sifatida qoldirildi.
 */
export async function addMrdevIdToCenter(email, mrdevId) {
    // Bu funksiya endi ishlatilmaydi — saveUserMrdevId (notif-pass.js) buni qiladi.
    // Backward compatibility uchun saqlab qolindi.
    console.log('[AuthHelper] addMrdevIdToCenter chaqirildi (deprecated):', email, mrdevId);
}
