/* HYF-OS pages — one module per route: init (once), enter, leave */
(() => {
'use strict';
const { $, $$, rand, sleep, esc, GLYPHS, SCR } = HY;
const P = window.PROFILE;
const scramble = HY.scramble;
const rgba = HY.rgba;
const setupCanvas = (cv) => {
  const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, r.width, r.height];
};

/* ================= HOME ================= */
HY.page('home', {
  init(el) {
    const hashEl = $('#hash', el), HC = '*-+|<>ZKVNX0123456789#=/\\', arr = [...'*-Z244|47V+K-<K4||NZ79-'];
    setInterval(() => {
      if (HY.current !== 'home') return;
      for (let k = 0; k < 3; k++) arr[(Math.random() * arr.length) | 0] = HC[(Math.random() * HC.length) | 0];
      hashEl.textContent = arr.join('');
    }, 90);

    const card = $('#card', el);
    addEventListener('mousemove', (e) => {
      if (HY.current !== 'home') return;
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      card.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    });

    const dock = $('#dock', el);
    dock.innerHTML = HY.ROUTES.slice(1).map((r, i) => `<a href="#/${r.id}" data-route="${r.id}"><span class="tip">${r.path}</span><span class="ic">${HY.svg(r.icon)}</span><span class="lb">${r.name}</span><span class="k">${HY.keyOf(i + 1)}</span></a>`).join('');
    const items = $$('a', dock);
    dock.addEventListener('mousemove', (e) => {
      if (!HY.fine) return;
      const mx = e.clientX - dock.getBoundingClientRect().left;
      items.forEach((a) => {
        const d = Math.abs(mx - (a.offsetLeft + a.offsetWidth / 2)), s = 1 + 0.32 * Math.max(0, 1 - d / 130);
        $('.ic', a).style.transform = `translateY(${-(s - 1) * 24}px) scale(${s})`;
      });
    });
    dock.addEventListener('mouseleave', () => items.forEach((a) => ($('.ic', a).style.transform = '')));

    const log = $('#liveLog', el);
    let li = 0;
    const pushLog = () => {
      if (HY.current !== 'home' || getComputedStyle(log.parentElement).display === 'none') return;
      const line = document.createElement('div');
      log.appendChild(line);
      while (log.children.length > 8) log.firstElementChild.remove();
      scramble(line, P.log[li++ % P.log.length], 700);
    };
    for (let k = 0; k < 6; k++) pushLog();
    setInterval(pushLog, 2600);

    (async () => {
      const role = $('#role', el);
      for (let i = 0; ; i++) {
        const w = P.roles[i % P.roles.length];
        for (let k = 1; k <= w.length; k++) { role.textContent = w.slice(0, k); await sleep(70); }
        await sleep(2200);
        for (let k = w.length; k >= 0; k--) { role.textContent = w.slice(0, k); await sleep(30); }
        await sleep(300);
      }
    })();
  },
  enter(el) {
    const seq = [...$('#heroSeq', el).children];
    seq.forEach((n) => n.classList.remove('in'));
    seq.forEach((n, k) => setTimeout(() => n.classList.add('in'), 350 + k * 150));
    setTimeout(() => { scramble($('#nameZh', el), P.name, 1000); scramble($('#nameEn', el), P.nameEn, 1400); }, 400);
    const logo = $('.logo', el);
    logo.classList.remove('draw'); void logo.getBoundingClientRect(); logo.classList.add('draw');
  },
});

/* ================= ABOUT ================= */
function countUp(n) {
  const to = +n.dataset.count, dec = +(n.dataset.dec || 0), suf = n.dataset.suffix || '', t0 = performance.now();
  (function f(now) {
    const p = Math.min(1, (now - t0) / 1800), e = 1 - Math.pow(1 - p, 4);
    n.textContent = (to * e).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
HY.page('about', {
  init(el) {
    const stats = $('.stats', el);
    stats.addEventListener('hy:in', () => $$('[data-count]', stats).forEach(countUp));

    const ac = $('#ascii', el);
    const RAMP = ' .\'`:,;-~+=*ixz#%&@';
    let actx, aW = 0, aH = 0, AC = 0, AR = 0, img = null, cells = [], levels = [], lens = null, reveal = 0, raf = 0, last = 0;
    const crop = (bw, bh) => {
      const ir = img.width / img.height, br = bw / bh;
      let sw = img.width, sh = img.height, sx = 0, sy = 0;
      if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; } else { sh = img.width / br; sy = (img.height - sh) / 2; }
      return [sx, sy, sw, sh];
    };
    const build = () => {
      [actx, aW, aH] = setupCanvas(ac);
      AC = Math.round(aW / 6.4); AR = Math.round(aH / 9.6);
      const off = document.createElement('canvas'); off.width = AC; off.height = AR;
      const o = off.getContext('2d');
      o.drawImage(img, ...crop(AC, AR), 0, 0, AC, AR);
      const d = o.getImageData(0, 0, AC, AR).data;
      cells = []; levels = Array.from({ length: 10 }, () => []);
      for (let i = 0; i < AC * AR; i++) {
        const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
        if (b > 70 && b > r * 1.6 && b > g * 1.25) { cells.push(null); continue; } // strip blue backdrop
        const L = Math.pow((0.299 * r + 0.587 * g + 0.114 * b) / 255, 0.8);
        cells.push(RAMP[Math.min(RAMP.length - 1, (L * RAMP.length) | 0)]);
        levels[Math.min(9, (L * 10) | 0)].push(i);
      }
    };
    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 33) return;
      last = t;
      const cw = aW / AC, chh = aH / AR;
      actx.fillStyle = '#080807'; actx.fillRect(0, 0, aW, aH);
      actx.font = `600 ${Math.round(chh * 1.02)}px "JetBrains Mono", monospace`; actx.textBaseline = 'top';
      if (reveal < AR + 4) reveal += 1.6;
      for (let lv = 0; lv < 10; lv++) {
        actx.fillStyle = rgba(0.18 + lv * 0.09);
        for (const i of levels[lv]) {
          const y = (i / AC) | 0;
          if (y >= reveal - 3) continue;
          const ch = Math.random() < 0.003 ? SCR[(Math.random() * SCR.length) | 0] : cells[i];
          actx.fillText(ch, (i % AC) * cw, y * chh);
        }
      }
      actx.fillStyle = rgba(1, true);
      for (let y = Math.max(0, (reveal | 0) - 3); y < Math.min(AR, reveal); y++) for (let x = 0; x < AC; x++) if (cells[y * AC + x]) actx.fillText(SCR[(Math.random() * SCR.length) | 0], x * cw, y * chh);
      actx.fillStyle = rgba(0.12);
      for (let k = 0; k < 14; k++) { const i = (Math.random() * cells.length) | 0; if (!cells[i]) actx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], (i % AC) * cw, ((i / AC) | 0) * chh); }
      const sy = ((t / 18) % (aH + 60)) - 30, gr = actx.createLinearGradient(0, sy - 30, 0, sy + 2);
      gr.addColorStop(0, rgba(0)); gr.addColorStop(1, rgba(0.18));
      actx.fillStyle = gr; actx.fillRect(0, sy - 30, aW, 32);
      if (lens) {
        const R = Math.min(aW, aH) * 0.2;
        actx.save(); actx.beginPath(); actx.arc(lens.x, lens.y, R, 0, Math.PI * 2); actx.clip();
        actx.filter = 'sepia(.55) saturate(1.1) contrast(1.05)';
        actx.drawImage(img, ...crop(aW, aH), 0, 0, aW, aH);
        actx.filter = 'none'; actx.restore();
        actx.strokeStyle = rgba(1); actx.lineWidth = 1.2;
        actx.beginPath(); actx.arc(lens.x, lens.y, R, 0, Math.PI * 2); actx.stroke();
        actx.font = '10px "JetBrains Mono", monospace'; actx.fillStyle = rgba(1);
        actx.fillText(`DECODE ${(lens.x | 0).toString(16).padStart(3, '0')}:${(lens.y | 0).toString(16).padStart(3, '0')}`, lens.x + R * 0.72, lens.y + R * 0.72);
      }
    };
    this.start = () => { if (!img) return; cancelAnimationFrame(raf); build(); reveal = 0; raf = requestAnimationFrame(draw); };
    this.stop = () => { cancelAnimationFrame(raf); raf = 0; };
    ac.addEventListener('pointermove', (e) => { const r = ac.getBoundingClientRect(); lens = { x: e.clientX - r.left, y: e.clientY - r.top }; });
    ac.addEventListener('pointerleave', () => (lens = null));
    addEventListener('resize', () => { if (img && raf) build(); });
    HY.avatar.then((im) => { img = im; if (im && HY.current === 'about' && !raf) this.start(); });
  },
  enter() { this.start(); },
  leave() { this.stop(); },
});

/* ================= SKILLS ================= */
HY.page('skills', {
  init(el) {
    const G = P.skills;
    const legend = $('#legend', el);
    legend.innerHTML = '<button class="on" data-g="-1">全部</button>' + G.map((g, i) => `<button data-g="${i}">${g.name}<small>${g.items.length}</small></button>`).join('');
    $('#skillList', el).innerHTML = '<div class="cmd"><b>$</b> tree ./skills --depth=1</div>' + G.map((g) => `<div class="sk-group"><div class="dir">${g.dir}/<small>${g.name}</small></div><div class="tags">${g.items.map((s) => `<span>${s}</span>`).join('')}</div></div>`).join('');
    const win = $('#skillWin', el);
    win.addEventListener('hy:in', () => $$('.tags', win).forEach((t, gi) => {
      $$('span', t).forEach((s, si) => (s.style.transitionDelay = `${gi * 160 + si * 40}ms`));
      t.classList.add('in');
      setTimeout(() => $$('span', t).forEach((s) => (s.style.transitionDelay = '')), 2400);
    }));
    $$('.tags span', el).forEach((s) => s.addEventListener('mouseenter', () => scramble(s, null, 350)));

    const cv = $('#cons', el), tip = $('#consTip', el);
    let c, W = 0, H = 0, raf = 0, rot = 0, focus = -1, hover = -1;
    const m = { x: 0, y: 0, in: false };
    const nodes = [], idx = {};
    G.forEach((g, gi) => g.items.forEach((name) => { idx[name] = nodes.length; nodes.push({ name, g: gi, x: 0, y: 0, vx: 0, vy: 0, nb: new Set() }); }));
    const edges = P.skillLinks.map(([a, b]) => [idx[a], idx[b]]).filter(([a, b]) => a != null && b != null);
    edges.forEach(([a, b]) => { nodes[a].nb.add(b); nodes[b].nb.add(a); });
    let hubs = [];
    const placeHubs = () => {
      hubs = G.map((_, gi) => {
        const ang = rot - Math.PI / 2 + (gi * Math.PI * 2) / G.length;
        return { x: W / 2 + Math.cos(ang) * W * 0.32, y: H / 2 + Math.sin(ang) * H * 0.3 };
      });
    };
    const size = () => {
      const first = !W;
      [c, W, H] = setupCanvas(cv);
      placeHubs();
      if (first) nodes.forEach((n) => { n.x = hubs[n.g].x + rand(-60, 60); n.y = hubs[n.g].y + rand(-40, 40); });
    };
    const lit = (i) => {
      if (hover >= 0) return i === hover || nodes[hover].nb.has(i) || nodes[i].g === nodes[hover].g;
      if (focus >= 0) return nodes[i].g === focus;
      return true;
    };
    const step = () => {
      rot += 0.0006;
      placeHubs();
      const n = nodes.length;
      for (let i = 0; i < n; i++) {
        const a = nodes[i], h = hubs[a.g];
        a.vx += (h.x - a.x) * 0.004; a.vy += (h.y - a.y) * 0.004;
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, ex = dx / 2.2, d2 = ex * ex + dy * dy;
          if (d2 < 1600 && d2 > 0.01) { const d = Math.sqrt(d2), f = ((40 - d) / d) * 0.05; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; }
        }
        if (m.in) {
          const dx = a.x - m.x, dy = a.y - m.y, d2 = dx * dx + dy * dy;
          if (d2 < 9000 && d2 > 400) { const d = Math.sqrt(d2), f = ((9000 - d2) / 9000) * 0.8; a.vx += (dx / d) * f; a.vy += (dy / d) * f; }
        }
        a.vx *= 0.86; a.vy *= 0.86; a.x += a.vx; a.y += a.vy;
        a.x = Math.max(40, Math.min(W - 40, a.x)); a.y = Math.max(20, Math.min(H - 30, a.y));
      }
    };
    const draw = () => {
      c.clearRect(0, 0, W, H);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 38px "JetBrains Mono", monospace';
      G.forEach((g, gi) => { c.fillStyle = rgba(focus >= 0 && focus !== gi ? 0.02 : 0.07); c.fillText(g.en, hubs[gi].x, hubs[gi].y); });
      c.lineWidth = 1;
      nodes.forEach((n, i) => { c.strokeStyle = rgba(lit(i) ? 0.12 : 0.03); c.beginPath(); c.moveTo(hubs[n.g].x, hubs[n.g].y); c.lineTo(n.x, n.y); c.stroke(); });
      edges.forEach(([a, b]) => {
        const on = hover >= 0 && (a === hover || b === hover);
        c.strokeStyle = on ? rgba(0.95, true) : rgba(lit(a) && lit(b) ? 0.3 : 0.05);
        c.lineWidth = on ? 1.6 : 1;
        c.beginPath(); c.moveTo(nodes[a].x, nodes[a].y); c.lineTo(nodes[b].x, nodes[b].y); c.stroke();
      });
      c.font = '500 12.5px "Noto Sans SC", "PingFang SC", sans-serif';
      nodes.forEach((n, i) => {
        const L = lit(i), H0 = i === hover;
        c.globalAlpha = L ? 1 : 0.22;
        if (H0) { c.shadowColor = rgba(1); c.shadowBlur = 16; }
        c.fillStyle = H0 ? rgba(1, true) : rgba(0.95);
        c.beginPath(); c.arc(n.x, n.y, H0 ? 5 : 3, 0, Math.PI * 2); c.fill();
        c.shadowBlur = 0;
        c.fillStyle = H0 ? '#fff' : '#d8d0bf';
        c.fillText(n.name, n.x, n.y + 15);
      });
      c.globalAlpha = 1;
    };
    const loop = () => { raf = requestAnimationFrame(loop); step(); draw(); };
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      m.x = e.clientX - r.left; m.y = e.clientY - r.top; m.in = true;
      let best = -1, bd = 900;
      nodes.forEach((n, i) => { const d = (n.x - m.x) ** 2 + (n.y - m.y) ** 2; if (d < bd) { bd = d; best = i; } });
      hover = best;
      if (best >= 0) {
        const n = nodes[best], rel = [...n.nb].map((j) => nodes[j].name);
        tip.innerHTML = `<b>${esc(n.name)}</b> · ${esc(G[n.g].name)}${rel.length ? `<br>关联：${rel.map(esc).join('、')}` : ''}`;
        tip.style.left = Math.min(m.x + 16, W - 270) + 'px'; tip.style.top = (m.y + 16) + 'px'; tip.style.opacity = 1;
      } else tip.style.opacity = 0;
    });
    cv.addEventListener('pointerleave', () => { m.in = false; hover = -1; tip.style.opacity = 0; });
    const setFocus = (g) => { focus = g; $$('button', legend).forEach((b) => b.classList.toggle('on', +b.dataset.g === g)); };
    cv.addEventListener('click', () => { if (hover >= 0) setFocus(focus === nodes[hover].g ? -1 : nodes[hover].g); });
    legend.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFocus(+b.dataset.g); });
    addEventListener('resize', () => { if (raf) size(); });
    this.start = () => { size(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
    this.stop = () => { cancelAnimationFrame(raf); raf = 0; };
  },
  enter() { this.start(); },
  leave() { this.stop(); },
});

/* ================= EXPERIENCE (git graph) ================= */
HY.page('exp', {
  init(el) {
    const git = $('#git', el), svg = $('#gitSvg', el);
    const EDGES = [['main', 'robotics'], ['main', 'ecommerce'], ['robotics', 'init'], ['ecommerce', 'init']];
    this.draw = (animate) => {
      const gutter = svg.getBoundingClientRect().width || 90;
      const lanes = [gutter * 0.24, gutter * 0.64], pos = {};
      $$('.commit', git).forEach((cm) => {
        const lane = +cm.dataset.lane, d = $('.dot', cm);
        d.style.left = `${lanes[lane] - gutter - 7}px`;
        pos[cm.dataset.id] = { x: lanes[lane], y: cm.offsetTop + d.offsetTop + 7, lane };
      });
      svg.style.height = git.offsetHeight + 'px';
      svg.setAttribute('viewBox', `0 0 ${gutter} ${git.offsetHeight}`);
      svg.innerHTML = EDGES.map(([a, b]) => {
        const p = pos[a], q = pos[b];
        let d;
        if (p.x === q.x) d = `M${p.x} ${p.y} L${q.x} ${q.y}`;
        else if (q.x > p.x) d = `M${p.x} ${p.y} C${p.x} ${p.y + 50} ${q.x} ${p.y + 30} ${q.x} ${p.y + 80} L${q.x} ${q.y}`;
        else d = `M${p.x} ${p.y} L${p.x} ${q.y - 80} C${p.x} ${q.y - 30} ${q.x} ${q.y - 50} ${q.x} ${q.y}`;
        return `<path class="l${Math.max(p.lane, q.lane)}" d="${d}"/>`;
      }).join('');
      if (animate) $$('path', svg).forEach((p, i) => {
        const L = p.getTotalLength();
        p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset 1.6s ${0.2 + i * 0.25}s cubic-bezier(.6,0,.2,1)`;
        p.style.strokeDashoffset = 0;
      });
    };
    addEventListener('resize', () => { if (HY.current === 'exp') this.draw(false); });
    if (document.fonts) document.fonts.ready.then(() => { if (HY.current === 'exp') this.draw(false); });
  },
  enter() { this.draw(true); },
});

/* ================= PROJECT ================= */
HY.page('project', {
  init(el) {
    // pipeline stepper
    const steps = $$('#flowSteps > div', el);
    let si = 0;
    this.flowTimer = 0;
    this.flow = () => {
      clearInterval(this.flowTimer);
      si = 0;
      const tick = () => { steps.forEach((s, i) => { s.classList.toggle('on', i === si); s.classList.toggle('done', i < si); }); si = (si + 1) % (steps.length + 2); };
      tick();
      this.flowTimer = setInterval(tick, 1100);
    };

    // real commit messages from tiktok-ai-ops
    const COMMITS = [
      ['2290460', 'fix', '插件以图搜自动点弹出框里的「搜索」；防风控：随机放慢节奏'],
      ['58d9a45', 'feat', '插件自动找货——1688 关键词搜 / 以图搜，依次补详情'],
      ['2652c0d', 'fix', '插件压缩包禁止缓存（Cloudflare 默认缓存 .zip 4 小时）'],
      ['3f65696', 'fix', '浏览器插件加图标、发货地取到省市；真实加载插件的端到端测试'],
      ['f76bcea', 'feat', '自动上品——1688 找货、AI 上架包与推送 ERP、多 Agent 流水线'],
      ['396c57a', 'fix', 'AI 批量研判适配会思考的模型；失败批次拆半重试'],
      ['f7e879a', 'feat', '选品重做——识别 FastMoss 22 列，六维评估与 AI 选品报告'],
      ['56648e3', 'fix', '部署前自动备份数据，首次部署创建管理员'],
      ['c9ec6ee', 'feat', '账号体系与数据隔离；开场动画、光束、透视网格'],
      ['5f5786d', 'fix', '上游错误改用 424 以穿过 Cloudflare'],
      ['b3d8be8', 'fix', '静态资源按版本号加路径前缀，部署后不再白屏'],
      ['245bb58', 'feat', '一键部署脚本（systemd + Cloudflare 隧道）、仅本机监听'],
      ['4fc85e1', 'feat', '5 种可切换界面风格（纸墨/波普/杂志/终端/奶油）'],
      ['f173e01', 'feat', '前端界面、Windows 启动脚本与 Playwright 端到端测试'],
      ['368d0b4', 'feat', '后端服务 - 选品/脚本/文生图/RAG/智能体/工作流 API'],
    ];
    const rows = COMMITS.map(([h, t, m]) => `<div><span class="h">${h}</span><span class="ty">${t}:</span>${m}</div>`).join('');
    $('#ticker', el).innerHTML = `<div class="track"><div>${rows}</div><div>${rows}</div></div>`;

    // agent simulation
    const out = $('#simOut', el), btn = $('#simRun', el), brief = $('#brief', el);
    let running = false;
    const run = async () => {
      if (running) return;
      running = true; btn.disabled = true; out.innerHTML = ''; brief.classList.remove('show');
      for (const [tag, text, ms] of P.sim) {
        if (HY.current !== 'project') { running = false; btn.disabled = false; return; }
        const line = document.createElement('div');
        line.innerHTML = `<span class="tg">[${tag}]</span> `;
        const span = document.createElement('span'), cur = document.createElement('span');
        cur.className = 'cursor';
        line.append(span, cur); out.appendChild(line);
        for (let i = 0; i < text.length; i += 2) { span.textContent = text.slice(0, i + 2); await sleep(10); }
        cur.remove();
        if (ms) line.insertAdjacentHTML('beforeend', ` <span class="ok">✓ ${ms}ms</span>`);
        out.scrollTop = out.scrollHeight;
        await sleep(rand(140, 320));
      }
      brief.innerHTML = `<div class="bh"><b>每日运营简报</b><span>DEMO · ${new Date().toLocaleDateString('zh-CN')}</span></div>` +
        P.brief.map((b) => `<div class="row"><span class="lv ${b.lv}">${b.tag}</span><b>${b.t}</b><span>${b.d}</span></div>`).join('');
      brief.classList.add('show');
      $$('.row', brief).forEach((r, i) => setTimeout(() => r.classList.add('in'), 100 + i * 140));
      HY.surge = 0.5;
      btn.textContent = '↻ 再运行一次'; btn.disabled = false; running = false;
    };
    btn.addEventListener('click', run);
    this.run = run;
  },
  enter() {
    this.flow();
    if (!this.ran) { this.ran = true; setTimeout(this.run, 1200); }
  },
  leave() { clearInterval(this.flowTimer); },
});

/* ================= ROBOT ================= */
function ik2(sx, sy, tx, ty, l1, l2, sign) {
  const dx = tx - sx, dy = ty - sy, d0 = Math.hypot(dx, dy);
  const reach = d0 <= l1 + l2 && d0 >= Math.abs(l1 - l2);
  const d = Math.min(Math.max(d0, Math.abs(l1 - l2) + 0.001), l1 + l2 - 0.001);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ex = sx + Math.cos(a + sign * b) * l1, ey = sy + Math.sin(a + sign * b) * l1;
  const wa = Math.atan2(ty - ey, tx - ex);
  return { ex, ey, wx: ex + Math.cos(wa) * l2, wy: ey + Math.sin(wa) * l2, reach };
}
HY.ik2 = ik2;
HY.page('robot', {
  init(el) {
    const lb = $('#lightbox', el);
    $$('.photos figure', el).forEach((f) => f.addEventListener('click', () => { $('img', lb).src = $('img', f).src; $('span', lb).textContent = $('figcaption', f).textContent; lb.hidden = false; }));
    lb.addEventListener('click', () => (lb.hidden = true));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true; });
    const chips = $$('#pipe span', el), PH = 1700;
    let phase = 0, phaseT = 0, lastT = 0, raf = 0;

    // point cloud: box (t=1), floor (t=0), outliers (t=2)
    const pts = [];
    const faces = [[1.2 * 0.8, 'x'], [1.2 * 0.8, 'y'], [0.8 * 0.8, 'z']];
    const tot = faces.reduce((s, f) => s + f[0], 0);
    for (let k = 0; k < 780; k++) {
      let r = Math.random() * tot, f = 0;
      while (r > faces[f][0]) { r -= faces[f][0]; f++; }
      const s = Math.random() < 0.5 ? -1 : 1, u = Math.random(), v = Math.random();
      let p;
      if (f === 0) p = { x: -0.6 + u * 1.2, y: s > 0 ? 0.8 : 0.001, z: -0.4 + v * 0.8 };
      else if (f === 1) p = { x: -0.6 + u * 1.2, y: v * 0.8, z: 0.4 * s };
      else p = { x: 0.6 * s, y: u * 0.8, z: -0.4 + v * 0.8 };
      pts.push({ ...p, t: 1, r: Math.random() });
    }
    for (let k = 0; k < 560; k++) { const x = rand(-2, 2), z = rand(-1.4, 1.4); if (Math.abs(x) < 0.65 && Math.abs(z) < 0.45) continue; pts.push({ x, y: rand(-0.01, 0.01), z, t: 0, r: 0 }); }
    for (let k = 0; k < 70; k++) pts.push({ x: rand(-1.8, 1.8), y: rand(0.05, 1.4), z: rand(-1.2, 1.2), t: 2, r: 0, fade: 1 });
    const nBox = pts.filter((p) => p.t === 1).length, nOut = pts.filter((p) => p.t === 2).length;
    const stat = $('#cloudStat', el);

    const cv1 = $('#cloud', el), cv2 = $('#arms', el), warn = $('#ikWarn', el);
    let c1, W1, H1, c2, W2, H2, yaw = 0.6, pitch = 0.42, drag = null;
    const target = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
    let manual = false;
    const trails = [[], []];
    const size = () => { [c1, W1, H1] = setupCanvas(cv1); [c2, W2, H2] = setupCanvas(cv2); target.x = goal.x = W2 / 2; target.y = goal.y = H2 * 0.74; };

    cv1.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; cv1.setPointerCapture(e.pointerId); });
    cv1.addEventListener('pointermove', (e) => { if (!drag) return; yaw += (e.clientX - drag.x) * 0.01; pitch = Math.max(0.05, Math.min(1.2, pitch + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY }; });
    cv1.addEventListener('pointerup', () => (drag = null));
    cv1.addEventListener('pointercancel', () => (drag = null));
    cv2.addEventListener('pointermove', (e) => { const r = cv2.getBoundingClientRect(); manual = true; goal.x = Math.max(20, Math.min(W2 - 20, e.clientX - r.left)); goal.y = Math.max(20, Math.min(H2 - 20, e.clientY - r.top)); });
    cv2.addEventListener('pointerleave', () => (manual = false));

    const drawCloud = (t) => {
      if (!drag) yaw += 0.0035;
      c1.clearRect(0, 0, W1, H1);
      const cx = W1 / 2, cy = H1 * 0.56, F = Math.min(W1, H1 * 1.33) * 1.25, D = 4.2;
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const proj = (x, y, z) => {
        y -= 0.4;
        const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        const y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp, s = F / (D + z2);
        return [cx + x1 * s, cy - y2 * s, s];
      };
      const segK = phase === 1 ? phaseT / PH : phase > 1 ? 1 : 0;
      for (const p of pts) {
        let a, hi = false;
        if (p.t === 2) { p.fade = phase >= 2 ? Math.max(0, p.fade - 0.04) : 1; if (p.fade <= 0) continue; a = 0.55 * p.fade; }
        else if (p.t === 1) { hi = p.r < segK; a = hi ? 0.95 : 0.5; }
        else a = segK > 0 ? 0.16 : 0.38;
        const [sx, sy, s] = proj(p.x, p.y, p.z), sz = Math.max(1, s * 0.012);
        c1.fillStyle = p.t === 2 && phase >= 1 ? `rgba(255,107,107,${a})` : rgba(a, hi);
        c1.fillRect(sx, sy, sz, sz);
      }
      if (phase >= 3) {
        const C = [[-0.6, 0, -0.4], [0.6, 0, -0.4], [0.6, 0, 0.4], [-0.6, 0, 0.4], [-0.6, 0.8, -0.4], [0.6, 0.8, -0.4], [0.6, 0.8, 0.4], [-0.6, 0.8, 0.4]].map((q) => proj(...q));
        c1.strokeStyle = rgba(0.9); c1.lineWidth = 1;
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { c1.beginPath(); c1.moveTo(C[a][0], C[a][1]); c1.lineTo(C[b][0], C[b][1]); c1.stroke(); });
        const o = proj(0, 0.4, 0);
        [[[0.95, 0.4, 0], '#ff6b6b', 'X'], [[0, 1.05, 0], '#7ee787', 'Y'], [[0, 0.4, 0.75], '#58a6ff', 'Z']].forEach(([q, col, lb]) => {
          const e = proj(...q);
          c1.strokeStyle = col; c1.lineWidth = 2; c1.beginPath(); c1.moveTo(o[0], o[1]); c1.lineTo(e[0], e[1]); c1.stroke();
          c1.fillStyle = col; c1.font = '10px "JetBrains Mono", monospace'; c1.fillText(lb, e[0] + 4, e[1] - 4);
        });
      }
      if (phase >= 4) {
        [[-0.6, 'GRASP·L'], [0.6, 'GRASP·R']].forEach(([x, lb]) => {
          const [gx, gy] = proj(x, 0.4, 0), r = 8 + 3 * Math.sin(t / 200);
          c1.strokeStyle = rgba(1, true); c1.lineWidth = 1.4;
          c1.beginPath(); c1.arc(gx, gy, r, 0, Math.PI * 2); c1.stroke();
          c1.beginPath(); c1.moveTo(gx - r - 6, gy); c1.lineTo(gx + r + 6, gy); c1.moveTo(gx, gy - r - 6); c1.lineTo(gx, gy + r + 6); c1.stroke();
          c1.fillStyle = rgba(1, true); c1.font = '10px "JetBrains Mono", monospace'; c1.fillText(lb, gx + r + 4, gy - r - 2);
        });
      }
    };

    const drawArms = (t) => {
      c2.clearRect(0, 0, W2, H2);
      const S = Math.min(W2, H2 * 1.3);
      if (!manual) { const k = t / 1000; goal.x = W2 / 2 + Math.sin(k * 0.7) * S * 0.22; goal.y = H2 * 0.74 + Math.sin(k * 1.1) * S * 0.07; }
      target.x += (goal.x - target.x) * 0.12; target.y += (goal.y - target.y) * 0.12;
      const tx = W2 / 2, ty = H2 * 0.28;
      const shL = { x: tx - S * 0.1, y: ty + S * 0.02 }, shR = { x: tx + S * 0.1, y: ty + S * 0.02 };
      const l1 = S * 0.2, l2 = S * 0.18, hand = S * 0.05, bw = S * 0.2, bh = S * 0.13;
      const L = ik2(shL.x, shL.y, target.x - bw / 2 - hand, target.y, l1, l2, 1);
      const R = ik2(shR.x, shR.y, target.x + bw / 2 + hand, target.y, l1, l2, -1);
      const ok = L.reach && R.reach;
      warn.classList.toggle('on', !ok);

      c2.setLineDash([3, 5]); c2.strokeStyle = rgba(0.12); c2.lineWidth = 1;
      [shL, shR].forEach((s) => { c2.beginPath(); c2.arc(s.x, s.y, l1 + l2, 0, Math.PI * 2); c2.stroke(); });
      c2.setLineDash([]);
      c2.strokeStyle = rgba(0.25); c2.beginPath(); c2.moveTo(0, H2 * 0.9); c2.lineTo(W2, H2 * 0.9); c2.stroke();
      for (let x = (t / 40) % 30; x < W2; x += 30) { c2.beginPath(); c2.moveTo(x, H2 * 0.9); c2.lineTo(x - 10, H2 * 0.94); c2.stroke(); }

      // torso + head
      c2.fillStyle = '#0d0c0a'; c2.strokeStyle = rgba(0.6); c2.lineWidth = 1.4;
      c2.beginPath(); c2.roundRect ? c2.roundRect(tx - S * 0.12, ty - S * 0.02, S * 0.24, S * 0.2, 8) : c2.rect(tx - S * 0.12, ty - S * 0.02, S * 0.24, S * 0.2); c2.fill(); c2.stroke();
      c2.beginPath(); c2.arc(tx, ty - S * 0.09, S * 0.055, 0, Math.PI * 2); c2.fill(); c2.stroke();
      c2.fillStyle = rgba(0.6 + 0.4 * Math.sin(t / 300), true); c2.fillRect(tx - S * 0.035, ty - S * 0.1, S * 0.07, S * 0.012);

      // box
      c2.fillStyle = ok ? rgba(0.16) : 'rgba(255,107,107,.1)';
      c2.strokeStyle = ok ? rgba(1) : '#ff6b6b'; c2.lineWidth = 1.4;
      c2.fillRect(target.x - bw / 2, target.y - bh / 2, bw, bh); c2.strokeRect(target.x - bw / 2, target.y - bh / 2, bw, bh);
      c2.beginPath(); c2.moveTo(target.x - bw / 2, target.y - bh / 2); c2.lineTo(target.x + bw / 2, target.y + bh / 2); c2.moveTo(target.x + bw / 2, target.y - bh / 2); c2.lineTo(target.x - bw / 2, target.y + bh / 2); c2.strokeStyle = rgba(0.25); c2.stroke();
      c2.fillStyle = rgba(0.9); c2.font = '10px "JetBrains Mono", monospace'; c2.textAlign = 'center';
      c2.fillText(`TARGET (${((target.x - tx) / S).toFixed(2)}, ${((H2 * 0.74 - target.y) / S).toFixed(2)})`, target.x, target.y - bh / 2 - 8);
      c2.textAlign = 'left';

      // arms
      [[shL, L, 1, 0], [shR, R, -1, 1]].forEach(([s, A, dir, k]) => {
        const tr = trails[k]; tr.push([A.wx + dir * hand, A.wy]); if (tr.length > 26) tr.shift();
        tr.forEach(([x, y], i) => { c2.fillStyle = rgba((i / tr.length) * 0.35, true); c2.fillRect(x - 1.5, y - 1.5, 3, 3); });
        c2.strokeStyle = rgba(0.95); c2.lineWidth = S * 0.028; c2.lineCap = 'round';
        c2.beginPath(); c2.moveTo(s.x, s.y); c2.lineTo(A.ex, A.ey); c2.lineTo(A.wx, A.wy); c2.lineTo(A.wx + dir * hand, A.wy); c2.stroke();
        const hx = A.wx + dir * hand, open = A.reach ? 0.15 : 0.6;
        c2.lineWidth = S * 0.012;
        c2.beginPath(); c2.moveTo(hx, A.wy); c2.lineTo(hx + dir * hand * 0.7, A.wy - hand * open - S * 0.02); c2.moveTo(hx, A.wy); c2.lineTo(hx + dir * hand * 0.7, A.wy + hand * open + S * 0.02); c2.stroke();
        c2.lineCap = 'butt';
        [[s.x, s.y], [A.ex, A.ey], [A.wx, A.wy]].forEach(([x, y]) => { c2.fillStyle = '#0d0c0a'; c2.strokeStyle = rgba(1, true); c2.lineWidth = 1.5; c2.beginPath(); c2.arc(x, y, S * 0.018, 0, Math.PI * 2); c2.fill(); c2.stroke(); });
      });
    };

    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      const dt = lastT ? Math.min(100, t - lastT) : 16; lastT = t;
      phaseT += dt;
      if (phaseT > PH) {
        phaseT = 0; phase = (phase + 1) % chips.length;
        if (phase === 0) pts.forEach((p) => { if (p.t === 2) p.fade = 1; });
        chips.forEach((ch, i) => { ch.classList.toggle('on', i === phase); ch.classList.toggle('done', i < phase); });
        stat.innerHTML = `points ${pts.length}<br>inliers ${phase >= 1 ? nBox : '—'} · outliers ${phase >= 2 ? nOut : '—'}`;
      }
      drawCloud(t); drawArms(t);
    };
    addEventListener('resize', () => { if (raf) size(); });
    this.start = () => {
      size(); cancelAnimationFrame(raf); lastT = 0; phase = 0; phaseT = 0;
      chips.forEach((ch, i) => { ch.classList.toggle('on', i === 0); ch.classList.remove('done'); });
      stat.innerHTML = `points ${pts.length}<br>inliers — · outliers —`;
      raf = requestAnimationFrame(loop);
    };
    this.stop = () => { cancelAnimationFrame(raf); raf = 0; };
  },
  enter() { this.start(); },
  leave() { this.stop(); },
});

/* ================= LIFE (badminton) ================= */
HY.page('life', {
  init(el) {
    const cv = $('#court', el), rallyEl = $('#rally', el);
    let c, W, H, raf = 0, rally = 0, flash = 0;
    // shuttle flies between the two halves along a parabola in "court space" (u: 0 near → 1 far, v: -1..1 sideways)
    let shot = null;
    const trail = [];
    const toScreen = (u, v, h) => {
      const near = H * 0.92, far = H * 0.2, y = near + (far - near) * u;
      const half = W * (0.42 - 0.22 * u);
      return [W / 2 + v * half, y - h * H * (0.9 - 0.4 * u), 1 - 0.5 * u];
    };
    const newShot = (fromU, smash, aim) => {
      const toU = fromU < 0.5 ? rand(0.7, 0.95) : rand(0.05, 0.3);
      shot = { u0: fromU, v0: shot ? shot.v1 : 0, u1: toU, v1: aim ?? rand(-0.8, 0.8), t: 0, dur: smash ? 0.45 : rand(1.1, 1.5), peak: smash ? 0.08 : rand(0.35, 0.55), smash };
    };
    newShot(0.1, false);
    const size = () => { [c, W, H] = setupCanvas(cv); };
    cv.addEventListener('pointerdown', (e) => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / W, y = (e.clientY - r.top) / H;
      newShot(y > 0.55 ? 0.05 : 0.95, true, Math.max(-0.9, Math.min(0.9, (x - 0.5) * 2.2)));
      flash = 1; HY.surge = 0.5; HY.sound.blip(520, 0.12, 0.05);
    });
    const draw = () => {
      raf = requestAnimationFrame(draw);
      c.clearRect(0, 0, W, H);
      // court lines
      c.strokeStyle = rgba(0.45); c.lineWidth = 1.2;
      const line = (u0, v0, u1, v1) => { const a = toScreen(u0, v0, 0), b = toScreen(u1, v1, 0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); };
      line(0, -1, 1, -1); line(0, 1, 1, 1); line(0, -0.86, 1, -0.86); line(0, 0.86, 1, 0.86);
      [0, 0.06, 0.35, 0.65, 0.94, 1].forEach((u) => line(u, -1, u, 1));
      line(0, 0, 0.35, 0); line(0.65, 0, 1, 0);
      // net
      const nl = toScreen(0.5, -1.05, 0), nr = toScreen(0.5, 1.05, 0), nh = H * 0.13;
      c.fillStyle = rgba(0.07); c.fillRect(nl[0], nl[1] - nh, nr[0] - nl[0], nh);
      c.strokeStyle = rgba(0.25); c.lineWidth = 1;
      for (let x = nl[0]; x < nr[0]; x += 8) { c.beginPath(); c.moveTo(x, nl[1] - nh); c.lineTo(x, nl[1]); c.stroke(); }
      for (let y = nl[1] - nh; y < nl[1]; y += 8) { c.beginPath(); c.moveTo(nl[0], y); c.lineTo(nr[0], y); c.stroke(); }
      c.strokeStyle = rgba(1); c.lineWidth = 2; c.beginPath(); c.moveTo(nl[0], nl[1] - nh); c.lineTo(nr[0], nl[1] - nh); c.stroke();
      // shuttle
      shot.t += 1 / 60 / shot.dur;
      if (shot.t >= 1) { rally++; rallyEl.textContent = `RALLY ${rally}`; newShot(shot.u1, false); }
      const k = shot.t, u = shot.u0 + (shot.u1 - shot.u0) * k, v = shot.v0 + (shot.v1 - shot.v0) * k;
      const h = shot.smash ? (1 - k) * 0.5 + 0.02 : 4 * shot.peak * k * (1 - k) + 0.05;
      const [sx, sy, sc] = toScreen(u, v, h), [gx, gy] = toScreen(u, v, 0);
      trail.push([sx, sy]); if (trail.length > (shot.smash ? 18 : 10)) trail.shift();
      c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(gx, gy, 9 * sc, 3 * sc, 0, 0, Math.PI * 2); c.fill();
      trail.forEach(([x, y], i) => { c.fillStyle = rgba((i / trail.length) * (shot.smash ? 0.8 : 0.4), true); c.beginPath(); c.arc(x, y, 2.5 * sc, 0, Math.PI * 2); c.fill(); });
      c.save(); c.translate(sx, sy); c.rotate(Math.atan2((trail[trail.length - 1][1] - trail[0][1]), (trail[trail.length - 1][0] - trail[0][0]) || 0.001) + Math.PI);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 4 * sc, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1;
      c.beginPath(); for (let a = -0.5; a <= 0.5; a += 0.25) { c.moveTo(0, 0); c.lineTo(Math.cos(a) * 16 * sc, Math.sin(a) * 16 * sc); } c.stroke();
      c.restore();
      if (flash > 0) {
        c.fillStyle = rgba(flash, true); c.font = `900 ${Math.round(W * 0.07)}px "JetBrains Mono", monospace`; c.textAlign = 'center';
        c.fillText('SMASH!', W / 2, H * 0.12 + (1 - flash) * 20); c.textAlign = 'left';
        flash = Math.max(0, flash - 0.025);
      }
    };
    addEventListener('resize', () => { if (raf) size(); });
    this.start = () => { size(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    this.stop = () => { cancelAnimationFrame(raf); raf = 0; };
  },
  enter() { this.start(); },
  leave() { this.stop(); },
});

/* ================= LIBRARY ================= */
HY.page('lib', {
  init(el) {
    const grid = $('#libGrid', el), filter = $('#libFilter', el), search = $('#libSearch', el);
    const cats = ['全部', ...new Set(P.library.map((x) => x.cat))];
    let cat = '全部';
    filter.innerHTML = cats.map((c) => `<button class="${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
    const render = () => {
      const q = search.value.trim().toLowerCase();
      const list = P.library.filter((x) => (cat === '全部' || x.cat === cat) && (!q || `${x.t} ${x.src} ${x.note} ${x.cat}`.toLowerCase().includes(q)));
      grid.innerHTML = list.length ? list.map((x, i) => {
        const tag = x.url ? `a href="${x.url}" target="_blank" rel="noopener"` : 'div';
        return `<${tag} class="lib-card" style="animation-delay:${i * 50}ms"><div class="top"><span class="cat">${x.cat}</span><span class="no">#${String(P.library.indexOf(x) + 1).padStart(2, '0')}</span></div><b>${x.t}</b><span class="src">${x.src}</span><p>${x.note}</p><span class="lnk${x.url ? '' : ' none'}">${x.url ? '打开 ↗' : '收藏夹里 · 搜索标题即可找到'}</span></${x.url ? 'a' : 'div'}>`;
      }).join('') : '<div class="lib-empty">没有找到匹配的资料</div>';
    };
    filter.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; $$('button', filter).forEach((x) => x.classList.toggle('on', x === b)); render(); });
    search.addEventListener('input', render);
    render();

    const notes = $('#notes', el);
    notes.innerHTML = P.notes.map((n) => `<div class="fnote"><button><span class="tg">#${n.tag}</span><span class="tt">${n.t}</span><span class="pm">+</span></button><div class="bd"><div><p>${n.d}</p></div></div></div>`).join('');
    notes.addEventListener('click', (e) => { const b = e.target.closest('.fnote > button'); if (b) b.parentElement.classList.toggle('open'); });
  },
});

/* ================= AI TWIN ================= */
HY.page('ask', {
  init(el) {
    const msgs = $('#msgs', el), chips = $('#chips', el), form = $('#chatForm', el), input = $('#chatIn', el), trace = $('#trace', el);
    HY.avatar.then((im) => { if (im) $('#askAvatar', el).src = im.src; });
    chips.innerHTML = P.suggest.map((q) => `<button type="button">${esc(q)}</button>`).join('');
    let busy = false;
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; if (html) d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
    const tr = (html) => { const d = document.createElement('div'); d.innerHTML = html; trace.appendChild(d); trace.scrollTop = trace.scrollHeight; };
    const stream = async (node, html) => {
      let out = '';
      for (const part of html.split(/(<[^>]+>)/)) {
        if (!part) continue;
        if (part[0] === '<') { out += part; node.innerHTML = out; continue; }
        for (const ch of part) { out += ch; node.innerHTML = out; msgs.scrollTop = msgs.scrollHeight; await sleep(ch === '\n' ? 70 : 15); }
      }
    };
    const match = (q) => {
      const s = q.toLowerCase().replace(/\s+/g, '');
      let hit = null, best = 0, keys = [];
      for (const e of P.kb) {
        const ks = e.k.filter((k) => s.includes(k.toLowerCase().replace(/\s+/g, '')));
        const sc = ks.reduce((a, k) => a + k.length, 0);
        if (sc > best) { best = sc; hit = e; keys = ks; }
      }
      return { hit, keys };
    };
    HY.twinMatch = match;
    // 后端在线时用真实大模型；直接双击打开 index.html（file://）或后端未接入时，用本地知识库
    let llm = null;
    const history = [];
    const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(#\/(?:about|skills|exp|project|robot|life|lib|ask|terminal|contact))/g, '<a href="$1">$1</a>');
    const status = $('.chat-head small', el);
    this.ready = (location.protocol.startsWith('http') ? fetch('api/twin/status', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null)).then((s) => {
      llm = s && s.online ? s : null;
      status.textContent = llm ? `● online · ${llm.provider} · ${llm.model}` : '● online · 本地知识库';
      if (location.protocol === 'file:') {
        status.innerHTML = '● 本地知识库 · <span style="color:#ffb347">直接打开的文件没有连接大模型，请运行 start.bat 后访问 http://localhost:5200/#/ask</span>';
        tr('<span class="s">⚠ 文件模式</span> 未连接 server.js，只能按关键词回答');
      } else if (!llm) tr('<span class="s">⚠ 未接入大模型</span> 请在 admin.html 启用一个供应商');
    });
    const askLLM = async (q, node) => {
      history.push({ role: 'user', content: q });
      const res = await fetch('api/twin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = '', text = '', first = true;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 2);
          if (!line.startsWith('data:')) continue;
          const ev = JSON.parse(line.slice(5));
          if (ev.type === 'meta') tr(`<span class="s">├ model</span> ${esc(ev.provider)} · ${esc(ev.model)}`);
          if (ev.type === 'delta') {
            if (first) { first = false; tr('<span class="s">├ generate</span> streaming…'); }
            text += ev.text; node.innerHTML = md(text); msgs.scrollTop = msgs.scrollHeight;
          }
          if (ev.type === 'error') throw new Error(ev.error);
        }
      }
      history.push({ role: 'assistant', content: text });
      return text.length;
    };
    const ask = async (q) => {
      q = q.trim();
      if (!q) return;
      while (busy) await sleep(120);
      busy = true;
      await this.ready;
      add('me').textContent = q;
      const t0 = performance.now();
      if (trace.children.length) trace.appendChild(document.createElement('hr'));
      tr(`<span class="s">┌ query</span> <span class="q">${esc(q)}</span>`);
      const typing = add('bot typing', '<i></i><i></i><i></i>');
      if (llm) {
        tr('<span class="s">├ context</span> profile.js + 对话历史');
        const node = add('bot');
        node.style.display = 'none';
        try {
          const firstChunk = new MutationObserver(() => { typing.remove(); node.style.display = ''; firstChunk.disconnect(); });
          firstChunk.observe(node, { childList: true, characterData: true, subtree: true });
          const n = await askLLM(q, node);
          typing.remove(); node.style.display = '';
          tr(`<span class="s">└ done</span> <span class="ok">${Math.round(performance.now() - t0)}ms · ${n} 字</span>`);
          busy = false;
          return;
        } catch (err) {
          history.pop();
          node.remove();
          tr(`<span class="s">├ error</span> <span class="err">${esc(err.message)}</span>`);
          tr('<span class="s">├ fallback</span> 本地知识库');
        }
      }
      await sleep(320);
      const { hit, keys } = match(q);
      tr(`<span class="s">├ intent</span> ${hit ? hit.id : 'fallback'}${keys.length ? ` <span class="m">[${keys.map(esc).join(', ')}]</span>` : ''}`);
      await sleep(260);
      tr(`<span class="s">├ retrieve</span> ${hit ? `kb/${hit.id}.md` : '—'}`);
      await sleep(220);
      typing.remove();
      tr('<span class="s">├ generate</span> streaming…');
      await stream(add('bot'), hit ? hit.a : P.kbFallback);
      tr(`<span class="s">└ done</span> <span class="ok">${Math.round(performance.now() - t0)}ms</span>`);
      busy = false;
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
    chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) ask(b.textContent); });
    this.greet = async () => {
      busy = true;
      await this.ready;
      tr(llm ? `<span class="s">● agent online</span> ${esc(llm.provider)} · ${esc(llm.model)}` : `<span class="s">● agent online</span> 本地知识库 · ${P.kb.length} 条`);
      await stream(add('bot'), llm ? P.kbGreetingLLM : P.kbGreeting);
      busy = false;
    };
  },
  enter() { if (!this.greeted) { this.greeted = true; setTimeout(this.greet, 500); } },
});

/* ================= TERMINAL ================= */
HY.page('terminal', {
  init(el) {
    const term = $('#term', el);
    const PS = '<span class="ps">guest@<b>huangyifeng</b>:~$</span>';
    const inputRow = document.createElement('div');
    inputRow.className = 'row';
    inputRow.innerHTML = PS + '<input id="tin" autocomplete="off" spellcheck="false" aria-label="终端输入">';
    term.appendChild(inputRow);
    const tin = $('#tin', el);
    const print = (html, cls = '') => { const d = document.createElement('div'); d.className = 'out ' + cls; d.innerHTML = html; term.insertBefore(d, inputRow); term.scrollTop = term.scrollHeight; };
    const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
    const ALIAS = { '~': 'home', home: 'home', about: 'about', skills: 'skills', exp: 'exp', experience: 'exp', project: 'project', projects: 'project', robot: 'robot', robotics: 'robot', life: 'life', lib: 'lib', library: 'lib', ask: 'ask', ai: 'ask', twin: 'ask', 'ai-twin': 'ask', contact: 'contact', shell: 'terminal', terminal: 'terminal' };
    const ART = ['██╗  ██╗██╗   ██╗', '██║  ██║╚██╗ ██╔╝', '███████║ ╚████╔╝ ', '██╔══██║  ╚██╔╝  ', '██║  ██║   ██║   ', '╚═╝  ╚═╝   ╚═╝   '];
    const C = {
      help: () => print(`<span class="g">可用命令</span>
  <span class="g">neofetch</span>        系统信息
  <span class="g">whoami</span>          我是谁
  <span class="g">ls</span> / <span class="g">cd</span> &lt;dir&gt;     列出 / 进入页面（cd robot、cd lib …）
  <span class="g">skills</span>          技术栈
  <span class="g">exp</span>             经历
  <span class="g">project</span>         项目
  <span class="g">hobby</span>           爱好
  <span class="g">contact</span>         联系方式
  <span class="g">theme</span> [name]    配色：gold / green / cyan
  <span class="g">music</span>           开关背景音乐
  <span class="g">hack</span>  <span class="g">matrix</span>  <span class="g">date</span>  <span class="g">history</span>  <span class="g">clear</span>`),
      neofetch: () => {
        const info = [
          '<span class="g">guest</span>@<span class="g">huangyifeng</span>', '----------------------------',
          '<span class="g">OS</span>      HYF-OS 2.6 · Agent Edition', '<span class="g">Host</span>    黄奕锋 · 深圳',
          '<span class="g">Kernel</span>  LangGraph + MCP + RAG', '<span class="g">Shell</span>   Python · FastAPI · Node.js',
          '<span class="g">Robot</span>   Unitree G1 · 双臂 7-DoF', '<span class="g">Shop</span>    TikTokShop US · GMV ×2.4',
          '<span class="g">Live</span>    tkagent.hyff.cc.cd', '<span class="g">Hobby</span>   🏸 羽毛球 · 🎸 Beyond',
          '<span class="g">Status</span>  <span class="ok">● building</span>', '',
          ['#ff5f56', '#ffbd2e', '#27c93f', 'var(--c)', '#58a6ff', '#c792ea'].map((col) => `<span style="color:${col}">███</span>`).join(''),
        ];
        print(`<div class="neo"><pre class="art">${ART.join('\n')}</pre><div class="info">${info.join('\n')}</div></div>`, 'pre');
      },
      whoami: () => print(`<span class="g">黄奕锋 / HUANG YIFENG</span>\nAI Agent 开发者 · 深圳 · 羽毛球 · 跨境电商\n<span class="m"># 把复杂业务拆成 感知 → 决策 → 执行 → 复盘 的智能体工作流</span>`),
      ls: () => print(HY.ROUTES.slice(1).map((r) => `<span class="g">${r.path.slice(2)}/</span>`).join('  ')),
      cd: (a) => {
        const id = ALIAS[(a[0] || '~').replace(/^~?\/?/, '').replace(/\/$/, '') || '~'];
        if (!id) return print(`<span class="err">cd: no such directory: ${esc(a[0])}</span>`);
        print(`<span class="m">→ ${HY.byId[id].path}</span>`); setTimeout(() => HY.go(id), 300);
      },
      skills: () => print(P.skills.map((g) => `<span class="g">${(g.dir + '/').padEnd(13)}</span>${g.items.join(' · ')}`).join('\n')),
      exp: () => print(`<span class="g">2026.07-09</span>  无界智慧（珠海）· AI Agent 应用开发实习生 / 规控算法\n            → RGB-D + SAM3 视觉抓取链路 · 双臂 7-DoF IK · Unitree G1 真机验证\n<span class="g">2025.04-07</span>  锦鸿云商（深圳）· 跨境电商运营实习生 / TikTokShop 美区\n            → 月 GMV $5K → $12K · 达人 300+ · 转化率 1.0% → 1.6%`),
      project: () => print(`<span class="g">TikTok 跨境电商运营台</span>  <span class="m">[live] tkagent.hyff.cc.cd</span>\n  ├─ 选品 → AI 研判 → 1688 找货 → 上架包 → 推送 ERP（多 Agent 流水线）\n  └─ 浏览器插件 · 知识库 · Agent · 多模型 · Playwright · Cloudflare 隧道\n<span class="g">跨境电商 AI 运营 Agent 平台</span>  <span class="m">[FastAPI + LangGraph + DeepSeek]</span>\n  └─ 风险 / 竞品 / 销售 / 广告 / 库存 · 每日简报`),
      hobby: () => print('🏸 羽毛球 · 5 年\n🎸 偶像：黄家驹（Beyond）、鲁大魔（抖音创作者 · 创业感悟）\n💡 兴趣：跨境电商 × AI Agent\n<span class="m">→ cd life</span>'),
      contact: () => print(`TEL  <span class="g">${P.phone}</span>（微信同号）\nMAIL <span class="g">${P.email}</span>\nGIT  <span class="g">github.com/serjofolio</span>\nLOC  深圳`),
      theme: (a) => { if (!a[0]) return print(`当前：<span class="g">${HY.theme}</span>  可选：${Object.keys(HY.THEMES).join(' / ')}`); if (!HY.THEMES[a[0]]) return print(`<span class="err">unknown theme: ${esc(a[0])}</span>`); HY.setTheme(a[0]); HY.surge = 0.6; print(`<span class="ok">✔ theme → ${esc(a[0])}</span>`); },
      music: async () => { const on = await HY.sound.toggle(); print(on ? '<span class="ok">♪ 背景音乐已开启</span> <span class="m">（浏览器实时合成）</span>' : '<span class="m">♪ 背景音乐已关闭</span>'); },
      sudo: () => print('<span class="err">guest is not in the sudoers file. This incident will be reported.</span> 😏'),
      hack: async () => {
        for (let i = 0; i < 16; i++) { print(`<span class="m">0x${hex(4)}</span> ${hex(28)} <span class="g">${['bypass', 'inject', 'decrypt', 'tunnel'][i % 4]}</span>`); await sleep(55); }
        HY.surge = 1;
        print('<span class="ok">ACCESS GRANTED</span> … 开玩笑的 😄 我只做正经 Agent。');
      },
      matrix: () => { HY.surge = 1; print('<span class="ok">wake up, neo…</span> <span class="m">the matrix has you.</span>'); },
      date: () => print(esc(new Date().toString())),
      pwd: () => print('/home/huangyifeng'),
      echo: (a) => print(esc(a.join(' '))),
      history: () => print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n')),
      exit: () => HY.go('home'),
      clear: () => $$('.out', term).forEach((n) => n.remove()),
    };
    C.open = C.cd;
    const hist = [];
    let hi = 0;
    const run = async (raw) => {
      const cmd = raw.trim();
      const echo = document.createElement('div');
      echo.className = 'out'; echo.innerHTML = PS + ' '; echo.appendChild(document.createTextNode(cmd));
      term.insertBefore(echo, inputRow);
      if (!cmd) return;
      hist.push(cmd); hi = hist.length;
      if (/^rm\s+-rf/.test(cmd)) return print('<span class="err">nice try 😏</span>');
      const [name, ...args] = cmd.split(/\s+/);
      const f = C[name.toLowerCase()];
      if (f) await f(args);
      else print(`<span class="err">zsh: command not found: ${esc(name)}</span>  <span class="m">输入 help 查看可用命令</span>`);
      term.scrollTop = term.scrollHeight;
    };
    tin.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = tin.value; tin.value = ''; run(v); }
      else if (e.key === 'ArrowUp') { if (hi > 0) tin.value = hist[--hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); tin.value = hist[hi] || ''; e.preventDefault(); }
      else if (e.key === 'Tab') { e.preventDefault(); const m = Object.keys(C).find((k) => tin.value && k.startsWith(tin.value)); if (m) tin.value = m + ' '; }
    });
    term.addEventListener('click', () => { if (!getSelection().toString()) tin.focus({ preventScroll: true }); });
    let typing = false;
    this.autoType = async (cmd) => {
      if (typing) return;
      typing = true; tin.value = '';
      for (const ch of cmd) { tin.value += ch; await sleep(55); }
      await sleep(180);
      tin.value = ''; await run(cmd); typing = false;
    };
    $$('.term-hint code', el).forEach((cd) => cd.addEventListener('click', () => this.autoType(cd.dataset.cmd)));
    print(`<span class="g">HYF-OS 2.6.0</span> <span class="m">(tty1) — last login: ${new Date().toLocaleString('zh-CN')} · 输入 help 查看命令</span>`);
    this.tin = tin;
  },
  enter() {
    if (HY.fine) setTimeout(() => this.tin.focus({ preventScroll: true }), 700);
    if (!this.greeted) { this.greeted = true; setTimeout(() => this.autoType('neofetch'), 900); }
  },
});

/* ================= CONTACT ================= */
HY.page('contact', {
  init(el) {
    const phone = $('#phone', el), txt = $('#phoneText', el), copyLbl = $('#copyLbl', el);
    let decrypted = false;
    phone.addEventListener('click', (e) => { if (!decrypted) { e.preventDefault(); decrypted = true; scramble(txt, P.phone, 1100); HY.surge = 0.5; } });
    $('#copyPhone', el).addEventListener('click', async () => {
      const num = P.phone.replace(/\s/g, '');
      let ok = false;
      try { await navigator.clipboard.writeText(num); ok = true; } catch (e) {
        const ta = document.createElement('textarea'); ta.value = num; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        ta.remove();
      }
      await scramble(copyLbl, ok ? '已复制 ✓' : '复制失败', 400);
      setTimeout(() => scramble(copyLbl, '复制号码', 400), 1800);
    });
  },
});

HY.start();
})();
