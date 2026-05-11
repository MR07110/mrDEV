// js/donate-modal.js - Donate modal uchun universal script
(function() {
    // Donate modal HTML yaratish
    function createDonateModal() {
        if (document.getElementById('donateModal')) return;
        
        const modalHTML = `
            <div class="donate-modal" id="donateModal">
                <div class="donate-modal-overlay" id="donateModalClose"></div>
                <div class="donate-modal-container card-only">
                    <div class="card-3d-container">
                        <div class="card-3d">
                            <div class="card-shine"></div>
                            <div class="card-watermark">VISA</div>
                            <div class="card-bank-name">MR BOARD</div>
                            <div class="card-chip-area">
                                <div class="card-chip"></div>
                                <div class="card-contactless">)))</div>
                            </div>
                            <div class="card-number">8600 1234 5678 9012</div>
                            <div class="card-footer">
                                <div class="card-holder-name">MUHAMMADRASUL QOSIMOV</div>
                                <div class="card-expiry-box">
                                    <span class="expiry-label">Valid Thru</span>
                                    <span class="expiry-date">12/28</span>
                                </div>
                                <div class="card-visa-logo">VISA</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .donate-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    visibility: hidden;
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .donate-modal.is-visible {
                    visibility: visible;
                    opacity: 1;
                }
                .donate-modal-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    cursor: pointer;
                }
                .donate-modal-container.card-only {
                    position: relative;
                    width: auto;
                    background: transparent;
                    box-shadow: none;
                    padding: 0;
                    transform: scale(0.9);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .donate-modal.is-visible .donate-modal-container.card-only {
                    transform: scale(1);
                }
                .card-3d-container {
                    width: 450px;
                    height: 284px;
                    transform-style: preserve-3d;
                    animation: autoRotateCard 8s ease-in-out infinite;
                    cursor: pointer;
                }
                @keyframes autoRotateCard {
                    0% { transform: rotateY(-15deg) rotateX(10deg); }
                    50% { transform: rotateY(15deg) rotateX(-10deg); }
                    100% { transform: rotateY(-15deg) rotateX(10deg); }
                }
                .card-3d {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #007aff, #0056b3);
                    border-radius: 20px;
                    padding: 25px;
                    color: white;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255,255,255,0.2);
                }
                .card-shine {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
                    animation: moveShine 4s linear infinite;
                    pointer-events: none;
                }
                @keyframes moveShine {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(150%); }
                }
                .card-watermark {
                    position: absolute;
                    top: -40px;
                    right: -20px;
                    font-family: "Times New Roman", Times, serif;
                    font-size: 220px;
                    font-weight: 900;
                    font-style: italic;
                    color: rgba(255, 255, 255, 0.08);
                    letter-spacing: -12px;
                    pointer-events: none;
                }
                .card-bank-name {
                    font-family: Arial, sans-serif;
                    font-size: 24px;
                    font-weight: 800;
                }
                .card-chip-area {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    margin: 25px 0;
                }
                .card-chip {
                    width: 58px;
                    height: 42px;
                    background: linear-gradient(135deg, #f1c40f, #d4af37, #f1c40f);
                    border-radius: 8px;
                    border: 0.5px solid rgba(0,0,0,0.2);
                }
                .card-contactless {
                    transform: rotate(90deg);
                    font-size: 20px;
                    color: rgba(255,255,255,0.5);
                    font-family: sans-serif;
                }
                .card-number {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 28px;
                    letter-spacing: 2px;
                    margin-bottom: 20px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                .card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .card-holder-name {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 16px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .card-expiry-box {
                    text-align: center;
                    margin-right: 30px;
                }
                .expiry-label {
                    display: block;
                    font-size: 7px;
                    font-family: Arial;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .expiry-date {
                    font-size: 16px;
                    font-weight: bold;
                }
                .card-visa-logo {
                    font-family: "Times New Roman", Times, serif;
                    font-size: 42px;
                    font-weight: 900;
                    font-style: italic;
                    letter-spacing: -2px;
                    line-height: 0.8;
                }
                @media (max-width: 768px) {
                    .card-3d-container {
                        width: 320px;
                        height: 202px;
                    }
                    .card-bank-name { font-size: 18px; }
                    .card-chip-area { margin: 15px 0; }
                    .card-chip { width: 42px; height: 30px; }
                    .card-number { font-size: 20px; letter-spacing: 1px; margin-bottom: 12px; }
                    .card-holder-name { font-size: 11px; }
                    .expiry-date { font-size: 12px; }
                    .card-visa-logo { font-size: 30px; }
                    .card-watermark { font-size: 150px; top: -20px; right: -10px; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Floating donate button yaratish (agar mavjud bo'lmasa)
    function createDonateButton() {
        if (document.getElementById('floatingDonateBtn')) return;
        
        const btnHTML = `
            <div class="floating-donate" id="floatingDonateBtn">
                <button class="donate-float-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 640 640" fill="white">
                        <path d="M502.1 295.3C502.1 295.3 509.7 332.5 511.4 340.3L478 340.3C481.3 331.4 494 296.8 494 296.8C493.8 297.1 497.3 287.7 499.3 281.9L502.1 295.3zM608 144L608 496C608 522.5 586.5 544 560 544L80 544C53.5 544 32 522.5 32 496L32 144C32 117.5 53.5 96 80 96L560 96C586.5 96 608 117.5 608 144zM184.5 395.2L247.7 240L205.2 240L165.9 346L161.6 324.5L147.6 253.1C145.3 243.2 138.2 240.4 129.4 240L64.7 240L64 243.1C79.8 247.1 93.9 252.9 106.2 260.2L142 395.2L184.5 395.2zM278.9 395.4L304.1 240L263.9 240L238.8 395.4L278.9 395.4zM418.8 344.6C419 326.9 408.2 313.4 385.1 302.3C371 295.2 362.4 290.4 362.4 283.1C362.6 276.5 369.7 269.7 385.5 269.7C398.6 269.4 408.2 272.5 415.4 275.6L419 277.3L424.5 243.7C416.6 240.6 404 237.1 388.5 237.1C348.8 237.1 320.9 258.3 320.7 288.5C320.4 310.8 340.7 323.2 355.9 330.7C371.4 338.3 376.7 343.3 376.7 350C376.5 360.4 364.1 365.2 352.6 365.2C336.6 365.2 328 362.7 314.9 356.9L309.6 354.4L304 389.3C313.4 393.6 330.8 397.4 348.8 397.6C391 397.7 418.5 376.8 418.8 344.6zM560 395.4L527.6 240L496.5 240C486.9 240 479.6 242.8 475.5 252.9L415.8 395.4L458 395.4C458 395.4 464.9 376.2 466.4 372.1L518 372.1C519.2 377.6 522.8 395.4 522.8 395.4L560 395.4z"/>
                    </svg>
                </button>
            </div>
            <style>
                .floating-donate {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 1000;
                    cursor: pointer;
                    animation: floatPulse 2s ease-in-out infinite;
                }
                .donate-float-btn {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #34c759, #2b8c3e);
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 24px rgba(52,199,89,0.4);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer;
                }
                .donate-float-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 32px rgba(52,199,89,0.6);
                }
                .donate-float-btn svg {
                    width: 32px;
                    height: 32px;
                    animation: heartbeat 1.2s ease-in-out infinite;
                }
                @keyframes floatPulse {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes heartbeat {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                }
                @media (max-width: 768px) {
                    .floating-donate { bottom: 16px; right: 16px; }
                    .donate-float-btn { width: 56px; height: 56px; }
                    .donate-float-btn svg { width: 28px; height: 28px; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', btnHTML);
    }

    function openDonateModal() {
        const modal = document.getElementById('donateModal');
        if (modal) modal.classList.add('is-visible');
    }

    function closeDonateModal() {
        const modal = document.getElementById('donateModal');
        if (modal) modal.classList.remove('is-visible');
    }

    // Event listenerlar
    function setupDonateEvents() {
        // Tugma bosilganda modal ochish
        const btn = document.getElementById('floatingDonateBtn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', openDonateModal);
        }
        
        // Modal yopish (overlay)
        const closeBtn = document.getElementById('donateModalClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeDonateModal);
        }
        
        // Modal ustiga bosganda yopish
        const modal = document.getElementById('donateModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeDonateModal();
            });
        }
        
        // Escape tugmasi
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDonateModal();
        });
    }

    // Initialize
    function initDonateModal() {
        createDonateModal();
        createDonateButton();
        setupDonateEvents();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDonateModal);
    } else {
        initDonateModal();
    }
})();
