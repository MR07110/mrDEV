// ==================== MRDEV FIREBASE HELPER v6.0 ====================
// FIX: Email bilan kirgan user'ni ham taniydi

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
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
    apiKey: ENV.MAIN_API_KEY || "window.__ENV__?.MAIN_API_KEY || """,
    authDomain: ENV.MAIN_AUTH_DOMAIN || "tictactoe-26434.firebaseapp.com",
    projectId: ENV.MAIN_PROJECT_ID || "tictactoe-26434",
    storageBucket: ENV.MAIN_STORAGE_BUCKET || "tictactoe-26434.firebasestorage.app",
    messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || "763173543438",
    appId: ENV.MAIN_APP_ID || "1:763173543438:web:f89e60befddcc19b59a65f"
};

// ==================== SINGLETON ====================
let _app = null;
let _auth = null;
let _db = null;

function getFirebase() {
    if (_app) return { app: _app, auth: _auth, db: _db };
    try {
        const existing = getApps().find(a => a.name === 'mrdev_main');
        _app = existing || initializeApp(firebaseConfig, 'mrdev_main');
        _auth = getAuth(_app);
        _db = getFirestore(_app);
        setPersistence(_auth, browserLocalPersistence).catch((err) => {
            console.warn('Persistence error:', err.message);
        });
    } catch (e) {
        console.error('Firebase init error:', e);
    }
    return { app: _app, auth: _auth, db: _db };
}

// ==================== LOCAL AUTH (email login) ====================
function getLocalAuthUser() {
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');
        // FIX: isLoggedIn bo'lmasa ham email + uid + loginTime bilan tekshir
        if (local && local.email && (local.isLoggedIn || local.uid)) {
            const days = (Date.now() - local.loginTime) / (1000 * 60 * 60 * 24);
            if (days < 7) {
                return {
                    uid: local.uid,
                    email: local.email,
                    displayName: local.displayName || 'User',
                    photoURL: local.photoURL || null,
                    isAuthenticated: true,
                    authType: local.authType || 'mrdev',
                    mrdevId: local.mrdevId || ''
                };
            }
        }
    } catch(e) {}
    return null;
}

// ==================== AUTH ====================
function initAuth(callback) {
    const { auth } = getFirebase();
    
    // Firebase Auth listener
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userData = {
                    uid: user.uid,
                    displayName: user.displayName || user.email?.split('@')[0] || 'User',
                    email: user.email || '',
                    photoURL: user.photoURL || null,
                    isAuthenticated: true,
                    authType: 'firebase'
                };

                localStorage.setItem('mrdev_auth_user', JSON.stringify(userData));
                const lastSync = localStorage.getItem('mrdev_last_sync');
                const now = Date.now();
                if (!lastSync || (now - parseInt(lastSync, 10)) > 30000) {
                    await syncCloudToLocal(user.uid);
                    localStorage.setItem('mrdev_last_sync', now.toString());
                }

                if (callback) callback(userData);
            } else {
                // Firebase user yo'q, localStorage dan tekshir
                const localUser = getLocalAuthUser();
                if (localUser) {
                    if (callback) callback(localUser);
                } else {
                    localStorage.removeItem('mrdev_auth_user');
                    localStorage.removeItem('mrdev_last_sync');
                    if (callback) callback(null);
                }
            }
        });
        return unsubscribe;
    }
    
    // Agar auth bo'lmasa, localStorage dan tekshir
    const localUser = getLocalAuthUser();
    if (callback) callback(localUser);
    return () => {};
}

function getCurrentUser() {
    // 1. Firebase Auth dan tekshir
    const { auth } = getFirebase();
    const fbUser = auth ? auth.currentUser : null;
    if (fbUser) {
        return {
            uid: fbUser.uid,
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || null,
            isAuthenticated: true,
            authType: 'firebase'
        };
    }
    
    // 2. Local auth dan tekshir (email bilan kirgan user)
    return getLocalAuthUser();
}

function getUserId() {
    // 1. Firebase Auth dan tekshir
    const { auth } = getFirebase();
    const fbUser = auth ? auth.currentUser : null;
    if (fbUser) return fbUser.uid;
    
    // 2. Local auth dan tekshir (email bilan kirgan user)
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || 'null');
        if (local && local.isLoggedIn && local.uid) {
            return local.uid;
        }
    } catch(e) {}
    
    return null;
}

async function logoutUser() {
    const { auth } = getFirebase();
    if (auth) {
        try { await signOut(auth); } catch(e) {}
    }
    localStorage.removeItem('mrdev_local_auth');
    localStorage.removeItem('mrdev_user_id');
    localStorage.removeItem('mrdev_auth_user');
    // Akkauntni o'chirmaslik kerak, faqat logout qilish
}

// ==================== LOCAL CLEANUP ====================
function clearAllLocalData() {
    const keys = [
        'mr_clock_alarms', 'mr_calc_history', 'mr_timer_history', 'mr_stopwatch_history',
        'mr_board_data', 'mr_bingo_history', 'mr_qr_history', 'mr_notes_data',
        'mr_exam_questions', 'mr_timer_state', 'mr_stopwatch_state', 'mr_music_history',
        'mr_splitview_urls', 'mr_todo_tasks', 'mr_weather_cities', 'bingo_winstreak',
        'bingo_xp', 'bingo_level', 'bingo_scoreX', 'bingo_scoreO', 'bingo_stats',
        'bingo_history', 'splitview_cloud_urls', 'mrdev_last_sync'
    ];
    keys.forEach(key => { try { localStorage.removeItem(key); } catch(e) {} });
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
            const q = query(
                collection(db, 'users', uid, cloud),
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
                localStorage.setItem(local, JSON.stringify(items));
            }
        } catch (e) {}
    }
}

// ==================== SMART SAVE ====================
async function smartSave(collectionName, localKey, data) {
    const uid = getUserId();

    // 1. Local ga saqlash
    try {
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        local.unshift({
            ...data,
            date: data.date || new Date().toISOString(),
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
        });
        localStorage.setItem(localKey, JSON.stringify(local.slice(0, 50)));
    } catch (e) {
        console.warn('Local save failed:', e.message);
    }

    // 2. Cloud ga saqlash
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
            console.warn('Cloud save failed:', e.message);
        }
    }
}

// ==================== SMART LOAD ====================
function smartLoad(collectionName, localKey, callback) {
    const uid = getUserId();
    const { db } = getFirebase();

    // Avval local dan ko'rsatish
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
                    id: d.id,
                    ...d.data(),
                    isCloud: true,
                    date: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                }));
                localStorage.setItem(localKey, JSON.stringify(cloudItems));
                if (callback) callback(cloudItems);
            }, (error) => {
                if (resolved) return;
                resolved = true;
                console.warn('Cloud load failed:', error.message);
                try {
                    const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
                    if (callback) callback(localItems);
                } catch (e) {}
            });
        } catch (e) {
            console.warn('Cloud listener error:', e.message);
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
            console.warn('Delete error:', e.message);
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
            console.warn('Clear error:', e.message);
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
