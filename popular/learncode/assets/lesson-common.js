// ============================================
// LESSON COMMON - Barcha darslar uchun umumiy
// Learncode.uz
// ============================================

import { rtdb } from './firebase-config.js';
import { ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

window.LessonConfig = window.LessonConfig || { course: 'css', lessonId: '1', totalLessons: 63, youtubeWatchUrl: '#', lessonTitle: 'Dars' };

// YAGONA STORAGE KALITI
const STORAGE_KEY = 'learncode_progress';

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initResources();
    initProgress();
    initComments();
    initNavigation();
    initActiveLinks();
    setupToast();
    checkPreviousLessons();
});

function checkPreviousLessons() {
    const progress = getProgress();
    const course = LessonConfig.course;
    const currentLesson = parseInt(LessonConfig.lessonId);
    if (currentLesson === 1) return;
    const prevLesson = (currentLesson - 1).toString();
    const isPrevCompleted = progress[course]?.includes(prevLesson);
    if (!isPrevCompleted) {
        const completeBtn = document.getElementById('completeLesson');
        if (completeBtn) {
            completeBtn.disabled = true;
            completeBtn.style.opacity = '0.5';
            completeBtn.style.cursor = 'not-allowed';
            completeBtn.title = `Avval ${currentLesson - 1}-darsni yakunlang`;
        }
    }
}

function initSidebar() {
    const progressFraction = document.getElementById('progressFraction');
    if (progressFraction) progressFraction.textContent = `${LessonConfig.lessonId}/${LessonConfig.totalLessons}`;
}

function initResources() {
    const copyLinkBtn = document.getElementById('copyLessonLink');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const lessonUrl = `${window.location.origin}/${LessonConfig.course}/${LessonConfig.lessonId}/`;
            copyToClipboard(lessonUrl);
            showToast(' Dars linki nusxalandi!', 'success');
        });
    }
    const youtubeBtn = document.getElementById('youtubeWatchBtn');
    if (youtubeBtn) {
        youtubeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(LessonConfig.youtubeWatchUrl, '_blank');
        });
    }
}

function copyToClipboard(text) { navigator.clipboard?.writeText(text) || alert('Link: ' + text); }

function initProgress() {
    updateProgressDisplay();
    const completeBtn = document.getElementById('completeLesson');
    if (completeBtn) {
        completeBtn.addEventListener('click', function() {
            if (this.disabled) {
                showToast(`⚠️ Avval ${parseInt(LessonConfig.lessonId) - 1}-darsni yakunlang!`, 'warning');
                return;
            }
            markLessonComplete();
            this.classList.add('completed');
            this.innerHTML = '<i class="fas fa-check-circle"></i><span>Yakunlangan</span>';
            this.disabled = true;
            updateProgressDisplay();
            showToast('✅ Dars yakunlandi!', 'success');
            if (parseInt(LessonConfig.lessonId) % 5 === 0) {
                showToast(`🎯 ${LessonConfig.lessonId}-dars! Nazorat ishi testni topshirishni unutmang!`, 'info');
            }
            window.dispatchEvent(new Event('storage'));
        });
    }
}

function getProgress() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { html: [], css: [], js: [], bootstrap: [] };
}

function saveProgress(progress) { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }

function markLessonComplete() {
    const progress = getProgress();
    const course = LessonConfig.course;
    const lessonId = LessonConfig.lessonId;
    if (!progress[course]) progress[course] = [];
    if (!progress[course].includes(lessonId)) {
        progress[course].push(lessonId);
        progress[course].sort((a, b) => parseInt(a) - parseInt(b));
        saveProgress(progress);
    }
}

function isLessonCompleted() {
    const progress = getProgress();
    return progress[LessonConfig.course]?.includes(LessonConfig.lessonId) || false;
}

function updateProgressDisplay() {
    const progress = getProgress();
    const completed = progress[LessonConfig.course]?.length || 0;
    const total = LessonConfig.totalLessons;
    const percentage = (completed / total) * 100;
    const progressFill = document.getElementById('sidebarProgressFill');
    const progressFraction = document.getElementById('progressFraction');
    if (progressFill) progressFill.style.width = percentage + '%';
    if (progressFraction) progressFraction.textContent = `${completed}/${total}`;
    if (isLessonCompleted()) {
        const completeBtn = document.getElementById('completeLesson');
        if (completeBtn) {
            completeBtn.classList.add('completed');
            completeBtn.innerHTML = '<i class="fas fa-check-circle"></i><span>Yakunlangan</span>';
            completeBtn.disabled = true;
        }
    }
}

function initComments() { loadComments(); setupCommentForm(); }

async function addComment(name, text) {
    try {
        const lessonKey = `${LessonConfig.course}-${LessonConfig.lessonId}`;
        await push(ref(rtdb, `comments/${lessonKey}`), { name: name || 'O\'quvchi', text, timestamp: Date.now() });
        return true;
    } catch (e) { console.error(e); return false; }
}

function loadComments() {
    const commentsList = document.getElementById('commentsList');
    const commentsCount = document.getElementById('commentsCount');
    
    console.log('🔍 loadComments ishga tushdi');
    console.log('commentsList elementi:', commentsList);
    
    if (!commentsList) {
        console.error(' commentsList topilmadi!');
        return;
    }
    
    const lessonKey = `${LessonConfig.course}-${LessonConfig.lessonId}`;
    console.log('📌 Dars kaliti:', lessonKey);
    
    const commentsRef = ref(rtdb, `comments/${lessonKey}`);
    
    onValue(commentsRef, (snapshot) => {
        console.log(' Firebase dan ma\'lumot keldi');
        console.log('Snapshot mavjudmi?', snapshot.exists());
        
        if (!snapshot.exists()) {
            console.log('ℹ️ Izohlar yo\'q');
            commentsList.innerHTML = `<div class="comments-empty"><i class="fas fa-comment-dots"></i><p>Hozircha izohlar yo'q.</p></div>`;
            if (commentsCount) commentsCount.textContent = '0 ta izoh';
            return;
        }
        
        const comments = [];
        snapshot.forEach(c => {
            console.log(' Izoh:', c.val());
            comments.push({ id: c.key, ...c.val() });
        });
        comments.reverse();
        
        console.log(` ${comments.length} ta izoh yuklandi`);
        
        if (commentsCount) commentsCount.textContent = `${comments.length} ta izoh`;
        
        // Avvalgi kontentni tozalash
        commentsList.innerHTML = '';
        
        comments.forEach(c => {
            console.log(' Izoh qo\'shilmoqda:', c.name, '-', c.text.substring(0, 20));
            const d = document.createElement('div');
            d.className = 'comment-item';
            d.innerHTML = `
                <div class="comment-avatar"><i class="fas fa-user-circle"></i></div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(c.name)}</span>
                        <span class="comment-time">${getTimeAgo(c.timestamp)}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(c.text)}</p>
                </div>
            `;
            commentsList.appendChild(d);
        });
        
        console.log('✅ Izohlar DOM ga qo\'shildi. Elementlar soni:', commentsList.children.length);
    }, (error) => {
        console.error(' Firebase xatolik:', error);
    });
}
function setupCommentForm() {
    const submitBtn = document.getElementById('submitComment'), nameInput = document.getElementById('commentName'), textInput = document.getElementById('commentText'), charCount = document.getElementById('charCount');
    if (!submitBtn) return;
    
    textInput?.addEventListener('input', function() { if (charCount) charCount.textContent = this.value.length; });
    
    // ENTER TUGMASI BILAN YUBORISH (Ctrl+Enter)
    textInput?.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            submitBtn.click();
        }
    });
    
    submitBtn.addEventListener('click', async function() {
        const name = nameInput?.value.trim() || '', text = textInput?.value.trim() || '';
        if (!text) { showToast('Iltimos, fikringizni yozing!', 'warning'); return; }
        if (text.length < 3) { showToast('Izoh juda qisqa!', 'warning'); return; }
        submitBtn.disabled = true; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuborilmoqda...';
        if (await addComment(name || 'O\'quvchi', text)) {
            textInput.value = ''; if (charCount) charCount.textContent = '0';
            showToast(' Izohingiz qo\'shildi!', 'success');
            if (name) localStorage.setItem('commentName', name);
        } else showToast('Xatolik yuz berdi.', 'error');
        submitBtn.disabled = false; submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Yuborish';
    });
    const savedName = localStorage.getItem('commentName'); if (savedName && nameInput) nameInput.value = savedName;
}

function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
function getTimeAgo(ts) { const m = Math.floor((Date.now() - ts) / 60000); if (m < 1) return 'Hozir'; if (m < 60) return `${m} daqiqa oldin`; const h = Math.floor(m / 60); if (h < 24) return `${h} soat oldin`; return `${Math.floor(h / 24)} kun oldin`; }

function initNavigation() {
    const cur = parseInt(LessonConfig.lessonId);
    const prev = document.getElementById('prevLessonBtn'), next = document.getElementById('nextLessonBtn');
    if (prev) { if (cur > 1) prev.href = `../${cur - 1}/`; else { prev.style.opacity = '0.5'; prev.style.pointerEvents = 'none'; } }
    if (next) { if (cur < LessonConfig.totalLessons) next.href = `../${cur + 1}/`; else { next.style.opacity = '0.5'; next.style.pointerEvents = 'none'; } }
}

function initActiveLinks() {
    const sections = document.querySelectorAll('section[id], .test-block[id], .practice-block[id], .lesson-summary[id], .comments-section[id]');
    const navLinks = document.querySelectorAll('.sidebar-outline a');
    if (!sections.length || !navLinks.length) return;
    function update() {
        let cur = ''; const pos = window.scrollY + 100;
        sections.forEach(s => { if (pos >= s.offsetTop && pos < s.offsetTop + s.offsetHeight) cur = s.id; });
        navLinks.forEach(l => { l.classList.remove('active'); if (l.getAttribute('href') === `#${cur}`) l.classList.add('active'); });
    }
    window.addEventListener('scroll', update); update();
}

let toastTimeout;
function setupToast() {}
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastNotification'), toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMsg.textContent = msg; toast.className = `toast-notification ${type}`; toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

window.LearncodeUz = { getProgress, saveProgress, markLessonComplete, isLessonCompleted, showToast };
console.log('✅ Lesson Common yuklandi - Learncode.uz');
