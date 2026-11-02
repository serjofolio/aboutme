/* 模型接入后台（仿 CC Switch）：供应商列表 · 一键启用 · 测试 · 获取模型 · 人设 · 试聊 */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (res.status === 401 && !url.includes('/login')) { showAuth(false); throw new Error(j.error || '请先登录'); }
  if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
};
const toast = (msg, bad) => { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(t._t); t._t = setTimeout(() => (t.className = 'toast'), 2600); };

let state = { presets: [], providers: [], activeId: null, persona: '' };
const results = {}; // provider id -> last test result

/* ---------- auth ---------- */
let setupMode = false;
function showAuth(setup) {
  setupMode = setup;
  $('#app').hidden = true; $('#auth').hidden = false;
  $('#authTitle').textContent = setup ? '首次设置后台密码' : '模型接入后台';
  $('#authTip').textContent = setup ? '设置一个至少 6 位的密码，用来管理大模型配置' : '输入后台密码';
  $('#authBtn').textContent = setup ? '设置并进入' : '登录';
  $('#authPass').focus();
}
$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#authErr').textContent = '';
  try { await api(setupMode ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', body: { password: $('#authPass').value } }); $('#authPass').value = ''; boot(); }
  catch (err) {
    if (setupMode && /已经设置过/.test(err.message)) { showAuth(false); $('#authErr').textContent = '密码已经设置好了，请直接用它登录'; return; }
    $('#authErr').textContent = err.message;
  }
});
$('#logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); showAuth(false); });

async function boot() {
  let s;
  const slow = setTimeout(() => { const l = $('#loading'); if (l) l.innerHTML = '连接后台超过 8 秒没有响应。<br>请确认 start.bat 的黑窗口还开着、没有报错；在黑窗口里点过鼠标的话，按一下回车让它继续运行；然后按 Ctrl+F5 刷新本页。'; }, 8000);
  try { s = await api('/api/admin/state'); }
  catch (e) { const msg = /fetch|Failed|JSON|HTTP/.test(e.message) ? '无法连接后端。请双击 start.bat，然后访问 http://localhost:5200/admin.html' : e.message; clearTimeout(slow); document.body.innerHTML = '<p style="padding:40px;font-family:monospace;color:#e9b45c">' + esc(msg) + '</p>'; return; }
  clearTimeout(slow); $('#loading')?.remove();
  if (!s.authed) return showAuth(s.setup);
  $('#auth').hidden = true; $('#app').hidden = false;
  await load();
}
async function load() {
  state = await api('/api/admin/config');
  render();
  $('#persona').value = state.persona;
  $$('input[name=mode]').forEach((r) => (r.checked = r.value === (state.mode || 'twin')));
}

/* ---------- list ---------- */
const initials = (n) => (n.match(/[A-Za-z]+|[一-龥]/g) || ['?']).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
function render() {
  const a = state.providers.find((p) => p.id === state.activeId);
  const cur = $('#current');
  cur.className = 'current' + (a && a.hasKey ? '' : ' off');
  cur.innerHTML = a ? `<i class="dot"></i><div><b>${esc(a.name)} 正在为分身服务</b><br><span>${esc(a.model)} · ${esc(a.baseUrl)}</span></div>` : '<i class="dot"></i><div><b>分身未接入大模型</b><br><span>访客会看到本地知识库版本 · 添加并启用一个供应商即可上线</span></div>';
  $('#count').textContent = `${state.providers.length} 个`;
  $('#list').innerHTML = state.providers.length ? state.providers.map((p) => {
    const on = p.id === state.activeId, r = results[p.id];
    const res = r ? (r.loading ? '<div class="res" style="color:var(--mute)">测试中…</div>' : r.ok ? `<div class="res" style="color:var(--ok)">✓ ${r.ms}ms · ${esc(r.reply)}</div>` : `<div class="res" style="color:var(--bad)">✕ ${esc(r.error)}</div>`) : '';
    return `<div class="card${on ? ' on' : ''}" data-id="${p.id}">
      <div class="av">${esc(initials(p.name))}</div>
      <div class="meta"><b>${esc(p.name)}${on ? '<span class="tag use">使用中</span>' : ''}<span class="tag">${p.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'}</span></b>
        <p>${esc(p.model || '未选模型')} · ${esc(p.baseUrl)} · ${p.hasKey ? 'Key ' + esc(p.keyMask) : '<span style="color:var(--bad)">未填 Key</span>'}</p>${res}</div>
      <div class="ops">${on ? '' : '<button class="use" data-act="activate">启用</button>'}<button data-act="test">测试</button><button data-act="edit">编辑</button><button class="del" data-act="del">删除</button></div>
    </div>`;
  }).join('') : '<div class="empty">还没有供应商。点「＋ 添加供应商」，选一个预设、填上 API Key 就能让分身接入你的大模型。</div>';
}
$('#list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.closest('.card').dataset.id, p = state.providers.find((x) => x.id === id);
  try {
    if (b.dataset.act === 'activate') { await api(`/api/admin/providers/${id}/activate`, { method: 'POST' }); toast(`已切换到 ${p.name}`); await load(); }
    if (b.dataset.act === 'test') { results[id] = { loading: true }; render(); results[id] = await api(`/api/admin/providers/${id}/test`, { method: 'POST' }); render(); }
    if (b.dataset.act === 'edit') openDrawer(p);
    if (b.dataset.act === 'del' && confirm(`删除「${p.name}」？`)) { await api(`/api/admin/providers/${id}`, { method: 'DELETE' }); toast('已删除'); await load(); }
  } catch (err) { toast(err.message, true); }
});

/* ---------- drawer ---------- */
const form = $('#form');
let editing = null, preset = 'custom';
function applyPreset(id, fill) {
  preset = id;
  const ps = state.presets.find((x) => x.id === id) || {};
  $$('#presets button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
  if (fill) {
    form.name.value = ps.id === 'custom' ? '' : ps.name;
    form.protocol.value = ps.protocol || 'openai';
    form.baseUrl.value = ps.baseUrl || '';
    form.model.value = ps.models?.[0] || '';
  }
  const link = $('#keyLink');
  link.textContent = ps.website ? '获取 Key ↗' : ''; link.href = ps.website || '#';
  setModels(ps.models || [], '');
  if (fill) checkUrl();
}
function setModels(list, note) {
  $('#modelList').innerHTML = list.map((m) => `<option value="${esc(m)}">`).join('');
  $('#modelChips').innerHTML = list.slice(0, 60).map((m) => `<button type="button">${esc(m)}</button>`).join('');
  $('#modelNote').textContent = note;
}
function openDrawer(p) {
  editing = p || null;
  $('#formTitle').textContent = p ? `编辑 · ${p.name}` : '添加供应商';
  $('#presets').innerHTML = state.presets.map((x) => `<button type="button" data-id="${x.id}">${esc(x.name)}</button>`).join('');
  $('#formErr').textContent = '';
  form.reset();
  if (p) {
    applyPreset(p.preset || 'custom', false);
    form.name.value = p.name; form.protocol.value = p.protocol; form.baseUrl.value = p.baseUrl; form.model.value = p.model;
    form.temperature.value = p.temperature ?? 0.7;
    form.apiKey.placeholder = p.hasKey ? `已保存 ${p.keyMask}（留空则不修改）` : 'sk-…';
  } else { applyPreset('deepseek', true); form.apiKey.placeholder = 'sk-…'; }
  $('#tempOut').textContent = form.temperature.value;
  checkUrl();
  $('#drawer').hidden = false;
}
const closeDrawer = () => ($('#drawer').hidden = true);
$('#addBtn').addEventListener('click', () => openDrawer());
$('#closeDrawer').addEventListener('click', closeDrawer);
$('#cancel').addEventListener('click', closeDrawer);
$('#drawer').addEventListener('click', (e) => { if (e.target.id === 'drawer') closeDrawer(); });
$('#presets').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) applyPreset(b.dataset.id, true); });
$('#modelChips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) form.model.value = b.textContent; });
$('#eye').addEventListener('click', () => { const t = form.apiKey.type === 'password'; form.apiKey.type = t ? 'text' : 'password'; $('#eye').textContent = t ? '隐藏' : '显示'; });
// 协议和地址不匹配时提示（最常见的配置错误）
function checkUrl() {
  const u = form.baseUrl.value.trim(), anth = form.protocol.value === 'anthropic';
  let w = '';
  if (u && !/^https?:\/\//.test(u)) w = '地址要以 https:// 开头';
  else if (/bigmodel\.cn/.test(u)) {
    if (anth && !/\/api\/anthropic/.test(u)) w = '智谱选 Anthropic 协议时，地址应为 https://open.bigmodel.cn/api/anthropic';
    if (!anth && !/\/paas\/v4/.test(u)) w = '智谱选 OpenAI 兼容时，地址应为 https://open.bigmodel.cn/api/paas/v4（编码套餐为 /api/coding/paas/v4）';
  } else if (anth && u && !/anthropic/.test(u)) w = 'Anthropic 协议的地址一般是 https://api.anthropic.com 或以 /anthropic 结尾，请确认协议没选错';
  else if (!anth && /api\.anthropic\.com/.test(u)) w = 'Claude 官方地址需要选 Anthropic 协议';
  $('#urlNote').textContent = w ? '⚠ ' + w : '';
}
form.baseUrl.addEventListener('input', checkUrl);
form.protocol.addEventListener('change', checkUrl);
form.temperature.addEventListener('input', () => ($('#tempOut').textContent = form.temperature.value));
const payload = () => ({ id: editing?.id, preset, name: form.name.value, protocol: form.protocol.value, baseUrl: form.baseUrl.value, apiKey: form.apiKey.value, model: form.model.value, temperature: +form.temperature.value });
$('#fetchModels').addEventListener('click', async () => {
  // 先保存，后端才能用这把 Key 去上游拉模型
  if (!form.baseUrl.value) return toast('先填写 Base URL', true);
  $('#modelNote').textContent = '获取中…';
  try {
    const r = await api('/api/admin/providers', { method: 'POST', body: { ...payload(), model: form.model.value || 'placeholder' } });
    if (!editing) { await load(); editing = state.providers.find((x) => x.id === r.id); }
    const m = await api(`/api/admin/providers/${r.id}/models`, { method: 'POST' });
    setModels(m.models, m.note);
  } catch (err) { $('#modelNote').textContent = err.message; }
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await api('/api/admin/providers', { method: 'POST', body: payload() }); closeDrawer(); toast('已保存'); await load(); }
  catch (err) { $('#formErr').textContent = err.message; }
});
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---------- tabs ---------- */
$$('.tabs button').forEach((b) => b.addEventListener('click', async () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab').forEach((t) => (t.hidden = t.dataset.pane !== b.dataset.tab));
  if (b.dataset.tab === 'persona') $('#promptView').textContent = (await api('/api/admin/prompt')).prompt;
  if (b.dataset.tab === 'play') { const a = state.providers.find((p) => p.id === state.activeId); $('#playMeta').textContent = a ? `${a.name} · ${a.model}` : '未启用供应商'; }
}));
$('#savePersona').addEventListener('click', async () => {
  try { await api('/api/admin/persona', { method: 'POST', body: { persona: $('#persona').value, mode: ($('input[name=mode]:checked') || {}).value } });
    state.mode = ($('input[name=mode]:checked') || {}).value; toast('人设已保存'); $('#promptView').textContent = (await api('/api/admin/prompt')).prompt; }
  catch (err) { toast(err.message, true); }
});

/* ---------- playground（走和访客一样的接口） ---------- */
const hist = [];
$('#playForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#playIn').value.trim(); if (!q) return;
  $('#playIn').value = '';
  const log = $('#playLog');
  log.insertAdjacentHTML('beforeend', `<div class="m u">${esc(q)}</div>`);
  const a = document.createElement('div'); a.className = 'm a'; a.textContent = '…'; log.appendChild(a);
  hist.push({ role: 'user', content: q });
  let text = '';
  try {
    const res = await fetch('/api/twin/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist }) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (!line.startsWith('data:')) continue;
        const ev = JSON.parse(line.slice(5));
        if (ev.type === 'delta') { text += ev.text; a.textContent = text; log.scrollTop = log.scrollHeight; }
        if (ev.type === 'error') throw new Error(ev.error);
      }
    }
    hist.push({ role: 'assistant', content: text });
  } catch (err) { a.className = 'm e'; a.textContent = '✕ ' + err.message; hist.pop(); }
});

boot();
})();
