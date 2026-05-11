// ==================== MRDEV GOOGLE AUTH v3.0 ====================
// FIX v3.0:
//   1. mrdev_local_auth to'liq saqlanadi — authType: 'google', isLoggedIn: true
//   2. Firestore doc: Firebase UID bilan (request.auth.uid == userId ruxsat)
//   3. MRDEV ID: saveUserMrdevId setDoc/updateDoc to'g'ri ishlatadi
//   4. Debug loglar

import logger from '../core/logger.js';
import { auth, db } from '../core/firebase-init.js';
import {
    GoogleAuthProvider,
    signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from '../core/toast.js';
import { closeModal } from '../ui/modal.js';
import { saveUserMrdevId } from '../notif-pass.js';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user   = result.user;

        console.log('🔑 [GoogleAuth] Google login OK:', user.uid, user.email);

        // ── FIRESTORE USER DOC ──────────────────────────────────────
        // MUHIM: users/{user.uid} — Firebase UID bilan (Firestore rules: auth.uid == userId)
        const userRef  = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Yangi foydalanuvchi — to'liq doc yaratish
            await setDoc(userRef, {
                uid:           user.uid,
                email:         user.email,
                displayName:   user.displayName || user.email?.split('@')[0] || 'User',
                photoURL:      user.photoURL || null,
                provider:      'google',
                mrdevId:       '',      // saveUserMrdevId to'ldiradi
                mrdevPassword: null,
                createdAt:     serverTimestamp(),
                updatedAt:     serverTimestamp(),
                lastLogin:     serverTimestamp(),
                isActive:      true
            });
            console.log('📄 [GoogleAuth] Yangi Firestore doc yaratildi');
        } else {
            // Mavjud foydalanuvchi — faqat yangilanadigan maydonlar
            // ESLATMA: mrdevId mavjud bo'lsa, update rule buni o'zgartirishga yo'l qo'ymaydi — to'g'ri xatti-harakat
            await setDoc(userRef, {
                displayName: user.displayName || userSnap.data().displayName,
                photoURL:    user.photoURL || userSnap.data().photoURL || null,
                lastLogin:   serverTimestamp(),
                updatedAt:   serverTimestamp()
            }, { merge: true });
            console.log('📄 [GoogleAuth] Mavjud Firestore doc yangilandi');
        }

        // ── MRDEV ID ─────────────────────────────────────────────────
        let mrdevId = '';
        try {
            mrdevId = await saveUserMrdevId(user) || '';
            if (mrdevId) {
                localStorage.setItem('mrdev_user_id', mrdevId);
            }
            console.log('🆔 [GoogleAuth] MRDEV ID:', mrdevId);
        } catch (e) {
            console.warn('[GoogleAuth] MRDEV ID xatolik:', e.message);
            // MRDEV ID xatosi kritik emas — login davom etadi
        }

        // ── LOCAL AUTH SAQLASH ────────────────────────────────────────
        // Mini-applar onAuthStateChanged kelmagunicha shu orqali user'ni taniydi
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL:    user.photoURL || null,
            mrdevId:     mrdevId,
            provider:    'google',
            authType:    'google',
            isLoggedIn:  true,
            loginTime:   Date.now()
        }));

        console.log('✅ [GoogleAuth] mrdev_local_auth saqlandi, mrdevId:', mrdevId);

        showToast('Xush kelibsiz! ✨', 'success');
        closeModal('authModal');
        logger.auth.loginOk();

    } catch (error) {
        console.error('[GoogleAuth] signInWithGoogle xatolik:', error.code, error.message);
        logger.error.auth(error.code);

        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Kirish oynasi yopildi', 'error');
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Ikkinchi popup — e'tibor bermasa bo'ladi
        } else if (error.code === 'auth/network-request-failed') {
            showToast('Internet aloqasi yo\'q', 'error');
        } else {
            showToast('Google orqali kirishda xatolik', 'error');
        }
    }
}
