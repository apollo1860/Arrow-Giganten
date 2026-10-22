'use strict';

// ---------- Konstanten ----------

// Würfelzahl -> Richtung (6 = Joker)
const DIRS = {
  1: { dr: 1, dc: 0, arrow: '↓' },
  2: { dr: 1, dc: -1, arrow: '↙' },
  3: { dr: 1, dc: 1, arrow: '↘' },
  4: { dr: 0, dc: 1, arrow: '→' },
  5: { dr: 0, dc: -1, arrow: '←' },
};

const LEGEND = [
  { n: 1, label: '↓', color: '#e0262f' },
  { n: 2, label: '↙', color: '#f2b705' },
  { n: 3, label: '↘', color: '#1f5fd6' },
  { n: 4, label: '→', color: '#1c9b4a' },
  { n: 5, label: '←', color: '#f07a12' },
  { n: 6, label: 'Joker', color: '#e0409a' },
];

const COLORS = [
  { name: 'Blau', hex: '#1f5fd6' },
  { name: 'Rot', hex: '#e0262f' },
  { name: 'Grün', hex: '#1c9b4a' },
  { name: 'Orange', hex: '#f07a12' },
  { name: 'Lila', hex: '#8a3fd1' },
  { name: 'Pink', hex: '#e0409a' },
];

const SIZES = {
  classic: { cols: 6, rows: 9, label: 'Klassisch 6×9' },
  big: { cols: 8, rows: 12, label: 'Groß 8×12' },
};

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

const MAX_PLAYERS = COLORS.length;
const BOT_DELAY = 650;
const S = 60;        // Rasterabstand im SVG
const R = 15;        // Kreisradius
const FINISH_H = 22; // Höhe des Zielstreifens

const STORAGE_KEY = 'arrow-giganten-settings';

// ---------- Helfer ----------

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (r, c) => r + ',' + c;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.players) && s.players.length >= 2 && SIZES[s.size]) return s;
  } catch (e) { /* ignorieren */ }
  return null;
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) { /* ignorieren */ }
}

let settings = loadSettings() || {
  size: 'classic',
  players: [
    { name: 'Blau', color: 0, bot: false },
    { name: 'Rot', color: 1, bot: true },
  ],
};

// ---------- Setup-Bildschirm ----------

function usedColors(except) {
  return new Set(settings.players.filter((p) => p !== except).map((p) => p.color));
}

function nextFreeColor(from, except) {
  const used = usedColors(except);
  for (let i = 1; i <= COLORS.length; i++) {
    const c = (from + i) % COLORS.length;
    if (!used.has(c)) return c;
  }
  return from;
}

function renderSetup() {
  const wrap = $('#playerRows');
  wrap.innerHTML = '';
  settings.players.forEach((p, i) => {
    const row = el('div', 'player-row');

    const sw = el('button', 'swatch');
    sw.style.background = COLORS[p.color].hex;
    sw.title = 'Farbe wechseln';
    sw.onclick = () => {
      const old = p.color;
      p.color = nextFreeColor(old, p);
      if (p.name === COLORS[old].name) p.name = COLORS[p.color].name;
      saveSettings();
      renderSetup();
    };

    const name = el('input');
    name.value = p.name;
    name.maxLength = 14;
    name.placeholder = COLORS[p.color].name;
    name.oninput = () => { p.name = name.value; saveSettings(); };

    const seg = el('div', 'seg');
    [['Mensch', false], ['Bot', true]].forEach(([label, bot]) => {
      const b = el('button', p.bot === bot ? 'on' : '', label);
      b.onclick = () => { p.bot = bot; saveSettings(); renderSetup(); };
      seg.append(b);
    });

    const rm = el('button', 'remove', '×');
    rm.title = 'Spieler entfernen';
    rm.disabled = settings.players.length <= 2;
    rm.onclick = () => { settings.players.splice(i, 1); saveSettings(); renderSetup(); };

    row.append(sw, name, seg, rm);
    wrap.append(row);
  });

  $('#addPlayer').disabled = settings.players.length >= MAX_PLAYERS;

  const sizeSeg = $('#sizeSeg');
  sizeSeg.innerHTML = '';
  Object.entries(SIZES).forEach(([id, s]) => {
    const b = el('button', settings.size === id ? 'on' : '', s.label);
    b.onclick = () => { settings.size = id; saveSettings(); renderSetup(); };
    sizeSeg.append(b);
  });
}

function addPlayer() {
  if (settings.players.length >= MAX_PLAYERS) return;
  const used = usedColors();
  const color = COLORS.findIndex((_, i) => !used.has(i));
  settings.players.push({ name: COLORS[color].name, color, bot: true });
  saveSettings();
  renderSetup();
}

function showSetup() {
  G && (G.id = -1); // laufende Animationen/Bots abbrechen
  $('#overlay').classList.add('hidden');
  $('#game').classList.add('hidden');
  $('#setup').classList.remove('hidden');
  renderSetup();
}

// ---------- Spielzustand ----------

let G = null;
let gameCounter = 0;

function newGame() {
  const size = SIZES[settings.size];
  G = {
    id: ++gameCounter,
    rows: size.rows,
    cols: size.cols,
    players: settings.players.map((p) => ({
      name: p.name.trim() || COLORS[p.color].name,
      color: COLORS[p.color].hex,
      bot: p.bot,
      pos: null,
      path: [],
      out: false,
    })),
    occ: new Map(), // "r,c" -> Spielerindex
    current: 0,
    phase: 'idle',
    roll: null,
    anim: null,
    log: [],
  };
  $('#setup').classList.add('hidden');
  $('#overlay').classList.add('hidden');
  $('#game').classList.remove('hidden');
  setDie(null);
  addLog('Neues Spiel – wer kommt zuerst unten an?');
  beginTurn();
}

const cur = () => G.players[G.current];

function free(r, c) {
  return r >= 0 && r < G.rows && c >= 0 && c < G.cols && !G.occ.has(key(r, c));
}

function targetOf(p, n) {
  const d = DIRS[n];
  const r = p.pos.r + d.dr;
  const c = p.pos.c + d.dc;
  return free(r, c) ? { r, c } : null;
}

function validMoves(p) {
  const moves = [];
  for (let n = 1; n <= 5; n++) {
    const t = targetOf(p, n);
    if (t) moves.push({ n, ...t });
  }
  return moves;
}

function freeStarts() {
  const cells = [];
  for (let c = 0; c < G.cols; c++) if (free(0, c)) cells.push({ r: 0, c });
  return cells;
}

function arrowBetween(a, b) {
  const n = Object.keys(DIRS).find((k) => DIRS[k].dr === b.r - a.r && DIRS[k].dc === b.c - a.c);
  return DIRS[n].arrow;
}

function addLog(msg) {
  G.log.unshift(msg);
  G.log.length = Math.min(G.log.length, 30);
}

// ---------- Spielablauf ----------

function beginTurn() {
  const p = cur();
  G.roll = null;
  if (!p.pos) {
    if (freeStarts().length === 0) {
      eliminate(p, 'findet keinen freien Startkreis');
      return advance();
    }
    G.phase = 'start';
  } else if (validMoves(p).length === 0) {
    eliminate(p, 'ist eingesperrt und scheidet aus');
    return advance();
  } else {
    G.phase = 'roll';
  }
  render();
  if (p.bot) botAct();
}

function advance() {
  const n = G.players.length;
  for (let i = 1; i <= n; i++) {
    const j = (G.current + i) % n;
    if (!G.players[j].out) {
      G.current = j;
      return beginTurn();
    }
  }
  endWithoutWinner();
}

function eliminate(p, reason) {
  p.out = true;
  addLog(`🔒 ${p.name} ${reason}.`);
}

function place(p, cell) {
  G.occ.set(key(cell.r, cell.c), G.players.indexOf(p));
  p.path.push(cell);
  if (p.pos) G.anim = { pi: G.players.indexOf(p), seg: p.path.length - 2 };
  p.pos = cell;
}

function chooseStart(cell) {
  if (G.phase !== 'start' || !free(cell.r, cell.c) || cell.r !== 0) return;
  const p = cur();
  place(p, cell);
  addLog(`${p.name} startet in Spalte ${cell.c + 1}.`);
  G.phase = 'roll';
  render();
  if (p.bot) botAct();
}

async function roll() {
  if (G.phase !== 'roll') return;
  const id = G.id;
  const p = cur();
  G.phase = 'rolling';
  render();
  await animateDie();
  if (id !== G.id) return;

  const n = 1 + Math.floor(Math.random() * 6);
  G.roll = n;
  setDie(n);

  if (n === 6) {
    if (validMoves(p).length === 0) {
      addLog(`${p.name} würfelt Joker – aber kein Zug möglich. Aussetzen.`);
      return skip(id);
    }
    addLog(`${p.name} würfelt 6 – Joker! 🃏`);
    G.phase = 'joker';
    render();
    if (p.bot) botAct();
    return;
  }

  const t = targetOf(p, n);
  if (!t) {
    addLog(`${p.name} würfelt ${n} ${DIRS[n].arrow} – geht nicht, aussetzen.`);
    return skip(id);
  }
  addLog(`${p.name} würfelt ${n} ${DIRS[n].arrow}`);
  move(p, t);
}

async function skip(id) {
  G.phase = 'skip';
  render();
  await wait(1000);
  if (id !== G.id) return;
  advance();
}

function chooseJoker(cell) {
  if (G.phase !== 'joker') return;
  const p = cur();
  if (!validMoves(p).some((m) => m.r === cell.r && m.c === cell.c)) return;
  addLog(`${p.name} setzt den Joker: ${arrowBetween(p.pos, cell)}`);
  move(p, cell);
}

async function move(p, cell) {
  const id = G.id;
  place(p, cell);
  G.phase = 'moving';
  render();
  await wait(450);
  if (id !== G.id) return;
  if (cell.r === G.rows - 1) return win(p);
  advance();
}

function win(p) {
  G.phase = 'over';
  addLog(`🏁 ${p.name} ist unten angekommen!`);
  render();
  showResult('🏆', `${p.name} gewinnt!`, `Unten angekommen nach ${p.path.length - 1} Schritten.`, p.color);
}

function endWithoutWinner() {
  G.phase = 'over';
  const best = Math.max(...G.players.map((p) => (p.pos ? p.pos.r : -1)));
  const leaders = G.players.filter((p) => (p.pos ? p.pos.r : -1) === best);
  render();
  if (leaders.length === 1) {
    showResult('🔒', `${leaders[0].name} gewinnt!`,
      `Alle sind eingesperrt – ${leaders[0].name} kam am weitesten (Reihe ${best + 1}).`, leaders[0].color);
  } else {
    showResult('🤝', 'Unentschieden!',
      `Alle sind eingesperrt – ${leaders.map((p) => p.name).join(' & ')} kamen gleich weit.`, null);
  }
}

// ---------- Bot ----------

function botAct() {
  const id = G.id;
  const phase = G.phase;
  setTimeout(() => {
    if (id !== G.id || G.phase !== phase || !cur().bot) return;
    if (phase === 'start') chooseStart(botPickStart());
    else if (phase === 'roll') roll();
    else if (phase === 'joker') chooseJoker(botPickJoker(cur()));
  }, BOT_DELAY);
}

// Kürzester Weg (in Schritten) von start zur untersten Reihe über freie Kreise.
function distToBottom(start) {
  if (start.r === G.rows - 1) return 0;
  const seen = new Set([key(start.r, start.c)]);
  let frontier = [start];
  let d = 0;
  while (frontier.length) {
    d++;
    const next = [];
    for (const s of frontier) {
      for (let n = 1; n <= 5; n++) {
        const r = s.r + DIRS[n].dr;
        const c = s.c + DIRS[n].dc;
        const k = key(r, c);
        if (!free(r, c) || seen.has(k)) continue;
        if (r === G.rows - 1) return d;
        seen.add(k);
        next.push({ r, c });
      }
    }
    frontier = next;
  }
  return Infinity;
}

// Wie viele der drei Abwärtsrichtungen sind von cell aus frei?
function downOptions(cell) {
  let k = 0;
  for (let n = 1; n <= 3; n++) if (free(cell.r + DIRS[n].dr, cell.c + DIRS[n].dc)) k++;
  return k;
}

function botPickStart() {
  const others = G.players.filter((p) => p.pos).map((p) => p.pos.c);
  let best = null;
  let bestScore = Infinity;
  for (const cell of freeStarts()) {
    const edge = cell.c === 0 || cell.c === G.cols - 1 ? 1 : 0;
    const spacing = others.length ? Math.min(...others.map((c) => Math.abs(c - cell.c))) : 0;
    const score = edge - Math.min(spacing, 3) * 0.4 + Math.random() * 0.8;
    if (score < bestScore) { bestScore = score; best = cell; }
  }
  return best;
}

function botPickJoker(p) {
  let best = null;
  let bestScore = Infinity;
  for (const m of validMoves(p)) {
    if (m.r === G.rows - 1) return m;
    G.occ.set(key(m.r, m.c), -1); // probeweise besetzen
    const dist = distToBottom(m);
    const opts = downOptions(m);
    G.occ.delete(key(m.r, m.c));
    const score = (dist === Infinity ? 100 - m.r : dist) + (3 - opts) * 0.35 + Math.random() * 0.1;
    if (score < bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// ---------- Würfel ----------

function setDie(n) {
  const die = $('#die');
  if (!die.children.length) for (let i = 0; i < 9; i++) die.append(el('span', 'pip'));
  const on = n ? PIPS[n] : [];
  [...die.children].forEach((pip, i) => pip.classList.toggle('on', on.includes(i)));
  die.setAttribute('aria-label', n ? `Würfel zeigt ${n}` : 'Würfel');
}

async function animateDie() {
  const die = $('#die');
  die.classList.add('rolling');
  for (let i = 0; i < 9; i++) {
    setDie(1 + Math.floor(Math.random() * 6));
    await wait(70);
  }
  die.classList.remove('rolling');
}

// ---------- Darstellung ----------

function render() {
  renderLegend();
  renderBoard();
  renderPanel();
}

function renderLegend() {
  const wrap = $('#legend');
  wrap.innerHTML = '';
  for (const l of LEGEND) {
    const item = el('div', 'leg' + (G.roll === l.n ? ' active' : ''));
    const num = el('span', 'num', String(l.n));
    num.style.color = l.color;
    const arr = el('span', 'arr' + (l.n === 6 ? ' joker' : ''), l.label);
    item.append(num, arr);
    wrap.append(item);
  }
}

function targetsForCurrent() {
  if (G.phase === 'start') return freeStarts();
  if (G.phase === 'joker') return validMoves(cur());
  return [];
}

function renderBoard() {
  const svg = $('#board');
  const W = G.cols * S;
  const H = G.rows * S;
  svg.setAttribute('viewBox', `0 0 ${W} ${H + FINISH_H}`);
  const cx = (c) => c * S + S / 2;
  const cy = (r) => r * S + S / 2;
  let h = '';

  // Zielstreifen (Schachbrett) unter der letzten Reihe
  const sq = FINISH_H / 2;
  h += `<defs><pattern id="chk" width="${sq * 2}" height="${sq * 2}" patternUnits="userSpaceOnUse">
    <rect width="${sq}" height="${sq}" fill="#333"/><rect x="${sq}" y="${sq}" width="${sq}" height="${sq}" fill="#333"/></pattern></defs>`;
  h += `<rect x="${S * 0.2}" y="${H}" width="${W - S * 0.4}" height="${FINISH_H}" fill="url(#chk)" opacity=".18" rx="3"/>`;
  h += `<text class="finish-label" x="${W / 2}" y="${H + FINISH_H / 2 + 4}" text-anchor="middle">ZIEL</text>`;

  // Kreise
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      const owner = G.occ.get(key(r, c));
      const style = owner != null ? ` style="fill:${G.players[owner].color}22;stroke:${G.players[owner].color}"` : '';
      h += `<circle class="cell" cx="${cx(c)}" cy="${cy(r)}" r="${R}"${style}/>`;
    }
  }

  // Linien
  G.players.forEach((p, pi) => {
    for (let i = 1; i < p.path.length; i++) {
      const a = p.path[i - 1];
      const b = p.path[i];
      const ax = cx(a.c), ay = cy(a.r), bx = cx(b.c), by = cy(b.r);
      const len = Math.hypot(bx - ax, by - ay);
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      const o = R + 1;
      const segLen = (len - 2 * o).toFixed(1);
      const anim = G.anim && G.anim.pi === pi && G.anim.seg === i - 1;
      h += `<line class="path-seg${anim ? ' draw' : ''}" style="--len:${segLen}" stroke="${p.color}"
        x1="${ax + ux * o}" y1="${ay + uy * o}" x2="${bx - ux * o}" y2="${by - uy * o}"/>`;
    }
  });
  G.anim = null;

  // Aktuelle Positionen
  for (const p of G.players) {
    if (!p.pos) continue;
    h += `<circle class="pos-ring" cx="${cx(p.pos.c)}" cy="${cy(p.pos.r)}" r="${R + 5}" stroke="${p.color}"/>`;
    h += `<circle cx="${cx(p.pos.c)}" cy="${cy(p.pos.r)}" r="7" fill="${p.color}"/>`;
  }

  // Wählbare Kreise (Start / Joker)
  const p = cur();
  for (const t of targetsForCurrent()) {
    h += `<circle class="target" style="--c:${p.color}" cx="${cx(t.c)}" cy="${cy(t.r)}" r="${R + 3}"/>`;
    if (!p.bot) h += `<circle class="hit" data-r="${t.r}" data-c="${t.c}" cx="${cx(t.c)}" cy="${cy(t.r)}" r="${S / 2}"/>`;
  }

  svg.innerHTML = h;
}

function statusText() {
  const p = cur();
  switch (G.phase) {
    case 'start': return p.bot ? `${p.name} wählt einen Startkreis …` : `${p.name}: Wähle deinen Startkreis oben.`;
    case 'roll': return p.bot ? `${p.name} würfelt gleich …` : `${p.name} ist dran – würfeln!`;
    case 'rolling': return `${p.name} würfelt …`;
    case 'joker': return p.bot ? `Joker! ${p.name} überlegt …` : 'Joker! Wähle einen markierten Kreis.';
    case 'skip': return `${p.name} muss aussetzen.`;
    case 'moving': return `${p.name} zieht …`;
    case 'over': return 'Spiel vorbei!';
    default: return '';
  }
}

function renderPanel() {
  const p = cur();
  const status = $('#status');
  status.innerHTML = '';
  const dot = el('span', 'dot');
  dot.style.background = p.color;
  status.append(dot, el('span', '', statusText()));

  const canRoll = G.phase === 'roll' && !p.bot;
  $('#rollBtn').disabled = !canRoll;
  $('#die').disabled = !canRoll;

  const list = $('#players');
  list.innerHTML = '';
  for (const pl of G.players) {
    const li = el('li', (pl === p && G.phase !== 'over' ? 'current' : '') + (pl.out ? ' out' : ''));
    li.style.setProperty('--c', pl.color);
    const d = el('span', 'dot');
    d.style.background = pl.color;
    const name = el('span', 'name', pl.name);
    if (pl.bot) name.append(el('span', 'tag', 'BOT'));
    const info = el('span', 'info',
      pl.out ? 'eingesperrt' : pl.pos ? `Reihe ${pl.pos.r + 1}/${G.rows}` : 'noch kein Start');
    const bar = el('div', 'bar');
    const fill = el('span');
    fill.style.width = (pl.pos ? (pl.pos.r / (G.rows - 1)) * 100 : 0) + '%';
    bar.append(fill);
    li.append(d, name, info, bar);
    list.append(li);
  }

  const log = $('#log');
  log.innerHTML = '';
  for (const msg of G.log.slice(0, 12)) log.append(el('li', '', msg));
}

function showResult(emoji, title, text, color) {
  $('#resultEmoji').textContent = emoji;
  $('#resultTitle').textContent = title;
  $('#resultTitle').style.color = color || '';
  $('#resultText').textContent = text;
  setTimeout(() => $('#overlay').classList.remove('hidden'), 500);
}

// ---------- Events ----------

$('#addPlayer').onclick = addPlayer;
$('#startBtn').onclick = newGame;
$('#rollBtn').onclick = () => G && !cur().bot && roll();
$('#die').onclick = () => G && !cur().bot && roll();
$('#restartBtn').onclick = newGame;
$('#menuBtn').onclick = showSetup;
$('#menuBtn2').onclick = showSetup;
$('#againBtn').onclick = newGame;
$('#boardBtn').onclick = () => $('#overlay').classList.add('hidden');

$('#board').addEventListener('click', (e) => {
  const t = e.target.closest('[data-r]');
  if (!t || !G || cur().bot) return;
  const cell = { r: +t.dataset.r, c: +t.dataset.c };
  if (G.phase === 'start') chooseStart(cell);
  else if (G.phase === 'joker') chooseJoker(cell);
});

document.addEventListener('keydown', (e) => {
  if ($('#game').classList.contains('hidden') || !G) return;
  if ((e.key === ' ' || e.key === 'Enter') && !['INPUT', 'BUTTON'].includes(e.target.tagName)) {
    e.preventDefault();
    if (!cur().bot) roll();
  }
});

renderSetup();
