import { uploadImage, uploadVideo, uploadAudio } from "./upload-file.js";
import { setPendingImage, setPendingVoice, setPendingVideo, clearPendingMedia } from "./messages.js";
import { showToast } from "./ui-helpers.js";
import { clearEditing } from "./messages.js";

export function initMediaPreviews() {
    // Yagona file upload tugmasi (clip)
    const fileUploadBtn = document.getElementById('fileUploadBtn');
    if (fileUploadBtn) fileUploadBtn.onclick = () => triggerFileUpload();
    
    // Preview cancel tugmalari
    const cancelImage = document.getElementById('cancelImagePreview');
    if (cancelImage) cancelImage.onclick = () => clearImagePreview();
    
    const cancelVideo = document.getElementById('cancelVideoPreview');
    if (cancelVideo) cancelVideo.onclick = () => clearVideoPreview();
    
    const cancelVoice = document.getElementById('cancelVoicePreview');
    if (cancelVoice) cancelVoice.onclick = () => clearVoicePreview();
}

// Bitta fayl tanlash – rasm yoki video
async function triggerFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*'; // ham rasm, ham video
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Fayl turini aniqlash
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            showToast("Faqat rasm yoki video yuklash mumkin!");
            return;
        }
        
        try {
            if (isImage) {
                // Rasm yuklash
                const url = await uploadImage(file);
                if (url) {
                    setPendingImage(url);
                    const previewPanel = document.getElementById('imagePreviewPanel');
                    const previewImg = document.getElementById('previewImg');
                    const fileNameSpan = document.getElementById('previewFileName');
                    if (previewPanel) previewPanel.style.display = 'flex';
                    if (previewImg) previewImg.src = url;
                    if (fileNameSpan) fileNameSpan.innerText = file.name;
                }
            } else if (isVideo) {
                // Video yuklash
                showToast(`Video tanlandi: ${file.name}`);
                const previewPanel = document.getElementById('videoPreviewPanel');
                const videoPreview = document.getElementById('videoPreview');
                
                if (previewPanel) {
                    previewPanel.style.display = 'flex';
                    const loadingDiv = document.createElement('div');
                    loadingDiv.id = 'videoLoadingSpinner';
                    loadingDiv.className = 'video-loading-spinner';
                    loadingDiv.innerHTML = '<div class="spinner-small"></div><span>Yuklanmoqda...</span>';
                    previewPanel.appendChild(loadingDiv);
                }
                
                const url = await uploadVideo(file, (percent) => {
                    const loadingDiv = document.getElementById('videoLoadingSpinner');
                    if (loadingDiv) {
                        loadingDiv.innerHTML = `<div class="spinner-small"></div><span>Yuklanmoqda: ${Math.round(percent)}%</span>`;
                    }
                });
                
                if (url) {
                    setPendingVideo(url);
                    if (videoPreview) {
                        videoPreview.src = url;
                        videoPreview.load();
                    }
                    const loadingDiv = document.getElementById('videoLoadingSpinner');
                    if (loadingDiv) loadingDiv.remove();
                    showToast("Video tayyor! Yuborishingiz mumkin");
                }
            }
        } catch (err) {
            showToast("Xatolik: " + err.message);
            // Xatolik bo‘lsa preview panellarini yopish
            if (isImage) clearImagePreview();
            if (isVideo) {
                const loadingDiv = document.getElementById('videoLoadingSpinner');
                if (loadingDiv) loadingDiv.remove();
                const previewPanel = document.getElementById('videoPreviewPanel');
                if (previewPanel) previewPanel.style.display = 'none';
            }
        }
    };
    input.click();
}

export function setVoicePreviewFromBlob(blob, url) {
    setPendingVoice(url);
    const voicePanel = document.getElementById('voicePreviewPanel');
    const voiceAudio = document.getElementById('voicePreviewAudio');
    if (voicePanel) voicePanel.style.display = 'flex';
    if (voiceAudio) voiceAudio.src = url;
}
function clearImagePreview() {
    setPendingImage(null);
    const previewPanel = document.getElementById('imagePreviewPanel');
    const previewImg = document.getElementById('previewImg');
    if(previewPanel) previewPanel.style.display = 'none';
    if(previewImg) previewImg.src = '';
    clearEditing(); // Tahrirlash rejimini tozalash
}

function clearVideoPreview() {
    setPendingVideo(null);
    const previewPanel = document.getElementById('videoPreviewPanel');
    const videoPreview = document.getElementById('videoPreview');
    if (previewPanel) previewPanel.style.display = 'none';
    if (videoPreview) videoPreview.src = '';
    const loadingDiv = document.getElementById('videoLoadingSpinner');
    if (loadingDiv) loadingDiv.remove();
}

function clearVoicePreview() {
    setPendingVoice(null);
    const voicePanel = document.getElementById('voicePreviewPanel');
    const voiceAudio = document.getElementById('voicePreviewAudio');
    if (voicePanel) voicePanel.style.display = 'none';
    if (voiceAudio) voiceAudio.src = '';
}
