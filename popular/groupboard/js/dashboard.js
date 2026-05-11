// js/dashboard.js - To'liq tuzatilgan versiya

import { firebaseConfig } from './config.js';
import { Utils, showToast } from './utils.js';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

let currentUser = null;
let isInitialized = false;
let publicRoomsLoaded = false;
let myRoomsLoaded = false;

// ==================== AUTH STATE (FAQAT BIR MARTA) ====================
auth.onAuthStateChanged(async (user) => {
    if (isInitialized) return;
    isInitialized = true;
    
    if (user) {
        currentUser = user;
        const userData = await getUserData(user.uid);
        updateUI(userData);
        
        if (!publicRoomsLoaded) loadPublicRooms();
        if (!myRoomsLoaded) loadMyRooms();
    } else {
        window.location.href = 'board.html';
    }
});

async function getUserData(uid) {
    const snapshot = await db.ref(`users/${uid}`).once('value');
    return snapshot.val() || {};
}

function updateUI(userData) {
    const firstName = userData.firstName || '';
    const fullName = userData.fullName || '';
    
    let displayName = '';
    if (firstName) {
        displayName = firstName;
    } else if (fullName) {
        displayName = fullName.split(' ')[0];
    } else {
        displayName = currentUser.email.split('@')[0];
    }
    
    const nameSpan = document.getElementById('user-name');
    const avatarDiv = document.getElementById('user-avatar');
    const welcomeMsg = document.getElementById('welcome-message');
    
    if (nameSpan) nameSpan.textContent = displayName;
    if (avatarDiv) avatarDiv.textContent = displayName.charAt(0).toUpperCase();
    if (welcomeMsg) welcomeMsg.textContent = 'Assalomu alaykum, ' + displayName + '!';
}

// ==================== PUBLIC XONALAR ====================
async function loadPublicRooms() {
    if (publicRoomsLoaded) return;
    publicRoomsLoaded = true;
    
    const container = document.getElementById('public-rooms-list');
    if (!container) return;
    
    container.innerHTML = '<div class="empty-state"><i data-lucide="loader" class="spin"></i> Yuklanmoqda...</div>';
    
    try {
        const snapshot = await db.ref('rooms').once('value');
        const rooms = snapshot.val() || {};
        
        const publicRooms = [];
        for (const [id, room] of Object.entries(rooms)) {
            if (room.isPublic === true && room.isActive !== false) {
                publicRooms.push({
                    id: id,
                    name: room.name || (room.createdByName || (room.createdBy ? room.createdBy.substring(0, 8) : 'Unknown')) + ' ning xonasi',
                    createdAt: room.createdAt,
                    userCount: room.users ? Object.keys(room.users).length : 0,
                    hasPassword: room.hasPassword || false,
                    createdBy: room.createdBy
                });
            }
        }
        
        publicRooms.sort(function(a, b) { return b.createdAt - a.createdAt; });
        
        if (publicRooms.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Hozircha ochiq xonalar yo\'q</div>';
        } else {
            let html = '';
            for (let i = 0; i < publicRooms.length; i++) {
                const room = publicRooms[i];
                html += '<div class="room-card">';
                html += '<div class="room-card-header">';
                html += '<span class="room-name">' + Utils.sanitize(room.name) + '</span>';
                html += '<span class="room-badge ' + (room.hasPassword ? 'private' : 'public') + '">' + (room.hasPassword ? '🔒 Parol' : '🌍 Public') + '</span>';
                html += '</div>';
                html += '<div class="room-meta">';
                html += '<span>👤 ' + (room.createdBy ? room.createdBy.substring(0, 8) : '???') + '...</span>';
                html += '<span>👥 ' + room.userCount + ' kishi</span>';
                html += '</div>';
                html += '<div class="room-actions">';
                html += '<button class="room-join-btn" data-room-id="' + room.id + '" data-room-name="' + room.name.replace(/"/g, '&quot;') + '" data-has-password="' + room.hasPassword + '">Xonaga kirish</button>';
                html += '</div></div>';
            }
            container.innerHTML = html;
            
            document.querySelectorAll('.room-join-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var roomId = btn.getAttribute('data-room-id');
                    var roomName = btn.getAttribute('data-room-name');
                    var hasPassword = btn.getAttribute('data-has-password') === 'true';
                    joinRoom(roomId, roomName, hasPassword);
                });
            });
        }
        
        if (window.lucide) lucide.createIcons();
    } catch (error) {
        console.error('loadPublicRooms error:', error);
        container.innerHTML = '<div class="empty-state">❌ Xonalarni yuklab bo\'lmadi</div>';
    }
}

// ==================== MY ROOMS ====================
async function loadMyRooms() {
    if (myRoomsLoaded) return;
    myRoomsLoaded = true;
    
    const container = document.getElementById('my-rooms-list');
    if (!container) return;
    
    try {
        const snapshot = await db.ref('rooms').once('value');
        const rooms = snapshot.val() || {};
        
        const myRooms = [];
        for (const [id, room] of Object.entries(rooms)) {
            if (room.createdBy === currentUser.uid && room.isActive !== false) {
                myRooms.push({
                    id: id,
                    name: room.name || (room.createdByName || 'Xona'),
                    createdAt: room.createdAt,
                    userCount: room.users ? Object.keys(room.users).length : 0,
                    isPublic: room.isPublic,
                    hasPassword: room.hasPassword
                });
            }
        }
        
        myRooms.sort(function(a, b) { return b.createdAt - a.createdAt; });
        
        if (myRooms.length === 0) {
            container.innerHTML = '<div class="empty-state">📝 Hali xona yaratmagansiz<br><button class="quick-action-btn" id="empty-create-room" style="margin-top: 16px; background: #007aff; color: white;"><i data-lucide="plus-circle"></i> Birinchi xonani yarating</button></div>';
            
            const emptyBtn = document.getElementById('empty-create-room');
            if (emptyBtn) emptyBtn.addEventListener('click', showCreateRoomModal);
        } else {
            let html = '';
            for (let i = 0; i < myRooms.length; i++) {
                const room = myRooms[i];
                html += '<div class="room-card">';
                html += '<div class="room-card-header">';
                html += '<span class="room-name">' + Utils.sanitize(room.name) + '</span>';
                html += '<span class="room-badge">' + (room.isPublic ? '🌍 Public' : '🔒 Private') + '</span>';
                html += '</div>';
                html += '<div class="room-meta">';
                html += '<span>👥 ' + room.userCount + ' kishi</span>';
                html += '<span>📅 ' + new Date(room.createdAt).toLocaleDateString() + '</span>';
                html += '</div>';
                html += '<div class="room-actions">';
                html += '<button class="room-join-btn" data-room-id="' + room.id + '">Davom ettirish</button>';
                html += '</div></div>';
            }
            container.innerHTML = html;
            
            document.querySelectorAll('#my-rooms-list .room-join-btn').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var roomId = btn.getAttribute('data-room-id');
                    goToRoom(roomId);
                });
            });
        }
        
        if (window.lucide) lucide.createIcons();
    } catch (error) {
        console.error('loadMyRooms error:', error);
        container.innerHTML = '<div class="empty-state">❌ Xonalarni yuklab bo\'lmadi</div>';
    }
}

// ==================== XONAGA KIRISH ====================
async function joinRoom(roomId, roomName, hasPassword) {
    if (hasPassword) {
        var password = prompt('"' + roomName + '" xonasiga parol kiriting:');
        if (!password) return;
        
        const roomRef = db.ref('rooms/' + roomId);
        const snapshot = await roomRef.once('value');
        const roomData = snapshot.val();
        
        if (roomData.password !== password) {
            showToast("Parol noto'g'ri!", "error");
            return;
        }
    }
    goToRoom(roomId);
}

function goToRoom(roomId) {
    localStorage.setItem('lastRoomId', roomId);
    localStorage.setItem('lastRoomAccess', Date.now());
    window.location.href = 'board.html?room=' + roomId;
}

// ==================== XONA YARATISH ====================
var currentRoomType = 'public';
var currentRoomPassword = '';

function showCreateRoomModal() {
    const nameInput = document.getElementById('new-room-name');
    const passwordInput = document.getElementById('new-room-password');
    const passwordGroup = document.getElementById('new-room-password-group');
    
    if (nameInput) nameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (passwordGroup) passwordGroup.style.display = 'none';
    
    currentRoomType = 'public';
    currentRoomPassword = '';
    
    const typeBtns = document.querySelectorAll('.room-type-selector');
    for (let i = 0; i < typeBtns.length; i++) {
        typeBtns[i].classList.remove('active');
        if (typeBtns[i].getAttribute('data-type') === 'public') {
            typeBtns[i].classList.add('active');
        }
    }
    
    const modal = document.getElementById('modal-create-room');
    const backdrop = document.getElementById('drawer-backdrop');
    if (modal) modal.classList.add('is-visible');
    if (backdrop) backdrop.classList.add('is-visible');
}

function closeCreateRoomModal() {
    const modal = document.getElementById('modal-create-room');
    const backdrop = document.getElementById('drawer-backdrop');
    if (modal) modal.classList.remove('is-visible');
    if (backdrop) backdrop.classList.remove('is-visible');
}

async function confirmCreateRoom() {
    const roomName = document.getElementById('new-room-name').value.trim();
    if (!roomName) {
        showToast("Iltimos, xona nomini kiriting!", "error");
        return;
    }
    
    const userData = await getUserData(currentUser.uid);
    const name = userData.firstName || 
                 (userData.fullName ? userData.fullName.split(' ')[0] : null) ||
                 currentUser.email.split('@')[0];
    
    const roomCode = generateRoomCode();
    const teacherCode = generateTeacherCode();
    
    const roomData = {
        name: roomName,
        createdBy: currentUser.uid,
        createdByName: name,
        createdAt: Date.now(),
        isPublic: currentRoomType === 'public',
        hasPassword: currentRoomPassword !== '',
        password: currentRoomPassword || null,
        isActive: true,
        teacherSecret: teacherCode,
        elements: [],
        users: {},
        chat: []
    };
    
    await db.ref('rooms/' + roomCode).set(roomData);
    
    closeCreateRoomModal();
    showToast('✅ "' + roomName + '" xonasi yaratildi! Kod: ' + roomCode, "success");
    
    localStorage.setItem('lastRoomId', roomCode);
    window.location.href = 'board.html?room=' + roomCode;
}

function generateRoomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    var code = '';
    for (var i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateTeacherCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
    var code = '';
    for (var i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ==================== XONA KODI BILAN KIRISH ====================
var joinFormVisible = false;

function showJoinForm() {
    joinFormVisible = !joinFormVisible;
    var form = document.getElementById('join-room-form');
    if (form) {
        form.style.display = joinFormVisible ? 'flex' : 'none';
        if (joinFormVisible) {
            var codeInput = document.getElementById('join-room-code-input');
            if (codeInput) codeInput.focus();
        }
    }
}

async function submitJoinRoom() {
    var code = document.getElementById('join-room-code-input').value.trim().toUpperCase();
    var password = document.getElementById('join-room-password-input').value;
    
    if (!code) {
        showToast("Xona kodini kiriting!", "error");
        return;
    }
    
    var roomRef = db.ref('rooms/' + code);
    var snapshot = await roomRef.once('value');
    var roomData = snapshot.val();
    
    if (!roomData) {
        showToast("Xona topilmadi!", "error");
        return;
    }
    
    if (roomData.isActive === false) {
        showToast("Bu xona tugatilgan!", "error");
        return;
    }
    
    if (roomData.hasPassword) {
        var passwordInput = document.getElementById('join-room-password-input');
        if (!password && !passwordInput.value) {
            passwordInput.style.display = 'block';
            passwordInput.focus();
            return;
        }
        if (roomData.password !== (password || passwordInput.value)) {
            showToast("Parol noto'g'ri!", "error");
            return;
        }
    }
    
    localStorage.setItem('lastRoomId', code);
    window.location.href = 'board.html?room=' + code;
}

// ==================== JSON IMPORT ====================
function showJsonImportModal() {
    var fileInput = document.getElementById('json-import-file');
    if (fileInput) fileInput.value = '';
    
    var modal = document.getElementById('modal-json-import');
    var backdrop = document.getElementById('drawer-backdrop');
    if (modal) modal.classList.add('is-visible');
    if (backdrop) backdrop.classList.add('is-visible');
}

function closeJsonImportModal() {
    var modal = document.getElementById('modal-json-import');
    var backdrop = document.getElementById('drawer-backdrop');
    if (modal) modal.classList.remove('is-visible');
    if (backdrop) backdrop.classList.remove('is-visible');
}

async function confirmJsonImport() {
    var file = document.getElementById('json-import-file').files[0];
    if (!file) {
        showToast("Iltimos, JSON fayl tanlang!", "error");
        return;
    }
    
    try {
        var text = await file.text();
        var data = JSON.parse(text);
        var roomId = data.roomId || data.roomCode;
        
        if (!roomId) {
            showToast("JSON faylda xona kodi topilmadi!", "error");
            return;
        }
        
        var roomRef = db.ref('rooms/' + roomId);
        var snapshot = await roomRef.once('value');
        var roomData = snapshot.val();
        
        if (!roomData) {
            showToast("Xona topilmadi!", "error");
            return;
        }
        
        if (roomData.isActive === false) {
            showToast("Bu xona tugatilgan!", "error");
            return;
        }
        
        if (roomData.hasPassword) {
            var password = prompt("Xona parolini kiriting:");
            if (roomData.password !== password) {
                showToast("Parol noto'g'ri!", "error");
                return;
            }
        }
        
        closeJsonImportModal();
        localStorage.setItem('lastRoomId', roomId);
        window.location.href = 'board.html?room=' + roomId;
        
    } catch (error) {
        console.error('JSON import error:', error);
        showToast("JSON fayl noto'g'ri formatda!", "error");
    }
}

// ==================== EVENT LISTENERS ====================
document.getElementById('btn-logout')?.addEventListener('click', async function() {
    await auth.signOut();
    localStorage.clear();
    window.location.href = 'board.html';
});

document.getElementById('quick-create-room')?.addEventListener('click', showCreateRoomModal);
document.getElementById('quick-join-room')?.addEventListener('click', showJoinForm);
document.getElementById('quick-json-import')?.addEventListener('click', showJsonImportModal);

// Refresh tugmasi (qo'lda yangilash)
document.getElementById('refresh-rooms')?.addEventListener('click', function() {
    publicRoomsLoaded = false;
    myRoomsLoaded = false;
    loadPublicRooms();
    loadMyRooms();
    showToast("Xonalar yangilandi", "success");
});

document.getElementById('submit-join-room')?.addEventListener('click', submitJoinRoom);
document.getElementById('cancel-join-form')?.addEventListener('click', showJoinForm);
document.getElementById('btn-cancel-create-room')?.addEventListener('click', closeCreateRoomModal);
document.getElementById('btn-confirm-create-room')?.addEventListener('click', confirmCreateRoom);
document.getElementById('btn-cancel-json-import')?.addEventListener('click', closeJsonImportModal);
document.getElementById('btn-confirm-json-import')?.addEventListener('click', confirmJsonImport);

// Xona turi tanlash
var typeSelectors = document.querySelectorAll('.room-type-selector');
for (var i = 0; i < typeSelectors.length; i++) {
    typeSelectors[i].addEventListener('click', function(e) {
        var btns = document.querySelectorAll('.room-type-selector');
        for (var j = 0; j < btns.length; j++) {
            btns[j].classList.remove('active');
        }
        e.target.classList.add('active');
        currentRoomType = e.target.getAttribute('data-type');
        
        var passwordGroup = document.getElementById('new-room-password-group');
        if (currentRoomType === 'private') {
            if (passwordGroup) passwordGroup.style.display = 'block';
        } else {
            if (passwordGroup) passwordGroup.style.display = 'none';
            currentRoomPassword = '';
        }
    });
}

var newRoomPassword = document.getElementById('new-room-password');
if (newRoomPassword) {
    newRoomPassword.addEventListener('input', function(e) {
        currentRoomPassword = e.target.value;
    });
}

var joinRoomCodeInput = document.getElementById('join-room-code-input');
if (joinRoomCodeInput) {
    joinRoomCodeInput.addEventListener('input', async function(e) {
        var code = e.target.value.trim().toUpperCase();
        if (code.length === 6) {
            var roomRef = db.ref('rooms/' + code);
            var snapshot = await roomRef.once('value');
            var roomData = snapshot.val();
            var passwordInput = document.getElementById('join-room-password-input');
            if (roomData && roomData.hasPassword && passwordInput) {
                passwordInput.style.display = 'block';
            } else if (passwordInput) {
                passwordInput.style.display = 'none';
                passwordInput.value = '';
            }
        }
    });
}

if (window.lucide) lucide.createIcons();
