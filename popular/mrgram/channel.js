import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from "./ui-helpers.js";

// ========== KANAL YARATISH ==========
export async function createChannel(ownerId, channelName, description = "") {
    if (!channelName || channelName.trim() === "") {
        showToast("Kanal nomini kiriting");
        return null;
    }
    
    try {
        const docRef = await addDoc(collection(db, "channels"), {
            name: channelName.trim(),
            description: description,
            creator: ownerId,
            owner: ownerId,
            subscribers: [ownerId],
            type: 'channel',
            createdAt: new Date().toISOString(),
            photoURL: null,
            messageCount: 0
        });
        showToast("✅ Kanal yaratildi!");
        return docRef.id;
    } catch (error) {
        console.error("Kanal yaratish xatosi:", error);
        showToast("❌ Kanal yaratishda xatolik: " + error.message);
        return null;
    }
}

// ========== KANAL MA'LUMOTLARINI OLISH ==========
export async function getChannel(channelId) {
    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const channelDoc = await getDoc(doc(db, "channels", channelId));
        if (channelDoc.exists()) {
            return { id: channelDoc.id, ...channelDoc.data() };
        }
        return null;
    } catch (error) {
        console.error("Kanal ma'lumotlarini olish xatosi:", error);
        return null;
    }
}

// ========== KANALGA OBUNA BO'LISH ==========
export async function subscribeToChannel(channelId, userId) {
    try {
        const channelRef = doc(db, "channels", channelId);
        await updateDoc(channelRef, {
            subscribers: arrayUnion(userId)
        });
        showToast("📢 Kanalga obuna bo'ldingiz");
        return true;
    } catch (error) {
        console.error("Obuna bo'lish xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return false;
    }
}

// ========== KANALDAN CHIQISH (OBUNANI BECKOR QILISH) ==========
export async function unsubscribeFromChannel(channelId, userId) {
    try {
        const channelRef = doc(db, "channels", channelId);
        await updateDoc(channelRef, {
            subscribers: arrayRemove(userId)
        });
        showToast("📢 Kanaldan chiqdingiz");
        return true;
    } catch (error) {
        console.error("Chiqish xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return false;
    }
}

// ========== KANALNI O'CHIRISH (FAQAT EGASI UCHUN) ==========
export async function deleteChannel(channelId, userId) {
    try {
        const channel = await getChannel(channelId);
        if (!channel) {
            showToast("Kanal topilmadi");
            return false;
        }
        
        if (channel.creator !== userId && channel.owner !== userId) {
            showToast("❌ Faqat kanal egasi o'chira oladi");
            return false;
        }
        
        // Kanaldagi barcha xabarlarni o'chirish
        const { collection, getDocs, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const messagesRef = collection(db, "chats", channelId, "messages");
        const messagesSnap = await getDocs(messagesRef);
        
        const deletePromises = [];
        messagesSnap.forEach(doc => {
            deletePromises.push(deleteDoc(doc.ref));
        });
        await Promise.all(deletePromises);
        
        // Kanalni o'chirish
        await deleteDoc(doc(db, "channels", channelId));
        
        showToast("✅ Kanal o'chirildi");
        return true;
    } catch (error) {
        console.error("Kanal o'chirish xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return false;
    }
}

// ========== FOYDALANUVCHINING KANALLARINI YUKLASH ==========
export async function loadUserChannels(userId, onChannelClick = null) {
    try {
        const q = query(collection(db, "channels"), where("subscribers", "array-contains", userId));
        const querySnapshot = await getDocs(q);
        
        const channels = [];
        querySnapshot.forEach(doc => {
            channels.push({ id: doc.id, ...doc.data() });
        });
        
        // Kanallar ro'yxatini UI da ko'rsatish
        const channelsList = document.getElementById('channelsList');
        if (channelsList) {
            channelsList.innerHTML = '';
            
            if (channels.length === 0) {
                channelsList.innerHTML = '<div class="empty-state">📭 Siz hech qanday kanalga obuna emassiz</div>';
            } else {
                channels.forEach(channel => {
                    const channelDiv = document.createElement('div');
                    channelDiv.className = 'user-card';
                    channelDiv.innerHTML = `
                        <div class="avatar" style="background:#007AFF">📢</div>
                        <div class="user-info">
                            <b>${channel.name}</b>
                            <br>
                            <small style="opacity:0.6">${channel.subscribers?.length || 0} obuna</small>
                        </div>
                    `;
                    channelDiv.onclick = () => {
                        if (onChannelClick) {
                            onChannelClick(channel);
                        } else {
                            // Chat ochish
                            const event = new CustomEvent('openChat', { detail: { name: channel.name, id: channel.id, type: 'channel' } });
                            document.dispatchEvent(event);
                        }
                    };
                    channelsList.appendChild(channelDiv);
                });
            }
        }
        
        return channels;
    } catch (error) {
        console.error("Kanallarni yuklash xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return [];
    }
}

// ========== KANALGA XABAR YUBORISH ==========
export async function sendChannelMessage(channelId, userId, message, type = 'text') {
    try {
        const { addDoc, collection, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        const messageData = {
            from: userId,
            time: serverTimestamp(),
            type: type
        };
        
        if (type === 'text') {
            messageData.txt = message;
        } else if (type === 'image') {
            messageData.image = message;
        } else if (type === 'video') {
            messageData.video = message;
        } else if (type === 'voice') {
            messageData.voice = message;
        }
        
        await addDoc(collection(db, "chats", channelId, "messages"), messageData);
        
        // Kanal xabarlar sonini oshirish
        const channelRef = doc(db, "channels", channelId);
        await updateDoc(channelRef, {
            messageCount: (await getChannel(channelId)).messageCount + 1
        });
        
        return true;
    } catch (error) {
        console.error("Xabar yuborish xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return false;
    }
}

// ========== KANAL MA'LUMOTLARINI YANGILASH ==========
export async function updateChannelInfo(channelId, userId, updates) {
    try {
        const channel = await getChannel(channelId);
        if (!channel) {
            showToast("Kanal topilmadi");
            return false;
        }
        
        if (channel.creator !== userId && channel.owner !== userId) {
            showToast("❌ Faqat kanal egasi yangilay oladi");
            return false;
        }
        
        const channelRef = doc(db, "channels", channelId);
        await updateDoc(channelRef, updates);
        
        showToast("✅ Kanal ma'lumotlari yangilandi");
        return true;
    } catch (error) {
        console.error("Kanal yangilash xatosi:", error);
        showToast("❌ Xatolik: " + error.message);
        return false;
    }
}
