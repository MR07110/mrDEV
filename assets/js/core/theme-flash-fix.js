// ==================== MRDEV THEME FLASH FIX v2.1 ====================
(function() {
    'use strict';

    const theme = localStorage.getItem('theme') || 'dark';

    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    const bgColor = theme === 'dark' ? '#1f1f1f' : '#f8fafd';
    document.documentElement.style.backgroundColor = bgColor;
    document.documentElement.style.setProperty('background-color', bgColor, 'important');

    document.documentElement.style.visibility = 'hidden';

    const style = document.createElement('style');
    style.id = 'flash-fix-style';
    style.textContent = `
        *, *::before, *::after {
            transition: none !important;
            animation: none !important;
        }
    `;
    document.head.appendChild(style);

    function revealPage() {
        const fixStyle = document.getElementById('flash-fix-style');
        if (fixStyle) fixStyle.remove();

        document.documentElement.style.backgroundColor = '';
        document.documentElement.style.removeProperty('background-color');
        document.documentElement.style.visibility = '';
        document.documentElement.style.opacity = '0';
        document.documentElement.style.transition = 'opacity 0.15s ease-out';

        requestAnimationFrame(function() {
            document.documentElement.style.opacity = '1';
        });

        setTimeout(function() {
            document.documentElement.style.transition = '';
            document.documentElement.style.opacity = '';
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', revealPage);
    } else {
        revealPage();
    }
})();
