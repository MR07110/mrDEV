// js/graphics.js - Faqat light mode, dark mode o'chirilgan

import { Store } from './store.js';
import { Events } from './events.js';
import { DB } from './firebase.js';
import { Utils } from './utils.js';

export class GraphicsEngine {
    constructor() {
        this.cvs = {
            b: document.getElementById('layer-base'),
            l: document.getElementById('layer-live'),
            s: document.getElementById('layer-laser')
        };
        this.ctx = {
            b: this.cvs.b?.getContext('2d'),
            l: this.cvs.l?.getContext('2d'),
            s: this.cvs.s?.getContext('2d')
        };
        this.miniCvs = document.getElementById('minimap-cvs');
        this.miniCtx = this.miniCvs?.getContext('2d');
        this.miniView = document.getElementById('minimap-view');
        this.isDrawing = false;
        this.lastPos = null;
        this.activeId = null;
        this.shapeStart = null;
        this.dirty = true;
    }

    // ========== ERASER UCHUN FON RANGI (FAQAT LIGHT MODE) ==========
    getBackgroundColor() {
        // Light mode fon rangi - doimiy
        return '#e2e8f0';
    }

    init() {
        if (!this.cvs.b || !this.cvs.l || !this.cvs.s) {
            console.error('Canvas elementlari topilmadi');
            return;
        }
        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        // Render eventiga ulanish
        if (Events) Events.on('render', () => this.dirty = true);
        
        requestAnimationFrame(() => this.loop());
    }

    resize() {
        const w = window.innerWidth, h = window.innerHeight;
        if (this.cvs.b) { this.cvs.b.width = w; this.cvs.b.height = h; }
        if (this.cvs.l) { this.cvs.l.width = w; this.cvs.l.height = h; }
        if (this.cvs.s) { this.cvs.s.width = w; this.cvs.s.height = h; }
        this.dirty = true;
    }

    toWorld(x, y) { 
        if (!Store.cam) return { x: x, y: y };
        return { x: (x - Store.cam.x) / Store.cam.z, y: (y - Store.cam.y) / Store.cam.z }; 
    }
    
    toScreen(x, y) { 
        if (!Store.cam) return { x: x, y: y };
        return { x: x * Store.cam.z + Store.cam.x, y: y * Store.cam.z + Store.cam.y }; 
    }

    bindEvents() {
        const wrap = document.getElementById('app-container');
        if (!wrap) return;

        // Wheel (zoom/pan)
        wrap.addEventListener('wheel', e => {
            e.preventDefault();
            if (!Store.cam) return;
            if (e.ctrlKey || e.metaKey) {
                const p = this.toWorld(e.clientX, e.clientY);
                const nz = Math.min(5, Math.max(0.2, Store.cam.z * (e.deltaY > 0 ? 0.9 : 1.1)));
                Store.cam.z = nz;
                Store.cam.x = e.clientX - p.x * nz;
                Store.cam.y = e.clientY - p.y * nz;
                if (Events) Events.emit('zoom');
            } else {
                Store.cam.x -= e.deltaX;
                Store.cam.y -= e.deltaY;
            }
            this.dirty = true;
            if (DB && DB.syncCamera) DB.syncCamera();
        }, { passive: false });

        // Pointer down (chizish boshlash)
        wrap.addEventListener('pointerdown', e => {
            if (e.target.closest('.drawer') || e.target.closest('.bottom-dock') || e.target.closest('.minimap-widget')) return;
            e.preventDefault();
            const p = this.toWorld(e.clientX, e.clientY);

            if (Store.tool === 'text') {
                if (Store.perms && Store.perms.draw) {
                    Store.textPos = p;
                    const modal = document.getElementById('modal-text-input');
                    const backdrop = document.getElementById('drawer-backdrop');
                    if (modal) modal.classList.add('is-visible');
                    if (backdrop) backdrop.classList.add('is-visible');
                }
                return;
            }

            if (!Store.perms?.draw && Store.tool !== 'pan' && Store.tool !== 'laser') return;

            this.isDrawing = true;
            this.lastPos = { x: e.clientX, y: e.clientY };
            this.activeId = Utils?.generateId ? Utils.generateId() : Date.now() + '_' + Math.random();
            const isLaser = Store.tool === 'laser' && Store.laserEnabled;

            if (['draw', 'erase', 'laser'].includes(Store.tool)) {
                // ERASER UCHUN LIGHT MODE FON RANGI
                let drawColor = Store.color;
                if (Store.tool === 'erase') {
                    drawColor = this.getBackgroundColor(); // #e2e8f0
                } else if (isLaser) {
                    drawColor = '#ff3b30';
                }
                
                if (DB && DB.addLive) {
                    DB.addLive(this.activeId, {
                        p: [p],
                        c: drawColor,
                        s: (Store.tool === 'erase' ? 40 : Store.size) / Store.cam.z,
                        tl: Store.tool
                    }, isLaser);
                }
            } else if (['rect', 'circle', 'line', 'arrow'].includes(Store.tool)) {
                this.shapeStart = p;
                if (DB && DB.addLive) {
                    DB.addLive(this.activeId, {
                        tl: Store.tool,
                        p1: p,
                        p2: p,
                        c: Store.color,
                        s: Store.size / Store.cam.z
                    });
                }
            }
        });

        // Pointer move (chizish davom)
        window.addEventListener('pointermove', e => {
            if (!this.isDrawing) {
                if (DB && DB.updateCursor) {
                    DB.updateCursor(this.toWorld(e.clientX, e.clientY));
                }
                return;
            }

            if (Store.tool === 'pan') {
                Store.cam.x += e.clientX - this.lastPos.x;
                Store.cam.y += e.clientY - this.lastPos.y;
                this.lastPos = { x: e.clientX, y: e.clientY };
                this.dirty = true;
                return;
            }

            const p = this.toWorld(e.clientX, e.clientY);
            const isLaser = Store.tool === 'laser' && Store.laserEnabled;
            const active = isLaser ? Store.laserPaths?.[this.activeId] : Store.livePaths?.[this.activeId];

            if (['draw', 'erase', 'laser'].includes(Store.tool) && active && active.p) {
                const last = active.p[active.p.length - 1];
                if (Math.hypot(p.x - last.x, p.y - last.y) > 3 / Store.cam.z) {
                    active.p.push(p);
                    if (DB && DB.updateLive) DB.updateLive(this.activeId, active.p, isLaser);
                }
            } else if (['rect', 'circle', 'line', 'arrow'].includes(Store.tool) && this.shapeStart) {
                if (DB && DB.updateLive) DB.updateLive(this.activeId, null);
                if (DB && DB.addLive) {
                    DB.addLive(this.activeId, {
                        tl: Store.tool,
                        p1: this.shapeStart,
                        p2: p,
                        c: Store.color,
                        s: Store.size / Store.cam.z
                    });
                }
            }
            this.lastPos = { x: e.clientX, y: e.clientY };
        });

        // Pointer up (chizish tugatish)
        window.addEventListener('pointerup', () => {
            if (!this.isDrawing) return;
            this.isDrawing = false;

            if (['draw', 'erase'].includes(Store.tool) && Store.livePaths?.[this.activeId]) {
                const path = Store.livePaths[this.activeId];
                if (path && path.p && path.p.length > 1) {
                    if (DB && DB.addElement) DB.addElement({ type: 'path', p: path.p, c: path.c, s: path.s });
                }
                if (DB && DB.removeLive) DB.removeLive(this.activeId);
            } else if (['rect', 'circle', 'line', 'arrow'].includes(Store.tool) && Store.livePaths?.[this.activeId]) {
                const shape = Store.livePaths[this.activeId];
                if (shape && shape.p1 && shape.p2 && Math.hypot(shape.p1.x - shape.p2.x, shape.p1.y - shape.p2.y) > 5) {
                    if (DB && DB.addElement) DB.addElement({ type: 'shape', tl: shape.tl, p1: shape.p1, p2: shape.p2, c: shape.c, s: shape.s });
                }
                if (DB && DB.removeLive) DB.removeLive(this.activeId);
                this.shapeStart = null;
            } else if (Store.tool === 'laser') {
                if (DB && DB.removeLive) DB.removeLive(this.activeId);
            }
            this.activeId = null;
        });

        // Touch (pinch zoom)
        let pinchDist = null;
        wrap.addEventListener('touchstart', e => {
            if (e.touches.length === 2) {
                e.preventDefault();
                pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
        });
        wrap.addEventListener('touchmove', e => {
            if (e.touches.length === 2 && pinchDist) {
                e.preventDefault();
                const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const p = this.toWorld(cx, cy);
                const nz = Math.min(5, Math.max(0.2, Store.cam.z * (newDist / pinchDist)));
                Store.cam.z = nz;
                Store.cam.x = cx - p.x * nz;
                Store.cam.y = cy - p.y * nz;
                this.dirty = true;
                if (Events) Events.emit('zoom');
                if (DB && DB.syncCamera) DB.syncCamera();
            }
        });
        wrap.addEventListener('touchend', () => { pinchDist = null; });
    }

    drawPath(ctx, points, color, width, glow) {
        if (!points || points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (glow) { ctx.shadowBlur = 15; ctx.shadowColor = color; }
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
        if (glow) ctx.shadowBlur = 0;
    }

    drawShape(ctx, e) {
        ctx.beginPath();
        ctx.strokeStyle = e.c;
        ctx.lineWidth = e.s;
        const { p1, p2, tl } = e;
        if (tl === 'rect') ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        else if (tl === 'circle') ctx.arc(p1.x, p1.y, Math.hypot(p2.x - p1.x, p2.y - p1.y), 0, Math.PI * 2);
        else if (tl === 'line') { ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
        else if (tl === 'arrow') {
            const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const sz = 20 / Store.cam.z;
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p2.x - sz * Math.cos(ang - Math.PI / 6), p2.y - sz * Math.sin(ang - Math.PI / 6));
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(p2.x - sz * Math.cos(ang + Math.PI / 6), p2.y - sz * Math.sin(ang + Math.PI / 6));
        }
        ctx.stroke();
    }

    loop() {
        if (this.dirty) {
            const w = window.innerWidth, h = window.innerHeight;
            const { b, l, s } = this.ctx;
            if (b) b.clearRect(0, 0, w, h);
            if (l) l.clearRect(0, 0, w, h);
            if (s) s.clearRect(0, 0, w, h);

            const mmW = this.miniCvs?.parentElement?.clientWidth || 160;
            const mmH = this.miniCvs?.parentElement?.clientHeight || 110;
            if (this.miniCvs) {
                this.miniCvs.width = mmW;
                this.miniCvs.height = mmH;
                if (this.miniCtx) this.miniCtx.clearRect(0, 0, mmW, mmH);
            }

            let bounds = { xMin: Infinity, yMin: Infinity, xMax: -Infinity, yMax: -Infinity };

            if (b) {
                b.save();
                b.translate(Store.cam.x, Store.cam.y);
                b.scale(Store.cam.z, Store.cam.z);
                Store.elements?.forEach(el => {
                    if (el.type === 'path') this.drawPath(b, el.p, el.c, el.s);
                    else if (el.type === 'shape') this.drawShape(b, el);
                    else if (el.type === 'text') {
                        b.font = `800 ${Math.min(el.s, 48)}px -apple-system`;
                        b.fillStyle = el.c;
                        b.fillText(el.text, el.x, el.y);
                    } else if (el.type === 'image' && el.data) {
                        if (!el.img) { el.img = new Image(); el.img.src = el.data; el.img.onload = () => this.dirty = true; }
                        if (el.img.complete) b.drawImage(el.img, el.x, el.y, el.width, el.height);
                    }
                    if (el.x !== undefined) {
                        bounds.xMin = Math.min(bounds.xMin, el.x);
                        bounds.xMax = Math.max(bounds.xMax, el.x + (el.width || 100));
                        bounds.yMin = Math.min(bounds.yMin, el.y);
                        bounds.yMax = Math.max(bounds.yMax, el.y + (el.height || 100));
                    } else if (el.p && el.p[0]) {
                        el.p.forEach(p => {
                            bounds.xMin = Math.min(bounds.xMin, p.x);
                            bounds.xMax = Math.max(bounds.xMax, p.x);
                            bounds.yMin = Math.min(bounds.yMin, p.y);
                            bounds.yMax = Math.max(bounds.yMax, p.y);
                        });
                    } else if (el.p1 && el.p2) {
                        bounds.xMin = Math.min(bounds.xMin, el.p1.x, el.p2.x);
                        bounds.xMax = Math.max(bounds.xMax, el.p1.x, el.p2.x);
                        bounds.yMin = Math.min(bounds.yMin, el.p1.y, el.p2.y);
                        bounds.yMax = Math.max(bounds.yMax, el.p1.y, el.p2.y);
                    }
                });
                b.restore();
            }

            if (l) {
                l.save();
                l.translate(Store.cam.x, Store.cam.y);
                l.scale(Store.cam.z, Store.cam.z);
                Object.values(Store.livePaths || {}).forEach(e => {
                    if (e && e.p) this.drawPath(l, e.p, e.c, e.s);
                    else if (e && e.p1) this.drawShape(l, e);
                });
                l.restore();
            }

            if (Store.laserEnabled && s) {
                s.save();
                s.translate(Store.cam.x, Store.cam.y);
                s.scale(Store.cam.z, Store.cam.z);
                Object.values(Store.laserPaths || {}).forEach(e => {
                    if (e && e.p) this.drawPath(s, e.p, e.c, e.s, true);
                });
                s.restore();
            }

            if (l) {
                l.save();
                Object.values(Store.cursors || {}).forEach(c => {
                    if (c.n === Store.name || typeof c.x !== 'number') return;
                    const pos = this.toScreen(c.x, c.y);
                    l.beginPath();
                    l.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
                    l.fillStyle = c.t ? '#ffcc00' : '#ff3b30';
                    l.fill();
                    l.fillStyle = '#fff';
                    l.font = 'bold 10px -apple-system';
                    l.fillText(c.n, pos.x + 10, pos.y + 3);
                });
                l.restore();
            }

            if (Store.minimapVisible && bounds.xMin !== Infinity && this.miniCtx && this.miniView) {
                const pad = Math.max(50, (bounds.xMax - bounds.xMin) * 0.1);
                bounds.xMin -= pad;
                bounds.xMax += pad;
                bounds.yMin -= pad;
                bounds.yMax += pad;
                const scale = Math.min(mmW / (bounds.xMax - bounds.xMin), mmH / (bounds.yMax - bounds.yMin));
                const offX = mmW / 2 - (bounds.xMin + (bounds.xMax - bounds.xMin) / 2) * scale;
                const offY = mmH / 2 - (bounds.yMin + (bounds.yMax - bounds.yMin) / 2) * scale;

                this.miniCtx.save();
                this.miniCtx.translate(offX, offY);
                this.miniCtx.scale(scale, scale);
                Store.elements?.forEach(el => {
                    if (el.type === 'path') this.drawPath(this.miniCtx, el.p, el.c, Math.max(1, el.s * scale));
                    else if (el.type === 'shape') this.drawShape(this.miniCtx, el);
                });
                this.miniCtx.restore();

                const viewX = (-Store.cam.x / Store.cam.z) * scale + offX;
                const viewY = (-Store.cam.y / Store.cam.z) * scale + offY;
                const viewW = (w / Store.cam.z) * scale;
                const viewH = (h / Store.cam.z) * scale;
                this.miniView.style.width = `${Math.max(20, viewW)}px`;
                this.miniView.style.height = `${Math.max(15, viewH)}px`;
                this.miniView.style.transform = `translate(${Math.max(0, Math.min(viewX, mmW - viewW))}px, ${Math.max(0, Math.min(viewY, mmH - viewH))}px)`;
            }
            this.dirty = false;
        }
        requestAnimationFrame(() => this.loop());
    }
}
