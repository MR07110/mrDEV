/* ============================================
   MR TYPE - script.js
   Monkeytype Style with Center Caret
   MRDEV ekotizimiga to'liq integratsiya
   ============================================ */

let audioCtx = null;
let currentSound = 'blue';

let gameState = {
  words: [],
  curWord: 0,
  typedBuf: '',
  extraChars: '',
  isRunning: false,
  isFinished: false,
  startTime: 0,
  totalKeys: 0,
  correctKeys: 0,
  wrongKeys: 0,
  wordsCompleted: 0,
  timerInt: null,
  errorMap: {},
  wordTyped: []
};

let settings = {
  mode: 'time',
  duration: 30,
  wordsGoal: 50,
  lang: 'en',
  theme: 'default',
  showKeyboard: true,
  soundEnabled: true,
  smoothCaret: true,
  zenMode: false,
  fontSize: '1.5rem',
  fontHeight: '2rem'
};

let userHistory = [];
let userName = 'mrtype user';

const dom = {
  wordsContainer: document.getElementById('wordsContainer'),
  typingArea: document.getElementById('typingArea'),
  hiddenInput: document.getElementById('hiddenInput'),
  caret: document.getElementById('caret'),
  liveWpm: document.getElementById('liveWpm'),
  liveAcc: document.getElementById('liveAcc'),
  liveTimer: document.getElementById('liveTimer'),
  timerLabel: document.getElementById('timerLabel'),
  liveWords: document.getElementById('liveWords'),
  progressFill: document.getElementById('progressFill'),
  progressPercent: document.getElementById('progressPercent'),
  subOptions: document.getElementById('subOptions'),
  keyboardSection: document.getElementById('keyboardSection'),
  rankName: document.getElementById('rankName'),
  rankStars: document.getElementById('rankStars'),
  rankNext: document.getElementById('rankNext'),
  toastContainer: document.getElementById('toastContainer'),
  soundName: document.getElementById('soundName')
};

let wordSpans = [];
let currentWordSpan = null;

// ============ UTILITIES ============
function playSound(type) {
  if (!settings.soundEnabled) return;
  
  if (!audioCtx) {
    try { 
      audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
    } catch(e) { 
      return; 
    }
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => playSoundInternal(type));
    return;
  }
  
  playSoundInternal(type);
}

function playSoundInternal(type) {
  const sound = SOUNDS[currentSound];
  if (!sound) return;
  
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.value = type === 'correct' ? sound.correct : sound.error;
    osc.type = sound.type;
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.dur);
    
    osc.start(now);
    osc.stop(now + sound.dur);
  } catch(e) {}
}

function highlightKey(key, status) {
  const el = document.querySelector(`.type-key[data-key="${key}"]`);
  if (!el) return;
  el.classList.remove('pressed', 'pressed-correct', 'pressed-error');
  if (status === 'press') el.classList.add('pressed');
  else if (status === 'correct') el.classList.add('pressed-correct');
  else if (status === 'error') el.classList.add('pressed-error');
  setTimeout(() => el.classList.remove('pressed', 'pressed-correct', 'pressed-error'), 60);
}

function getRank(wpm) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (wpm >= RANKS[i].min) return RANKS[i];
  }
  return RANKS[0];
}

function updateRankBadge() {
  const best = userHistory.length ? Math.max(...userHistory.map(h => h.wpm)) : 0;
  const rank = getRank(best);
  dom.rankName.textContent = rank.name;
  dom.rankStars.textContent = '★'.repeat(rank.stars) + '☆'.repeat(5 - rank.stars);
  dom.rankNext.textContent = rank.next ? `Keyingi: ${rank.next} WPM` : 'Maksimal daraja';
}

function generateWords() {
  if (settings.mode === 'quote') return [];
  if (settings.mode === 'dev') return [...DEV_WORDS];
  if (settings.mode === 'custom') return [''];
  const pool = WORD_POOLS[settings.lang] || WORD_POOLS.en;
  const needed = settings.mode === 'words' ? settings.wordsGoal + 20 : 60;
  return Array.from({ length: needed }, () => pool[Math.floor(Math.random() * pool.length)]);
}

function generateQuote() {
  const pool = QUOTES[settings.lang] || QUOTES.en;
  return pool[Math.floor(Math.random() * pool.length)].split(' ');
}

// ============ RENDER ENGINE ============
function renderWords() {
  const words = gameState.words;
  const curWord = gameState.curWord;

  if (wordSpans.length !== words.length) {
    dom.wordsContainer.innerHTML = '';
    wordSpans = [];
    for (let i = 0; i < words.length; i++) {
      const span = document.createElement('span');
      span.className = 'type-word';
      if (i === curWord) span.classList.add('current-word');
      dom.wordsContainer.appendChild(span);
      wordSpans[i] = span;
    }
    currentWordSpan = wordSpans[curWord];
  }

  for (let i = 0; i < curWord; i++) {
    const span = wordSpans[i];
    if (!span.classList.contains('completed')) {
      const typed = gameState.wordTyped?.[i] || '';
      const original = words[i];
      span.textContent = typed === original ? original : typed;
      span.classList.add(typed === original ? 'word-correct' : 'word-incorrect', 'completed');
      span.classList.remove('current-word');
    }
  }

  if (currentWordSpan) {
    if (settings.mode === 'custom') {
      const typed = gameState.typedBuf;
      let html = '';
      for (let i = 0; i < typed.length; i++) {
        html += `<span class="type-char char-correct">${typed[i] === ' ' ? '&nbsp;' : typed[i]}</span>`;
      }
      html += '<span class="type-char char-pending">&nbsp;</span>';
      if (currentWordSpan.innerHTML !== html) currentWordSpan.innerHTML = html;
    } else {
      const word = words[curWord];
      const typed = gameState.typedBuf;
      const extra = gameState.extraChars;
      let html = '';
      for (let i = 0; i < word.length; i++) {
        let cls = 'type-char';
        if (i < typed.length) {
          cls += typed[i] === word[i] ? ' char-correct' : ' char-incorrect';
        } else {
          cls += ' char-pending';
        }
        html += `<span class="${cls}">${word[i]}</span>`;
      }
      for (let i = 0; i < extra.length; i++) {
        html += `<span class="type-char char-extra">${extra[i]}</span>`;
      }
      if (currentWordSpan.innerHTML !== html) currentWordSpan.innerHTML = html;
    }
  }

  for (let i = curWord + 1; i < Math.min(curWord + 30, words.length); i++) {
    const span = wordSpans[i];
    if (span.textContent !== words[i]) {
      span.textContent = words[i];
      span.classList.add('word-future');
    }
  }

  updateCaret();
}

function updateCurrentWordDisplayFast() {
  if (!currentWordSpan) return;

  if (settings.mode === 'custom') {
    const typed = gameState.typedBuf;
    let html = '';
    for (let i = 0; i < typed.length; i++) {
      html += `<span class="type-char char-correct">${typed[i] === ' ' ? '&nbsp;' : typed[i]}</span>`;
    }
    html += '<span class="type-char char-pending">&nbsp;</span>';
    if (currentWordSpan.innerHTML !== html) currentWordSpan.innerHTML = html;
    return;
  }

  const word = gameState.words[gameState.curWord];
  if (!word) return;

  const typed = gameState.typedBuf;
  const extra = gameState.extraChars;
  let html = '';
  for (let i = 0; i < word.length; i++) {
    let cls = 'type-char';
    if (i < typed.length) {
      cls += typed[i] === word[i] ? ' char-correct' : ' char-incorrect';
    } else {
      cls += ' char-pending';
    }
    html += `<span class="${cls}">${word[i]}</span>`;
  }
  for (let i = 0; i < extra.length; i++) {
    html += `<span class="type-char char-extra">${extra[i]}</span>`;
  }
  if (currentWordSpan.innerHTML !== html) currentWordSpan.innerHTML = html;
}

// ============ CARET ============
function updateCaret() {
  if (!currentWordSpan) {
    dom.caret.style.opacity = '0';
    return;
  }
  
  const word = gameState.words[gameState.curWord];
  if (!word) {
    dom.caret.style.opacity = '0';
    return;
  }
  
  const chars = currentWordSpan.querySelectorAll('.type-char');
  const typedLen = gameState.typedBuf.length;
  
  let targetChar = null;
  const aheadIndex = typedLen;
  
  if (aheadIndex < word.length) {
    targetChar = chars[aheadIndex];
  } else if (chars.length > 0) {
    targetChar = chars[chars.length - 1];
  }
  
  if (!targetChar) {
    dom.caret.style.opacity = '0';
    return;
  }
  
  const areaRect = dom.typingArea.getBoundingClientRect();
  const caretTargetLeft = areaRect.width / 2;
  
  const containerRect = dom.wordsContainer.getBoundingClientRect();
  const charRect = targetChar.getBoundingClientRect();
  
  let charOffsetInContainer = charRect.left - containerRect.left;
  
  if (aheadIndex >= word.length) {
    charOffsetInContainer += targetChar.offsetWidth + 6;
  } else {
    charOffsetInContainer -= 6;
  }
  
  const translateX = caretTargetLeft - charOffsetInContainer;
  
  dom.wordsContainer.style.transition = 'transform 0.12s cubic-bezier(0.25, 0.8, 0.25, 1.2)';
  dom.wordsContainer.style.transform = `translateX(${translateX}px)`;
  
  dom.caret.style.left = caretTargetLeft + 'px';
  dom.caret.style.top = (charRect.top - areaRect.top) + 'px';
  dom.caret.style.height = charRect.height + 'px';
  dom.caret.style.width = '3px';
  dom.caret.style.opacity = '1';
}

// ============ GAME CORE ============
function updateStatsDisplay() {
  if (!gameState.isRunning && gameState.startTime === 0) return;

  let wpm = 0;
  if (gameState.isRunning) {
    const elapsed = (Date.now() - gameState.startTime) / 60000;
    wpm = elapsed > 0 ? Math.round((gameState.correctKeys / 5) / elapsed) : 0;
  }
  const acc = gameState.totalKeys === 0 ? 100 : Math.round((gameState.correctKeys / gameState.totalKeys) * 100);

  dom.liveWpm.textContent = wpm;
  dom.liveAcc.textContent = acc + '%';

  if (settings.mode === 'custom') {
    dom.liveTimer.textContent = gameState.isRunning ? Math.floor((Date.now() - gameState.startTime) / 1000) + 's' : '0s';
    dom.liveWords.textContent = `${gameState.typedBuf.length}/∞`;
    return;
  }

  if (settings.mode === 'time') {
    if (gameState.isRunning) {
      const left = Math.max(0, settings.duration - Math.floor((Date.now() - gameState.startTime) / 1000));
      dom.liveTimer.textContent = left;
      const pct = ((settings.duration - left) / settings.duration) * 100;
      if (dom.progressFill) dom.progressFill.style.width = pct + '%';
      if (dom.progressPercent) dom.progressPercent.textContent = Math.round(pct) + '%';
      if (left <= 0) finishGame();
    } else {
      dom.liveTimer.textContent = settings.duration;
    }
  } else if (settings.mode === 'words') {
    dom.liveTimer.textContent = `${gameState.curWord}/${settings.wordsGoal}`;
    const pct = (gameState.curWord / settings.wordsGoal) * 100;
    if (dom.progressFill) dom.progressFill.style.width = pct + '%';
    if (dom.progressPercent) dom.progressPercent.textContent = Math.round(pct) + '%';
    if (gameState.curWord >= settings.wordsGoal && gameState.isRunning) finishGame();
  } else if (settings.mode === 'quote') {
    dom.liveTimer.textContent = `${gameState.curWord}/${gameState.words.length}`;
    const pct = (gameState.curWord / gameState.words.length) * 100;
    if (dom.progressFill) dom.progressFill.style.width = pct + '%';
    if (dom.progressPercent) dom.progressPercent.textContent = Math.round(pct) + '%';
    if (gameState.curWord >= gameState.words.length && gameState.isRunning) finishGame();
  }

  const total = settings.mode === 'words' ? settings.wordsGoal :
                settings.mode === 'quote' ? gameState.words.length : '∞';
  dom.liveWords.textContent = `${gameState.wordsCompleted}/${total}`;
}

function startGame() {
  if (gameState.isRunning) return;
  gameState.isRunning = true;
  gameState.startTime = Date.now();
  if (gameState.timerInt) clearInterval(gameState.timerInt);
  gameState.timerInt = setInterval(() => {
    updateStatsDisplay();
    if (settings.mode === 'time' && Date.now() - gameState.startTime >= settings.duration * 1000) finishGame();
    if (settings.mode === 'words' && gameState.curWord >= settings.wordsGoal && gameState.isRunning) finishGame();
    if (settings.mode === 'quote' && gameState.curWord >= gameState.words.length && gameState.isRunning) finishGame();
  }, 100);
  dom.caret.classList.remove('blink');
}

function finishGame() {
  if (gameState.isFinished) return;
  gameState.isFinished = true;
  gameState.isRunning = false;
  if (gameState.timerInt) clearInterval(gameState.timerInt);

  const elapsed = Date.now() - gameState.startTime;
  const netWpm = elapsed > 0 ? Math.round((gameState.correctKeys / 5) / (elapsed / 60000)) : 0;
  const rawWpm = elapsed > 0 ? Math.round((gameState.totalKeys / 5) / (elapsed / 60000)) : 0;
  const acc = gameState.totalKeys === 0 ? 100 : Math.round((gameState.correctKeys / gameState.totalKeys) * 100);

  const entry = {
    wpm: netWpm, raw: rawWpm, acc: acc,
    words: settings.mode === 'custom' ? Math.round(gameState.correctKeys / 5) : gameState.wordsCompleted,
    time: Math.round(elapsed / 1000), mode: settings.mode, date: Date.now()
  };

  userHistory.unshift(entry);
  if (userHistory.length > 200) userHistory.pop();
  localStorage.setItem('mrtype_history', JSON.stringify(userHistory));
  updateRankBadge();
  showResultModal(entry);
}

function showResultModal(entry) {
  document.getElementById('resultWpm').textContent = entry.wpm;
  document.getElementById('resultStats').innerHTML = `
    <div class="type-result-card"><div class="type-result-card-value" style="color:var(--type-success)">${entry.acc}%</div><div class="type-result-card-label">Aniqlik</div></div>
    <div class="type-result-card"><div class="type-result-card-value" style="color:var(--type-info)">${entry.raw}</div><div class="type-result-card-label">Raw WPM</div></div>
    <div class="type-result-card"><div class="type-result-card-value">${entry.words}</div><div class="type-result-card-label">So'zlar</div></div>
    <div class="type-result-card"><div class="type-result-card-value">${entry.time}s</div><div class="type-result-card-label">Vaqt</div></div>
  `;
  window._lastEntry = entry;
  document.getElementById('resultOverlay').classList.add('open');
}

function fullResetWithNewWords() {
  if (gameState.timerInt) clearInterval(gameState.timerInt);
  gameState.words = settings.mode === 'quote' ? generateQuote() : generateWords();
  gameState.curWord = 0;
  gameState.typedBuf = '';
  gameState.extraChars = '';
  gameState.isRunning = false;
  gameState.isFinished = false;
  gameState.startTime = 0;
  gameState.totalKeys = 0;
  gameState.correctKeys = 0;
  gameState.wrongKeys = 0;
  gameState.wordsCompleted = 0;
  gameState.wordTyped = [];
  wordSpans = [];
  renderWords();
  updateStatsDisplay();
  dom.hiddenInput.value = '';
  dom.hiddenInput.focus();
  dom.typingArea.classList.remove('blurred');
  dom.caret.classList.add('blink');
  dom.caret.style.opacity = '1';
  document.getElementById('resultOverlay').classList.remove('open');
}

function sameWordsRestart() {
  if (settings.mode === 'custom') { fullResetWithNewWords(); return; }
  if (gameState.timerInt) clearInterval(gameState.timerInt);
  gameState.curWord = 0;
  gameState.typedBuf = '';
  gameState.extraChars = '';
  gameState.isRunning = false;
  gameState.isFinished = false;
  gameState.startTime = 0;
  gameState.totalKeys = 0;
  gameState.correctKeys = 0;
  gameState.wrongKeys = 0;
  gameState.wordsCompleted = 0;
  gameState.wordTyped = [];
  for (let i = 0; i < wordSpans.length; i++) {
    const span = wordSpans[i];
    if (!span) continue;
    span.textContent = gameState.words[i];
    span.classList.remove('completed', 'word-correct', 'word-incorrect', 'current-word', 'word-future');
    span.innerHTML = '';
  }
  currentWordSpan = wordSpans[0];
  if (currentWordSpan) currentWordSpan.classList.add('current-word');
  renderWords();
  updateStatsDisplay();
  dom.hiddenInput.value = '';
  dom.hiddenInput.focus();
  dom.typingArea.classList.remove('blurred');
  dom.caret.classList.add('blink');
  dom.caret.style.opacity = '1';
  document.getElementById('resultOverlay').classList.remove('open');
  updateCaret();
}

function handleChar(char) {
  if (gameState.isFinished) return;

  if (settings.mode === 'custom') {
    if (!gameState.isRunning) startGame();
    gameState.totalKeys++;
    gameState.correctKeys++;
    gameState.typedBuf += char;
    playSound('correct');
    highlightKey(char, 'correct');
    updateCurrentWordDisplayFast();
    updateCaret();
    updateStatsDisplay();
    return;
  }

  if (!gameState.isRunning && gameState.typedBuf.length === 0 && char !== ' ') startGame();
  const word = gameState.words[gameState.curWord];
  if (!word) return;
  gameState.totalKeys++;
  if (gameState.typedBuf.length < word.length) {
    const expected = word[gameState.typedBuf.length];
    if (char === expected) { gameState.correctKeys++; gameState.typedBuf += char; playSound('correct'); highlightKey(char, 'correct'); }
    else { gameState.wrongKeys++; gameState.typedBuf += char; playSound('error'); highlightKey(char, 'error'); }
  } else {
    if (gameState.extraChars.length < 15) { gameState.extraChars += char; gameState.wrongKeys++; playSound('error'); highlightKey(char, 'error'); }
  }
  updateCurrentWordDisplayFast();
  updateCaret();
  updateStatsDisplay();
}

function handleBackspace() {
  if (gameState.isFinished) return;

  if (settings.mode === 'custom') {
    if (gameState.typedBuf.length > 0) {
      gameState.typedBuf = gameState.typedBuf.slice(0, -1);
      updateCurrentWordDisplayFast();
      updateCaret();
    }
    return;
  }

  if (gameState.extraChars.length > 0) { gameState.extraChars = gameState.extraChars.slice(0, -1); updateCurrentWordDisplayFast(); updateCaret(); return; }
  if (gameState.typedBuf.length > 0) { gameState.typedBuf = gameState.typedBuf.slice(0, -1); updateCurrentWordDisplayFast(); updateCaret(); }
}

function handleSpace() {
  if (gameState.isFinished) return;

  if (settings.mode === 'custom') {
    if (!gameState.isRunning) startGame();
    gameState.totalKeys++;
    gameState.correctKeys++;
    gameState.typedBuf += ' ';
    highlightKey(' ', 'correct');
    updateCurrentWordDisplayFast();
    updateCaret();
    updateStatsDisplay();
    return;
  }

  if (gameState.typedBuf.length === 0) return;
  if (!gameState.isRunning) startGame();
  const word = gameState.words[gameState.curWord];
  const typed = gameState.typedBuf + gameState.extraChars;
  const isCorrect = typed === word;
  if (isCorrect) gameState.correctKeys++;
  if (!gameState.wordTyped) gameState.wordTyped = [];
  gameState.wordTyped[gameState.curWord] = typed;
  gameState.wordsCompleted++;
  if (wordSpans[gameState.curWord]) {
    wordSpans[gameState.curWord].textContent = isCorrect ? word : typed;
    wordSpans[gameState.curWord].classList.add(isCorrect ? 'word-correct' : 'word-incorrect', 'completed');
    wordSpans[gameState.curWord].classList.remove('current-word');
  }
  gameState.curWord++;
  gameState.typedBuf = '';
  gameState.extraChars = '';
  if (gameState.curWord < wordSpans.length) { currentWordSpan = wordSpans[gameState.curWord]; currentWordSpan.classList.add('current-word'); updateCurrentWordDisplayFast(); }
  updateCaret();
  updateStatsDisplay();
  if (settings.mode === 'words' && gameState.curWord >= settings.wordsGoal) finishGame();
  if (settings.mode === 'quote' && gameState.curWord >= gameState.words.length) finishGame();
}

// ============ SHARE ============
function saveShareAsImage() {
  const entryData = window._lastEntry;
  if (!entryData) return;
  
  const canvas = document.getElementById('shareCanvas');
  const ctx = canvas.getContext('2d');
  const w = 800, h = 600;
  canvas.width = w;
  canvas.height = h;
  
  const styles = getComputedStyle(document.body);
  const bgColor = styles.getPropertyValue('--type-bg').trim() || '#323437';
  const bg2Color = styles.getPropertyValue('--type-bg2').trim() || '#2c2e31';
  const accentColor = styles.getPropertyValue('--type-accent').trim() || '#e2b714';
  const textColor = styles.getPropertyValue('--type-text').trim() || '#d1d0c5';
  const textDimColor = styles.getPropertyValue('--type-text-dim').trim() || '#646669';
  const successColor = styles.getPropertyValue('--type-success').trim() || '#6ddf6d';
  const infoColor = styles.getPropertyValue('--type-info').trim() || '#7eb8f7';
  
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(20, 20, w - 40, h - 40, 20);
  ctx.fill();
  
  const wpm = entryData.wpm;
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 100px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText(wpm, w / 2, 180);
  
  ctx.fillStyle = textDimColor;
  ctx.font = '14px "JetBrains Mono"';
  ctx.fillText('WORDS PER MINUTE', w / 2, 220);
  
  const rank = getRank(wpm);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 16px "JetBrains Mono"';
  ctx.fillText(rank.name + '  ' + '★'.repeat(rank.stars) + '☆'.repeat(5 - rank.stars), w / 2, 260);
  
  ctx.fillStyle = successColor;
  ctx.font = 'bold 24px "JetBrains Mono"';
  ctx.fillText(entryData.acc + '%', w / 2, 320);
  ctx.fillStyle = textDimColor;
  ctx.font = '11px "JetBrains Mono"';
  ctx.fillText('ACCURACY', w / 2, 340);
  
  ctx.fillStyle = textColor;
  ctx.font = '12px "JetBrains Mono"';
  ctx.textAlign = 'right';
  const now = new Date();
  ctx.fillText(now.toLocaleDateString(), w - 60, h - 40);
  ctx.textAlign = 'left';
  ctx.fillText('mrtype.uz', 60, h - 40);
  
  const a = document.createElement('a');
  a.download = `mrtype_${wpm}wpm.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  document.getElementById('shareOverlay').classList.remove('open');
}

function shareResult() {
  const entry = window._lastEntry;
  if (!entry) return;
  document.getElementById('resultOverlay').classList.remove('open');
  saveShareAsImage();
}

function changeSound() {
  const sounds = ['blue', 'brown', 'red', 'creamy', 'thock', 'cherry', 'silent', 'typewriter', 'mechanical', 'retro', 'bell', 'click', 'deep', 'light', 'bass'];
  const idx = (sounds.indexOf(currentSound) + 1) % sounds.length;
  currentSound = sounds[idx];
  const names = {
    blue:'Blue Switch', brown:'Brown Switch', red:'Red Switch', creamy:'Creamy', thock:'Thock',
    cherry:'Cherry', silent:'Silent', typewriter:'Typewriter', mechanical:'Mechanical', retro:'Retro',
    bell:'Bell', click:'Click', deep:'Deep', light:'Light', bass:'Bass'
  };
  dom.soundName.textContent = names[currentSound] || currentSound;
}

function focusInput() {
  dom.hiddenInput.focus();
  dom.typingArea.classList.remove('blurred');
}

function renderSubOptions() {
  dom.subOptions.innerHTML = '';
  if (settings.mode === 'time') {
    [15, 30, 60, 120].forEach(t => {
      const b = document.createElement('button');
      b.className = 'type-sub-opt' + (settings.duration === t ? ' active' : '');
      b.textContent = t + 's';
      b.onclick = () => { settings.duration = t; renderSubOptions(); fullResetWithNewWords(); };
      dom.subOptions.appendChild(b);
    });
  } else if (settings.mode === 'words') {
    [25, 50, 100, 200].forEach(w => {
      const b = document.createElement('button');
      b.className = 'type-sub-opt' + (settings.wordsGoal === w ? ' active' : '');
      b.textContent = w + " so'z";
      b.onclick = () => { settings.wordsGoal = w; renderSubOptions(); fullResetWithNewWords(); };
      dom.subOptions.appendChild(b);
    });
  } else if (settings.mode === 'quote') {
    const b = document.createElement('button');
    b.className = 'type-sub-opt active';
    b.textContent = 'Yangi iqtibos';
    b.onclick = () => fullResetWithNewWords();
    dom.subOptions.appendChild(b);
  } else if (settings.mode === 'dev') {
    const b = document.createElement('button');
    b.className = 'type-sub-opt active';
    b.textContent = 'Dasturlash';
    dom.subOptions.appendChild(b);
  } else if (settings.mode === 'custom') {
    const info = document.createElement('div');
    info.style.cssText = 'color:var(--type-text-dim);font-size:0.6rem';
    info.textContent = '✍️ Erkin yozish - Enter bilan yakunlang';
    dom.subOptions.appendChild(info);
  }
}

function toggleZenMode() {
  settings.zenMode = document.getElementById('zenMode')?.checked || false;
  document.body.classList.toggle('zen-mode', settings.zenMode);
}

// ============ INIT ============
try {
  const saved = localStorage.getItem('mrtype_history');
  if (saved) userHistory = JSON.parse(saved);
} catch(e) { userHistory = []; }
updateRankBadge();

document.querySelectorAll('.type-mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.type-mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    settings.mode = tab.dataset.mode;
    renderSubOptions();
    fullResetWithNewWords();
  });
});

document.addEventListener('keydown', (e) => {
  const overlays = ['resultOverlay', 'settingsOverlay', 'leaderboardOverlay', 'statsOverlay', 'duelOverlay', 'shareOverlay'];
  if (overlays.some(id => document.getElementById(id)?.classList.contains('open'))) {
    if (e.key === 'Escape') {
      overlays.forEach(id => document.getElementById(id)?.classList.remove('open'));
      focusInput();
    }
    return;
  }
  
  if (e.key === 'Tab') { e.preventDefault(); sameWordsRestart(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); fullResetWithNewWords(); return; }
  
  if (settings.mode === 'custom' && e.key === 'Enter' && gameState.isRunning) {
    e.preventDefault();
    gameState.wordsCompleted = 1;
    finishGame();
    return;
  }
  
  const ignore = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (ignore.includes(e.key) || e.ctrlKey || e.altKey) return;
  
  e.preventDefault();
  highlightKey(e.key.toLowerCase(), 'press');
  if (e.key === 'Backspace') handleBackspace();
  else if (e.key === ' ') handleSpace();
  else if (e.key.length === 1) handleChar(e.key);
});

document.addEventListener('keyup', (e) => highlightKey(e.key.toLowerCase(), null));
dom.typingArea.addEventListener('click', focusInput);
dom.hiddenInput.addEventListener('blur', () => dom.typingArea.classList.add('blurred'));
dom.hiddenInput.addEventListener('focus', () => dom.typingArea.classList.remove('blurred'));

// Button bindings
document.getElementById('settingsBtn')?.addEventListener('click', () => document.getElementById('settingsOverlay').classList.add('open'));
document.getElementById('settingsClose')?.addEventListener('click', () => { document.getElementById('settingsOverlay').classList.remove('open'); focusInput(); });
document.getElementById('statsBtn')?.addEventListener('click', () => document.getElementById('statsOverlay').classList.add('open'));
document.getElementById('statsCloseBtn')?.addEventListener('click', () => { document.getElementById('statsOverlay').classList.remove('open'); focusInput(); });
document.getElementById('shareResultBtn')?.addEventListener('click', () => shareResult());
document.getElementById('newWordsBtn')?.addEventListener('click', () => { document.getElementById('resultOverlay').classList.remove('open'); fullResetWithNewWords(); });
document.getElementById('restartResultBtn')?.addEventListener('click', () => { document.getElementById('resultOverlay').classList.remove('open'); sameWordsRestart(); });
document.getElementById('soundBtn')?.addEventListener('click', () => changeSound());

// Close overlays on outside click
['settingsOverlay', 'resultOverlay', 'statsOverlay'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('click', function(e) {
      if (e.target === this) { this.classList.remove('open'); focusInput(); }
    });
  }
});

// Language buttons
document.querySelectorAll('#langOptions .type-settings-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#langOptions .type-settings-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.lang = btn.dataset.lang;
    fullResetWithNewWords();
  };
});

// Font size buttons
document.querySelectorAll('#fontSizeOptions .type-settings-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#fontSizeOptions .type-settings-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.fontSize = btn.dataset.fs;
    settings.fontHeight = btn.dataset.lh;
    document.documentElement.style.setProperty('--type-fs', settings.fontSize);
    document.documentElement.style.setProperty('--type-lh', settings.fontHeight);
    dom.caret.style.height = settings.fontHeight;
    renderWords();
  };
});

// Theme buttons
document.querySelectorAll('#themeGrid .type-theme-swatch').forEach(sw => {
  sw.onclick = () => {
    document.querySelectorAll('#themeGrid .type-theme-swatch').forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    settings.theme = sw.dataset.theme;
    document.body.setAttribute('data-theme', settings.theme);
  };
});

// Toggle switches
document.getElementById('showKeyboard')?.addEventListener('change', (e) => {
  settings.showKeyboard = e.target.checked;
  dom.keyboardSection.style.display = settings.showKeyboard ? 'flex' : 'none';
});

document.getElementById('soundEnabled')?.addEventListener('change', (e) => {
  settings.soundEnabled = e.target.checked;
});

document.getElementById('zenMode')?.addEventListener('change', () => {
  toggleZenMode();
});

// Start
fullResetWithNewWords();
renderSubOptions();
focusInput();
document.documentElement.style.setProperty('--type-fs', settings.fontSize);
document.documentElement.style.setProperty('--type-lh', settings.fontHeight);
dom.keyboardSection.style.display = settings.showKeyboard ? 'flex' : 'none';
document.body.setAttribute('data-theme', settings.theme);

console.log('MR TYPE - Professional Typing Trainer ready');
