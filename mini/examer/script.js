// ==================== MRDEV EXAMER v2.0 — Firebase + Local Sync ====================
import { initAuth, getCurrentUser, getUserId } from '../../assets/js/firebase-helper.js';
import { initMiniDropdown } from '../../assets/js/dropdown.js';
import { getFirebase } from '../../assets/js/firebase-helper.js';

var _db = null;
function getDB() {
    if (!_db) { var fb = getFirebase(); _db = fb.db; }
    return _db;
}

import { collection, addDoc, query, orderBy, getDocs, deleteDoc, doc, serverTimestamp, where, limit, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== DOM ====================
var $ = function(id) { return document.getElementById(id); };
var toast = $('toast');
var teacherView = $('teacherView');
var examView = $('examView');
var resultView = $('resultView');

// ==================== STATE ====================
var currentUser = null;
var questions = [];
var userAnswers = [];
var currentExamId = null;
var currentExamName = '';
var examIndex = 0;
var activeTab = 'my';

// ==================== THEME ====================
function initTheme() {
    var saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcon();
    $('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    var isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    var btn = $('themeToggle');
    if (!btn) return;
    var isDark = document.documentElement.classList.contains('dark');
    btn.innerHTML = isDark
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

// ==================== TOAST ====================
function showToast(msg, type) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// ==================== GENERATE EXAM ID ====================
function generateExamId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var id = '#';
    for (var i = 0; i < 4; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

// ==================== ADD QUESTION ====================
$('addQuestionBtn').addEventListener('click', function() {
    var qText = $('qText').value.trim();
    var a = $('optA').value.trim();
    var b = $('optB').value.trim();
    var c = $('optC').value.trim();
    var d = $('optD').value.trim();
    var correct = parseInt($('correctAnswer').value);

    if (!qText || !a || !b || !c || !d) {
        showToast('Barcha maydonlarni to\'ldiring', 'error');
        return;
    }

    questions.push({ q: qText, o: [a, b, c, d], a: correct });

    $('qText').value = '';
    $('optA').value = '';
    $('optB').value = '';
    $('optC').value = '';
    $('optD').value = '';
    $('correctAnswer').value = '0';

    renderSavedQuestions();
    $('saveExamBtn').disabled = false;
});

function renderSavedQuestions() {
    var container = $('savedQuestions');
    $('questionCount').textContent = questions.length + ' savol';

    if (!questions.length) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-3);">Hali savol qo\'shilmagan</div>';
        return;
    }

    container.innerHTML = questions.map(function(q, i) {
        return '<div class="saved-q">' +
            '<div class="saved-q-text">' + (i + 1) + '. ' + q.q + '</div>' +
            '<div class="saved-q-answer">' + String.fromCharCode(65 + q.a) + '</div>' +
            '<button class="action-btn danger" data-idx="' + i + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/></svg></button></div>';
    }).join('');

    container.querySelectorAll('.action-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            questions.splice(parseInt(btn.dataset.idx), 1);
            renderSavedQuestions();
            if (!questions.length) $('saveExamBtn').disabled = true;
        });
    });
}

// ==================== SAVE EXAM ====================
$('saveExamBtn').addEventListener('click', async function() {
    var name = $('examName').value.trim();
    if (!name) { showToast('Exam nomini kiriting', 'error'); return; }
    if (!questions.length) { showToast('Kamida 1 ta savol qo\'shing', 'error'); return; }
    if (!currentUser) { showToast('Hisobga kiring', 'error'); return; }

    var btn = $('saveExamBtn');
    btn.disabled = true;
    btn.textContent = 'Saqlanmoqda...';

    try {
        var examId = generateExamId();
        var db = getDB();
        var docRef = await addDoc(collection(db, 'users', currentUser.uid, 'exams'), {
            name: name,
            examId: examId,
            questions: questions,
            questionCount: questions.length,
            userId: currentUser.uid,
            userEmail: currentUser.email || '',
            createdAt: serverTimestamp()
        });

        showToast('Exam saqlandi! ID: ' + examId, 'success');
        startExam(name, questions, docRef.id);

        questions = [];
        $('examName').value = '';
        renderSavedQuestions();
        btn.textContent = 'Examni saqlash';
        btn.disabled = true;
        loadExams();

    } catch(e) {
        console.error('Save error:', e);
        showToast('Xatolik', 'error');
        btn.textContent = 'Examni saqlash';
        btn.disabled = false;
    }
});

// ==================== LOAD EXAMS ====================
async function loadExams() {
    var container = $('examList');
    if (!currentUser) return;

    try {
        var db = getDB();
        var q = query(collection(db, 'users', currentUser.uid, 'exams'), orderBy('createdAt', 'desc'), limit(30));
        var snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">Exam\'lar topilmadi</div>';
            return;
        }

        container.innerHTML = snap.docs.map(function(d) {
            var data = d.data();
            var date = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().toLocaleString('uz-UZ') : 'Yangi';
            return '<div class="exam-item">' +
                '<div class="exam-info" data-id="' + d.id + '">' +
                    '<div class="exam-name">' + data.name + '</div>' +
                    '<div class="exam-meta">' + data.questionCount + ' savol | ' + date + '</div>' +
                    '<div class="exam-id">' + (data.examId || '#' + d.id.slice(0, 4)) + '</div>' +
                '</div>' +
                '<div class="exam-actions">' +
                    '<button class="action-btn danger delete-exam" data-id="' + d.id + '" title="O\'chirish">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/></svg>' +
                    '</button>' +
                '</div></div>';
        }).join('');

        container.querySelectorAll('.exam-info').forEach(function(info) {
            info.addEventListener('click', async function() {
                var docSnap = await getDoc(doc(db, 'users', currentUser.uid, 'exams', info.dataset.id));
                if (docSnap.exists()) {
                    var data = docSnap.data();
                    startExam(data.name, data.questions, info.dataset.id);
                }
            });
        });

        container.querySelectorAll('.delete-exam').forEach(function(btn) {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                if (!confirm('Exam\'ni o\'chirish?')) return;
                await deleteDoc(doc(db, 'users', currentUser.uid, 'exams', btn.dataset.id));
                showToast('O\'chirildi');
                loadExams();
            });
        });

    } catch(e) {
        console.error('Load error:', e);
        container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--red);">Yuklashda xatolik</div>';
    }
}

// ==================== SEARCH ====================
$('searchBtn').addEventListener('click', async function() {
    var searchId = $('searchExamId').value.trim();
    if (!searchId) { showToast('ID kiriting', 'error'); return; }
    if (!currentUser) { showToast('Hisobga kiring', 'error'); return; }

    try {
        var db = getDB();
        var q = query(collection(db, 'users', currentUser.uid, 'exams'), where('examId', '==', searchId));
        var snap = await getDocs(q);

        if (snap.empty) {
            showToast('Exam topilmadi: ' + searchId, 'error');
            return;
        }

        var data = snap.docs[0].data();
        showToast('Exam topildi!', 'success');
        startExam(data.name, data.questions, snap.docs[0].id);

    } catch(e) {
        console.error('Search error:', e);
        showToast('Qidirishda xatolik', 'error');
    }
});

// ==================== TABS ====================
document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        loadExams();
    });
});

// ==================== START EXAM ====================
function startExam(name, examQuestions, docId) {
    questions = examQuestions;
    currentExamName = name;
    currentExamId = docId;
    examIndex = 0;
    userAnswers = [];

    teacherView.style.display = 'none';
    examView.style.display = 'block';
    resultView.style.display = 'none';

    $('examTitle').textContent = name;
    loadQuestion();
}

function loadQuestion() {
    var q = questions[examIndex];
    $('qCounter').textContent = 'Savol ' + (examIndex + 1) + ' / ' + questions.length;
    $('questionText').textContent = q.q;
    $('progressFill').style.width = (examIndex / questions.length * 100) + '%';

    var optionsList = $('optionsList');
    optionsList.innerHTML = q.o.map(function(text, i) {
        return '<button class="option-btn" data-idx="' + i + '"><strong>' + String.fromCharCode(65 + i) + '.</strong> ' + text + '</button>';
    }).join('');

    optionsList.querySelectorAll('.option-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { answerQuestion(parseInt(btn.dataset.idx)); });
    });
}

function answerQuestion(selectedIdx) {
    userAnswers.push(selectedIdx);
    examIndex++;

    if (examIndex >= questions.length) {
        showResults();
    } else {
        loadQuestion();
    }
}

// ==================== RESULTS ====================
function showResults() {
    examView.style.display = 'none';
    resultView.style.display = 'block';

    var correctCount = 0;
    var reviewHTML = questions.map(function(q, i) {
        var isCorrect = userAnswers[i] === q.a;
        if (isCorrect) correctCount++;
        return '<div class="review-item ' + (isCorrect ? 'correct' : 'wrong') + '">' +
            '<p><strong>' + (i + 1) + '-savol:</strong> ' + q.q + '</p>' +
            '<p>A. ' + q.o[0] + '</p><p>B. ' + q.o[1] + '</p><p>C. ' + q.o[2] + '</p><p>D. ' + q.o[3] + '</p>' +
            '<p style="margin-top:8px;">Siz: <strong>' + String.fromCharCode(65 + userAnswers[i]) + '</strong> | To\'g\'ri: <strong>' + String.fromCharCode(65 + q.a) + '</strong> ' + (isCorrect ? '[OK]' : '[X]') + '</p></div>';
    }).join('');

    var percent = Math.round(correctCount / questions.length * 100);
    $('resultCard').innerHTML = '<div class="result-summary">' +
        '<div class="result-score">' + correctCount + '/' + questions.length + '</div>' +
        '<div class="result-percent">' + percent + '% to\'g\'ri</div></div>' + reviewHTML;
}

// ==================== NAVIGATION ====================
$('exitExamBtn').addEventListener('click', function() {
    if (confirm('Examni tark etmoqchimisiz?')) {
        teacherView.style.display = 'block';
        examView.style.display = 'none';
        resultView.style.display = 'none';
    }
});

$('backToTeacherBtn').addEventListener('click', function() {
    teacherView.style.display = 'block';
    resultView.style.display = 'none';
    loadExams();
});

// ==================== AUTH UI ====================
function updateUserUI(user) {
    var triggerName = document.querySelector('#mrdevUserTriggerMini .trigger-name');
    var triggerAvatar = document.querySelector('#mrdevUserTriggerMini .trigger-avatar');
    if (user) {
        var dn = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        if (triggerName) triggerName.textContent = dn;
        if (triggerAvatar) {
            if (user.photoURL) {
                triggerAvatar.innerHTML = '<img src="' + user.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            } else {
                triggerAvatar.textContent = dn.charAt(0).toUpperCase();
            }
        }
    } else {
        if (triggerName) triggerName.textContent = 'Mehmon';
        if (triggerAvatar) triggerAvatar.textContent = '?';
    }
}

// ==================== INIT ====================
function init() {
    console.log('MRDEV Examer v2.0 ishga tushmoqda...');
    initTheme();
    renderSavedQuestions();

    initAuth(function(user) {
        currentUser = user;
        updateUserUI(user);
        if (user) {
            loadExams();
        } else {
            $('examList').innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-3);">Exam yaratish uchun hisobga kiring</div>';
        }
        try {
            initMiniDropdown(user);
        } catch(e) {
            console.warn('Dropdown init failed:', e.message);
        }
    });

    console.log('Examer tayyor!');
}

document.addEventListener('DOMContentLoaded', init);
