import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { openChat } from "./chat.js";
import { showToast } from "./ui-helpers.js";

export async function loadAllUsers(currentUserId, onUserSelect = null) {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = document.getElementById('usersList');
        if (!usersList) {
            console.error("usersList elementi topilmadi");
            return;
        }
        
        usersList.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            if (user.uid !== currentUserId) {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-card';
                
                // Avatar (rasm yoki harf)
                let avatarHtml = '';
                if (user.photoURL && user.photoURL !== "") {
                    avatarHtml = `<img src="${user.photoURL}" class="avatar-img" onerror="this.style.display='none'; this.nextSibling.style.display='flex';">`;
                }
                avatarHtml += `<span style="display: ${user.photoURL ? 'none' : 'flex'};">${(user.name || 'U')[0].toUpperCase()}</span>`;
                
                userDiv.innerHTML = `
                    <div class="avatar" style="background:${user.color || '#2c2c2e'}">${avatarHtml}</div>
                    <div class="user-info">
                        <b>${user.name || user.username}</b>
                        <br>
                        <small style="opacity:0.6">@${user.username}</small>
                    </div>
                `;
                
                userDiv.onclick = () => {
                    if (onUserSelect) {
                        onUserSelect(user);
                    } else {
                        startPrivateChat(user);
                    }
                };
                
                usersList.appendChild(userDiv);
            }
        });
        
        if (usersList.children.length === 0) {
            usersList.innerHTML = '<div class="empty-state">📭 Hech qanday foydalanuvchi topilmadi</div>';
        }
    } catch (error) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", error);
        showToast("Xatolik yuz berdi");
    }
}

function startPrivateChat(targetUser) {
    console.log("Chat boshlanmoqda: ", targetUser.name);
    
    // Chat oynasini ochish
    const chatView = document.getElementById('chatView');
    const chatTitle = document.getElementById('chatTitle');
    const chatAvatarImg = document.getElementById('chatAvatarImg');
    
    if (chatTitle) chatTitle.innerText = targetUser.name || targetUser.username;
    if (chatAvatarImg && targetUser.photoURL) {
        chatAvatarImg.src = targetUser.photoURL;
        chatAvatarImg.style.display = 'inline-block';
    } else if (chatAvatarImg) {
        chatAvatarImg.style.display = 'none';
    }
    
    if (chatView) chatView.classList.add('active');
    
    // Chat ID ni yaratish
    const currentUser = JSON.parse(localStorage.getItem('mrgram_user'));
    const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
    
    // Global o‘zgaruvchilarni o‘rnatish
    window.currentChatId = chatId;
    window.currentChatUser = targetUser;
    
    // Event dispatch qilish (agar chat.js da listener bo‘lsa)
    const event = new CustomEvent('openChatDirect', { detail: { user: targetUser, chatId: chatId } });
    document.dispatchEvent(event);
    
    // Xabarlarni yuklash funksiyasini chaqirish (agar mavjud bo‘lsa)
    if (typeof loadMessages === 'function') {
        loadMessages(chatId);
    }
}

// Xabarlarni yuklash (agar chat.js da bo‘lmasa)
export async function loadMessages(chatId) {
    const { collection, query, orderBy, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const { escapeHtml, viewFullImage } = await import("./ui-helpers.js");
    
    const chatMsgs = document.getElementById('chatMsgs');
    if (!chatMsgs) return;
    
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("time", "asc"));
    
    onSnapshot(q, (snap) => {
        chatMsgs.innerHTML = "";
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const currentUser = JSON.parse(localStorage.getItem('mrgram_user'));
            const isMe = m.from === currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg ${isMe ? 'me' : 'them'}`;
            
            let msgTime = "";
            if(m.time) {
                const date = new Date(m.time?.seconds * 1000);
                msgTime = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
            }
            
            const headerHtml = `<div class="msg-header"><span class="msg-time">${msgTime}</span></div>`;
            
            let contentHtml = `<div class="msg-content">`;
            if(m.txt) contentHtml += `<div>${escapeHtml(m.txt)}</div>`;
            if(m.image) contentHtml += `<img src="${m.image}" onclick="viewFullImage('${m.image}')" style="max-width:70%; border-radius:20px; cursor:pointer;">`;
            if(m.video) {
                contentHtml += `<video controls preload="auto" src="${m.video}" style="max-width:100%; border-radius:16px; display:block;"></video>`;
            }
            if(m.voice) {
                let waveBars = '';
                for(let i = 0; i < 8; i++) waveBars += `<div class="voice-wave-bar" style="height: ${Math.floor(Math.random() * 12 + 4)}px"></div>`;
                contentHtml += `<div class="voice-message" data-voice-url="${m.voice}"><div class="voice-play-btn"><svg class="play-icon" width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><div class="voice-waveform-container"><div class="voice-waveform">${waveBars}</div><div class="voice-duration">0:00</div></div></div>`;
            }
            if(m.edited) contentHtml += `<small style="opacity:0.5;"> ✎</small>`;
            contentHtml += `</div>`;
            
            msgDiv.innerHTML = headerHtml + contentHtml;
            
            // Ovozli xabar uchun event
            const voiceMsg = msgDiv.querySelector('.voice-message');
            if(voiceMsg) {
                import("./voice.js").then(({ playVoice }) => {
                    voiceMsg.onclick = (e) => {
                        e.stopPropagation();
                        playVoice(voiceMsg, voiceMsg.dataset.voiceUrl, e);
                    };
                });
            }
            
            chatMsgs.appendChild(msgDiv);
        });
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    });
}
