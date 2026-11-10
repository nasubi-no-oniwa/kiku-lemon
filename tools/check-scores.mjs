// ランキングの記録を、ゲームと同じ計算でやり直して確かめる。合わない記録と kl-remove.txt のIDの記録を消す
// そのあと、ランキング用の軽い写し（sa・sd：名前・個数・点数だけ）を記録とそろえる（足りない写しを足す・記録が消えた写しを消す）
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
    if (why) { rm++; console.log('消す:', path, k, JSON.stringify(v.n || ''), v.c, v.p, why); await api('DELETE', '/kl/' + path + '/' + k + '.json', undefined, tk); delete d[k]; }
  }
  return d;
}
const all = await sweep('all/scores');
const day = await sweep('d/scores');
console.log('確かめた', n, '件 / 消した', rm, '件');

// 軽い写しを記録とそろえる（前の版のページから送られた記録には写しがないので、ここで足す）
async function sync(src, dst, keys) {
  const cur = JSON.parse(await api('GET', '/kl/' + dst + '.json', undefined, tk)) || {};
  const up = {}; let add = 0, del = 0;
  for (const [id, v] of Object.entries(src)) {
    const c = cur[id];
    if (c && keys.every(k => c[k] === v[k])) continue;
    const o = {}; for (const k of keys) if (v[k] !== undefined) o[k] = v[k];
    o.t = v.t; up[dst + '/' + id] = o; add++;
  }
  for (const id of Object.keys(cur)) if (!src[id]) { up[dst + '/' + id] = null; del++; }
  if (add || del) await api('PATCH', '/kl.json', JSON.stringify(up), tk);
  console.log(dst, 'の写し：足した・直した', add, '件 / 消した', del, '件');
}
await sync(all, 'sa', ['n', 'c', 'p', 'k']);
await sync(day, 'sd', ['n', 'c', 'p', 'k', 'dk', 'ds']);
