// ============================================
// CSS KURSI - UMUMIY JAVASCRIPT
// Barcha 63 ta dars uchun
// Learncode.uz
// Version: 7.0 - Yakuniy to'liq versiya
// ============================================

'use strict';

// ==================== 1-13 DARSLAR UCHUN TEST JAVOBLARI ====================
const answersMap = {
    '1':  { 'q1': 'b', 'q2': 'b', 'q3': 'c' },
    '2':  { 'q1': 'c', 'q2': 'b', 'q3': 'b' },
    '3':  { 'q1': 'c', 'q2': 'b', 'q3': 'c' },
    '4':  { 'q1': 'b', 'q2': 'd', 'q3': 'b' },
    '5':  { 'q1': 'b', 'q2': 'c', 'q3': 'b', 'q4': 'c', 'q5': 'd' },
    '6':  { 'q1': 'b', 'q2': 'c', 'q3': 'a', 'q4': 'b' },
    '7':  { 'q1': 'b', 'q2': 'c', 'q3': 'a', 'q4': 'b' },
    '8':  { 'q1': 'b', 'q2': 'd', 'q3': 'c', 'q4': 'a' },
    '9':  { 'q1': 'b', 'q2': 'c', 'q3': 'a', 'q4': 'b' },
    '10': { 'q1': 'b', 'q2': 'c', 'q3': 'b', 'q4': 'a', 'q5': 'c', 'q6': 'b', 'q7': 'd', 'q8': 'a', 'q9': 'c', 'q10': 'b' },
    '11': { 'q1': 'c', 'q2': 'b', 'q3': 'b', 'q4': 'a' },
    '12': { 'q1': 'c', 'q2': 'b', 'q3': 'd', 'q4': 'a' },
    '13': { 'q1': 'b', 'q2': 'c', 'q3': 'c', 'q4': 'a' }
};

// ==================== NAZORAT ISHI JAVOBLARI (5, 10, 15, 20, 25, 30... darslar) ====================
const nazoratAnswers = {
    '5': {
        'mix_q1': 'b', 'mix_q2': 'c', 'mix_q3': 'c', 'mix_q4': 'b', 'mix_q5': 'c'
    },
    '10': {
        'mix_q1': 'b', 'mix_q2': 'c', 'mix_q3': 'b', 'mix_q4': 'a', 'mix_q5': 'c',
        'mix_q6': 'b', 'mix_q7': 'd', 'mix_q8': 'a', 'mix_q9': 'c', 'mix_q10': 'b'
    },
    '15': {
        'mix_q1': 'b', 'mix_q2': 'c', 'mix_q3': 'c', 'mix_q4': 'b', 'mix_q5': 'c',
        'mix_q6': 'c', 'mix_q7': 'c', 'mix_q8': 'c', 'mix_q9': 'c', 'mix_q10': 'b',
        'mix_q11': 'b', 'mix_q12': 'c', 'mix_q13': 'c', 'mix_q14': 'd', 'mix_q15': 'c'
    },
    '20': {
        'mix_q1': 'b', 'mix_q2': 'c', 'mix_q3': 'c', 'mix_q4': 'b', 'mix_q5': 'c',
        'mix_q6': 'c', 'mix_q7': 'c', 'mix_q8': 'c', 'mix_q9': 'c', 'mix_q10': 'b',
        'mix_q11': 'b', 'mix_q12': 'c', 'mix_q13': 'd', 'mix_q14': 'c', 'mix_q15': 'c',
        'mix_q16': 'b', 'mix_q17': 'b', 'mix_q18': 'b', 'mix_q19': 'a', 'mix_q20': 'c'
    },
    '25': {
        'mix_q1': 'b', 'mix_q2': 'c', 'mix_q3': 'c', 'mix_q4': 'b', 'mix_q5': 'c',
        'mix_q6': 'c', 'mix_q7': 'c', 'mix_q8': 'c', 'mix_q9': 'c', 'mix_q10': 'b',
        'mix_q11': 'b', 'mix_q12': 'c', 'mix_q13': 'd', 'mix_q14': 'c', 'mix_q15': 'b',
        'mix_q16': 'c', 'mix_q17': 'b', 'mix_q18': 'b', 'mix_q19': 'b', 'mix_q20': 'c',
        'mix_q21': 'b', 'mix_q22': 'b', 'mix_q23': 'c', 'mix_q24': 'b', 'mix_q25': 'd'
    }
};

// ==================== SAHIFA YUKLANGANDA ====================
document.addEventListener('DOMContentLoaded', function() {
    initTest();
    initNazoratIshi();
    initPractice();
    initCodeShow();
    initLessonConfig();
    initActiveLinks();
    initSmoothScroll();
    initCopyCode();
    initBackToTop();
    initToast();
});

// ==================== ODDIY TEST FUNKSIYASI ====================
function initTest() {
    const checkBtn = document.getElementById('checkAnswers');
    if (!checkBtn) return;
    
    checkBtn.addEventListener('click', function() {
        const questions = document.querySelectorAll('#test .test-question');
        const resultDiv = document.getElementById('testResult');
        
        if (!resultDiv) return;
        if (questions.length === 0) return;
        
        const lessonId = window.LessonConfig?.lessonId || '1';
        let correctAnswers = {};
        
        if (answersMap[lessonId]) {
            correctAnswers = answersMap[lessonId];
        } else {
            const answerScript = document.getElementById('testAnswers');
            if (answerScript) {
                try {
                    correctAnswers = JSON.parse(answerScript.textContent);
                } catch (e) {
                    console.error('Test javoblarini o\'qishda xatolik:', e);
                }
            }
        }
        
        let answered = 0;
        let correct = 0;
        const total = questions.length;
        
        questions.forEach((question, index) => {
            const radioName = `q${index + 1}`;
            const selected = question.querySelector(`input[name="${radioName}"]:checked`);
            
            if (selected) {
                answered++;
                if (correctAnswers[radioName] && selected.value === correctAnswers[radioName]) {
                    correct++;
                }
            }
        });
        
        if (answered < total) {
            resultDiv.textContent = `Iltimos, barcha ${total} ta savolga javob bering! (${answered} ta javob berilgan)`;
            resultDiv.className = 'test-result show failed';
            return;
        }
        
        const percentage = Math.round((correct / total) * 100);
        
        if (correct === total) {
            resultDiv.textContent = `Ajoyib! ${correct}/${total} (${percentage}%) to'g'ri javob. Siz darsni yaxshi tushundingiz!`;
            resultDiv.className = 'test-result show passed';
        } else if (correct >= total / 2) {
            resultDiv.textContent = `Yaxshi! ${correct}/${total} (${percentage}%) to'g'ri javob. Ba'zi mavzularni takrorlashni tavsiya qilamiz.`;
            resultDiv.className = 'test-result show passed';
        } else {
            resultDiv.textContent = `Siz ${correct}/${total} (${percentage}%) to'g'ri javob berdingiz. Videoni qayta ko'rib chiqishni tavsiya qilamiz.`;
            resultDiv.className = 'test-result show failed';
        }
    });
}

// ==================== NAZORAT ISHI TESTLARI ====================
function initNazoratIshi() {
    const mixTestBtn = document.getElementById('checkMixTest');
    if (!mixTestBtn) return;
    
    mixTestBtn.addEventListener('click', function() {
        const questions = document.querySelectorAll('#mix-test .test-question');
        const resultDiv = document.getElementById('mixTestResult');
        
        if (!resultDiv) return;
        
        const lessonId = window.LessonConfig?.lessonId || '5';
        const total = questions.length;
        
        let correctAnswers = nazoratAnswers[lessonId] || {};
        
        let answered = 0;
        let correct = 0;
        
        for (let i = 1; i <= total; i++) {
            const selected = document.querySelector(`input[name="mix_q${i}"]:checked`);
            if (selected) {
                answered++;
                if (correctAnswers[`mix_q${i}`] && selected.value === correctAnswers[`mix_q${i}`]) {
                    correct++;
                }
            }
        }
        
        if (answered < total) {
            resultDiv.textContent = `Iltimos, barcha ${total} ta savolga javob bering! (${answered} ta javob berilgan)`;
            resultDiv.className = 'test-result show failed';
            return;
        }
        
        const percentage = Math.round((correct / total) * 100);
        
        if (percentage >= 85) {
            resultDiv.textContent = `Ajoyib! ${correct}/${total} (${percentage}%) to'g'ri javob. Siz mavzuni mukammal o'zlashtirgansiz!`;
            resultDiv.className = 'test-result show passed';
        } else if (percentage >= 60) {
            resultDiv.textContent = `Yaxshi! ${correct}/${total} (${percentage}%) to'g'ri javob. Ba'zi mavzularni takrorlashni tavsiya qilamiz.`;
            resultDiv.className = 'test-result show passed';
        } else {
            resultDiv.textContent = `Siz ${correct}/${total} (${percentage}%) to'g'ri javob berdingiz. O'tilgan darslarni qayta ko'rib chiqishni tavsiya qilamiz.`;
            resultDiv.className = 'test-result show failed';
        }
    });
}

// ==================== AMALIY MASHQ (Solution Panel) ====================
function initPractice() {
    document.querySelectorAll('.btn-solution').forEach(btn => {
        if (btn.hasAttribute('data-practice-listener')) return;
        btn.setAttribute('data-practice-listener', 'true');
        
        btn.addEventListener('click', function() {
            const practiceBlock = this.closest('.practice-block');
            if (!practiceBlock) return;
            
            const panel = practiceBlock.querySelector('.solution-panel');
            if (!panel) return;
            
            if (panel.classList.contains('show')) {
                panel.classList.remove('show');
                this.innerHTML = '<i class="fas fa-eye"></i> Yechimni ko\'rish';
            } else {
                panel.classList.add('show');
                this.innerHTML = '<i class="fas fa-eye-slash"></i> Yechimni yashirish';
            }
        });
    });
}

// ==================== CODE SHOW (Kodni ko'rsatish/yashirish) ====================
function initCodeShow() {
    document.querySelectorAll('.btn-code-show').forEach(btn => {
        if (btn.hasAttribute('data-code-listener')) return;
        btn.setAttribute('data-code-listener', 'true');
        
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;
            
            const targetPanel = document.getElementById(targetId);
            if (!targetPanel) return;
            
            if (targetPanel.classList.contains('show')) {
                targetPanel.classList.remove('show');
                this.innerHTML = '<i class="fas fa-code"></i> Kodni ko\'rish';
            } else {
                targetPanel.classList.add('show');
                this.innerHTML = '<i class="fas fa-code"></i> Kodni yashirish';
            }
        });
    });
    
    document.querySelectorAll('.code-show-panel').forEach(panel => {
        panel.classList.remove('show');
    });
}

// ==================== DARS KONFIGURATSIYASI ====================
function initLessonConfig() {
    const configScript = document.getElementById('lessonConfig');
    if (!configScript) {
        if (window.LessonConfig) {
            console.log('LessonConfig yuklandi:', window.LessonConfig);
        }
        return;
    }
    
    try {
        const config = JSON.parse(configScript.textContent);
        window.LessonConfig = config;
        console.log('LessonConfig yuklandi:', config);
    } catch (e) {
        console.error('Lesson config xatolik:', e);
    }
}

// ==================== ACTIVE SIDEBAR LINKS ====================
function initActiveLinks() {
    const sections = document.querySelectorAll(`
        section[id], 
        .test-block[id], 
        .practice-block[id], 
        .lesson-summary[id], 
        .comments-section[id]
    `);
    const navLinks = document.querySelectorAll('.sidebar-outline a');
    
    if (sections.length === 0 || navLinks.length === 0) return;
    
    function updateActiveLink() {
        let current = '';
        const scrollPosition = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.substring(1) === current) {
                link.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
}

// ==================== SMOOTH SCROLL ====================
function initSmoothScroll() {
    document.querySelectorAll('.sidebar-outline a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ==================== KOD NUSXALASH ====================
function initCopyCode() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        if (btn.hasAttribute('data-copy-listener')) return;
        btn.setAttribute('data-copy-listener', 'true');
        
        btn.addEventListener('click', function() {
            const codeBlock = this.closest('.code-block');
            if (!codeBlock) return;
            
            const code = codeBlock.querySelector('code')?.textContent || 
                        codeBlock.querySelector('pre')?.textContent || '';
            
            navigator.clipboard?.writeText(code).then(() => {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-check"></i> Nusxalandi!';
                setTimeout(() => {
                    this.innerHTML = originalText;
                }, 2000);
            }).catch(() => {
                showToast('Kodni nusxalashda xatolik yuz berdi', 'error');
            });
        });
    });
}

// ==================== BACK TO TOP ====================
function initBackToTop() {
    if (document.querySelector('.back-to-top')) return;
    
    const backBtn = document.createElement('button');
    backBtn.className = 'back-to-top';
    backBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backBtn.setAttribute('aria-label', 'Yuqoriga qaytish');
    document.body.appendChild(backBtn);
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backBtn.classList.add('show');
        } else {
            backBtn.classList.remove('show');
        }
    });
    
    backBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==================== TOAST NOTIFICATION ====================
function initToast() {
    if (document.getElementById('toastNotification')) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.id = 'toastNotification';
    toast.innerHTML = '<i class="fas fa-check-circle"></i><span id="toastMessage">Nusxalandi!</span>';
    document.body.appendChild(toast);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMsg = document.getElementById('toastMessage');
    if (!toast || !toastMsg) return;
    
    toastMsg.textContent = message;
    toast.className = `toast-notification ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==================== CSS QO'SHISH ====================
const style = document.createElement('style');
style.textContent = `
    .back-to-top {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 44px;
        height: 44px;
        background: var(--primary-gradient, linear-gradient(135deg, #3b82f6, #2563eb));
        color: white;
        border: none;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px);
        transition: all 0.25s ease;
        box-shadow: 0 4px 14px rgba(59, 130, 246, 0.1);
        z-index: 99;
    }
    
    .back-to-top.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    
    .back-to-top:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
    }
    
    .code-show-panel {
        display: none;
        margin-top: 16px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    
    .code-show-panel.show {
        display: block;
    }
    
    .btn-code-show {
        padding: 8px 16px;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #334155;
        font-weight: 500;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        margin-top: 8px;
    }
    
    .btn-code-show:hover {
        background: #eff6ff;
        border-color: #3b82f6;
        color: #3b82f6;
    }
    
    .toast-notification {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #1e293b;
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    
    .toast-notification.show {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(0);
    }
    
    .toast-notification i {
        font-size: 1.1rem;
    }
    
    .toast-notification.success i {
        color: #10b981;
    }
    
    .toast-notification.error i {
        color: #ef4444;
    }
    
    .toast-notification.warning i {
        color: #f59e0b;
    }
    
    .pros-cons-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin: 24px 0;
    }
    
    .pros-box, .cons-box {
        padding: 24px;
        border-radius: 12px;
    }
    
    .pros-box {
        background: #d1fae5;
        border-left: 4px solid #10b981;
    }
    
    .cons-box {
        background: #fee2e2;
        border-left: 4px solid #ef4444;
    }
    
    .pros-box h4, .cons-box h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
    }
    
    .pros-box h4 i { color: #10b981; }
    .cons-box h4 i { color: #ef4444; }
    
    .pros-box ul, .cons-box ul {
        margin: 0;
        padding-left: 24px;
    }
    
    .tips-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin: 24px 0;
    }
    
    .tip-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: rgba(255,255,255,0.6);
        border-radius: 8px;
        border: 1px solid rgba(59,130,246,0.1);
    }
    
    .tip-icon {
        width: 32px;
        height: 32px;
        background: #3b82f6;
        color: white;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        flex-shrink: 0;
    }
    
    .tip-content {
        flex: 1;
    }
    
    .tip-content strong {
        display: block;
        margin-bottom: 4px;
    }
    
    .tip-content p {
        margin: 0;
        font-size: 0.9rem;
        color: #64748b;
    }
    
    @media (max-width: 768px) {
        .pros-cons-grid { grid-template-columns: 1fr; }
        .back-to-top { bottom: 16px; right: 16px; width: 40px; height: 40px; }
        .toast-notification { width: 90%; text-align: center; }
    }
`;
document.head.appendChild(style);

// ==================== KONSOL MA'LUMOTI ====================
console.log('%c🎨 CSS Kurs | Learncode.uz', 'color: #3b82f6; font-weight: bold; font-size: 14px;');
console.log('%c📚 Barcha darslar uchun umumiy script yuklandi (v7.0)', 'color: #64748b; font-size: 12px');

