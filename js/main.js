// 啟動與狀態機：標題（自動示範）→ 遊戲 → 暫停 / 結算
import * as THREE from 'three';
import { Game } from './core/rules.js';
import { Stage } from './view/scene.js';
import { BoardView } from './view/pieces.js';
import { Fx } from './view/fx.js';
import { Tweens } from './view/animator.js';
import { Director } from './view/director.js';
import { Hud } from './ui/hud.js';
import { Sound } from './ui/audio.js';
import { setLang, t } from './ui/i18n.js';
import * as store from './ui/storage.js';

const $ = (id) => document.getElementById(id);

const settings = store.loadSettings();
const stage = new Stage($('stage'), $('play-area'));
const board = new BoardView(stage);
const fx = new Fx(stage.root);
const tweens = new Tweens();
const audio = new Sound();
const hud = new Hud(stage);
const director = new Director({ board, fx, tweens, audio, hud, stage });
const coarsePointer = matchMedia('(pointer: coarse)').matches;

// 分數列與下方按鈕列跟盤面同寬，視覺上對齊
stage.onLayout = (width) => document.documentElement.style.setProperty('--board-w', `${Math.round(width)}px`);

let game = null;
let mode = 'classic';
let state = 'title'; // title | playing | paused | over
let busy = false;
let pivots = [];
let selected = null;
let pointer = null; // 滑鼠的 NDC 座標
let touchMode = coarsePointer;
let spinDir = settings.dir === 'ccw' ? 'ccw' : 'cw'; // 目前的旋轉方向，用一個鍵切換
let hintTimer = null;
let demoDelay = 1;
let screens = [];

// ---------- 設定 ----------

function applySettings() {
  setLang(settings.lang);
  const quality = settings.quality === 'auto' ? (coarsePointer || innerWidth < 700 ? 'low' : 'high') : settings.quality;
  stage.setQuality(quality);
  audio.setSfx(settings.sfx);
  audio.setMusic(settings.music);
  $('set-lang').value = settings.lang;
  $('set-quality').value = settings.quality;
  for (const [id, on] of [['set-sfx', settings.sfx], ['set-music', settings.music]]) {
    $(id).textContent = t(on ? 'on' : 'off');
    $(id).setAttribute('aria-pressed', String(on));
  }
  updateDirUi();
  showChrome();
  $('best-classic').textContent = store.loadBest('classic').toLocaleString();
  $('best-bomb').textContent = store.loadBest('bomb').toLocaleString();
}

function changeSetting(key, value) {
  settings[key] = value;
  store.saveSettings(settings);
  applySettings();
}

// ---------- 畫面堆疊 ----------

function setScreens(list) {
  screens = list;
  for (const name of ['title', 'howto', 'settings', 'pause', 'over']) {
    $(`screen-${name}`).classList.toggle('hidden', screens.at(-1) !== name);
  }
}

const openScreen = (name) => setScreens([...screens, name]);
const closeScreen = () => setScreens(screens.slice(0, -1));

function showChrome() {
  const inGame = state !== 'title';
  $('hud').classList.toggle('hidden', !inGame);
  $('controls').classList.toggle('hidden', !inGame);
  $('controls-tip').textContent = t(touchMode ? 'touch.tip' : 'mouse.tip');
}

// ---------- 旋轉方向 ----------

function toggleDir() {
  spinDir = spinDir === 'cw' ? 'ccw' : 'cw';
  settings.dir = spinDir;
  store.saveSettings(settings);
  updateDirUi();
  audio.click();
}

function updateDirUi() {
  const btn = $('btn-dir');
  btn.textContent = spinDir === 'cw' ? '↻' : '↺';
  btn.title = `${t(`touch.${spinDir}`)} — ${t('dir.toggle')}`;
  btn.setAttribute('aria-label', btn.title);
  board.setDirection(spinDir);
}

// ---------- 遊戲流程 ----------

function newBoard(options) {
  tweens.clear();
  busy = false;
  game = new Game({ ...options, seed: (Math.random() * 2 ** 32) >>> 0 });
  board.build(game);
  pivots = game.pivots();
  selected = null;
  clearHint();
}

function startDemo() {
  state = 'title';
  audio.muted = true;
  newBoard({ mode: 'classic' });
  demoDelay = 1.2;
  showChrome();
  applySettings();
  setScreens(['title']);
}

function startGame(m) {
  mode = m;
  state = 'playing';
  audio.muted = false;
  audio.unlock();
  newBoard({ mode });
  hud.reset(game, store.loadBest(mode));
  showChrome();
  setScreens([]);
}

async function spin(dir = spinDir) {
  if (state !== 'playing' || busy) return;
  if (!selected) select(defaultPivot());
  if (!selected) return;
  audio.unlock();
  busy = true;
  clearHint();
  const key = selected.key;
  const events = game.rotate(selected, dir);
  board.setHighlight(null);
  await director.play(events);
  hud.setLevel(game);
  pivots = game.pivots();
  busy = false;
  if (game.over) return finish();
  if (!touchMode && pointer) hover(pointer, true);
  else select(pivots.find((p) => p.key === key) ?? null);
}

function finish() {
  state = 'over';
  const best = store.loadBest(mode);
  const isBest = game.score > best;
  if (isBest) store.saveBest(mode, game.score);
  hud.setBest(Math.max(best, game.score));
  $('over-reason').textContent = t(`reason.${game.overReason}`);
  $('over-score').textContent = game.score.toLocaleString();
  $('over-best').classList.toggle('hidden', !isBest);
  const rows = [
    ['level', game.level],
    ['stat.moves', game.moves],
    ['stat.chain', game.stats.bestChain],
    ['stat.stars', game.stats.stars],
    ['stat.pearls', game.stats.pearls],
  ];
  if (mode === 'bomb') rows.push(['stat.bombs', game.stats.bombsDefused]);
  $('over-stats').replaceChildren(
    ...rows.flatMap(([key, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = t(key);
      const dd = document.createElement('dd');
      dd.textContent = value.toLocaleString();
      return [dt, dd];
    }),
  );
  setScreens(['over']);
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  setScreens(['pause']);
}

function resume() {
  if (state !== 'paused') return;
  state = 'playing';
  setScreens([]);
}

function hint() {
  if (state !== 'playing' || busy) return;
  const move = game.findMove();
  if (!move) return;
  board.setHint(move.pivot);
  clearTimeout(hintTimer);
  hintTimer = setTimeout(clearHint, 3000);
}

function clearHint() {
  clearTimeout(hintTimer);
  board.setHint(null);
}

// 標題畫面背後自動示範
async function demoStep() {
  const move = game.findMove();
  if (!move) return startDemo();
  busy = true;
  board.setHighlight(move.pivot);
  await tweens.wait(0.45);
  board.setHighlight(null);
  const events = game.rotate(move.pivot, move.dir);
  await director.play(events);
  pivots = game.pivots();
  busy = false;
  if (game.over || game.level > 4) startDemo();
}

// ---------- 選取 ----------

function select(pivot) {
  selected = pivot;
  board.setHighlight(pivot);
}

function defaultPivot() {
  const { center } = game.grid;
  return pivots.reduce((best, p) =>
    p.type === 'tri' && Math.hypot(p.x - center.x, p.y - center.y) < Math.hypot(best.x - center.x, best.y - center.y) ? p : best,
  );
}

function hover(ndc, force = false) {
  if (state !== 'playing' || busy) return;
  const pivot = board.pick(ndc, pivots);
  if (force || pivot?.key !== selected?.key) select(pivot);
}

function toNdc(e) {
  const rect = stage.renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
}

function setTouchMode(on) {
  if (touchMode === on) return;
  touchMode = on;
  showChrome();
}

// ---------- 輸入 ----------

const canvas = stage.renderer.domElement;
let down = null;

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointer = toNdc(e);
  stage.setPointer(pointer.x, pointer.y);
  hover(pointer);
});

canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType !== 'mouse') return;
  pointer = null;
  stage.setPointer(0, 0);
  if (state === 'playing' && !busy) select(null);
});

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') {
    setTouchMode(false);
    pointer = toNdc(e);
    hover(pointer);
    if (e.button === 0) spin();
    if (e.button === 2) toggleDir();
  } else {
    down = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'mouse' || !down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 16) return;
  setTouchMode(true);
  if (state === 'playing' && !busy) {
    // 點一下選取，再點同一個位置就旋轉
    const pivot = board.pick(toNdc(e), pivots);
    if (pivot && pivot.key === selected?.key) spin();
    else {
      select(pivot);
      audio.click();
    }
  }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLSelectElement) return;
  const key = e.key.toLowerCase();
  if (key === 'm') {
    const on = !(settings.sfx || settings.music);
    settings.sfx = settings.music = on;
    changeSetting('sfx', on);
    return;
  }
  if (key === ' ' && (state === 'playing' || state === 'paused')) {
    e.preventDefault();
    toggleDir();
    return;
  }
  if (state === 'playing') {
    if (key === 'enter' || key === 'x') spin();
    else if (key === 'h') hint();
    else if (key === 'p' || key === 'escape') pause();
  } else if (state === 'paused' && (key === 'p' || key === 'escape') && screens.length === 1) {
    resume();
  } else if (key === 'escape' && screens.length > 1) {
    closeScreen();
  }
});

for (const btn of document.querySelectorAll('[data-mode]')) btn.addEventListener('click', () => startGame(btn.dataset.mode));
for (const btn of document.querySelectorAll('[data-open]')) btn.addEventListener('click', () => openScreen(btn.dataset.open));
for (const btn of document.querySelectorAll('[data-close]')) btn.addEventListener('click', closeScreen);

// 點選單外面（半透明背景）也能關閉：暫停 → 繼續，說明／設定 → 返回上一層
for (const name of ['pause', 'howto', 'settings']) {
  $(`screen-${name}`).addEventListener('click', (e) => {
    if (e.target !== e.currentTarget) return;
    if (name === 'pause') resume();
    else closeScreen();
  });
}
for (const btn of document.querySelectorAll('[data-action="menu"]')) btn.addEventListener('click', startDemo);
// 手機瀏覽器只認 click / touchend / keydown 這類「使用者操作」才允許開始播放聲音
for (const type of ['click', 'touchend', 'pointerup', 'keydown']) {
  document.addEventListener(type, () => audio.unlock(), { capture: true, passive: true });
}

$('btn-again').addEventListener('click', () => startGame(mode));
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', () => startGame(mode));
$('btn-pause').addEventListener('click', pause);
$('btn-hint').addEventListener('click', hint);
$('btn-dir').addEventListener('click', toggleDir);
$('set-lang').addEventListener('change', (e) => changeSetting('lang', e.target.value));
$('set-quality').addEventListener('change', (e) => changeSetting('quality', e.target.value));
$('set-sfx').addEventListener('click', (e) => {
  e.preventDefault();
  changeSetting('sfx', !settings.sfx);
});
$('set-music').addEventListener('click', (e) => {
  e.preventDefault();
  changeSetting('music', !settings.music);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  } else {
    audio.resume();
  }
});

// ---------- 主迴圈 ----------

let last = performance.now();
function frame(now) {
  // rAF 的時間戳可能比啟動時記下的 performance.now() 還早，不能讓 dt 變負的
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  tweens.update(dt);
  board.update(dt);
  fx.update(dt);
  hud.update(dt);
  if (state === 'title' && !busy && (demoDelay -= dt) <= 0) {
    demoDelay = 0.9;
    demoStep();
  }
  stage.render(dt);
  requestAnimationFrame(frame);
}

startDemo();
requestAnimationFrame(frame);

// 方便除錯與自動化測試
window.spinBubbles = {
  get game() {
    return game;
  },
  get state() {
    return state;
  },
  get busy() {
    return busy;
  },
  get audioState() {
    return audio.ctx?.state ?? 'none';
  },
  get selected() {
    return selected?.key ?? null;
  },
  startGame,
  spin,
  setSpeed: (speed) => (tweens.speed = speed),
  refresh() {
    board.build(game);
    pivots = game.pivots();
  },
  select: (key) => select(pivots.find((p) => p.key === key) ?? null),
};
