// js/main.js - Yangilangan versiya (auth bilan moslashgan)

import { Store } from './store.js';
import { UIController } from './ui.js';
import { Utils } from './utils.js';

// Initialize UI controller
const ui = new UIController();

// Handle URL hash (link orqali kirish)
const hash = window.location.hash.slice(1);

if (hash.startsWith('t-')) {
    // O'qituvchi linki (teacher)
    const teacherSecret = hash.slice(2);
    
    // Auth dan foydalanuvchi ma'lumotlarini olish
    const user = JSON.parse(localStorage.getItem('mr_user') || '{}');
    
    if (user && user.fullName) {
        // Foydalanuvchi tizimga kirgan
        Store.name = user.fullName;
        Store.isTeacher = true;
        Store.teacherSecret = teacherSecret;
        Store.roomId = teacherSecret.substring(0, 6);
        Store.perms.draw = true;
        Store.perms.speak = true;
        ui.startApp(Store.roomId, teacherSecret);

        const baseUrl = window.location.href.split('#')[0];
        setTimeout(() => {
            const teacherLinkText = document.getElementById('teacher-link-text');
            const studentLinkText = document.getElementById('student-link-text');
            const teacherLinkBox = document.getElementById('teacher-link-box');
            const studentLinkBox = document.getElementById('student-link-box');
            
            if (teacherLinkText) teacherLinkText.innerText = `${baseUrl}#t-${teacherSecret}`;
            if (studentLinkText) studentLinkText.innerText = `${baseUrl}#s-${Store.roomId}`;
            if (teacherLinkBox) teacherLinkBox.style.display = 'flex';
            if (studentLinkBox) studentLinkBox.style.display = 'flex';
        }, 500);
    } else {
        // Foydalanuvchi tizimga kirmagan, login sahifasiga yo'naltirish
        Utils.showToast("Iltimos, avval hisobingizga kiring!", "error");
        setTimeout(() => {
            window.location.href = 'board.html';
        }, 1500);
    }
    
} else if (hash.startsWith('s-')) {
    // O'quvchi linki (student)
    const studentCode = hash.slice(2);
    
    // Auth dan foydalanuvchi ma'lumotlarini olish
    const user = JSON.parse(localStorage.getItem('mr_user') || '{}');
    
    if (user && user.fullName) {
        // Foydalanuvchi tizimga kirgan
        Store.name = user.fullName;
        Store.isTeacher = false;
        Store.roomId = studentCode;
        Store.perms.draw = false;
        Store.perms.speak = false;
        ui.startApp(studentCode, null);
    } else {
        // Foydalanuvchi tizimga kirmagan, login sahifasiga yo'naltirish
        Utils.showToast("Iltimos, avval hisobingizga kiring!", "error");
        setTimeout(() => {
            window.location.href = 'board.html';
        }, 1500);
    }
}
