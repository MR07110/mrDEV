import { Store } from './store.js';
import { DB } from './firebase.js';
import { Events } from './events.js';
import { showToast } from './utils.js';

export function initSettings(uiInstance) {
    document.getElementById('act-clear-board').onclick = () => { if (confirm("Doska tozalanadi?")) DB.clearBoard(); uiInstance.closeDrawers(); };
    document.getElementById('act-disable-laser').onclick = () => { DB.toggleLaser(); uiInstance.closeDrawers(); };
    document.getElementById('act-toggle-minimap').onclick = () => uiInstance.toggleMinimap();
    document.getElementById('act-center').onclick = () => { Store.cam = { x: 0, y: 0, z: 1 }; Events.emit('render'); Events.emit('zoom'); DB.syncCamera(); uiInstance.closeDrawers(); };
    document.getElementById('act-undo').onclick = () => { DB.undo(); uiInstance.closeDrawers(); };
    document.getElementById('act-export').onclick = () => { const a = document.createElement('a'); a.download = `mrboard_${Date.now()}.png`; a.href = document.getElementById('layer-base').toDataURL(); a.click(); uiInstance.closeDrawers(); };
    document.getElementById('act-save-json').onclick = () => { const a = document.createElement('a'); a.download = `project.json`; a.href = "data:text/json," + encodeURIComponent(JSON.stringify(Store.elements)); a.click(); uiInstance.closeDrawers(); };
    document.getElementById('act-load-json').onclick = () => { if (!Store.isTeacher) { showToast("Faqat o'qituvchi yuklay oladi", "error"); return; } document.getElementById('sys-file-json').click(); uiInstance.closeDrawers(); };
    document.getElementById('act-image').onclick = () => document.getElementById('sys-file-img').click();
    
    // File input handlers
    document.getElementById('sys-file-img').onchange = async e => {
        const f = e.target.files[0];
        if (!f || f.size > 5e6) { showToast("Rasm 5MB dan kichik", "error"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const center = uiInstance.engine.toWorld(window.innerWidth / 2, window.innerHeight / 2);
                let w = img.width, h = img.height;
                const maxDim = 500 / Store.cam.z;
                if (w > maxDim) { h = (maxDim / w) * h; w = maxDim; }
                DB.addElement({ type: 'image', data: ev.target.result, x: center.x - w / 2, y: center.y - h / 2, width: w, height: h });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(f);
        document.getElementById('sys-file-img').value = '';
    };

    document.getElementById('sys-file-json').onchange = async e => {
        const f = e.target.files[0];
        if (!f) return;
        const text = await f.text();
        try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                DB.clearBoard();
                setTimeout(() => data.forEach(el => DB.addElement(el)), 500);
                showToast("Loyiha yuklandi", "success");
            }
        } catch (err) { showToast("Fayl noto'g'ri", "error"); }
        document.getElementById('sys-file-json').value = '';
    };

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.copy;
            const text = document.getElementById(`${type}-link-text`).innerText;
            if (text) Utils.copyToClipboard(text);
        };
    });
}
