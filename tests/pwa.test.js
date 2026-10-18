import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const core = [...sw.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]).filter((url) => url !== './');

const walk = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

test('service worker 預先快取的檔案都存在（少一個就整個安裝失敗）', () => {
  for (const url of core) assert.ok(existsSync(join(root, url)), `${url} 不存在`);
});

test('所有遊戲程式都在離線快取清單裡', () => {
  for (const file of walk('js')) assert.ok(core.includes(`./${file}`), `${file} 沒有列在 sw.js 的 CORE`);
});

test('manifest 的圖示都存在', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) assert.ok(existsSync(join(root, icon.src)), `${icon.src} 不存在`);
});
