import { supabase, BUCKET } from "./supabase-config.js";
import { showToast } from "./ui-helpers.js";

let loadingToast = null;

function showLoadingToast(text = "Yuklanmoqda...") {
    if (loadingToast) {
        loadingToast.remove();
        loadingToast = null;
    }
    loadingToast = document.createElement('div');
    loadingToast.id = 'loadingToast';
    loadingToast.className = 'loading-toast';
    loadingToast.innerHTML = `
        <div class="loading-spinner-small"></div>
        <div class="loading-text">${text}</div>
        <div class="loading-percent">0%</div>
    `;
    document.body.appendChild(loadingToast);
}

function updateLoadingToast(percent, text = null) {
    if (loadingToast) {
        const percentEl = loadingToast.querySelector('.loading-percent');
        if (percentEl) percentEl.innerText = `${Math.round(percent)}%`;
        if (text) {
            const textEl = loadingToast.querySelector('.loading-text');
            if (textEl) textEl.innerText = text;
        }
    }
}

function hideLoadingToast() {
    if (loadingToast) {
        loadingToast.remove();
        loadingToast = null;
    }
}

export async function uploadToSupabase(file, typePrefix) {
    const ext = file.name.split('.').pop();
    const fileName = `${typePrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
    });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

// Avatar (profil rasmi) yuklash
export async function uploadAvatar(file) {
    if (file.size > 5 * 1024 * 1024) {
        throw new Error("Rasm hajmi 5MB dan katta bo'lmasligi kerak");
    }
    
    showLoadingToast("Rasm yuklanmoqda...");
    try {
        const ext = file.name.split('.').pop();
        const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        
        const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });
        
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        const url = publicUrlData.publicUrl;
        
        updateLoadingToast(100, "Rasm tayyor!");
        setTimeout(() => hideLoadingToast(), 800);
        return url;
    } catch (err) {
        hideLoadingToast();
        throw err;
    }
}

export async function uploadImage(file) {
    if (file.size > 10 * 1024 * 1024) {
        showToast("Rasm hajmi 10MB dan katta bo'lmasligi kerak");
        return null;
    }
    showLoadingToast("Rasm yuklanmoqda...");
    try {
        const url = await uploadToSupabase(file, "images");
        updateLoadingToast(100, "Rasm tayyor!");
        setTimeout(() => hideLoadingToast(), 800);
        showToast("Rasm yuklandi");
        return url;
    } catch (err) {
        hideLoadingToast();
        showToast("Rasm yuklashda xatolik: " + err.message);
        return null;
    }
}

export async function uploadVideo(file, onProgress) {
    if (file.size > 100 * 1024 * 1024) {
        showToast("Video hajmi 100MB dan katta bo'lmasligi kerak");
        return null;
    }
    showLoadingToast("Video yuklanmoqda...");
    try {
        const ext = file.name.split('.').pop();
        const fileName = `videos/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

        if (error) throw error;

        // Progress simulyatsiyasi
        if (onProgress) {
            let percent = 0;
            const interval = setInterval(() => {
                if (percent < 90) {
                    percent += 10;
                    onProgress(percent);
                    updateLoadingToast(percent);
                }
            }, 150);
            setTimeout(() => {
                clearInterval(interval);
                onProgress(100);
                updateLoadingToast(100);
            }, 1500);
        } else {
            updateLoadingToast(100);
        }

        const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        const url = publicUrlData.publicUrl;

        updateLoadingToast(100, "Video tayyor!");
        setTimeout(() => hideLoadingToast(), 800);
        showToast("Video yuklandi");
        return url;
    } catch (err) {
        hideLoadingToast();
        showToast("Video yuklashda xatolik: " + err.message);
        return null;
    }
}

export async function uploadAudio(blob) {
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
    showLoadingToast("Ovoz yuklanmoqda...");
    try {
        const url = await uploadToSupabase(file, "audio");
        updateLoadingToast(100, "Ovoz tayyor!");
        setTimeout(() => hideLoadingToast(), 800);
        showToast("Ovoz yuklandi");
        return url;
    } catch (err) {
        hideLoadingToast();
        showToast("Ovoz yuklashda xatolik: " + err.message);
        return null;
    }
}

export { showLoadingToast, hideLoadingToast, updateLoadingToast };
