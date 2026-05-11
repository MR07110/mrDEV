// ==================== MRDEV UNIVERSAL AUTH HELPER v3.2 ====================
// FIX v3.2: Firebase UID ishlatiladi (centerId emas), authType to'g'ri aniqlanadi

import logger from './logger.js';
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, getDoc, setDoc, updateDoc, arrayUnion 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== MARKAZIY USER ID ====================

function getCenterUserId(email) {
    if (!email) return null;
    return email.replace(/[.@]/g, '_');
}

async function getOrCreateCenterDoc(email, extraData = {}) {
    if (!email || !db) return null;
    
    const centerId = getCenterUserId(email);
    const centerRef = doc(db, 'users', centerId);
    const snap = await getDoc(centerRef);
    
    if (!snap.exists()) {
        await setDoc(centerRef, {
            email: email,
            displayName: extraData.displayName || email.split('@')[0],
            photoURL: extraData.photoURL || null,
            mrdevIds: extraData.mrdevId ? [extraData.mrdevId] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }
    
    return { centerId, centerRef };
}

async function addMrdevIdToCenter(email, mrdevId) {
    if (!email || !mrdevId || !db) return;
    
    const centerId = getCenterUserId(email);
    const centerRef = doc(db, 'users', centerId);
    
    await updateDoc(centerRef, {
        mrdevIds: arrayUnion(mrdevId),
        updatedAt: new Date().toISOString()
    });
    
    logger.auth.centerLinked(mrdevId, email);
}

// ==================== AUTH TURINI ANIQLASH ====================

function getAuthType(firebaseUser) {
    if (!firebaseUser) return 'none';
    const providerId = firebaseUser.providerData?.[0]?.providerId || 'password';
    return providerId === 'google.com' ? 'google' : 'email';
}

// ==================== ASOSIY FUNKSIYALAR ====================

export async function getCurrentUser() {
    // 1. Firebase Auth (Google yoki Email login)
    if (auth?.currentUser) {
        const u = auth.currentUser;
        const authType = getAuthType(u);
        
        await getOrCreateCenterDoc(u.email, {
            displayName: u.displayName,
            photoURL: u.photoURL
        });
        
        // FIX: uid = Firebase UID (centerId emas!)
        return {
            uid: u.uid,
            firebaseUid: u.uid,
            email: u.email,
            displayName: u.displayName || u.email?.split('@')[0] || 'User',
            photoURL: u.photoURL || null,
            isAuthenticated: true,
            authType: authType,
            centerId: getCenterUserId(u.email)
        };
    }
    
    // 2. MRDEV Local Auth (MRDEV ID orqali kirgan)
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (local?.isLoggedIn && local?.uid && local?.email) {
            const days = (Date.now() - local.loginTime) / (1000 * 60 * 60 * 24);
            if (days < 7) {
                return {
                    uid: local.uid,
                    email: local.email,
                    displayName: local.displayName || 'User',
                    photoURL: local.photoURL || null,
                    isAuthenticated: true,
                    authType: local.authType || 'mrdev',
                    mrdevId: local.mrdevId || '',
                    centerId: getCenterUserId(local.email)
                };
            }
        }
    } catch (e) {}
    
    // 3. Auth yo'q
    return {
        uid: null, email: null, displayName: null, photoURL: null,
        isAuthenticated: false, authType: 'none'
    };
}

export function getUserId() {
    const googleUser = auth?.currentUser;
    // FIX: Firebase UID qaytariladi (centerId emas!)
    if (googleUser) return googleUser.uid;
    
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth'));
        if (local?.isLoggedIn && local?.uid) return local.uid;
    } catch(e) {}
    
    return null;
}

export function isAuthenticated() {
    return !!(auth?.currentUser || 
        JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}')?.isLoggedIn);
}

export function getUserEmail() {
    return auth?.currentUser?.email || 
        JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}')?.email || null;
}

export function getUserDisplayName() {
    const google = auth?.currentUser;
    if (google) return google.displayName || google.email?.split('@')[0] || 'User';
    
    try {
        const local = JSON.parse(localStorage.getItem('mrdev_local_auth') || '{}');
        return local.displayName || 'Mehmon';
    } catch(e) { return 'Mehmon'; }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const authType = getAuthType(firebaseUser);
            
            await getOrCreateCenterDoc(firebaseUser.email, {
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL
            });
            
            // FIX: uid = Firebase UID, authType to'g'ri ('google' yoki 'email')
            callback({
                uid: firebaseUser.uid,
                firebaseUid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || null,
                isAuthenticated: true,
                authType: authType,
                centerId: getCenterUserId(firebaseUser.email)
            });
        } else {
            const user = await getCurrentUser();
            callback(user);
        }
    });
}

// ==================== EXPORT ====================
export { getCenterUserId, getOrCreateCenterDoc, addMrdevIdToCenter };
