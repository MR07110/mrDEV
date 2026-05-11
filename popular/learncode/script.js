/* ============================================
   LEARNCODE.UZ - JAVASCRIPT
   Progress saqlash tizimi
   ============================================ */

'use strict';

// Progress saqlash uchun localStorage kaliti
const STORAGE_KEY = 'learncode_uz_progress';

// Progress ma'lumotlarini olish
function getProgress() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
        html: { completed: [] },
        css: { completed: [] },
        js: { completed: [] },
        bootstrap: { completed: [] }
    };
}

// Progress ma'lumotlarini saqlash
function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Darsni yakunlangan deb belgilash
function markLessonComplete(course, lessonId) {
    const progress = getProgress();
    if (!progress[course].completed.includes(lessonId)) {
        progress[course].completed.push(lessonId);
        saveProgress(progress);
        return true;
    }
    return false;
}

// Dars yakunlanganligini tekshirish
function isLessonComplete(course, lessonId) {
    const progress = getProgress();
    return progress[course].completed.includes(lessonId);
}

// Kurs progress foizini hisoblash
function getCourseProgress(course, totalLessons) {
    const progress = getProgress();
    const completed = progress[course].completed.length;
    return Math.round((completed / totalLessons) * 100);
}

// Kurs bo'yicha yakunlangan darslar sonini olish
function getCompletedCount(course) {
    const progress = getProgress();
    return progress[course].completed.length;
}

// Barcha progressni tozalash (reset)
function resetAllProgress() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Barcha progress tozalandi');
}

// Progress statistikasini olish
function getOverallStats() {
    const progress = getProgress();
    return {
        html: progress.html.completed.length,
        css: progress.css.completed.length,
        js: progress.js.completed.length,
        bootstrap: progress.bootstrap.completed.length,
        total: progress.html.completed.length + 
               progress.css.completed.length + 
               progress.js.completed.length + 
               progress.bootstrap.completed.length
    };
}

// Global scope ga qo'shish
window.LearncodeUz = {
    getProgress,
    saveProgress,
    markLessonComplete,
    isLessonComplete,
    getCourseProgress,
    getCompletedCount,
    resetAllProgress,
    getOverallStats
};

// Konsolga xush kelibsiz xabari
console.log('%c Learncode.uz yuklandi!', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
console.log('%c Dasturlashni o\'rganish uchun eng yaxshi platforma', 'color: #64748b; font-size: 12px;');
const correctAnswers = {
    'q1': 'b',  // . (nuqta)
    'q2': 'd',  // Universal (*)
    'q3': 'b'   // Class selektor
};
