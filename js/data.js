(() => {
    const categoryDefinitions = [
        { start: 1, end: 38, title: 'Основы и местоимения', description: 'Местоимения, вопросы и короткие слова' },
        { start: 39, end: 150, title: 'Время и числа', description: 'Дни, месяцы, даты и количества' },
        { start: 151, end: 175, title: 'Предлоги и союзы', description: 'Связи между словами и фразами' },
        { start: 176, end: 250, title: 'Люди и тело', description: 'Семья, отношения и части тела' },
        { start: 251, end: 275, title: 'Чувства и качества', description: 'Эмоции, характер и состояния' },
        { start: 276, end: 325, title: 'Одежда и профессии', description: 'Одежда, работа и специальности' },
        { start: 326, end: 400, title: 'Работа и учёба', description: 'Дела, занятия и образование' },
        { start: 401, end: 450, title: 'Знания и культура', description: 'Предметы, тексты и искусство' },
        { start: 451, end: 524, title: 'Цвета и описания', description: 'Цвета, свойства и признаки' },
        { start: 525, end: 700, title: 'Действия', description: 'Частые глаголы и повседневные дела' },
        { start: 701, end: 750, title: 'Модальные и фразовые глаголы', description: 'Модальность и устойчивые сочетания' },
        { start: 751, end: 850, title: 'Еда и кухня', description: 'Продукты, посуда и приготовление' },
        { start: 851, end: 900, title: 'Дом и быт', description: 'Комнаты, мебель и вещи вокруг' },
        { start: 901, end: 950, title: 'Город и путешествия', description: 'Места, транспорт и поездки' },
        { start: 951, end: 975, title: 'Мир и природа', description: 'Погода, ландшафт и окружающий мир' },
        { start: 976, end: 1000, title: 'Животные и общение', description: 'Животные и полезные фразы' }
    ];

    function parseCsv(source) {
        const rows = [];
        let row = [];
        let field = '';
        let quoted = false;

        for (let position = 0; position < source.length; position += 1) {
            const character = source[position];
            if (quoted) {
                if (character === '"' && source[position + 1] === '"') {
                    field += '"';
                    position += 1;
                } else if (character === '"') {
                    quoted = false;
                } else {
                    field += character;
                }
            } else if (character === '"' && field.length === 0) {
                quoted = true;
            } else if (character === ',') {
                row.push(field);
                field = '';
            } else if (character === '\n' || character === '\r') {
                if (character === '\r' && source[position + 1] === '\n') position += 1;
                row.push(field);
                if (row.some(value => value.trim())) rows.push(row);
                row = [];
                field = '';
            } else {
                field += character;
            }
        }

        if (field.length || row.length) {
            row.push(field);
            if (row.some(value => value.trim())) rows.push(row);
        }

        return rows.slice(1)
            .filter(columns => columns.length >= 4 && columns[1].trim() && columns[2].trim() && columns[3].trim())
            .map(columns => ({
                id: columns[0].trim(),
                english: columns[1].trim(),
                russian: columns[2].trim(),
                kazakh: columns[3].trim()
            }));
    }

    function getCategoryWords(words, category) {
        return words.filter(word => Number(word.id) >= category.start && Number(word.id) <= category.end);
    }

    const WordData = { categories: categoryDefinitions, parseCsv, getCategoryWords };

    if (typeof module !== 'undefined' && module.exports) module.exports = WordData;
    if (typeof window !== 'undefined') window.WordData = WordData;
})();