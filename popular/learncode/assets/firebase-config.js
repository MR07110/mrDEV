// ==================== FIREBASE CONFIG — Learncode ====================
// Kalitlar window.__ENV__ dan o'qiladi — to'g'ridan-to'g'ri yozilmaydi.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getDatabase }   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const ENV = window.__ENV__ || {};

const firebaseConfig = {
    apiKey:            ENV.SECONDARY_API_KEY             || '',
    authDomain:        ENV.SECONDARY_AUTH_DOMAIN         || '',
    projectId:         ENV.SECONDARY_PROJECT_ID          || '',
    storageBucket:     ENV.SECONDARY_STORAGE_BUCKET      || '',
    messagingSenderId: ENV.SECONDARY_MESSAGING_SENDER_ID || '',
    appId:             ENV.SECONDARY_APP_ID              || '',
    measurementId:     ENV.SECONDARY_MEASUREMENT_ID      || '',
    databaseURL:       ENV.SECONDARY_DATABASE_URL        || ''
};

if (!firebaseConfig.apiKey) {
    console.error('❌ learncode/firebase-config: ENV kalitlar topilmadi!');
}

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const rtdb = getDatabase(app);

console.log('✅ Firebase ulandi - Learncode.uz');
