// ==================== SETTINGS PROFILE TAB ====================
import { auth, db } from '../firebase-init.js';
import { getCurrentUser } from '../script.js';
import { 
    updateProfile, 
    sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { showToast } from '../../assets/js/core/toast.js';

// ==================== ASOSIY INIT ====================
export function initProfileTab() {
    loadProfileData();
    setupAvatarUpload();
    setupSaveButton();
    setupEmailChange();
    setupEmailVerification();
}

// ==================== PROFILE MA'LUMOTLARINI YUKLASH ====================
async function loadProfileData() {
    const user = getCurrentUser();
    
    if (!user) {
        showEmptyProfile();
        return;
    }

    try {
        // Firestore'dan qo'shimcha ma'lumotlarni olish
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const firestoreData = userSnap.exists() ? userSnap.data() : {};

        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const email = user.email || '';
        const photoURL = user.photoURL || firestoreData.photoURL || null;
        const mrdevId = localStorage.getItem('mrdev_user_id') || firestoreData.mrdevId || '#-';
        const provider = user.providerData?.[0]?.providerId || 'email';
        const createdAt = user.metadata?.creationTime || firestoreData.createdAt?.toDate?.()?.toISOString() || null;
        const lastLogin = user.metadata?.lastSignInTime || firestoreData.lastLogin?.toDate?.()?.toISOString() || null;
        const emailVerified = user.emailVerified || false;
        const phoneNumber = user.phoneNumber || firestoreData.phoneNumber || '';
        const bio = firestoreData.bio || '';

        // Ism va familyani ajratish
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Avatar
        updateAvatar(photoURL, displayName);

        // Asosiy textlar
        setText('profileDisplayName', displayName);
        setText('profileEmail', email);
        setText('profileMrdevId', mrdevId);
        setText('profileProvider', getProviderFullName(provider));
        setText('profileBio', bio || 'Bio mavjud emas');

        // Inputlar
        setInputValue('profileFirstName', firstName);
        setInputValue('profileLastName', lastName);
        setInputValue('profileEmailInput', email);
        setInputValue('profileMrdevIdInput', mrdevId);
        setInputValue('profileBioInput', bio);
        setInputValue('profilePhoneInput', phoneNumber);

        // Sanalar
        setText('profileCreatedAt', createdAt ? formatDate(createdAt) : '-');
        setText('profileLastLogin', lastLogin ? formatDateTime(lastLogin) : '-');

        // Email tasdiqlash holati
        updateEmailVerificationStatus(emailVerified);

        // Provider badge
        updateProviderBadge(provider);

        // Save button enable
        const saveBtn = document.getElementById('profileSaveBtn');
        if (saveBtn) saveBtn.disabled = false;

    } catch (error) {
        console.error('Profil yuklashda xatolik:', error);
        showToast('Profil yuklashda xatolik: ' + error.message, 'error');
    }
}

function showEmptyProfile() {
    setText('profileDisplayName', 'Mehmon');
    setText('profileEmail', 'Hisobga kiring');
    setText('profileMrdevId', '-');
    setText('profileProvider', '-');
    setText('profileCreatedAt', '-');
    setText('profileLastLogin', '-');
    setText('profileBio', '-');
    
    const saveBtn = document.getElementById('profileSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Hisobga kiring';
    }
}

// ==================== AVATAR ====================
function updateAvatar(photoURL, displayName) {
    const avatarText = document.getElementById('profileAvatarText');
    const avatarImg = document.getElementById('profileAvatarImg');
    
    if (avatarText) {
        if (photoURL) {
            avatarText.style.display = 'none';
            if (avatarImg) {
                avatarImg.src = photoURL;
                avatarImg.style.display = 'block';
            } else {
                avatarText.innerHTML = `<img src="${photoURL}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }
        } else {
            if (avatarImg) avatarImg.style.display = 'none';
            avatarText.style.display = 'flex';
            avatarText.textContent = (displayName || 'U').charAt(0).toUpperCase();
        }
    }
}

function setupAvatarUpload() {
    const avatarPreview = document.getElementById('profileAvatarPreview');
    const avatarInput = document.getElementById('profileAvatarInput');
    const avatarRemove = document.getElementById('profileAvatarRemove');

    if (!avatarPreview || !avatarInput) return;

    // Click orqali fayl tanlash
    avatarPreview.addEventListener('click', () => {
        avatarInput.click();
    });

    // Fayl tanlanganda
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Fayl hajmi tekshirish (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Rasm hajmi 5MB dan kichik bo\'lishi kerak', 'error');
            return;
        }

        // Fayl turi tekshirish
        if (!file.type.startsWith('image/')) {
            showToast('Faqat rasm fayllar yuklash mumkin', 'error');
            return;
        }

        await uploadAndSetAvatar(file);
    });

    // Drag and drop
    avatarPreview.addEventListener('dragover', (e) => {
        e.preventDefault();
        avatarPreview.style.borderColor = 'var(--accent)';
    });

    avatarPreview.addEventListener('dragleave', () => {
        avatarPreview.style.borderColor = '';
    });

    avatarPreview.addEventListener('drop', async (e) => {
        e.preventDefault();
        avatarPreview.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            await uploadAndSetAvatar(file);
        }
    });

    // Olib tashlash
    if (avatarRemove) {
        avatarRemove.addEventListener('click', async (e) => {
            e.stopPropagation();
            await removeAvatar();
        });
    }
}

async function uploadAndSetAvatar(file) {
    const user = auth.currentUser;
    if (!user) {
        showToast('Avval hisobga kiring', 'error');
        return;
    }

    const statusEl = document.getElementById('profileSaveStatus');
    try {
        if (statusEl) {
            statusEl.textContent = '⏳ Rasm yuklanmoqda...';
            statusEl.style.color = 'var(--text-3)';
        }

        // Firebase Storage ga yuklash
        const storage = getStorage();
        const avatarRef = ref(storage, `avatars/${user.uid}/profile-${Date.now()}.webp`);
        
        // Rasmni siqish (agar kerak bo'lsa)
        const compressedFile = await compressImage(file, 200, 200);
        await uploadBytes(avatarRef, compressedFile || file);
        
        const downloadURL = await getDownloadURL(avatarRef);

        // Auth profilini yangilash
        await updateProfile(user, { photoURL: downloadURL });

        // Firestore dagi profilni yangilash
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            photoURL: downloadURL,
            updatedAt: serverTimestamp()
        });

        // UI yangilash
        const displayName = user.displayName || 'User';
        updateAvatar(downloadURL, displayName);

        showToast('Profil rasmi yangilandi!', 'success');
        if (statusEl) {
            statusEl.textContent = '✅ Rasm yangilandi';
            statusEl.style.color = 'var(--green)';
        }
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast('Rasm yuklashda xatolik: ' + error.message, 'error');
        if (statusEl) {
            statusEl.textContent = '❌ Xatolik';
            statusEl.style.color = 'var(--red)';
        }
    } finally {
        setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
        }, 3000);
    }
}

async function removeAvatar() {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm('Profil rasmini olib tashlamoqchimisiz?')) return;

    try {
        // Auth profilidan olib tashlash
        await updateProfile(user, { photoURL: '' });

        // Firestore dan olib tashlash
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            photoURL: '',
            updatedAt: serverTimestamp()
        });

        // UI yangilash
        updateAvatar(null, user.displayName || 'User');

        showToast('Profil rasmi olib tashlandi', 'success');
    } catch (error) {
        showToast('Xatolik: ' + error.message, 'error');
    }
}

// ==================== Rasm siqish ====================
function compressImage(file, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/webp' }));
                }, 'image/webp', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ==================== PROFILNI SAQLASH ====================
async function setupSaveButton() {
    const saveBtn = document.getElementById('profileSaveBtn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showToast('Avval hisobga kiring', 'error');
            return;
        }

        const firstName = document.getElementById('profileFirstName')?.value?.trim() || '';
        const lastName = document.getElementById('profileLastName')?.value?.trim() || '';
        const bio = document.getElementById('profileBioInput')?.value?.trim() || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (!fullName) {
            showToast('Ism va familya kiriting', 'error');
            return;
        }

        const statusEl = document.getElementById('profileSaveStatus');
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `
                <span class="loading-spinner-save"></span>
                Saqlanmoqda...
            `;

            if (statusEl) {
                statusEl.textContent = '';
            }

            // Firebase Auth profilini yangilash
            const updateData = { displayName: fullName };
            if (user.photoURL) updateData.photoURL = user.photoURL;
            await updateProfile(user, updateData);

            // Firestore dagi profilni yangilash
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                displayName: fullName,
                firstName: firstName,
                lastName: lastName,
                bio: bio,
                updatedAt: serverTimestamp()
            });

            // UI yangilash
            setText('profileDisplayName', fullName);

            showToast('Profil muvaffaqiyatli yangilandi!', 'success');
            if (statusEl) {
                statusEl.textContent = '✅ Saqlandi';
                statusEl.style.color = 'var(--green)';
            }
        } catch (error) {
            console.error('Profil yangilashda xatolik:', error);
            showToast('Xatolik: ' + error.message, 'error');
            if (statusEl) {
                statusEl.textContent = '❌ Xatolik yuz berdi';
                statusEl.style.color = 'var(--red)';
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                </svg>
                Profilni yangilash
            `;
            setTimeout(() => {
                if (statusEl) statusEl.textContent = '';
            }, 3000);
        }
    });
}

// ==================== EMAIL O'ZGARTIRISH ====================
function setupEmailChange() {
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    if (!changeEmailBtn) return;

    changeEmailBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showToast('Avval hisobga kiring', 'error');
            return;
        }

        const newEmail = prompt('Yangi email manzilni kiriting:');
        if (!newEmail || !newEmail.includes('@')) {
            showToast('To\'g\'ri email kiriting', 'error');
            return;
        }

        // Provider bo'yicha tekshirish
        const provider = user.providerData?.[0]?.providerId;
        if (provider === 'google.com') {
            showToast('Google orqali kirgan hisobning emailini bu yerda o\'zgartirib bo\'lmaydi', 'error');
            return;
        }

        try {
            await updateEmail(user, newEmail);
            
            // Firestore da ham yangilash
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                email: newEmail,
                updatedAt: serverTimestamp()
            });

            setInputValue('profileEmailInput', newEmail);
            setText('profileEmail', newEmail);
            showToast('Email yangilandi!', 'success');
        } catch (error) {
            console.error('Email change error:', error);
            
            if (error.code === 'auth/requires-recent-login') {
                showToast('Xavfsizlik uchun qaytadan kiring va urinib ko\'ring', 'error');
            } else {
                showToast('Xatolik: ' + error.message, 'error');
            }
        }
    });
}

// ==================== EMAIL TASDIQLASH ====================
function setupEmailVerification() {
    const verifyBtn = document.getElementById('verifyEmailBtn');
    if (!verifyBtn) return;

    verifyBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            showToast('Avval hisobga kiring', 'error');
            return;
        }

        if (user.emailVerified) {
            showToast('Email allaqachon tasdiqlangan', 'success');
            return;
        }

        try {
            await sendEmailVerification(user);
            showToast('Tasdiqlash havolasi emailingizga yuborildi', 'success');
        } catch (error) {
            showToast('Xatolik: ' + error.message, 'error');
        }
    });
}

function updateEmailVerificationStatus(verified) {
    const statusEl = document.getElementById('emailVerifyStatus');
    const btnEl = document.getElementById('verifyEmailBtn');

    if (statusEl) {
        if (verified) {
            statusEl.innerHTML = '✅ Tasdiqlangan';
            statusEl.style.color = 'var(--green)';
        } else {
            statusEl.innerHTML = '⚠️ Tasdiqlanmagan';
            statusEl.style.color = 'var(--orange)';
        }
    }

    if (btnEl) {
        btnEl.style.display = verified ? 'none' : 'inline-flex';
    }
}

// ==================== YORDAMCHI FUNKSIYALAR ====================
function getProviderFullName(providerId) {
    const map = {
        'google.com': 'Google',
        'password': 'Email va Parol',
        'email': 'Email va Parol',
        'phone': 'Telefon raqam'
    };
    return map[providerId] || 'Email va Parol';
}

function updateProviderBadge(provider) {
    const badge = document.getElementById('profileProviderBadge');
    if (!badge) return;

    const icons = {
        'google.com': '🔵',
        'password': '🔑',
        'email': '✉️'
    };

    badge.innerHTML = `${icons[provider] || '✉️'} ${getProviderFullName(provider)}`;
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function formatDateTime(dateString) {
    try {
        return new Date(dateString).toLocaleString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

// ==================== WINDOW EXPORT ====================
window.initProfileTab = initProfileTab;
