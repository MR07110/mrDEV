// js/ai-modal.js - UNIVERSAL (barcha sahifalar uchun)
(function() {
    // Modal yaratish
    function createAIModal() {
        if (document.getElementById('aiModalOverlay')) return;
        
        const modalHTML = `
            <div id="aiModalOverlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); z-index: 100000; opacity: 0; visibility: hidden; transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1); display: flex; align-items: center; justify-content: center;">
                <div id="aiModalContainer" style="width: 90%; max-width: 500px; height: 80vh; max-height: 650px; background: transparent; border-radius: 32px; transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1); overflow: hidden; box-shadow: 0 32px 64px rgba(0,0,0,0.3);">
                    <iframe id="aiModalIframe" src="ai.html" style="width: 100%; height: 100%; border: none; background: #ffffff; border-radius: 32px;"></iframe>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Floating tugma mavjudligini tekshirish
    function ensureFloatingButton() {
        let btn = document.getElementById('floatingAiBtn');
        if (!btn) {
            const btnHTML = `
                <button id="floatingAiBtn" style="position: fixed; bottom: 90px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #007aff, #0056b3); box-shadow: 0 8px 24px rgba(0,122,255,0.4); border: none; cursor: pointer; z-index: 9999; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); animation: aiFloatPulse 2s ease-in-out infinite;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>
                    </svg>
                </button>
                <style>
                    @keyframes aiFloatPulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                    #floatingAiBtn:hover { transform: scale(1.1); box-shadow: 0 12px 32px rgba(0,122,255,0.6); }
                    @media (max-width: 768px) { #floatingAiBtn { bottom: 80px; right: 16px; width: 48px; height: 48px; } }
                </style>
            `;
            document.body.insertAdjacentHTML('beforeend', btnHTML);
        }
    }

    function openAIModal() {
        const overlay = document.getElementById('aiModalOverlay');
        const container = document.getElementById('aiModalContainer');
        if (overlay && container) {
            overlay.style.visibility = 'visible';
            overlay.style.opacity = '1';
            container.style.transform = 'scale(1)';
        }
    }

    function closeAIModal() {
        const overlay = document.getElementById('aiModalOverlay');
        const container = document.getElementById('aiModalContainer');
        if (overlay && container) {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            container.style.transform = 'scale(0.95)';
        }
    }

    // Iframe dan yopish xabari
    window.addEventListener('message', (e) => {
        if (e.data === 'closeAIModal') closeAIModal();
    });

    // Escape tugmasi
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAIModal();
    });

    function initAIModal() {
        createAIModal();
        ensureFloatingButton();
        
        const btn = document.getElementById('floatingAiBtn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', openAIModal);
        }
        
        const overlay = document.getElementById('aiModalOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeAIModal();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIModal);
    } else {
        initAIModal();
    }
})();
