// Servidor do site HS Logística. Entrega o build (dist/), monta as páginas com o conteúdo do CMS (Payload)
// e guarda o HTML em memória até o CMS avisar que algo mudou. Sem dependências.
//   npm run build && CMS_URL=... SITE_URL=... REVALIDATE_SECRET=... PREVIEW_SECRET=... QUOTE_PROXY_SECRET=... node server.cjs
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const { loadSite, fill, get } = require('./lib/pages.cjs');

const clean = (v) => String(v || '').replace(/\/$/, '');
const PORT = process.env.PORT || 3000;
const CMS = clean(process.env.CMS_URL), BASE = clean(process.env.SITE_URL);
const SECRETS = { revalidate: process.env.REVALIDATE_SECRET || '', preview: process.env.PREVIEW_SECRET || '', quote: process.env.QUOTE_PROXY_SECRET || '' };
const DIST = path.join(__dirname, 'dist'), DATA = path.join(__dirname, 'data'), SNAPSHOT = path.join(DATA, 'site.json');

const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y); };
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const readBody = (req, max = 2e6) => new Promise((ok, no) => { let s = ''; req.on('data', (c) => { s += c; if (s.length > max) { no(new Error('grande demais')); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { no(new Error('JSON inválido')); } }); });
const str = (v, max) => String(v ?? '').slice(0, max).trim();
/** IP de quem pediu. Atrás do proxy da hospedagem (Railway), é o primeiro endereço de X-Forwarded-For. */
const ipOf = (req) => (process.env.TRUST_PROXY === '0' ? '' : String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';

// ---------- Conteúdo: lido do CMS na partida e a cada aviso de mudança; a última leitura boa fica em disco ----------
let ssr = null, site = null, templates = null, loadedFromCms = false;
const pages = new Map();          // endereço → HTML pronto
let refreshQueue = Promise.resolve();
function refresh() {
  const pending = refreshQueue.catch(() => {}).then(async () => {
  const next = await loadSite(ssr, CMS);
  site = next;
  loadedFromCms = true; pages.clear(); packed.clear();
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(SNAPSHOT + '.tmp', JSON.stringify(site)); fs.renameSync(SNAPSHOT + '.tmp', SNAPSHOT); } catch { /* sem disco gravável: segue só em memória */ }
  });
  refreshQueue = pending;
  return pending;
}
// Hooks can run before their database transaction commits. Read the expected
// version before rebuilding; concurrent invalidations are then processed in order.
async function awaitCommitted(change) {
  const globals = ['home', 'site-settings'];
  const collections = ['posts', 'categories', 'media', 'redirects'];
  const endpoint = globals.includes(change.what) ? 'globals/' + change.what : collections.includes(change.what) && /^\d+$/.test(String(change.id)) ? change.what + '/' + change.id : '';
  if (!endpoint || (!change.updatedAt && !change.deleted)) return;
  for (let i = 0; i < 15; i++) {
    const r = await fetch(CMS + '/api/' + endpoint + '?depth=0', { headers: { 'x-preview-secret': SECRETS.preview }, signal: AbortSignal.timeout(5000) });
    if (change.deleted && r.status === 404) return;
    if (r.ok && !change.deleted) { const doc = await r.json(); if (Date.parse(doc.updatedAt) >= Date.parse(change.updatedAt)) return; }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('O CMS ainda não confirmou a versão salva.');
}
async function firstLoad() {
  try { await refresh(); console.log(`Conteúdo lido do CMS: ${site.posts.length} posts publicados`); return; }
  catch (e) { console.warn('CMS fora do ar na partida (' + e.message + ').'); }
  try {
    const saved = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')), defaults = ssr.emptySite(CMS);
    site = { ...defaults, ...saved, content: { ...defaults.content, ...saved.content,
      brand: { ...defaults.content.brand, ...saved.content?.brand },
      navigation: saved.content?.navigation || defaults.content.navigation,
      sections: { ...defaults.content.sections, ...saved.content?.sections },
      quoteForm: { ...defaults.content.quoteForm, ...saved.content?.quoteForm },
      footerOptions: { ...defaults.content.footerOptions, ...saved.content?.footerOptions },
    } };
    console.warn('Usando a última leitura boa guardada em disco.');
  }
  catch { site = { ...ssr.emptySite(CMS), redirects: [] }; console.warn('Sem leitura anterior: usando o conteúdo padrão.'); }
  const retry = setInterval(() => refresh().then(() => { clearInterval(retry); console.log('CMS voltou: conteúdo atualizado.'); }).catch(() => {}), 60000);
  retry.unref();
}

// ---------- Resposta: texto sai comprimido (brotli ou gzip); o resultado fica guardado em memória ----------
const packed = new Map();
function pack(req, key, buf) {
  const ae = String(req.headers['accept-encoding'] || ''), enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : '';
  if (!enc || !key) return { buf, enc: '' };
  const id = enc + ':' + key;
  if (!packed.has(id)) packed.set(id, enc === 'br' ? zlib.brotliCompressSync(buf) : zlib.gzipSync(buf));
  return { buf: packed.get(id), enc };
}
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
function send(req, res, code, type, text, { key = '', cache = 'no-cache', headers = {} } = {}) {
  const { buf, enc } = pack(req, key, Buffer.from(text));
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': cache, Vary: 'Accept-Encoding', 'X-Frame-Options': 'DENY', ...SECURITY, ...(enc ? { 'Content-Encoding': enc } : {}), ...headers });
  res.end(req.method === 'HEAD' ? undefined : buf);
}
const HTML = 'text/html; charset=utf-8';
/** Página em cache: monta uma vez por endereço e reaproveita até o próximo revalidate. */
function page(req, res, url, build, code = 200) {
  if (!pages.has(url)) { const html = build(); if (html === null) return false; pages.set(url, html); }
  send(req, res, code, HTML, pages.get(url), { key: 'page:' + url });
  return true;
}
const homePage = () => fill(templates.home, ssr.home(site, BASE), { content: site.content });
const blogShell = (p, state) => fill(templates.blog, p, state);

const TYPES = { '.html': HTML, '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const TEXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt', '.xml']);
function sendStatic(req, res, url) {
  let rel; try { rel = path.normalize(decodeURIComponent(url)).replace(/^([/\\]|\.\.[/\\])+/, ''); } catch { return false; }
  const full = path.join(DIST, rel);
  if (!full.startsWith(DIST + path.sep) || /^template(-blog)?\.html$/.test(rel) || rel === 'index.html') return false;
  let st; try { st = fs.statSync(full); } catch { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(full), cache = rel.startsWith('assets' + path.sep) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  if (TEXT.has(ext)) { send(req, res, 200, TYPES[ext], fs.readFileSync(full), { key: full + st.mtimeMs, cache }); return true; }
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache, ...SECURITY });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(full).pipe(res);
  return true;
}

// ---------- Cotações: limite por IP, campo-isca e repasse ao CMS com o segredo do proxy ----------
const hits = new Map();           // ip → horários dos últimos envios
const QUOTE_MAX = 5, QUOTE_WINDOW = 10 * 60e3;
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < QUOTE_WINDOW);
  if (list.length >= QUOTE_MAX) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < QUOTE_WINDOW)) hits.delete(k);
  return false;
}
async function quote(req, res) {
  const b = await readBody(req, 20e3);
  if (limited(ipOf(req))) return json(res, 429, { error: 'Muitos pedidos em pouco tempo. Aguarde alguns minutos.' });
  if (str(b.website, 200)) return json(res, 200, { ok: true });         // robô preencheu o campo-isca: finge que deu certo e descarta
  const data = { name: str(b.name, 120), contact: str(b.contact, 120), service: str(b.service, 120), message: str(b.message, 2000) };
  if (!data.name || !data.contact) return json(res, 400, { error: 'Informe nome e contato.' });
  const r = await fetch(CMS + '/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-quote-secret': SECRETS.quote }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) });
  if (!r.ok) { console.warn('cotação: o CMS respondeu ' + r.status); return json(res, 502, { error: 'Não foi possível registrar o pedido agora.' }); }
  json(res, 200, { ok: true });
}

// ---------- Prévia ao vivo: só com token curto assinado pelo CMS ----------
function previewOk(token) {
  const [exp, sig] = String(token || '').split('.');
  if (!SECRETS.preview || !exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEqual(sig, crypto.createHmac('sha256', SECRETS.preview).update(exp).digest('hex'));
}
const cmsOrigin = () => { try { return new URL(CMS).origin; } catch { return "'none'"; } };
const previewHeaders = () => ({ 'X-Frame-Options': undefined, 'Content-Security-Policy': `frame-ancestors ${cmsOrigin()}`, 'X-Robots-Tag': 'noindex' });
async function preview(req, res, q) {
  const token = q.get('token');
  if (!previewOk(token)) return send(req, res, 403, HTML, blogShell(ssr.notFound(site)), { cache: 'no-store' });
  const secret = { 'x-preview-secret': SECRETS.preview };
  let html;
  if (q.get('kind') === 'post' && /^\d+$/.test(q.get('id') || '')) {
    const raw = await get(CMS, `posts/${q.get('id')}?draft=true&depth=1`, secret), p = ssr.draftPost(raw);
    html = blogShell(ssr.postPage(site, BASE, p), { content: site.content, preview: { token, kind: 'post', post: raw } });
  } else {
    const [home, settings] = await Promise.all([get(CMS, 'globals/home?depth=1', secret), get(CMS, 'globals/site-settings?depth=1', secret)]);
    html = fill(templates.home, ssr.home(site, BASE), { content: site.content, preview: { token, kind: 'home', home, settings } });
  }
  const h = previewHeaders(); delete h['X-Frame-Options'];
  const { buf } = pack(req, '', Buffer.from(html));
  res.writeHead(200, { 'Content-Type': HTML, 'Cache-Control': 'no-store', ...SECURITY, ...h });
  res.end(buf);
}
/** O painel envia o que está sendo digitado; o servidor repassa ao CMS, que devolve o documento completo. */
async function previewData(req, res, q) {
  if (!previewOk(q.get('token'))) return json(res, 403, { error: 'Prévia expirada. Reabra a prévia pelo painel.' });
  const b = await readBody(req, 4e6);
  if (!/^(globals\/(home|site-settings)|posts\/\d+)$/.test(String(b.endpoint))) return json(res, 400, { error: 'Pedido inválido.' });
  const r = await fetch(`${CMS}/api/${b.endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Payload-HTTP-Method-Override': 'GET', 'x-preview-secret': SECRETS.preview },
    body: JSON.stringify(b.data || {}), signal: AbortSignal.timeout(15000),
  });
  res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(await r.text());
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://x'), q = u.searchParams;
  let url = u.pathname;
  try {
    if (req.method === 'POST') {
      if (url === '/api/revalidate') {
        if (!safeEqual(req.headers['x-revalidate-secret'] || '', SECRETS.revalidate)) return json(res, 401, { error: 'Não autorizado.' });
        await awaitCommitted(await readBody(req, 4000));
        await refresh(); return json(res, 200, { ok: true, posts: site.posts.length });
      }
      if (url === '/api/quote') return await quote(req, res);
      if (url === '/api/preview-data') return await previewData(req, res, q);
      return json(res, 404, { error: 'Não encontrado.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Método não aceito.' });
    if (url.length > 1 && url.endsWith('/')) { res.writeHead(301, { Location: url.slice(0, -1) + u.search }); return res.end(); }
    if (url === '/index.html') { res.writeHead(301, { Location: '/' }); return res.end(); }

    if (url === '/') return page(req, res, url, homePage);
    if (url === '/preview') return await preview(req, res, q);
    if (url === '/blog/feed.xml') return send(req, res, 200, 'application/rss+xml; charset=utf-8', ssr.rss(site, BASE), { cache: 'public, max-age=300' });
    if (url === '/sitemap.xml') return send(req, res, 200, 'application/xml; charset=utf-8', ssr.map(site, BASE), { cache: 'public, max-age=300' });
    if (url === '/robots.txt') return send(req, res, 200, 'text/plain; charset=utf-8', `User-agent: *\nAllow: /\nDisallow: /preview\nDisallow: /api/\n${BASE ? `Sitemap: ${BASE}/sitemap.xml\n` : ''}`);

    let m = /^\/blog(?:\/categoria\/([a-z0-9-]+))?(?:\/pagina\/(\d+))?$/.exec(url);
    if (m && m[2] !== '1') {
      if (page(req, res, url, () => { const p = ssr.list(site, BASE, { category: m[1], page: Number(m[2] || 1) }); return p && blogShell(p); })) return;
    } else if ((m = /^\/blog\/([a-z0-9-]+)$/.exec(url))) {
      const p = ssr.findPost(site, m[1]);           // só há posts publicados na memória: rascunho nunca chega aqui
      if (p) return page(req, res, url, () => blogShell(ssr.postPage(site, BASE, p)));
    }
    if (sendStatic(req, res, url)) return;
    const to = (site.redirects || []).find((r) => r.from === url);   // links antigos cadastrados no CMS
    if (to) { res.writeHead(301, { Location: to.to }); return res.end(); }
    send(req, res, 404, HTML, blogShell(ssr.notFound(site)), { key: 'page:404' });
  } catch (e) {
    console.warn(`${req.method} ${url}: ${e.message}`);
    if (!res.headersSent) json(res, 500, { error: 'Erro ao montar a página.' });
  }
}

(async () => {
  try {
    ssr = await import('./dist-server/ssr.js');
    templates = { home: fs.readFileSync(path.join(DIST, 'template.html'), 'utf8'), blog: fs.readFileSync(path.join(DIST, 'template-blog.html'), 'utf8') };
  } catch { console.error('Build não encontrado. Rode "npm run build" antes de iniciar o servidor.'); process.exit(1); }
  if (!CMS) console.warn('CMS_URL não definido: o site fica com o conteúdo padrão e sem blog.');
  for (const [k, v] of Object.entries(SECRETS)) if (!v) console.warn(`Segredo "${k}" não definido: a função correspondente fica desligada.`);
  await firstLoad();
  http.createServer(handle).listen(PORT, () => console.log('Site no ar na porta ' + PORT));
})();
