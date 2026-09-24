/* STIRALKI — общий скрипт для всех страниц */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ---------- Мобильное меню ---------- */
  function initMenu() {
    var burger = $(".burger");
    var nav = $("#site-nav");
    if (!burger || !nav) return;

    function setOpen(open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("no-scroll", open);
    }

    burger.addEventListener("click", function () {
      setOpen(burger.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.matchMedia("(min-width: 1025px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- Маска телефона 0XX-XXX-XX-XX ---------- */
  function formatPhone(value) {
    var d = value.replace(/\D/g, "");
    if (d.indexOf("380") === 0) d = d.slice(2);
    d = d.slice(0, 10);
    var parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
    return parts.filter(Boolean).join("-");
  }

  /* ---------- Формы заявки ---------- */
  function initForms() {
    $$("form[data-lead-form]").forEach(function (form) {
      var hint = $(".form-hint", form);
      var success = form.parentElement.querySelector(".form-success");
      var name = form.elements.name;
      var tel = form.elements.tel;
      var agree = form.elements.agree;

      if (tel) {
        tel.addEventListener("input", function () {
          tel.value = formatPhone(tel.value);
        });
      }

      // Выбор способа связи (страница «Контакты»)
      var wayInput = form.elements.way;
      $$("[data-way]", form).forEach(function (btn) {
        btn.addEventListener("click", function () {
          $$("[data-way]", form).forEach(function (b) {
            b.classList.toggle("is-active", b === btn);
            b.setAttribute("aria-pressed", String(b === btn));
          });
          if (wayInput) wayInput.value = btn.getAttribute("data-way");
        });
      });

      $$("input, textarea, select", form).forEach(function (el) {
        el.addEventListener("input", function () {
          el.classList.remove("is-invalid");
          if (hint) hint.textContent = "";
        });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var errors = [];
        if (!name.value.trim()) { errors.push(name); }
        if (tel.value.replace(/\D/g, "").length < 10) { errors.push(tel); }
        errors.forEach(function (el) { el.classList.add("is-invalid"); });

        if (errors.length || !agree.checked) {
          if (hint) {
            hint.textContent = errors.length
              ? "Заполните имя и телефон полностью" + (agree.checked ? "." : " и отметьте согласие.")
              : "Отметьте согласие на обработку персональных данных.";
          }
          (errors[0] || agree).focus();
          return;
        }

        // Здесь можно отправить данные на сервер:
        // fetch("/send.php", { method: "POST", body: new FormData(form) })
        var who = name.value.trim();
        var way = wayInput ? " (" + wayInput.value + ")" : "";
        if (success) {
          $("p", success).textContent =
            (who ? who + ", м" : "М") + "астер свяжется с вами" + way + " в течение 15 минут.";
          form.hidden = true;
          success.hidden = false;
          success.setAttribute("tabindex", "-1");
          success.focus();
        }
      });
    });
  }

  /* ---------- Прайс-лист: фильтр и поиск ---------- */
  var PRICES = [
    { id: "diag", title: "Диагностика и выезд", rows: [
      ["Выезд мастера по Харькову", "—", "0 грн"],
      ["Диагностика при последующем ремонте", "20–30 мин", "0 грн"],
      ["Диагностика без ремонта", "20–30 мин", "300 грн"],
      ["Выезд в Харьковскую область", "—", "от 200 грн"],
      ["Консультация по телефону", "—", "бесплатно"]
    ]},
    { id: "el", title: "Электрика и электроника", rows: [
      ["Ремонт модуля управления", "1–2 часа", "от 900 грн"],
      ["Замена модуля управления", "1 час", "от 600 грн"],
      ["Замена кнопки питания / панели", "40 мин", "от 450 грн"],
      ["Замена сетевого шнура, фильтра помех", "30–40 мин", "от 400 грн"],
      ["Замена ТЭНа", "1–1,5 часа", "от 1000 грн"],
      ["Замена датчика температуры", "40 мин", "от 450 грн"],
      ["Замена прессостата (датчика уровня)", "40 мин", "от 500 грн"],
      ["Сброс ошибок, перепрошивка", "30–60 мин", "от 600 грн"]
    ]},
    { id: "water", title: "Залив и слив воды", rows: [
      ["Чистка сливного фильтра и патрубков", "30–40 мин", "от 400 грн"],
      ["Замена сливного насоса", "до 1 часа", "от 500 грн"],
      ["Замена заливного клапана", "40 мин", "от 500 грн"],
      ["Замена сливного / заливного шланга", "30 мин", "от 350 грн"],
      ["Замена манжеты люка", "40–60 мин", "от 400 грн"],
      ["Устранение протечки бака", "1–2 часа", "от 800 грн"]
    ]},
    { id: "mech", title: "Механика и барабан", rows: [
      ["Замена подшипников и сальника", "2–3 часа", "от 1500 грн"],
      ["Замена амортизаторов", "1 час", "от 1000 грн"],
      ["Замена пружин подвеса бака", "40 мин", "от 600 грн"],
      ["Замена ремня привода", "30 мин", "от 400 грн"],
      ["Ремонт / замена двигателя", "1–2 часа", "от 1200 грн"],
      ["Замена замка (УБЛ) люка", "40 мин", "от 500 грн"],
      ["Замена ручки или петли люка", "30 мин", "от 350 грн"],
      ["Извлечение посторонних предметов", "40–60 мин", "от 500 грн"]
    ]},
    { id: "other", title: "Установка и обслуживание", rows: [
      ["Подключение стиральной машины", "1 час", "от 600 грн"],
      ["Снятие транспортировочных болтов, выравнивание", "30 мин", "от 300 грн"],
      ["Чистка от накипи и загрязнений", "1–1,5 часа", "от 800 грн"],
      ["Профилактика (осмотр, чистка, проверка)", "1 час", "от 700 грн"]
    ]}
  ];

  function highlight(text, q) {
    if (!q) return esc(text);
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  function initPrices() {
    var root = $("#price-groups");
    if (!root) return;
    var tabsBox = $("#price-tabs");
    var search = $("#price-search");
    var empty = $("#price-empty");
    var state = { cat: "all", q: "" };

    var tabs = [{ id: "all", title: "Все услуги" }].concat(PRICES);
    tabsBox.innerHTML = tabs.map(function (t) {
      var on = t.id === state.cat;
      return '<button type="button" class="chip' + (on ? " is-active" : "") + '" data-cat="' + t.id +
        '" aria-pressed="' + on + '">' + esc(t.title) + "</button>";
    }).join("");

    function render() {
      var q = state.q.trim().toLowerCase();
      var html = PRICES.map(function (g, gi) {
        if (state.cat !== "all" && g.id !== state.cat) return "";
        var rows = g.rows.filter(function (r) { return !q || r[0].toLowerCase().indexOf(q) >= 0; });
        if (!rows.length) return "";
        return '<div class="price-group">' +
          '<div class="price-group__head"><div class="num-badge">' + String(gi + 1).padStart(2, "0") + "</div>" +
          "<h2>" + esc(g.title) + "</h2></div>" +
          '<div class="price-row price-row--head" aria-hidden="true"><div>Услуга</div><div>Время</div><div style="text-align:right">Цена</div></div>' +
          rows.map(function (r) {
            var noTime = r[1] === "—";
            return '<div class="price-row">' +
              '<div class="price-row__name">' + highlight(r[0], q) + "</div>" +
              '<div class="price-row__time"' + (noTime ? " data-empty" : "") + ">" + esc(r[1]) + "</div>" +
              '<div class="price-row__price">' + esc(r[2]) + "</div></div>";
          }).join("") +
          "</div>";
      }).join("");
      root.innerHTML = html;
      empty.hidden = !!html;
    }

    tabsBox.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      state.cat = btn.getAttribute("data-cat");
      $$("[data-cat]", tabsBox).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      render();
    });
    search.addEventListener("input", function () {
      state.q = search.value;
      render();
    });
    render();
  }

  /* ---------- Блог: фильтр по категориям ---------- */
  var POSTS = [
    { cat: "Уход", date: "12 сен 2025", read: "6 мин", slot: "бытовая техника, уход", title: "Как продлить жизнь стиральной машине? 7 правил, о которых вы не знали", ex: "Правильная дозировка порошка, открытый люк после стирки и ещё пять привычек, которые добавят машине несколько лет службы." },
    { cat: "Уход", date: "28 авг 2025", read: "4 мин", slot: "барабан машинки", title: "Почему стиральная машина неприятно пахнет? 3 шага для устранения запаха", ex: "Откуда берётся запах сырости и как избавиться от него без вызова мастера." },
    { cat: "Выбор", date: "15 авг 2025", read: "7 мин", slot: "мастер и новая техника", title: "Что выгоднее: ремонт или покупка новой машины? Разбор на примерах", ex: "Считаем реальные цифры на пяти типичных поломках и объясняем, когда ремонт теряет смысл." },
    { cat: "Безопасность", date: "2 авг 2025", read: "5 мин", slot: "электрика, розетка", title: "Стиральная машина бьёт током: причины и как срочно это исправить", ex: "Почему это опасно, что проверить самостоятельно и когда нужно немедленно отключить технику." },
    { cat: "Поломки", date: "20 июл 2025", read: "5 мин", slot: "сливной фильтр", title: "Машина не сливает воду: что можно проверить самому за 10 минут", ex: "Пошаговая инструкция по чистке сливного фильтра и проверке шланга." },
    { cat: "Поломки", date: "8 июл 2025", read: "6 мин", slot: "барабан, подшипник", title: "Гул при отжиме: подшипники, амортизаторы или просто перегруз?", ex: "Как по звуку понять, что именно вышло из строя, и насколько срочен ремонт." },
    { cat: "Уход", date: "25 июн 2025", read: "4 мин", slot: "накипь, ТЭН", title: "Накипь на ТЭНе: чем чистить и чем категорически нельзя", ex: "Лимонная кислота, специальные средства и мифы о «волшебных» таблетках." },
    { cat: "Выбор", date: "10 июн 2025", read: "8 мин", slot: "новые стиральные машины", title: "Какую стиральную машину выбрать в 2025 году: мнение мастера", ex: "Какие марки реже ломаются, где дешевле запчасти и за что не стоит переплачивать." },
    { cat: "Поломки", date: "29 мая 2025", read: "5 мин", slot: "дисплей с ошибкой", title: "Коды ошибок популярных марок: расшифровка и что делать", ex: "Samsung, LG, Bosch, Indesit — самые частые коды и их значение." }
  ];

  function metaHtml(p) {
    return '<div class="meta"><span class="meta__cat">' + esc(p.cat) + "</span><span>" + esc(p.date) +
      "</span><span>" + esc(p.read) + "</span></div>";
  }

  function initBlog() {
    var featuredBox = $("#blog-featured");
    if (!featuredBox) return;
    var grid = $("#blog-grid");
    var tabsBox = $("#blog-tabs");

    function render(cat) {
      var list = POSTS.filter(function (p) { return cat === "Все" || p.cat === cat; });
      var f = list[0];
      featuredBox.innerHTML = f
        ? '<article class="featured">' +
            '<div class="featured__media"><div class="ph">' + esc(f.slot) + "</div></div>" +
            '<div class="featured__body">' + metaHtml(f) +
              '<h2 class="featured__title">' + esc(f.title) + "</h2>" +
              '<p class="featured__ex">' + esc(f.ex) + "</p>" +
              '<a href="#" class="article__more">Читать статью →</a>' +
            "</div></article>"
        : "";
      grid.innerHTML = list.slice(1).map(function (p) {
        return '<article class="article">' +
          '<div class="article__media"><div class="ph">' + esc(p.slot) + "</div></div>" +
          '<div class="article__body">' + metaHtml(p) +
            '<h3 class="article__title">' + esc(p.title) + "</h3>" +
            '<p class="article__ex">' + esc(p.ex) + "</p>" +
            '<a href="#" class="article__more">Читать →</a>' +
          "</div></article>";
      }).join("");
      grid.hidden = list.length < 2;
    }

    tabsBox.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-cat]");
      if (!btn) return;
      $$("[data-cat]", tabsBox).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      render(btn.getAttribute("data-cat"));
    });
    render("Все");
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  function initReveal() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  function initYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initForms();
    initPrices();
    initBlog();
    initReveal();
    initYear();
  });
})();
