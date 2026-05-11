 // js/users.js - Yangilangan versiya (foydalanuvchi nomi auth dan keladi)

import { Store } from './store.js';
import { DB } from './firebase.js';
import { Utils } from './utils.js';

export function updateUsersList() {
    const list = document.getElementById('ui-participants-list');
    if (!list) return;
    
    let html = '';
    let studentCount = 0;
    
    Object.values(Store.users).forEach(p => {
        // O'qituvchilarni faqat o'qituvchi ko'radi
        if (p.t && p.id !== Store.uid) return;
        if (!p.t) studentCount++;
        
        // Foydalanuvchi nomi (Store.name dan yoki p.n dan)
        const displayName = p.n || 'Foydalanuvchi';
        
        html += `
            <div class="user-card">
                <div class="user-meta">
                    <div class="avatar">${displayName.charAt(0).toUpperCase()}</div>
                    <span>${Utils.sanitize(displayName)}</span>
                    ${p.t ? '<i data-lucide="crown" size="14" style="color:var(--state-warning)"></i>' : ''}
                </div>
                <div class="perm-actions">
        `;
        
        if (Store.isTeacher && !p.t) {
            html += `
                <button class="perm-btn ${p.d ? 'is-granted' : ''}" data-user="${p.id}" data-perm="d"><i data-lucide="pencil" size="14"></i></button>
                <button class="perm-btn ${p.s ? 'is-granted' : ''}" data-user="${p.id}" data-perm="s"><i data-lucide="mic" size="14"></i></button>
                <button class="perm-btn" data-user="${p.id}" data-perm="kick"><i data-lucide="user-x" size="14"></i></button>
            `;
        } else if (!Store.isTeacher && p.t) {
            html += `<span style="font-size:11px;">O'qituvchi</span>`;
        } else if (!Store.isTeacher) {
            html += `<span style="font-size:11px;">${p.d ? '✏️' : '👁️'} ${p.s ? '🎤' : '🔇'}</span>`;
        }
        
        html += `</div></div>`;
    });
    
    if (studentCount === 0 && !Store.isTeacher) {
        html = '<div style="text-align:center; padding:20px;">Faqat o\'qituvchi</div>';
    } else if (studentCount === 0 && Store.isTeacher) {
        html = '<div style="text-align:center; padding:20px;">Hali o\'quvchilar yo\'q</div>';
    }
    
    list.innerHTML = html;

    // Re-initialize lucide icons
    if (window.lucide) window.lucide.createIcons();

    const badgeUsersCount = document.getElementById('badge-users-count');
    if (badgeUsersCount) {
        badgeUsersCount.innerText = studentCount;
        badgeUsersCount.style.display = studentCount > 0 ? 'flex' : 'none';
    }

    if (Store.isTeacher && list) {
        // Chizish ruxsati
        list.querySelectorAll('.perm-btn[data-perm="d"]').forEach(btn => {
            btn.onclick = () => DB.setPerm(btn.dataset.user, 'd', !btn.classList.contains('is-granted'));
        });
        // Mikrofon ruxsati
        list.querySelectorAll('.perm-btn[data-perm="s"]').forEach(btn => {
            btn.onclick = () => DB.setPerm(btn.dataset.user, 's', !btn.classList.contains('is-granted'));
        });
        // Chiqarish
        list.querySelectorAll('.perm-btn[data-perm="kick"]').forEach(btn => {
            btn.onclick = () => { 
                if (confirm("Chiqarilsinmi?")) DB.kickUser(btn.dataset.user); 
            };
        });
    }
}
