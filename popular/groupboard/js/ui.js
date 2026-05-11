import { Store } from './store.js';
import { Events } from './events.js';
import { DB } from './firebase.js';
import { GraphicsEngine } from './graphics.js';
import { AudioSystem } from './audio.js';
import { setTool } from './tools.js';
import { toggleMinimap } from './minimap.js';
import { initColorWheel } from './color-wheel.js';
import { initSettings } from './settings.js';
import { initShapes } from './shapes.js';
import { initShortcuts } from './shortcuts.js';
import { createRoom, joinRoom } from './auth.js';
import { updateUsersList } from './users.js';
import { sendChatMessage } from './chat.js';
import { Utils, showToast } from './utils.js';

function shakeButton(button) {
    if (!button) return;
    button.classList.add('error-shake');
    setTimeout(function() {
        button.classList.remove('error-shake');
    }, 300);
}

export var UIController = function() {
    this.engine = null;
    this.initEvents();
    initShortcuts(this);
};

UIController.prototype.initEvents = function() {
    var self = this;
    
    var createRoomBtn = document.getElementById('btn-create-room');
    if (createRoomBtn) createRoomBtn.onclick = function() { createRoom(self); };
    
    var joinRoomBtn = document.getElementById('btn-join-room');
    if (joinRoomBtn) joinRoomBtn.onclick = function() { joinRoom(self); };
    
    var exitBtn = document.getElementById('btn-action-exit');
    if (exitBtn) exitBtn.onclick = function() { if (confirm("Chiqish?")) location.reload(); };
    
    var undoBtn = document.getElementById('btn-action-undo');
    if (undoBtn) undoBtn.onclick = function() { DB.undo(); };
    
    var micBtn = document.getElementById('btn-action-mic');
    if (micBtn) micBtn.onclick = function() { AudioSystem.toggle(); };
    
    var fullscreenBtn = document.getElementById('btn-action-fullscreen');
    if (fullscreenBtn) fullscreenBtn.onclick = function() { self.toggleFullscreen(); };
    
    var exitZenBtn = document.getElementById('btn-exit-zen');
    if (exitZenBtn) exitZenBtn.onclick = function() { self.toggleFullscreen(); };
    
    var settingsBtn = document.getElementById('btn-open-settings');
    if (settingsBtn) settingsBtn.onclick = function() { self.openDrawer('drawer-settings'); };
    
    var colorsBtn = document.getElementById('btn-open-colors');
    if (colorsBtn) colorsBtn.onclick = function() { self.openDrawer('drawer-colors'); };
    
    var chatBtn = document.getElementById('btn-open-chat');
    if (chatBtn) chatBtn.onclick = function() { self.openDrawer('drawer-chat'); };
    
    var usersBtn = document.getElementById('btn-open-users');
    if (usersBtn) usersBtn.onclick = function() { self.openDrawer('drawer-users'); };
    
    var shapesBtn = document.getElementById('btn-toggle-shapes');
    if (shapesBtn) shapesBtn.onclick = function() { self.openDrawer('drawer-shapes'); };
    
    var submitChatBtn = document.getElementById('btn-submit-chat');
    if (submitChatBtn) submitChatBtn.onclick = function() { sendChatMessage(); };
    
    var chatInput = document.getElementById('inp-chat-text');
    if (chatInput) chatInput.onkeypress = function(e) { if (e.key === 'Enter') sendChatMessage(); };
    
    var cancelTextBtn = document.getElementById('btn-cancel-text');
    if (cancelTextBtn) cancelTextBtn.onclick = function() { self.closeTextModal(); };
    
    var addTextBtn = document.getElementById('btn-add-text');
    if (addTextBtn) addTextBtn.onclick = function() { self.addText(); };
    
    var toolSizeInput = document.getElementById('inp-tool-size');
    if (toolSizeInput) {
        toolSizeInput.oninput = function(e) {
            Store.size = parseInt(e.target.value);
            var valToolSize = document.getElementById('val-tool-size');
            if (valToolSize) valToolSize.innerText = Store.size + 'px';
        };
    }
    
    var toolBtns = document.querySelectorAll('[data-tool]');
    for (var i = 0; i < toolBtns.length; i++) {
        toolBtns[i].onclick = function() {
            self.setTool(this.dataset.tool);
            self.closeDrawers();
        };
    }
    
    var closeBtns = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closeBtns.length; i++) {
        closeBtns[i].onclick = function() { self.closeDrawers(); };
    }
    
    var backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.onclick = function() { self.closeDrawers(); };
    
    initSettings(self);
    setTimeout(function() { initColorWheel(self); }, 100);
};

UIController.prototype.toggleFullscreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.body.classList.add('zen-mode');
    } else {
        document.exitFullscreen();
        document.body.classList.remove('zen-mode');
    }
};

UIController.prototype.toggleMinimap = function() {
    toggleMinimap();
};

UIController.prototype.setTool = function(tool) {
    if (!Store.perms.draw && tool !== 'pan' && tool !== 'laser') {
        var activeBtn = document.querySelector('[data-tool="' + tool + '"]');
        if (activeBtn) {
            shakeButton(activeBtn);
        }
        Utils.showToast("Chizish huquqi yo'q", "warning");
        return;
    }
    setTool(tool);
};

UIController.prototype.openDrawer = function(id) {
    this.closeDrawers();
    var drawer = document.getElementById(id);
    if (drawer) drawer.classList.add('is-open');
    var backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.classList.add('is-visible');
    if (id === 'drawer-chat') {
        Store.unread = 0;
        var badge = document.getElementById('badge-chat-count');
        if (badge) badge.style.display = 'none';
        var chatInput = document.getElementById('inp-chat-text');
        if (chatInput) setTimeout(function() { chatInput.focus(); }, 100);
    }
};

UIController.prototype.closeDrawers = function() {
    var drawers = document.querySelectorAll('.drawer');
    for (var i = 0; i < drawers.length; i++) {
        drawers[i].classList.remove('is-open');
    }
    var backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) backdrop.classList.remove('is-visible');
    this.closeTextModal();
};

UIController.prototype.closeTextModal = function() {
    var modal = document.getElementById('modal-text-input');
    if (modal) modal.classList.remove('is-visible');
    var textarea = document.getElementById('inp-text-area');
    if (textarea) textarea.value = '';
    Store.textPos = null;
};

UIController.prototype.addText = function() {
    var txt = Utils.sanitize(document.getElementById('inp-text-area').value.trim()).substring(0, 300);
    if (txt && Store.textPos) {
        DB.addElement({ type: 'text', text: txt, x: Store.textPos.x, y: Store.textPos.y, s: Math.min(Store.size * 3 + 16, 48), c: Store.color });
    }
    this.closeTextModal();
};

UIController.prototype.startApp = function(roomId, teacherSecret) {
    Utils.vibrate([15, 50, 15]);
    
    var authGateway = document.getElementById('auth-gateway');
    var appContainer = document.getElementById('app-container');
    var uiOverlay = document.getElementById('ui-overlay');
    
    if (authGateway) authGateway.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (uiOverlay) uiOverlay.style.display = 'block';
    
    var roomCodeSpan = document.getElementById('ui-room-code');
    if (roomCodeSpan) roomCodeSpan.innerText = roomId;
    
    if (Store.isTeacher) {
        var hostControls = document.getElementById('panel-host-controls');
        var participantsList = document.getElementById('ui-participants-list');
        var userRole = document.getElementById('ui-user-role');
        
        if (hostControls) hostControls.style.display = 'block';
        if (participantsList) participantsList.classList.add('host-active');
        if (userRole) userRole.innerHTML = '<i data-lucide="crown"></i> O\'qituvchi';
    }
    
    DB.init(roomId, teacherSecret);
    this.engine = new GraphicsEngine();
    this.engine.init();
    this.engine.bindEvents();
    AudioSystem.init();
    
    Events.on('zoom', function() {
        var zoomSpan = document.getElementById('ui-zoom-level');
        if (zoomSpan) zoomSpan.innerText = Math.round(Store.cam.z * 100) + '%';
    });
    
    Events.on('role', function() {
        if (!Store.isTeacher) {
            var userRole = document.getElementById('ui-user-role');
            if (userRole) {
                if (Store.perms.draw) userRole.innerHTML = '<i data-lucide="pencil"></i> Yozuvchi';
                else userRole.innerHTML = '<i data-lucide="eye"></i> Kuzatuvchi';
            }
            if (window.lucide) window.lucide.createIcons();
        }
    });
    
    Events.on('mic', function() {
        var btn = document.getElementById('btn-action-mic');
        if (btn) {
            btn.className = 'action-btn ' + (!Store.perms.speak ? 'mic-off' : (Store.micActive ? 'mic-on' : 'mic-off'));
            btn.innerHTML = '<i data-lucide="' + (Store.micActive && Store.perms.speak ? 'mic' : 'mic-off') + '"></i>';
        }
        if (window.lucide) window.lucide.createIcons();
    });
    
    Events.on('chat', function(msg) {
        var container = document.getElementById('ui-chat-messages');
        if (!container) return;
        
        var isMine = msg.u === Store.uid;
        var bubble = document.createElement('div');
        bubble.className = 'msg-bubble ' + (isMine ? 'mine' : 'other');
        bubble.innerHTML = '<div class="msg-info">' + Utils.sanitize(msg.n) + (msg.t ? '<i data-lucide="crown" size="12" style="color:var(--state-warning)"></i>' : '') + '</div><div>' + Utils.sanitize(msg.m) + '</div><div class="msg-time">' + msg.tm + '</div>';
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
        if (window.lucide) window.lucide.createIcons();
        
        if (!isMine && !document.getElementById('drawer-chat').classList.contains('is-open')) {
            Store.unread++;
            var badge = document.getElementById('badge-chat-count');
            if (badge) {
                badge.innerText = Store.unread > 9 ? '9+' : Store.unread;
                badge.style.display = 'flex';
            }
            Utils.vibrate([10, 30, 10]);
        }
    });
    
    Events.on('users', function() {
        updateUsersList();
    });
    
    Events.emit('zoom');
    if (window.lucide) window.lucide.createIcons();
};
