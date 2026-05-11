// ==================== MRDEV BUILD SCRIPT ====================
// Vercel build vaqtida ishga tushadi va barcha env o'zgaruvchilardan
// env.js faylini yaratadi. Bu fayl barcha HTML sahifalarda yuklanadi.
// Vercel → Settings → Environment Variables dan kalitlar o'qiladi.

const fs   = require('fs');
const path = require('path');

const E = process.env;

// ==================== TEKSHIRISH ====================
const REQUIRED = [
    'VITE_MAIN_API_KEY',
    'VITE_MAIN_PROJECT_ID',
    'VITE_SECONDARY_API_KEY',
    'VITE_SECONDARY_PROJECT_ID',
    'VITE_GROUPBOARD_API_KEY',
    'VITE_GROUPBOARD_PROJECT_ID',
];

const missing = REQUIRED.filter(k => !E[k]);
if (missing.length) {
    console.error('❌ Quyidagi env o\'zgaruvchilar Vercel da topilmadi:');
    missing.forEach(k => console.error('   -', k));
    console.error('Vercel → Project Settings → Environment Variables ga kiring.');
    process.exit(1);
}

// ==================== ENV.JS YARATISH ====================
const envContent = `// Bu fayl build.js tomonidan avtomatik yaratiladi.
// HECH QACHON bu faylni GitHub ga push qilmang! (.gitignore ga qo'shing)
// Yaratilgan vaqt: ${new Date().toISOString()}

window.__ENV__ = {
    MAIN_API_KEY:             "${E.VITE_MAIN_API_KEY             || ''}",
    MAIN_AUTH_DOMAIN:         "${E.VITE_MAIN_AUTH_DOMAIN         || ''}",
    MAIN_DATABASE_URL:        "${E.VITE_MAIN_DATABASE_URL        || ''}",
    MAIN_PROJECT_ID:          "${E.VITE_MAIN_PROJECT_ID          || ''}",
    MAIN_STORAGE_BUCKET:      "${E.VITE_MAIN_STORAGE_BUCKET      || ''}",
    MAIN_MESSAGING_SENDER_ID: "${E.VITE_MAIN_MESSAGING_SENDER_ID || ''}",
    MAIN_APP_ID:              "${E.VITE_MAIN_APP_ID              || ''}",
    MAIN_MEASUREMENT_ID:      "${E.VITE_MAIN_MEASUREMENT_ID      || ''}",

    SECONDARY_API_KEY:             "${E.VITE_SECONDARY_API_KEY             || ''}",
    SECONDARY_AUTH_DOMAIN:         "${E.VITE_SECONDARY_AUTH_DOMAIN         || ''}",
    SECONDARY_DATABASE_URL:        "${E.VITE_SECONDARY_DATABASE_URL        || ''}",
    SECONDARY_PROJECT_ID:          "${E.VITE_SECONDARY_PROJECT_ID          || ''}",
    SECONDARY_STORAGE_BUCKET:      "${E.VITE_SECONDARY_STORAGE_BUCKET      || ''}",
    SECONDARY_MESSAGING_SENDER_ID: "${E.VITE_SECONDARY_MESSAGING_SENDER_ID || ''}",
    SECONDARY_APP_ID:              "${E.VITE_SECONDARY_APP_ID              || ''}",
    SECONDARY_MEASUREMENT_ID:      "${E.VITE_SECONDARY_MEASUREMENT_ID      || ''}",

    GROUPBOARD_API_KEY:             "${E.VITE_GROUPBOARD_API_KEY             || ''}",
    GROUPBOARD_AUTH_DOMAIN:         "${E.VITE_GROUPBOARD_AUTH_DOMAIN         || ''}",
    GROUPBOARD_DATABASE_URL:        "${E.VITE_GROUPBOARD_DATABASE_URL        || ''}",
    GROUPBOARD_PROJECT_ID:          "${E.VITE_GROUPBOARD_PROJECT_ID          || ''}",
    GROUPBOARD_STORAGE_BUCKET:      "${E.VITE_GROUPBOARD_STORAGE_BUCKET      || ''}",
    GROUPBOARD_MESSAGING_SENDER_ID: "${E.VITE_GROUPBOARD_MESSAGING_SENDER_ID || ''}",
    GROUPBOARD_APP_ID:              "${E.VITE_GROUPBOARD_APP_ID              || ''}",
    GROUPBOARD_MEASUREMENT_ID:      "${E.VITE_GROUPBOARD_MEASUREMENT_ID      || ''}",

    SUPABASE_URL: "${E.VITE_SUPABASE_URL || ''}",
    SUPABASE_KEY: "${E.VITE_SUPABASE_KEY || ''}",

    APP_NAME:          "${E.VITE_APP_NAME          || 'MRDEV'}",
    APP_VERSION:       "${E.VITE_APP_VERSION       || '6.0'}",
    APP_DEFAULT_THEME: "${E.VITE_APP_DEFAULT_THEME || 'dark'}"
};
`;

fs.writeFileSync(path.join(__dirname, 'env.js'), envContent, 'utf8');

// ==================== HTML FAYLLARNI TOPISH ====================
function getAllHtmlFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            getAllHtmlFiles(fullPath, files);
        } else if (item.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

// ==================== HTML LARGA ENV.JS QOSHISH ====================
const ROOT = __dirname;
const htmlFiles = getAllHtmlFiles(ROOT);

let injected = 0;
let skipped  = 0;

for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('src="/env.js"') || html.includes("src='/env.js'")) {
        skipped++;
        continue;
    }

    if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>\n    <script src="/env.js"></script>');
        fs.writeFileSync(filePath, html, 'utf8');
        injected++;
    }
}

// ==================== BUILD NATIJA ====================
// Hammasi console.log o'rniga return
module.exports = {
    injected,
    skipped,
    envVars: Object.keys(E).filter(k => k.startsWith('VITE_')).length
};
