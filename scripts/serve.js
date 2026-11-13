'use strict';

/**
 * Lekki, bezbiblioteczny serwer HTTP do lokalnego podglądu CV.
 * Zero zewnętrznych zależności - wykorzystuje wbudowany moduł node:http.
 * Utwardzony zgodnie z ISO/IEC 27001 i OWASP ASVS (Path/Symlink Traversal, Dot-files Guard, Security Headers).
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'inline-speculation-rules'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

const ALLOWED_DOT_PATHS = new Set([
  '.well-known/security.txt',
]);

const BLOCKED_BASENAME_PATTERN = /^(package(-lock)?\.json|composer\.(json|lock))$/i;
const BLOCKED_EXTENSION_PATTERN = /\.(php|bak|tmp|log|sql|sh|ps1|bat|cmd|swp|pem|key|kdbx|pfx|p12|sqlite3?|db|db-wal|db-shm|csv|json|ya?ml|toml|ini|md)$/i;

function isCrossSiteSubrequest(req) {
  if (!req || !req.headers) return false;
  const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  const secFetchMode = String(req.headers['sec-fetch-mode'] || '').toLowerCase();
  return secFetchSite === 'cross-site' && secFetchMode !== 'navigate';
}

function resolveSafeFilePath(rawUrl = '/', rootDir = ROOT_DIR) {
  const rawStr = String(rawUrl);
  if (rawStr.includes('\0') || /%00/i.test(rawStr)) {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  let reqUrl;
  try {
    reqUrl = decodeURIComponent(rawStr.split('?')[0].split('#')[0]);
  } catch {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  if (reqUrl.includes('\0')) {
    return { filePath: '', isAllowed: false, isMalformed: true };
  }

  if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

  const resolvedRoot = path.resolve(rootDir);
  const relativeTarget = reqUrl.replace(/^[\/\\]+/, '');
  let filePath = path.resolve(resolvedRoot, relativeTarget);

  if (
    relativeTarget === 'Krzysztof_Poczatek_CV.pdf' &&
    !fs.existsSync(filePath) &&
    fs.existsSync(path.resolve(resolvedRoot, 'dist', 'Krzysztof_Poczatek_CV.pdf'))
  ) {
    filePath = path.resolve(resolvedRoot, 'dist', 'Krzysztof_Poczatek_CV.pdf');
  }

  const insideLexicalRoot =
    filePath === resolvedRoot ||
    filePath.startsWith(resolvedRoot + path.sep);

  if (!insideLexicalRoot) {
    return { filePath, isAllowed: false, isMalformed: false };
  }

  const normalizedRel = path.relative(resolvedRoot, filePath).split(path.sep).join('/');
  const segments = normalizedRel.split('/').filter(Boolean);
  const hasDotSegment = segments.some((seg) => seg.startsWith('.'));

  if (hasDotSegment && !ALLOWED_DOT_PATHS.has(normalizedRel)) {
    return { filePath, isAllowed: false, isMalformed: false };
  }

  const baseName = path.basename(filePath);
  if (BLOCKED_BASENAME_PATTERN.test(baseName) || BLOCKED_EXTENSION_PATTERN.test(baseName)) {
    return { filePath, isAllowed: false, isMalformed: false };
  }

  try {
    if (fs.existsSync(resolvedRoot) && fs.existsSync(filePath)) {
      const realRoot = fs.realpathSync(resolvedRoot);
      const realFile = fs.realpathSync(filePath);
      const insideRealRoot =
        realFile === realRoot ||
        realFile.startsWith(realRoot + path.sep);
      if (!insideRealRoot) {
        return { filePath, isAllowed: false, isMalformed: false };
      }
    }
  } catch {
    return { filePath, isAllowed: false, isMalformed: false };
  }

  return { filePath, isAllowed: true, isMalformed: false };
}

const server = http.createServer((req, res) => {
  if (isCrossSiteSubrequest(req)) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('403 Cross-Site Subrequest Forbidden');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      'Content-Type': 'text/plain; charset=utf-8',
      Allow: 'GET, HEAD',
      ...SECURITY_HEADERS,
    });
    res.end('405 Metoda niedozwolona');
    return;
  }

  const { filePath, isAllowed, isMalformed } = resolveSafeFilePath(req.url, ROOT_DIR);

  if (isMalformed) {
    res.writeHead(400, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('400 Nieprawidłowy adres URL');
    return;
  }

  // Zabezpieczenie przed Directory Traversal i wyciekiem dot-files (ISO/IEC 27001 / OWASP)
  if (!isAllowed) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end('403 Dostęp zabroniony');
    return;
  }

  fs.realpath(ROOT_DIR, (rootErr, realRoot) => {
    if (rootErr) {
      res.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...SECURITY_HEADERS,
      });
      res.end('500 Błąd serwera');
      return;
    }

    fs.realpath(filePath, (realErr, realFile) => {
      if (realErr) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          ...SECURITY_HEADERS,
        });
        res.end('404 Nie znaleziono pliku');
        return;
      }

      if (realFile !== realRoot && !realFile.startsWith(realRoot + path.sep)) {
        res.writeHead(403, {
          'Content-Type': 'text/plain; charset=utf-8',
          ...SECURITY_HEADERS,
        });
        res.end('403 Dostęp zabroniony');
        return;
      }

      fs.stat(realFile, (err, stats) => {
        if (err || !stats.isFile()) {
          res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
            ...SECURITY_HEADERS,
          });
          res.end('404 Nie znaleziono pliku');
          return;
        }

        const ext = path.extname(realFile).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': stats.size,
          'Cache-Control': 'no-cache',
          ...SECURITY_HEADERS,
        });

        if (req.method === 'HEAD') {
          res.end();
          return;
        }

        const stream = fs.createReadStream(realFile);
        stream.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(500, {
              'Content-Type': 'text/plain; charset=utf-8',
              ...SECURITY_HEADERS,
            });
            res.end('500 Błąd odczytu pliku');
          } else {
            res.destroy();
          }
        });
        stream.pipe(res);
      });
    });
  });
});

server.requestTimeout = 10000;
server.headersTimeout = 5000;

if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Moje-CV Server] Działa lokalnie na http://localhost:${PORT}`);
    console.log(`[Moje-CV Server] Plik główny: http://localhost:${PORT}/index.html`);
    console.log(`[Moje-CV Server] Wciśnij Ctrl+C, aby zatrzymać.`);
  });
}

module.exports = {
  server,
  MIME_TYPES,
  SECURITY_HEADERS,
  resolveSafeFilePath,
  isCrossSiteSubrequest,
};
