// ==================== MRDEV FIREBASE INIT v3.0 ====================
// TO'LIQ Firebase konfiguratsiyasi - Barcha kerakli servislar bilan

import logger from './logger.js';

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
    setPersistence,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getDatabase,
    ref,
    push,
    get,
    set,
    update,
    remove,
    onValue
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ==================== APP NOMI VA ENV ====================
const APP_NAME = 'mrdev_main';
const ENV = window.__ENV__ || {};

const firebaseConfig = {
    apiKey: ENV.MAIN_API_KEY || '',
    authDomain: ENV.MAIN_AUTH_DOMAIN || '',
    databaseURL: ENV.MAIN_DATABASE_URL || '',
    projectId: ENV.MAIN_PROJECT_ID || '',
    storageBucket: ENV.MAIN_STORAGE_BUCKET || '',
    messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || '',
    appId: ENV.MAIN_APP_ID || '',
    measurementId: ENV.MAIN_MEASUREMENT_ID || ''
};

// ==================== ENV TEKSHIRISH ====================
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isHTTPS = window.location.protocol === 'https:';
const isVercel = window.location.hostname.includes('vercel.app');

logger.firebase.start();
logger.firebase.info(
    window.location.hostname,
    window.location.protocol,
    isLocalhost,
    isVercel,
    isLocalhost,
    firebaseConfig.projectId || 'TOPILMADI!',
    !!firebaseConfig.apiKey
);

// ==================== FIREBASE APP INIT ====================
let app, auth, db, rtdb;

try {
    const existingApp = getApps().find(a => a.name === APP_NAME);
    
    if (existingApp) {
        app = existingApp;
    } else {
        app = initializeApp(firebaseConfig, APP_NAME);
        logger.firebase.newApp(APP_NAME);
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    
    logger.firebase.ready(!!auth, !!db, !!rtdb);
    
} catch (error) {
    logger.error.firebase(error.message);
    throw error;
}

// ==================== AUTH PERSISTENCE ====================
async function setupAuthPersistence() {
    try {
        if (isHTTPS || isVercel) {
            await setPersistence(auth, browserLocalPersistence);
            logger.firebase.persistence('LOCAL (xavfsiz)');
        } else if (isLocalhost) {
            await setPersistence(auth, browserLocalPersistence);
            logger.firebase.persistence('LOCAL (localhost)');
        } else {
            await setPersistence(auth, browserSessionPersistence);
            logger.firebase.persistence('SESSION');
        }
    } catch (error) {
        logger.error.firebase('Persistence: ' + error.message);
        try {
            await setPersistence(auth, inMemoryPersistence);
        } catch (e) {
            logger.error.firebase('Barcha persistence muvaffaqiyatsiz');
        }
    }
}

setupAuthPersistence();

// ==================== GOOGLE AUTH PROVIDER ====================
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account', display: 'popup' });

// ==================== YORDAMCHI FUNKSIYALAR ====================

function getCurrentUser() { return auth.currentUser; }
function getCurrentUserId() { return auth.currentUser?.uid || null; }

function onAuthChange(callback) {
    if (!auth) { callback(null); return () => {}; }
    return onAuthStateChanged(auth, callback);
}

async function loginWithEmail(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        throw new Error(error.code === 'auth/user-not-found' ? 'Foydalanuvchi topilmadi' :
                        error.code === 'auth/wrong-password' ? 'Noto\'g\'ri parol' :
                        error.code === 'auth/invalid-email' ? 'Email formati noto\'g\'ri' :
                        error.code === 'auth/user-disabled' ? 'Hisob bloklangan' : error.message);
    }
}

async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return { success: true, user: result.user };
    } catch (error) {
        throw new Error(error.code === 'auth/popup-closed-by-user' ? 'Kirish oynasi yopildi' : error.message);
    }
}

async function registerWithEmail(email, password, displayName) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        return { success: true, user: result.user };
    } catch (error) {
        throw new Error(error.code === 'auth/email-already-in-use' ? 'Bu email allaqachon ishlatilgan' :
                        error.code === 'auth/weak-password' ? 'Parol juda oddiy' : error.message);
    }
}

async function logoutUser() {
    try { await signOut(auth); return { success: true }; }
    catch (error) { throw error; }
}

async function resetPassword(email) {
    try { await sendPasswordResetEmail(auth, email); return { success: true }; }
    catch (error) { throw error; }
}

// ==================== FIRESTORE YORDAMCHILARI ====================

async function getUserDoc(userId) {
    try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (e) { return null; }
}

async function updateUserDoc(userId, data) {
    await setDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true };
}

async function addToCollection(userId, collectionName, data) {
    const docRef = await addDoc(collection(db, 'users', userId, collectionName), {
        ...data, createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
}

async function getCollection(userId, collectionName, maxLimit = 50) {
    const q = query(collection(db, 'users', userId, collectionName), orderBy('createdAt', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    return items;
}

function watchCollection(userId, collectionName, callback, maxLimit = 50) {
    const q = query(collection(db, 'users', userId, collectionName), orderBy('createdAt', 'desc'), limit(maxLimit));
    return onSnapshot(q, snap => {
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        callback(items);
    }, () => callback([]));
}

async function deleteDocFromCollection(userId, collectionName, docId) {
    await deleteDoc(doc(db, 'users', userId, collectionName, docId));
    return { success: true };
}

// ==================== REALTIME DATABASE YORDAMCHILARI ====================

async function rtdbPush(path, data) {
    const newRef = push(ref(rtdb, path));
    await set(newRef, { ...data, createdAt: Date.now() });
    return { success: true, key: newRef.key };
}

async function rtdbGet(path) {
    const snapshot = await get(ref(rtdb, path));
    return snapshot.val();
}

async function rtdbUpdate(path, data) {
    await update(ref(rtdb, path), data);
    return { success: true };
}

async function rtdbRemove(path) {
    await remove(ref(rtdb, path));
    return { success: true };
}

function rtdbWatch(path, callback) {
    const dbRef = ref(rtdb, path);
    return onValue(dbRef, snapshot => callback(snapshot.val()), () => callback(null));
}

// ==================== MRDEV MAXSUS FUNKSIYALAR ====================

async function findUserByMrdevId(mrdevId) {
    const snap = await getDocs(query(collection(db, 'users'), where('mrdevId', '==', mrdevId)));
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}

async function sendPassNotification(userId, mrdevId, passCode) {
    const expiresAt = Date.now() + 120000;
    await rtdbPush('pass_notifications', { passCode, mrdevId, uid: userId, expiresAt, used: false, createdAt: Date.now() });
    return { success: true, expiresAt };
}

async function verifyPassNotification(mrdevId, passCode) {
    const snapshot = await rtdbGet('pass_notifications');
    if (!snapshot) return { valid: false, error: 'Xabarlar topilmadi' };
    
    let foundKey = null, foundData = null;
    Object.entries(snapshot).forEach(([key, value]) => {
        if (value.passCode === passCode && value.mrdevId === mrdevId && !value.used && value.expiresAt > Date.now()) {
            foundKey = key; foundData = value;
        }
    });
    
    if (!foundData) return { valid: false, error: 'Noto\'g\'ri parol yoki muddati tugagan' };
    
    await rtdbUpdate(`pass_notifications/${foundKey}`, { used: true, verifiedAt: Date.now() });
    return { valid: true, data: foundData };
}

// ==================== EXPORT ====================
export {
    app, auth, db, rtdb,
    firebaseConfig, googleProvider,
    setupAuthPersistence, getCurrentUser, getCurrentUserId, onAuthChange,
    loginWithEmail, loginWithGoogle, registerWithEmail, logoutUser, resetPassword,
    getUserDoc, updateUserDoc, addToCollection, getCollection, watchCollection, deleteDocFromCollection,
    rtdbPush, rtdbGet, rtdbUpdate, rtdbRemove, rtdbWatch,
    findUserByMrdevId, sendPassNotification, verifyPassNotification
};

export default app;

logger.firebase.done();
