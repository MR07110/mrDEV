 // js/chat.js - Yangilangan versiya (foydalanuvchi nomi auth dan keladi)
 
import { Store } from './store.js';
import { DB } from './firebase.js';
import { Utils, showToast } from './utils.js';
import { Events } from './events.js';

export function initChat(uiInstance) {
    // Chat event handler firebase da, UI yangilanishi UIController da
    // Hech qanday o'zgarish kerak emas, chunki Store.name auth dan keladi
}

export function sendChatMessage() {
    const input = document.getElementById('inp-chat-text');
    if (!input) return;
    
    const msg = Utils.sanitize(input.value.trim());
    if (msg) { 
        DB.sendChat(msg); 
        input.value = ''; 
    }
}

// Chat xabarini UI da ko'rsatish (UIController da ishlatiladi)
export function displayChatMessage(msg) {
    const container = document.getElementById('ui-chat-messages');
    if (!container) return;
    
    const isMine = msg.u === Store.uid;
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${isMine ? 'mine' : 'other'}`;
    
    // Xabar yuboruvchi nomi (Store.name dan yoki msg.n dan)
    const senderName = msg.n || 'Foydalanuvchi';
    
    bubble.innerHTML = `
        <div class="msg-info">
            ${Utils.sanitize(senderName)}
            ${msg.t ? '<i data-lucide="crown" size="12" style="color:var(--state-warning)"></i>' : ''}
        </div>
        <div>${Utils.sanitize(msg.m)}</div>
        <div class="msg-time">${msg.tm || Utils.getTime()}</div>
    `;
    
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    
    // Icons yangilash
    if (window.lucide) window.lucide.createIcons();
    
    // Yangi xabar bildirishnomasi
    if (!isMine && !document.getElementById('drawer-chat')?.classList.contains('is-open')) {
        Store.unread = (Store.unread || 0) + 1;
        const badge = document.getElementById('badge-chat-count');
        if (badge) {
            badge.innerText = Store.unread > 9 ? '9+' : Store.unread;
            badge.style.display = 'flex';
        }
        if (Utils.vibrate) Utils.vibrate([10, 30, 10]);
    }
}
