const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const API_HANDLERS = {
  '/api/admin': './api/admin.js',
  '/api/auth': './api/auth.js',
  '/api/catalog': './api/catalog.js',
  '/api/deposit': './api/deposit.js',
  '/api/health': './api/health.js',
  '/api/history': './api/history.js',
  '/api/order': './api/order.js',
  '/api/sms': './api/sms.js'
};

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function responseAdapter(res) {
  const adapter = {
    setHeader(name, value) {
      res.setHeader(name, value);
      return adapter;
    },
    status(code) {
      res.statusCode = code;
      return adapter;
    },
    json(value) {
      if (res.writableEnded) return;
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
    },
    end(value) {
      if (!res.writableEnded) res.end(value);
    }
  };
  return adapter;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 8 * 1024 * 1024) {
        reject(new Error('İstek gövdesi çok büyük.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        const type = String(req.headers['content-type'] || '');
        if (type.includes('application/json')) return resolve(JSON.parse(data));
        return resolve(Object.fromEntries(new URLSearchParams(data)));
      } catch {
        reject(new Error('Geçersiz istek gövdesi.'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname, url) {
  const modulePath = API_HANDLERS[pathname];
  if (!modulePath) return false;
  try {
    req.query = Object.fromEntries(url.searchParams);
    req.body = req.method === 'GET' ? {} : await readBody(req);
    const handler = require(path.join(ROOT, modulePath));
    await handler(req, responseAdapter(res));
  } catch (error) {
    console.error(error);
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Sunucu hatası.' }));
    }
  }
  return true;
}

function serveStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  fs.stat(filePath, (statError, stats) => {
    if (!statError && stats.isFile()) {
      res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
      return fs.createReadStream(filePath).pipe(res);
    }
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Bulunamadı');
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (await handleApi(req, res, url.pathname, url)) return;
  serveStatic(res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SMM Panel çalışıyor: http://0.0.0.0:${PORT}`);
});