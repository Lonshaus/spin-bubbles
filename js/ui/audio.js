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

  rotate() {
    if (!this.ready) return;
    this.tone({ freq: 380, to: 620, type: 'triangle', dur: 0.08, vol: 0.12 });
    this.noise({ dur: 0.05, vol: 0.05, freq: 3000 });
  }

  // 泡泡破掉的聲音，連鎖越多音越高
  clear(chain, size) {
    if (!this.ready) return;
    const base = 72 + PENTATONIC[Math.min(chain - 1, PENTATONIC.length - 1)];
    const pops = Math.min(size, 6);
    for (let k = 0; k < pops; k++) {
      const f = mtof(base + PENTATONIC[k % 4]);
      this.tone({ freq: f * 0.6, to: f * 1.4, dur: 0.09, vol: 0.18, at: k * 0.035 });
    }
    this.tone({ freq: mtof(base + 12), type: 'triangle', dur: 0.35, vol: 0.08, at: 0.05 });
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
