const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT) || 3000;
const rootDir = __dirname;
const dataDir = path.join(rootDir, 'data');
const accessFile = path.join(dataDir, 'accesses.json');

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(accessFile)) fs.writeFileSync(accessFile, '[]');

function readAccesses() {
  try {
    const accesses = JSON.parse(fs.readFileSync(accessFile, 'utf8'));
    return Array.isArray(accesses) ? accesses : [];
  } catch (error) {
    return [];
  }
}

function writeAccesses(accesses) {
  fs.writeFileSync(accessFile, JSON.stringify(accesses, null, 2));
}

function getDevice(userAgent = '') {
  if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
  if (/mobile|android|iphone/i.test(userAgent)) return 'Ponsel';
  return 'Desktop';
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  response.end(JSON.stringify(payload));
}

function serveFile(request, response) {
  const requestedPath = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.resolve(rootDir, `.${requestedPath}`);
  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end('Halaman tidak ditemukan');
    return;
  }

  const extension = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };
  response.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    response.end();
    return;
  }

  if (request.url === '/api/accesses' && request.method === 'GET') {
    sendJson(response, 200, readAccesses().slice(0, 100));
    return;
  }

  if (request.url === '/api/accesses' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 10_000) request.destroy();
    });
    request.on('end', () => {
      let clientData = {};
      try { clientData = JSON.parse(body || '{}'); } catch (error) { /* Use defaults. */ }

      const accesses = readAccesses();
      accesses.unshift({
        id: crypto.randomUUID(),
        device: getDevice(request.headers['user-agent']),
        language: String(clientData.language || 'Tidak diketahui').slice(0, 30),
        timezone: String(clientData.timezone || 'Tidak diketahui').slice(0, 60),
        screen: String(clientData.screen || '-').slice(0, 20),
        createdAt: new Date().toISOString()
      });
      writeAccesses(accesses.slice(0, 500));
      sendJson(response, 201, { ok: true });
    });
    return;
  }

  if (request.method === 'GET') serveFile(request, response);
  else sendJson(response, 405, { error: 'Metode tidak didukung' });
});

server.listen(port, host, () => {
  console.log(`NovelHub berjalan di http://localhost:${port}`);
  console.log(`Akses dari perangkat lain menggunakan IP komputer ini pada jaringan yang sama.`);
});
