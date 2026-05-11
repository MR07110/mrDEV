// ==================== MRDEV TODO ====================
import { initAuth, smartSave, smartLoad, smartDelete, clearAll, getCurrentUser, getUserId } from '../../assets/firebase-helper.js';

let currentUser = null;
let tasks = [];
let currentFilter = 'all';

// DOM
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskTitle = document.getElementById('taskTitle');
const toast = document.getElementById('toast');

// ==================== THEME ====================
const saved = localStorage.getItem('mrdev_theme') || 'dark';
if (saved === 'dark') document.documentElement.classList.add('dark');
document.getElementById('themeToggle').addEventListener('click', () => {
    const d = document.documentElement.classList.toggle('dark');
    localStorage.setItem('mrdev_theme', d ? 'dark' : 'light');
});

// ==================== AUTH ====================
initAuth((user) => {
    currentUser = user;
    const triggerName = document.getElementById('triggerName');
    const triggerAvatar = document.getElementById('triggerAvatar');
    
    if (user) {
        triggerName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
        if (user.photoURL) {
            triggerAvatar.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            triggerAvatar.textContent = (user.displayName || 'U')[0].toUpperCase();
        }
    } else {
        triggerName.textContent = 'Mehmon';
        triggerAvatar.textContent = '?';
    }
    
    // Dropdown init
    import('../../assets/dropdown.js').then(m => m.initDropdown(user, window.location.pathname));
    
    // Load tasks
    loadTasks();
});

// ==================== ADD TASK ====================
document.getElementById('addTaskBtn').addEventListener('click', addTask);
taskTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});

async function addTask() {
    const title = taskTitle.value.trim();
    if (!title) return;

    const priority = document.getElementById('taskPriority').value;
    const taskData = {
        title,
        priority,
        completed: false,
        createdAt: new Date().toISOString()
    };

    await smartSave('todos', 'mr_todo_tasks', taskData);
    taskTitle.value = '';
    showToast('Vazifa qo\'shildi', 'success');
}

// ==================== LOAD TASKS ====================
function loadTasks() {
    smartLoad('todos', 'mr_todo_tasks', (items) => {
        tasks = items;
        renderTasks();
        updateSummary();
    });
}

// ==================== RENDER ====================
function renderTasks() {
    let filtered = tasks;
    if (currentFilter === 'active') filtered = tasks.filter(t => !t.completed);
    else if (currentFilter === 'completed') filtered = tasks.filter(t => t.completed);

    if (!filtered.length) {
        taskList.innerHTML = '';
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');
    taskList.innerHTML = filtered.map(task => `
        <div class="tawindow.__ENV__?.OPENAI_API_KEY || "" ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="check-circle ${task.completed ? 'checked' : ''}" data-toggle="${task.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="tawindow.__ENV__?.OPENAI_API_KEY || """>
                <div class="tawindow.__ENV__?.OPENAI_API_KEY || """>${escapeHtml(task.title)}</div>
                <div class="tawindow.__ENV__?.OPENAI_API_KEY || """>${formatDate(task.createdAt || task.date)} · ${task.priority}</div>
            </div>
            <div class="priority-badge ${task.priority}"></div>
            <button class="delete-btn" data-delete="${task.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
    `).join('');

    // Events
    document.querySelectorAll('[data-toggle]').forEach(circle => {
        circle.addEventListener('click', () => toggleTask(circle.dataset.toggle));
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(btn.dataset.delete);
        });
    });
}

// ==================== TOGGLE ====================
async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    
    // Local update
    const local = JSON.parse(localStorage.getItem('mr_todo_tasks') || '[]');
    const idx = local.findIndex(t => t.id === id);
    if (idx > -1) {
        local[idx].completed = task.completed;
        localStorage.setItem('mr_todo_tasks', JSON.stringify(local));
    }

    // Cloud update
    const uid = getUserId();
    if (uid && task.isCloud) {
        try {
            const { getFirestore } = await import('../../assets/firebase-helper.js');
            // updateCloudDoc orqali
        } catch {}
    }

    renderTasks();
    updateSummary();
}

// ==================== DELETE ====================
async function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    await smartDelete('todos', 'mr_todo_tasks', id, task?.isCloud);
    showToast('O\'chirildi');
}

// ==================== FILTER ====================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

// ==================== SUMMARY ====================
function updateSummary() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    
    const percent = total ? Math.round((completed / total) * 100) : 0;
    document.getElementById('progressFill').style.width = percent + '%';
}

// ==================== UTILS ====================
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Bugun';
    if (diff === 1) return 'Kecha';
    if (diff < 7) return diff + ' kun oldin';
    return d.toLocaleDateString('uz-UZ');
}

function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== INIT ====================
console.log('MRDEV Todo loaded');
