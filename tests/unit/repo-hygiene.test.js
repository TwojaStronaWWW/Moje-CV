'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Higiena repozytorium i Threat Protection (ISO/IEC 27001 & Evergreen Web Standards)', () => {
  it('plik package.json powinien posiadać wymagane skrypty CI (test, test:watch, check, check:syntax, prepare, serve, dev)', () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'Brak package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    assert.ok(pkg.scripts, 'Brak sekcji scripts w package.json');
    assert.ok(pkg.scripts.test, 'Brak skryptu test');
    assert.ok(pkg.scripts['test:watch'], 'Brak skryptu test:watch');
    assert.ok(pkg.scripts['check:syntax'], 'Brak skryptu check:syntax');
    assert.ok(pkg.scripts['check:syntax'].includes('scripts/serve.js'), 'check:syntax powinien weryfikować scripts/serve.js');
    assert.ok(pkg.scripts['check:syntax'].includes('scripts/generate-pdf.js'), 'check:syntax powinien weryfikować scripts/generate-pdf.js');
    assert.ok(pkg.scripts.check, 'Brak skryptu check');
    assert.ok(pkg.scripts.prepare, 'Brak skryptu prepare');
    assert.ok(pkg.scripts.serve, 'Brak skryptu serve');
    assert.ok(pkg.scripts.dev, 'Brak skryptu dev');
  });

  it('katalog roboczych raportów docs/audits nie powinien istnieć w repozytorium i musi być zablokowany w .gitignore', () => {
    const auditsDir = path.join(ROOT_DIR, 'docs', 'audits');
    assert.strictEqual(fs.existsSync(auditsDir), false, 'Katalog docs/audits/ nie powinien znajdować się w repozytorium');

    const gitignorePath = path.join(ROOT_DIR, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), 'Brak pliku .gitignore');
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');

    const requiredPatterns = [
      '.env*',
      '!.env.example',
      '.env.bak*',
      '*.pem',
      '*.key',
      '*.kdbx',
      '*.sqlite*',
      '.chrome-*/',
      '*token*.json',
      'docs/audits/',
    ];

    for (const pattern of requiredPatterns) {
      assert.ok(
        gitignore.includes(pattern),
        `Plik .gitignore musi zawierać regułę ochronną: ${pattern}`
      );
    }
  });

  it('pliki .npmrc (ignore-scripts=true) oraz .gitleaks.toml powinny istnieć i chronić przed Supply-Chain / Secret Leaks', () => {
    const npmrcPath = path.join(ROOT_DIR, '.npmrc');
    assert.ok(fs.existsSync(npmrcPath), 'Brak pliku .npmrc');
    const npmrc = fs.readFileSync(npmrcPath, 'utf-8');
    assert.match(npmrc, /^ignore-scripts\s*=\s*true/m, 'Brak ignore-scripts=true w .npmrc');

    const gitleaksPath = path.join(ROOT_DIR, '.gitleaks.toml');
    assert.ok(fs.existsSync(gitleaksPath), 'Brak pliku .gitleaks.toml');
    const gitleaks = fs.readFileSync(gitleaksPath, 'utf-8');
    assert.match(gitleaks, /useDefault\s*=\s*true/i, '.gitleaks.toml powinien rozszerzać domyślny zestaw reguł');
  });

  it('konfiguracja CI/CD (.github/workflows/deploy.yml) powinna istnieć, kopiować .htaccess i nie używać cache npm bez lockfile', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
    assert.ok(fs.existsSync(workflowPath), 'Brak pliku .github/workflows/deploy.yml');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    assert.match(content, /runs-on:\s*ubuntu-latest/i);
    assert.match(content, /actions\/checkout@v4/i);
    assert.match(content, /cp\s+\.htaccess\b/, 'Potok deploy.yml powinien kopiować .htaccess do paczki dist/');
    assert.match(content, /purge_cache/i, 'Potok deploy.yml powinien posiadać opcjonalny krok czyszczenia cache Cloudflare');

    const hasLockfile = fs.existsSync(path.join(ROOT_DIR, 'package-lock.json'));
    if (!hasLockfile) {
      const workflowsDir = path.join(ROOT_DIR, '.github', 'workflows');
      for (const file of fs.readdirSync(workflowsDir)) {
        if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
        const wfContent = fs.readFileSync(path.join(workflowsDir, file), 'utf-8');
        assert.doesNotMatch(
          wfContent,
          /cache:\s*['"]?npm['"]?/i,
          `Workflow ${file} nie może używać cache: 'npm' przy braku package-lock.json`
        );
      }
    }
  });

  it('bramka AI Security Review (.github/workflows/ai-security-review.yml) musi chronić sekrety przed forkami (author_association) i używać gemini-3.5-flash / 15-Model Cascade', () => {
    const aiWorkflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'ai-security-review.yml');
    assert.ok(fs.existsSync(aiWorkflowPath), 'Brak .github/workflows/ai-security-review.yml');
    const content = fs.readFileSync(aiWorkflowPath, 'utf-8');

    assert.ok(
      content.includes('contains(fromJSON(\'["OWNER", "MEMBER", "COLLABORATOR"]\'), github.event.pull_request.author_association)'),
      'Brak warunku author_association chroniącego przed eksfiltracją sekretów z PR zewnętrznych'
    );
    assert.ok(content.includes('gemini-3.5-flash'), 'Workflow AI Security Review powinien wykorzystywać aktualny model gemini-3.5-flash');
    assert.ok(content.includes('15-Model Cascade'), 'Workflow AI Security Review powinien wskazywać aktualną architekturę 15-Model Cascade');
    assert.doesNotMatch(content, /11-Model Cascade/i, 'W workflow pozostał nieaktualny opis 11-Model Cascade');
  });

  it('plik .htaccess powinien wymuszać HTTPS, chronić przed PHP2Shell, blokować pliki wrażliwe i wystawiać nagłówki HSTS/CSP/COOP/CORP', () => {
    const htaccessPath = path.join(ROOT_DIR, '.htaccess');
    assert.ok(fs.existsSync(htaccessPath), 'Brak pliku .htaccess');
    const htaccess = fs.readFileSync(htaccessPath, 'utf-8');

    assert.match(htaccess, /RewriteCond\s+%\{HTTPS\}\s+!=on/i, 'Brak przekierowania HTTPS w .htaccess');
    assert.match(htaccess, /allow_url_include/, 'Brak ochrony allow_url_include (PHP2Shell) w .htaccess');
    assert.match(htaccess, /auto_prepend_file/, 'Brak ochrony auto_prepend_file (PHP2Shell) w .htaccess');
    assert.match(htaccess, /php:\/\//, 'Brak blokady php:// w .htaccess');
    assert.match(htaccess, /phar:\/\//, 'Brak blokady phar:// w .htaccess');

    for (const token of ['\\.env', '\\.git', 'sqlite', 'db', 'csv', 'json', 'pem', 'key', 'kdbx', 'package(-lock)?\\.json', 'composer\\.(json|lock)', '\\.npmrc', '\\.gitleaks\\.toml', 'md']) {
      assert.ok(htaccess.includes(token), `Brak blokady dla wzorca ${token} w .htaccess`);
    }

    assert.match(htaccess, /AddType\s+image\/avif\s+\.avif/i);
    assert.match(htaccess, /AddType\s+image\/webp\s+\.webp/i);
    assert.match(htaccess, /AddType\s+text\/markdown\s+\.md/i);
    assert.match(htaccess, /AddType\s+application\/manifest\+json\s+\.webmanifest/i);

    assert.match(htaccess, /Strict-Transport-Security/i);
    assert.match(htaccess, /Content-Security-Policy/i);
    assert.match(htaccess, /Cross-Origin-Opener-Policy/i);
    assert.match(htaccess, /Cross-Origin-Resource-Policy/i);
  });

  it('kluczowe pliki źródłowe nie mogą zawierać pozostałości po konfliktach gita (merge conflict markers)', () => {
    const extensionsToCheck = ['.html', '.js', '.css', '.json', '.yml', '.md'];

    const CONFLICT_START = '<<<<<<<' + ' ';
    const CONFLICT_END = '>>>>>>>' + ' ';

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (fullPath === __filename) continue;
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (extensionsToCheck.some(ext => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.strictEqual(
            content.includes(CONFLICT_START) || content.includes(CONFLICT_END),
            false,
            `Wykryto marker konfliktu git w pliku: ${path.relative(ROOT_DIR, fullPath)}`
          );
        }
      }
    }

    scanDir(ROOT_DIR);
  });

  it('pliki dokumentacji i standardów AGENTS.md, GEMINI.md, SECURITY.md, .editorconfig oraz szablon PR powinny istnieć', () => {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'AGENTS.md')), 'Brak AGENTS.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'GEMINI.md')), 'Brak GEMINI.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'SECURITY.md')), 'Brak SECURITY.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.editorconfig')), 'Brak .editorconfig');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'pull_request_template.md')), 'Brak .github/pull_request_template.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml')), 'Brak bug_report.yml');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'task.yml')), 'Brak task.yml');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, '.github', 'ISSUE_TEMPLATE', 'config.yml')), 'Brak config.yml');
  });

  it('git hooki (.githooks/pre-commit i commit-msg) oraz skrypty .sh muszą używać końców linii LF (bez CRLF)', () => {
    const hookDir = path.join(ROOT_DIR, '.githooks');
    for (const name of fs.readdirSync(hookDir)) {
      const fullPath = path.join(hookDir, name);
      const rawBuf = fs.readFileSync(fullPath);
      assert.strictEqual(rawBuf.includes(0x0d), false, `Plik .githooks/${name} zawiera niedozwolone znaki CR (CRLF)`);
    }

    const hookPath = path.join(hookDir, 'pre-commit');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const firstLine = content.split('\n')[0];

    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook pre-commit nie posiada poprawnego shebangu bash');
    assert.ok(content.includes('\\.env'), 'Hook pre-commit powinien chronić przed zatwierdzeniem plików .env');
    assert.ok(content.includes('npm run check'), 'Hook pre-commit nie wywołuje komendy npm run check');
  });

  it('git hook (.githooks/commit-msg) powinien istnieć i weryfikować format Conventional Commits', () => {
    const hookPath = path.join(ROOT_DIR, '.githooks', 'commit-msg');
    assert.ok(fs.existsSync(hookPath), 'Brak .githooks/commit-msg');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const firstLine = content.split('\n')[0];

    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook commit-msg nie posiada poprawnego shebangu bash');
    assert.match(content, /build\|chore\|ci\|docs\|feat\|fix\|perf\|refactor\|revert\|style\|test/i);
    assert.match(content, /Conventional Commits/i);
  });

  it('plik .gitattributes powinien normalizować końce linii LF dla skryptów .sh i hooków', () => {
    const gitAttrPath = path.join(ROOT_DIR, '.gitattributes');
    assert.ok(fs.existsSync(gitAttrPath), 'Brak .gitattributes');
    const content = fs.readFileSync(gitAttrPath, 'utf-8');

    assert.match(content, /\* text=auto eol=lf/i);
    assert.match(content, /\*\.sh text eol=lf/i);
    assert.match(content, /\.githooks\/\* text eol=lf/i);
  });

  it('serwer deweloperski (scripts/serve.js) powinien wystawiać nagłówki nosniff/DENY/CSP i blokować traversal, dot-files oraz pliki wrażliwe', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'generate-pdf.js');
    assert.ok(fs.existsSync(scriptPath), 'Brak scripts/generate-pdf.js');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'serve.js')), 'Brak scripts/serve.js');

    const pdfModule = require('../../scripts/generate-pdf');
    assert.strictEqual(typeof pdfModule.generatePdf, 'function');
    assert.strictEqual(typeof pdfModule.findBrowserBinary, 'function');

    const serveModule = require('../../scripts/serve');
    assert.strictEqual(typeof serveModule.resolveSafeFilePath, 'function');
    assert.strictEqual(typeof serveModule.isCrossSiteSubrequest, 'function');
    assert.strictEqual(serveModule.SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(serveModule.SECURITY_HEADERS['X-Frame-Options'], 'DENY');
    assert.strictEqual(serveModule.SECURITY_HEADERS['X-Permitted-Cross-Domain-Policies'], 'none');
    assert.ok(serveModule.SECURITY_HEADERS['Content-Security-Policy'], 'Brak Content-Security-Policy w SECURITY_HEADERS');
    assert.ok(serveModule.MIME_TYPES['.webmanifest']);
    assert.ok(serveModule.MIME_TYPES['.avif']);

    assert.strictEqual(
      serveModule.isCrossSiteSubrequest({ headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' } }),
      true
    );
    assert.strictEqual(
      serveModule.isCrossSiteSubrequest({ headers: { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors' } }),
      false
    );

    assert.strictEqual(serveModule.resolveSafeFilePath('/index.html', ROOT_DIR).isAllowed, true);
    assert.strictEqual(serveModule.resolveSafeFilePath('/llms.txt', ROOT_DIR).isAllowed, true);
    assert.strictEqual(serveModule.resolveSafeFilePath('/site.webmanifest', ROOT_DIR).isAllowed, true);
    assert.strictEqual(
      serveModule.resolveSafeFilePath('/.well-known/security.txt', ROOT_DIR).isAllowed,
      true,
      'Plik /.well-known/security.txt musi być jawnie dozwolony'
    );

    const blockedPaths = [
      '/../../etc/passwd',
      '/%2e%2e/%2e%2e/etc/passwd',
      '/.env',
      '/.env.production',
      '/.git/HEAD',
      '/.npmrc',
      '/.gitleaks.toml',
      '/.htaccess',
      '/.well-known/../.env',
      '/package.json',
      '/composer.json',
      '/leads.csv',
      '/data.json',
      '/AGENTS.md',
    ];

    for (const forbidden of blockedPaths) {
      const res = serveModule.resolveSafeFilePath(forbidden, ROOT_DIR);
      assert.strictEqual(res.isAllowed, false, `Serwer powinien zablokować ścieżkę: ${forbidden}`);
    }

    const malformed = serveModule.resolveSafeFilePath('/%E0%A4%A', ROOT_DIR);
    assert.strictEqual(malformed.isMalformed, true);
    assert.strictEqual(malformed.isAllowed, false);
  });

  it('standardy RFC 9116 (/.well-known/security.txt), GEO (/llms.txt) oraz Zero-Inline (brak style/onclick) muszą być spełnione', () => {
    const secTxtPath = path.join(ROOT_DIR, '.well-known', 'security.txt');
    assert.ok(fs.existsSync(secTxtPath), 'Brak /.well-known/security.txt');
    const secTxt = fs.readFileSync(secTxtPath, 'utf-8');
    assert.match(secTxt, /^Contact:\s*mailto:/m, 'Brak pola Contact: w security.txt');
    assert.match(secTxt, /^Canonical:\s*https:\/\/krzysztofpoczatek\.pl\/\.well-known\/security\.txt/m, 'Brak pola Canonical: w security.txt');
    assert.match(secTxt, /^Policy:\s*https:\/\//m, 'Brak pola Policy: w security.txt ([REF-06])');
    const expiresMatch = secTxt.match(/^Expires:\s*(.+)$/m);
    assert.ok(expiresMatch, 'Brak pola Expires: w /.well-known/security.txt');
    const expiresDate = new Date(expiresMatch[1].trim());
    assert.ok(!Number.isNaN(expiresDate.getTime()), 'Nieprawidłowy format daty Expires: w security.txt');
    assert.ok(expiresDate.getTime() > Date.now(), 'Data Expires: w /.well-known/security.txt wygasła!');

    const llmsPath = path.join(ROOT_DIR, 'llms.txt');
    assert.ok(fs.existsSync(llmsPath), 'Brak /llms.txt');

    const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
    assert.match(htmlContent, /<link\s+[^>]*rel=["']alternate["'][^>]*type=["']text\/markdown["'][^>]*href=["']\/?llms\.txt["']/i);
    assert.doesNotMatch(htmlContent, /\sstyle\s*=\s*["']/i, 'Wykryto zabroniony atrybut inline style="..." w index.html');
    assert.doesNotMatch(htmlContent, /\son[a-z]+\s*=\s*["']/i, 'Wykryto zabroniony handler inline on*="..." w index.html');
  });

  it('konfiguracja audytu Lighthouse CI (.lighthouserc.json) powinna istnieć i definiować asercje jakościowe', () => {
    const lhciPath = path.join(ROOT_DIR, '.lighthouserc.json');
    assert.ok(fs.existsSync(lhciPath), 'Brak .lighthouserc.json');

    const config = JSON.parse(fs.readFileSync(lhciPath, 'utf-8'));
    assert.ok(config.ci, 'Brak klucza ci');
    assert.ok(config.ci.assert && config.ci.assert.assertions, 'Brak definicji asercji w lighthouserc.json');
    assert.ok(config.ci.assert.assertions['categories:accessibility']);
    assert.ok(config.ci.assert.assertions['categories:seo']);
  });

  it('pliki robots.txt, sitemap.xml oraz site.webmanifest powinny istnieć i definiować poprawne reguły (w tym Allow: /llms.txt)', () => {
    const manifestPath = path.join(ROOT_DIR, 'site.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'Brak site.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.ok(manifest.name && manifest.icons && manifest.icons.length > 0);

    const robotsPath = path.join(ROOT_DIR, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'Brak robots.txt');
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    assert.match(robotsContent, /User-agent:\s*\*/i);
    assert.match(robotsContent, /Allow:\s*\/llms\.txt/i);
    assert.match(robotsContent, /Sitemap:\s*https:\/\/krzysztofpoczatek\.pl\/sitemap\.xml/i);

    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'Brak sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/<\/loc>/i);
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/Krzysztof_Poczatek_CV\.pdf<\/loc>/i);
  });

  it('konfiguracja Dependabot (.github/dependabot.yml) powinna istnieć i chronić zależności przed CVE', () => {
    const dependabotPath = path.join(ROOT_DIR, '.github', 'dependabot.yml');
    assert.ok(fs.existsSync(dependabotPath), 'Brak .github/dependabot.yml');
    const content = fs.readFileSync(dependabotPath, 'utf-8');
    assert.match(content, /package-ecosystem:\s*"github-actions"/i);
    assert.match(content, /package-ecosystem:\s*"npm"/i);
  });

  it('plik README.md powinien istnieć, posiadać odznaki statusu, poprawne ścieżki do grafik i brak inline style/onerror', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'Brak README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.match(content, /# Krzysztof Początek/i);
    assert.match(content, /CI%2FCD%20Pipeline/i);
    assert.match(content, /Unit%20Tests/i);
    assert.strictEqual(content.includes('assets/img/'), false, 'W README.md pozostały nieistniejące ścieżki assets/img/');
    assert.ok(content.includes('assets/images/photo.jpg'));
    assert.ok(content.includes('assets/images/og-preview.png'));
    assert.doesNotMatch(content, /\sonerror\s*=\s*["']/i, 'Wykryto inline onerror w README.md');
  });

  it('wszystkie moduły JS powinny używać trybu ścisłego ("use strict") a pliki źródłowe końców linii LF', () => {
    const jsFiles = [
      'assets/js/main.js',
      'scripts/serve.js',
      'scripts/generate-pdf.js',
      'tests/helpers/mock-dom.js',
    ];
    for (const rel of jsFiles) {
      const fullPath = path.join(ROOT_DIR, rel);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.match(content, /^'use strict';/, `Brak deklaracji 'use strict'; na początku pliku ${rel}`);
      const rawBuf = fs.readFileSync(fullPath);
      assert.strictEqual(rawBuf.includes(0x0d), false, `Plik ${rel} zawiera znaki CR (CRLF)`);
    }
  });
});
