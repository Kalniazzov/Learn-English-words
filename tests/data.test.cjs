const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { categories, getCategoryWords, parseCsv } = require('../js/data.js');

const dictionaryPath = path.join(__dirname, '..', 'data', '1000_english_words_with_kazakh.csv');

test('CSV parser preserves quoted commas and escaped quotes', () => {
    const rows = parseCsv([
        'No,English word,Russian translation,Kazakh translation',
        '1,hello,"привет, здравствуй","сәлем, ""қайырлы күн"""'
    ].join('\r\n'));

    assert.deepEqual(rows, [{
        id: '1',
        english: 'hello',
        russian: 'привет, здравствуй',
        kazakh: 'сәлем, "қайырлы күн"'
    }]);
});

test('CSV parser skips blank and incomplete rows', () => {
    const rows = parseCsv([
        'No,English word,Russian translation,Kazakh translation',
        '1,hello,привет,сәлем',
        '2,incomplete,только русский,',
        ',,,',
        ''
    ].join('\n'));

    assert.equal(rows.length, 1);
    assert.equal(rows[0].english, 'hello');
});

test('dictionary contains 1000 complete Russian and Kazakh entries', () => {
    const source = fs.readFileSync(dictionaryPath, 'utf8');
    const words = parseCsv(source);

    assert.equal(words.length, 1000);
    assert.ok(words.every(word => word.english && word.russian && word.kazakh));
    assert.equal(words[0].id, '1');
    assert.equal(words.at(-1).id, '1000');
});

test('categories partition every dictionary entry exactly once', () => {
    const words = parseCsv(fs.readFileSync(dictionaryPath, 'utf8'));
    const categorizedWords = categories.flatMap(category => getCategoryWords(words, category));
    const categorizedIds = categorizedWords.map(word => word.id);

    assert.equal(categories.length, 16);
    assert.equal(categorizedWords.length, words.length);
    assert.equal(new Set(categorizedIds).size, words.length);
    assert.deepEqual(categorizedIds, words.map(word => word.id));
});

test('category selection respects its inclusive id range', () => {
    const words = parseCsv(fs.readFileSync(dictionaryPath, 'utf8'));
    const food = categories.find(category => category.title === 'Еда и кухня');
    const selected = getCategoryWords(words, food);

    assert.equal(selected.length, 100);
    assert.equal(selected[0].id, '751');
    assert.equal(selected.at(-1).id, '850');
});