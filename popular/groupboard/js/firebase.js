// js/firebase.js - Yangilangan versiya

import { firebaseConfig } from './config.js';  // Kichik harflar bilan!
import { Store } from './store.js';
import { Events } from './events.js';
import { Utils } from './utils.js';

let dbRef = null;

// Firebase ni ishga tushirish
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const DB = {
    init(roomId, teacherSecret) {
        dbRef = firebase.database().ref(`mrboard_final/${roomId}`);
        
        const me = dbRef.child(`users/${Store.uid}`);
        me.onDisconnect().remove();
        me.set({ id: Store.uid, n: Store.name, t: Store.isTeacher, d: Store.perms.draw, s: Store.perms.speak });
        
        if (Store.isTeacher && teacherSecret) {
            dbRef.child('meta/teacherSecret').set(teacherSecret);
            dbRef.child('meta/studentCode').set(roomId);
            dbRef.child('meta/laserEnabled').set(true);
        }
        
        this.attachListeners();
    },
    
    attachListeners() {
        dbRef.child('elements').on('value', s => { Store.elements = s.val() ? Object.values(s.val()) : []; Events.emit('render'); });
        dbRef.child('live').on('value', s => { Store.livePaths = s.val() || {}; Events.emit('render'); });
        dbRef.child('laser').on('value', s => { Store.laserPaths = s.val() || {}; Events.emit('render'); });
        dbRef.child('cursors').on('value', s => { Store.cursors = s.val() || {}; Events.emit('render'); });
        dbRef.child('meta/laserEnabled').on('value', s => { Store.laserEnabled = s.val() !== false; Events.emit('render'); });
        
        if (!Store.isTeacher) {
            dbRef.child('camera').on('value', s => {
                if (s.val() && !Store.perms.draw) { Store.cam = s.val(); Events.emit('render'); Events.emit('zoom'); }
            });
        }
        
        dbRef.child('users').on('value', s => {
            Store.users = s.val() || {};
            if (!Store.isTeacher && Store.users[Store.uid]) {
                const u = Store.users[Store.uid];
                if (Store.perms.draw !== u.d) {
                    Store.perms.draw = u.d;
                    Utils.showToast(u.d ? "Chizish huquqi berildi" : "Chizish huquqi olindi", u.d ? "success" : "warning");
                }
                if (Store.perms.speak !== u.s) {
                    Store.perms.speak = u.s;
                    if (!u.s && Store.micActive) { Store.micActive = false; Events.emit('mic'); }
                    Utils.showToast(u.s ? "Mikrofon huquqi berildi" : "Mikrofon huquqi olindi", u.s ? "success" : "warning");
                }
                Events.emit('role');
            }
            Events.emit('users');
        });
        dbRef.child('chat').on('child_added', s => Events.emit('chat', s.val()));
    },
    
    addElement(el) { el.u = Store.uid; el.t = Date.now(); dbRef.child('elements').push(el); },
    
    addLive(id, data, isLaser) {
        if (isLaser && !Store.laserEnabled && !Store.isTeacher) return;
        dbRef.child(`${isLaser ? 'laser' : 'live'}/${id}`).set(data);
        if (isLaser) setTimeout(() => dbRef.child(`laser/${id}`).remove(), 1000);
    },
    
    updateLive(id, points, isLaser) { dbRef.child(`${isLaser ? 'laser' : 'live'}/${id}`).update({ p: points }); },
    removeLive(id) { dbRef.child(`live/${id}`).remove(); },
    
    updateCursor: Utils.throttle((pos) => { dbRef.child(`cursors/${Store.uid}`).set({ x: pos.x, y: pos.y, n: Store.name, t: Store.isTeacher }); }, 50),
    syncCamera() { if (Store.isTeacher) dbRef.child('camera').set(Store.cam); },
    
    undo() {
        dbRef.child('elements').once('value', snap => {
            if (!snap.val()) return;
            const els = Object.entries(snap.val()).map(([k, v]) => ({ k, ...v })).filter(e => Store.isTeacher || e.u === Store.uid);
            if (els.length) {
                const last = els.sort((a, b) => b.t - a.t)[0];
                dbRef.child(`elements/${last.k}`).remove();
                Utils.showToast("Bekor qilindi", "success");
            }
        });
    },
    
    clearBoard() {
        if (Store.isTeacher) {
            dbRef.child('meta/teacherSecret').once('value', snap => {
                if (snap.val() === Store.teacherSecret) {
                    dbRef.child('elements').remove();
                    Utils.showToast("Doska tozalandi", "success");
                }
            });
        }
    },
    
    toggleLaser() {
        if (Store.isTeacher) {
            dbRef.child('meta/teacherSecret').once('value', snap => {
                if (snap.val() === Store.teacherSecret) {
                    const newVal = !Store.laserEnabled;
                    dbRef.child('meta/laserEnabled').set(newVal);
                    Utils.showToast(newVal ? "Lazer yoqildi" : "Lazer o'chirildi", "info");
                }
            });
        }
    },
    
    setPerm(userId, type, val) {
        if (Store.isTeacher) dbRef.child(`users/${userId}`).update({ [type]: val });
    },
    
    kickUser(userId) {
        if (Store.isTeacher) {
            dbRef.child(`users/${userId}`).remove();
            Utils.showToast("Foydalanuvchi chiqarildi", "success");
        }
    },
    
    sendChat(msg) { dbRef.child('chat').push({ u: Store.uid, n: Store.name, t: Store.isTeacher, m: msg, tm: Utils.getTime() }); }
};
