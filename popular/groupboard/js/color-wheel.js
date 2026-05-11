import { Store } from './store.js';
import { Utils } from './utils.js';

export function initColorWheel() {
    const cvs = document.getElementById('cvs-color-picker');
    if (!cvs) return;
    
    const ctx = cvs.getContext('2d');
    let hue = 0.6, sat = 0.8, val = 1;
    
    const drawWheel = () => {
        const w = cvs.width, r = w / 2;
        for (let y = 0; y < w; y++) {
            for (let x = 0; x < w; x++) {
                const dx = x - r, dy = y - r, dist = Math.hypot(dx, dy);
                if (dist <= r) {
                    const h = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
                    const s = dist / r;
                    const rgb = hsvToRgb(h, s, 1);
                    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    };
    drawWheel();
    
    const updateColor = () => {
        const rgb = hsvToRgb(hue, sat, val);
        Store.color = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        const indicator = document.getElementById('ui-current-color');
        if (indicator) indicator.style.background = Store.color;
    };
    
    cvs.onclick = (e) => {
        const rect = cvs.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (cvs.width / rect.width);
        const y = (e.clientY - rect.top) * (cvs.height / rect.height);
        const r = cvs.width / 2;
        const dx = x - r, dy = y - r;
        const dist = Math.hypot(dx, dy);
        if (dist <= r) {
            hue = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
            sat = dist / r;
            updateColor();
        }
    };
    
    const brightSlider = document.getElementById('inp-color-bright');
    if (brightSlider) {
        brightSlider.oninput = e => {
            val = e.target.value / 100;
            updateColor();
        };
    }
    
    const palette = document.getElementById('ui-quick-palette');
    if (palette) {
        const colors = ['#ffffff', '#000000', '#64748b', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#30b0c7', '#007aff', '#5856d6', '#af52de', '#ff2d55'];
        colors.forEach(col => {
            const sw = document.createElement('div');
            sw.className = 'swatch-box';
            sw.style.background = col;
            sw.onclick = () => {
                Store.color = col;
                const indicator = document.getElementById('ui-current-color');
                if (indicator) indicator.style.background = col;
                const ui = document.querySelector('.action-btn[data-tool="draw"]');
                if (ui) ui.click();
                Utils.vibrate(10);
            };
            palette.appendChild(sw);
        });
    }
}

export function hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
