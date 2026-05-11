// ==================== CONFIG — GroupBoard ====================
// Kalitlar window.__ENV__ dan o'qiladi — to'g'ridan-to'g'ri yozilmaydi.

const ENV = window.__ENV__ || {};

export const firebaseConfig = {
    apiKey:            ENV.GROUPBOARD_API_KEY             || '',
    authDomain:        ENV.GROUPBOARD_AUTH_DOMAIN         || '',
    databaseURL:       ENV.GROUPBOARD_DATABASE_URL        || '',
    projectId:         ENV.GROUPBOARD_PROJECT_ID          || '',
    storageBucket:     ENV.GROUPBOARD_STORAGE_BUCKET      || '',
    messagingSenderId: ENV.GROUPBOARD_MESSAGING_SENDER_ID || '',
    appId:             ENV.GROUPBOARD_APP_ID              || '',
    measurementId:     ENV.GROUPBOARD_MEASUREMENT_ID      || ''
};

if (!firebaseConfig.apiKey) {
    console.error('❌ groupboard/config: ENV kalitlar topilmadi!');
}

export const appConfig = {
    maxFileSize:       5 * 1024 * 1024,
    maxMessageLength:  250,
    defaultZoom:       1,
    minZoom:           0.2,
    maxZoom:           5
};

export default firebaseConfig;
