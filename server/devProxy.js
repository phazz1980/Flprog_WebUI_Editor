/**
 * Локальный прокси на одном порту (по умолчанию 3000).
 * /Flprog_WebUI_Editor/viewer и /Flprog_WebUI_Editor/viewer/* → клиент (порт VIEWER_PORT),
 * остальное → редактор/генератор (порт EDITOR_PORT).
 */

const http = require('http');
const net = require('net');
const { URL } = require('url');

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '3000', 10);
const EDITOR_PORT = parseInt(process.env.EDITOR_PORT || '3001', 10);
const VIEWER_PORT = parseInt(process.env.VIEWER_PORT || '3002', 10);
const VIEWER_PREFIX = '/Flprog_WebUI_Editor/viewer';

function getPathname(reqUrl) {
  if (reqUrl.startsWith('/')) return reqUrl.split('?')[0];
  try {
    const u = new URL(reqUrl, 'http://localhost');
    return u.pathname;
  } catch {
    return reqUrl.split('?')[0];
  }
}

function getTarget(pathname, referer) {
  const toViewer = pathname === VIEWER_PREFIX || (pathname.length > VIEWER_PREFIX.length && pathname.startsWith(VIEWER_PREFIX + '/'));
  if (toViewer) {
    // Передаём полный путь: CRA с PUBLIC_URL=/Flprog_WebUI_Editor/viewer отдаёт приложение только по этому пути
    return { port: VIEWER_PORT, path: pathname };
  }
  // Запрос к /static/* с страницы клиента → в клиент (на случай если HTML не перезаписали)
  if (pathname.startsWith('/static/') && referer && referer.includes('/viewer')) {
    return { port: VIEWER_PORT, path: pathname };
  }
  return { port: EDITOR_PORT, path: pathname };
}

const server = http.createServer((clientReq, clientRes) => {
  const pathname = getPathname(clientReq.url);
  const query = clientReq.url.includes('?') ? clientReq.url.slice(clientReq.url.indexOf('?')) : '';

  // Редирект /Flprog_WebUI_Editor/viewer → /Flprog_WebUI_Editor/viewer/ чтобы относительные пути к скриптам работали
  if (pathname === VIEWER_PREFIX && clientReq.method === 'GET') {
    clientRes.writeHead(302, { Location: VIEWER_PREFIX + '/' + query });
    clientRes.end();
    return;
  }

  const referer = clientReq.headers.referer || clientReq.headers.referrer || '';
  const { port, path } = getTarget(pathname, referer);
  const targetPath = path + query;

  const opts = {
    hostname: '127.0.0.1',
    port,
    path: targetPath,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: `127.0.0.1:${port}` },
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    if (headers.location && port === VIEWER_PORT) {
      headers.location = headers.location.replace(
        /^https?:\/\/[^/]+/i,
        `http://localhost:${PROXY_PORT}${VIEWER_PREFIX}`
      );
    }
    if (port === VIEWER_PORT && headers['content-type'] && headers['content-type'].includes('text/html')) {
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        let body = Buffer.concat(chunks).toString('utf8');
        body = body.replace(
          /(https?:)?\/\/(127\.0\.0\.1|localhost):3002(\/Flprog_WebUI_Editor\/viewer)?/gi,
          `http://localhost:${PROXY_PORT}${VIEWER_PREFIX}`
        );
        // Скрипты/стили с путём /static/ → через префикс клиента (двойные и одинарные кавычки)
        body = body.replace(/\s(src|href)=["']\/static\//g, ` $1="${VIEWER_PREFIX}/static/`);
        headers['content-length'] = Buffer.byteLength(body, 'utf8');
        clientRes.writeHead(proxyRes.statusCode, headers);
        clientRes.end(body);
      });
      return;
    }
    clientRes.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(clientRes);
  });
  proxyReq.on('error', (err) => {
    clientRes.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    clientRes.end(`Bad Gateway: ${port}\n${err.message}`);
  });
  clientReq.pipe(proxyReq);
});

server.on('upgrade', (clientReq, clientSocket, head) => {
  const pathname = getPathname(clientReq.url);
  const referer = clientReq.headers.referer || clientReq.headers.referrer || '';
  const { port, path } = getTarget(pathname, referer);
  const query = clientReq.url.includes('?') ? clientReq.url.slice(clientReq.url.indexOf('?')) : '';
  const targetPath = path + query;

  const proxySocket = net.connect(port, '127.0.0.1', () => {
    proxySocket.write(
      `${clientReq.method} ${targetPath} ${clientReq.httpVersion}\r\n` +
      Object.entries({ ...clientReq.headers, host: `127.0.0.1:${port}` })
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.write(head);
  });
  proxySocket.pipe(clientSocket);
  clientSocket.pipe(proxySocket);
  proxySocket.on('error', (err) => {
    clientSocket.destroy();
  });
  clientSocket.on('error', () => {
    proxySocket.destroy();
  });
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`Прокси: http://localhost:${PROXY_PORT} (редактор) и http://localhost:${PROXY_PORT}/Flprog_WebUI_Editor/viewer/ (клиент)`);
  console.log(`Редактор: ${EDITOR_PORT}, клиент: ${VIEWER_PORT}`);
});
