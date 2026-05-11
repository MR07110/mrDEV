// user-status.js – foydalanuvchi online/offline holatini boshqarish
import { rtdb } from "./firebase-config.js";
import { ref, set, onDisconnect, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentUserId = null;
let statusListener = null;
let allUsersListener = null;

// Foydalanuvchi online holatiga o‘tkazish
export function setUserOnline(userId) {
    if (!userId) return;
    currentUserId = userId;
    const userStatusRef = ref(rtdb, `status/${userId}`);
    
    set(userStatusRef, {
        state: "online",
        lastSeen: serverTimestamp()
    });
    
    // Brauzer yopilganda yoki tarmoq uzilganda offline holatga o‘tkazish
    onDisconnect(userStatusRef).set({
        state: "offline",
        lastSeen: serverTimestamp()
    });
}

// Foydalanuvchi offline holatiga o‘tkazish
export function setUserOffline(userId) {
    if (!userId) return;
    const userStatusRef = ref(rtdb, `status/${userId}`);
    set(userStatusRef, {
        state: "offline",
        lastSeen: serverTimestamp()
    });
}

// Foydalanuvchi online ekanligini tekshirish (Promise)
export async function isUserOnline(userId) {
    return new Promise((resolve) => {
        const userStatusRef = ref(rtdb, `status/${userId}/state`);
        onValue(userStatusRef, (snapshot) => {
            const status = snapshot.val();
            resolve(status === "online");
        }, { onlyOnce: true });
    });
}

// Foydalanuvchi online ekanligini real-time tekshirish (callback)
export function checkUserOnlineRealtime(userId, callback) {
    const userStatusRef = ref(rtdb, `status/${userId}/state`);
    return onValue(userStatusRef, (snapshot) => {
        const isOnline = snapshot.val() === "online";
        callback(isOnline);
    });
}

// Barcha foydalanuvchilarning holatini real-time kuzatish
export function observeAllUsersStatus(callback) {
    const statusRef = ref(rtdb, `status`);
    allUsersListener = onValue(statusRef, (snapshot) => {
        const data = snapshot.val() || {};
        callback(data);
    });
    return allUsersListener;
}

// Foydalanuvchi holatini real-time kuzatish
export function observeUserStatus(userId, callback) {
    const userStatusRef = ref(rtdb, `status/${userId}/state`);
    statusListener = onValue(userStatusRef, (snapshot) => {
        const isOnline = snapshot.val() === "online";
        callback(isOnline);
    });
    return statusListener;
}

// Holat listenerlarini to‘xtatish
export function stopObserving() {
    if (statusListener) {
        statusListener();
        statusListener = null;
    }
    if (allUsersListener) {
        allUsersListener();
        allUsersListener = null;
    }
}
