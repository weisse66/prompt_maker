// =====================================================================
// НАСТРОЙКИ
// =====================================================================

// СКОРОСТЬ: пауза между «зажиганием» соседних букв, в миллисекундах.
// Чем меньше число, тем быстрее бежит подсветка.
// Это общее значение для всех элементов. Для отдельного элемента его можно
// переопределить прямо в HTML атрибутом data-letter-delay="80".
// (Плавность смены цвета одной буквы задаётся в style.css: --letter-transition.)
const LETTER_DELAY = 60;

// Какая часть элемента должна появиться на экране, чтобы анимация стартовала.
// 0.5 = половина, 1 = целиком, 0 = хотя бы один пиксель.
const VISIBILITY_THRESHOLD = 0.5;

// Селектор элементов с эффектом. Добавьте этот класс любой надписи в HTML.
const TITLE_SELECTOR = '.js-letters';


// =====================================================================
// ПОДГОТОВКА: разбиваем текст элемента на отдельные буквы
// =====================================================================

// Превращает один текстовый кусок в набор span-ов:
// каждое слово — <span class="word">, внутри каждая буква — <span class="letter">.
// Пробелы между словами остаются обычным текстом.
// Все созданные буквы добавляются в массив letters (по порядку).
function splitTextNode(textNode, letters) {
  const fragment = document.createDocumentFragment();

  // Делим текст на части: слова и пробелы. Скобки в регулярном выражении
  // сохраняют пробелы в результате, чтобы не потерять их.
  const parts = textNode.textContent.split(/(\s+)/);

  parts.forEach((part) => {
    if (part === '') return; // пустые кусочки пропускаем

    // Пробельный кусок — сжимаем до одного пробела и вставляем как есть
    if (/^\s+$/.test(part)) {
      fragment.appendChild(document.createTextNode(' '));
      return;
    }

    // Слово: обёртка, чтобы слово не рвалось переносом строки
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';

    // Array.from корректно делит на символы даже эмодзи
    Array.from(part).forEach((char) => {
      const letterSpan = document.createElement('span');
      letterSpan.className = 'letter';
      letterSpan.textContent = char;
      wordSpan.appendChild(letterSpan);
      letters.push(letterSpan);
    });

    fragment.appendChild(wordSpan);
  });

  // Заменяем исходный текст на подготовленные span-ы
  textNode.replaceWith(fragment);
}

// Обходит элемент и всех его потомков. Текст разбивается на буквы,
// а вложенные теги (например, <span class="accent">, <br>, <a>) остаются на месте.
// Благодаря этому буквы внутри .accent сами окажутся внутри .accent —
// и CSS покрасит их в красный.
function splitElement(element, letters) {
  // Копируем список детей заранее, т.к. во время обхода мы их заменяем
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      splitTextNode(node, letters);   // текст → буквы
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      splitElement(node, letters);    // тег → заходим внутрь и продолжаем
    }
  });
}

// Готовит элемент к анимации и возвращает массив всех его букв по порядку
function prepareElement(element) {
  // Сохраняем исходный текст для экранных дикторов (незрячих пользователей),
  // чтобы надпись не читалась по одной букве
  const originalText = element.textContent.replace(/\s+/g, ' ').trim();
  element.setAttribute('aria-label', originalText);

  const letters = [];
  splitElement(element, letters);

  // Сами буквы от дикторов скрываем — им достаточно aria-label
  letters.forEach((letter) => letter.setAttribute('aria-hidden', 'true'));

  return letters;
}


// =====================================================================
// АНИМАЦИЯ
// =====================================================================

// Поочерёдно «зажигает» буквы: добавляет класс is-lit с нарастающей задержкой.
// Сам плавный переход цвета делает CSS (transition в style.css).
// Возвращает список запущенных таймеров, чтобы их можно было отменить.
function lightUp(letters, delay) {
  return letters.map((letter, index) =>
    setTimeout(() => letter.classList.add('is-lit'), index * delay)
    // 1-я буква сразу, 2-я через delay мс, 3-я через 2×delay и т.д.
  );
}

// Возвращает все буквы в исходный цвет и отменяет ещё не сработавшие таймеры.
// Нужно, чтобы при следующем появлении на экране анимация началась заново.
function reset(letters, timers) {
  timers.forEach(clearTimeout);
  letters.forEach((letter) => letter.classList.remove('is-lit'));
}


// =====================================================================
// ЗАПУСК: следим за появлением каждого элемента на экране
// =====================================================================

document.querySelectorAll(TITLE_SELECTOR).forEach((element) => {
  const letters = prepareElement(element); // разбиваем на буквы (все пока #DFDFDF)
  let timers = [];                         // таймеры текущего запуска анимации

  // Скорость для этого элемента: из data-letter-delay, иначе общая LETTER_DELAY
  const customDelay = parseInt(element.dataset.letterDelay, 10);
  const delay = Number.isNaN(customDelay) ? LETTER_DELAY : customDelay;

  // IntersectionObserver — встроенный инструмент браузера, который сообщает,
  // когда элемент появляется на экране и когда уходит с него
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Элемент появился на экране → сбрасываем прошлый запуск и зажигаем буквы
        reset(letters, timers);
        timers = lightUp(letters, delay);
      } else {
        // Элемент ушёл с экрана → возвращаем исходный цвет,
        // чтобы при следующем появлении анимация проигралась снова
        reset(letters, timers);
        timers = [];
      }
    });
  }, { threshold: VISIBILITY_THRESHOLD });

  observer.observe(element);
});
