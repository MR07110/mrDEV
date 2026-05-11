// js/auth.js - To'liq authentication moduli

import { firebaseConfig } from './config.js';
import { Store } from './store.js';
import { Utils, showToast } from './utils.js';
import { UIController } from './ui.js';

// Firebase ni ishga tushirish
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// DOM elementlari
const authGateway = document.getElementById('auth-gateway');
const appContainer = document.getElementById('app-container');
const uiOverlay = document.getElementById('ui-overlay');

// ==================== YORDAMCHI FUNKSIYA: Foydalanuvchi nomini olish ====================
async function getUserName() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userRef = db.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();
        
        return userData?.firstName || 
               (userData?.fullName ? userData.fullName.split(' ')[0] : null) ||
               userData?.displayName || 
               user.email?.split('@')[0] || 
               'Foydalanuvchi';
    } catch (e) {
        console.error('User name error:', e);
        return user.email?.split('@')[0] || 'Foydalanuvchi';
    }
}

async function getUserData(uid) {
    const snapshot = await db.ref(`users/${uid}`).once('value');
    return snapshot.val() || {};
}

// ==================== XONANI WHITEBOARD DA OCHISH ====================
async function startWhiteboardWithRoom(roomId) {
    const roomRef = db.ref('rooms/' + roomId);
    const snapshot = await roomRef.once('value');
    const roomData = snapshot.val();
    
    if (!roomData) {
        showToast("Xona topilmadi!", "error");
        window.location.href = 'dashboard.html';
        return;
    }
    
    if (roomData.isActive === false) {
        showToast("Bu xona tugatilgan!", "error");
        window.location.href = 'dashboard.html';
        return;
    }
    
    const user = auth.currentUser;
    const userData = await getUserData(user.uid);
    const name = userData.firstName || 
                 (userData.fullName ? userData.fullName.split(' ')[0] : null) ||
                 user.email.split('@')[0];
    
    Store.name = name;
    Store.uid = Utils.generateId();
    Store.roomId = roomId;
    Store.isTeacher = roomData.createdBy === user.uid;
    Store.perms = { draw: Store.isTeacher, speak: Store.isTeacher };
    Store.color = '#007aff';
    Store.size = 4;
    Store.cam = { x: 0, y: 0, z: 1 };
    Store.elements = [];
    Store.livePaths = {};
    Store.laserPaths = {};
    Store.cursors = {};
    Store.users = {};
    Store.unread = 0;
    Store.textPos = null;
    Store.laserEnabled = true;
    Store.minimapVisible = true;
    
    if (Store.isTeacher) {
        Store.teacherSecret = roomData.teacherSecret;
    }
    
    await db.ref('rooms/' + roomId + '/users/' + user.uid).set({
        name: name,
        joinedAt: Date.now(),
        isTeacher: Store.isTeacher
    });
    
    const ui = new UIController();
    ui.startApp(roomId, Store.isTeacher ? roomData.teacherSecret : null);
}

// ==================== CREATE ROOM ====================
export async function createRoom(uiInstance) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Iltimos, avval hisobingizga kiring!", "error");
        return;
    }
    
    const name = await getUserName();
    if (!name) { 
        showToast("Ism topilmadi", "error"); 
        return; 
    }

    const teacherCode = Utils.generateTeacherCode();
    const studentCode = Utils.generateStudentCode();
    const baseUrl = window.location.href.split('#')[0];
    const teacherLink = `${baseUrl}#t-${teacherCode}`;
    const studentLink = `${baseUrl}#s-${studentCode}`;

    Store.name = name;
    Store.isTeacher = true;
    Store.teacherSecret = teacherCode;
    Store.roomId = studentCode;
    Store.perms.draw = true;
    Store.perms.speak = true;

    await db.ref(`users/${user.uid}`).update({
        displayName: name,
        lastActive: Date.now(),
        roomId: studentCode,
        isTeacher: true
    });

    uiInstance.startApp(studentCode, teacherCode);

    setTimeout(() => {
        const teacherLinkBox = document.getElementById('teacher-link-box');
        const studentLinkBox = document.getElementById('student-link-box');
        const teacherLinkText = document.getElementById('teacher-link-text');
        const studentLinkText = document.getElementById('student-link-text');
        
        if (teacherLinkText) teacherLinkText.innerText = teacherLink;
        if (studentLinkText) studentLinkText.innerText = studentLink;
        if (teacherLinkBox) teacherLinkBox.style.display = 'flex';
        if (studentLinkBox) studentLinkBox.style.display = 'flex';
        showToast(`O'qituvchi link yaratildi`, "success");
    }, 500);
}

// ==================== JOIN ROOM ====================
export async function joinRoom(uiInstance) {
    const user = auth.currentUser;
    if (!user) {
        showToast("Iltimos, avval hisobingizga kiring!", "error");
        return;
    }
    
    const code = document.getElementById('auth-room-inp')?.value.trim().toUpperCase() || '';
    
    if (!code) { 
        showToast("Xona kodini kiriting", "error"); 
        return; 
    }
    
    const name = await getUserName();
    if (!name) { 
        showToast("Ism topilmadi", "error"); 
        return; 
    }

    Store.name = name;
    Store.isTeacher = false;
    Store.roomId = code;
    Store.perms.draw = false;
    Store.perms.speak = false;

    await db.ref(`users/${user.uid}`).update({
        displayName: name,
        lastActive: Date.now(),
        roomId: code,
        isTeacher: false
    });

    uiInstance.startApp(code, null);
}

// ==================== LOGIN ====================
document.getElementById('btn-login')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value || '';
    const password = document.getElementById('login-password')?.value || '';
    const errorDiv = document.getElementById('login-error');
    
    if (errorDiv) errorDiv.style.display = 'none';
    
    if (!email || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Email va parolni kiriting!';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const userRef = db.ref(`users/${user.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val() || {};
        
        localStorage.setItem('mr_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            username: userData.username || email.split('@')[0],
            fullName: userData.fullName || userData.displayName || (userData.firstName && userData.lastName ? userData.firstName + ' ' + userData.lastName : null) || email.split('@')[0],
            firstName: userData.firstName || email.split('@')[0]
        }));
        
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('room');
        const pendingRoomId = localStorage.getItem('pendingRoomId');
        const lastRoomId = localStorage.getItem('lastRoomId');
        
        if (roomIdFromUrl) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(roomIdFromUrl);
        } else if (pendingRoomId) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(pendingRoomId);
        } else if (lastRoomId) {
            startWhiteboardWithRoom(lastRoomId);
        } else {
            window.location.href = 'dashboard.html';
        }
        
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
});

// ==================== REGISTER ====================
document.getElementById('btn-register')?.addEventListener('click', async () => {
    const firstName = document.getElementById('reg-firstname')?.value || '';
    const lastName = document.getElementById('reg-lastname')?.value || '';
    const username = document.getElementById('reg-username')?.value || '';
    const email = document.getElementById('reg-email')?.value || '';
    const password = document.getElementById('reg-password')?.value || '';
    const confirm = document.getElementById('reg-confirm')?.value || '';
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
    
    if (!firstName || !lastName || !username || !email || !password) {
        if (errorDiv) {
            errorDiv.textContent = 'Barcha maydonlarni to\'ldiring!';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (password !== confirm) {
        if (errorDiv) {
            errorDiv.textContent = 'Parollar mos kelmadi!';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorDiv) {
            errorDiv.textContent = 'Parol kamida 6 belgidan iborat bo\'lishi kerak!';
            errorDiv.style.display = 'block';
        }
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await db.ref(`users/${user.uid}`).set({
            firstName: firstName,
            lastName: lastName,
            username: username,
            email: email,
            fullName: firstName + ' ' + lastName,
            role: 'student',
            createdAt: Date.now()
        });
        
        if (successDiv) {
            successDiv.textContent = '✅ Ro\'yxatdan o\'tish muvaffaqiyatli!';
            successDiv.style.display = 'block';
        }
        
        localStorage.setItem('mr_user', JSON.stringify({
            uid: user.uid,
            email: email,
            username: username,
            fullName: firstName + ' ' + lastName,
            firstName: firstName,
            role: 'student'
        }));
        
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('room');
        const pendingRoomId = localStorage.getItem('pendingRoomId');
        
        if (roomIdFromUrl) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(roomIdFromUrl);
        } else if (pendingRoomId) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(pendingRoomId);
        } else {
            window.location.href = 'dashboard.html';
        }
        
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
});

// ==================== LOGOUT (WHITEBOARD DAN CHIQISH - DASHBOARD GA) ====================
document.getElementById('btn-logout')?.addEventListener('click', async () => {
    // Faqat sign out qilmaymiz, faqat whiteboard dan chiqamiz
    // Dashboard ga qaytamiz, lekin account dan chiqmaymiz
    window.location.href = 'dashboard.html';
});

// ==================== ACCOUNT DAN TO'LIQ CHIQISH ====================
// Bu funksiya dashboard.html dagi chiqish tugmasi uchun
export async function fullLogout() {
    await auth.signOut();
    localStorage.removeItem('mr_user');
    localStorage.removeItem('lastRoomId');
    localStorage.removeItem('lastRoomAccess');
    localStorage.removeItem('pendingRoomId');
    window.location.href = 'board.html';
}

// ==================== SHOW WHITEBOARD ====================
function showWhiteboard() {
    window.location.href = 'dashboard.html';
}

// ==================== TAB ALMASHTIRISH ====================
const tabs = document.querySelectorAll('.auth-tab');
const loginPanel = document.getElementById('login-panel');
const registerPanel = document.getElementById('register-panel');

if (tabs.length) {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tab.dataset.tab === 'login') {
                if (loginPanel) loginPanel.classList.add('active');
                if (registerPanel) registerPanel.classList.remove('active');
            } else {
                if (loginPanel) loginPanel.classList.remove('active');
                if (registerPanel) registerPanel.classList.add('active');
            }
        });
    });
}

// ==================== AUTH STATE OBSERVER ====================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('room');
        const pendingRoomId = localStorage.getItem('pendingRoomId');
        const lastRoomId = localStorage.getItem('lastRoomId');
        
        if (roomIdFromUrl) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(roomIdFromUrl);
        } else if (pendingRoomId) {
            localStorage.removeItem('pendingRoomId');
            startWhiteboardWithRoom(pendingRoomId);
        } else if (lastRoomId) {
            startWhiteboardWithRoom(lastRoomId);
        } else {
            window.location.href = 'dashboard.html';
        }
    } else {
        if (authGateway) authGateway.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        if (uiOverlay) uiOverlay.style.display = 'none';
    }
});

lucide.createIcons();
