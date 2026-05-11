// ==================== FIREBASE INIT (SETTINGS) ====================
// Kalitlar window.__ENV__ dan o'qiladi — to'g'ridan-to'g'ri yozilmaydi.

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth }      from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDatabase }  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const APP_NAME = 'mrdev_main';
const ENV      = window.__ENV__ || {};

const existingApp = getApps().find(a => a.name === APP_NAME);

let app;
if (existingApp) {
    app = getApp(APP_NAME);
} else {
    const firebaseConfig = {
        apiKey:            ENV.MAIN_API_KEY             || '',
        authDomain:        ENV.MAIN_AUTH_DOMAIN         || '',
        databaseURL:       ENV.MAIN_DATABASE_URL        || '',
        projectId:         ENV.MAIN_PROJECT_ID          || '',
        storageBucket:     ENV.MAIN_STORAGE_BUCKET      || '',
        messagingSenderId: ENV.MAIN_MESSAGING_SENDER_ID || '',
        appId:             ENV.MAIN_APP_ID              || ''
    };

    if (!firebaseConfig.apiKey) {
        console.error('❌ settings/firebase-init: ENV kalitlar topilmadi!');
    }

    app = initializeApp(firebaseConfig, APP_NAME);
}

const auth = getAuth(app);
const db   = getFirestore(app);
const rtdb = getDatabase(app);

export { app, auth, db, rtdb };
export default app;
