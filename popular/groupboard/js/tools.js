import { Store } from './store.js';
import { Utils } from './utils.js';

export function setTool(tool) {
    Store.tool = tool;
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('is-active'));
    const active = document.querySelector(`[data-tool="${tool}"]`);
    if (active) active.classList.add('is-active');
    document.getElementById('app-container').style.cursor = tool === 'pan' ? 'grab' : (tool === 'text' ? 'text' : 'crosshair');
    Utils.vibrate(10);
}
