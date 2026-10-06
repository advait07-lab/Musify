const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], A = $('#audio');
const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, SV = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const hue = s => [...String(s.id)].reduce((a, c) => a + c.charCodeAt(0) * 37, 0) % 360;
const demo = s => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${hue(s) % 17 + 1}.mp3`;
const fmt = t => isNaN(t) ? '0:00' : `${t / 60 | 0}:${String(t % 60 | 0).padStart(2, '0')}`;
let lib = [], byId = {}, queue = [], qi = -1, cur = null, shuffle = false, repeat = false, view = { t: 'home' };
let liked = LS('liked', []), recent = LS('recent', []), pls = LS('pls', {}), extra = LS('extra', {}), sp = 0, sleepI = 0, sleepT;
const SPEEDS = [1, 1.25, 1.5, 2, .75], SLEEP = [0, 15, 30, 60];

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t.t); t.t = setTimeout(() => t.classList.remove('show'), 1800); }
const art = s => `<div class="art" data-id="${s.id}" style="--h:${hue(s)}">${esc(s.title[0])}${s.art ? `<img src="${esc(s.art)}" alt="" loading="lazy">` : ''}</div>`;
const card = (s, i = 0) => `<div class="card${cur?.id == s.id ? ' on' : ''}" data-id="${s.id}" style="animation-delay:${Math.min(i, 12) * 40}ms">${art(s)}<button class="fab">▶</button><button class="more">⋯</button><b>${esc(s.title)}</b><small>${esc(s.artist)}</small></div>`;
const grid = l => l.length ? `<div class="grid">${l.map(card).join('')}</div>` : '<p class="empty">Nothing here yet 🎵</p>';
const reg = s => { byId[s.id] ??= s; return byId[s.id]; };

// ---- lazy cover-art resolver (server asks iTunes) ----
let pend = new Set(), tm;
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; io.unobserve(e.target);
  const s = byId[e.target.dataset.id];
  if (s && !s.art && !s.url && !s.tried) { pend.add(s.id); clearTimeout(tm); tm = setTimeout(flush, 120); }
}), { rootMargin: '250px' });
async function flush() { const ids = [...pend]; pend.clear(); for (let i = 0; i < ids.length; i += 6) await resolve(ids.slice(i, i + 6)); }
async function resolve(ids) {
  ids.forEach(i => byId[i].tried = 1);
  try {
    const r = await (await fetch('/api/resolve?ids=' + ids)).json();
    for (const id in r) { Object.assign(byId[id], r[id]); paint(id); }
  } catch {}
}
function paint(id) {
  const s = byId[id];
  $$(`.art[data-id="${id}"]`).forEach(a => { if (!a.querySelector('img') && s.art) a.insertAdjacentHTML('beforeend', `<img src="${esc(s.art)}" alt="">`); });
  if (cur?.id == id) glow(s);
}
const observe = () => $$('#main .art,#ql .art').forEach(a => io.observe(a));

// ---- views ----
function go(v) {
  view = v;
  $$('.nav').forEach(n => n.classList.toggle('on', n.dataset.v == v.t && (n.dataset.n || '') == (v.n || '')));
  const ids = l => l.map(i => byId[i]).filter(Boolean);
  let h = '';
  if (v.t == 'home') {
    const moods = [...new Set(lib.map(s => s.mood))], f = lib.filter(s => s.mood == 'Romantic')[Math.random() * 30 | 0] || lib[0];
    h = `<div class="hero">${art(f)}<div><small>FEATURED</small><h1>${esc(f.title)}</h1><p>${esc(f.artist)} • ${lib.length} songs in your library</p><button class="btn" data-play="${f.id}">▶ Play</button><button class="btn ghost" id="shufall">🔀 Shuffle all</button></div></div>`;
    if (recent.length) h += `<section><h3>Recently played</h3><div class="row">${ids(recent).slice(0, 12).map(card).join('')}</div></section>`;
    h += moods.map(m => `<section><div class="rh"><h3>${m}</h3><a data-v="mood" data-n="${esc(m)}">See all</a></div><div class="row">${lib.filter(s => s.mood == m).slice(0, 14).map(card).join('')}</div></section>`).join('');
  } else if (v.t == 'mood') h = `<h2>${esc(v.n)}</h2>` + grid(lib.filter(s => s.mood == v.n));
  else if (v.t == 'liked') h = `<h2>💚 Liked Songs</h2>` + grid(ids(liked));
  else if (v.t == 'recent') h = `<h2>🕘 Recently Played</h2>` + grid(ids(recent));
  else if (v.t == 'pl') h = `<h2>🎶 ${esc(v.n)}</h2>` + grid(ids(pls[v.n] || []));
  $('#main').innerHTML = h; $('main').scrollTop = 0; observe();
}
async function search(q) {
  view = { t: 'search' }; $$('.nav').forEach(n => n.classList.remove('on'));
  const l = lib.filter(s => (s.title + ' ' + s.artist + ' ' + s.mood).toLowerCase().includes(q.toLowerCase()));
  $('#main').innerHTML = `<h2>Results for “${esc(q)}”</h2>` + grid(l) + `<h3>🌐 From the web</h3><div id="web" class="grid">${'<div class="sk"></div>'.repeat(6)}</div>`; observe();
  try {
    const w = (await (await fetch('/api/online?q=' + encodeURIComponent(q))).json()).map(reg);
    if ($('#q').value.trim() == q) { $('#web').innerHTML = w.length ? w.map(card).join('') : '<p class="empty">No web results (check internet).</p>'; }
  } catch { $('#web').innerHTML = '<p class="empty">Web search unavailable.</p>'; }
}

// ---- playback ----
async function play(s, list) {
  if (list) queue = list.slice();
  qi = queue.findIndex(x => x.id == s.id); if (qi < 0) { queue.push(s); qi = queue.length - 1; }
  cur = s; if (!s.preview && !s.url && !s.tried) await resolve([s.id]);
  A.src = s.preview || s.url || demo(s); A.playbackRate = SPEEDS[sp]; A.play().catch(() => {});
  recent = [s.id, ...recent.filter(i => i != s.id)].slice(0, 30); SV('recent', recent); SV('last', s.id);
  if (s.mood == 'Web') { extra[s.id] = s; SV('extra', extra); }
  setNow();
}
function setNow() {
  const s = cur; if (!s) return;
  $('#pt').textContent = s.title; $('#pa').textContent = s.artist + (s.album ? ' • ' + s.album : '');
  $('#pArt').innerHTML = art(s); $('#big').innerHTML = art(s); $('#bt').textContent = s.title; $('#ba').textContent = s.artist;
  document.title = `${s.title} • Musify`; glow(s); likeUI(); renderQ(); $$('.card').forEach(c => c.classList.toggle('on', c.dataset.id == s.id));
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: s.artist, album: s.album || '', artwork: s.art ? [{ src: s.art, sizes: '600x600' }] : [] });
}
function glow(s) {
  const r = document.documentElement.style;
  if (!s.art) return r.setProperty('--g', `hsl(${hue(s)} 60% 28%)`);
  const i = new Image(); i.crossOrigin = 'anonymous';
  i.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 1, 1); const [a, b, d] = x.getImageData(0, 0, 1, 1).data; r.setProperty('--g', `rgb(${a},${b},${d})`); } catch {} };
  i.onerror = () => r.setProperty('--g', `hsl(${hue(s)} 60% 28%)`); i.src = s.art;
}
const toggle = () => cur ? (A.paused ? A.play() : A.pause()) : lib.length && play(lib[0], lib);
const next = () => queue.length && play(shuffle ? queue[Math.random() * queue.length | 0] : queue[(qi + 1) % queue.length]);
const prev = () => A.currentTime > 3 ? A.currentTime = 0 : queue.length && play(queue[(qi - 1 + queue.length) % queue.length]);
const likeUI = () => { $('#like').textContent = cur && liked.includes(cur.id) ? '💚' : '♡'; };
function like(s) {
  if (!s) return; const had = liked.includes(s.id);
  liked = had ? liked.filter(i => i != s.id) : [s.id, ...liked]; SV('liked', liked);
  if (s.mood == 'Web') { extra[s.id] = s; SV('extra', extra); }
  toast(had ? 'Removed from Liked' : '💚 Added to Liked Songs'); likeUI(); if (view.t == 'liked') go(view);
}
function renderQ() {
  $('#ql').innerHTML = queue.slice(qi + 1, qi + 40).map(s => `<div class="qi" data-id="${s.id}">${art(s)}<span>${esc(s.title)}<br><small style="color:var(--mu)">${esc(s.artist)}</small></span><button data-rm="${s.id}">✕</button></div>`).join('') || '<p class="empty">Queue is empty</p>';
  observe();
}
const pstyle = (el, p) => el.style.setProperty('--p', p + '%');

A.onplay = A.onpause = () => { document.body.classList.toggle('playing', !A.paused); $('#play').textContent = A.paused ? '▶' : '⏸'; };
A.onended = () => repeat ? (A.currentTime = 0, A.play()) : next();
A.onloadedmetadata = () => $('#dur').textContent = fmt(A.duration);
A.ontimeupdate = () => { if (!A.duration) return; const p = A.currentTime / A.duration * 100; $('#prog').value = p; pstyle($('#prog'), p); $('#cur').textContent = fmt(A.currentTime); };
A.onerror = () => { if (cur && !A.src.includes('soundhelix')) { A.src = demo(cur); A.play().catch(() => {}); toast('Using demo audio for this track'); } };
$('#prog').oninput = e => { if (A.duration) A.currentTime = e.target.value / 100 * A.duration; pstyle(e.target, e.target.value); };
$('#vol').oninput = e => { A.volume = e.target.value; pstyle(e.target, e.target.value * 100); SV('vol', e.target.value); };
$('#play').onclick = toggle; $('#next').onclick = next; $('#prev').onclick = prev; $('#like').onclick = () => like(cur);
$('#shuf').onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle('on', shuffle); toast('Shuffle ' + (shuffle ? 'on' : 'off')); };
$('#rep').onclick = e => { repeat = !repeat; e.currentTarget.classList.toggle('on', repeat); toast('Repeat ' + (repeat ? 'on' : 'off')); };
$('#qbtn').onclick = () => $('.app').classList.toggle('q');
$('#speed').onclick = e => { sp = (sp + 1) % SPEEDS.length; A.playbackRate = SPEEDS[sp]; e.currentTarget.textContent = SPEEDS[sp] + 'x'; };
$('#sleep').onclick = e => {
  sleepI = (sleepI + 1) % SLEEP.length; clearTimeout(sleepT); const m = SLEEP[sleepI];
  e.currentTarget.classList.toggle('on', !!m); toast(m ? `😴 Sleep in ${m} min` : 'Sleep timer off');
  if (m) sleepT = setTimeout(() => { A.pause(); toast('Good night 🌙'); }, m * 60000);
};
if ('mediaSession' in navigator) ['play', 'pause'].forEach(a => navigator.mediaSession.setActionHandler(a, toggle)), navigator.mediaSession.setActionHandler('nexttrack', next), navigator.mediaSession.setActionHandler('previoustrack', prev);

// ---- menu / clicks ----
function menu(s, x, y) {
  const m = $('#menu'), pl = Object.keys(pls);
  m.innerHTML = `<button data-a="next">▶ Play next</button><button data-a="queue">➕ Add to queue</button><button data-a="like">${liked.includes(s.id) ? '💔 Unlike' : '💚 Like'}</button>` + pl.map(n => `<button data-a="pl" data-n="${esc(n)}">🎶 Add to ${esc(n)}</button>`).join('');
  m.style.cssText = `display:block;left:${Math.min(x, innerWidth - 200)}px;top:${Math.min(y, innerHeight - 60 - 40 * (3 + pl.length))}px`;
  m.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a;
    if (a == 'next') { queue.splice(qi + 1, 0, s); toast('Playing next'); renderQ(); }
    if (a == 'queue') { queue.push(s); toast('Added to queue'); renderQ(); }
    if (a == 'like') like(s);
    if (a == 'pl') { const n = b.dataset.n; (pls[n] ??= []).includes(s.id) || pls[n].push(s.id); SV('pls', pls); if (s.mood == 'Web') { extra[s.id] = s; SV('extra', extra); } toast('Added to ' + n); }
    m.style.display = 'none';
  };
}
document.addEventListener('click', e => {
  const t = e.target;
  if (!t.closest('#menu')) $('#menu').style.display = 'none';
  const v = t.closest('[data-v]'); if (v) return go({ t: v.dataset.v, n: v.dataset.n });
  const pb = t.closest('[data-play]'); if (pb) return play(byId[pb.dataset.play], lib);
  if (t.closest('#shufall')) { shuffle = true; $('#shuf').classList.add('on'); return play(lib[Math.random() * lib.length | 0], lib); }
  const rm = t.closest('[data-rm]'); if (rm) { const i = queue.findIndex((x, j) => j > qi && x.id == rm.dataset.rm); if (i > -1) queue.splice(i, 1); return renderQ(); }
  const qiEl = t.closest('.qi'); if (qiEl) return play(byId[qiEl.dataset.id]);
  const c = t.closest('.card'); if (!c) return;
  const s = byId[c.dataset.id];
  if (t.closest('.more')) { e.stopPropagation(); const r = t.getBoundingClientRect(); return setTimeout(() => menu(s, r.left, r.bottom), 0); }
  if (cur?.id == s.id) return toggle();
  play(s, [...c.parentElement.querySelectorAll('.card')].map(x => byId[x.dataset.id]));
});
document.addEventListener('contextmenu', e => { const c = e.target.closest('.card'); if (c) { e.preventDefault(); menu(byId[c.dataset.id], e.clientX, e.clientY); } });
$('#newpl').onclick = () => { const n = (prompt('Playlist name?') || '').trim(); if (n && !pls[n]) { pls[n] = []; SV('pls', pls); plUI(); toast('Playlist created'); } };
const plUI = () => { $('#pls').innerHTML = Object.keys(pls).map(n => `<button class="nav" data-v="pl" data-n="${esc(n)}">🎶 ${esc(n)}</button>`).join('') || '<small style="color:var(--mu);padding:0 12px">No playlists yet</small>'; };
$$('.accents i').forEach(i => i.onclick = () => { document.documentElement.style.setProperty('--ac', i.dataset.c); SV('ac', i.dataset.c); });

let st; $('#q').oninput = e => { clearTimeout(st); const q = e.target.value.trim(); st = setTimeout(() => q ? search(q) : go({ t: 'home' }), 300); };
document.addEventListener('keydown', e => {
  if (e.target.tagName == 'INPUT') { if (e.key == 'Escape') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if (e.code == 'Space') { e.preventDefault(); toggle(); } else if (k == 'arrowright') next(); else if (k == 'arrowleft') prev();
  else if (k == 'l') like(cur); else if (k == 's') $('#shuf').click(); else if (k == 'r') $('#rep').click(); else if (k == 'q') $('#qbtn').click();
  else if (k == 'm') A.muted = !A.muted; else if (k == '/') { e.preventDefault(); $('#q').focus(); }
});

// ---- init ----
(async () => {
  document.documentElement.style.setProperty('--ac', LS('ac', '#1db954'));
  const v = LS('vol', .8); A.volume = v; $('#vol').value = v; pstyle($('#vol'), v * 100);
  $('#main').innerHTML = `<div class="grid">${'<div class="sk"></div>'.repeat(10)}</div>`;
  lib = await (await fetch('/api/songs')).json(); lib.forEach(s => byId[s.id] = s); Object.values(extra).forEach(reg);
  $('#moods').innerHTML = [...new Set(lib.map(s => s.mood))].map(m => `<button class="nav" data-v="mood" data-n="${esc(m)}">${esc(m)}</button>`).join('');
  plUI(); go({ t: 'home' });
  const last = byId[LS('last', '')]; if (last) { cur = last; queue = lib.slice(); qi = queue.findIndex(x => x.id == last.id); setNow(); }
})();
