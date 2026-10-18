# 旋轉泡泡球 3D

向 MSN 經典遊戲致敬的旋轉泡泡球（Hexic 類型）3D 復刻版。用 three.js 繪製，不需要建置工具，直接在 GitHub Pages 上玩。

## 玩法

- 指向三顆球的交會點，**左鍵**往目前方向旋轉；方向用**一個鍵切換**（右鍵、空白鍵或右下角的 ↻ / ↺ 按鈕）。手機上點一下選取、再點一次旋轉。
- **三顆互相相鄰（三角形）**的同色球會消除，直線三顆不算。掉落後再形成配對就是連鎖。
- 6 顆同色球圍成一圈 → 中間變成 **星星**；6 顆星星圍成一圈 → **黑珍珠**。
- **經典模式**：一直玩到沒有步可以走。**炸彈模式**：炸彈每轉一次倒數減 1，歸零就結束。
- 鍵盤：空白鍵切換方向、Enter / X 旋轉、H 提示、P / Esc 暫停、M 靜音。

介面支援繁體中文、英文、日文；音效與背景音樂都是 Web Audio 即時合成。

## 部署到 GitHub Pages

Settings → Pages → Build and deployment → Source 選 **Deploy from a branch**，Branch 選 `master`、資料夾 `/ (root)`。

## 本機執行與測試

```sh
npm start   # http://localhost:8080
npm test    # 核心規則的單元測試（不需要安裝任何套件）
```

ES modules 需要透過 HTTP 載入，直接雙擊 `index.html` 會無法執行。

## 結構

```
js/core/   遊戲規則（純資料，不依賴畫面，可在 Node 測試）
js/view/   three.js 繪製：場景、棋子、特效、事件動畫
js/ui/     HUD、多語系、音效、localStorage
vendor/    three.js r180（MIT，固定版本）
tests/     node --test 單元測試
```

規則層每走一步會輸出事件序列（rotate → clear → fall → …），繪製層只負責依序播放。

本專案為個人非商業的致敬作品，與 Microsoft 無關；所有圖像與聲音皆為程式即時產生。
