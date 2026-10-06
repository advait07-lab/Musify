const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), url = require('url');
const db = require('./db');
const PORT = process.env.PORT || 3000, FE = path.join(__dirname, '..', 'frontend'), CF = path.join(__dirname, 'cache.json');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.flac': 'audio/flac' };
let cache = {}; try { cache = JSON.parse(fs.readFileSync(CF)); } catch {}

// iTunes Search API (free, no key): real cover art + 30s previews
function itunes(term, limit) {
  return new Promise(r => {
    const q = new URLSearchParams({ term, country: 'IN', media: 'music', entity: 'song', limit });
    const req = https.get('https://itunes.apple.com/search?' + q, { timeout: 7000 }, res => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => { try { r(JSON.parse(b).results || []); } catch { r([]); } });
    });
    req.on('error', () => r([])); req.on('timeout', () => { req.destroy(); r([]); });
  });
}
const art = t => (t.artworkUrl100 || '').replace('100x100', '600x600');
async function resolve(s) {
  if (cache[s.id]) return cache[s.id];
  const t = (await itunes(s.title + ' ' + s.artist, 5)).find(x => x.previewUrl);
  if (!t) return null;
  cache[s.id] = { art: art(t), preview: t.previewUrl, album: t.collectionName };
  fs.writeFile(CF, JSON.stringify(cache), () => {});
  return cache[s.id];
}
const json = (res, d) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(d)); };

function sendFile(req, res, file) {
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', rg = req.headers.range;
    if (rg) {
      const [s, en] = rg.replace('bytes=', '').split('-'), a = +s || 0, b = en ? +en : st.size - 1;
      res.writeHead(206, { 'Content-Range': `bytes ${a}-${b}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': b - a + 1, 'Content-Type': type });
      fs.createReadStream(file, { start: a, end: b }).pipe(res);
    } else { res.writeHead(200, { 'Content-Length': st.size, 'Content-Type': type, 'Accept-Ranges': 'bytes' }); fs.createReadStream(file).pipe(res); }
  });
}

http.createServer(async (req, res) => {
  const { pathname: p, query } = url.parse(req.url, true);
  if (p === '/api/songs') return json(res, db.loadSongs());
  if (p === '/api/resolve') {
    const all = db.loadSongs(), out = {};
    await Promise.all((query.ids || '').split(',').map(async id => {
      const s = all.find(x => x.id === id); const r = s && await resolve(s); if (r) out[id] = r;
    }));
    return json(res, out);
  }
  if (p === '/api/online') {
    const rs = await itunes(query.q || '', 24);
    return json(res, rs.filter(t => t.previewUrl).map(t => ({ id: 't' + t.trackId, title: t.trackName, artist: t.artistName, mood: 'Web', album: t.collectionName, art: art(t), preview: t.previewUrl })));
  }
  if (p.startsWith('/songs/')) return sendFile(req, res, path.join(db.SONGS_DIR, path.basename(decodeURIComponent(p))));
  const f = path.normalize(path.join(FE, p === '/' ? 'index.html' : p));
  if (!f.startsWith(FE)) { res.writeHead(403); return res.end(); }
  sendFile(req, res, f);
}).listen(PORT, () => console.log(`Musify running → http://localhost:${PORT}`));
