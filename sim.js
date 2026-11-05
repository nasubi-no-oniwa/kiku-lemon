// 菊とレモン：流れてくる物の並びと、記録の確かめ（ゲームと記録の確認で同じものを使う）
(function (root, f) { if (typeof module === 'object' && module.exports) module.exports = f(); else root.KL = f(); })(typeof self !== 'undefined' ? self : this, function () {
  const V = 2;        // 計算の版。並び・押せる幅を変えたら上げる（前の版の記録も確かめられるように残す）
  // 版ごとの押せる幅（前後 ms）と「ちょうど」の幅。v1=最初の版、v2=押せる幅を広げた版
  const WV = { 1: 130, 2: 180 }, PV = { 1: 20, 2: 45 };
  const W = WV[V];
  const CAP = 60000;  // ここで最高速になる（ms）
  const FIRST = 2400; // 最初の物が真下に来る時刻（ms）
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seedOf(st) { let h = 2166136261 >>> 0; const s = 'kl' + String(st); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // 並び：T(i)=真下に来る時刻(ms・整数)、K(i)=0 ディルド／1 アワビ
  function line(seed) {
    const r = rng(seed), TT = [], KK = [];
    let t = FIRST, prev = -1, streak = 0;
    function more() {
      let k;
      if (t >= CAP && prev >= 0 && streak < 4 && r() < 0.35) k = prev; else k = r() < 0.5 ? 0 : 1;
      streak = k === prev ? streak + 1 : 0; prev = k;
      TT.push(t); KK.push(k);
      let g;
      if (t < CAP) { const b = 1200 - 700 * t / CAP; g = Math.round(b * (0.9 + 0.2 * r())); }
      else { const x = r(); g = x < 0.22 ? 360 : x < 0.5 ? 500 : x < 0.72 ? 620 : x < 0.88 ? 780 : 440; }
      t += g;
    }
    return { T(i) { while (TT.length <= i) more(); return TT[i]; }, K(i) { while (KK.length <= i) more(); return KK[i]; } };
  }
  // ずれ(ms)→点数：「ちょうど」の幅までは100点、押せる幅のはしで50点
  function pts(e, v = V) { const a = Math.abs(e), w = WV[v], q = PV[v]; return a <= q ? 100 : 100 - Math.ceil(50 * (a - q) / (w - q)); }
  const enc = (e, v = V) => (e + WV[v]).toString(36).padStart(2, '0');
  // ベルトの速さ（見た目用、1秒あたり）と、進んだ長さ
  const V0 = 1.125, V1 = 2.7;
  function speed(ms) { return V0 + (V1 - V0) * Math.min(1, Math.max(0, ms) / CAP); }
  function dist(ms) { const s = ms / 1000, c = CAP / 1000; if (s <= c) return V0 * s + (V1 - V0) * s * s / (2 * c); return V0 * c + (V1 - V0) * c / 2 + V1 * (s - c); }
  // 記録の確かめ：同じ並びでやり直して、数・点数・終わった時刻が合うか
  function check(rec) {
    try {
      if (!rec || !WV[rec.v]) return false;
      const v = rec.v, W = WV[v];
      const c = rec.c, lg = rec.lg;
      if (!(Number.isInteger(c) && c >= 1) || typeof lg !== 'string' || lg.length !== c * 2 || !/^[0-9a-z]*$/.test(lg)) return false;
      const L = line(seedOf(rec.st));
      let p = 0, last = 0, sum = 0, sq = 0;
      for (let i = 0; i < c; i++) {
        const e = parseInt(lg.substr(i * 2, 2), 36) - W;
        if (!(e >= -W && e <= W)) return false;
        const at = L.T(i) + e;
        if (at < last) return false;
        last = at; p += pts(e, v); sum += e; sq += e * e;
      }
      if (p !== rec.p || rec.k !== c * 10000000 + p) return false;
      if (!(rec.s >= last && rec.s <= L.T(c) + W + 50)) return false;
      // 機械で押したような、ずれがほぼない記録ははじく
      if (c >= 40) { const m = sum / c, sd = Math.sqrt(Math.max(0, sq / c - m * m)); if (sd < 6) return false; }
      return true;
    } catch (e) { return false; }
  }
  return { V, W, CAP, FIRST, rng, seedOf, line, pts, enc, speed, dist, check };
});
