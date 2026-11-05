// ランキングの記録を、ゲームと同じ計算でやり直して確かめる。合わない記録と kl-remove.txt のIDの記録を消す
import fs from 'fs';
import { createRequire } from 'module';
import { token, api } from './fb.mjs';
const KL = createRequire(import.meta.url)('../sim.js');
const tk = await token();
const ban = new Set((fs.existsSync('kl-remove.txt') ? fs.readFileSync('kl-remove.txt', 'utf8') : '').split(/\s+/).filter(x => /^[A-Za-z0-9]{20,40}$/.test(x)));
let n = 0, rm = 0;
async function sweep(path) {
  const d = JSON.parse(await api('GET', '/kl/' + path + '.json', undefined, tk)) || {};
  for (const [k, v] of Object.entries(d)) {
    n++; let why = '';
    if (ban.has(k)) why = '手で指定';
    else if (!KL.check(v)) why = '計算が合わない';
    if (why) { rm++; console.log('消す:', path, k, JSON.stringify(v.n || ''), v.c, v.p, why); await api('DELETE', '/kl/' + path + '/' + k + '.json', undefined, tk); }
  }
}
await sweep('all/scores');
await sweep('d/scores');
console.log('確かめた', n, '件 / 消した', rm, '件');
