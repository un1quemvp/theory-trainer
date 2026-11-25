"use strict";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const CHAPTERS = {git: "Git", terminal: "Терминал", python: "Python", linux: "Linux", net: "Сети", http: "HTTP", algo: "Алгоритмы"};
async function main() {
  const app = document.getElementById("app");
  try {
    const data = await (await fetch("data.json", {cache: "no-cache"})).json();
    const total = data.topics.reduce((n, t) => n + t.questions.length, 0);
    const byChapter = {};
    data.topics.forEach(t => (byChapter[t.chapter] = byChapter[t.chapter] || []).push(t));
    let html = `<h1>Тренажёр теории</h1><p class="sub">${total} вопросов · версия ${esc(data.version)}</p>`;
    for (const [ch, list] of Object.entries(byChapter)) {
      html += `<h2>${esc(CHAPTERS[ch] || ch)}</h2>`;
      html += list.map(t => `<div class="topic"><b>${esc(t.title)}</b><span>${t.questions.length}</span></div>`).join("");
    }
    app.innerHTML = html;
  } catch (e) {
    app.innerHTML = `<p class="err">Не удалось загрузить вопросы: ${esc(e.message)}</p>`;
  }
}
main();
