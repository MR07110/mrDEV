// ==================== MRDEV GOOGLE AUTH v2.1 (FIXED) ====================
// FIX v2.1: mrdev_local_auth saqlanadi — mini app'lar Google user'ni taniydi
//           uid = Firebase UID (user.uid), authType = 'google'
// Google va MRDEV Email — alohida Firebase UID, alohida Firestore doc

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

        // Firestore'da user doc yaratish yoki yangilash (Firebase UID bilan)
        const userRef  = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Yangi foydalanuvchi
            await setDoc(userRef, {
                email:         user.email,
                displayName:   user.displayName || user.email?.split('@')[0] || 'User',
                photoURL:      user.photoURL || null,
                provider:      'google',
                mrdevId:       '',     // saveUserMrdevId to'ldiradi
                mrdevPassword: null,   // Google user uchun kerak emas
                createdAt:     serverTimestamp(),
                updatedAt:     serverTimestamp(),
                lastLogin:     serverTimestamp(),
                isActive:      true
            });
        } else {
            // Mavjud foydalanuvchi — yangilanuvchi maydonlar
            await setDoc(userRef, {
                displayName: user.displayName || userSnap.data().displayName,
                email:       user.email,
                photoURL:    user.photoURL || userSnap.data().photoURL || null,
                provider:    'google',
                lastLogin:   serverTimestamp(),
                updatedAt:   serverTimestamp()
            }, { merge: true });
        }

        // MRDEV ID berish — cloud storage uchun
        let mrdevId = '';
        try {
            mrdevId = await saveUserMrdevId(user) || '';
            if (mrdevId) localStorage.setItem('mrdev_user_id', mrdevId);
        } catch (e) {
            logger.error.notif(e.message);
        }

        // ✅ FIX: mrdev_local_auth saqlash
        // Sabab: mini app'lar Firebase Auth state kelmagunicha bu orqali user'ni taniydi.
        // onAuthStateChanged asinxron — sahifa yangilanmay turib mini app'lar ishga tushadi.
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid:         user.uid,            // ✅ Firebase UID
            email:       user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL:    user.photoURL || null,
            mrdevId:     mrdevId,
            provider:    'google',
            authType:    'google',            // ✅ authType aniq
            isLoggedIn:  true,                // ✅ mini app'lar uchun majburiy
            loginTime:   Date.now()
        }));

        showToast('Xush kelibsiz! ✨', 'success');
        closeModal('authModal');
        logger.auth.loginOk();

    } catch (error) {
        logger.error.auth(error.code);
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Kirish oynasi yopildi', 'error');
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Ikkinchi popup — e'tibor bermasa bo'ladi
        } else {
            showToast('Google orqali kirishda xatolik', 'error');
        }
    }
}
