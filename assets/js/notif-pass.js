// ==================== MRDEV NOTIF-PASS v4.0 ====================
// FIX v4.0 — ASOSIY BUG TUZATILDI:
//   1. mrdev_index collection qo'shildi (public read — auth kerak emas!)
//   2. generateUniqueId() → mrdev_index dan tekshiradi (auth shart emas)
//   3. loginWithMrdevId() → mrdev_index/{mrdevId} getDoc (auth shart emas)
//   4. sendPassCode() → mrdev_index/{mrdevId} getDoc (auth shart emas)
//   5. saveUserMrdevId() → users ga yozganidan keyin mrdev_index ga ham yozadi
//
// BUG SABABI:
//   users collection: "allow read: if request.auth != null" — login vaqtida
//   foydalanuvchi hali autentifikatsiya qilinmagan, shuning uchun
//   "Missing or insufficient permissions" xatosi chiqadi.
//
// YECHIM:
//   mrdev_index/{mrdevId} → { uid, email, displayName, photoURL }
//   Firestore rule: "allow read: if true" (public, login uchun)

import logger from './core/logger.js';
import { db, rtdb } from './core/firebase-init.js';

import {
    collection, doc, setDoc, getDoc, getDocs, updateDoc,
    query, where, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
    ref, push, get, set, update, remove, onValue
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ==================== KRIPTOGRAFIK GENERATORLAR ====================

export function generateUserId() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return '#' + (100000 + (arr[0] % 900000)).toString();
}

export function generatePassCode() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (100000 + (arr[0] % 900000)).toString();
}

export function generateSecurePassword() {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, 'A')
        .replace(/\//g, 'B')
        .replace(/=/g, 'C');
}

// ==================== UNIKAL MRDEV ID YARATISH ====================
// FIX v4.0: mrdev_index dan tekshiradi (auth kerak emas)

async function generateUniqueId() {
    let mrdevId  = generateUserId();
    let attempts = 0;

    while (attempts < 10) {
        try {
            // FIX: users query emas — mrdev_index getDoc (auth shart emas)
            const snap = await getDoc(doc(db, 'mrdev_index', mrdevId));
            if (!snap.exists()) return mrdevId;
        } catch (e) {
            console.warn('[MRDev] Uniqueness check failed:', e.message);
            return mrdevId;
        }
        mrdevId = generateUserId();
        attempts++;
    }

    return '#' + Date.now().toString().slice(-6);
}

// ==================== mrdev_index GA YOZISH ====================
// Faqat authenticated holda chaqiriladi (saveUserMrdevId ichida)

async function writeMrdevIndex(mrdevId, uid, email, displayName, photoURL) {
    if (!mrdevId || !uid) return;
    try {
        await setDoc(doc(db, 'mrdev_index', mrdevId), {
            uid:         uid,
            email:       email       || '',
            displayName: displayName || '',
            photoURL:    photoURL    || null,
            updatedAt:   serverTimestamp()
        });
        console.log('📇 [MRDev] mrdev_index yozildi:', mrdevId, '→', uid);
    } catch (e) {
        console.warn('[MRDev] mrdev_index write failed:', e.message);
    }
}

// ==================== ASOSIY: saveUserMrdevId ====================
// FIX v4.0: users ga yozgandan keyin mrdev_index ga ham yozadi

export async function saveUserMrdevId(user) {
    if (!user || !user.uid) {
        console.warn('[MRDev] saveUserMrdevId: user.uid mavjud emas', user);
        return null;
    }

    const uid         = user.uid;
    const email       = user.email       || '';
    const displayName = user.displayName || email.split('@')[0] || 'User';
    const photoURL    = user.photoURL    || null;

    console.log('🔍 [MRDev] saveUserMrdevId chaqirildi:', { uid, email });

    try {
        const userRef  = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        // ── MAVJUD USER ──────────────────────────────────────────────
        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log('📄 [MRDev] Mavjud user doc topildi, mrdevId:', data.mrdevId);

            if (data.mrdevId && data.mrdevId !== '') {
                console.log('✅ [MRDev] Mavjud MRDEV ID qaytarildi:', data.mrdevId);

                // mrdev_index ni ham yangilab qo'yamiz (yo'q bo'lsa qo'shiladi)
                await writeMrdevIndex(data.mrdevId, uid, email, displayName, photoURL);

                try {
                    await updateDoc(userRef, {
                        lastLogin: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn('[MRDev] lastLogin update failed:', e.message);
                }

                return data.mrdevId;
            }

            // mrdevId bo'sh — yangi yaratib updateDoc bilan yozamiz
            const newId       = await generateUniqueId();
            const newPassword = generateSecurePassword();

            await updateDoc(userRef, {
                mrdevId:       newId,
                mrdevPassword: newPassword,
                lastLogin:     serverTimestamp(),
                updatedAt:     serverTimestamp()
            });

            // FIX: mrdev_index ga ham yozamiz
            await writeMrdevIndex(newId, uid, email, displayName, photoURL);

            logger.notifPass.created(newId);
            console.log('🆕 [MRDev] Yangi MRDEV ID yaratildi (updateDoc):', newId);
            return newId;
        }

        // ── YANGI USER ────────────────────────────────────────────────
        const newId       = await generateUniqueId();
        const newPassword = generateSecurePassword();

        await setDoc(userRef, {
            uid:           uid,
            email:         email,
            displayName:   displayName,
            photoURL:      photoURL,
            mrdevId:       newId,
            mrdevPassword: newPassword,
            provider:      user.providerData?.[0]?.providerId || 'unknown',
            createdAt:     serverTimestamp(),
            updatedAt:     serverTimestamp(),
            lastLogin:     serverTimestamp(),
            isActive:      true
        });

        // FIX: mrdev_index ga ham yozamiz
        await writeMrdevIndex(newId, uid, email, displayName, photoURL);

        logger.notifPass.created(newId);
        console.log('🆕 [MRDev] Yangi MRDEV ID yaratildi (setDoc):', newId);
        return newId;

    } catch (error) {
        console.error('❌ [MRDev] saveUserMrdevId xatolik:', error.code, error.message);
        logger.error.notif(error.message);
        return null;
    }
}

// ==================== MRDEV ID ORQALI KIRISH ====================
// FIX v4.0: users collection emas — mrdev_index/{mrdevId} getDoc (auth kerak emas!)

export async function loginWithMrdevId(mrdevId) {
    console.log('🔍 [MRDev] loginWithMrdevId:', mrdevId);

    try {
        // FIX: mrdev_index — public read, auth shart emas
        const indexSnap = await getDoc(doc(db, 'mrdev_index', mrdevId));

        if (!indexSnap.exists()) throw new Error('MRDEV ID topilmadi');

        const indexData = indexSnap.data();
        if (!indexData.email) throw new Error('Email topilmadi');
        if (!indexData.uid)   throw new Error('UID topilmadi');

        console.log('✅ [MRDev] mrdev_index dan topildi:', indexData.email);

        return {
            uid:           indexData.uid,
            email:         indexData.email,
            displayName:   indexData.displayName || indexData.email.split('@')[0],
            photoURL:      indexData.photoURL    || null,
            mrdevId:       mrdevId,
            mrdevPassword: null  // mrdev_index da saqlanmaydi (xavfsizlik)
        };
    } catch (error) {
        console.error('❌ [MRDev] loginWithMrdevId xatolik:', error.message);
        logger.error.notif(error.message);
        throw error;
    }
}

// ==================== PAROL XABARNOMALARI ====================
// FIX v4.0: mrdev_index/{mrdevId} getDoc (auth kerak emas!)

export async function sendPassCode(mrdevId) {
    console.log('📤 [MRDev] sendPassCode:', mrdevId);

    try {
        // FIX: mrdev_index — public read, auth shart emas
        const indexSnap = await getDoc(doc(db, 'mrdev_index', mrdevId));

        if (!indexSnap.exists()) throw new Error('ID topilmadi');

        const indexData = indexSnap.data();
        const uid       = indexData.uid;
        const email     = indexData.email;

        const passCode  = generatePassCode();
        const expiresAt = Date.now() + 120000;

        const newRef = push(ref(rtdb, 'pass_notifications'));
        await set(newRef, {
            passCode:     passCode,
            mrdevId:      mrdevId,
            uid:          uid,
            firestoreUid: uid,
            email:        email,
            expiresAt:    expiresAt,
            used:         false,
            createdAt:    Date.now()
        });

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔑 [DEV] Pass Code:', passCode);
        }

        logger.mrdev.notify(mrdevId);
        console.log('✅ [MRDev] Pass code yuborildi, key:', newRef.key);

        return {
            success:   true,
            email:     email,
            expiresAt: expiresAt,
            userId:    uid
        };
    } catch (error) {
        console.error('❌ [MRDev] sendPassCode xatolik:', error.message);
        logger.error.notif(error.message);
        throw error;
    }
}

export async function verifyPassCode(mrdevId, passCode) {
    console.log('🔐 [MRDev] verifyPassCode:', mrdevId);
    logger.mrdev.verifying(mrdevId);

    try {
        const snapshot = await get(ref(rtdb, 'pass_notifications'));
        const data     = snapshot.val();

        if (!data) throw new Error('Xabarlar topilmadi');

        let foundKey  = null;
        let foundData = null;

        for (const [key, val] of Object.entries(data)) {
            if (
                val.passCode === passCode &&
                val.mrdevId  === mrdevId  &&
                !val.used                 &&
                val.expiresAt > Date.now()
            ) {
                foundKey  = key;
                foundData = val;
                break;
            }
        }

        if (!foundData) {
            logger.mrdev.wrong();
            throw new Error("Noto'g'ri parol yoki muddati tugagan");
        }

        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used:       true,
            verifiedAt: Date.now()
        });

        logger.mrdev.success();
        console.log('✅ [MRDev] Pass code tasdiqlandi!');

        return {
            success: true,
            uid:     foundData.uid || foundData.firestoreUid,
            email:   foundData.email,
            mrdevId: foundData.mrdevId
        };
    } catch (error) {
        console.error('❌ [MRDev] verifyPassCode xatolik:', error.message);
        logger.error.notif(error.message);
        throw error;
    }
}

export async function getUserMrdevPassword(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        return docSnap.exists() ? docSnap.data().mrdevPassword || null : null;
    } catch (e) {
        console.warn('[MRDev] getUserMrdevPassword xatolik:', e.message);
        return null;
    }
}

// ==================== XABARNOMALARNI BOSHQARISH ====================

export function loadNotifications(callback) {
    return onValue(ref(rtdb, 'pass_notifications'), (snap) => {
        const data = snap.val();
        if (!data) {
            callback([]);
            return;
        }
        const items = Object.entries(data).map(([key, value]) => ({
            id:   key,
            ...value,
            date: new Date(value.createdAt || Date.now()).toISOString()
        }));
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        callback(items);
    });
}

export async function clearNotifications() {
    await remove(ref(rtdb, 'pass_notifications'));
    return { success: true };
}

export async function deleteNotification(notifId) {
    await remove(ref(rtdb, `pass_notifications/${notifId}`));
    return { success: true };
}

export async function getUserNotifications(uid) {
    try {
        const data = (await get(ref(rtdb, 'pass_notifications'))).val();
        if (!data) return [];
        return Object.entries(data)
            .filter(([_, v]) => v.uid === uid || v.firestoreUid === uid)
            .map(([key, v]) => ({ id: key, ...v }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
        console.warn('[MRDev] getUserNotifications xatolik:', e.message);
        return [];
    }
}

// ==================== USER OPERATSIYALARI ====================

export async function updateUserProfile(uid, data) {
    try {
        await updateDoc(doc(db, 'users', uid), {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.warn('[MRDev] updateUserProfile xatolik:', e.message);
        return { success: false, error: e.message };
    }
}

export async function updateLastLogin(uid) {
    try {
        await updateDoc(doc(db, 'users', uid), {
            lastLogin: serverTimestamp()
        });
    } catch (e) {
        console.warn('[MRDev] updateLastLogin xatolik:', e.message);
    }
}

export async function getUserDoc(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) {
        console.warn('[MRDev] getUserDoc xatolik:', e.message);
        return null;
    }
}

// ==================== SINXRONIZATSIYA ====================

export async function syncCloudToLocal(uid) {
    if (!uid) return { success: false, error: "uid yo'q" };

    const cols = [
        'alarms', 'calculations', 'timers', 'stopwatch', 'board',
        'bingo', 'qrcodes', 'notes', 'exams', 'todos', 'bingo_stats'
    ];
    let count = 0;

    for (const col of cols) {
        try {
            const q    = query(
                collection(db, 'users', uid, col),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const items = snap.docs.map(d => ({
                    id:      d.id,
                    ...d.data(),
                    isCloud: true,
                    date:    d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                }));
                localStorage.setItem('mr_' + col + '_data', JSON.stringify(items));
                count++;
            }
        } catch (e) {
            console.warn(`[MRDev] syncCloudToLocal ${col}:`, e.message);
        }
    }

    localStorage.setItem('mrdev_last_sync', Date.now().toString());
    console.log(`✅ [MRDev] Sync tugadi. ${count} ta collection sinxronlandi.`);
    return { success: true, syncedCount: count };
}

export function clearAllLocalData() {
    const keys = [
        'mr_clock_alarms', 'mr_calc_history', 'mr_timer_history',
        'mr_stopwatch_history', 'mr_board_data', 'mr_bingo_history',
        'mr_qr_history', 'mr_notes_data', 'mr_exam_questions',
        'mr_todo_tasks', 'bingo_stats'
    ];
    keys.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
    });
}

logger.notifPass.loaded();
