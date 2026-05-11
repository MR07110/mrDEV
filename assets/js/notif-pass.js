// ==================== MRDEV NOTIF-PASS v5.1 ====================
// TO'LIQ TO'G'RILANGAN: Firebase Auth bilan to'liq integratsiya
// Barcha funksiyalar to'liq, xatoliklar boshqarilgan
// Debug loglar har bir qadamda

import logger from './core/logger.js';
import { db, rtdb } from './core/firebase-init.js';
import {
    collection, doc, setDoc, getDoc, getDocs, updateDoc,
    query, where, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
    ref, push, get, set, update, remove, onValue
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ==================== GENERATORLAR ====================

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
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, 'X')
        .replace(/\//g, 'Y')
        .replace(/=/g, 'Z')
        .substring(0, 32);
}

// ==================== ASOSIY: saveUserMrdevId ====================

export async function saveUserMrdevId(user) {
    if (!user || !user.uid) {
        console.warn('[MRDev] saveUserMrdevId: user.uid mavjud emas');
        return null;
    }

    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0] || 'User';
    const photoURL = user.photoURL || null;

    console.log('🔍 [MRDev] saveUserMrdevId chaqirildi:', { uid, email });

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        // ── MAVJUD USER ────────────────────────────────────
        if (userSnap.exists()) {
            const data = userSnap.data();

            if (data.mrdevId && data.mrdevId !== '') {
                console.log('✅ [MRDev] Mavjud MRDEV ID:', data.mrdevId);

                // Ma'lumotlarni yangilash
                try {
                    await updateDoc(userRef, {
                        displayName: displayName,
                        email: email,
                        phoneNumber: user.phoneNumber || data.phoneNumber || null,
                        photoURL: photoURL || data.photoURL || null,
                        lastLogin: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn('[MRDev] updateDoc xatolik:', e.message);
                }

                return data.mrdevId;
            }

            // mrdevId bo'sh — yangi yaratish
            const mrdevId = generateUserId();
            const mrdevPassword = generateSecurePassword();

            try {
                await updateDoc(userRef, {
                    mrdevId: mrdevId,
                    mrdevPassword: mrdevPassword,
                    lastLogin: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                console.log('🆕 [MRDev] Yangi MRDEV ID (update):', mrdevId);
                return mrdevId;
            } catch (e) {
                console.error('[MRDev] updateDoc mrdevId xatolik:', e.message);
                return null;
            }
        }

        // ── YANGI USER ────────────────────────────────────
        const mrdevId = generateUserId();
        const mrdevPassword = generateSecurePassword();

        try {
            await setDoc(userRef, {
                uid: uid,
                email: email,
                displayName: displayName,
                phoneNumber: user.phoneNumber || null,
                photoURL: photoURL,
                provider: user.providerData?.[0]?.providerId || 'unknown',
                mrdevId: mrdevId,
                mrdevPassword: mrdevPassword,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isActive: true
            });
            console.log('🆕 [MRDev] Yangi MRDEV ID (create):', mrdevId);
            return mrdevId;
        } catch (e) {
            console.error('[MRDev] setDoc xatolik:', e.code, e.message);
            return null;
        }

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

        if (snap.empty) {
            throw new Error('MRDEV ID topilmadi');
        }

        const userData = snap.docs[0].data();
        const userUid = snap.docs[0].id;

        if (!userData.email) {
            throw new Error('Bu hisob bilan email bog\'lanmagan');
        }

        console.log('✅ [MRDev] Foydalanuvchi topildi:', userData.email, '| uid:', userUid);

        return {
            uid: userUid,
            firestoreUid: userUid,
            email: userData.email,
            displayName: userData.displayName || userData.email.split('@')[0],
            phoneNumber: userData.phoneNumber || null,
            photoURL: userData.photoURL || null,
            mrdevId: userData.mrdevId,
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

        const userData = snap.docs[0].data();
        const userUid = snap.docs[0].id;
        const passCode = generatePassCode();
        const expiresAt = Date.now() + 120000; // 2 daqiqa

        const notifRef = ref(rtdb, 'pass_notifications');
        const newRef = push(notifRef);

        await set(newRef, {
            passCode: passCode,
            mrdevId: mrdevId,
            uid: userUid,
            firestoreUid: userUid,
            email: userData.email,
            phoneNumber: userData.phoneNumber || null,
            expiresAt: expiresAt,
            used: false,
            createdAt: Date.now()
        });

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🔑 [DEV] Pass Code:', passCode);
        }

        console.log('✅ [MRDev] Pass code yuborildi, key:', newRef.key);
        logger.mrdev.notify(mrdevId);

        return {
            success: true,
            email: userData.email,
            expiresAt: expiresAt,
            userId: userUid
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

        let foundKey = null;
        let foundData = null;

        for (const [key, val] of Object.entries(data)) {
            if (
                val.passCode === passCode &&
                val.mrdevId === mrdevId &&
                !val.used &&
                val.expiresAt > Date.now()
            ) {
                foundKey = key;
                foundData = val;
                break;
            }
        }

        if (!foundData) {
            logger.mrdev.wrong();
            throw new Error("Noto'g'ri parol yoki muddati tugagan");
        }

        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used: true,
            verifiedAt: Date.now()
        });

        logger.mrdev.success();
        console.log('✅ [MRDev] Pass code tasdiqlandi!');

        return {
            success: true,
            uid: foundData.uid || foundData.firestoreUid,
            firestoreUid: foundData.firestoreUid || foundData.uid,
            email: foundData.email,
            mrdevId: foundData.mrdevId
        };
    } catch (error) {
        console.error('❌ [MRDev] verifyPassCode xatolik:', error.message);
        logger.error.notif(error.message);
        throw error;
    }
}

// ==================== MRDEV PAROLNI OLISH ====================

export async function getUserMrdevPassword(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
            return docSnap.data().mrdevPassword || null;
        }
        return null;
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
            id: key,
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
            .map(([key, v]) => ({
                id: key,
                ...v,
                date: new Date(v.createdAt || Date.now()).toISOString()
            }))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
        console.warn('[MRDev] getUserNotifications xatolik:', e.message);
        return [];
    }
}

// ==================== USER OPERATSIYALARI ====================

export async function getUserDoc(uid) {
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) {
        console.warn('[MRDev] getUserDoc xatolik:', e.message);
        return null;
    }
}

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
        // user doc bo'lmasa hech narsa
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
            const q = query(
                collection(db, 'users', uid, col),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const items = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    isCloud: true,
                    date: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                }));
                localStorage.setItem('mr_' + col + '_data', JSON.stringify(items));
                count++;
            }
        } catch (e) {
            // collection yo'q yoki ruxsat yo'q
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
    console.log('🗑️ [MRDev] Local data tozalandi');
}

// ==================== YUKLANDI ====================

logger.notifPass.loaded();
console.log('✅ [MRDev] Notif-Pass v5.1 yuklandi');