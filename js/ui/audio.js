// Web Audio 即時合成的音效與背景音樂（不需要任何音檔）

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

// 背景音樂：Cmaj7 → Am7 → Fmaj7 → G6，每個和弦一小節
const CHORDS = [
  { bass: 48, notes: [60, 64, 67, 71] },
  { bass: 45, notes: [57, 60, 64, 67] },
  { bass: 41, notes: [57, 60, 64, 65] },
  { bass: 43, notes: [55, 59, 62, 64] },
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
const BPM = 96;

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.muted = false; // 標題畫面自動示範時暫時靜音
  }

  // 瀏覽器規定要在使用者操作（click / touchend / keydown）裡才能開始出聲。
  // 手機上 pointerdown、touchstart 不算，所以由 main.js 在這些事件裡呼叫。
  unlock() {
    // iPhone 的靜音開關會把 Web Audio 一起靜音，宣告成「播放媒體」就不受影響
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      // 舊版瀏覽器沒有這個 API
    }
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);
      this.noiseBuffer = this.makeNoise();
      this.echo = this.makeEcho();
    }
    // iOS 還有 'interrupted' 狀態（例如來電、切到背景後），一樣要 resume
    if (this.ctx.state !== 'running' && !this.suspendedByPage) this.ctx.resume().catch(() => {});
    // iOS 舊版的解鎖方式：在使用者操作裡播一段空白聲音
    if (!this.primed) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, 22050);
      src.connect(this.ctx.destination);
      src.start(0);
      this.primed = true;
    }
    this.setMusic(this.musicOn);
  }

  setSfx(on) {
    this.sfxOn = on;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.3);
    if (on && !this.timer) this.startMusic();
    if (!on && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // 切到背景時暫停，回來再繼續
  suspend() {
    this.suspendedByPage = true;
    this.ctx?.suspend();
  }

  resume() {
    this.suspendedByPage = false;
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  get ready() {
    return this.ctx && this.sfxOn && !this.muted && this.ctx.state === 'running';
  }

  makeNoise() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  makeEcho() {
    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = (60 / BPM) * 0.75;
    const feedback = this.ctx.createGain();
    feedback.gain.value = 0.3;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.music);
    return delay;
  }

  tone({ freq, to = null, type = 'sine', dur = 0.15, vol = 0.25, attack = 0.005, at = 0, dest = null }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(dest ?? this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return gain;
  }

  noise({ dur = 0.2, vol = 0.3, freq = 1200, to = null, at = 0, type = 'bandpass' }) {
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // 以下音色參考原版錄影的頻譜分析（音高、長度、泛音），再用程式合成

  // 選取位置改變：極短的玻璃「叮」（原版約 1.7kHz＋3.6kHz，加一點高頻雜訊）
  select() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastSelect ?? 0) < 0.05) return; // 滑鼠快速掃過時不要連發
    this.lastSelect = now;
    this.tone({ freq: 1694, dur: 0.05, vol: 0.035 });
    this.tone({ freq: 3573, dur: 0.035, vol: 0.02 });
    this.noise({ dur: 0.025, vol: 0.03, freq: 5500, type: 'highpass' });
  }

  // 每轉一格：C5 的柔和木槌聲，略帶鈴聲泛音與低音尾巴（原版約 0.2 秒、音高微微下滑）
  rotate() {
    if (!this.ready) return;
    this.tone({ freq: 523, to: 510, dur: 0.22, vol: 0.2, attack: 0.004 });
    this.tone({ freq: 464, dur: 0.12, vol: 0.05 });
    this.tone({ freq: 663, dur: 0.1, vol: 0.04 });
    this.tone({ freq: 1047, dur: 0.08, vol: 0.05 });
    this.tone({ freq: 196, dur: 0.3, vol: 0.04, attack: 0.01 });
    this.tone({ freq: 65, dur: 0.12, vol: 0.04 });
    this.noise({ dur: 0.03, vol: 0.04, freq: 4500, type: 'highpass' });
  }

  // 泡泡破掉的聲音，連鎖越多音越高
  // 消除：先一聲往上滑的「咻」，接著一個帶爵士味的和弦＋低音「砰」。
  // 原版第一段是 C4、A4、C5、降E5、G5，兩條泛音交叉滑過；連鎖時換和弦並加上顫音。
  clear(chain) {
    if (!this.ready) return;
    const voicings = [
      [60, 69, 72, 75, 79], // Cm6
      [55, 60, 62, 67, 74], // Gsus
      [62, 71, 74, 77, 81], // Dm6 往上
      [64, 69, 71, 76, 83],
      [67, 74, 76, 79, 86],
    ];
    const notes = voicings[Math.min(chain, voicings.length) - 1];
    const lift = Math.max(0, chain - voicings.length) * 2; // 超長連鎖繼續往上
    if (chain === 1) this.tone({ freq: 120, to: 1500, type: 'triangle', dur: 0.16, vol: 0.06 });
    const at = chain === 1 ? 0.1 : 0;
    const bus = this.ctx.createGain();
    bus.connect(this.sfx);
    if (chain > 1) {
      // 連鎖的顫音（原版頻譜上一顆顆的亮點，約每秒 11 下）
      const lfo = this.ctx.createOscillator();
      const depth = this.ctx.createGain();
      lfo.frequency.value = 11;
      depth.gain.value = 0.35;
      bus.gain.value = 0.65;
      lfo.connect(depth).connect(bus.gain);
      lfo.start(this.ctx.currentTime + at);
      lfo.stop(this.ctx.currentTime + at + 1);
    }
    // 能量集中在 200～700Hz（原版約九成），高音那兩顆放輕
    const vols = [0.09, 0.1, 0.08, 0.05, 0.035];
    notes.forEach((m, k) => this.tone({ freq: mtof(m + lift), dur: 0.65, vol: vols[k], attack: 0.008, at, dest: bus }));
    // 兩條往中間交叉滑的泛音
    this.tone({ freq: 880, to: 790, dur: 0.3, vol: 0.015, at, dest: bus });
    this.tone({ freq: 740, to: 830, dur: 0.3, vol: 0.015, at, dest: bus });
    this.tone({ freq: mtof(notes[0] + lift + 28), dur: 0.25, vol: 0.015, at, dest: bus });
    this.tone({ freq: 112, to: 100, dur: 0.5, vol: 0.06, attack: 0.01, at });
    // 高頻沙沙的閃亮感（原版 2～6kHz 有一層雜訊）
    this.noise({ dur: 0.55, vol: 0.05, freq: 3000, type: 'highpass', at });
  }

  star() {
    if (!this.ready) return;
    [72, 76, 79, 84, 88].forEach((m, k) => this.tone({ freq: mtof(m), type: 'triangle', dur: 0.5, vol: 0.12, at: k * 0.06 }));
  }

  pearl() {
    if (!this.ready) return;
    [60, 64, 67, 71, 74].forEach((m) => this.tone({ freq: mtof(m), type: 'sine', dur: 1.8, vol: 0.09, attack: 0.05 }));
    [84, 88, 91, 96, 100, 103].forEach((m, k) => this.tone({ freq: mtof(m), type: 'triangle', dur: 0.4, vol: 0.06, at: 0.1 + k * 0.07 }));
  }

  defuse() {
    if (!this.ready) return;
    this.tone({ freq: 1200, to: 300, type: 'square', dur: 0.18, vol: 0.05 });
    this.noise({ dur: 0.3, vol: 0.15, freq: 5000, to: 800, type: 'highpass' });
  }

  bombTick(urgent) {
    if (!this.ready) return;
    this.tone({ freq: urgent ? 990 : 660, type: 'square', dur: 0.07, vol: urgent ? 0.08 : 0.04 });
    if (urgent) this.tone({ freq: 990, type: 'square', dur: 0.07, vol: 0.08, at: 0.12 });
  }

  explode() {
    if (!this.ready) return;
    this.noise({ dur: 1.4, vol: 0.9, freq: 1800, to: 60, type: 'lowpass' });
    this.tone({ freq: 120, to: 30, dur: 1.0, vol: 0.5 });
  }

  levelUp() {
    if (!this.ready) return;
    [67, 72, 76, 79, 84].forEach((m, k) => this.tone({ freq: mtof(m), type: 'square', dur: 0.18, vol: 0.05, at: k * 0.08 }));
    this.tone({ freq: mtof(84), type: 'triangle', dur: 0.8, vol: 0.12, at: 0.4 });
  }

  gameOver() {
    if (!this.ready) return;
    [72, 67, 64, 60].forEach((m, k) => this.tone({ freq: mtof(m), type: 'triangle', dur: 0.4, vol: 0.14, at: k * 0.22 }));
  }

  land() {
    if (!this.ready) return;
    this.tone({ freq: 160, to: 90, dur: 0.08, vol: 0.08 });
  }

  click() {
    if (!this.ready) return;
    this.tone({ freq: 900, type: 'triangle', dur: 0.04, vol: 0.06 });
  }

  // 用 lookahead 排程播放的生成式背景音樂
  startMusic() {
    const step = 60 / BPM / 2; // 八分音符
    this.nextTime = this.ctx.currentTime + 0.1;
    this.stepIndex = 0;
    this.timer = setInterval(() => {
      if (this.ctx.state !== 'running') return;
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        this.musicStep(this.stepIndex, this.nextTime - this.ctx.currentTime);
        this.nextTime += step;
        this.stepIndex++;
      }
    }, 60);
  }

  musicStep(i, at) {
    const bar = Math.floor(i / 8) % CHORDS.length;
    const beat = i % 8;
    const chord = CHORDS[bar];
    const opts = { dest: this.music, at };
    if (beat === 0 || beat === 4) {
      this.tone({ ...opts, freq: mtof(chord.bass), type: 'sine', dur: 0.9, vol: 0.35, attack: 0.02 });
      this.tone({ ...opts, freq: mtof(chord.bass + 12), type: 'triangle', dur: 0.4, vol: 0.06 });
    }
    if (beat === 0) {
      for (const m of chord.notes) this.tone({ ...opts, freq: mtof(m), type: 'sine', dur: 2.4, vol: 0.035, attack: 0.4 });
    }
    const note = chord.notes[ARP[beat]] + 12;
    const g = this.tone({ ...opts, freq: mtof(note), type: 'triangle', dur: 0.28, vol: 0.07 });
    g.connect(this.echo);
    // 偶爾冒出一個鈴聲旋律
    if ((beat === 2 || beat === 6) && Math.random() < 0.35) {
      const m = 84 + PENTATONIC[Math.floor(Math.random() * 6)];
      const bell = this.tone({ ...opts, freq: mtof(m), type: 'sine', dur: 0.9, vol: 0.05 });
      bell.connect(this.echo);
    }
  }
}
