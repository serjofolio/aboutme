/* HYF-OS core — background, cursor, sound, theme, boot, router */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const GLYPHS = 'abcdefghijklmnopqrstuvwxyzàèéêôûùç.:;,\'0123456789';
const SCR = '!<>-_\\/[]{}=+*^?#%&$ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ROUTES = [
  { id: 'home', name: '家', path: '~/', icon: '' },
  { id: 'about', name: '关于', path: '~/about', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>' },
  { id: 'skills', name: '技能', path: '~/skills', icon: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M6 8l5 8M18 8l-5 8M7.2 6h9.6"/>' },
  { id: 'exp', name: '经历', path: '~/experience', icon: '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="7" r="2.2"/><path d="M6 7.2v9.6M18 9.2c0 5-6 4-11 8"/>' },
  { id: 'project', name: '项目', path: '~/projects', icon: '<path d="M12 2.5l8.5 4.7v9.6L12 21.5l-8.5-4.7V7.2z"/><path d="M3.5 7.2L12 12l8.5-4.8M12 12v9.5"/>' },
  { id: 'robot', name: '机器人', path: '~/robotics', icon: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4.5V8M9 13h.01M15 13h.01M2.5 12v4M21.5 12v4"/><circle cx="12" cy="3.5" r="1"/>' },
  { id: 'life', name: '生活', path: '~/life', icon: '<circle cx="12" cy="18.5" r="2.5"/><path d="M10 16.5L6.5 4h11L14 16.5M8 9.5h8M9.2 4l1.6 12.5M14.8 4l-1.6 12.5"/>' },
  { id: 'lib', name: '资料库', path: '~/library', icon: '<path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v13a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6z"/>' },
  { id: 'ask', name: '分身', path: '~/ai-twin', icon: '<path d="M4 5h16v11H9.5L5 20v-4H4z"/><path d="M12 7.6l.9 1.9 2 .6-2 .6-.9 1.9-.9-1.9-2-.6 2-.6z"/>' },
  { id: 'terminal', name: '终端', path: '~/shell', icon: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9l3 3-3 3M12.5 15H17"/>' },
  { id: 'contact', name: '联系', path: '~/contact', icon: '<circle cx="12" cy="12" r="2"/><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>' },
];
const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

const HY = (window.HY = { $, $$, rand, sleep, esc, reduce, fine, GLYPHS, SCR, ROUTES, byId, pages: {}, surge: 0, current: null, mouse: { x: -9999, y: -9999 } });
HY.page = (id, mod) => (HY.pages[id] = mod);
HY.svg = (inner) => `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
HY.keyOf = (i) => (i === 10 ? '0' : String(i)); // route index → keyboard key

/* ---------- text scramble ---------- */
HY.scramble = (el, text, dur = 900) => {
  text = text ?? el.dataset.text ?? el.textContent;
  el.dataset.text = text;
  const id = (el._scr = (el._scr || 0) + 1);
  const q = [...text].map((ch) => ({ ch, s: Math.random() * dur * 0.4, e: dur * 0.4 + Math.random() * dur * 0.6 }));
  const t0 = performance.now();
  return new Promise((res) => {
    (function f(now) {
      if (el._scr !== id) return res();
      const t = now - t0;
      let out = '', done = 0;
      for (const c of q) {
        if (t >= c.e || c.ch === ' ') { out += c.ch; done++; }
        else if (t >= c.s) out += SCR[(Math.random() * SCR.length) | 0];
        else out += ' ';
      }
      el.textContent = out;
      done < q.length ? requestAnimationFrame(f) : res();
    })(t0);
  });
};

/* ---------- theme ---------- */
const THEMES = { gold: ['233,180,92', '255,217,142', '黑金'], green: ['0,255,140', '190,255,220', '骇客绿'], cyan: ['90,200,255', '205,240,255', '赛博蓝'] };
HY.THEMES = THEMES;
HY.setTheme = (name) => {
  if (!THEMES[name]) name = 'gold';
  HY.theme = name;
  HY.rgbStr = THEMES[name][0];
  HY.hiStr = THEMES[name][1];
  document.documentElement.dataset.theme = name;
  try { localStorage.setItem('hy-theme', name); } catch (e) { /* storage unavailable */ }
  $$('[data-theme-btn]').forEach((b) => b.classList.toggle('on', b.dataset.themeBtn === name));
  return name;
};
HY.cycleTheme = () => { const k = Object.keys(THEMES); return HY.setTheme(k[(k.indexOf(HY.theme) + 1) % k.length]); };
HY.rgba = (a, hi) => `rgba(${hi ? HY.hiStr : HY.rgbStr},${a})`;
let savedTheme = null;
try { savedTheme = localStorage.getItem('hy-theme'); } catch (e) { /* storage unavailable */ }
HY.setTheme(savedTheme || 'gold');

/* ---------- sound: generative ambient + UI blips ---------- */
HY.sound = (() => {
  let ac, master, analyser, data, delay, rev, noiseBuf, on = false, sched = 0, nextT = 0, step = 0;
  const STEP = 60 / 84 / 2;
  const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]];
  const PENTA = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    analyser = ac.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.8;
    data = new Uint8Array(analyser.frequencyBinCount);
    master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination);
    delay = ac.createDelay(2); delay.delayTime.value = STEP * 3;
    const fb = ac.createGain(); fb.gain.value = 0.38;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(master);
    rev = ac.createConvolver(); rev.buffer = impulse(3.2);
    const rg = ac.createGain(); rg.gain.value = 0.5; rev.connect(rg); rg.connect(master);
    const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 320; dl.Q.value = 4;
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.06;
    const lg = ac.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(dl.frequency); lfo.start();
    const dg = ac.createGain(); dg.gain.value = 0.06; dl.connect(dg); dg.connect(master); dg.connect(rev);
    [[45, -7], [45, 7], [52, 0]].forEach(([m, det]) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(dl); o.start(); });
  }
  function impulse(sec) {
    const len = (ac.sampleRate * sec) | 0, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5); }
    return b;
  }
  function noise() {
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }
  function pad(t, chord) {
    const len = STEP * 16;
    chord.forEach((m) => {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = rand(-6, 6);
      f.type = 'lowpass'; f.frequency.value = 1200;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 2); g.gain.linearRampToValueAtTime(0.022, t + len - 1); g.gain.linearRampToValueAtTime(0, t + len + 1.5);
      o.connect(f); f.connect(g); g.connect(master); g.connect(rev);
      o.start(t); o.stop(t + len + 1.6);
    });
  }
  function pluck(t, m, v) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g); g.connect(master); g.connect(delay);
    o.start(t); o.stop(t + 1);
  }
  function thump(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.5);
  }
  function hat(t, v) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise(); f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + 0.06);
  }
  function tick() {
    while (nextT < ac.currentTime + 0.15) {
      if (step % 16 === 0) pad(nextT, CHORDS[(step / 16) % 4]);
      if (step % 4 === 0) thump(nextT);
      if (step % 2 === 1) hat(nextT, 0.012);
      if (Math.random() < 0.5) pluck(nextT, PENTA[(Math.random() * PENTA.length) | 0] + (Math.random() < 0.2 ? 12 : 0), rand(0.02, 0.045));
      nextT += STEP; step++;
    }
  }
  return {
    get on() { return on; },
    async toggle(force) {
      const want = force ?? !on;
      if (want === on) return on;
      try { if (!ac) init(); } catch (e) { return false; }
      on = want;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
      if (on) { await ac.resume(); nextT = ac.currentTime + 0.05; clearInterval(sched); sched = setInterval(tick, 40); master.gain.setTargetAtTime(0.7, t, 0.8); }
      else { master.gain.setTargetAtTime(0, t, 0.3); clearInterval(sched); setTimeout(() => { if (!on) ac.suspend(); }, 1500); }
      document.body.classList.toggle('sound-on', on);
      $('#soundLbl').textContent = on ? '聆听中' : '聆听';
      return on;
    },
    level() {
      if (!on || !analyser) return 0;
      analyser.getByteFrequencyData(data);
      let s = 0; for (let i = 2; i < 40; i++) s += data[i];
      return Math.min(1, (s / (38 * 255)) * 1.6);
    },
    blip(f = 1800, d = 0.04, v = 0.03) {
      if (!on) return;
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
    },
    whoosh() {
      if (!on) return;
      const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noise(); f.type = 'bandpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(5000, t + 0.45);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.65);
    },
  };
})();

/* ---------- matrix background ---------- */
const cv = $('#matrix'), ctx = cv.getContext('2d');
const CW = 11, CH = 17;
let W = 0, H = 0, cols = 0, rows = 0, N = 0, chars = [], base, bright, streams = [];
const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
function newStream() { return { c: (Math.random() * cols) | 0, y: rand(-rows, 0), v: rand(0.15, 0.55) }; }
function resizeMatrix() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cols = Math.ceil(W / CW); rows = Math.ceil(H / CH); N = cols * rows;
  chars = new Array(N); base = new Float32Array(N); bright = new Float32Array(N);
  for (let i = 0; i < N; i++) { chars[i] = glyph(); base[i] = Math.random() < 0.62 ? rand(0.035, 0.11) : 0; }
  streams = Array.from({ length: Math.max(8, (cols * 0.07) | 0) }, newStream);
}
const buckets = Array.from({ length: 12 }, () => []);
let lastFrame = 0;
function drawMatrix(t) {
  requestAnimationFrame(drawMatrix);
  if (t - lastFrame < 33) return;
  lastFrame = t;
  const lv = HY.sound.level();
  const sp = 1 + HY.surge * 3 + lv * 1.5;
  for (let k = 0; k < streams.length; k++) {
    const s = streams[k];
    s.y += s.v * sp;
    const r = s.y | 0;
    if (r >= 0 && r < rows) { const i = r * cols + s.c; bright[i] = 1; chars[i] = glyph(); }
    if (s.y > rows + 5) streams[k] = newStream();
  }
  if (HY.surge > 0) {
    HY.surge = Math.max(0, HY.surge - 0.012);
    for (let k = 0; k < 60 * HY.surge; k++) bright[(Math.random() * N) | 0] = 1;
  }
  if (lv > 0.05) for (let k = 0; k < lv * 40; k++) { const i = (Math.random() * N) | 0; if (bright[i] < lv) bright[i] = lv; }
  const mc = (HY.mouse.x / CW) | 0, mr = (HY.mouse.y / CH) | 0, R = 9;
  for (let y = mr - R; y <= mr + R; y++) {
    if (y < 0 || y >= rows) continue;
    for (let x = mc - 15; x <= mc + 15; x++) {
      if (x < 0 || x >= cols) continue;
      const dx = (x - mc) / 1.6, dy = y - mr, d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) continue;
      const i = y * cols + x, v = 0.55 * (1 - d / R);
      if (bright[i] < v) bright[i] = v;
      if (Math.random() < 0.04) chars[i] = glyph();
    }
  }
  for (let k = 0; k < N * 0.004; k++) chars[(Math.random() * N) | 0] = glyph();
  for (const b of buckets) b.length = 0;
  const boost = 1 + lv * 1.2;
  for (let i = 0; i < N; i++) {
    bright[i] *= 0.93;
    const a = base[i] * boost + bright[i];
    if (a < 0.03) continue;
    buckets[Math.min(11, (a * 11) | 0)].push(i);
  }
  ctx.fillStyle = '#070707'; ctx.fillRect(0, 0, W, H);
  ctx.font = '600 13px "JetBrains Mono", monospace'; ctx.textBaseline = 'top';
  for (let b = 0; b < 12; b++) {
    const arr = buckets[b];
    if (!arr.length) continue;
    ctx.fillStyle = b >= 10 ? HY.rgba(0.95, true) : HY.rgba((b + 0.6) / 11);
    for (let j = 0; j < arr.length; j++) { const i = arr[j]; ctx.fillText(chars[i], (i % cols) * CW, ((i / cols) | 0) * CH); }
  }
}
resizeMatrix();
requestAnimationFrame(drawMatrix);
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resizeMatrix, 150); });

/* ---------- cursor ---------- */
const dot = $('.cur-dot'), ring = $('.cur-ring');
let rx = -9999, ry = -9999;
addEventListener('mousemove', (e) => { HY.mouse.x = e.clientX; HY.mouse.y = e.clientY; dot.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
document.addEventListener('mouseleave', () => { HY.mouse.x = HY.mouse.y = -9999; });
addEventListener('mousedown', () => ring.classList.add('down'));
addEventListener('mouseup', () => ring.classList.remove('down'));
(function loopRing() {
  rx += (HY.mouse.x - rx) * 0.18; ry += (HY.mouse.y - ry) * 0.18;
  ring.style.transform = `translate(${rx}px,${ry}px)`;
  requestAnimationFrame(loopRing);
})();
let lastHover = null;
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest('a,button,input,canvas,code,[data-hover]');
  ring.classList.toggle('hover', !!t);
  if (t && t !== lastHover && (t.tagName === 'A' || t.tagName === 'BUTTON')) HY.sound.blip(2600, 0.02, 0.012);
  lastHover = t;
});
document.addEventListener('click', (e) => { if (e.target.closest('a,button')) HY.sound.blip(900, 0.06, 0.03); });

/* ---------- chrome: nav, menu, sound, theme ---------- */
$('#navLinks').innerHTML = ROUTES.map((r) => `<a href="#/${r.id === 'home' ? '' : r.id}" data-route="${r.id}">${r.name}</a>`).join('');
$('#menuList').innerHTML = ROUTES.map((r, i) => `<li><a href="#/${r.id === 'home' ? '' : r.id}" data-route="${r.id}" style="transition-delay:${i * 35}ms"><span class="n">${i === 0 ? 'H' : HY.keyOf(i)}</span><span class="t">${r.name}</span><span class="p">${r.path}</span></a></li>`).join('');
$('#menuThemes').innerHTML = Object.entries(THEMES).map(([k, v]) => `<button data-theme-btn="${k}" class="${k === HY.theme ? 'on' : ''}">● ${v[2]}</button>`).join('') + '<button id="menuSound">♪ 背景音乐</button>';
const menu = $('#menu');
HY.menu = (open = !menu.classList.contains('open')) => {
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  if (open) { HY.surge = Math.max(HY.surge, 0.4); $$('#menuList .t').forEach((t) => HY.scramble(t, null, 500)); }
};
$('#btnMenu').addEventListener('click', () => HY.menu());
$('#menuClose').addEventListener('click', () => HY.menu(false));
menu.addEventListener('click', (e) => {
  if (e.target.closest('#menuList a')) HY.menu(false);
  const tb = e.target.closest('[data-theme-btn]');
  if (tb) HY.setTheme(tb.dataset.themeBtn);
  if (e.target.closest('#menuSound')) HY.sound.toggle();
  if (e.target === menu) HY.menu(false);
});
$$('#menuList a').forEach((a) => a.addEventListener('mouseenter', () => HY.scramble($('.t', a), null, 350)));
$('#btnTheme').addEventListener('click', () => { HY.cycleTheme(); HY.surge = 0.5; });
$('#btnSound').addEventListener('click', () => HY.sound.toggle());

/* ---------- clock ---------- */
const t0 = Date.now(), pad2 = (n) => String(n).padStart(2, '0');
setInterval(() => {
  const d = new Date();
  $('#clock').textContent = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  const s = ((Date.now() - t0) / 1000) | 0, up = $('#uptime');
  if (up) up.textContent = `${pad2((s / 3600) | 0)}:${pad2(((s / 60) | 0) % 60)}:${pad2(s % 60)}`;
}, 1000);

/* ---------- avatar (loaded lazily: ~0.5MB) ---------- */
HY.avatar = new Promise((res) => {
  const s = document.createElement('script');
  s.src = 'avatar.js';
  s.onload = () => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = window.AVATAR_SRC; };
  s.onerror = () => res(null);
  document.body.appendChild(s);
});

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((ents) => {
  let k = 0;
  ents.forEach((e) => {
    if (!e.isIntersecting) return;
    const n = e.target;
    io.unobserve(n);
    setTimeout(() => { n.classList.add('in'); n.dispatchEvent(new CustomEvent('hy:in')); }, 60 + k++ * 90);
  });
}, { threshold: 0.12 });

/* ---------- router ---------- */
const pageEl = (id) => $(`.page[data-page="${id}"]`);
const parse = () => { const h = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]; return byId[h] ? h : 'home'; };
HY.go = (id) => { location.hash = id === 'home' ? '#/' : '#/' + id; };

// pager at the bottom of every page except home
ROUTES.forEach((r, i) => {
  if (r.id === 'home') return;
  const prev = ROUTES[i - 1], next = ROUTES[i + 1] || ROUTES[0];
  pageEl(r.id).insertAdjacentHTML('beforeend', `<nav class="pager" data-a><a class="prev" href="#/${prev.id === 'home' ? '' : prev.id}"><span>← PREV · ${prev.path}</span><b>${prev.name}</b></a><a class="next" href="#/${next.id === 'home' ? '' : next.id}"><span>NEXT · ${next.path} →</span><b>${next.id === 'home' ? '回到首页' : next.name}</b></a></nav>`);
});

const wipe = $('#wipe');
$$('#wipe > i').forEach((b, i) => { b.style.top = `${i * 12.5}%`; b.style.transitionDelay = `${i * 22}ms`; });
async function wipeIn(id) {
  const r = byId[id];
  $('#wipeSub').textContent = `$ cd ${r.path} && ./render --page=${id}`;
  wipe.classList.remove('out');
  void wipe.offsetWidth;
  wipe.classList.add('in');
  HY.scramble($('#wipeLbl'), `ACCESS ${id.toUpperCase()}`, 420);
  await sleep(560);
}
async function wipeOut() {
  wipe.classList.remove('in');
  wipe.classList.add('out');
  await sleep(560);
  wipe.classList.remove('out');
}

let busy = false;
async function show(id, instant) {
  if (id === HY.current || busy) return;
  busy = true;
  const prev = HY.current;
  if (!instant && !reduce && prev) { HY.surge = Math.max(HY.surge, 0.6); HY.sound.whoosh(); await wipeIn(id); }
  if (prev) {
    const pe = pageEl(prev);
    pe.classList.remove('active');
    $$('[data-a]', pe).forEach((n) => { io.unobserve(n); n.classList.remove('in'); });
    const pm = HY.pages[prev];
    if (pm && pm.leave) pm.leave(pe);
  }
  HY.current = id;
  const el = pageEl(id);
  el.classList.add('active');
  window.scrollTo(0, 0);
  $$('[data-route]').forEach((a) => a.classList.toggle('active', a.dataset.route === id));
  $('#routeLabel').textContent = byId[id].path;
  document.title = id === 'home' ? '黄奕锋 · AI Agent Engineer' : `${byId[id].name} · 黄奕锋`;
  $$('[data-a]', el).forEach((n) => io.observe(n));
  $$('[data-scramble]', el).forEach((n) => HY.scramble(n, null, 900));
  const mod = HY.pages[id];
  if (mod) {
    if (!mod._inited) { mod._inited = true; if (mod.init) mod.init(el); }
    if (mod.enter) mod.enter(el);
  }
  if (!instant && !reduce && prev) await wipeOut();
  busy = false;
  if (parse() !== HY.current) show(parse());
}

addEventListener('hashchange', () => { if (booted) show(parse()); });
addEventListener('keydown', (e) => {
  if (!booted) { if (['Escape', 'Enter', ' '].includes(e.key)) finishBoot(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if (e.key === 'Escape') { HY.menu(false); return; }
  if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[0-9]$/.test(e.key)) { const i = e.key === '0' ? 10 : +e.key; if (ROUTES[i]) { HY.menu(false); HY.go(ROUTES[i].id); } }
  else if (e.key === 'h' || e.key === 'H') { HY.menu(false); HY.go('home'); }
  else if (e.key === 'm' || e.key === 'M') HY.menu();
  else if (e.key === '`' || e.key === '~') { HY.menu(false); HY.go('terminal'); }
});

/* ---------- boot ---------- */
const BOOT = [
  ['[ <span class="ok">OK</span> ] mounting /dev/brain ............................', 110],
  ['[ <span class="ok">OK</span> ] loading langgraph runtime · deepseek · qwen · glm', 130],
  ['[ <span class="ok">OK</span> ] connecting MCP servers .......................... 6/6', 150],
  ['[ <span class="ok">OK</span> ] calibrating unitree-g1 dual-arm IK · 7-DoF ×2', 170],
  ['[ <span class="ok">OK</span> ] syncing github.com/serjofolio', 140],
  ['[ <span class="ok">OK</span> ] restringing badminton racket 🏸', 140],
  ['[<span class="warn">WARN</span>] coffee level low — continuing anyway', 190],
  ['&gt;&gt;&gt; decrypting identity: <span style="color:var(--hi)">HUANG_YIFENG</span>', 240],
];
const boot = $('#boot');
let booted = false;
function finishBoot() {
  if (booted) return;
  booted = true;
  boot.classList.add('open');
  document.body.classList.remove('booting');
  document.body.classList.add('ready');
  setTimeout(() => boot.remove(), 1200);
  show(parse(), true);
}
async function runBoot() {
  const box = $('#bootLines'), bar = $('#bootBar'), pct = $('#bootPct');
  let p = 0;
  for (let k = 0; k < BOOT.length; k++) {
    if (booted) return;
    const d = document.createElement('div');
    d.className = 'line'; d.innerHTML = BOOT[k][0]; box.appendChild(d);
    const target = Math.round(((k + 1) / BOOT.length) * 100);
    for (let s = 0; s < 6; s++) { p += (target - p) / (6 - s); bar.style.width = p + '%'; pct.textContent = Math.round(p) + '%'; await sleep(BOOT[k][1] / 6); }
  }
  if (booted) return;
  $('#bootStage').textContent = 'IDENTITY VERIFIED';
  $('#granted').classList.add('show');
  HY.surge = 1;
  await sleep(900);
  finishBoot();
}
boot.addEventListener('click', finishBoot);

HY.start = () => { if (reduce) finishBoot(); else runBoot(); };

console.log('%c HUANG YIFENG %c 你也在看源码？我们应该聊聊 → github.com/serjofolio ', `background:rgb(${HY.rgbStr});color:#000;font-weight:800;padding:4px`, `color:rgb(${HY.rgbStr})`);
})();
