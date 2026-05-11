// ==================== MRDEV FIREBASE HELPER v7.0 ====================
// FIX v7.0:
//   1. getUserId — local auth (mrdev_local_auth) dan uid to'g'ri o'qiladi
//   2. getLocalAuthUser — isLoggedIn tekshiruvi mustahkamlandi
//   3. initAuth — local auth user uchun callback to'g'ri chaqiriladi
//   4. Debug loglar muhim operatsiyalarda

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    browserLocalPersistence,
    setPersistence
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    onSnapshot,
    deleteDoc,
    doc,
    serverTimestamp,
    getDocs,
    setDoc,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== FIREBASE CONFIG ====================
const ENV = window.__ENV__ || {};
const firebaseConfig = {
    apiKey:            ENV.MAIN_API_KEY            || '',
    authDomain:        ENV.MAIN_AUTH_DOMAIN        || '',
    projectId:         ENV.MAIN_PROJECT_ID         || '',
    storageBucket:     ENV.MAIN_STORAGE_BUCKET     || '',
    messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || '',
    appId:             ENV.MAIN_APP_ID             || ''
};

// ==================== SINGLETON ====================
let _app  = null;
let _auth = null;
let _db   = null;

function getFirebase() {
    if (_app) return { app: _app, auth: _auth, db: _db };
    try {
        const existing = getApps().find(a => a.name === 'mrdev_main');
        _app  = existing || initializeApp(firebaseConfig, 'mrdev_main');
        _auth = getAuth(_app);
        _db   = getFirestore(_app);
        setPersistence(_auth, browserLocalPersistence).catch(err => {
            console.warn('[FirebaseHelper] Persistence error:', err.message);
        });
    } catch (e) {
        console.error('[FirebaseHelper] init error:', e);
    }
    return { app: _app, auth: _auth, db: _db };
}

// ==================== LOCAL AUTH ====================

/**
 * FIX: mrdev_local_auth dan foydalanuvchini o'qish.
 * isLoggedIn === true MAJBURIY (mrdev-login.js va email-auth.js shunday saqlaydi).
 */
function getLocalAuthUser() {
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');

        if (!local) return null;

        // FIX: isLoggedIn tekshiruvi
        if (!local.isLoggedIn) {
            console.warn('[FirebaseHelper] local auth: isLoggedIn false');
            return null;
        }

        if (!local.uid) {
            console.warn('[FirebaseHelper] local auth: uid yo\'q');
            return null;
        }

        // Muddatni tekshirish (7 kun)
        const days = (Date.now() - (local.loginTime || 0)) / (1000 * 60 * 60 * 24);
        if (days > 7) {
            console.warn('[FirebaseHelper] local auth muddati tugagan');
            localStorage.removeItem('mrdev_local_auth');
            return null;
        }

        return {
            uid:             local.uid,
            email:           local.email           || '',
            displayName:     local.displayName     || 'User',
            photoURL:        local.photoURL        || null,
            mrdevId:         local.mrdevId         || localStorage.getItem('mrdev_user_id') || '',
            isAuthenticated: true,
            authType:        local.authType        || 'mrdev'
        };
    } catch (e) {
        console.warn('[FirebaseHelper] getLocalAuthUser xatolik:', e.message);
        return null;
    }
}

// ==================== AUTH ====================

function initAuth(callback) {
    const { auth } = getFirebase();

    if (auth) {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userData = {
                    uid:             user.uid,
                    displayName:     user.displayName || user.email?.split('@')[0] || 'User',
                    email:           user.email || '',
                    photoURL:        user.photoURL || null,
                    mrdevId:         localStorage.getItem('mrdev_user_id') || '',
                    isAuthenticated: true,
                    authType:        'firebase'
                };

                localStorage.setItem('mrdev_auth_user', JSON.stringify(userData));

                // Cloud sync (30 soniyada bir marta)
                const lastSync = localStorage.getItem('mrdev_last_sync');
                const now      = Date.now();
                if (!lastSync || (now - parseInt(lastSync, 10)) > 30000) {
                    await syncCloudToLocal(user.uid);
                    localStorage.setItem('mrdev_last_sync', now.toString());
                }

                if (callback) callback(userData);

            } else {
                // Firebase user yo'q — local auth tekshirish
                const localUser = getLocalAuthUser();
                if (localUser) {
                    console.log('[FirebaseHelper] Local auth user topildi:', localUser.uid);

                    // Cloud sync local auth uchun ham
                    const lastSync = localStorage.getItem('mrdev_last_sync');
                    const now      = Date.now();
                    if (!lastSync || (now - parseInt(lastSync, 10)) > 30000) {
                        await syncCloudToLocal(localUser.uid).catch(() => {});
                        localStorage.setItem('mrdev_last_sync', now.toString());
                    }

                    if (callback) callback(localUser);
                } else {
                    localStorage.removeItem('mrdev_auth_user');
                    localStorage.removeItem('mrdev_last_sync');
                    if (callback) callback(null);
                }
            }
        });
    }

    // Auth mavjud emas — local auth tekshirish
    const localUser = getLocalAuthUser();
    if (callback) callback(localUser);
    return () => {};
}

function getCurrentUser() {
    const { auth } = getFirebase();
    const fbUser   = auth ? auth.currentUser : null;

    if (fbUser) {
        return {
            uid:             fbUser.uid,
            displayName:     fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email:           fbUser.email || '',
            photoURL:        fbUser.photoURL || null,
            mrdevId:         localStorage.getItem('mrdev_user_id') || '',
            isAuthenticated: true,
            authType:        'firebase'
        };
    }

    return getLocalAuthUser();
}

/**
 * FIX: getUserId — Firebase Auth va local auth ikkalasini tekshiradi.
 * Mini-applar (board, notes, calculator, etc.) bu funksiyani ishlatadi.
 */
function getUserId() {
    // 1. Firebase Auth (Google yoki Email firebase login)
    const { auth } = getFirebase();
    const fbUser   = auth ? auth.currentUser : null;
    if (fbUser) return fbUser.uid;

    // 2. Local auth (MRDEV Login yoki Email login localStorage'da)
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');
        if (local && local.isLoggedIn && local.uid) {
            return local.uid;
        }
    } catch (e) {
        console.warn('[FirebaseHelper] getUserId local parse xatolik:', e.message);
    }

    return null;
}

async function logoutUser() {
    const { auth } = getFirebase();
    if (auth) {
        try { await signOut(auth); } catch (e) {}
    }
    localStorage.removeItem('mrdev_local_auth');
    localStorage.removeItem('mrdev_user_id');
    localStorage.removeItem('mrdev_auth_user');
}

// ==================== LOCAL CLEANUP ====================

function clearAllLocalData() {
    const keys = [
        'mr_clock_alarms',   'mr_calc_history',   'mr_timer_history',
        'mr_stopwatch_history', 'mr_board_data',  'mr_bingo_history',
        'mr_qr_history',     'mr_notes_data',     'mr_exam_questions',
        'mr_timer_state',    'mr_stopwatch_state', 'mr_music_history',
        'mr_splitview_urls', 'mr_todo_tasks',     'mr_weather_cities',
        'bingo_winstreak',   'bingo_xp',          'bingo_level',
        'bingo_scoreX',      'bingo_scoreO',      'bingo_stats',
        'bingo_history',     'splitview_cloud_urls', 'mrdev_last_sync'
    ];
    keys.forEach(key => { try { localStorage.removeItem(key); } catch (e) {} });
}

// ==================== SYNC CLOUD -> LOCAL ====================

async function syncCloudToLocal(uid) {
    if (!uid) return;
    const { db } = getFirebase();
    if (!db) return;

    const collections = [
        { cloud: 'alarms',       local: 'mr_clock_alarms' },
        { cloud: 'calculations', local: 'mr_calc_history' },
        { cloud: 'timers',       local: 'mr_timer_history' },
        { cloud: 'stopwatch',    local: 'mr_stopwatch_history' },
        { cloud: 'board',        local: 'mr_board_data' },
        { cloud: 'bingo',        local: 'mr_bingo_history' },
        { cloud: 'qrcodes',      local: 'mr_qr_history' },
        { cloud: 'notes',        local: 'mr_notes_data' },
        { cloud: 'exams',        local: 'mr_exam_questions' },
        { cloud: 'todos',        local: 'mr_todo_tasks' },
        { cloud: 'bingo_stats',  local: 'bingo_stats' }
    ];

    for (const { cloud, local } of collections) {
        try {
            const q    = query(
                collection(db, 'users', uid, cloud),
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
                localStorage.setItem(local, JSON.stringify(items));
            }
        } catch (e) {
            // Collection yo'q yoki ruxsat yo'q — skip
        }
    }
}

// ==================== SMART SAVE ====================

async function smartSave(collectionName, localKey, data) {
    const uid = getUserId();

    // 1. Local saqlash
    try {
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        local.unshift({
            ...data,
            date: data.date || new Date().toISOString(),
            id:   'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
        });
        localStorage.setItem(localKey, JSON.stringify(local.slice(0, 50)));
    } catch (e) {
        console.warn('[FirebaseHelper] Local save failed:', e.message);
    }

    // 2. Cloud saqlash
    if (uid) {
        try {
            const { db } = getFirebase();
            if (db) {
                await addDoc(collection(db, 'users', uid, collectionName), {
                    ...data,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.warn('[FirebaseHelper] Cloud save failed:', e.message);
        }
    }
}

// ==================== SMART LOAD ====================

function smartLoad(collectionName, localKey, callback) {
    const uid    = getUserId();
    const { db } = getFirebase();

    // Avval local ko'rsatish
    try {
        const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (callback && localItems.length > 0) {
            callback(localItems);
        }
    } catch (e) {}

    if (uid && db) {
        try {
            const q = query(
                collection(db, 'users', uid, collectionName),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            let resolved = false;
            return onSnapshot(q, (snap) => {
                if (resolved) return;
                resolved = true;
                const cloudItems = snap.docs.map(d => ({
                    id:      d.id,
                    ...d.data(),
                    isCloud: true,
                    date:    d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                }));
                localStorage.setItem(localKey, JSON.stringify(cloudItems));
                if (callback) callback(cloudItems);
            }, (error) => {
                if (resolved) return;
                resolved = true;
                console.warn('[FirebaseHelper] Cloud load failed:', error.message);
                try {
                    const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
                    if (callback) callback(localItems);
                } catch (e) {}
            });
        } catch (e) {
            console.warn('[FirebaseHelper] Cloud listener error:', e.message);
            try {
                const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
                if (callback) callback(localItems);
            } catch (e2) {}
            return () => {};
        }
    } else {
        return () => {};
    }
}

// ==================== DELETE ====================

async function smartDelete(collectionName, localKey, itemId, isCloud) {
    const uid = getUserId();

    try {
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify(local.filter(i => i.id !== itemId)));
    } catch (e) {}

    if (uid && isCloud) {
        try {
            const { db } = getFirebase();
            if (db) {
                await deleteDoc(doc(db, 'users', uid, collectionName, itemId));
            }
        } catch (e) {
            console.warn('[FirebaseHelper] Delete error:', e.message);
        }
    }
}

// ==================== CLEAR ALL ====================

async function clearAll(collectionName, localKey) {
    const uid = getUserId();
    localStorage.removeItem(localKey);

    if (uid) {
        try {
            const { db } = getFirebase();
            if (db) {
                const snap = await getDocs(collection(db, 'users', uid, collectionName));
                if (!snap.empty) {
                    const batch = writeBatch(db);
                    snap.docs.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                }
            }
        } catch (e) {
            console.warn('[FirebaseHelper] Clear error:', e.message);
        }
    }
}

// ==================== EXPORT ====================

export {
    getFirebase,
    initAuth,
    getCurrentUser,
    getUserId,
    logoutUser,
    smartSave,
    smartLoad,
    smartDelete,
    clearAll,
    clearAllLocalData
};
