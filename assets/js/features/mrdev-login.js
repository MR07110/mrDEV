// ==================== MRDEV ID LOGIN v7.0 ====================
// YANGI: linkedTo — oilaviy ulashish
//   - verifyMrdevPass: linked hisobni topib, o'sha UID ga o'tadi

import logger from '../core/logger.js';
import { db, rtdb, auth } from '../core/firebase-init.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, push, get, update, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showToast } from '../core/toast.js';
import { showModal, closeModal } from '../ui/modal.js';
import { loginWithMrdevId, getLinkedAccount } from '../notif-pass.js';

let mrdevLoginTimer = null;
let currentStepData = null;

function generateSecureOTP() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (100000 + (arr[0] % 900000)).toString();
}

function saveLocalAuth(userData) {
    if (!userData || !userData.uid) return;
    localStorage.setItem('mrdev_local_auth', JSON.stringify({
        uid: userData.uid,
        email: userData.email || '',
        displayName: userData.displayName || 'User',
        photoURL: userData.photoURL || null,
        mrdevId: userData.mrdevId || '',
        linkedTo: userData.linkedTo || null,
        provider: 'mrdev',
        authType: 'mrdev',
        isLoggedIn: true,
        loginTime: Date.now()
    }));
    if (userData.mrdevId) localStorage.setItem('mrdev_user_id', userData.mrdevId);
}

// ==================== MODAL ====================

export function showMrdevLogin() {
    const step1 = document.getElementById('mrdevStep1');
    const step2 = document.getElementById('mrdevStep2');
    const idInput = document.getElementById('mrdevIdInput');
    const passInput = document.getElementById('mrdevPassInput');
    const errorEl = document.getElementById('mrdevError');
    const timerEl = document.getElementById('mrdevTimer');

    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (idInput) idInput.value = '';
    if (passInput) passInput.value = '';
    if (errorEl) errorEl.textContent = '';
    if (timerEl) timerEl.textContent = '';

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

export async function submitMrdevId() {
    const idInput = document.getElementById('mrdevIdInput');
    const errorEl = document.getElementById('mrdevError');
    const btn = document.querySelector('#mrdevStep1 .auth-submit-btn');
    const id = idInput?.value.trim() || '';

    if (!id) { if (errorEl) errorEl.textContent = 'MRDEV ID kiriting'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Qidirilmoqda...'; }
    if (errorEl) errorEl.textContent = '';

    try {
        const userData = await loginWithMrdevId(id);
        
        currentStepData = {
            firestoreUid: userData.firestoreUid,
            uid: userData.uid,
            email: userData.email,
            mrdevId: id,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            mrdevPassword: userData.mrdevPassword,
            linkedTo: userData.linkedTo // YANGI
        };

        const otp = generateSecureOTP();
        const newRef = push(ref(rtdb, 'pass_notifications'));
        await set(newRef, {
            passCode: otp, mrdevId: id,
            uid: userData.uid, firestoreUid: userData.firestoreUid,
            email: userData.email,
            expiresAt: Date.now() + 120000, used: false, createdAt: Date.now()
        });

        if (window.location.hostname === 'localhost') console.log('🔑 [DEV] OTP:', otp);

        const step1 = document.getElementById('mrdevStep1');
        const step2 = document.getElementById('mrdevStep2');
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';

        startTimer(120);
        showToast('Parol yuborildi! 📱', 'success');
    } catch (e) {
        if (errorEl) errorEl.textContent = e.message;
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Davom etish'; }
    }
}

function startTimer(sec) {
    clearInterval(mrdevLoginTimer);
    let remaining = sec;
    const el = document.getElementById('mrdevTimer');
    mrdevLoginTimer = setInterval(() => {
        remaining--;
        const m = Math.floor(remaining / 60), s = remaining % 60;
        if (el) el.textContent = `⏱️ ${m}:${s.toString().padStart(2, '0')}`;
        if (remaining <= 0) {
            clearInterval(mrdevLoginTimer);
            if (el) el.textContent = '⏰ Muddati tugadi';
            const errorEl = document.getElementById('mrdevError');
            if (errorEl) errorEl.textContent = 'Parol muddati tugadi.';
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
    const passInput = document.getElementById('mrdevPassInput');
    const errorEl = document.getElementById('mrdevError');
    const btn = document.querySelector('#mrdevStep2 .auth-submit-btn');
    const pass = passInput?.value.trim() || '';

    if (!pass || pass.length !== 6) { if (errorEl) errorEl.textContent = '6 xonali kod kiriting'; return; }
    if (!currentStepData) { if (errorEl) errorEl.textContent = 'Sessiya tugadi'; return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Tekshirilmoqda...'; }
    if (errorEl) errorEl.textContent = '';

    try {
        const snapshot = await get(ref(rtdb, 'pass_notifications'));
        const data = snapshot.val();
        if (!data) throw new Error('Parol topilmadi');

        let foundKey = null, foundData = null;
        for (const [key, val] of Object.entries(data)) {
            if (val.passCode === pass && val.mrdevId === currentStepData.mrdevId && !val.used && val.expiresAt > Date.now()) {
                foundKey = key; foundData = val; break;
            }
        }
        if (!foundData) throw new Error("Noto'g'ri parol yoki muddati tugagan");

        await update(ref(rtdb, `pass_notifications/${foundKey}`), { used: true, verifiedAt: Date.now() });
        clearInterval(mrdevLoginTimer);

        // ==================== YANGI: LINKED HISOBGA O'TISH ====================
        let targetUid = currentStepData.firestoreUid;
        let targetEmail = currentStepData.email;
        let targetDisplayName = currentStepData.displayName;

        if (currentStepData.linkedTo) {
            console.log('🔗 [MRDevLogin] Linked hisobga o\'tilmoqda:', currentStepData.linkedTo);
            const linkedAccount = await getLinkedAccount(currentStepData.linkedTo);
            if (linkedAccount) {
                targetUid = linkedAccount.uid;
                targetEmail = linkedAccount.email;
                targetDisplayName = linkedAccount.displayName;
                console.log('✅ [MRDevLogin] Linked hisob:', targetDisplayName, targetUid);
            }
        }

        // Firebase Auth'ga kirish (agar parol bo'lsa)
        if (currentStepData.email && currentStepData.mrdevPassword) {
            try {
                await signInWithEmailAndPassword(auth, currentStepData.email, currentStepData.mrdevPassword);
                console.log('🔥 [MRDevLogin] Firebase Auth\'ga kiritildi');
            } catch (e) {
                console.warn('[MRDevLogin] Firebase Auth xatolik:', e.message);
            }
        }

        // YANGI: target UID bilan local auth saqlash
        saveLocalAuth({
            uid: targetUid,
            email: targetEmail,
            displayName: targetDisplayName,
            photoURL: currentStepData.photoURL,
            mrdevId: currentStepData.mrdevId,
            linkedTo: currentStepData.linkedTo
        });

        closeMrdevLoginModal();
        showToast('Xush kelibsiz! ✨', 'success');
        setTimeout(() => window.location.reload(), 500);

    } catch (e) {
        if (errorEl) errorEl.textContent = e.message;
        if (btn) { btn.disabled = false; btn.textContent = 'Tasdiqlash'; }
    }
}