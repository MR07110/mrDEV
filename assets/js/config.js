// ==================== MRDEV GLOBAL CONFIG ====================
// Kalitlar endi window.__ENV__ dan o'qiladi (env.js → build.js → Vercel).
// Hech qanday kalit bu faylda to'g'ridan-to'g'ri yozilmaydi.

const ENV = window.__ENV__ || {};

const MRDEV_CONFIG = {
    firebase: {
        apiKey:            ENV.MAIN_API_KEY             || '',
        authDomain:        ENV.MAIN_AUTH_DOMAIN         || '',
        databaseURL:       ENV.MAIN_DATABASE_URL        || '',
        projectId:         ENV.MAIN_PROJECT_ID          || '',
        storageBucket:     ENV.MAIN_STORAGE_BUCKET      || '',
        messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || '',
        appId:             ENV.MAIN_APP_ID              || '',
        measurementId:     ENV.MAIN_MEASUREMENT_ID      || ''
    },
    app: {
        name:         ENV.APP_NAME          || 'MRDEV',
        version:      ENV.APP_VERSION       || '6.0',
        defaultTheme: ENV.APP_DEFAULT_THEME || 'dark'
    }
};

if (!MRDEV_CONFIG.firebase.apiKey) {
    console.error('❌ Firebase config topilmadi! env.js yuklanganini tekshiring.');
}

window.MRDEV_CONFIG = MRDEV_CONFIG;
console.log('🚀 MRDEV Config v' + MRDEV_CONFIG.app.version);
