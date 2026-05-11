export const Utils = {
    generateId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    sanitize: (str) => String(str).replace(/[&<>]/g, (m) => ({ 
        '&': '&amp;', 
        '<': '&lt;', 
        '>': '&gt;' 
    }[m])),
    
    throttle: (fn, delay) => { 
        let last = 0; 
        return (...args) => { 
            const now = Date.now(); 
            if (now - last >= delay) { 
                fn(...args); 
                last = now; 
            } 
        }; 
    },
    
    vibrate: (p) => navigator.vibrate && navigator.vibrate(p),
    
    getTime: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    
    generateTeacherCode: () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
        let r = '';
        for (let i = 0; i < 16; i++) r += chars[Math.floor(Math.random() * chars.length)];
        return r;
    },
    
    generateStudentCode: () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let r = '';
        for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
        return r;
    },
    
    copyToClipboard: (text) => {
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast("Link nusxalandi!", "success");
        }).catch(() => Utils.showToast("Nusxalashda xatolik", "error"));
    },
    
    showToast: (msg, type = "info") => {
        const container = document.getElementById('toast-wrapper');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast-item ${type}`;
        toast.innerHTML = `<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// Alohida export
export const showToast = Utils.showToast;

// Default export ham qo'shamiz (muammo bo'lmasligi uchun)
export default Utils;
