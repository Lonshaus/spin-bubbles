// 介面文字：繁體中文、英文、日文

export const LANGS = ['zh-Hant', 'en', 'ja'];

const DICT = {
  'zh-Hant': {
    title: '旋轉泡泡球',
    subtitle: '3D 復刻版',
    'mode.classic': '經典模式',
    'mode.classic.desc': '一直玩到沒有步可以走',
    'mode.bomb': '炸彈模式',
    'mode.bomb.desc': '在倒數歸零前消掉炸彈',
    best: '最高分',
    score: '分數',
    level: '等級',
    goal: '剩餘目標',
    menuButton: '選單',
    install: '📲 安裝到主畫面',
    installTitle: '📲 安裝到主畫面',
    installBody: `
      <p>安裝之後會有自己的圖示、全螢幕開啟，<b>沒有網路也能玩</b>。有網路時打開會自動更新成最新版。</p>
      <h3>iPhone / iPad</h3>
      <p>用 <b>Safari</b> 開啟這個網頁 → 點下方的<b>分享</b>按鈕（方框加向上箭頭）→ 往下滑，選<b>「加入主畫面」</b>→ 點右上角<b>「加入」</b>。</p>
      <h3>Android</h3>
      <p>用 <b>Chrome</b> 開啟 → 點標題畫面的「📲 安裝到主畫面」按鈕。沒有跳出安裝視窗的話，點右上角 <b>⋮</b> → <b>「安裝應用程式」</b>或<b>「加到主畫面」</b>。</p>
      <h3>電腦（Chrome / Edge）</h3>
      <p>點網址列右側的<b>安裝圖示</b>，或從瀏覽器選單選<b>「安裝」</b>。安裝後會出現在桌面與開始選單。</p>`,
    howto: '玩法說明',
    settings: '設定',
    language: '語言',
    'lang.auto': '自動',
    sfx: '音效',
    music: '背景音樂',
    quality: '畫質',
    'quality.auto': '自動',
    'quality.high': '高（高解析度）',
    'quality.low': '低（省電）',
    on: '開',
    off: '關',
    resume: '繼續',
    restart: '重新開始',
    menu: '主選單',
    paused: '暫停',
    gameover: '遊戲結束',
    victory: '破關！',
    'reason.win': '3 顆黑珍珠連在一起！',
    pearlWin: '黑珍珠破關（3 顆相鄰）',
    classicBombs: '經典模式出現炸彈',
    rulesNote: '規則設定從下一局開始生效',
    version: '版本',
    'reason.nomoves': '沒有可以走的步了',
    'reason.bomb': '炸彈爆炸了！',
    newbest: '新紀錄！',
    playagain: '再玩一次',
    chain: '{n} 連鎖！',
    levelup: '第 {n} 關',
    newcolor: '新顏色加入！',
    star: '星星誕生！',
    starBlast: '星星大消除！',
    pearl: '黑珍珠！',
    defused: '炸彈拆除！',
    hint: '提示',
    pause: '暫停',
    close: '關閉',
    'stat.moves': '步數',
    'stat.stars': '星星',
    'stat.starsCleared': '消除的星星',
    'stat.pearls': '黑珍珠',
    'stat.bombs': '拆除炸彈',
    'stat.chain': '最大連鎖',
    'touch.ccw': '逆時針',
    'touch.cw': '順時針',
    'touch.tip': '點一下選取，再點一次旋轉',
    'dir.toggle': '點這裡切換方向',
    'mouse.tip': '左鍵旋轉・右鍵或空白鍵切換方向',
    howtoBody: `
      <h3>基本玩法</h3>
      <p>把游標移到三顆球的交會點，三顆球會被框起來，<b>按左鍵</b>就往目前的方向旋轉。<br>
      旋轉方向用<b>一個鍵切換</b>：右鍵、空白鍵或左下角的 ↻ / ↺ 按鈕。框框中間的箭頭會顯示目前方向。<br>
      手機上<b>點一下</b>選取、<b>再點一次</b>旋轉，左下角的大按鈕切換方向。</p>
      <p>一次旋轉最多轉三下，中途一出現配對就停；轉一圈都沒有配對就會回到原位。</p>
      <h3>配對</h3>
      <p><b>三顆互相相鄰（三角形）</b>的同色球會消除，直線三顆不算。連在一起的三角形會一起消除。</p>
      <p>球掉下來之後又形成配對就是<b>連鎖</b>，分數會加倍。</p>
      <p>上方的<b>剩餘目標</b>是這一關還要配對幾次，歸零就過關；第 4、7、10 關會加入新顏色。</p>
      <h3>⭐ 星星</h3>
      <p>讓 <b>6 顆同色球圍成一圈</b>，中間那顆會變成星星。指向星星可以旋轉它周圍的一圈。<b>3 顆星星互相相鄰</b>時，不論顏色都會消除，分數很高。<br>只差一顆時，那 5 顆會發光，缺的位置會用需要的顏色框起來。</p>
      <h3>⚫ 黑珍珠</h3>
      <p>讓 <b>6 顆星星圍成一圈</b>，中間會變成黑珍珠，分數超高。指向黑珍珠可以用 Y 字形旋轉。<br><b>3 顆黑珍珠互相相鄰就破關！</b>（可以在設定裡關掉，改成一直玩到沒步可走）</p>
      <h3>💣 炸彈模式</h3>
      <p>炸彈上的數字每轉一次減 1，歸零就結束。把炸彈和同色球一起消掉就能拆除。在設定裡也可以讓經典模式從第 3 級開始出現炸彈。</p>
      <h3>鍵盤</h3>
      <p>空白鍵：切換方向　Enter / X：旋轉　H：提示　P / Esc：暫停　M：靜音</p>`,
  },
  en: {
    title: 'Spin Bubbles',
    subtitle: '3D Remake',
    'mode.classic': 'Classic',
    'mode.classic.desc': 'Play until no moves are left',
    'mode.bomb': 'Bomb',
    'mode.bomb.desc': 'Defuse bombs before they hit zero',
    best: 'Best',
    score: 'Score',
    level: 'Level',
    goal: 'Combos to go',
    menuButton: 'Menu',
    install: '📲 Install app',
    installTitle: '📲 Install the app',
    installBody: `
      <p>Once installed it gets its own icon, opens full screen and <b>works offline</b>. When you're online it updates itself automatically.</p>
      <h3>iPhone / iPad</h3>
      <p>Open this page in <b>Safari</b> → tap the <b>Share</b> button (square with an up arrow) → scroll down and choose <b>“Add to Home Screen”</b> → tap <b>“Add”</b>.</p>
      <h3>Android</h3>
      <p>Open it in <b>Chrome</b> → tap “📲 Install app” on the title screen. If no install prompt appears, tap <b>⋮</b> at the top right → <b>“Install app”</b> or <b>“Add to Home screen”</b>.</p>
      <h3>Computer (Chrome / Edge)</h3>
      <p>Click the <b>install icon</b> at the right end of the address bar, or choose <b>“Install”</b> from the browser menu.</p>`,
    howto: 'How to play',
    settings: 'Settings',
    language: 'Language',
    'lang.auto': 'Auto',
    sfx: 'Sound effects',
    music: 'Music',
    quality: 'Graphics',
    'quality.auto': 'Auto',
    'quality.high': 'High (sharper)',
    'quality.low': 'Low (battery saver)',
    on: 'On',
    off: 'Off',
    resume: 'Resume',
    restart: 'Restart',
    menu: 'Main menu',
    paused: 'Paused',
    gameover: 'Game Over',
    victory: 'You win!',
    'reason.win': 'Three black pearls together!',
    pearlWin: 'Black pearl victory (3 touching)',
    classicBombs: 'Bombs in Classic',
    rulesNote: 'Rule changes apply from the next game',
    version: 'Version',
    'reason.nomoves': 'No more moves',
    'reason.bomb': 'A bomb exploded!',
    newbest: 'New best!',
    playagain: 'Play again',
    chain: 'Chain ×{n}!',
    levelup: 'Level {n}',
    newcolor: 'New color!',
    star: 'Star!',
    starBlast: 'Star blast!',
    pearl: 'Black Pearl!',
    defused: 'Defused!',
    hint: 'Hint',
    pause: 'Pause',
    close: 'Close',
    'stat.moves': 'Moves',
    'stat.stars': 'Stars',
    'stat.starsCleared': 'Stars popped',
    'stat.pearls': 'Black pearls',
    'stat.bombs': 'Bombs defused',
    'stat.chain': 'Best chain',
    'touch.ccw': 'Counter-clockwise',
    'touch.cw': 'Clockwise',
    'touch.tip': 'Tap to select, tap again to spin',
    'dir.toggle': 'click to switch direction',
    'mouse.tip': 'Left click to spin · right click or Space to switch direction',
    howtoBody: `
      <h3>Basics</h3>
      <p>Point at a spot where three bubbles meet to select them, then <b>left click</b> to spin in the current direction.<br>
      <b>One key switches direction</b>: right click, Space, or the ↻ / ↺ button at the bottom left. The arrow in the middle of the selection shows the current direction.<br>
      On touch screens, <b>tap</b> to select and <b>tap again</b> to spin; the big button at the bottom left switches direction.</p>
      <p>A spin turns up to three times and stops as soon as a match appears. If nothing matches, the bubbles return to where they started.</p>
      <h3>Matches</h3>
      <p><b>Three touching bubbles of one color (a triangle)</b> pop. A straight line doesn't count. Connected triangles pop together.</p>
      <p>When falling bubbles form new matches you get a <b>chain</b> and a score multiplier.</p>
      <p><b>Combos to go</b> at the top counts the matches left in this level; reach zero to level up. New colors join at levels 4, 7 and 10.</p>
      <h3>⭐ Stars</h3>
      <p>Surround a bubble with a <b>ring of 6 same-colored bubbles</b> and it becomes a star. Point at a star to spin the ring around it. <b>Three touching stars</b> pop no matter their color, for big points.<br>When you're one bubble short, the five glow and the empty spot is outlined in the color you need.</p>
      <h3>⚫ Black Pearls</h3>
      <p>Make a <b>ring of 6 stars</b> to create a black pearl, worth a huge bonus. Point at a pearl to spin in a Y shape.<br><b>Get three black pearls touching to win!</b> (Turn this off in Settings to play until no moves are left.)</p>
      <h3>💣 Bomb mode</h3>
      <p>Each spin lowers a bomb's counter by 1. At zero it explodes and the game ends. Match a bomb with its color to defuse it. In Settings you can also add bombs to Classic from level 3.</p>
      <h3>Keyboard</h3>
      <p>Space: switch direction · Enter / X: spin · H: hint · P / Esc: pause · M: mute</p>`,
  },
  ja: {
    title: 'くるくるバブル',
    subtitle: '3Dリメイク',
    'mode.classic': 'クラシック',
    'mode.classic.desc': '動かせる手がなくなるまで',
    'mode.bomb': 'ボム',
    'mode.bomb.desc': 'カウントが0になる前に爆弾を消そう',
    best: 'ベスト',
    score: 'スコア',
    level: 'レベル',
    goal: '残り目標',
    menuButton: 'メニュー',
    install: '📲 ホーム画面に追加',
    installTitle: '📲 ホーム画面に追加',
    installBody: `
      <p>追加すると専用のアイコンができ、全画面で起動し、<b>オフラインでも遊べます</b>。オンラインのときは自動で最新版になります。</p>
      <h3>iPhone / iPad</h3>
      <p><b>Safari</b> でこのページを開く → 下の<b>共有</b>ボタン（四角に上向き矢印）→ 下にスクロールして<b>「ホーム画面に追加」</b>→ 右上の<b>「追加」</b>。</p>
      <h3>Android</h3>
      <p><b>Chrome</b> で開く → タイトル画面の「📲 ホーム画面に追加」ボタン。インストール画面が出ないときは右上の <b>⋮</b> →<b>「アプリをインストール」</b>または<b>「ホーム画面に追加」</b>。</p>
      <h3>パソコン（Chrome / Edge）</h3>
      <p>アドレスバー右側の<b>インストールアイコン</b>をクリック、またはブラウザのメニューから<b>「インストール」</b>を選びます。</p>`,
    howto: '遊び方',
    settings: '設定',
    language: '言語',
    'lang.auto': '自動',
    sfx: '効果音',
    music: 'BGM',
    quality: '画質',
    'quality.auto': '自動',
    'quality.high': '高（高解像度）',
    'quality.low': '低（省電力）',
    on: 'オン',
    off: 'オフ',
    resume: '再開',
    restart: 'やり直す',
    menu: 'メニュー',
    paused: '一時停止',
    gameover: 'ゲームオーバー',
    victory: 'クリア！',
    'reason.win': 'ブラックパール3つがそろった！',
    pearlWin: 'ブラックパール3つでクリア',
    classicBombs: 'クラシックにも爆弾',
    rulesNote: 'ルール設定は次のゲームから反映されます',
    version: 'バージョン',
    'reason.nomoves': '動かせる手がありません',
    'reason.bomb': '爆弾が爆発した！',
    newbest: '新記録！',
    playagain: 'もう一度',
    chain: '{n}連鎖！',
    levelup: 'レベル {n}',
    newcolor: '新しい色が追加！',
    star: 'スター誕生！',
    starBlast: 'スター消し！',
    pearl: 'ブラックパール！',
    defused: '爆弾解除！',
    hint: 'ヒント',
    pause: '一時停止',
    close: '閉じる',
    'stat.moves': '手数',
    'stat.stars': 'スター',
    'stat.starsCleared': '消したスター',
    'stat.pearls': 'ブラックパール',
    'stat.bombs': '解除した爆弾',
    'stat.chain': '最大連鎖',
    'touch.ccw': '反時計回り',
    'touch.cw': '時計回り',
    'touch.tip': 'タップで選択、もう一度タップで回転',
    'dir.toggle': 'クリックで向きを切り替え',
    'mouse.tip': '左クリックで回転・右クリックかスペースで向きを切り替え',
    howtoBody: `
      <h3>基本</h3>
      <p>3つのバブルが接する点にカーソルを合わせると選択され、<b>左クリック</b>で今の向きに回転します。<br>
      回転の向きは<b>ひとつのキーで切り替え</b>：右クリック、スペースキー、左下の ↻ / ↺ ボタン。選択枠の中央の矢印が今の向きです。<br>
      スマホでは<b>タップ</b>で選択、<b>もう一度タップ</b>で回転。左下の大きなボタンで向きを切り替えます。</p>
      <p>1回の操作で最大3回まで回り、そろった時点で止まります。そろわなければ元の位置に戻ります。</p>
      <h3>マッチ</h3>
      <p><b>互いに接する同じ色の3つ（三角形）</b>で消えます。一直線の3つは消えません。つながった三角形はまとめて消えます。</p>
      <p>落ちてきたバブルでまたそろうと<b>連鎖</b>になり、スコアが倍増します。</p>
      <p>上の<b>残り目標</b>はこのレベルであと何回そろえればいいか。0 になればレベルアップ。レベル 4・7・10 で新しい色が加わります。</p>
      <h3>⭐ スター</h3>
      <p>あるバブルの周りを<b>同じ色の6つで囲む</b>と、中心がスターになります。スターを指すと周りの輪を回せます。<b>スター3つが接する</b>と色に関係なく消え、高得点です。<br>あと1つのときは5つが光り、足りない場所が必要な色の枠で示されます。</p>
      <h3>⚫ ブラックパール</h3>
      <p><b>スター6つで輪</b>を作るとブラックパールに。超高得点です。パールを指すとY字型に回せます。<br><b>ブラックパール3つが接すればクリア！</b>（設定でオフにすると、動かせる手がなくなるまで遊べます）</p>
      <h3>💣 ボムモード</h3>
      <p>回すたびに爆弾の数字が1減り、0で爆発してゲームオーバー。同じ色とそろえて消せば解除できます。設定でクラシックにもレベル3から爆弾を出せます。</p>
      <h3>キーボード</h3>
      <p>スペース：向きを切り替え　Enter / X：回転　H：ヒント　P / Esc：一時停止　M：ミュート</p>`,
  },
};

let current = 'en';

export function detectLang() {
  for (const l of navigator.languages ?? [navigator.language]) {
    const lower = l.toLowerCase();
    if (lower.startsWith('zh')) return 'zh-Hant';
    if (lower.startsWith('ja')) return 'ja';
    if (lower.startsWith('en')) return 'en';
  }
  return 'en';
}

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : detectLang();
  document.documentElement.lang = current;
  document.title = `${t('title')} — ${t('subtitle')}`;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of document.querySelectorAll('[data-i18n-title]')) {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  }
}

export function t(key, params = {}) {
  const text = DICT[current][key] ?? DICT.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}
