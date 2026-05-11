// ==================== MRDEV NOTES ====================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { initDropdown } from '../../assets/dropdown.js';

// ==================== FIREBASE (ENV dan) ====================
const ENV = window.__ENV__ || {};
const firebaseConfig = {
    apiKey:            ENV.MAIN_API_KEY             || '',
    authDomain:        ENV.MAIN_AUTH_DOMAIN         || '',
    projectId:         ENV.MAIN_PROJECT_ID          || '',
    storageBucket:     ENV.MAIN_STORAGE_BUCKET      || '',
    messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || '',
    appId:             ENV.MAIN_APP_ID              || ''
};

if (!firebaseConfig.apiKey) {
    console.error('❌ notes/script: ENV kalitlar topilmadi!');
}

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// State
let currentUser  = null;
let notes        = [];
let selectedColor = '#FFD700';
let searchTerm   = '';
let editNoteId   = null;
let notesListener = null;

// DOM
const notesGrid   = document.getElementById('notesGrid');
const noteTitle   = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const addNoteBtn  = document.getElementById('addNoteBtn');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const editModal   = document.getElementById('editModal');
const editTitle   = document.getElementById('editTitle');
const editContent = document.getElementById('editContent');
const modalTitle  = document.getElementById('modalTitle');
const toast       = document.getElementById('toast');
const syncBtn     = document.getElementById('syncBtn');

// ==================== THEME ====================
const saved = localStorage.getItem('mrdev_theme') || 'dark';
if (saved === 'dark') document.documentElement.classList.add('dark');

document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('mrdev_theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
});

// ==================== COLOR PICKER ====================
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        selectedColor = dot.dataset.color;
    });
});

// ==================== AUTH + DROPDOWN ====================
onAuthStateChanged(auth, (user) => {
    currentUser = user;

    const triggerName   = document.getElementById('triggerName');
    const triggerAvatar = document.getElementById('triggerAvatar');

    if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        if (triggerName) triggerName.textContent = displayName;
        if (triggerAvatar) {
            if (user.photoURL && _isSafeUrl(user.photoURL)) {
                const img = document.createElement('img');
                img.src = user.photoURL;
                img.alt = displayName;
                triggerAvatar.innerHTML = '';
                triggerAvatar.appendChild(img);
            } else {
                triggerAvatar.textContent = displayName.charAt(0).toUpperCase();
            }
        }
        loadCloudNotes();
    } else {
        if (triggerName)   triggerName.textContent   = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
        loadLocalNotes();
    }

    initDropdown(user, window.location.pathname);
});

// ==================== ADD NOTE ====================
addNoteBtn.addEventListener('click', addNote);
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') addNote();
});

async function addNote() {
    const title   = noteTitle.value.trim();
    const content = noteContent.value.trim();

    if (!title && !content) {
        showToast('Sarlavha yoki matn kiriting', 'error');
        return;
    }

    const noteData = {
        title:     title   || 'Sarlavhasiz',
        content:   content || '',
        color:     selectedColor,
        updatedAt: new Date().toISOString()
    };

    if (currentUser) {
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'notes'), {
                ...noteData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            showToast('Eslatma saqlandi', 'success');
        } catch (error) {
            saveLocalNote(noteData);
            showToast('Local saqlandi (oflayn)', 'error');
        }
    } else {
        saveLocalNote(noteData);
        showToast('Local saqlandi', 'success');
    }

    noteTitle.value  = '';
    noteContent.value = '';
    noteTitle.focus();
}

// ==================== LOCAL STORAGE ====================
function saveLocalNote(noteData) {
    const localNotes = JSON.parse(localStorage.getItem('mrdev_notes') || '[]');
    noteData.id      = 'local_' + Date.now();
    noteData.isLocal = true;
    localNotes.unshift(noteData);
    localStorage.setItem('mrdev_notes', JSON.stringify(localNotes));
    loadLocalNotes();
}

function loadLocalNotes() {
    notes = JSON.parse(localStorage.getItem('mrdev_notes') || '[]').map(n => ({ ...n, isLocal: true }));
    renderNotes();
}

// ==================== CLOUD NOTES ====================
function loadCloudNotes() {
    if (!currentUser) return;
    if (notesListener) notesListener();

    const q = query(
        collection(db, 'users', currentUser.uid, 'notes'),
        orderBy('updatedAt', 'desc')
    );

    notesListener = onSnapshot(q, (snap) => {
        const cloudNotes = snap.docs.map(d => ({
            id: d.id, ...d.data(), isCloud: true,
            updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        const localNotes = JSON.parse(localStorage.getItem('mrdev_notes') || '[]').map(n => ({ ...n, isLocal: true }));
        notes = [...cloudNotes, ...localNotes];
        renderNotes();
    }, (error) => {
        console.error('Cloud yuklash xatosi:', error);
        loadLocalNotes();
    });
}

// ==================== DELETE ====================
async function deleteNote(id, isLocal) {
    if (isLocal) {
        const localNotes = JSON.parse(localStorage.getItem('mrdev_notes') || '[]').filter(n => n.id !== id);
        localStorage.setItem('mrdev_notes', JSON.stringify(localNotes));
        currentUser ? loadCloudNotes() : loadLocalNotes();
        showToast('O\'chirildi');
    } else {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'notes', id));
            showToast('O\'chirildi');
        } catch {
            showToast('Xatolik', 'error');
        }
    }
}

// ==================== SYNC ====================
syncBtn.addEventListener('click', async () => {
    if (!currentUser) {
        showToast('Hisobga kiring', 'error');
        window.location.href = '../../';
        return;
    }
    const localNotes = JSON.parse(localStorage.getItem('mrdev_notes') || '[]');
    if (!localNotes.length) { showToast('Sinxronlash uchun local eslatmalar yo\'q'); return; }

    let count = 0;
    for (const note of localNotes) {
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'notes'), {
                title: note.title, content: note.content, color: note.color,
                createdAt: serverTimestamp(), updatedAt: serverTimestamp()
            });
            count++;
        } catch (e) { console.error('Sync error:', e); }
    }
    if (count > 0) {
        localStorage.removeItem('mrdev_notes');
        showToast(`${count} ta eslatma cloud'ga ko'chirildi`, 'success');
    }
});

// ==================== EDIT MODAL ====================
function openEditModal(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    editNoteId          = id;
    modalTitle.textContent = 'Eslatmani tahrirlash';
    editTitle.value     = note.title   || '';
    editContent.value   = note.content || '';
    editModal.classList.add('show');
}

document.getElementById('closeEditModal').addEventListener('click', () => editModal.classList.remove('show'));
document.getElementById('cancelEdit').addEventListener('click',     () => editModal.classList.remove('show'));
editModal.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.remove('show'); });

document.getElementById('saveEdit').addEventListener('click', async () => {
    const title   = editTitle.value.trim();
    const content = editContent.value.trim();
    if (!title && !content) { editModal.classList.remove('show'); return; }

    const note = notes.find(n => n.id === editNoteId);
    if (!note) return;

    if (note.isLocal) {
        const local = JSON.parse(localStorage.getItem('mrdev_notes') || '[]');
        const idx   = local.findIndex(n => n.id === editNoteId);
        if (idx > -1) {
            local[idx].title     = title   || 'Sarlavhasiz';
            local[idx].content   = content || '';
            local[idx].updatedAt = new Date().toISOString();
            localStorage.setItem('mrdev_notes', JSON.stringify(local));
        }
        currentUser ? loadCloudNotes() : loadLocalNotes();
    } else {
        await updateDoc(doc(db, 'users', currentUser.uid, 'notes', editNoteId), {
            title: title || 'Sarlavhasiz', content: content || '', updatedAt: serverTimestamp()
        });
    }
    editModal.classList.remove('show');
    showToast('Eslatma yangilandi', 'success');
});

// ==================== SEARCH ====================
searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase();
    clearSearch.style.display = searchTerm ? 'flex' : 'none';
    renderNotes();
});
clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm        = '';
    clearSearch.style.display = 'none';
    renderNotes();
});

// ==================== RENDER ====================
function renderNotes() {
    let filtered = [...notes];
    if (searchTerm) {
        filtered = filtered.filter(n =>
            n.title?.toLowerCase().includes(searchTerm) ||
            n.content?.toLowerCase().includes(searchTerm)
        );
    }

    if (!filtered.length) {
        notesGrid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                </svg>
                <p>${searchTerm ? 'Hech narsa topilmadi' : 'Hali eslatmalar yo\'q'}</p>
                ${!currentUser && !searchTerm ? '<small>Hisobga kiring va bulutga saqlang</small>' : ''}
            </div>`;
        return;
    }

    notesGrid.innerHTML = filtered.map(note => `
        <div class="note-card" style="background:${note.color || '#FFD700'}11;border-color:${note.color || '#FFD700'}44;"
             data-id="${escapeAttr(note.id)}" data-local="${note.isLocal || false}">
            <button class="note-card-delete" data-id="${escapeAttr(note.id)}" data-local="${note.isLocal || false}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
            <div class="note-card-header">
                <div class="note-card-title">${escapeHtml(note.title || 'Sarlavhasiz')}</div>
                <span class="note-card-badge ${note.isCloud ? 'cloud' : ''}">${note.isCloud ? 'Cloud' : 'Local'}</span>
            </div>
            ${note.content ? `<div class="note-card-content">${escapeHtml(note.content)}</div>` : ''}
            <div class="note-card-footer"><span>${formatTime(note.updatedAt)}</span></div>
        </div>
    `).join('');

    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.note-card-delete')) openEditModal(card.dataset.id);
        });
    });
    document.querySelectorAll('.note-card-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(btn.dataset.id, btn.dataset.local === 'true');
        });
    });
}

// ==================== YORDAMCHI ====================
function formatTime(iso) {
    if (!iso) return '';
    const d    = new Date(iso);
    const now  = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)     return 'Hozir';
    if (diff < 3600)   return Math.floor(diff / 60)   + ' daqiqa oldin';
    if (diff < 86400)  return Math.floor(diff / 3600)  + ' soat oldin';
    if (diff < 604800) return Math.floor(diff / 86400) + ' kun oldin';
    return d.toLocaleDateString('uz-UZ');
}

function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function escapeAttr(val) {
    return String(val).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _isSafeUrl(url) {
    try {
        const p = new URL(url);
        return p.protocol === 'https:' || p.protocol === 'http:';
    } catch { return false; }
}

function showToast(msg, type) {
    toast.textContent = msg;
    toast.className   = 'toast show' + (type ? ' ' + type : '');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

console.log('MRDEV Notes loaded');
