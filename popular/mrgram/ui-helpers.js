export function showToast(msg) {
    let toast = document.getElementById('customToast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = 'position:fixed; bottom:100px; left:20px; right:20px; background:#1c1c1e; color:white; text-align:center; padding:14px; border-radius:30px; z-index:10000; backdrop-filter:blur(20px); border:1px solid var(--accent); transition:0.3s; opacity:0;';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

export function escapeHtml(str) {
    if(!str) return "";
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

export function viewFullImage(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:100000; display:flex; align-items:center; justify-content:center; cursor:pointer;';
    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.borderRadius = '24px';
    img.style.objectFit = 'contain';
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}
