// ==================== MRDEV ID LOGIN v6.0 ====================
// FIX v6.0 — ASOSIY BUG TUZATILDI:
//   submitMrdevId() endi mrdev_index/{id} getDoc ishlatadi
//   (users collection EMAS — u auth talab qiladi!)
//
// BUG SABABI:
//   users collectioniga query auth talab qiladi:
//   "allow read: if request.auth != null"
//   Login vaqtida user hali autentifikatsiya qilinmagan → PERMISSION DENIED
//
// YECHIM:
//   mrdev_index/{mrdevId} — public read (auth shart emas)
//   Firestore rules ga qo'shildi: "allow read: if true"

import logger from '../core/logger.js';
import { db, rtdb, auth } from '../core/firebase-init.js';
import {
    doc, getDoc
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

let mrdevLoginTimer = null;
let currentStepData = null;

function generateSecureOTP() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (100000 + (arr[0] % 900000)).toString();
}

// ==================== LOCAL AUTH SAQLASH ====================

function saveLocalAuth(userData) {
    if (!userData || !userData.uid) {
        console.warn('[MRDevLogin] saveLocalAuth: userData.uid yo\'q');
        return;
    }

    const authData = {
        uid:         userData.firestoreUid || userData.uid,
        email:       userData.email        || '',
        displayName: userData.displayName  || 'User',
        photoURL:    userData.photoURL     || null,
        mrdevId:     userData.mrdevId      || '',
        provider:    'mrdev',
        authType:    'mrdev',
        isLoggedIn:  true,
        loginTime:   Date.now()
    };

    localStorage.setItem('mrdev_local_auth', JSON.stringify(authData));

    if (userData.mrdevId) {
        localStorage.setItem('mrdev_user_id', userData.mrdevId);
    }

    console.log('💾 [MRDevLogin] Local auth saqlandi:', authData.uid, '| mrdevId:', authData.mrdevId);
}

// ==================== MODAL ====================

export function showMrdevLogin() {
    const step1     = document.getElementById('mrdevStep1');
    const step2     = document.getElementById('mrdevStep2');
    const idInput   = document.getElementById('mrdevIdInput');
    const passInput = document.getElementById('mrdevPassInput');
    const errorEl   = document.getElementById('mrdevError');
    const timerEl   = document.getElementById('mrdevTimer');

    if (step1)     step1.style.display     = 'block';
    if (step2)     step2.style.display     = 'none';
    if (idInput)   idInput.value           = '';
    if (passInput) passInput.value         = '';
    if (errorEl)   errorEl.textContent     = '';
    if (timerEl)   timerEl.textContent     = '';

    currentStepData = null;
    clearInterval(mrdevLoginTimer);
    closeModal('authModal');
    showModal('mrdevLoginModal');
    setTimeout(() => idInput?.focus(), 400);
}

export function closeMrdevLoginModal() {
    clearInterval(mrdevLoginTimer);
    closeModal('mrdevLoginModal');
    currentStepData = null;
}

// ==================== 1-QADAM: MRDEV ID ====================
// FIX v6.0: mrdev_index/{id} getDoc — auth kerak emas!

export async function submitMrdevId() {
    const idInput = document.getElementById('mrdevIdInput');
    const errorEl = document.getElementById('mrdevError');
    const btn     = document.querySelector('#mrdevStep1 .auth-submit-btn');

    const id = idInput?.value.trim() || '';

    if (!id) {
        if (errorEl) errorEl.textContent = 'MRDEV ID kiriting';
        return;
    }

    if (btn)   { btn.disabled = true; btn.textContent = 'Qidirilmoqda...'; }
    if (errorEl) errorEl.textContent = '';

    console.log('🔍 [MRDevLogin] MRDEV ID qidirilmoqda:', id);

    try {
        // FIX: users collection emas — mrdev_index (public read, auth kerak emas!)
        const indexSnap = await getDoc(doc(db, 'mrdev_index', id));

        if (!indexSnap.exists()) {
            throw new Error('Bu MRDEV ID topilmadi');
        }

        const indexData = indexSnap.data();

        if (!indexData.email) {
            throw new Error('Bu hisob bilan email bog\'lanmagan');
        }
        if (!indexData.uid) {
            throw new Error('Hisob ma\'lumotlari topilmadi');
        }

        console.log('✅ [MRDevLogin] mrdev_index dan topildi:', indexData.email, '| uid:', indexData.uid);

        currentStepData = {
            firestoreUid:  indexData.uid,
            uid:           indexData.uid,
            email:         indexData.email,
            mrdevId:       id,
            displayName:   indexData.displayName || indexData.email?.split('@')[0] || 'User',
            photoURL:      indexData.photoURL    || null,
            // mrdevPassword mrdev_index da saqlanmaydi (xavfsizlik)
            // verifyMrdevPass local auth ishlatadi — bu yerda null bo'lishi OK
            mrdevPassword: null
        };

        const otp = generateSecureOTP();

        // RTDB ga OTP yozish (public write — rules: ".write": true)
        const notifRef = ref(rtdb, 'pass_notifications');
        const newRef   = push(notifRef);

        await set(newRef, {
            passCode:     otp,
            mrdevId:      id,
            uid:          indexData.uid,
            firestoreUid: indexData.uid,
            email:        indexData.email,
            expiresAt:    Date.now() + 120000,
            used:         false,
            createdAt:    Date.now()
        });

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔑 [DEV] OTP Parol:', otp);
        }

        logger.mrdev.otpSent(newRef.key);
        console.log('📤 [MRDevLogin] OTP RTDB\'ga yozildi, key:', newRef.key);

        // UI: 2-qadam
        const step1 = document.getElementById('mrdevStep1');
        const step2 = document.getElementById('mrdevStep2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';

        startTimer(120);
        showToast('Parol yuborildi! 📱', 'success');

    } catch (e) {
        console.error('[MRDevLogin] submitMrdevId xatolik:', e.message);
        if (errorEl) errorEl.textContent = e.message;
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

            const errorEl = document.getElementById('mrdevError');
            if (errorEl) errorEl.textContent = 'Parol muddati tugadi. Qayta boshlang.';

            setTimeout(() => {
                const step2 = document.getElementById('mrdevStep2');
                const step1 = document.getElementById('mrdevStep1');
                if (step2) step2.style.display = 'none';
                if (step1) step1.style.display = 'block';
                currentStepData = null;
            }, 2000);
        }
    }, 1000);
}

// ==================== 2-QADAM: OTP TASDIQLASH ====================

export async function verifyMrdevPass() {
    const passInput = document.getElementById('mrdevPassInput');
    const errorEl   = document.getElementById('mrdevError');
    const btn       = document.querySelector('#mrdevStep2 .auth-submit-btn');

    const pass = passInput?.value.trim() || '';

    if (!pass || pass.length !== 6) {
        if (errorEl) errorEl.textContent = '6 xonali kod kiriting';
        return;
    }

    if (!currentStepData) {
        if (errorEl) errorEl.textContent = 'Sessiya tugadi, qayta boshlang';
        return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Tekshirilmoqda...'; }
    if (errorEl) errorEl.textContent = '';

    console.log('🔐 [MRDevLogin] OTP tekshirilmoqda:', currentStepData.mrdevId);

    try {
        // RTDB dan OTP topish
        const snapshot = await get(ref(rtdb, 'pass_notifications'));
        const data     = snapshot.val();

        if (!data) throw new Error("Parol topilmadi. Qayta yuborib ko'ring.");

        let foundKey  = null;
        let foundData = null;

        for (const [key, val] of Object.entries(data)) {
            if (
                val.passCode === pass                        &&
                val.mrdevId  === currentStepData.mrdevId    &&
                !val.used                                   &&
                val.expiresAt > Date.now()
            ) {
                foundKey  = key;
                foundData = val;
                break;
            }
        }

        if (!foundData) throw new Error("Noto'g'ri parol yoki muddati tugagan");

        // OTP ni ishlatilgan deb belgilash
        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used:       true,
            verifiedAt: Date.now()
        });

        clearInterval(mrdevLoginTimer);
        console.log('✅ [MRDevLogin] OTP tasdiqlandi!');

        // LOCAL AUTH saqlash — ASOSIY autentifikatsiya
        saveLocalAuth(currentStepData);

        // Firebase Auth (ixtiyoriy — cloud sync uchun)
        // mrdevPassword mrdev_index da saqlanmaydi (xavfsizlik uchun)
        // Local auth asosida ishlaydi, Firebase Auth skip qilinadi
        console.log('ℹ️ [MRDevLogin] Firebase Auth skip — local auth ishlatiladi');

        closeMrdevLoginModal();
        showToast('Xush kelibsiz! ✨', 'success');
        logger.mrdev.loginOk();

        setTimeout(() => window.location.reload(), 500);

    } catch (e) {
        console.error('[MRDevLogin] verifyMrdevPass xatolik:', e.message);
        if (errorEl) errorEl.textContent = e.message;
        if (btn) { btn.disabled = false; btn.textContent = 'Tasdiqlash'; }
    }
}

logger.mrdevLoginLoaded();
