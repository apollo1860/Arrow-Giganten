'use strict';

// ---------- Trinkspiel: Inhalte ----------

const CATS = {
  drink: { icon: '🍺', name: 'Trinken', color: '#f2b705' },
  rule: { icon: '📜', name: 'Regel', color: '#8a3fd1' },
  game: { icon: '🎲', name: 'Spielfeld', color: '#1f5fd6' },
  group: { icon: '🎉', name: 'Gruppe', color: '#e0409a' },
};
const CUSTOM_CATS = ['drink', 'group', 'rule']; // Spielfeld-Effekte gibt es nur als Vorlage

const LEVELS = ['Mild', 'Normal', 'Hart'];
// Schluckzahlen je Stufe: S = wenig, M = mittel, B = viel
const AMOUNTS = { S: [1, 1, 2], M: [1, 2, 3], B: [2, 3, 5] };

const FIELD_SHARE = 0.5;    // Anteil der Aktionsfelder (ohne Start- und Zielreihe)
const RULE_SHARE = 1 / 6;   // davon Regel-Felder
const MAX_RULES = 5;        // so viele Regeln gelten gleichzeitig
const BOT_TASK_DELAY = 2200;

const DRINK_DEFAULTS = {
  source: 'presets', // 'presets' | 'custom'
  fill: true,        // eigene Felder mit Vorlagen auffüllen
  cats: { drink: true, rule: true, game: true, group: true },
  level: 1,
  custom: [],        // { cat, text }
};

// t: Text mit {S}/{M}/{B} oder Funktion (Spieler) => Text; min = ab Stufe; fx = Effekt aufs Brett
const PRESETS = [
  { cat: 'drink', t: 'Trink {M}.' },
  { cat: 'drink', t: 'Verteile {B}, wie du willst.' },
  { cat: 'drink', t: 'Dein linker Nachbar trinkt {M}.' },
  { cat: 'drink', t: 'Dein rechter Nachbar trinkt {M}.' },
  { cat: 'drink', t: 'Doppelt hält besser: Trink {S} und verteile {S}.' },
  { cat: 'drink', t: 'Glück gehabt! Verteile {M}.' },
  { cat: 'drink', t: 'Such dir einen Trinkpartner aus – bis zum nächsten 🍺-Feld trinkt er immer mit, wenn du trinkst.' },
  { cat: 'drink', t: (p) => leaderText(p) },
  { cat: 'drink', t: (p) => lastText(p) },
  { cat: 'drink', t: 'Kampftrinker: Trink {B}.', min: 1 },
  { cat: 'drink', t: 'Trink {B} – und such dir jemanden aus, der mittrinkt.', min: 2 },

  { cat: 'group', t: 'Prost! Alle trinken {S}.' },
  { cat: 'group', t: 'Alle mit Brille trinken {M}.' },
  { cat: 'group', t: 'Wer zuletzt aufs Handy geschaut hat, trinkt {M}.' },
  { cat: 'group', t: 'Alle, die jünger sind als du, trinken {S}.' },
  { cat: 'group', t: 'Toast: Halte eine kurze Rede – danach trinken alle {S}.' },
  { cat: 'group', t: 'Wer als Letzter die Hand hebt, trinkt {M}.' },
  { cat: 'group', t: 'Alle, die heute schon Kaffee hatten, trinken {S}.' },
  { cat: 'group', t: 'Alle, die Single sind, trinken {S}.' },
  { cat: 'group', t: 'Wasserfall! Du fängst an, alle trinken mit – keiner hört auf, bevor sein Vordermann aufhört.', min: 2 },

  { cat: 'game', t: 'Rückenwind! Würfle sofort noch einmal.', fx: 'again' },
  { cat: 'game', t: 'Lege sofort eine Bombe 💣 auf dieses Feld.', fx: 'bomb' },
  { cat: 'game', t: 'Trink {B} – oder geh 1 Reihe zurück.', fx: 'backOrDrink' },
  { cat: 'game', t: 'Tausche den Platz mit einem Spieler deiner Wahl.', fx: 'swap' },
  { cat: 'game', t: 'Rutschbahn: Geh 1 Reihe nach unten.', fx: 'forward' },
  { cat: 'game', t: (p) => aheadText(p) },
];

const RULE_PRESETS = [
  { name: 'Daumenmeister', t: 'Legst du den Daumen auf den Tisch, müssen alle nachziehen – wer zuletzt reagiert, trinkt.' },
  { name: 'Nasenmeister', t: 'Fasst du dir an die Nase, müssen alle nachmachen – wer zuletzt reagiert, trinkt.' },
  { name: 'Fragenmeister', t: 'Wer dir eine Frage beantwortet, trinkt.' },
  { name: 'Verbotenes Wort', t: 'Niemand darf mehr „trinken“ sagen.' },
  { name: 'Keine Namen', t: 'Niemand darf mehr Vornamen sagen.' },
  { name: 'Linke Hand', t: 'Getrunken wird nur noch mit der linken Hand.' },
  { name: 'Prost-Pflicht', t: 'Vor jedem Schluck muss man „Prost, Giganten!“ rufen.' },
  { name: 'Handyverbot', t: 'Wer aufs Handy schaut, trinkt.' },
];

// ---------- Texte ----------

function names(list) {
  const n = list.map((p) => p.name);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1] : n[0];
}

function placed() {
  return G.players.filter((p) => p.pos);
}

function leaderText(p) {
  const best = Math.max(...placed().map((q) => q.pos.r));
  const lead = placed().filter((q) => q.pos.r === best);
  if (lead.length === 1 && lead[0] === p) return 'Du liegst vorne – das kostet: Trink {M}.';
  return `Wer vorne liegt, trinkt {M}: ${names(lead)}.`;
}

function lastText(p) {
  const worst = Math.min(...placed().map((q) => q.pos.r));
  const last = placed().filter((q) => q.pos.r === worst);
  if (last.length === 1 && last[0] === p) return 'Du liegst hinten – als Trost darfst du {M} verteilen.';
  return `${names(last)} ${last.length > 1 ? 'liegen' : 'liegt'} hinten und ${last.length > 1 ? 'dürfen' : 'darf'} {M} verteilen.`;
}

function aheadText(p) {
  const ahead = placed().filter((q) => q.pos.r > p.pos.r);
  if (!ahead.length) return 'Niemand liegt vor dir – verteile {S}.';
  return `Alle vor dir trinken {S}: ${names(ahead)}.`;
}

function sips(n) {
  return n === 1 ? '1 Schluck' : `${n} Schlucke`;
}

function fillAmounts(text, level) {
  return text.replace(/\{([SMB])\}/g, (_, k) => sips(AMOUNTS[k][level]));
}

function itemText(item, p) {
  const raw = typeof item.t === 'function' ? item.t(p) : item.t;
  return fillAmounts(raw, G.drink.level);
}

// ---------- Aufbau ----------

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const presetsOn = (d) => d.source === 'presets' || d.fill;

function rulePool(d) {
  const pre = presetsOn(d) && d.cats.rule ? RULE_PRESETS : [];
  const own = d.source === 'custom' ? d.custom.filter((i) => i.cat === 'rule').map((i) => ({ name: null, t: i.text })) : [];
  return [...own, ...pre];
}

function hasDrinkContent(d) {
  return (presetsOn(d) && Object.values(d.cats).some(Boolean)) || (d.source === 'custom' && d.custom.length > 0);
}

// Verteilt die Aktionsfelder zufällig auf etwa die Hälfte der Kreise (ohne Start- und Zielreihe).
function buildFields(rows, cols, d) {
  const cells = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 0; c < cols; c++) cells.push(key(r, c));
  shuffle(cells);
  const n = Math.round(cells.length * FIELD_SHARE);

  const pre = presetsOn(d) ? PRESETS.filter((i) => d.cats[i.cat] && (i.min || 0) <= d.level) : [];
  const own = d.source === 'custom'
    ? shuffle(d.custom.filter((i) => i.cat !== 'rule').map((i) => ({ cat: i.cat, t: i.text })))
    : [];
  const nRule = rulePool(d).length ? Math.max(1, Math.round(n * RULE_SHARE)) : 0;

  const items = Array.from({ length: nRule }, () => ({ cat: 'rule' }));
  items.push(...own.slice(0, n - nRule));
  const filler = pre.length ? pre : own; // ohne Vorlagen werden eigene Felder wiederholt
  let bag = [];
  while (items.length < n && filler.length) {
    if (!bag.length) bag = shuffle([...filler]);
    items.push(bag.pop());
  }
  shuffle(items);

  const fields = new Map();
  items.forEach((item, i) => fields.set(cells[i], item));
  return fields;
}

// ---------- Setup ----------

let customCat = 'drink';

function renderDrinkSetup() {
  const d = settings.drink;
  $('#drinkSetup').classList.toggle('hidden', settings.mode !== 'drink');

  segment($('#sourceSeg'), [['presets', 'Nur Vorlagen'], ['custom', 'Eigene Felder']], d.source, (v) => { d.source = v; });
  $('#customBox').classList.toggle('hidden', d.source !== 'custom');

  const sel = $('#customCat');
  sel.innerHTML = '';
  for (const c of CUSTOM_CATS) {
    const o = el('option', '', `${CATS[c].icon} ${CATS[c].name}`);
    o.value = c;
    sel.append(o);
  }
  sel.value = customCat;

  const list = $('#customList');
  list.innerHTML = '';
  d.custom.forEach((item, i) => {
    const li = el('li');
    li.style.setProperty('--cat', CATS[item.cat].color);
    const rm = el('button', 'remove', '×');
    rm.title = 'Entfernen';
    rm.onclick = () => { d.custom.splice(i, 1); saveSettings(); renderSetup(); };
    li.append(el('span', 'ci', CATS[item.cat].icon), el('span', 'ct', item.text), rm);
    list.append(li);
  });
  if (!d.custom.length) list.append(el('li', 'empty', 'Noch keine eigenen Felder – leg los!'));

  $('#fillPresets').checked = d.fill;
  $('#presetBox').classList.toggle('hidden', !presetsOn(d));

  const checks = $('#catChecks');
  checks.innerHTML = '';
  for (const [id, c] of Object.entries(CATS)) {
    const b = el('button', 'chip' + (d.cats[id] ? ' on' : ''), `${c.icon} ${c.name}`);
    b.style.setProperty('--cat', c.color);
    b.onclick = () => { d.cats[id] = !d.cats[id]; saveSettings(); renderSetup(); };
    checks.append(b);
  }

  segment($('#levelSeg'), LEVELS.map((l, i) => [i, l]), d.level, (v) => { d.level = v; });

  const ok = settings.mode !== 'drink' || hasDrinkContent(d);
  $('#drinkWarn').textContent = ok ? '' : 'Füge eigene Felder hinzu oder wähle Vorlagen aus.';
  $('#startBtn').disabled = !ok;
}

function addCustom() {
  const input = $('#customText');
  const text = input.value.trim();
  if (!text) return;
  settings.drink.custom.push({ cat: customCat, text });
  input.value = '';
  saveSettings();
  renderSetup();
  $('#customText').focus();
}

function bindDrinkSetup() {
  $('#customAdd').onclick = addCustom;
  $('#customText').addEventListener('keydown', (e) => { if (e.key === 'Enter') addCustom(); });
  $('#customCat').onchange = (e) => { customCat = e.target.value; };
  $('#fillPresets').onchange = (e) => { settings.drink.fill = e.target.checked; saveSettings(); renderSetup(); };
}

// ---------- Aufgabenkarte ----------

let taskToken = 0;

function closeTask() {
  taskToken++;
  $('#taskOverlay').classList.add('hidden');
}

// Zeigt die Karte zum Feld und löst mit dem Ergebnis auf: { text?, fx?, with?, rule? }
function openTask(p, field) {
  return new Promise((resolve) => {
    const token = ++taskToken;
    const cat = CATS[field.cat];
    const card = $('#taskCard');
    card.style.setProperty('--cat', cat.color);
    $('#taskIcon').textContent = cat.icon;
    $('#taskCat').textContent = cat.name;
    const who = $('#taskWho');
    who.innerHTML = '';
    const dot = el('span', 'dot');
    dot.style.background = p.color;
    who.append(dot, el('span', '', p.name));
    const body = $('#taskBody');
    const actions = $('#taskActions');
    body.innerHTML = '';
    actions.innerHTML = '';

    const done = (res) => {
      if (token !== taskToken) return;
      $('#taskOverlay').classList.add('hidden');
      resolve(res);
    };
    const button = (label, cls, res) => {
      const b = el('button', 'btn ' + cls, label);
      b.onclick = () => done(res);
      actions.append(b);
      return b;
    };
    let botChoice;

    if (field.cat === 'rule') {
      $('#taskText').textContent = fillAmounts('Aktiviere eine Regel – oder denk dir selbst eine aus. Wer dagegen verstößt, trinkt {S}.', G.drink.level);
      const rules = rulePool(G.drink).filter((rule) => !G.rules.some((a) => a.t === rule.t));
      const opts = el('div', 'rule-options');
      for (const rule of rules) {
        const b = el('button', 'rule-option');
        if (rule.name) b.append(el('b', '', rule.name));
        b.append(el('span', '', rule.t));
        b.onclick = () => done({ rule });
        opts.append(b);
      }
      body.append(opts);
      const own = el('div', 'own-rule');
      const input = el('input');
      input.placeholder = 'Eigene Regel ausdenken …';
      input.maxLength = 120;
      const go = el('button', 'btn primary', 'Aktivieren');
      const submit = () => { if (input.value.trim()) done({ rule: { name: null, t: input.value.trim() } }); };
      go.onclick = submit;
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      own.append(input, go);
      body.append(own);
      button('Ohne Regel weiter', 'ghost', {});
      botChoice = () => (rules.length ? { rule: rules[Math.floor(Math.random() * rules.length)] } : {});
    } else {
      const item = field;
      const text = itemText(item, p);
      $('#taskText').textContent = text;
      if (item.fx === 'backOrDrink') {
        button('🍺 Ich trinke', 'primary', { text });
        button('⬆️ 1 Reihe zurück', 'ghost', { text, fx: 'back' });
        botChoice = () => (Math.random() < 0.5 ? { text } : { text, fx: 'back' });
      } else if (item.fx === 'swap') {
        const others = placed().filter((q) => q !== p);
        for (const q of others) {
          const b = button(`⇄ ${q.name}`, 'ghost swap', { text, fx: 'swap', with: q });
          b.style.setProperty('--c', q.color);
        }
        button('Nicht tauschen', 'ghost', { text });
        // Bot tauscht mit dem, der am weitesten vorne liegt – falls der vor ihm ist
        botChoice = () => {
          const best = others.reduce((a, q) => (!a || q.pos.r > a.pos.r ? q : a), null);
          return best && best.pos.r > p.pos.r ? { text, fx: 'swap', with: best } : { text };
        };
      } else {
        const labels = { again: '🎲 Nochmal würfeln', bomb: '💣 Bombe legen', forward: '⬇️ Runterrutschen' };
        const res = { text, fx: item.fx };
        button(labels[item.fx] || 'Erledigt ✓', 'primary', res);
        botChoice = () => res;
      }
    }

    $('#taskOverlay').classList.remove('hidden');
    if (p.bot) setTimeout(() => done(botChoice()), BOT_TASK_DELAY);
  });
}

// ---------- Aktive Regeln (Seitenleiste) ----------

function renderRules() {
  const box = $('#rulesBox');
  box.classList.toggle('hidden', !G.fields);
  if (!G.fields) return;
  const list = $('#ruleList');
  list.innerHTML = '';
  if (!G.rules.length) list.append(el('li', 'empty', 'Noch keine – landet auf einem 📜-Feld!'));
  G.rules.forEach((rule, i) => {
    const li = el('li');
    li.style.setProperty('--c', rule.color);
    const txt = el('span', 'rt');
    if (rule.name) txt.append(el('b', '', rule.name + ': '));
    txt.append(document.createTextNode(rule.t));
    const rm = el('button', 'remove', '×');
    rm.title = 'Regel aufheben';
    rm.onclick = () => { G.rules.splice(i, 1); renderRules(); };
    li.append(txt, rm);
    list.append(li);
  });
}

function renderCatLegend() {
  const wrap = $('#catLegend');
  wrap.classList.toggle('hidden', !G.fields);
  if (!G.fields) return;
  wrap.innerHTML = '';
  const used = new Set([...G.fields.values()].map((f) => f.cat));
  for (const [id, c] of Object.entries(CATS)) {
    if (!used.has(id)) continue;
    const item = el('span', 'cl', `${c.icon} ${c.name}`);
    item.style.setProperty('--cat', c.color);
    wrap.append(item);
  }
}
