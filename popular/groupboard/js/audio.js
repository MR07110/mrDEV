// js/audio.js - Silkutish funksiyasi qo'shilgan versiya

import { Store } from './store.js';
import { Events } from './events.js';
import { Utils } from './utils.js';

// ==================== SILKUTISH FUNKSIYASI ====================
function shakeButton(button) {
    if (!button) return;
    button.classList.add('error-shake');
    setTimeout(() => {
        button.classList.remove('error-shake');
    }, 300);
}

// ==================== BRAUZER DETEKTORI ====================
const BrowserDetector = {
    getBrowserName() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (ua.includes('brave')) return 'Brave';
        if (ua.includes('edg')) return 'Microsoft Edge';
        if (ua.includes('firefox')) return 'Mozilla Firefox';
        if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
        if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
        if (ua.includes('chrome')) return 'Google Chrome';
        if (ua.includes('vivaldi')) return 'Vivaldi';
        if (ua.includes('yabrowser')) return 'Yandex Browser';
        
        return 'brauzeringizni';
    },
    
    getBrowserIcon() {
        const name = this.getBrowserName();
        const icons = {
            'Google Chrome': '🌐',
            'Microsoft Edge': '🌐',
            'Mozilla Firefox': '🦊',
            'Safari': '🍎',
            'Opera': '🎭',
            'Brave': '🦁',
            'Vivaldi': '🎨',
            'Yandex Browser': '🔵'
        };
        return icons[name] || '🌐';
    },
    
    getHelpMessage() {
        const browserName = this.getBrowserName();
        const icon = this.getBrowserIcon();
        
        if (browserName === 'Brave') {
            return {
                title: `🦁 Hurmatli foydalanuvchi!`,
                message: `Siz ${icon} ${browserName} brauzeridan foydalanyapsiz. Mikrofon ishlashi uchun quyidagi amallarni bajaring:`,
                steps: [
                    `1️⃣ Adres satridagi 🦁 (Shields) belgisini bosing`,
                    `2️⃣ "Shields down" tugmasini bosing`,
                    `3️⃣ Endi adres satridagi 🔒 (qulf) belgisini bosing`,
                    `4️⃣ "Mikrofon" → "Ruxsat berish" ni tanlang`,
                    `5️⃣ Sahifani yangilang (Ctrl+Shift+R)`
                ]
            };
        }
        
        if (browserName === 'Safari') {
            return {
                title: `🍎 Hurmatli foydalanuvchi!`,
                message: `Siz ${icon} ${browserName} brauzeridan foydalanyapsiz. Mikrofon ishlashi uchun quyidagi amallarni bajaring:`,
                steps: [
                    `1️⃣ Safari menyusidan "Settings" (Sozlamalar) ni oching`,
                    `2️⃣ "Websites" → "Microphone" bo'limiga o'ting`,
                    `3️⃣ "mrboard.vercel.app" saytini topib, "Allow" ga o'rnating`,
                    `4️⃣ Sahifani yangilang`
                ]
            };
        }
        
        if (browserName === 'Mozilla Firefox') {
            return {
                title: `🦊 Hurmatli foydalanuvchi!`,
                message: `Siz ${icon} ${browserName} brauzeridan foydalanyapsiz. Mikrofon ishlashi uchun quyidagi amallarni bajaring:`,
                steps: [
                    `1️⃣ Adres satridagi 🔒 (qulf) belgisini bosing`,
                    `2️⃣ "Mikrofon" yozuvini toping`,
                    `3️⃣ "Ruxsat berish" tugmasini bosing`,
                    `4️⃣ Sahifani yangilang (F5)`
                ]
            };
        }
        
        return {
            title: `🌐 Hurmatli foydalanuvchi!`,
            message: `Siz ${icon} ${browserName} brauzeridan foydalanyapsiz. Mikrofon ishlashi uchun ruxsat berishingiz kerak.`,
            steps: [
                `1️⃣ Adres satridagi 🔒 (qulf) belgisini bosing`,
                `2️⃣ "Mikrofon" → "Ruxsat berish" ni tanlang`,
                `3️⃣ Sahifani yangilang`
            ]
        };
    },
    
    isMicrophoneSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },
    
    showHelpModal() {
        const help = this.getHelpMessage();
        
        const modal = document.createElement('div');
        modal.className = 'mic-help-modal';
        modal.innerHTML = `
            <div class="mic-modal-overlay"></div>
            <div class="mic-modal-container">
                <div class="mic-modal-header">
                    <div class="mic-modal-icon">${help.title.split(' ')[0]}</div>
                    <h3>${help.title}</h3>
                    <button class="mic-modal-close">&times;</button>
                </div>
                <div class="mic-modal-body">
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        ${help.message}
                    </p>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 20px; margin: 16px 0;">
                        <p style="font-weight: 700; margin-bottom: 12px;">🔧 Mikrofoni yoqish:</p>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${help.steps.map(step => `<li style="margin-bottom: 10px;">${step}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="mic-modal-footer">
                    <button class="mic-btn-primary">Tushundim, rahmat!</button>
                </div>
            </div>
        `;
        
        const styleId = 'mic-help-modal-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .mic-help-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; }
                .mic-modal-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
                .mic-modal-container { position: relative; background: white; border-radius: 32px; max-width: 480px; width: 90%; box-shadow: 0 25px 50px rgba(0,0,0,0.2); z-index: 100001; overflow: hidden; animation: micSlideUp 0.3s ease-out; }
                @keyframes micSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .mic-modal-header { padding: 24px 24px 16px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; gap: 12px; }
                .mic-modal-icon { font-size: 36px; }
                .mic-modal-header h3 { font-size: 20px; font-weight: 700; margin: 0; flex: 1; }
                .mic-modal-close { background: none; border: none; font-size: 28px; cursor: pointer; color: white; opacity: 0.8; }
                .mic-modal-close:hover { opacity: 1; }
                .mic-modal-body { padding: 20px 24px; }
                .mic-modal-footer { padding: 16px 24px 24px; text-align: center; }
                .mic-btn-primary { background: #007aff; color: white; border: none; padding: 12px 28px; border-radius: 40px; cursor: pointer; font-weight: 600; font-size: 16px; transition: transform 0.2s; }
                .mic-btn-primary:hover { transform: scale(1.02); background: #0056b3; }
                @media (max-width: 480px) { .mic-modal-container { width: 95%; border-radius: 24px; } .mic-modal-header { padding: 20px; } .mic-modal-body { padding: 16px 20px; } }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.mic-modal-close').onclick = closeModal;
        modal.querySelector('.mic-modal-overlay').onclick = closeModal;
        modal.querySelector('.mic-btn-primary').onclick = closeModal;
    },
    
    showNoDeviceModal() {
        const modal = document.createElement('div');
        modal.className = 'mic-help-modal';
        modal.innerHTML = `
            <div class="mic-modal-overlay"></div>
            <div class="mic-modal-container">
                <div class="mic-modal-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="mic-modal-icon">🎤</div>
                    <h3>Hurmatli foydalanuvchi!</h3>
                    <button class="mic-modal-close">&times;</button>
                </div>
                <div class="mic-modal-body">
                    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Sizning qurilmangizdan <strong>mikrofon topa olmadik</strong> 😢
                    </p>
                    <div style="background: #fef2f2; padding: 16px; border-radius: 20px; margin: 16px 0;">
                        <p style="font-weight: 700; margin-bottom: 12px; color: #dc2626;">🔧 Iltimos, quyidagilarni tekshiring:</p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 10px;">1️⃣ Mikrofon qurilmangiz kompyuterga ulanganmi?</li>
                            <li style="margin-bottom: 10px;">2️⃣ Mikrofon yoqilganmi? (Funktsiya tugmasi yoki ovoz sozlamalari)</li>
                            <li style="margin-bottom: 10px;">3️⃣ Boshqa dasturlar (Zoom, Discord, Telegram) mikrofonni ishlatayotgan bo'lishi mumkin</li>
                            <li style="margin-bottom: 10px;">4️⃣ Kompyuter sozlamalaridan mikrofonni tekshiring</li>
                        </ul>
                    </div>
                </div>
                <div class="mic-modal-footer">
                    <button class="mic-btn-primary">Tushundim, tekshiraman</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeModal = () => modal.remove();
        modal.querySelector('.mic-modal-close').onclick = closeModal;
        modal.querySelector('.mic-modal-overlay').onclick = closeModal;
        modal.querySelector('.mic-btn-primary').onclick = closeModal;
    }
};

// ==================== AUDIO SYSTEM ====================
let audioStream = null;
let audioContext = null;
let microphoneWorking = false;

export const AudioSystem = {
    async checkMicrophone() {
        if (!BrowserDetector.isMicrophoneSupported()) return false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (e) {
            return false;
        }
    },
    
    async init(showAlert = false) {
        if (!BrowserDetector.isMicrophoneSupported()) {
            if (showAlert) BrowserDetector.showHelpModal();
            Utils.showToast("Brauzeringiz mikrofonni qo'llab-quvvatlamaydi 😔", "error");
            return false;
        }
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasMicrophone = devices.some(device => device.kind === 'audioinput');
            
            if (!hasMicrophone) {
                if (showAlert) BrowserDetector.showNoDeviceModal();
                Utils.showToast("Mikrofon topilmadi! Qurilmangizni tekshiring 🎤", "error");
                return false;
            }
            
            audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true } 
            });
            
            microphoneWorking = true;
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            if (Store.perms && Store.perms.speak) Store.micActive = true;
            this.sync();
            this.visualizer();
            if (Events) Events.emit('mic');
            
            Utils.showToast("✅ Mikrofon tayyor! Gapirishingiz mumkin", "success");
            return true;
        } catch (e) {
            // Xatolikda mikrafon buttonini silkutish
            const micBtn = document.getElementById('btn-action-mic');
            shakeButton(micBtn);
            
            if (e.name === 'NotAllowedError') {
                if (showAlert) BrowserDetector.showHelpModal();
                Utils.showToast("Mikrofonga ruxsat berilmadi 😢", "error");
            } else if (e.name === 'NotFoundError') {
                if (showAlert) BrowserDetector.showNoDeviceModal();
                Utils.showToast("Mikrofon topilmadi! Qurilmangizni tekshiring 🎤", "error");
            } else if (e.name === 'NotReadableError') {
                Utils.showToast("Mikrofon band! Boshqa dasturlarni yoping 🔒", "error");
            } else {
                Utils.showToast("Mikrofon xatosi: " + e.message, "error");
            }
            return false;
        }
    },
    
    visualizer() {
        if (!audioStream) return;
        
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        const source = ctx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        analyser.fftSize = 128;
        const data = new Uint8Array(analyser.frequencyBinCount);
        
        const draw = () => {
            requestAnimationFrame(draw);
            const bars = document.querySelectorAll('.viz-bar');
            if (!(Store.perms?.speak && Store.micActive && microphoneWorking)) {
                bars.forEach(b => b.style.height = '4px');
                return;
            }
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const avg = sum / data.length;
            const h = Math.min(20, 4 + (avg / 128) * 16);
            bars.forEach((b, i) => {
                b.style.height = `${Math.max(4, h * Math.sin((i / 6) * Math.PI))}px`;
            });
        };
        draw();
    },
    
    sync() { 
        if (audioStream) {
            const track = audioStream.getAudioTracks()[0];
            if (track) track.enabled = Store.perms?.speak && Store.micActive && microphoneWorking;
        }
    },
    
    async toggle() {
        const micBtn = document.getElementById('btn-action-mic');
        const showAlert = true;
        
        // Mikrofon ishlamayotgan bo'lsa
        if (!microphoneWorking) {
            const isWorking = await this.checkMicrophone();
            if (!isWorking) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasDevice = devices.some(device => device.kind === 'audioinput');
                if (!hasDevice) {
                    BrowserDetector.showNoDeviceModal();
                } else {
                    BrowserDetector.showHelpModal();
                }
                shakeButton(micBtn);  // Buttonni silkutish
                return;
            }
        }
        
        // O'qituvchi ruxsat bermagan bo'lsa
        if (!Store.perms?.speak) { 
            Utils.showToast("O'qituvchi mikrofonga ruxsat bermagan 🎤", "error");
            shakeButton(micBtn);  // Buttonni silkutish
            return; 
        }
        
        // Mikrofon streami yo'q bo'lsa
        if (!audioStream) {
            const success = await this.init(showAlert);
            if (!success) {
                shakeButton(micBtn);  // Buttonni silkutish
                return;
            }
        }
        
        // AudioContext suspended bo'lsa
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        Store.micActive = !Store.micActive;
        this.sync();
        if (Events) Events.emit('mic');
        if (Utils.vibrate) Utils.vibrate(10);
        
        if (Store.micActive) {
            Utils.showToast("🎤 Mikrofon yoqildi! Gapiravering", "success");
        } else {
            Utils.showToast("🔇 Mikrofon o'chirildi", "info");
        }
    },
    
    async checkMicrophoneExists() {
        if (!BrowserDetector.isMicrophoneSupported()) return false;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(device => device.kind === 'audioinput');
        } catch (e) {
            return false;
        }
    }
};

// FAQAT BIRTA EXPORT - DEFAULT EXPORT
export default AudioSystem;
