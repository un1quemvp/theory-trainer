"use strict";
const root = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const md = s => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const CHAPTERS = {git: "Git", terminal: "Терминал", python: "Python", linux: "Linux", net: "Сети", http: "HTTP", algo: "Алгоритмы"};
const KEY = "tt:progress";
const DAYS = [1, 3, 7, 14, 30];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
let DATA, ALL = [], S = null, NEWQ = 0;
const banner = () => NEWQ > 0 ? `<div class="fb good"><b>Вопросы обновлены:</b> +${NEWQ}</div>` : "";
const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));

function home() {
  S = null;
  const prog = load();
  const seen = ALL.filter(q => prog[q.id]).length;
  const bad = ALL.filter(q => prog[q.id] && prog[q.id].last === "bad");
  const now = Date.now();
  const today = [...ALL.filter(q => prog[q.id] && (prog[q.id].due || 0) <= now), ...shuffle(ALL.filter(q => !prog[q.id])).slice(0, 10)];
  const mast = t => t.questions.filter(q => prog[q.id] && (prog[q.id].box || 1) >= 3).length;
  const byCh = {};
  DATA.topics.forEach(t => (byCh[t.chapter] = byCh[t.chapter] || []).push(t));
  let h = banner() + `<h1>Тренажёр теории</h1><p class="sub">${ALL.length} вопросов · пройдено ${seen} · ошибок ${bad.length}</p><div class="modes">`;
  if (today.length) h += `<button class="btn primary" data-n="today">Повторение на сегодня (${today.length})</button>`;
  for (const n of [20, 40]) if (ALL.length > n) h += `<button class="btn" data-n="${n}">${n} вопросов</button>`;
  h += `<button class="btn" data-n="all">Все (${ALL.length})</button>`;
  if (bad.length) h += `<button class="btn warn" data-n="bad">Ошибки (${bad.length})</button>`;
  h += `</div>`;
  for (const [ch, list] of Object.entries(byCh)) {
    h += `<h2>${esc(CHAPTERS[ch] || ch)}</h2>`;
    h += list.map(t => `<button class="topic" data-t="${esc(t.topic)}"><b>${esc(t.title)}</b><span>${mast(t)} / ${t.questions.length}</span></button>`).join("");
  }
  h += `<h2>Прогресс</h2><div class="modes"><button class="btn" id="exp">Экспорт</button><button class="btn" id="imp">Импорт</button></div>`;
  root.innerHTML = h;
  document.getElementById("exp").onclick = () => navigator.clipboard.writeText(JSON.stringify(load())).then(() => alert("Прогресс скопирован в буфер обмена"), () => alert("Не удалось скопировать"));
  document.getElementById("imp").onclick = () => { const t = prompt("Вставь скопированный прогресс"); if (t) { try { save(JSON.parse(t)); home(); } catch { alert("Не удалось прочитать"); } } };
  root.querySelectorAll("[data-n]").forEach(b => b.onclick = () => {
    const n = b.dataset.n;
    start(n === "today" ? today : n === "bad" ? bad : n === "all" ? ALL : ALL.slice().sort(() => Math.random() - .5).slice(0, +n));
  });
  root.querySelectorAll("[data-t]").forEach(b => b.onclick = () => start(ALL.filter(q => q.topic === b.dataset.t)));
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
  p[q.id] = {n: r.n + 1, ok: r.ok + (ok ? 1 : 0), last: ok ? "ok" : "bad", ts: Date.now(), box, due: Date.now() + DAYS[box - 1] * 864e5};
  save(p);
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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", {updateViaCache: "none"});
