// =====================================================================
// НАСТРОЙКИ — меняйте только этот блок
// =====================================================================

// Слова, которые должны стать красными (#FF0000), а не белыми.
// Регистр не важен: «Сайты» и «сайты» считаются одним словом.
// Знаки препинания рядом со словом (запятая, точка и т.п.) не мешают совпадению.
const ACCENT_WORDS = ['сайты', 'продажи'];

// Задержка между «зажиганием» соседних букв, в миллисекундах.
// Чем меньше число, тем быстрее «бежит» подсветка.
const LETTER_DELAY = 60;

// Какая часть блока должна появиться на экране, чтобы анимация стартовала.
// 0.5 = половина блока, 1 = блок целиком, 0 = хотя бы один пиксель.
const VISIBILITY_THRESHOLD = 0.5;

// CSS-селектор заголовков, к которым применяется эффект.
// Можно навесить класс js-letters на любое количество заголовков.
const TITLE_SELECTOR = '.js-letters';


// =====================================================================
// ПОДГОТОВКА: разбиваем текст заголовка на отдельные буквы
// =====================================================================

// Приводим слово к «чистому» виду для сравнения:
// убираем знаки препинания по краям и переводим в нижний регистр.
function normalizeWord(word) {
  return word
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') // срезаем не-буквы и не-цифры в начале и в конце
    .toLowerCase();
}

// Заранее приводим список выделенных слов к тому же виду,
// чтобы потом сравнивать быстро и без ошибок из-за регистра.
const accentSet = new Set(ACCENT_WORDS.map(normalizeWord));

// Функция превращает текст заголовка в набор <span> — по одному на каждую букву.
// Возвращает массив всех span-букв в порядке их следования в тексте.
function splitTitleIntoLetters(title) {
  const text = title.textContent.trim(); // берём исходный текст заголовка
  const words = text.split(/\s+/);       // делим текст на слова по пробелам
  const letters = [];                    // сюда соберём все span-буквы по порядку

  title.textContent = ''; // очищаем заголовок, дальше заполним его заново

  words.forEach((word, wordIndex) => {
    // Обёртка для слова — нужна, чтобы слово не разрывалось переносом строки посередине
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';

    // Проверяем, входит ли слово в список выделяемых (красных)
    const isAccent = accentSet.has(normalizeWord(word));

    // Перебираем символы слова. Array.from корректно работает с эмодзи и составными символами.
    Array.from(word).forEach((char) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      letterSpan.textContent = char;

      // Если слово выделенное — помечаем букву классом is-accent,
      // тогда CSS покрасит её в #FF0000 вместо #FFFFFF
      if (isAccent) {
        letterSpan.classList.add('is-accent');
      }

      wordSpan.appendChild(letterSpan);
      letters.push(letterSpan);
    });

    title.appendChild(wordSpan);

    // Между словами возвращаем пробел (после последнего слова он не нужен)
    if (wordIndex < words.length - 1) {
      title.appendChild(document.createTextNode(' '));
    }
  });

  // Для экранных дикторов (незрячих пользователей) сохраняем исходный текст целиком,
  // чтобы он не читался по буквам
  title.setAttribute('aria-label', text);

  return letters;
}


// =====================================================================
// АНИМАЦИЯ: поочерёдно «зажигаем» буквы
// =====================================================================

// Добавляет каждой букве класс is-lit с нарастающей задержкой.
// Сам плавный переход цвета делает CSS (свойство transition в style.css).
function lightUpLetters(letters) {
  letters.forEach((letter, index) => {
    setTimeout(() => {
      letter.classList.add('is-lit');
    }, index * LETTER_DELAY); // 1-я буква сразу, 2-я через LETTER_DELAY мс, 3-я через 2×LETTER_DELAY и т.д.
  });
}


// =====================================================================
// ЗАПУСК: следим, когда заголовок появится на экране
// =====================================================================

document.querySelectorAll(TITLE_SELECTOR).forEach((title) => {
  // Сразу разбиваем заголовок на буквы (все они пока серые #DFDFDF)
  const letters = splitTitleIntoLetters(title);

  // IntersectionObserver — встроенный инструмент браузера,
  // который сообщает, когда элемент появляется в видимой области экрана
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // isIntersecting = true, когда видна нужная часть блока (см. VISIBILITY_THRESHOLD)
      if (entry.isIntersecting) {
        lightUpLetters(letters);        // запускаем поочерёдную подсветку
        observer.unobserve(entry.target); // перестаём следить — анимация проигрывается один раз
      }
    });
  }, { threshold: VISIBILITY_THRESHOLD });

  // Начинаем следить за заголовком
  observer.observe(title);
});
