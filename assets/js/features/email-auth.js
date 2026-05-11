// ==================== MRDEV EMAIL AUTH v4.0 ====================
// FIX v4.0:
//   1. signInWithEmail: saveUserMrdevId to'g'ri Firebase user bilan chaqiriladi
//   2. signUpWithEmail: setDoc bilan bo'sh mrdevId, keyin saveUserMrdevId updateDoc qiladi
//   3. mrdev_local_auth: mrdevId, isLoggedIn: true, authType: 'email' to'liq yoziladi
//   4. authError elementi ko'rinadi
//   5. Barcha xatoliklar catch da ko'rinadi

import logger from '../core/logger.js';
import { auth, db } from '../core/firebase-init.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from '../core/toast.js';
import { closeModal } from '../ui/modal.js';
import { saveUserMrdevId } from '../notif-pass.js';

// ==================== HOLAT ====================

const DOMAIN = '@mrdev.uz';
let _mode = 'login';

// ==================== YORDAMCHILAR ====================

function $(id) { return document.getElementById(id); }

function setErr(msg) {
    const el = $('authError');
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
}

function clearErr() { setErr(''); }

function setBtnLoading(on) {
    const btn = $('authSubmitBtn');
    if (!btn) return;
    btn.disabled    = on;
    btn.textContent = on
        ? (_mode === 'register' ? 'Yaratilmoqda...' : 'Kirilmoqda...')
        : (_mode === 'register' ? "Ro'yxatdan o'tish" : 'Kirish');
}

function toEmail(raw) {
    const v = raw.trim().toLowerCase();
    return v.includes('@') ? v : v + DOMAIN;
}

function checkUsername(u) {
    if (!u || u.length < 3)        return "Username kamida 3 ta belgi bo'lishi kerak";
    if (u.length > 20)             return "Username 20 ta belgidan oshmasin";
    if (!/^[a-z0-9._]+$/.test(u)) return "Faqat kichik harflar, raqamlar, nuqta yoki _";
    if (/^[._]|[._]$/.test(u))    return "Nuqta yoki _ bilan boshlanib/tugamasin";
    return null;
}

function firebaseErr(code) {
    return ({
        'auth/user-not-found':        'Foydalanuvchi topilmadi',
        'auth/wrong-password':        'Parol noto\'g\'ri',
        'auth/invalid-credential':    'Email yoki parol xato',
        'auth/email-already-in-use':  'Bu username allaqachon band — boshqasini tanlang',
        'auth/weak-password':         'Parol juda oddiy — kamida 6 ta belgi kiriting',
        'auth/invalid-email':         'Email formati noto\'g\'ri',
        'auth/user-disabled':         'Bu hisob bloklangan',
        'auth/too-many-requests':     'Ko\'p urinish. Bir oz kutib, qayta urinib ko\'ring',
        'auth/network-request-failed':'Internet aloqasi yo\'q',
    })[code] || 'Xatolik yuz berdi. Qayta urinib ko\'ring';
}

// ==================== REJIM: LOGIN ↔ REGISTER ====================

export function setAuthMode(mode) {
    _mode = mode;
    clearErr();
    const isReg = mode === 'register';

    const regFields = $('registerFields');
    if (regFields) regFields.style.display = isReg ? 'block' : 'none';

    if ($('loginEmail')) {
        $('loginEmail').placeholder = isReg
            ? "sardor  (sardor@mrdev.uz bo'ladi)"
            : 'username@mrdev.uz';
    }

    if ($('loginPassword')) {
        $('loginPassword').placeholder  = isReg ? 'Yangi parol (kamida 6 belgi)' : '••••••••';
        $('loginPassword').autocomplete = isReg ? 'new-password' : 'current-password';
    }

    const hint = $('emailDomainHint');
    if (hint) hint.style.display = isReg ? 'block' : 'none';

    if ($('modalTitle'))     $('modalTitle').textContent     = isReg ? "Ro'yxatdan o'tish" : 'Hisobga kirish';
    if ($('authSubmitBtn'))  $('authSubmitBtn').textContent  = isReg ? "Ro'yxatdan o'tish" : 'Kirish';
    if ($('authToggleText')) $('authToggleText').textContent = isReg ? "Hisobingiz bormi?"  : "Hisobingiz yo'qmi?";
    if ($('authToggleLink')) $('authToggleLink').textContent = isReg ? 'Kirish'             : "Ro'yxatdan o'tish";

    setTimeout(() => {
        (isReg ? $('registerName') : $('loginEmail'))?.focus();
    }, 120);
}

export function toggleAuthMode() {
    setAuthMode(_mode === 'login' ? 'register' : 'login');
}

// ==================== KIRISH ====================

export async function signInWithEmail() {
    clearErr();
    const raw  = $('loginEmail')?.value.trim() || '';
    const pass = $('loginPassword')?.value || '';

    if (!raw)  { setErr("Username yoki email kiriting"); $('loginEmail')?.focus();   return; }
    if (!pass) { setErr("Parolni kiriting");              $('loginPassword')?.focus(); return; }

    const email    = toEmail(raw);
    const username = email.split('@')[0];
    const uErr     = checkUsername(username);
    if (uErr) { setErr(uErr); return; }

    setBtnLoading(true);
    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const user = cred.user;

        console.log('✅ [EmailAuth] Firebase login OK:', user.uid);

        // MRDEV ID ni Firestore'dan olish yoki yaratish
        let mrdevId = '';
        try {
            mrdevId = await saveUserMrdevId(user) || '';
            if (mrdevId) localStorage.setItem('mrdev_user_id', mrdevId);
            console.log('🆔 [EmailAuth] MRDEV ID:', mrdevId);
        } catch (idErr) {
            console.warn('[EmailAuth] MRDEV ID xatosi:', idErr.message);
        }

        // mrdev_local_auth'ga to'liq yozish
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid:         user.uid,
            email:       user.email,
            displayName: user.displayName || username,
            photoURL:    user.photoURL || null,
            mrdevId:     mrdevId,
            provider:    'mrdev_email',
            authType:    'email',
            isLoggedIn:  true,
            loginTime:   Date.now()
        }));

        showToast('Xush kelibsiz! ✨', 'success');
        closeModal('authModal');
        _reset();

    } catch (e) {
        console.error('[EmailAuth] signInWithEmail xatolik:', e.code, e.message);
        setErr(firebaseErr(e.code));
    } finally {
        setBtnLoading(false);
    }
}

// ==================== RO'YXATDAN O'TISH ====================

export async function signUpWithEmail() {
    clearErr();
    const name = $('registerName')?.value.trim() || '';
    const raw  = $('loginEmail')?.value.trim() || '';
    const pass = $('loginPassword')?.value || '';

    const username = raw.includes('@') ? raw.split('@')[0] : raw;
    const email    = username + DOMAIN;

    if (!name || name.length < 2) {
        setErr("Ism kiriting (kamida 2 belgi)");
        $('registerName')?.focus();
        return;
    }
    const uErr = checkUsername(username);
    if (uErr) { setErr(uErr); $('loginEmail')?.focus(); return; }
    if (!pass || pass.length < 6) {
        setErr("Parol kamida 6 ta belgi bo'lishi kerak");
        $('loginPassword')?.focus();
        return;
    }

    setBtnLoading(true);
    try {
        // 1. Firebase Auth — yangi hisob
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const user = cred.user;
        console.log('✅ [EmailAuth] Firebase register OK:', user.uid);

        // 2. Profil nomi
        await updateProfile(user, { displayName: name });

        // 3. Firestore user doc yaratish (mrdevId bo'sh — saveUserMrdevId to'ldiradi)
        await setDoc(doc(db, 'users', user.uid), {
            uid:           user.uid,
            email:         email,
            username:      username,
            displayName:   name,
            photoURL:      null,
            provider:      'mrdev_email',
            mrdevId:       '',      // saveUserMrdevId updateDoc bilan to'ldiradi
            mrdevPassword: '',
            createdAt:     serverTimestamp(),
            updatedAt:     serverTimestamp(),
            lastLogin:     serverTimestamp(),
            isActive:      true
        });
        console.log('📄 [EmailAuth] Firestore doc yaratildi');

        // 4. MRDEV ID yaratish — doc mavjud bo'lgani uchun updateDoc ishlatiladi
        let mrdevId = '';
        try {
            mrdevId = await saveUserMrdevId(user) || '';
            if (mrdevId) localStorage.setItem('mrdev_user_id', mrdevId);
            console.log('🆔 [EmailAuth] Yangi MRDEV ID:', mrdevId);
        } catch (idErr) {
            console.warn('[EmailAuth] MRDEV ID xatosi:', idErr.message);
        }

        // 5. Local auth saqlash
        localStorage.setItem('mrdev_local_auth', JSON.stringify({
            uid:         user.uid,
            email:       email,
            displayName: name,
            photoURL:    null,
            mrdevId:     mrdevId,
            provider:    'mrdev_email',
            authType:    'email',
            isLoggedIn:  true,
            loginTime:   Date.now()
        }));

        showToast('Hisob yaratildi! Xush kelibsiz 🎉', 'success');
        closeModal('authModal');
        _reset();
        logger.auth.loginOk();

    } catch (e) {
        console.error('[EmailAuth] signUpWithEmail xatolik:', e.code, e.message);
        setErr(firebaseErr(e.code));
    } finally {
        setBtnLoading(false);
    }
}

// ==================== YAGONA SUBMIT ====================

export function submitAuthForm() {
    if (_mode === 'register') {
        signUpWithEmail();
    } else {
        signInWithEmail();
    }
}

// ==================== ICHKI ====================

function _reset() {
    ['loginEmail', 'loginPassword', 'registerName'].forEach(id => {
        const el = $(id);
        if (el) el.value = '';
    });
    clearErr();
    _mode = 'login';
}
