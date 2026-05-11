import { db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { uploadAvatar } from "./upload-file.js";
import { showToast } from "./ui-helpers.js";

let loginMode = false;

export function initAuth(onSuccess) {
    document.getElementById('authBtn').onclick = () => handleAuth(onSuccess);
    document.getElementById('switchBtn').onclick = toggleAuth;
    document.getElementById('authAvatarInput').onchange = previewAuthAvatar;
}

function previewAuthAvatar(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => { 
            document.getElementById('authAvatarPreview').src = e.target.result; 
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function toggleAuth() {
    loginMode = !loginMode;
    const regBox = document.getElementById('regBox');
    if(regBox) regBox.style.display = loginMode ? 'none' : 'block';
    const switchBtn = document.getElementById('switchBtn');
    if(switchBtn) {
        switchBtn.innerHTML = loginMode ? "📝 Ro'yxatdan o'tish" : "🔑 Tizimga kirish";
    }
}

async function handleAuth(onSuccess) {
    const username = document.getElementById('regUser').value.toLowerCase().trim();
    const password = document.getElementById('regPass').value;
    const name = document.getElementById('regName')?.value || username;
    const avatarFile = document.getElementById('authAvatarInput').files[0];
    let avatarURL = document.getElementById('authAvatarPreview')?.src || "";

    if(!username || !password) {
        alert("Username va parolni kiriting!");
        return;
    }

    // LOGIN MODE
    if(loginMode) {
        // 1. Admin ni Firestore dan tekshirish
        if(username === 'admin') {
            try {
                const adminDoc = await getDoc(doc(db, "admin", "config"));
                if(adminDoc.exists() && adminDoc.data().password === password) {
                    const adminUser = { 
                        uid: 'admin', 
                        name: 'ADMIN', 
                        username: 'admin', 
                        isAdmin: true, 
                        color: '#ff3b30',
                        photoURL: avatarURL
                    };
                    localStorage.setItem('mrgram_user', JSON.stringify(adminUser));
                    onSuccess(adminUser);
                    return;
                } else {
                    alert("❌ Admin paroli xato!");
                    return;
                }
            } catch(error) {
                console.error("Admin tekshirish xatosi:", error);
                alert("Xatolik yuz berdi!");
                return;
            }
        }
        
        // 2. Oddiy foydalanuvchini tekshirish
        const userDoc = await getDoc(doc(db, "users", username));
        if(userDoc.exists() && userDoc.data().password === password) {
            const user = userDoc.data();
            localStorage.setItem('mrgram_user', JSON.stringify(user));
            onSuccess(user);
        } else {
            alert("❌ Username yoki parol xato!");
        }
    } 
    // REGISTER MODE
    else {
        if(username === 'admin') {
            alert("❌ Admin username band!");
            return;
        }
        
        // Tekshirish: user mavjudmi?
        const existingUser = await getDoc(doc(db, "users", username));
        if(existingUser.exists()) {
            alert("❌ Bu username allaqachon band!");
            return;
        }
        
        // Agar avatar tanlangan bo‘lsa, Supabase’ga yuklash
        if (avatarFile) {
            try {
                showToast("Rasm yuklanmoqda...");
                avatarURL = await uploadAvatar(avatarFile);
                showToast("Rasm yuklandi!");
            } catch (err) {
                console.error("Avatar yuklash xatosi:", err);
                showToast("Rasm yuklashda xatolik, default rasm ishlatiladi");
                avatarURL = "";
            }
        }
        
        // Yangi foydalanuvchi yaratish
        const newUser = { 
            uid: username, 
            name: name, 
            username: username, 
            password: password,
            color: `hsl(${Math.random() * 360}, 70%, 55%)`, 
            photoURL: avatarURL,
            createdAt: new Date().toISOString(),
            isAdmin: false
        };
        
        await setDoc(doc(db, "users", username), newUser);
        localStorage.setItem('mrgram_user', JSON.stringify(newUser));
        onSuccess(newUser);
    }
}

export function logout() {
    localStorage.clear();
    location.reload();
}
