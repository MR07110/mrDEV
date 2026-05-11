import { Store } from './store.js';

export function toggleMinimap() {
    Store.minimapVisible = !Store.minimapVisible;
    const mm = document.getElementById('minimap-widget');
    if (Store.minimapVisible) mm.classList.remove('is-hidden');
    else mm.classList.add('is-hidden');
}
