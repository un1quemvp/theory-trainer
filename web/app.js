"use strict";
const root = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const CHAPTERS = {git: "Git", terminal: "Терминал", python: "Python", linux: "Linux", net: "Сети", http: "HTTP", algo: "Алгоритмы"};
const KEY = "tt:progress";
const DAYS = [1, 3, 7, 14, 30];
const cfg = () => { try { return {new: 10, due: 0, ...JSON.parse(localStorage.getItem("tt:set"))}; } catch { return {new: 10, due: 0}; } };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
let DATA, ALL = [], S = null, NEWQ = 0;
const banner = () => NEWQ > 0 ? `<div class="fb good"><b>Вопросы обновлены:</b> +${NEWQ}</div>` : "";
const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));

let TAB = "main";
const tabs = () => `<nav class="tabs">${[["main", "Главная"], ["topics", "Темы"], ["stats", "Профиль"]].map(([k, l]) => `<button data-tab="${k}" class="${TAB === k ? "on" : ""}">${l}</button>`).join("")}</nav>`;
function streak() {
  try { const d = JSON.parse(localStorage.getItem("tt:days") || "[]"), t = new Date(); let n = 0;
    if (!d.includes(t.toLocaleDateString("sv"))) t.setDate(t.getDate() - 1);
    while (d.includes(t.toLocaleDateString("sv"))) { n++; t.setDate(t.getDate() - 1); } return n; } catch { return 0; }
}
function home() {
  S = null;
  const prog = load(), now = Date.now(), P = q => prog[q.id];
  const bad = ALL.filter(q => P(q) && P(q).last === "bad");
  const c = cfg(), d0 = new Date().setHours(0, 0, 0, 0);
  const newToday = ALL.filter(q => P(q) && (P(q).first || 0) >= d0).length;
  const dueQ = shuffle(ALL.filter(q => P(q) && (P(q).due || 0) <= now));
  const today = [...(c.due ? dueQ.slice(0, c.due) : dueQ), ...shuffle(ALL.filter(q => !P(q))).slice(0, c.new ? Math.max(0, c.new - newToday) : 1e9)];
  const mast = qs => qs.filter(q => P(q) && (P(q).box || 1) >= 3).length;
  let h = banner();
  if (TAB === "main") {
    const mp = ALL.length ? Math.round(mast(ALL) / ALL.length * 100) : 0;
    h += `<div class="hero"><div class="ring" style="--p:${mp * 3.6}deg"><b>${mp}%</b></div><div><h1>Тренажёр теории</h1><p class="sub">освоено ${mast(ALL)} из ${ALL.length}<br>серия ${streak()} дн. · ошибок ${bad.length}</p></div></div><div class="modes">`;
    if (today.length) h += `<button class="btn primary" data-n="today">Повторение на сегодня (${today.length})</button>`;
    for (const n of [20, 40]) if (ALL.length > n) h += `<button class="btn" data-n="${n}">${n} вопросов</button>`;
    h += `<button class="btn" data-n="all">Все (${ALL.length})</button>`;
    if (bad.length) h += `<button class="btn warn" data-n="bad">Ошибки (${bad.length})</button>`;
    h += `</div>`;
  } else if (TAB === "topics") {
    h += `<h1>Темы</h1>`;
    const byCh = {}; DATA.topics.forEach(t => (byCh[t.chapter] = byCh[t.chapter] || []).push(t));
    for (const [ch, list] of Object.entries(byCh)) {
      h += `<h2>${esc(CHAPTERS[ch] || ch)}</h2>` + list.map(t => { const qs = ALL.filter(q => q.topic === t.topic), s = qs.filter(P).length, m = mast(qs);
        return `<button class="topic col" data-t="${esc(t.topic)}"><div class="row"><b>${esc(t.title)}</b><span>${s} / ${qs.length}</span></div><div class="meter"><i class="seen" style="width:${s / qs.length * 100}%"></i><i class="mast" style="width:${m / qs.length * 100}%"></i></div><small>освоено ${m}</small></button>`; }).join("");
    }
  } else {
    const tot = Object.values(prog).reduce((a, r) => [a[0] + r.n, a[1] + r.ok], [0, 0]);
    const seg = (t, k, vals) => `<p class="lbl">${t}</p><div class="seg">${vals.map(v => `<button data-set="${k}" data-v="${v}" class="${cfg()[k] === v ? "on" : ""}">${v || "∞"}</button>`).join("")}</div>`;
    const row = (a, b) => `<div class="topic static"><b>${a}</b><span>${b}</span></div>`;
    h += `<h1>Профиль</h1>` + row("Ответов всего", tot[0]) + row("Верных", (tot[0] ? Math.round(tot[1] / tot[0] * 100) : 0) + "%") + row("Освоено (2 верных подряд)", `${mast(ALL)} / ${ALL.length}`) + row("Дней подряд", streak()) +
      `<h2>Коробки повторения</h2>` + DAYS.map((d, i) => row(`Коробка ${i + 1} (раз в ${d} дн.)`, ALL.filter(q => P(q) && (P(q).box || 1) === i + 1).length)).join("") +
      `<h2>Настройки</h2>` + seg("Новых вопросов в день (∞ — без лимита)", "new", [5, 10, 20, 0]) + seg("Повторов за раз (∞ — все, что подошли по сроку)", "due", [20, 40, 0]) + `<h2>Данные</h2><div class="modes"><button class="btn" id="exp">Экспорт</button><button class="btn" id="imp">Импорт</button><button class="btn warn" id="rst">Сбросить</button></div><h2>Офлайн</h2><p class="sub" id="off">Проверяю…</p>`;
  }
  root.innerHTML = h + tabs();
  root.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { TAB = b.dataset.tab; home(); window.scrollTo(0, 0); });
  root.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { const n = b.dataset.n;
    start(n === "today" ? today : n === "bad" ? bad : n === "all" ? ALL : shuffle(ALL).slice(0, +n)); });
  root.querySelectorAll("[data-t]").forEach(b => b.onclick = () => start(ALL.filter(q => q.topic === b.dataset.t)));
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on("exp", () => navigator.clipboard.writeText(JSON.stringify(load())).then(() => alert("Прогресс скопирован в буфер обмена"), () => alert("Не удалось скопировать")));
  on("imp", () => { const t = prompt("Вставь скопированный прогресс"); if (t) { try { save(JSON.parse(t)); home(); } catch { alert("Не удалось прочитать"); } } });
  on("rst", () => { if (confirm("Удалить весь прогресс на этом устройстве?")) { try { localStorage.removeItem(KEY); localStorage.removeItem("tt:days"); } catch {} home(); } });
  root.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { const c = cfg(); c[b.dataset.set] = +b.dataset.v; try { localStorage.setItem("tt:set", JSON.stringify(c)); } catch {} home(); });
  const off = document.getElementById("off");
  if (off) (async () => { try { const ks = await caches.keys(), n = ks.length ? (await (await caches.open(ks[0])).keys()).length : 0;
    off.textContent = `Версия данных ${DATA.version}. ` + (navigator.serviceWorker && navigator.serviceWorker.controller && n ? `Офлайн готов: сохранено файлов ${n}` : "Офлайн не готов: закрой и открой приложение при включённой сети"); } catch { off.textContent = "Офлайн недоступен в этом режиме"; } })();
}

function start(list) { S = {qs: shuffle(list), i: 0, res: []}; question(); }

function question() {
  const q = S.qs[S.i];
  root.innerHTML = `<div class="bar"><button class="link" id="quit">← Выйти</button><span>${S.i + 1} / ${S.qs.length}</span></div>
    <div class="prog"><i style="width:${S.i / S.qs.length * 100}%"></i></div>
    <p class="tp">${esc(q.title)}</p><h1 class="q">${md(q.q)}</h1><div id="area"></div><div id="fb"></div>`;
  document.getElementById("quit").onclick = home;
  const area = document.getElementById("area");
  ({choice, multi, order, card})[q.type](q, area);
}

function done(q, ok, extra = "") {
  const p = load();
  const r = p[q.id] || {n: 0, ok: 0};
  const box = ok ? Math.min(5, (r.box || 1) + 1) : 1;
  p[q.id] = {n: r.n + 1, ok: r.ok + (ok ? 1 : 0), last: ok ? "ok" : "bad", ts: Date.now(), first: r.first || Date.now(), box, due: Date.now() + DAYS[box - 1] * 864e5};
  save(p);
  try { const d = JSON.parse(localStorage.getItem("tt:days") || "[]"), k = new Date().toLocaleDateString("sv"); if (!d.includes(k)) { d.push(k); localStorage.setItem("tt:days", JSON.stringify(d.slice(-400))); } } catch {}
  S.res.push({q, ok});
  const last = S.i === S.qs.length - 1;
  document.getElementById("fb").innerHTML = `<div class="fb ${ok ? "good" : "bad"}"><b>${ok ? "Верно" : "Неверно"}</b>${extra}${q.explain ? `<p>${md(q.explain)}</p>` : ""}</div>
    <button class="btn primary" id="next">${last ? "Итоги" : "Дальше"}</button>`;
  document.getElementById("next").onclick = () => { if (last) results(); else { S.i++; question(); } };
  document.getElementById("next").scrollIntoView({block: "nearest"});
}

function choice(q, area) {
  const opts = shuffle(q.options.map((t, i) => ({t, i})));
  area.innerHTML = opts.map(o => `<button class="opt" data-i="${o.i}">${md(o.t)}</button>`).join("");
  area.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    area.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (+x.dataset.i === q.answer) x.classList.add("good"); });
    if (i !== q.answer) b.classList.add("bad");
    done(q, i === q.answer);
  });
}

function multi(q, area) {
  const opts = shuffle(q.options.map((t, i) => ({t, i})));
  const sel = new Set();
  area.innerHTML = opts.map(o => `<button class="opt" data-i="${o.i}">${md(o.t)}</button>`).join("") + `<button class="btn primary" id="chk">Проверить</button>`;
  area.querySelectorAll(".opt").forEach(b => b.onclick = () => { const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle("sel"); });
  document.getElementById("chk").onclick = () => {
    area.querySelectorAll(".opt").forEach(x => {
      const i = +x.dataset.i; x.disabled = true; x.classList.remove("sel");
      if (q.answer.includes(i)) x.classList.add("good"); else if (sel.has(i)) x.classList.add("bad");
    });
    document.getElementById("chk").remove();
    done(q, same([...sel], q.answer));
  };
}

function order(q, area) {
  const pool = shuffle(q.items.map((t, i) => ({t, i})));
  const picked = [];
  const draw = () => {
    area.innerHTML = `<p class="hint">Нажимай шаги в правильном порядке</p><ol class="seq">${picked.map(o => `<li>${md(o.t)}</li>`).join("")}</ol>` +
      pool.filter(o => !picked.includes(o)).map(o => `<button class="opt" data-i="${o.i}">${md(o.t)}</button>`).join("") +
      (picked.length ? `<button class="link" id="rst">Сбросить</button>` : "");
    area.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      picked.push(pool.find(o => o.i === +b.dataset.i));
      if (picked.length < pool.length) return draw();
      const ok = picked.every((o, k) => o.i === k);
      area.innerHTML = `<ol class="seq">${picked.map((o, k) => `<li class="${o.i === k ? "good" : "bad"}">${md(o.t)}</li>`).join("")}</ol>`;
      done(q, ok, ok ? "" : `<p>Правильный порядок:</p><ol>${q.items.map(t => `<li>${md(t)}</li>`).join("")}</ol>`);
    });
    const r = document.getElementById("rst"); if (r) r.onclick = () => { picked.length = 0; draw(); };
  };
  draw();
}

function card(q, area) {
  area.innerHTML = `<p class="hint">Ответь про себя или вслух, потом открой ответ</p><button class="btn primary" id="show">Показать ответ</button>`;
  document.getElementById("show").onclick = () => {
    area.innerHTML = `<div class="fb"><p>${md(q.answer)}</p></div><div class="modes"><button class="btn" data-k="1">Знал</button><button class="btn warn" data-k="0">Не знал</button></div>`;
    area.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { area.innerHTML = `<div class="fb"><p>${md(q.answer)}</p></div>`; done(q, b.dataset.k === "1"); });
  };
}

function results() {
  const ok = S.res.filter(r => r.ok).length, n = S.res.length, bad = S.res.filter(r => !r.ok);
  const byT = {};
  S.res.forEach(r => { const t = byT[r.q.title] = byT[r.q.title] || [0, 0]; t[1]++; if (r.ok) t[0]++; });
  root.innerHTML = `<h1>${ok} из ${n}</h1><p class="sub">${Math.round(ok / n * 100)}% верно</p>
    ${Object.entries(byT).map(([t, [a, b]]) => `<div class="topic static"><b>${esc(t)}</b><span>${a} / ${b}</span></div>`).join("")}
    ${bad.length ? `<h2>Ошибки</h2>` + bad.map(r => `<div class="fb bad"><b>${md(r.q.q)}</b>${r.q.explain ? `<p>${md(r.q.explain)}</p>` : r.q.answer ? `<p>${md(r.q.answer)}</p>` : ""}</div>`).join("") : ""}
    <div class="modes">${bad.length ? `<button class="btn warn" id="again">Повторить ошибки</button>` : ""}<button class="btn primary" id="home">На главную</button></div>`;
  document.getElementById("home").onclick = home;
  const a = document.getElementById("again"); if (a) a.onclick = () => start(bad.map(r => r.q));
}

(async function () {
  try {
    DATA = await (await fetch("data.json", {cache: "no-cache"})).json();
    DATA.topics.forEach(t => t.questions.forEach(q => ALL.push({...q, topic: t.topic, title: t.title})));
    const prev = +localStorage.getItem("tt:count") || 0;
    NEWQ = prev && ALL.length > prev ? ALL.length - prev : 0;
    try { localStorage.setItem("tt:count", ALL.length); } catch {}
    home();
  } catch (e) { root.innerHTML = `<p class="err">Не удалось загрузить вопросы: ${esc(e.message)}</p>`; }
})();

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js", {updateViaCache: "none"}));
