import { db } from "./firebase-config.js";
import { collection, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from "./ui-helpers.js";

let isAdmin = false;

export function initAdmin(user, onUsersLoaded) {
    isAdmin = user.isAdmin || false;
    
    if(isAdmin) {
        monitorUsersForAdmin();
        if(onUsersLoaded) onUsersLoaded();
    }
}
 
function monitorUsersForAdmin() {
    onSnapshot(collection(db, "users"), (snap) => {
        const adminPanel = document.getElementById('adminPanel');
        if(!adminPanel) return;
        
        let html = '<h3>👑 Admin Panel - Foydalanuvchilar</h3>';
        snap.forEach(d => {
            const u = d.data();
            if(u.uid !== 'admin') {
                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border);">
                        <div>
                            <b>${u.name || u.username}</b><br>
                            <small>@${u.username}</small>
                        </div>
                        <button class="admin-delete-btn" data-uid="${u.uid}" style="background:#ff3b30; border:none; padding:6px 12px; border-radius:12px; color:white; cursor:pointer;">O'chirish</button>
                    </div>
                `;
            }
        });
        adminPanel.innerHTML = html;
        
        document.querySelectorAll('.admin-delete-btn').forEach(btn => {
            btn.onclick = async () => {
                if(confirm("Foydalanuvchini butunlay o'chirish?")) {
                    await deleteDoc(doc(db, "users", btn.dataset.uid));
                    showToast("Foydalanuvchi o'chirildi");
                }
            };
        });
    });
}

export function isUserAdmin() {
    return isAdmin;
}
