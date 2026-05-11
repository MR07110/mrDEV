let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentPlayingAudio = null;
let currentPlayingBtn = null;
let recordingStartTime = null;
let recordingInterval = null;
let animationFrame = null;
let audioContext = null;
let analyser = null;
let source = null;
let stream = null;

const voiceBtn = document.getElementById('voiceBtn');
const msgInput = document.getElementById('msgInput');
const recordingStatusDiv = document.getElementById('recordingStatus');
const recordingWaveform = document.getElementById('recordingWaveform');
const recordingTimerSpan = document.getElementById('recordingTimer');

export function initVoice(voiceBtnElement, onVoiceReady) {
    if (!voiceBtnElement) return;
    voiceBtnElement.addEventListener('click', async () => {
        if (isRecording) {
            stopRecording(onVoiceReady);
        } else {
            await startRecording();
        }
    });
}

async function startRecording() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };
        mediaRecorder.start();
        isRecording = true;
        
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"><rect x="6" y="4" width="12" height="16" rx="2"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`;
        }
        if (msgInput) msgInput.style.display = 'none';
        if (recordingStatusDiv) recordingStatusDiv.style.display = 'flex';
        
        recordingStartTime = Date.now();
        startTimer();
        startWaveformAnimation(analyser, dataArray);
    } catch(err) {
        console.error("Mikrofon ruxsati xatosi:", err);
        alert("Mikrofon ruxsati kerak!");
    }
}

function startTimer() {
    if (recordingInterval) clearInterval(recordingInterval);
    recordingInterval = setInterval(() => {
        if (!isRecording) return;
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        if (recordingTimerSpan) {
            recordingTimerSpan.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

function startWaveformAnimation(analyser, dataArray) {
    const draw = () => {
        if (!isRecording || !analyser) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a,b) => a+b, 0) / dataArray.length;
        const intensity = Math.min(1, avg / 128);
        const barCount = 20;
        if (recordingWaveform) {
            recordingWaveform.innerHTML = '';
            for (let i = 0; i < barCount; i++) {
                const height = 4 + (intensity * 30 * Math.random());
                const bar = document.createElement('div');
                bar.className = 'voice-wave-bar';
                bar.style.height = `${Math.max(4, height)}px`;
                recordingWaveform.appendChild(bar);
            }
        }
        animationFrame = requestAnimationFrame(draw);
    };
    if (animationFrame) cancelAnimationFrame(animationFrame);
    draw();
}

function stopRecording(onVoiceReady) {
    if (!mediaRecorder || !isRecording) return;
    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (onVoiceReady) onVoiceReady(audioBlob);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (audioContext) {
            await audioContext.close();
            audioContext = null;
        }
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        if (recordingInterval) {
            clearInterval(recordingInterval);
            recordingInterval = null;
        }
        isRecording = false;
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>`;
        }
        if (msgInput) msgInput.style.display = 'flex';
        if (recordingStatusDiv) recordingStatusDiv.style.display = 'none';
        if (recordingWaveform) recordingWaveform.innerHTML = '';
        if (recordingTimerSpan) recordingTimerSpan.innerText = '0:00';
    };
    mediaRecorder.stop();
}

export function playVoice(element, url, event) {
    if (event) event.stopPropagation();
    if (currentPlayingAudio) {
        if (currentPlayingAudio.src === url || currentPlayingAudio.src.endsWith(url)) {
            if (!currentPlayingAudio.paused) {
                currentPlayingAudio.pause();
                setPlayingState(element, false);
                return;
            } else {
                currentPlayingAudio.play();
                setPlayingState(element, true);
                startPlaybackAnimation(element);
                return;
            }
        } else {
            currentPlayingAudio.pause();
            if (currentPlayingBtn) setPlayingState(currentPlayingBtn, false);
            stopPlaybackAnimation(currentPlayingBtn);
        }
    }
    const audio = new Audio(url);
    const playIcon = element.querySelector('.play-icon');
    const durationEl = element.querySelector('.voice-duration');
    const waveformContainer = element.querySelector('.voice-waveform');
    audio.play();
    setPlayingState(element, true);
    startPlaybackAnimation(element, waveformContainer);
    audio.ontimeupdate = () => {
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60);
        if (durationEl) durationEl.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    audio.onended = () => {
        setPlayingState(element, false);
        if (durationEl) durationEl.innerText = "0:00";
        stopPlaybackAnimation(element);
        currentPlayingAudio = null;
        currentPlayingBtn = null;
    };
    currentPlayingAudio = audio;
    currentPlayingBtn = element;
}

let playbackAnimationId = null;
function startPlaybackAnimation(element, waveformContainer) {
    if (!waveformContainer) waveformContainer = element?.querySelector('.voice-waveform');
    if (!waveformContainer) return;
    const bars = waveformContainer.querySelectorAll('.voice-wave-bar');
    if (!bars.length) return;
    const animate = () => {
        if (!currentPlayingAudio || currentPlayingAudio.paused || currentPlayingAudio.ended) {
            stopPlaybackAnimation(element);
            return;
        }
        bars.forEach(bar => {
            const newHeight = Math.floor(Math.random() * 20 + 4);
            bar.style.height = `${newHeight}px`;
        });
        playbackAnimationId = requestAnimationFrame(animate);
    };
    if (playbackAnimationId) cancelAnimationFrame(playbackAnimationId);
    animate();
}

function stopPlaybackAnimation(element) {
    if (playbackAnimationId) {
        cancelAnimationFrame(playbackAnimationId);
        playbackAnimationId = null;
    }
    const waveformContainer = element?.querySelector('.voice-waveform');
    if (waveformContainer) {
        const bars = waveformContainer.querySelectorAll('.voice-wave-bar');
        bars.forEach(bar => bar.style.height = '8px');
    }
}

function setPlayingState(element, isPlaying) {
    const playIcon = element.querySelector('.play-icon');
    if (isPlaying) {
        element.classList.add('voice-playing');
        if (playIcon) playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    } else {
        element.classList.remove('voice-playing');
        if (playIcon) playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
    }
}

export function stopAllVoice() {
    if (currentPlayingAudio) {
        currentPlayingAudio.pause();
        currentPlayingAudio = null;
    }
    if (currentPlayingBtn) {
        setPlayingState(currentPlayingBtn, false);
        stopPlaybackAnimation(currentPlayingBtn);
        currentPlayingBtn = null;
    }
    if (playbackAnimationId) {
        cancelAnimationFrame(playbackAnimationId);
        playbackAnimationId = null;
    }
}
