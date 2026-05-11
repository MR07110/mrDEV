// ==================== MRDEV LOGGER v2.0 ====================
// BARCHA CONSOLE.LOG'LAR SHU YERDA!
// Boshqa fayllarda faqat: import logger from './logger.js'

const isLocal = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.0.') ||
    window.location.hostname.startsWith('172.') ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname.includes('live-server') ||
    window.location.hostname.includes('liveserver') ||
    window.location.hostname.includes('vite') ||
    window.location.hostname.includes('webpack') ||
    window.location.protocol === 'file:'
);

let enabled = false;

try {
    const stored = localStorage.getItem('mrdev_debug');
    if (stored === 'true') enabled = true;
    else if (stored === 'false') enabled = false;
    else if (isLocal) enabled = true;
} catch(e) {
    enabled = isLocal;
}

function log(level, ...args) {
    if (!enabled) return;
    switch(level) {
        case 'error': console.error(...args); break;
        case 'warn': console.warn(...args); break;
        default: console.log(...args);
    }
}

const logger = {
    
    // ==================== BOSHQARISH ====================
    on() {
        enabled = true;
        localStorage.setItem('mrdev_debug', 'true');
        console.log('🟢 MRDEV Logger: ON');
    },
    off() {
        enabled = false;
        localStorage.setItem('mrdev_debug', 'false');
    },
    status() { return enabled; },
    toggle() {
        enabled ? this.off() : this.on();
        return enabled;
    },
    
    // ==================== FIREBASE INIT ====================
    firebase: {
        start() { log('log', '🚀 MRDEV Firebase Init v3.0'); },
        info(hostname, protocol, isLocalhost, isVercel, isDev, projectId, hasApiKey) {
            log('log', '📍 Hostname:', hostname);
            log('log', '🔒 Protocol:', protocol);
            log('log', '🏠 Localhost:', isLocalhost);
            log('log', '📦 Vercel:', isVercel);
            log('log', '🔥 Project ID:', projectId);
            log('log', '🔑 API Key:', hasApiKey ? '✓ Mavjud' : '✗ Topilmadi');
        },
        newApp(name) { log('log', '🆕 Yangi Firebase app yaratildi:', name); },
        ready(auth, firestore, rtdb) {
            log('log', '✅ Firebase servislari tayyor:');
            log('log', '   - Auth:', auth ? '✓' : '✗');
            log('log', '   - Firestore:', firestore ? '✓' : '✗');
            log('log', '   - Realtime DB:', rtdb ? '✓' : '✗');
        },
        done() {
            log('log', '✅ MRDEV Firebase Init v3.0 tayyor');
            log('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        },
        persistence(type) { log('log', '🔒 Persistence:', type); }
    },
    
    // ==================== AUTH (BARCHASI BIRLASHTIRILGAN) ====================
    auth: {
        init() { log('log', '🔐 Auth init (local mode)...'); },
        google(email) { log('log', '✅ Firebase Auth:', email); },
        mrdev(email) { log('log', '📦 Lokal auth:', email); },
        none() { log('log', '❌ Hech qanday auth yo\'q'); },
        saved(email) { log('log', '📦 Saqlangan akkaunt:', email); },
        changed(email) { log('log', '🔄 Auth o\'zgardi:', email || 'no user'); },
        centerLinked(id, email) { log('log', '✅ ' + id + ' -> ' + email + ' markaziga qo\'shildi'); },
        firebaseLogin(email) { log('log', '✅ Firebase Auth:', email); },
        loginOk() { log('log', '✅ MRDEV Login muvaffaqiyatli'); }
    },
    
    // ==================== MRDEV LOGIN ====================
    mrdev: {
        searching(id) { log('log', '🔍 MRDEV ID qidirilmoqda:', id); },
        found(email) { log('log', '✅ Foydalanuvchi topildi:', email); },
        otpSent(key) { log('log', '📤 RTDB ga yuborildi:', key); },
        otpSentDev(code) { if (isLocal) log('log', '🔑 DEV Parol:', code); },
        notify(id) { log('log', '📧 Parol xabarnomasi yuborildi:', id); },
        verifying(id) { log('log', '🔐 Parol tekshirilmoqda:', id); },
        success() { log('log', '✅ Parol to\'g\'ri!'); },
        wrong() { log('log', '❌ Noto\'g\'ri parol yoki muddati tugagan'); },
        loginOk() { log('log', '✅ MRDEV Login muvaffaqiyatli!'); }
    },
    
    // ==================== BOARD ====================
    board: {
        init() { log('log', '🎨 MRDEV Board ishga tushmoqda...'); },
        ready(uid) { log('log', '✅ Board tayyor! UID:', uid); },
        save(uid) { log('log', '💾 Saqlash UID:', uid); },
        load(uid) { log('log', '☁️ Yuklash UID:', uid); },
        ui(name) { log('log', '👤 UI yangilandi:', name); },
        guest() { log('log', '👤 Mehmon'); },
        cloudSaveError(e) { log('error', 'Cloud save error:', e); },
        cloudLoadError(e) { log('error', 'Cloud load error:', e); },
        dropdownError(e) { log('warn', 'Dropdown init failed:', e); }
    },
    
    // ==================== LOCAL AUTH ====================
    localAuth: {
        check(found) { log('log', '🔍 Local auth:', found ? 'topildi' : 'yo\'q'); },
        found(email) { log('log', '✅ Local auth topildi:', email); },
        saved(uid) { log('log', '💾 Local auth saqlandi:', uid); }
    },
    
    // ==================== NOTIF-PASS ====================
    notifPass: {
        loaded() {
            log('log', '✅ MRDEV Notif-Pass yuklandi');
            log('log', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        },
        userSave(id) { log('log', '🔧 MRDEV ID saqlash:', id); },
        passwordUpdated() { log('log', '🔑 Yangi xavfsiz parol yaratildi'); },
        created(id) { log('log', '🆕 Yangi MRDEV ID:', id); }
    },
    
    // ==================== XATOLIKLAR ====================
    error: {
        firebase(msg) { log('error', '❌ Firebase xatolik:', msg); },
        cloud(msg) { log('error', 'Cloud error:', msg); },
        dropdown(msg) { log('warn', 'Dropdown init failed:', msg); },
        verify(msg) { log('error', '❌ Verifikatsiya xatolik:', msg); },
        notif(msg) { log('error', '❌ Notif xatolik:', msg); },
        auth(msg) { log('warn', 'Auth xatolik:', msg); }
    },
    
    // ==================== UMUMIY ====================
    env(version) { log('log', '✅ MRDEV ENV yuklandi | Versiya:', version); },
    platformStart() { log('log', '🚀 MRDEV ishga tushmoqda...'); },
    platformReady() { log('log', '✅ MRDEV Platform tayyor'); },
    mrdevLoginLoaded() { log('log', '✅ MRDEV ID Login yuklandi'); }
};

// ==================== GLOBAL ====================
window.__LOG__ = logger;

export default logger;
