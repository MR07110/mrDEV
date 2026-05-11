// ==================== MRDEV NOTIF-PASS v2.3 ====================
// To'liq tuzatilgan: Email user, Google user, Mrdev user uchun ishlaydi
// Firebase Auth UID orqali Firestore'ga yozadi
// saveUserMrdevId -> setDoc merge bilan emas, updateDoc ishlatiladi

import logger from './core/logger.js';
import { db, rtdb } from './core/firebase-init.js';

import {
    collection, doc, setDoc, getDoc, getDocs, updateDoc,
    query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
    ref, push, get, set, update, remove, onValue
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ==================== KRIPTOGRAFIK GENERATORLAR ====================

function generateUserId() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return '#' + (100000 + (arr[0] % 900000)).toString();
}

function generatePassCode() {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return (100000 + (arr[0] % 900000)).toString();
}

function generateSecurePassword() {
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, 'A')
        .replace(/\//g, 'B')
        .replace(/=/g, 'C');
}

// ==================== ASOSIY: saveUserMrdevId ====================
// FIX v2.3:
// 1. user.uid to'g'ridan-to'g'ri ishlatiladi (Firebase Auth UID)
// 2. Agar user doc mavjud bo'lmasa, avval create qilinadi
// 3. mrdevId yangilash uchun updateDoc ishlatiladi (setDoc merge emas)
// 4. Xatolik bo'lsa null qaytaradi, dastur davom etadi

async function saveUserMrdevId(user) {
    if (!user || !user.uid) {
        console.warn('[MRDev] saveUserMrdevId: user.uid mavjud emas');
        return null;
    }

    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0] || 'User';
    const photoURL = user.photoURL || null;

    logger.notifPass.userSave(email || uid);

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        // 1. Agar user doc mavjud bo'lsa
        if (userSnap.exists()) {
            const existingData = userSnap.data();

            // Eskirgan parolni yangilash
            if (!existingData.mrdevPassword || existingData.mrdevPassword.endsWith('2024')) {
                const newPassword = generateSecurePassword();
                await updateDoc(userRef, {
                    mrdevPassword: newPassword,
                    updatedAt: serverTimestamp()
                });
                logger.notifPass.passwordUpdated();
            }

            // Agar mrdevId allaqachon mavjud bo'lsa, uni qaytar
            if (existingData.mrdevId) {
                // displayName va emailni yangilab qo'yish
                if (existingData.displayName !== displayName || existingData.email !== email) {
                    await updateDoc(userRef, {
                        displayName: displayName,
                        email: email,
                        photoURL: photoURL || existingData.photoURL,
                        lastLogin: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
                return existingData.mrdevId;
            }
        } else {
            // 2. User doc mavjud emas - yaratish
            await setDoc(userRef, {
                uid: uid,
                email: email,
                displayName: displayName,
                photoURL: photoURL,
                provider: user.providerData?.[0]?.providerId || 'email',
                mrdevId: '',
                mrdevPassword: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isActive: true
            });
        }

        // 3. Yangi MRDEV ID yaratish
        let mrdevId = generateUserId();
        let unique = false;
        let attempts = 0;

        while (!unique && attempts < 100) {
            const snap = await getDocs(
                query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
            );
            if (snap.empty) {
                unique = true;
            } else {
                mrdevId = generateUserId();
            }
            attempts++;
        }

        if (!unique) {
            console.error('[MRDev] Unikal MRDEV ID yaratib bo\'lmadi');
            return null;
        }

        const mrdevPassword = generateSecurePassword();

        // 4. updateDoc bilan mrdevId va mrdevPassword yozish
        await updateDoc(userRef, {
            mrdevId: mrdevId,
            mrdevPassword: mrdevPassword,
            updatedAt: serverTimestamp()
        });

        logger.notifPass.created(mrdevId);
        return mrdevId;

    } catch (error) {
        console.error('[MRDev] saveUserMrdevId xatolik:', error.message);
        logger.error.notif(error.message);
        return null;
    }
}

// ==================== MRDEV ID ORQALI KIRISH ====================

async function loginWithMrdevId(mrdevId) {
    logger.mrdev.searching(mrdevId);

    try {
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
        );
        if (snap.empty) throw new Error('ID topilmadi');

        const userData = snap.docs[0].data();
        if (!userData.email) throw new Error('Email topilmadi');

        logger.mrdev.found(userData.email);

        return {
            uid: snap.docs[0].id,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            mrdevId: userData.mrdevId,
            mrdevPassword: userData.mrdevPassword
        };
    } catch (error) {
        logger.error.notif(error.message);
        throw error;
    }
}

// ==================== PAROL XABARNOMALARI ====================

async function sendPassCode(mrdevId) {
    try {
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
        );
        if (snap.empty) throw new Error('ID topilmadi');

        const userData = snap.docs[0].data();
        const passCode = generatePassCode();

        const newRef = push(ref(rtdb, 'pass_notifications'));
        await set(newRef, {
            passCode: passCode,
            mrdevId: mrdevId,
            uid: snap.docs[0].id,
            firestoreUid: snap.docs[0].id,
            email: userData.email,
            expiresAt: Date.now() + 120000,
            used: false,
            createdAt: Date.now()
        });

        logger.mrdev.otpSentDev(passCode);
        logger.mrdev.notify(mrdevId);

        return {
            success: true,
            email: userData.email,
            expiresAt: Date.now() + 120000,
            userId: snap.docs[0].id
        };
    } catch (error) {
        logger.error.notif(error.message);
        throw error;
    }
}

async function verifyPassCode(mrdevId, passCode) {
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
            throw new Error('Noto\'g\'ri parol yoki muddati tugagan');
        }

        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used: true,
            verifiedAt: Date.now()
        });

        logger.mrdev.success();

        return {
            success: true,
            uid: foundData.uid || foundData.firestoreUid,
            email: foundData.email,
            mrdevId: foundData.mrdevId
        };
    } catch (error) {
        logger.error.notif(error.message);
        throw error;
    }
}

async function getUserMrdevPassword(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        return docSnap.exists() ? docSnap.data().mrdevPassword || null : null;
    } catch (e) {
        return null;
    }
}

// ==================== XABARNOMALARNI BOSHQARISH ====================

function loadNotifications(callback) {
    return onValue(ref(rtdb, 'pass_notifications'), (snap) => {
        const data = snap.val();
        if (!data) {
            callback([]);
            return;
        }

        const items = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value,
            date: new Date(value.createdAt).toISOString()
        }));
        items.sort((a, b) => b.createdAt - a.createdAt);
        callback(items);
    });
}

async function clearNotifications() {
    await remove(ref(rtdb, 'pass_notifications'));
    return { success: true };
}

async function deleteNotification(notifId) {
    await remove(ref(rtdb, `pass_notifications/${notifId}`));
    return { success: true };
}

async function getUserNotifications(uid) {
    const data = (await get(ref(rtdb, 'pass_notifications'))).val();
    if (!data) return [];

    return Object.entries(data)
        .filter(([_, v]) => v.uid === uid || v.firestoreUid === uid)
        .map(([key, v]) => ({ id: key, ...v }))
        .sort((a, b) => b.createdAt - a.createdAt);
}

// ==================== USER OPERATSIYALARI ====================

async function updateUserProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
    });
    return { success: true };
}

async function updateLastLogin(uid) {
    try {
        await updateDoc(doc(db, 'users', uid), {
            lastLogin: serverTimestamp()
        });
    } catch (e) {
        // user doc bo'lmasa hech narsa
    }
}

async function getUserDoc(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ==================== SINXRONIZATSIYA ====================

async function syncCloudToLocal(uid) {
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
            // collection bo'lmasa o'tkazib yuborish
        }
    }

    localStorage.setItem('mrdev_last_sync', Date.now().toString());
    return { success: true, syncedCount: count };
}

function clearAllLocalData() {
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

// ==================== EXPORT ====================

export {
    generateUserId,
    generatePassCode,
    generateSecurePassword,
    saveUserMrdevId,
    loginWithMrdevId,
    getUserMrdevPassword,
    getUserDoc,
    sendPassCode,
    verifyPassCode,
    loadNotifications,
    clearNotifications,
    deleteNotification,
    getUserNotifications,
    updateUserProfile,
    updateLastLogin,
    syncCloudToLocal,
    clearAllLocalData
};

logger.notifPass.loaded();