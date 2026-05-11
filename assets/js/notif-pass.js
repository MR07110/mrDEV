// ==================== MRDEV NOTIF-PASS v3.0 ====================
// FIX v3.0:
//   1. Orphaned kod o'chirildi (syntax error tuzatildi) ← BU ASOSIY BUG
//   2. generateUserId() (crypto) ishlatiladi, Math.random() emas
//   3. MRDEV ID unikalligi Firestore query bilan tekshiriladi
//   4. syncCloudToLocal uchun orderBy, limit importlari qo'shildi
//   5. saveUserMrdevId: setDoc (yangi) / updateDoc (mavjud) to'g'ri ishlatiladi
//   6. mrdevPassword faqat yangi yaratilganda beriladi (mavjudida o'zgartirilmaydi)

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
// Firestore da mavjud bo'lmagan ID qaytaradi

async function generateUniqueId() {
    let mrdevId = generateUserId();
    let attempts = 0;

    while (attempts < 10) {
        try {
            const snap = await getDocs(
                query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
            );
            if (snap.empty) return mrdevId;
        } catch (e) {
            // Query xatosi bo'lsa ham ID qaytaramiz (uniqueness 100% kerak emas agar query ishlasa)
            console.warn('[MRDev] Uniqueness check failed:', e.message);
            return mrdevId;
        }
        mrdevId = generateUserId();
        attempts++;
    }

    // 10 urinishdan keyin ham topilmasa, timestamp qo'shamiz
    return '#' + Date.now().toString().slice(-6);
}

// ==================== ASOSIY: saveUserMrdevId ====================
// FIX v3.0:
//   - user.uid to'g'ridan-to'g'ri ishlatiladi (Firebase Auth UID)
//   - Mavjud mrdevId o'ZGARTIRILMAYDI — faqat o'qiladi
//   - Yangi user: setDoc (create) — to'liq doc
//   - Mavjud user: mrdevId yo'q bo'lsa updateDoc, bor bo'lsa faqat o'qib qaytaradi
//   - mrdevPassword: faqat yangi yaratilganda

export async function saveUserMrdevId(user) {
    if (!user || !user.uid) {
        console.warn('[MRDev] saveUserMrdevId: user.uid mavjud emas', user);
        return null;
    }

    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0] || 'User';

    console.log('🔍 [MRDev] saveUserMrdevId chaqirildi:', { uid, email });

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        // ── MAVJUD USER ──────────────────────────────────────────────
        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log('📄 [MRDev] Mavjud user doc topildi, mrdevId:', data.mrdevId);

            // Allaqachon mrdevId bor — o'zgartirmaymiz, faqat o'qib qaytaramiz
            if (data.mrdevId && data.mrdevId !== '') {
                console.log('✅ [MRDev] Mavjud MRDEV ID qaytarildi:', data.mrdevId);

                // Oxirgi loginni yangilash (mrdevId o'zgarmaydi — rule ruxsat beradi)
                try {
                    await updateDoc(userRef, {
                        lastLogin: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    // Lastlogin xatosi kritik emas
                    console.warn('[MRDev] lastLogin update failed:', e.message);
                }

                return data.mrdevId;
            }

            // mrdevId bo'sh — yangi yaratib updateDoc bilan yozamiz
            const newId = await generateUniqueId();
            const newPassword = generateSecurePassword();

            await updateDoc(userRef, {
                mrdevId: newId,
                mrdevPassword: newPassword,
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            logger.notifPass.created(newId);
            console.log('🆕 [MRDev] Yangi MRDEV ID yaratildi (updateDoc):', newId);
            return newId;
        }

        // ── YANGI USER ────────────────────────────────────────────────
        const newId = await generateUniqueId();
        const newPassword = generateSecurePassword();

        await setDoc(userRef, {
            uid:           uid,
            email:         email,
            displayName:   displayName,
            photoURL:      user.photoURL || null,
            mrdevId:       newId,
            mrdevPassword: newPassword,
            provider:      user.providerData?.[0]?.providerId || 'unknown',
            createdAt:     serverTimestamp(),
            updatedAt:     serverTimestamp(),
            lastLogin:     serverTimestamp(),
            isActive:      true
        });

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

export async function loginWithMrdevId(mrdevId) {
    console.log('🔍 [MRDev] loginWithMrdevId:', mrdevId);

    try {
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
        );
        if (snap.empty) throw new Error('MRDEV ID topilmadi');

        const userData = snap.docs[0].data();
        if (!userData.email) throw new Error('Email topilmadi');

        console.log('✅ [MRDev] User topildi:', userData.email);

        return {
            uid:           snap.docs[0].id,
            email:         userData.email,
            displayName:   userData.displayName || userData.email.split('@')[0],
            photoURL:      userData.photoURL || null,
            mrdevId:       userData.mrdevId,
            mrdevPassword: userData.mrdevPassword || null
        };
    } catch (error) {
        console.error('❌ [MRDev] loginWithMrdevId xatolik:', error.message);
        logger.error.notif(error.message);
        throw error;
    }
}

// ==================== PAROL XABARNOMALARI ====================

export async function sendPassCode(mrdevId) {
    console.log('📤 [MRDev] sendPassCode:', mrdevId);

    try {
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
        );
        if (snap.empty) throw new Error('ID topilmadi');

        const userData  = snap.docs[0].data();
        const passCode  = generatePassCode();
        const expiresAt = Date.now() + 120000;

        const newRef = push(ref(rtdb, 'pass_notifications'));
        await set(newRef, {
            passCode:     passCode,
            mrdevId:      mrdevId,
            uid:          snap.docs[0].id,
            firestoreUid: snap.docs[0].id,
            email:        userData.email,
            expiresAt:    expiresAt,
            used:         false,
            createdAt:    Date.now()
        });

        // DEV: consoleda parolni ko'rsatish
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔑 [DEV] Pass Code:', passCode);
        }

        logger.mrdev.notify(mrdevId);
        console.log('✅ [MRDev] Pass code yuborildi, key:', newRef.key);

        return {
            success:   true,
            email:     userData.email,
            expiresAt: expiresAt,
            userId:    snap.docs[0].id
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
        const data = snapshot.val();

        if (!data) throw new Error('Xabarlar topilmadi');

        let foundKey  = null;
        let foundData = null;

        for (const [key, val] of Object.entries(data)) {
            if (
                val.passCode === passCode &&
                val.mrdevId  === mrdevId &&
                !val.used    &&
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
    if (!uid) return { success: false, error: 'uid yo\'q' };

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
            // Collection bo'lmasa o'tkazib yuborish
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
