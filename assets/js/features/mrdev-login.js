// ==================== MRDEV ID LOGIN v4.3 (FIXED) ====================
// FIX v4.3:
//   1. saveLocalAuth() — isLoggedIn: true majburiy
//   2. submitMrdevId() — RTDB'ga firestoreUid ham saqlanadi
//   3. verifyMrdevPass() — auth/wrong-password va auth/invalid-credential
//      xatolarida ham login davom etadi (OTP orqali autentifikatsiya muvaffaqiyatli)

import logger from '../core/logger.js';
import { db, rtdb, auth } from '../core/firebase-init.js';
import {
    collection, query, where, getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    ref, push, get, update, set
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showToast } from '../core/toast.js';
import { showModal, closeModal } from '../ui/modal.js';
import { addMrdevIdToCenter } from '../core/auth-helper.js';

let mrdevLoginTimer = null;
let currentStepData = null;

function generateSecureOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== LOCAL AUTH SAQLASH ====================

/**
 * mrdev_local_auth'ga to'liq ma'lumot saqlaydi.
 * FIX: isLoggedIn: true — mini app'lar (firebase-helper.js getUserId) uchun majburiy.
 */
function saveLocalAuth(userData) {
    const authData = {
        uid:         userData.firestoreUid || userData.uid,  // Firebase UID
        email:       userData.email,
        displayName: userData.displayName || 'User',
        photoURL:    userData.photoURL || null,
        mrdevId:     userData.mrdevId || '',
        provider:    'mrdev',
        authType:    'mrdev',
        isLoggedIn:  true,    // ✅ FIX: bu bo'lmasa mini app'lar taniy olmaydi
        loginTime:   Date.now()
    };
    localStorage.setItem('mrdev_local_auth', JSON.stringify(authData));
    if (userData.mrdevId) {
        localStorage.setItem('mrdev_user_id', userData.mrdevId);
    }
}

// ==================== MODAL ====================

export function showMrdevLogin() {
    document.getElementById('mrdevStep1').style.display = 'block';
    document.getElementById('mrdevStep2').style.display = 'none';
    document.getElementById('mrdevIdInput').value = '';
    document.getElementById('mrdevPassInput').value = '';
    document.getElementById('mrdevError').textContent = '';
    document.getElementById('mrdevTimer').textContent = '';
    currentStepData = null;
    clearInterval(mrdevLoginTimer);
    closeModal('authModal');
    showModal('mrdevLoginModal');
    setTimeout(() => document.getElementById('mrdevIdInput')?.focus(), 400);
}

export function closeMrdevLoginModal() {
    clearInterval(mrdevLoginTimer);
    closeModal('mrdevLoginModal');
    currentStepData = null;
}

// ==================== 1-QADAM: MRDEV ID ====================

export async function submitMrdevId() {
    const id  = document.getElementById('mrdevIdInput')?.value.trim();
    const err = document.getElementById('mrdevError');
    const btn = document.querySelector('#mrdevStep1 .auth-submit-btn');

    if (!id) { err.textContent = 'MRDEV ID kiriting'; return; }
    if (btn)  { btn.disabled = true; btn.textContent = 'Qidirilmoqda...'; }
    err.textContent = '';

    try {
        // Firestore'dan user topish
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', id))
        );
        if (snap.empty) throw new Error('ID topilmadi');

        const userDoc = snap.docs[0];
        const data    = userDoc.data();
        if (!data.email) throw new Error('Email topilmadi');

        currentStepData = {
            firestoreUid:  userDoc.id,    // Firestore doc ID (= Firebase UID)
            uid:           userDoc.id,
            email:         data.email,
            mrdevId:       id,
            displayName:   data.displayName || data.email?.split('@')[0] || 'User',
            photoURL:      data.photoURL || null,
            mrdevPassword: data.mrdevPassword || null
        };

        const pass = generateSecureOTP();

        // ✅ RTDB'ga OTP yozish
        // database.rules.json'da "$notifId": { ".write": "!data.exists()" }
        // bo'lgani uchun auth bo'lmasa ham yangi yozuv qo'shish mumkin
        const notifRef = ref(rtdb, 'pass_notifications');
        const newRef   = push(notifRef);

        await set(newRef, {
            passCode:     pass,
            mrdevId:      id,
            uid:          userDoc.id,      // Firestore doc ID
            firestoreUid: userDoc.id,      // ✅ FIX: pass-notifications filter uchun
            email:        data.email,
            expiresAt:    Date.now() + 120000,  // 2 daqiqa
            used:         false,
            createdAt:    Date.now()
        });

        logger.mrdev.otpSentDev(pass);
        logger.mrdev.otpSent(newRef.key);

        document.getElementById('mrdevStep1').style.display = 'none';
        document.getElementById('mrdevStep2').style.display = 'block';
        startTimer(120);
        showToast('Parol yuborildi! 📱', 'success');

    } catch (e) {
        console.error('[MRDev] submitMrdevId xatolik:', e);
        err.textContent = e.message;
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Davom etish'; }
    }
}

// ==================== TAYMER ====================

function startTimer(sec) {
    clearInterval(mrdevLoginTimer);
    let remaining = sec;
    const el = document.getElementById('mrdevTimer');

    mrdevLoginTimer = setInterval(() => {
        remaining--;
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        if (el) el.textContent = `⏱️ ${m}:${s.toString().padStart(2, '0')}`;

        if (remaining <= 0) {
            clearInterval(mrdevLoginTimer);
            if (el) el.textContent = '⏰ Muddati tugadi';
            document.getElementById('mrdevError').textContent = 'Parol muddati tugadi';
            setTimeout(() => {
                document.getElementById('mrdevStep2').style.display = 'none';
                document.getElementById('mrdevStep1').style.display = 'block';
                currentStepData = null;
            }, 2000);
        }
    }, 1000);
}

// ==================== 2-QADAM: OTP TASDIQLASH ====================

export async function verifyMrdevPass() {
    const pass = document.getElementById('mrdevPassInput')?.value.trim();
    const err  = document.getElementById('mrdevError');
    const btn  = document.querySelector('#mrdevStep2 .auth-submit-btn');

    if (!pass || pass.length !== 6) { err.textContent = '6 xonali kod kiriting'; return; }
    if (!currentStepData) { err.textContent = 'Sessiya tugadi, qayta boshlang'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Tekshirilmoqda...'; }
    err.textContent = '';

    try {
        // RTDB'dan OTP topish
        const snapshot = await get(ref(rtdb, 'pass_notifications'));
        const data     = snapshot.val();
        let foundKey   = null;
        let foundData  = null;

        if (data) {
            for (const [key, val] of Object.entries(data)) {
                if (
                    val.passCode === pass &&
                    val.mrdevId  === currentStepData.mrdevId &&
                    !val.used    &&
                    val.expiresAt > Date.now()
                ) {
                    foundKey  = key;
                    foundData = val;
                    break;
                }
            }
        }

        if (!foundData) throw new Error("Noto'g'ri parol yoki muddati tugagan");

        // OTP'ni ishlatilgan deb belgilash
        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used:       true,
            verifiedAt: Date.now()
        });
        clearInterval(mrdevLoginTimer);

        // ✅ 1. Local auth'ga saqlash — mini app'lar shu orqali taniydi
        saveLocalAuth(currentStepData);

        // ✅ 2. Firebase Auth ga ham kirish — cloud sync uchun
        // FIX: Barcha xatoliklarni boshqarish — OTP tasdiqlandi, Firebase xatosi kritik emas
        const password = currentStepData.mrdevPassword || (generateSecureOTP() + 'Aa1!');

        try {
            await signInWithEmailAndPassword(auth, currentStepData.email, password);
            // Firebase Auth muvaffaqiyatli ✅
        } catch (authErr) {
            if (authErr.code === 'auth/user-not-found') {
                // Yangi Firebase Auth hisob yaratish
                try {
                    await createUserWithEmailAndPassword(auth, currentStepData.email, password);
                } catch (createErr) {
                    // Yaratishda xatolik — local auth bilan davom
                    console.warn('[MRDev] Firebase Auth create failed:', createErr.message);
                }
            } else if (
                authErr.code === 'auth/wrong-password'    ||
                authErr.code === 'auth/invalid-credential'
            ) {
                // ✅ FIX: Firestore'dagi mrdevPassword va Firebase Auth paroli mos kelmadi
                // Bu saveUserMrdevId paroli yangilasa lekin Firebase Auth da eski qolsa sodir bo'ladi.
                // OTP orqali autentifikatsiya to'g'ri — local auth bilan davom etamiz.
                console.warn('[MRDev] Firebase Auth password mismatch — local auth ishlatiladi');
            } else {
                // Boshqa xatolik — kritik emas
                console.warn('[MRDev] Firebase Auth error:', authErr.code, '— local auth ishlatiladi');
            }
        }

        closeMrdevLoginModal();
        showToast('Xush kelibsiz! ✨', 'success');

        // Sahifani yangilash — auth.js onAuthChange UI ni yangilaydi
        setTimeout(() => window.location.reload(), 500);

    } catch (e) {
        err.textContent = e.message;
        if (btn) { btn.disabled = false; btn.textContent = 'Tasdiqlash'; }
    }
}

logger.mrdevLoginLoaded();
