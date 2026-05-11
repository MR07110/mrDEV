// ==================== MRDEV NOTIF-PASS v5.0 ====================
// FIX: mrdev_index EMAS, users collection ishlatiladi
// Sabab: mrdev_index collection mavjud emas

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
    const arr = new Uint8Array(18);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr))
        .replace(/\+/g, 'A')
        .replace(/\//g, 'B')
        .replace(/=/g, 'C');
}

// ==================== ASOSIY: saveUserMrdevId ====================
// FIX v5.0: users collection ishlatiladi (mrdev_index EMAS)

export async function saveUserMrdevId(user) {
    if (!user || !user.uid) {
        console.warn('[MRDev] saveUserMrdevId: user.uid mavjud emas');
        return null;
    }

    const uid = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || email.split('@')[0] || 'User';
    const photoURL = user.photoURL || null;

    console.log('🔍 [MRDev] saveUserMrdevId:', { uid, email });

    try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        // MAVJUD USER - mrdevId bor bo'lsa qaytar
        if (userSnap.exists()) {
            const data = userSnap.data();
            
            if (data.mrdevId && data.mrdevId !== '') {
                console.log('✅ [MRDev] Mavjud MRDEV ID:', data.mrdevId);
                
                // Ma'lumotlarni yangilash
                try {
                    await updateDoc(userRef, {
                        displayName: displayName,
                        email: email,
                        photoURL: photoURL || data.photoURL || null,
                        lastLogin: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } catch (e) {
                    console.warn('[MRDev] updateDoc xatolik:', e.message);
                }
                
                return data.mrdevId;
            }
        }

        // YANGI MRDEV ID
        const mrdevId = generateUserId();
        const mrdevPassword = generateSecurePassword();
        
        console.log('🆕 [MRDev] Yangi MRDEV ID:', mrdevId);

        if (userSnap.exists()) {
            // updateDoc - mavjud doc ga qo'shish
            await updateDoc(userRef, {
                mrdevId: mrdevId,
                mrdevPassword: mrdevPassword,
                email: email,
                displayName: displayName,
                photoURL: photoURL || userSnap.data().photoURL || null,
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log('📝 [MRDev] updateDoc qilindi');
        } else {
            // setDoc - yangi doc yaratish
            await setDoc(userRef, {
                uid: uid,
                email: email,
                displayName: displayName,
                photoURL: photoURL,
                mrdevId: mrdevId,
                mrdevPassword: mrdevPassword,
                provider: user.providerData?.[0]?.providerId || 'unknown',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                isActive: true
            });
            console.log('📝 [MRDev] setDoc qilindi');
        }

        return mrdevId;

    } catch (error) {
        console.error('❌ [MRDev] saveUserMrdevId xatolik:', error.code, error.message);
        
        // Permission denied bo'lsa, localStorage'ga saqlash
        if (error.code === 'permission-denied') {
            console.warn('[MRDev] Permission denied! localStorage ga saqlanadi');
            const fallbackId = generateUserId();
            localStorage.setItem('mrdev_user_id', fallbackId);
            return fallbackId;
        }
        
        return null;
    }
}

// ==================== MRDEV ID ORQALI KIRISH ====================
// FIX v5.0: users collection dan qidirish (auth kerak EMAS - rules: allow read: if request.auth != null)

export async function loginWithMrdevId(mrdevId) {
    console.log('🔍 [MRDev] loginWithMrdevId:', mrdevId);

    try {
        // FIX: users collection dan where query
        const snap = await getDocs(
            query(collection(db, 'users'), where('mrdevId', '==', mrdevId))
        );
        
        if (snap.empty) throw new Error('MRDEV ID topilmadi');

        const userData = snap.docs[0].data();
        if (!userData.email) throw new Error('Email topilmadi');

        console.log('✅ [MRDev] Topildi:', userData.email);

        return {
            uid: snap.docs[0].id,
            email: userData.email,
            displayName: userData.displayName || userData.email.split('@')[0],
            photoURL: userData.photoURL || null,
            mrdevId: userData.mrdevId,
            mrdevPassword: userData.mrdevPassword || null
        };
    } catch (error) {
        console.error('❌ [MRDev] loginWithMrdevId xatolik:', error.message);
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
        const passCode = generatePassCode();
        const expiresAt = Date.now() + 120000;

        const newRef = push(ref(rtdb, 'pass_notifications'));
        await set(newRef, {
            passCode: passCode,
            mrdevId: mrdevId,
            uid: snap.docs[0].id,
            firestoreUid: snap.docs[0].id,
            email: userData.email,
            expiresAt: expiresAt,
            used: false,
            createdAt: Date.now()
        });

        console.log('✅ [MRDev] Pass code yuborildi');

        return {
            success: true,
            email: userData.email,
            expiresAt: expiresAt,
            userId: snap.docs[0].id
        };
    } catch (error) {
        console.error('❌ [MRDev] sendPassCode xatolik:', error.message);
        throw error;
    }
}

export async function verifyPassCode(mrdevId, passCode) {
    console.log('🔐 [MRDev] verifyPassCode:', mrdevId);

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

        if (!foundData) throw new Error("Noto'g'ri parol yoki muddati tugagan");

        await update(ref(rtdb, `pass_notifications/${foundKey}`), {
            used: true,
            verifiedAt: Date.now()
        });

        console.log('✅ [MRDev] Pass code tasdiqlandi');

        return {
            success: true,
            uid: foundData.uid || foundData.firestoreUid,
            email: foundData.email,
            mrdevId: foundData.mrdevId
        };
    } catch (error) {
        console.error('❌ [MRDev] verifyPassCode xatolik:', error.message);
        throw error;
    }
}

// ==================== QOLGAN FUNKSIYALAR ====================

export async function getUserMrdevPassword(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        return docSnap.exists() ? docSnap.data().mrdevPassword || null : null;
    } catch (e) {
        return null;
    }
}

export function loadNotifications(callback) {
    return onValue(ref(rtdb, 'pass_notifications'), (snap) => {
        const data = snap.val();
        if (!data) { callback([]); return; }
        const items = Object.entries(data).map(([key, value]) => ({
            id: key, ...value,
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
    const data = (await get(ref(rtdb, 'pass_notifications'))).val();
    if (!data) return [];
    return Object.entries(data)
        .filter(([_, v]) => v.uid === uid || v.firestoreUid === uid)
        .map(([key, v]) => ({ id: key, ...v }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function updateUserProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
    return { success: true };
}

export async function updateLastLogin(uid) {
    try { await updateDoc(doc(db, 'users', uid), { lastLogin: serverTimestamp() }); } catch (e) {}
}

export async function getUserDoc(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function syncCloudToLocal(uid) {
    const cols = ['alarms', 'calculations', 'timers', 'stopwatch', 'board', 'bingo', 'qrcodes', 'notes', 'exams', 'todos', 'bingo_stats'];
    let count = 0;
    for (const col of cols) {
        try {
            const q = query(collection(db, 'users', uid, col), orderBy('createdAt', 'desc'), limit(50));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const items = snap.docs.map(d => ({ id: d.id, ...d.data(), isCloud: true, date: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString() }));
                localStorage.setItem('mr_' + col + '_data', JSON.stringify(items));
                count++;
            }
        } catch (e) {}
    }
    localStorage.setItem('mrdev_last_sync', Date.now().toString());
    return { success: true, syncedCount: count };
}

export function clearAllLocalData() {
    ['mr_clock_alarms', 'mr_calc_history', 'mr_timer_history', 'mr_stopwatch_history', 'mr_board_data', 'mr_bingo_history', 'mr_qr_history', 'mr_notes_data', 'mr_exam_questions', 'mr_todo_tasks', 'bingo_stats']
        .forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
}

logger.notifPass.loaded();