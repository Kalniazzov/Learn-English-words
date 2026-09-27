const { categories, getCategoryWords, parseCsv } = window.WordData;
const STORAGE_KEY = 'slovar-learned-words';
const TODAY_KEY = 'slovar-daily-progress';
const elements = {
    categoryView: document.querySelector('#category-view'),
    studyView: document.querySelector('#study-view'),
    categoryGrid: document.querySelector('#category-grid'),
    categoryCount: document.querySelector('#category-count'),
    libraryLearned: document.querySelector('#library-learned'),
    libraryProgressFill: document.querySelector('#library-progress-fill'),
    libraryProgressPercent: document.querySelector('#library-progress-percent'),
    categoryTitle: document.querySelector('#category-title'),
    categoryDescription: document.querySelector('#category-description'),
    wordText: document.querySelector('#word-text'),
    pronunciation: document.querySelector('#pronunciation'),
    wordHint: document.querySelector('#word-hint'),
    promptLabel: document.querySelector('#prompt-label'),
    wordNumber: document.querySelector('#word-number'),
    cardIndex: document.querySelector('#card-index'),
    currentNumber: document.querySelector('#current-number'),
    totalNumber: document.querySelector('#total-number'),
    deckTotal: document.querySelector('#deck-total'),
    progressTotal: document.querySelector('#progress-total'),
    learnedCount: document.querySelector('#learned-count'),
    progressPercent: document.querySelector('#progress-percent'),
    progressBar: document.querySelector('#progress-bar'),
    progressFill: document.querySelector('#progress-fill'),
    todayCount: document.querySelector('#today-count'),
    todayWord: document.querySelector('#today-word'),
    revealButton: document.querySelector('#reveal-button'),
    answerActions: document.querySelector('#answer-actions'),
    speakButton: document.querySelector('#speak-button'),
    loadStatus: document.querySelector('#load-status'),
    flashcard: document.querySelector('#flashcard')
};

let words = [];
let activeWords = [];
let activeCategory = null;
let index = 0;
let revealed = false;
let englishFirst = true;
let translationLanguage = 'russian';
let englishVoice = null;
let learned = new Set(readStoredArray(STORAGE_KEY));
let dailyProgress = readDailyProgress();

function selectEnglishVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    englishVoice = voices.find(voice => voice.name === 'Samantha' && voice.lang === 'en-US')
        || voices.find(voice => voice.lang === 'en-US')
        || voices.find(voice => voice.lang.startsWith('en'))
        || null;
}

function readStoredArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(value) ? value.map(String) : [];
    } catch {
        return [];
    }
}

function readDailyProgress() {
    try {
        const value = JSON.parse(localStorage.getItem(TODAY_KEY) || '{}');
        return value.date === new Date().toLocaleDateString('en-CA') ? value : { date: new Date().toLocaleDateString('en-CA'), count: 0 };
    } catch {
        return { date: new Date().toLocaleDateString('en-CA'), count: 0 };
    }
}

function formatNumber(number) {
    return String(number).padStart(3, '0');
}

function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...learned]));
    localStorage.setItem(TODAY_KEY, JSON.stringify(dailyProgress));
}

function renderProgress() {
    const total = activeWords.length;
    const count = activeWords.filter(word => learned.has(word.id)).length;
    const percent = total ? Math.round((count / total) * 100) : 0;
    const overallPercent = words.length ? Math.round((learned.size / words.length) * 100) : 0;
    elements.libraryLearned.textContent = learned.size.toLocaleString('ru-RU');
    elements.libraryProgressFill.style.width = `${overallPercent}%`;
    elements.libraryProgressPercent.textContent = `${overallPercent}%`;
    elements.learnedCount.textContent = count.toLocaleString('ru-RU');
    elements.progressTotal.textContent = String(total);
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressFill.style.width = `${percent}%`;
    elements.progressBar.setAttribute('aria-valuemax', String(total));
    elements.progressBar.setAttribute('aria-valuenow', String(count));
    elements.todayCount.textContent = String(dailyProgress.count);
    const endings = new Intl.PluralRules('ru-RU').select(dailyProgress.count);
    elements.todayWord.textContent = endings === 'one' ? 'слово' : endings === 'few' ? 'слова' : 'слов';
}

function renderCategories() {
    elements.categoryGrid.replaceChildren();
    elements.categoryCount.textContent = `${categories.length} разделов`;

    categories.forEach((category, categoryIndex) => {
        const categoryWords = getCategoryWords(words, category);
        const categoryLearned = categoryWords.filter(word => learned.has(word.id)).length;
        const card = document.createElement('button');
        const top = document.createElement('span');
        const categoryNumber = document.createElement('span');
        const wordCount = document.createElement('span');
        const title = document.createElement('span');
        const description = document.createElement('span');
        const footer = document.createElement('span');
        const progress = document.createElement('span');
        const arrow = document.createElement('span');

        card.type = 'button';
        card.className = 'category-card';
        card.setAttribute('aria-label', `${category.title}, ${categoryWords.length} слов`);
        top.className = 'category-card-top';
        categoryNumber.className = 'category-index';
        categoryNumber.textContent = String(categoryIndex + 1).padStart(2, '0');
        wordCount.className = 'category-count';
        wordCount.textContent = `${categoryWords.length} слов`;
        title.className = 'category-title';
        title.textContent = category.title;
        description.className = 'category-description';
        description.textContent = category.description;
        footer.className = 'category-card-footer';
        progress.className = 'category-card-progress';
        progress.textContent = `${categoryLearned} / ${categoryWords.length} выучено`;
        arrow.className = 'category-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        top.append(categoryNumber, wordCount);
        footer.append(progress, arrow);
        card.append(top, title, description, footer);
        card.addEventListener('click', () => openCategory(category));
        elements.categoryGrid.append(card);
    });
}

function openCategory(category) {
    activeCategory = category;
    activeWords = getCategoryWords(words, category);
    index = 0;
    revealed = false;
    englishFirst = true;
    elements.categoryTitle.textContent = category.title;
    elements.categoryDescription.textContent = category.description.toUpperCase();
    elements.categoryView.hidden = true;
    elements.studyView.hidden = false;
    setDirection(true);
    renderCard();
}

function showCategories() {
    elements.studyView.hidden = true;
    elements.categoryView.hidden = false;
    activeCategory = null;
    activeWords = [];
    renderCategories();
    renderProgress();
}

function renderCard() {
    if (!activeWords.length) return;
    const word = activeWords[index];
    const translation = word[translationLanguage];
    const languageLabel = translationLanguage === 'kazakh' ? 'казахский' : 'русский';
    const prompt = englishFirst ? word.english : translation;
    const answer = englishFirst ? translation : word.english;
    const pronunciation = window.WordPronunciations?.[word.id] || '';
    elements.wordText.textContent = revealed ? answer : prompt;
    elements.pronunciation.textContent = pronunciation ? `/${pronunciation}/` : '';
    elements.pronunciation.hidden = !pronunciation;
    elements.wordHint.textContent = revealed ? (englishFirst ? `Перевод на ${languageLabel}` : 'Перевод на английский') : 'Вспомни перевод и открой ответ';
    elements.promptLabel.textContent = revealed ? 'ПЕРЕВОД' : (englishFirst ? 'АНГЛИЙСКОЕ СЛОВО' : `${translationLanguage === 'kazakh' ? 'КАЗАХСКОЕ' : 'РУССКОЕ'} СЛОВО`);
    elements.wordNumber.textContent = `№ ${formatNumber(Number(word.id))}`;
    elements.cardIndex.textContent = String(index + 1);
    elements.currentNumber.textContent = formatNumber(index + 1);
    elements.totalNumber.textContent = String(activeWords.length).padStart(3, '0');
    elements.revealButton.hidden = revealed;
    elements.answerActions.hidden = !revealed;
    elements.flashcard.classList.remove('card-refresh');
    void elements.flashcard.offsetWidth;
    elements.flashcard.classList.add('card-refresh');
    renderProgress();
}

function moveBy(amount) {
    if (!activeWords.length) return;
    index = (index + amount + activeWords.length) % activeWords.length;
    revealed = false;
    renderCard();
}

function markKnown() {
    const word = activeWords[index];
    if (!learned.has(word.id)) {
        learned.add(word.id);
        dailyProgress.count += 1;
        saveProgress();
    }
    moveBy(1);
    renderCategories();
}

function setDirection(showEnglishFirst) {
    englishFirst = showEnglishFirst;
    revealed = false;
    document.querySelector('#english-to-russian').classList.toggle('is-active', englishFirst);
    document.querySelector('#english-to-russian').setAttribute('aria-pressed', String(englishFirst));
    document.querySelector('#russian-to-english').classList.toggle('is-active', !englishFirst);
    document.querySelector('#russian-to-english').setAttribute('aria-pressed', String(!englishFirst));
    renderCard();
}

function setTranslationLanguage(language) {
    translationLanguage = language;
    revealed = false;
    const kazakhSelected = language === 'kazakh';
    document.querySelector('#language-russian').classList.toggle('is-active', !kazakhSelected);
    document.querySelector('#language-russian').setAttribute('aria-pressed', String(!kazakhSelected));
    document.querySelector('#language-kazakh').classList.toggle('is-active', kazakhSelected);
    document.querySelector('#language-kazakh').setAttribute('aria-pressed', String(kazakhSelected));
    document.querySelectorAll('[data-translation-label]').forEach(label => {
        label.textContent = kazakhSelected ? 'ҚАЗ' : 'RU';
    });
    renderCard();
}

document.querySelector('#reveal-button').addEventListener('click', () => {
    revealed = true;
    renderCard();
});
document.querySelector('#back-to-categories').addEventListener('click', showCategories);
document.querySelector('#known-button').addEventListener('click', markKnown);
document.querySelector('#again-button').addEventListener('click', () => moveBy(1));
document.querySelector('#previous-button').addEventListener('click', () => moveBy(-1));
document.querySelector('#next-button').addEventListener('click', () => moveBy(1));
document.querySelector('#english-to-russian').addEventListener('click', () => setDirection(true));
document.querySelector('#russian-to-english').addEventListener('click', () => setDirection(false));
document.querySelector('#language-russian').addEventListener('click', () => setTranslationLanguage('russian'));
document.querySelector('#language-kazakh').addEventListener('click', () => setTranslationLanguage('kazakh'));
document.querySelector('#shuffle-button').addEventListener('click', () => {
    for (let position = activeWords.length - 1; position > 0; position -= 1) {
        const other = Math.floor(Math.random() * (position + 1));
        [activeWords[position], activeWords[other]] = [activeWords[other], activeWords[position]];
    }
    index = 0;
    revealed = false;
    renderCard();
});
document.querySelector('#speak-button').addEventListener('click', () => {
    if (!activeWords.length || !('speechSynthesis' in window)) return;
    const word = activeWords[index];
    const spokenText = word.english.replace(/\s*\/\s*/g, ', ').replace(/[()]/g, '');
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'en-US';
    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.volume = 1;
    selectEnglishVoice();
    utterance.voice = englishVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
});
document.querySelector('#reset-progress').addEventListener('click', () => {
    if (!window.confirm('Сбросить весь прогресс изучения?')) return;
    learned.clear();
    dailyProgress = { date: new Date().toLocaleDateString('en-CA'), count: 0 };
    saveProgress();
    renderProgress();
    renderCategories();
});
document.addEventListener('keydown', event => {
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    if (event.code === 'Space') {
        event.preventDefault();
        if (!revealed) document.querySelector('#reveal-button').click();
    } else if (event.key === 'ArrowRight') {
        moveBy(1);
    } else if (event.key === 'ArrowLeft') {
        moveBy(-1);
    } else if (event.key === '1' && revealed) {
        markKnown();
    } else if (event.key === '2' && revealed) {
        moveBy(1);
    }
});

async function loadWords() {
    try {
        const response = await fetch('./data/1000_english_words_with_kazakh.csv');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        words = parseCsv(await response.text());
        if (!words.length) throw new Error('В файле не найдены слова');
        const total = words.length.toLocaleString('ru-RU');
        elements.deckTotal.textContent = total;
        renderCategories();
        renderProgress();
        elements.speakButton.disabled = !('speechSynthesis' in window);
        elements.revealButton.disabled = false;
        elements.loadStatus.textContent = `Загружено ${total} слов`;
    } catch (error) {
        elements.wordText.textContent = 'Не удалось загрузить словарь';
        elements.wordHint.textContent = 'Открой страницу через локальный веб-сервер';
        elements.loadStatus.textContent = 'Ошибка загрузки CSV';
        console.error('Не удалось загрузить список слов:', error);
    }
}

renderProgress();
if ('speechSynthesis' in window) {
    selectEnglishVoice();
    window.speechSynthesis.addEventListener('voiceschanged', selectEnglishVoice);
}
loadWords();