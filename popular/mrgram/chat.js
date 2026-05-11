// chat.js – MR GRAM uchun chat funksiyalari (TO'G'RILANGAN)

import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sendMessage, setCurrentChat, clearEditing, getPendingImage, getPendingVideo, getPendingVoice } from "./messages.js";
import { stopAllVoice } from "./voice.js";
import { escapeHtml, viewFullImage } from "./ui-helpers.js";
import { startCall, acceptCall, rejectCall, listenForIncomingCalls, initCallElements, endCall } from "./call.js";
import { showToast } from "./ui-helpers.js";

let me = null;
let dbInstance = null;
let currentChatUser = null;
let currentChat = null;
let messagesUnsubscribe = null;
let currentChatType = 'private';

let videoProgressCallback = null;
let incomingCallUnsubscribe = null;

export function initChat(user, database) {
    me = user;
    dbInstance = database;
    
    // Call elementlarini ishga tushirish
    if (initCallElements) {
        initCallElements();
    } else {
        console.error("initCallElements is not defined");
    }
    
    const closeBtn = document.getElementById('closeChatBtn');
    if(closeBtn) closeBtn.onclick = closeChat;
    
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');
    const msgInput = document.getElementById('msgInput');
    
    function toggleButtons() {
        if (!voiceBtn || !sendBtn) return;
        const hasText = msgInput && msgInput.value.trim().length > 0;
        const hasMedia = getPendingImage() !== null || getPendingVideo() !== null || getPendingVoice() !== null;
        if (hasText || hasMedia) {
            voiceBtn.style.display = 'none';
            sendBtn.style.display = 'flex';
        } else {
            voiceBtn.style.display = 'flex';
            sendBtn.style.display = 'none';
        }
    }
    
    if (sendBtn) {
        sendBtn.onclick = () => {
            sendMessage(currentChat, me, (callback) => { videoProgressCallback = callback; });
            setTimeout(toggleButtons, 100);
        };
    }
    
    if (msgInput) {
        msgInput.addEventListener('input', toggleButtons);
        msgInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessage(currentChat, me, (callback) => { videoProgressCallback = callback; });
                setTimeout(toggleButtons, 100);
            }
        };
    }
    
    setInterval(() => { toggleButtons(); }, 500);
    toggleButtons();
    
    // Audio va Video qo'ng'iroq tugmalari
    const audioCallBtn = document.getElementById('audioCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    
    if (audioCallBtn) {
        audioCallBtn.innerHTML = `<img src="svg-icons/phone.svg" width="24" height="24">`;
        audioCallBtn.onclick = () => {
            if (currentChatUser && currentChatType === 'private') {
                startCall(currentChatUser.uid, me.uid, false);
            } else {
                console.error("startCall is not defined or chat not private");
            }
        };
    }
    if (videoCallBtn) {
        videoCallBtn.innerHTML = `<img src="svg-icons/video.svg" width="24" height="24">`;
        videoCallBtn.onclick = () => {
            if (currentChatUser && currentChatType === 'private') {
                startCall(currentChatUser.uid, me.uid, true);
            } else {
                console.error("startCall is not defined or chat not private");
            }
        };
    }
    
    // Kiruvchi qo'ng'iroqlarni kuzatish
    if (!window.callListenerStarted) {
        window.callListenerStarted = true;
        incomingCallUnsubscribe = listenForIncomingCalls(me.uid, (callerId, callId, isVideo) => {
            const acceptBtn = document.getElementById('acceptCallBtn');
            const rejectBtn = document.getElementById('rejectCallBtn');
            if (acceptBtn) {
                acceptBtn.onclick = () => {
                    acceptCall(callId, me.uid);
                };
            }
            if (rejectBtn) {
                rejectBtn.onclick = () => {
                    rejectCall(callId);
                };
            }
        });
    }
    
    document.addEventListener('openChat', (e) => openChat(e.detail));
}

export function openChat(target, type = 'private', chatId = null) {
    stopAllVoice();
    currentChatUser = target;
    currentChatType = type;
    
    if (type === 'private') {
        currentChat = [me.uid, target.uid].sort().join('_');
    } else if (type === 'group') {
        currentChat = chatId || target.id;
    } else if (type === 'channel') {
        currentChat = chatId || target.id;
    }
    
    setCurrentChat(currentChat);
    
    const chatTitle = document.getElementById('chatTitle');
    const chatView = document.getElementById('chatView');
    const audioCallBtn = document.getElementById('audioCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    const groupInfoBtn = document.getElementById('groupInfoBtn');
    
    if (type === 'private') {
        chatTitle.innerText = target.name || target.username;
        if (audioCallBtn) {
            audioCallBtn.style.display = 'flex';
            audioCallBtn.innerHTML = `<img src="svg-icons/phone.svg" width="24" height="24">`;
        }
        if (videoCallBtn) {
            videoCallBtn.style.display = 'flex';
            videoCallBtn.innerHTML = `<img src="svg-icons/video.svg" width="24" height="24">`;
        }
        if (groupInfoBtn) groupInfoBtn.style.display = 'none';
    } else {
        chatTitle.innerText = target.name;
        if (audioCallBtn) audioCallBtn.style.display = 'none';
        if (videoCallBtn) videoCallBtn.style.display = 'none';
        if (groupInfoBtn) groupInfoBtn.style.display = 'flex';
    }
    
    const chatAvatarImg = document.getElementById('chatAvatarImg');
    if (chatAvatarImg && type === 'private') {
        if (target.photoURL && target.photoURL !== "") {
            chatAvatarImg.src = target.photoURL;
            chatAvatarImg.style.display = 'inline-block';
        } else {
            chatAvatarImg.style.display = 'none';
        }
    } else if (chatAvatarImg) {
        chatAvatarImg.style.display = 'none';
    }
    
    if(chatView) chatView.classList.add('active');
    if(messagesUnsubscribe) messagesUnsubscribe();
    
    const q = query(collection(dbInstance, "chats", currentChat, "messages"), orderBy("time", "asc"));
    messagesUnsubscribe = onSnapshot(q, (snap) => {
        const container = document.getElementById('chatMsgs');
        if(!container) return;
        container.innerHTML = "";
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const isMe = m.from === me.uid;
            const msgDiv = createMessageElement(m, docSnap.id, isMe);
            container.appendChild(msgDiv);
        });
        container.scrollTop = container.scrollHeight;
    });
}

function createMessageElement(message, msgId, isMe) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${isMe ? 'me' : 'them'}`;
    
    let msgTime = "";
    if(message.time) {
        const date = new Date(message.time?.seconds * 1000);
        msgTime = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    }
    
    const headerHtml = `<div class="msg-header"><span class="msg-time">${msgTime}</span></div>`;
    
    let contentHtml = `<div class="msg-content">`;
    if(message.txt) contentHtml += `<div>${escapeHtml(message.txt)}</div>`;
    
    if(message.image && message.image !== "") {
        contentHtml += `<img src="${message.image}" class="msg-image" data-src="${message.image}" style="max-width:70%; border-radius:20px; cursor:pointer;" onerror="this.style.display='none';">`;
    }
    
    if(message.video && message.video !== "") {
        contentHtml += `<video controls preload="auto" src="${message.video}" style="max-width:100%; border-radius:16px; margin-top:6px; margin-bottom:4px; display:block;" onerror="this.style.display='none';"></video>`;
    }
    
    if(message.voice) {
        let waveBars = '';
        for(let i = 0; i < 8; i++) waveBars += `<div class="voice-wave-bar" style="height: ${Math.floor(Math.random() * 12 + 4)}px"></div>`;
        contentHtml += `<div class="voice-message" data-voice-url="${message.voice}"><div class="voice-play-btn"><svg class="play-icon" width="20" height="20" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><div class="voice-waveform-container"><div class="voice-waveform">${waveBars}</div><div class="voice-duration">0:00</div></div></div>`;
    }
    if(message.edited) contentHtml += `<small style="opacity:0.5;"> ✎</small>`;
    contentHtml += `</div>`;
    
    msgDiv.innerHTML = headerHtml + contentHtml;
    
    const msgImage = msgDiv.querySelector('.msg-image');
    if(msgImage) {
        msgImage.onclick = (e) => { e.stopPropagation(); viewFullImage(msgImage.dataset.src); };
    }
    
    const voiceMsg = msgDiv.querySelector('.voice-message');
    if(voiceMsg) {
        import("./voice.js").then(({ playVoice }) => {
            voiceMsg.onclick = (e) => { e.stopPropagation(); playVoice(voiceMsg, voiceMsg.dataset.voiceUrl, e); };
        });
    }
    
    if(isMe) {
        let timer;
        msgDiv.onclick = (e) => {
            if(e.target.tagName === 'IMG' || e.target.closest('.voice-message') || e.target.tagName === 'VIDEO') return;
            import("./messages.js").then(({ editMessage }) => { editMessage(msgId, message, currentChat); });
        };
        msgDiv.onmousedown = () => {
            timer = setTimeout(async () => {
                if(confirm("Xabarni o'chirilsinmi?")) {
                    await deleteDoc(doc(dbInstance, "chats", currentChat, "messages", msgId));
                }
            }, 800);
        };
        msgDiv.onmouseup = () => clearTimeout(timer);
        msgDiv.onmouseleave = () => clearTimeout(timer);
    }
    
    return msgDiv;
}

export function closeChat() {
    const chatView = document.getElementById('chatView');
    if(chatView) chatView.classList.remove('active');
    if(messagesUnsubscribe) messagesUnsubscribe();
    currentChatUser = null;
    currentChat = null;
    currentChatType = 'private';
    clearEditing();
    stopAllVoice();
    endCall();
    
    const imagePanel = document.getElementById('imagePreviewPanel');
    const voicePanel = document.getElementById('voicePreviewPanel');
    const videoPanel = document.getElementById('videoPreviewPanel');
    const msgInput = document.getElementById('msgInput');
    if(imagePanel) imagePanel.style.display = 'none';
    if(voicePanel) voicePanel.style.display = 'none';
    if(videoPanel) videoPanel.style.display = 'none';
    if(msgInput) msgInput.value = '';
    
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');
    if (voiceBtn && sendBtn) {
        voiceBtn.style.display = 'flex';
        sendBtn.style.display = 'none';
    }
    
    const audioCallBtn = document.getElementById('audioCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    const groupInfoBtn = document.getElementById('groupInfoBtn');
    if (audioCallBtn) audioCallBtn.style.display = 'none';
    if (videoCallBtn) videoCallBtn.style.display = 'none';
    if (groupInfoBtn) groupInfoBtn.style.display = 'none';
}

export function getCurrentChat() { return currentChat; }
export function getCurrentChatUser() { return currentChatUser; }
export function getCurrentChatType() { return currentChatType; }

// ========== GURUH YARATISH ==========
export async function createGroup(ownerId, groupName) {
    try {
        const docRef = await addDoc(collection(dbInstance, "groups"), {
            name: groupName,
            admin: ownerId,
            members: [ownerId],
            createdAt: new Date().toISOString(),
            type: 'group'
        });
        showToast("Guruh yaratildi!");
        return docRef.id;
    } catch (e) {
        showToast("Xatolik: " + e.message);
        return null;
    }
}

// ========== KANAL YARATISH ==========
export async function createChannel(ownerId, channelName) {
    try {
        const docRef = await addDoc(collection(dbInstance, "channels"), {
            name: channelName,
            creator: ownerId,
            subscribers: [ownerId],
            type: 'channel',
            createdAt: new Date().toISOString()
        });
        showToast("Kanal yaratildi!");
        return docRef.id;
    } catch (e) {
        showToast("Xatolik: " + e.message);
        return null;
    }
}
