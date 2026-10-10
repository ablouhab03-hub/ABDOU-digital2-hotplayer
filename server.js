S// Abdou Digital² V2 - secure HotPlayer API proxy (Node.js 18+)
// Keep HOTPLAYER_API_KEY in environment variables; never put it in index.html.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.HOTPLAYER_API_KEY;
const HTML = path.join(__dirname, 'index.html');
const server = http.createServer(async (req, res) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'no-store',
  };
  const send = (status, body, type='application/json; charset=utf-8') => {
    res.writeHead(status, {...headers, 'Content-Type': type}); res.end(body);
  };
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    try { return send(200, fs.readFileSync(HTML), 'text/html; charset=utf-8'); }
    catch { return send(500, JSON.stringify({error:'index.html not found'})); }
  }
  if (req.method === 'POST' && req.url === '/api/hotplayer/check') {
    if (!API_KEY) return send(503, JSON.stringify({error:'Backend مازال ما متضبطش بمفتاح HotPlayer. عيّن HOTPLAYER_API_KEY فالسيرفر.'}));
    let raw=''; req.on('data', c => { raw += c; if(raw.length > 5000) req.destroy(); });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const mac = String(body.mac || '').trim();
        if (!/^[A-Za-z0-9]{2}([:-])[A-Za-z0-9]{2}(?:\1[A-Za-z0-9]{2}){4}$/.test(mac))
          return send(400, JSON.stringify({error:'صيغة MAC غير صحيحة. مثال: 00:11:22:AA:BB:CC'}));
        const url = 'https://hotplayer.app/api/v1/reseller/check-device/' + encodeURIComponent(mac);
        const upstream = await fetch(url, {method:'GET', headers:{'Content-Type':'application/json','Authorization':'ApiKey '+API_KEY}, signal:AbortSignal.timeout(15000)});
        const text = await upstream.text();
        let data; try { data = JSON.parse(text); } catch { data = {message:text.slice(0,1000)}; }
        return send(upstream.ok ? 200 : upstream.status, JSON.stringify(upstream.ok ? {data} : {error:'HotPlayer API رجّع خطأ',details:data}));
      } catch (e) { return send(502, JSON.stringify({error:'ما قدرناش نتاصلو بـ HotPlayer API',details:String(e.message || e)})); }
    });
    return;
  }
  return send(404, JSON.stringify({error:'Not found'}));
});
server.listen(PORT, () => console.log(`Abdou Digital² V2 running at http://localhost:${PORT}`));
