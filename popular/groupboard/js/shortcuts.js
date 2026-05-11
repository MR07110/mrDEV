// js/shortcuts.js - To'liq versiya
 
import { Store } from './store.js';
import { DB } from './firebase.js';
import { Events } from './events.js';
import AudioSystem from './audio.js';

export function initShortcuts(ui) {
    window.addEventListener('keydown', e => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        
        const k = e.key.toLowerCase();
        
        // Ctrl+Z - Undo
        if (e.ctrlKey && k === 'z') {
            e.preventDefault();
            DB.undo();
        }
        // B - Qalam
        else if (k === 'b') {
            ui.setTool('draw');
        }
        // E - O'chirgich
        else if (k === 'e') {
            ui.setTool('erase');
        }
        // H - Pan (qo'l)
        else if (k === 'h') {
            ui.setTool('pan');
        }
        // T - Matn
        else if (k === 't') {
            ui.setTool('text');
        }
        // L - Lazer
        else if (k === 'l') {
            ui.setTool('laser');
        }
        // S - Shakllar
        else if (k === 's') {
            ui.openDrawer('drawer-shapes');
        }
        // M - Mikrofon
        else if (k === 'm') {
            if (AudioSystem) {
                AudioSystem.toggle();
            } else {
                console.warn('AudioSystem mavjud emas');
            }
        }
        // C - Chat
        else if (k === 'c') {
            ui.openDrawer('drawer-chat');
        }
        // U - Foydalanuvchilar
        else if (k === 'u') {
            ui.openDrawer('drawer-users');
        }
        // F - Fullscreen
        else if (k === 'f') {
            ui.toggleFullscreen();
        }
        // Esc - Drawerlarni yopish
        else if (k === 'escape') {
            ui.closeDrawers();
        }
    });
}
